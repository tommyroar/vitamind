import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getSunStats, getVitaminDInfo, formatTime, getYearlySunData, getVitaminDAreaGeoJSON, getSubsolarPoint, getNorthernVitaminDLat } from './utils/solarCalculations';

// Set your Mapbox access token from environment variable
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const FONT_SIZE_STORAGE_KEY = 'vitamind_modal_font_size';
const DEFAULT_FONT_SIZE = 1.0; // Corresponds to 1em
const MODAL_SIZE_STORAGE_KEY = 'vitamind_modal_size';
const DEFAULT_MODAL_SIZE = 1.0; // Corresponds to 100% of base dimensions
const BASE_MODAL_WIDTH = 600; // Base width in pixels
const BASE_MODAL_HEIGHT = 500; // Base height in pixels

const INTRO_SEEN_KEY = 'vitamind_intro_seen';
const INTRO_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

const LA_LNG = -118.2437;

// Build the SVG shown inside the terminator control button.
// Renders a mini orthographic globe centred on LA with the current
// day/night gradient and the terminator arc overlaid.
function buildTerminatorSVG() {
  const { lat: decDeg, lng: sunLng } = getSubsolarPoint(new Date());
  const dec = decDeg * Math.PI / 180;
  const r = 14, cx = 18, cy = 18;
  const uid = Math.random().toString(36).slice(2, 6);

  // Project the subsolar point into orthographic coords centred on LA
  const dSun = ((sunLng - LA_LNG + 540) % 360) - 180;
  const xSun = cx + Math.cos(dec) * Math.sin(dSun * Math.PI / 180) * r;
  const ySun = cy - Math.sin(dec) * r;

  // Collect visible terminator points (front hemisphere only)
  const pts = [];
  for (let latDeg = -88; latDeg <= 88; latDeg += 2) {
    const phi = latDeg * Math.PI / 180;
    const val = -Math.tan(phi) * Math.tan(dec);
    if (Math.abs(val) > 1) continue;
    const dLng = Math.acos(val) * 180 / Math.PI;
    for (const tLng of [sunLng + dLng, sunLng - dLng]) {
      const diff = ((tLng - LA_LNG + 540) % 360) - 180;
      if (Math.abs(diff) <= 90) {
        pts.push([
          cx + Math.cos(phi) * Math.sin(diff * Math.PI / 180) * r,
          cy - Math.sin(phi) * r
        ]);
      }
    }
  }
  pts.sort((a, b) => a[1] - b[1]); // top → bottom in SVG space

  const pathD = pts.length > 1
    ? 'M ' + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L ')
    : '';

  return `<svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <defs>
      <clipPath id="tc${uid}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
      <radialGradient id="sg${uid}" gradientUnits="userSpaceOnUse"
          cx="${xSun.toFixed(1)}" cy="${ySun.toFixed(1)}" r="${(r * 1.5).toFixed(1)}">
        <stop offset="0%"   stop-color="rgba(230,219,116,0.55)"/>
        <stop offset="100%" stop-color="rgba(230,219,116,0)"/>
      </radialGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0d1520"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#sg${uid})" clip-path="url(#tc${uid})"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E6DB74" stroke-width="1.2"/>
    ${pathD ? `<path d="${pathD}" stroke="#FD971F" stroke-width="1.5" fill="none"
        clip-path="url(#tc${uid})" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
  </svg>`;
}

const SunAngleGraph = ({ yearlyData, vitaminDDate, daysUntilVitaminD }) => {
  const todayTextRef = useRef(null);
  const [todayRectWidth, setTodayRectWidth] = useState(0);
  const vDayTextRef = useRef(null);
  const [vDayRectWidth, setVDayRectWidth] = useState(0);

  const today = new Date();
  const dateStr = today.toLocaleDateString();
  const vitaminDDateStr = vitaminDDate?.toLocaleDateString();

  useEffect(() => {
    if (todayTextRef.current && typeof todayTextRef.current.getBBox === 'function') {
      const bbox = todayTextRef.current.getBBox();
      setTodayRectWidth(bbox.width + 10); // Add 10px padding
    }
    if (vDayTextRef.current && vitaminDDate && typeof vDayTextRef.current.getBBox === 'function') { // Only measure if vDayTextRef exists and vitaminDDate is valid
      const bbox = vDayTextRef.current.getBBox();
      setVDayRectWidth(bbox.width + 10); // Add 10px padding
    }
  }, [dateStr, vitaminDDateStr, vitaminDDate]);

  if (!yearlyData || !yearlyData.length) return null;

  const width = 350;
  const height = 100;
  const padding = 20;
  const graphWidth = width - 2 * padding;
  const graphHeight = height - 2 * padding;

  const currentMonthIndex = today.getMonth();
  const currentDay = today.getDate();
  
  // Rotate data so current month is centered (at index 5 of 0-11)
  const startMonth = (currentMonthIndex - 5 + 12) % 12;
  const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const orderedData = [];
  const orderedLabels = [];
  for (let i = 0; i < 12; i++) {
    const idx = (startMonth + i) % 12;
    orderedData.push(yearlyData[idx]);
    orderedLabels.push(monthLabels[idx]);
  }

  // Calculate interpolated index for today relative to the shifted points
  const t = 5 + (currentDay - 15) / 30.44;
  const currentX = padding + (Math.max(0, Math.min(11, t)) / 11) * graphWidth;
  
  // Interpolate angle to stay exactly on the piecewise linear graph line
  const idx1 = Math.max(0, Math.min(10, Math.floor(t)));
  const idx2 = idx1 + 1;
  const ratio = Math.max(0, Math.min(1, t - idx1));
  const interpolatedAngle = orderedData[idx1].angle * (1 - ratio) + orderedData[idx2].angle * ratio;
  const currentY = padding + graphHeight - (interpolatedAngle / 90) * graphHeight;

  const points = orderedData.map((d, i) => {
    const x = padding + (i / 11) * graphWidth;
    const y = padding + graphHeight - (d.angle / 90) * graphHeight;
    return `${x},${y}`;
  }).join(' ');

  // Calculate V-Day position
  let vDayX = null;
  let vDayY = null;
  if (vitaminDDate && daysUntilVitaminD > 0) {
    const vMonthIndex = vitaminDDate.getMonth();
    const vDay = vitaminDDate.getDate();
    const vt = (vMonthIndex - startMonth + 12) % 12 + (vDay - 15) / 30.44;
    vDayX = padding + (Math.max(0, Math.min(11, vt)) / 11) * graphWidth;
    vDayY = padding + graphHeight - (45 / 90) * graphHeight;
  }

  // Calculate overall min/max
  const angles = orderedData.map(d => d.angle);
  const maxVal = Math.max(...angles);
  const minVal = Math.min(...angles);
  const maxIdx = orderedData.findIndex(d => d.angle === maxVal);
  const minIdx = orderedData.findIndex(d => d.angle === minVal);
  const maxEntry = orderedData[maxIdx];
  const minEntry = orderedData[minIdx];
  
  return (
    <div className="sun-graph-container">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        {/* Horizontal reference lines */}
        <line 
          x1={padding} y1={padding + graphHeight - (45/90) * graphHeight} 
          x2={padding + graphWidth} y2={padding + graphHeight - (45/90) * graphHeight} 
          stroke="#F92672" strokeDasharray="4 2" strokeWidth="1" opacity="0.5"
        />
        <text x={padding} y={padding + graphHeight - (45/90) * graphHeight - 2} fontSize="6" fill="#F92672">45°</text>

        <line 
          x1={padding} y1={padding + graphHeight - (maxVal/90) * graphHeight} 
          x2={padding + graphWidth} y2={padding + graphHeight - (maxVal/90) * graphHeight} 
          stroke="#E6DB74" strokeDasharray="2 2" strokeWidth="0.5" opacity="0.3"
        />
        <line 
          x1={padding} y1={padding + graphHeight - (minVal/90) * graphHeight} 
          x2={padding + graphWidth} y2={padding + graphHeight - (minVal/90) * graphHeight} 
          stroke="#AE81FF" strokeDasharray="2 2" strokeWidth="0.5" opacity="0.3"
        />

        <polyline points={points} fill="none" stroke="#F8F8F2" strokeWidth="2" strokeLinejoin="round" />
        
        {/* Today point: crossed circle */}
        <g stroke="#A6E22E" strokeWidth="1.5">
          <circle cx={currentX} cy={currentY} r="4" fill="none" />
          <line x1={currentX - 4} y1={currentY} x2={currentX + 4} y2={currentY} />
          <line x1={currentX} y1={currentY - 4} x2={currentX} y2={currentY + 4} />
        </g>
        
        {/* Today Label with shadow box */}
        {todayRectWidth > 0 && ( // Render rect only after width is calculated
          <rect 
            x={currentX - todayRectWidth / 2} 
            y={currentY - 32} 
            width={todayRectWidth} 
            height="14" 
            fill="#272822" 
            fillOpacity="0.8" 
            rx="2" 
          />
        )}
        <text 
          ref={todayTextRef} 
          x={currentX} 
          y={currentY - 22} 
          fontSize="11" 
          fill="#A6E22E" 
          fontWeight="bold" 
          textAnchor="middle"
        >
          Today: {today.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </text>
        
        {vDayX !== null && (
          <>
            {/* V-Day point: crossed circle */}
            <g stroke="#66D9EF" strokeWidth="1.5">
              <circle cx={vDayX} cy={vDayY} r="4" fill="none" />
              <line x1={vDayX - 4} y1={vDayY} x2={vDayX + 4} y2={vDayY} />
              <line x1={vDayX} y1={vDayY - 4} x2={vDayX} y2={vDayY + 4} />
            </g>
            
            {/* V-D Day Label with shadow box */}
            {vDayRectWidth > 0 && ( // Render rect only after width is calculated
              <rect 
                x={vDayX - vDayRectWidth / 2} 
                y={vDayY + 18} 
                width={vDayRectWidth} 
                height="14" 
                fill="#272822" 
                fillOpacity="0.8" 
                rx="2" 
              />
            )}
            <text 
              ref={vDayTextRef} 
              x={vDayX} 
              y={vDayY + 28} 
              fontSize="11" 
              fill="#66D9EF" 
              fontWeight="bold" 
              textAnchor="middle"
            >
              V-D Day: {vitaminDDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </text>
          </>
        )}
        
        <text x={width - padding} y={padding + 5} textAnchor="end">
          <tspan fontSize="7" fill="#E6DB74">Highest max: {maxVal.toFixed(1)}°</tspan>
          <tspan x={width - padding} dy="8" fontSize="5" fill="#E6DB74" opacity="0.6">({maxEntry.month} 15)</tspan>
        </text>
        <text x={width - padding} y={height - padding - 5} textAnchor="end">
          <tspan fontSize="7" fill="#AE81FF">Lowest max: {minVal.toFixed(1)}°</tspan>
          <tspan x={width - padding} dy="8" fontSize="5" fill="#AE81FF" opacity="0.6">({minEntry.month} 15)</tspan>
        </text>
        {orderedLabels.map((m, i) => (
          <text key={i} x={padding + (i / 11) * graphWidth} y={height - 5} fontSize="6" fill="#F8F8F2" textAnchor="middle">{m}</text>
        ))}
      </svg>
    </div>
  );
};

function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null); // Ref to store the map instance
  const scrollContainerRef = useRef(null); // Ref for the scrollable modal content
  
  // Clear localStorage if "clear" query param is present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('clear')) {
      localStorage.clear();
      // Remove the clear param from URL without refreshing
      const url = new URL(window.location);
      url.searchParams.delete('clear');
      window.history.replaceState({}, '', url);
    }
  }, []);

  // Initial position: Puget Sound
  const [lng] = useState(-122.3321);
  const [lat] = useState(47.6062);
  const [zoom] = useState(4); // Start at medium zoom (reduced from 9, now 4)

  const [showModal, setShowModal] = useState(false);
  const [showIntroDrawer, setShowIntroDrawer] = useState(false);
  const [showClickHint, setShowClickHint] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const hintTimeoutRef = useRef(null);

  const triggerClickHint = useCallback((delay = 0) => {
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);

    hintTimeoutRef.current = setTimeout(() => {
      setShowClickHint(true);
    }, delay);
  }, []);

  const [clickedLat, setClickedLat] = useState(null);
  const [clickedLng, setClickedLng] = useState(null);
  const [mapZoom, setMapZoom] = useState(null);
  const [highestSunAngle, setHighestSunAngle] = useState(null);
  const [solarNoonTime, setSolarNoonTime] = useState(null);
  const [dayLength, setDayLength] = useState(null);
  const [fontSize, setFontSize] = useState(() => {
    const storedFontSize = sessionStorage.getItem(FONT_SIZE_STORAGE_KEY);
    return storedFontSize ? parseFloat(storedFontSize) : DEFAULT_FONT_SIZE;
  });
  const [modalSize, setModalSize] = useState(() => {
    const storedModalSize = sessionStorage.getItem(MODAL_SIZE_STORAGE_KEY);
    return storedModalSize ? parseFloat(storedModalSize) : DEFAULT_MODAL_SIZE;
  });

  // Vitamin D related states
  const [vitaminDDate, setVitaminDDate] = useState(null);
  const [daysUntilVitaminD, setDaysUntilVitaminD] = useState(null);
  const [startTimeAbove45, setStartTimeAbove45] = useState(null);
  const [endTimeAbove45, setEndTimeAbove45] = useState(null);
  const [durationAbove45, setDurationAbove45] = useState(null);
  const [daysUntilBelow45, setDaysUntilBelow45] = useState(null);
  
  const [copyFeedback, setCopyFeedback] = useState({ show: false, message: '', id: null });
  const [modalView, setModalView] = useState('stats'); // 'stats' or 'calendar'
  const [yearlyData, setYearlyData] = useState([]);


  // Detect WebGL availability synchronously on first render so the effect
  // can bail out cleanly without a cascading setState-in-effect.
  const [mapError, setMapError] = useState(() => {
    if (!mapboxgl.supported()) {
      if (!mapboxgl.supported({ failIfMajorPerformanceCaveat: false })) {
        return 'webgl-unavailable';
      }
    }
    return null;
  });

  const [cityName, setCityName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCityName = useCallback(async (lng, lat) => {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place&access_token=${mapboxgl.accessToken}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        setCityName(data.features[0].text);
      } else {
        setCityName('Unknown Location');
      }
    } catch (error) {
      console.error("Error fetching city name:", error);
      setCityName('Unknown Location');
    }
  }, []);

  const returnToPugetSound = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [-122.3321, 47.6062],
        zoom: 4, // Reduced from 9, now 4
        duration: 3000,
        essential: true
      });
    }
  }, []);

  const updateStatsForLocation = useCallback(async (lng, lat) => {
    const today = new Date();

    setClickedLat(lat.toFixed(4));
    setClickedLng(lng.toFixed(4));
    if (mapRef.current) {
      setMapZoom(mapRef.current.getZoom().toFixed(2));
    }

    fetchCityName(lng, lat);

    const sunStats = getSunStats(lat, lng, today);
    setHighestSunAngle(sunStats.highestSunAngle);
    setSolarNoonTime(sunStats.solarNoonTime);
    setDayLength(sunStats.dayLength);
    
    const vitaminDInfo = getVitaminDInfo(lat, lng, today);
    setVitaminDDate(vitaminDInfo.vitaminDDate);
    setDaysUntilVitaminD(vitaminDInfo.daysUntilVitaminD);
    setStartTimeAbove45(vitaminDInfo.startTimeAbove45);
    setEndTimeAbove45(vitaminDInfo.endTimeAbove45);
    setDurationAbove45(vitaminDInfo.durationAbove45);
    setDaysUntilBelow45(vitaminDInfo.daysUntilBelow45);

    setYearlyData(getYearlySunData(lat, lng));

    setShowModal(true);
    setModalView('stats');
    setShowClickHint(false); // Hide hint once a location is clicked
  }, [fetchCityName]);

  const requestLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLng = position.coords.longitude;
          const userLat = position.coords.latitude;
          
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [userLng, userLat],
              zoom: 10, // Increased to 10
              duration: 3000,
              essential: true
            });
            // Trigger statistics after zoom completes
            mapRef.current.once('moveend', () => {
              updateStatsForLocation(userLng, userLat);
            });
          } else {
            // Fallback if map isn't ready
            updateStatsForLocation(userLng, userLat);
          }
        }, 
        (error) => {
          console.warn("Geolocation access denied or failed:", error.message);
          returnToPugetSound();
        },
        { timeout: 8000 }
      );
    } else {
      returnToPugetSound();
    }
  }, [updateStatsForLocation, returnToPugetSound]);

  const startIntroSequence = useCallback(() => {
    if (!mapRef.current) return;

    // Slow cinematic zoom-out from terminator to default view
    mapRef.current.flyTo({
      center: [-122.3321, 47.6062],
      zoom: 4,
      duration: 8000,
      essential: true
    });

    // Open drawer partway through the zoom
    setTimeout(() => {
      setShowIntroDrawer(true);
    }, 2000);

    // Trigger browser location prompt
    setTimeout(() => {
      requestLocation();
    }, 3000);
  }, [requestLocation]);

  const setIntroSeen = useCallback(() => {
    const expiry = Date.now() + INTRO_TTL;
    localStorage.setItem(INTRO_SEEN_KEY, JSON.stringify({ value: true, expiry }));
  }, []);

  const handleContinue = useCallback(() => {
    setShowIntroDrawer(false);
    setIntroSeen();
    triggerClickHint(0);
  }, [setIntroSeen, triggerClickHint]);

  // #17: Settings panel actions
  const handleClearCache = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    setShowSettings(false);
    window.location.reload();
  }, []);

  const handleRelocate = useCallback(() => {
    setShowSettings(false);
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (!mapboxgl.accessToken) {
      console.error("Mapbox access token is not set. Please ensure VITE_MAPBOX_ACCESS_TOKEN is configured.");
      setMapError('token-missing');
      setLoading(false);
      return;
    }
    if (mapRef.current) return; // Initialize map only once

    // WebGL availability is pre-checked in the useState initializer above.
    // If it was unavailable the error overlay is already rendered; skip init.
    if (mapError) {
      setLoading(false);
      return;
    }

    // Wrap initialization in an async function so that the setState call in
    // the catch block is not synchronous in the effect body (satisfies the
    // react-hooks/set-state-in-effect lint rule).
    const initMap = async () => {
      try {
        // Determine whether the intro animation will play so we can set
        // the correct initial camera position before the map is created.
        const introData = JSON.parse(localStorage.getItem(INTRO_SEEN_KEY) || '{}');
        const needsIntro = !introData.expiry || Date.now() > introData.expiry;

        let initialCenter = [lng, lat];
        let initialZoom = zoom;

        if (needsIntro) {
          // Place the camera on the terminator line at 100°W at a high zoom
          // so the intro animation can zoom smoothly out to the default view.
          const { lat: decDeg, lng: sunLng } = getSubsolarPoint(new Date());
          const dec = decDeg * Math.PI / 180;
          const h = (-100 - sunLng) * Math.PI / 180;
          const tanPhi = -Math.cos(h) / Math.tan(dec);
          const terminatorLat = isFinite(tanPhi)
            ? Math.max(-85, Math.min(85, Math.atan(tanPhi) * 180 / Math.PI))
            : 0;
          initialCenter = [-100, terminatorLat];
          initialZoom = 15;
        }

        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/navigation-night-v1', // Night navigation basemap
          center: initialCenter,
          zoom: initialZoom,
          projection: 'globe', // Enable globe projection for better terminator visualization
          failIfMajorPerformanceCaveat: false, // Allow software rendering when hardware acceleration is unavailable
        });

        mapRef.current.on('load', () => {
          const vitaminDAreaData = getVitaminDAreaGeoJSON();

          if (mapRef.current.getSource('vitamin-d-area')) return;

          mapRef.current.addSource('vitamin-d-area', {
            type: 'geojson',
            data: vitaminDAreaData
          });

          // Vitamin D Area fill layer - Monokai Yellow
          mapRef.current.addLayer({
            id: 'vitamin-d-area-layer',
            type: 'fill',
            source: 'vitamin-d-area',
            filter: ['==', ['get', 'layerType'], 'fill'],
            layout: {},
            paint: {
              'fill-color': '#E6DB74',
              'fill-opacity': 0.4
            }
          });

          // Warm boundary line
          mapRef.current.addLayer({
            id: 'vitamin-d-area-boundary',
            type: 'line',
            source: 'vitamin-d-area',
            filter: ['==', ['get', 'layerType'], 'boundary'],
            layout: {},
            paint: {
              'line-color': '#FD971F', // Monokai Orange
              'line-width': 2,
              'line-opacity': 0.6
            }
          });

          // Update map labels to use monospaced-like font if possible
          const style = mapRef.current.getStyle();
          if (style && style.layers) {
            style.layers.forEach(layer => {
              if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
                mapRef.current.setLayoutProperty(layer.id, 'text-font', ['DIN Offc Pro Bold', 'Arial Unicode MS Regular']);
                mapRef.current.setLayoutProperty(layer.id, 'text-letter-spacing', 0.1);
              }
            });
          }

          // Add atmosphere for the globe
          mapRef.current.setFog({
            'color': 'rgb(186, 210, 235)', // Lower atmosphere
            'high-color': 'rgb(36, 92, 223)', // Upper atmosphere
            'horizon-blend': 0.02, // Atmosphere thickness
            'space-color': 'rgb(11, 11, 25)', // Background color
            'star-intensity': 0.6 // Background star brightness
          });

          if (needsIntro) {
            // Start the zoom animation while the loading screen is still visible
            // so there is no jarring jump when the screen disappears.
            startIntroSequence();
            setTimeout(() => setLoading(false), 400);
          } else {
            setLoading(false);
            requestLocation();
          }
        });

        mapRef.current.on('click', (e) => {
          updateStatsForLocation(e.lngLat.lng, e.lngLat.lat);
        });

        // Close intro modal when map animation finishes
        mapRef.current.on('moveend', (e) => {
          // Only trigger if the intro modal is still showing and we have zoomed IN
          // (Initial globe view is ~1.5, Puget Sound is 9, User is 10)
          if (e.originalEvent === undefined && mapRef.current.getZoom() > 5) {
             setShowIntroDrawer(prev => {
               if (prev) {
                 setIntroSeen();
                 triggerClickHint(0);
                 return false;
               }
               return prev;
             });
          }
        });

        // #16: navigation controls with larger touch targets (sized via CSS)
        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

        // #16: add a locate button
        const geolocate = new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false,
          showAccuracyCircle: false,
          showUserLocation: false // We will handle showing/zooming ourselves
        });
        mapRef.current.addControl(geolocate, 'top-left');

        // Terminator control — mini globe showing current day/night;
        // clicking zooms to LA longitude at the current terminator latitude.
        const terminatorCtrl = {
          onAdd() {
            this._el = document.createElement('div');
            this._el.className = 'mapboxgl-ctrl terminator-ctrl';
            this._el.setAttribute('title', 'Zoom to terminator at Los Angeles');
            this._el.innerHTML = buildTerminatorSVG();
            this._el.addEventListener('click', () => {
              const currentLat = mapRef.current.getCenter().lat;
              const northLat = getNorthernVitaminDLat(new Date(), LA_LNG);

              // Step 1: pan to LA longitude at current latitude
              mapRef.current.flyTo({
                center: [LA_LNG, currentLat],
                duration: 1500,
                essential: true
              });

              // Step 2: after arrival, fly to northern vitamin D terminus
              mapRef.current.once('moveend', () => {
                mapRef.current.flyTo({
                  center: [LA_LNG, northLat],
                  zoom: 8,
                  duration: 2000,
                  essential: true
                });
              });
            });
            return this._el;
          },
          onRemove() {
            if (this._el && this._el.parentNode) this._el.parentNode.removeChild(this._el);
          }
        };
        mapRef.current.addControl(terminatorCtrl, 'top-left');

        geolocate.on('geolocate', (position) => {
          const userLng = position.coords.longitude;
          const userLat = position.coords.latitude;

          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [userLng, userLat],
              zoom: 10,
              duration: 2000,
              essential: true
            });
            // Show stats once flyTo finishes
            mapRef.current.once('moveend', () => {
              updateStatsForLocation(userLng, userLat);
            });
          }
        });

      } catch (err) {
        console.error("Error initializing Mapbox:", err);
        setMapError('init-failed');
      }
    };

    initMap();

    // Clean up on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, zoom, updateStatsForLocation, startIntroSequence, requestLocation, setIntroSeen, triggerClickHint, mapError]); // dependencies for Mapbox init

  // Effect to update sessionStorage when fontSize changes
  useEffect(() => {
    sessionStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize.toString());
  }, [fontSize]);

  // Effect to update sessionStorage when modalSize changes
  useEffect(() => {
    sessionStorage.setItem(MODAL_SIZE_STORAGE_KEY, modalSize.toString());
  }, [modalSize]);


  const closeModal = () => {
    setShowModal(false);
    setModalView('stats');
    triggerClickHint(2000);
  };

  const adjustFontSize = (amount) => {
    setFontSize((prevSize) => {
      const newSize = Math.max(0.7, Math.min(1.5, prevSize + amount)); // Limit min/max size
      return parseFloat(newSize.toFixed(1)); // Keep 1 decimal place
    });
  };

  const adjustModalSize = (amount) => {
    setModalSize((prevSize) => {
      const newSize = Math.max(0.7, Math.min(1.5, prevSize + amount)); // Limit min/max size
      return parseFloat(newSize.toFixed(1)); // Keep 1 decimal place
    });
  };

  const handleDoubleClick = async (e, id) => {
    const textToCopy = e.target.innerText;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyFeedback({ show: true, message: 'Copied!', id });
      setTimeout(() => setCopyFeedback({ show: false, message: '', id: null }), 1500);
    } catch {
      setCopyFeedback({ show: true, message: 'Failed to copy!', id });
      setTimeout(() => setCopyFeedback({ show: false, message: '', id: null }), 1500);
    }
  };

  const formatToGoogleCalendarDate = (date) => {
    if (!date) return '';
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const generateICS = () => {
    if (!startTimeAbove45 || !endTimeAbove45) return;
    const start = formatToGoogleCalendarDate(startTimeAbove45);
    const end = formatToGoogleCalendarDate(endTimeAbove45);
    
    // ICS requires commas to be escaped with a backslash. 
    // In JS strings, '\\,' becomes the literal string '\,'
    const escapedCityName = cityName.replace(/,/g, '\\,');
    const location = cityName === 'Unknown Location' 
      ? `${clickedLat}\\, ${clickedLng}` 
      : `${escapedCityName} (${clickedLat}\\, ${clickedLng})`;
      
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:V-D Day in ${escapedCityName}!`,
      `DESCRIPTION:Sun is above 45° in ${escapedCityName}. Perfect time for Vitamin D!`.replace(/,/g, '\\,'),
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'v-d-day.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const vitaminDMessage = () => {
    if (!vitaminDDate) {
      return `In ${cityName}, the sun will not reach 45° above the horizon at this location within a year, making Vitamin D production unlikely naturally.`;
    }

    const dateStr = vitaminDDate.toLocaleDateString();
    const timeStr = formatTime(startTimeAbove45);

    const triggerCalendar = (e) => {
      e.stopPropagation();
      setModalView('calendar');
    };

    const linkContent = daysUntilVitaminD === 0 ? `today at ${timeStr}` : `${dateStr} at ${timeStr}`;
    const daysFromTodayStr = daysUntilVitaminD === 0 ? '' : ` (${daysUntilVitaminD} days from today)`;

    if (daysUntilVitaminD === 0 && durationAbove45) {
      // Sun is above 45 today
      const locationPart = cityName !== 'Unknown Location' ? <>In <strong>{cityName}</strong> on </> : <>On </>;
      const perpetualPart = cityName !== 'Unknown Location' 
        ? `The sun will always reach above 45° in ${cityName}. Congrats on the vitamin D`
        : `The sun will always reach above 45° in this location. Congrats on the vitamin D`;

      return (
        <>
          {locationPart}<span className="calendar-link" onClick={triggerCalendar}>{linkContent}</span>{daysFromTodayStr}, the sun will be above 45° for {durationAbove45}.
          {daysUntilBelow45 !== null ? ` It will be below 45° for the whole day in ${daysUntilBelow45} days.` : ` ${perpetualPart}`}
        </>
      );
    } else {
      // Sun will be above 45 in the future
      const locationPart = cityName !== 'Unknown Location' ? <>In <strong>{cityName}</strong> on </> : <>On </>;
      return (
        <>
          {locationPart}<span className="calendar-link" onClick={triggerCalendar}>{linkContent}</span>{daysFromTodayStr}, the sun will get higher than 45° above the horizon, which allows your body to naturally create Vitamin D.
        </>
      );
    }
  };


  return (
    <div className="app-main-container">
      <div ref={mapContainerRef} data-testid="map-container" className="map-display-area" />

      {mapError && (
        <div className="map-error-overlay" data-testid="map-error">
          <div className="map-error-content">
            <h2>Map Unavailable</h2>
            {mapError === 'webgl-unavailable' ? (
              <>
                <p>This app requires WebGL, which is not available in your browser.</p>
                <p>If you are using <strong>Chrome</strong>, try enabling hardware acceleration:</p>
                <ol>
                  <li>Open <strong>Chrome Settings</strong></li>
                  <li>Go to <strong>System</strong></li>
                  <li>Enable <strong>&quot;Use hardware acceleration when available&quot;</strong></li>
                  <li>Relaunch Chrome</li>
                </ol>
              </>
            ) : mapError === 'token-missing' ? (
              <>
                <p><strong>Mapbox Access Token Missing.</strong></p>
                <p>Please check your environment variables and secrets.</p>
              </>
            ) : (
              <p>The map failed to initialize. Please try refreshing the page.</p>
            )}
          </div>
        </div>
      )}

      {loading && !mapError && (
        <div className="map-error-overlay">
          <div className="map-error-content">
            <div className="loading-spinner" />
            <h2 style={{ color: '#E6DB74' }}>Loading Map...</h2>
            <p>Preparing Vitamin D synthesis data visualization</p>
          </div>
        </div>
      )}

      {showIntroDrawer && (
        <div className="modal-overlay">
          <div 
            className="modal-content" 
            style={{ 
              fontSize: `${fontSize}em`,
              width: `calc(${BASE_MODAL_WIDTH}px * ${modalSize})`,
              height: `auto`,
              maxHeight: `calc(${BASE_MODAL_HEIGHT}px * ${modalSize})`
            }}
          >
            <div className="modal-header">
              <div className="menu-bar">
                <div className="menu-group title-group">
                  <h2 style={{ color: '#E6DB74' }}>Welcome to Vitamin D</h2>
                </div>
                <div className="menu-group right-controls">
                  <button className="close-button" onClick={handleContinue}>×</button>
                </div>
              </div>
            </div>
            <div className="modal-body-container">
              <div className="modal-scroll-content" style={{ textAlign: 'center', padding: '10px' }}>
                <p>
                  This application helps you track when the sun is at the optimal angle (above 45°) for your body to naturally produce Vitamin D. 
                  Sufficient UV-B exposure is crucial for bone health and can help mitigate Seasonal Affective Disorder (SAD) by regulating mood and circadian rhythms.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showClickHint && !showModal && !showIntroDrawer && (
        <div className="click-hint" onClick={() => setShowClickHint(false)} style={{ pointerEvents: 'auto', cursor: 'pointer' }}>
          <span>Click anywhere on the map to view Vitamin D statistics</span>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              fontSize: `${fontSize}em`,
              width: modalView === 'calendar' 
                ? `calc(${BASE_MODAL_WIDTH * 0.6}px * ${modalSize})`
                : `calc(${BASE_MODAL_WIDTH}px * ${modalSize})`,
              height: modalView === 'calendar'
                ? `calc(${BASE_MODAL_HEIGHT * 0.6}px * ${modalSize})`
                : `calc(${BASE_MODAL_HEIGHT}px * ${modalSize})`
            }}
          >
            <div className="modal-header">
              <div className="menu-bar">
                <div className="menu-group title-group">
                  <h2>
                    {modalView === 'calendar'
                      ? 'Add to Calendar'
                      : (cityName === 'Unknown Location'
                          ? (daysUntilVitaminD === 0 ? 'V-D Day!' : daysUntilVitaminD > 0 ? `V-D Day -${daysUntilVitaminD}` : 'Sun Stats')
                          : (daysUntilVitaminD === 0 ? `V-D Day in ${cityName}!` : daysUntilVitaminD > 0 ? `V-D Day -${daysUntilVitaminD} in ${cityName}` : `Sun Stats: ${cityName}`))
                    }
                  </h2>
                </div>
                <div className="menu-group right-controls">
                  <button className="close-button" onClick={closeModal}>×</button>
                </div>
              </div>
            </div>
            
            {modalView === 'stats' ? (
              <div className="modal-body-container">
                <div ref={scrollContainerRef} className="modal-scroll-content">
                  <SunAngleGraph 
                    yearlyData={yearlyData} 
                    vitaminDDate={vitaminDDate}
                    daysUntilVitaminD={daysUntilVitaminD}
                  />
                  {/* Reversed order of fields */}
                  <p 
                    id="vitamind-info" 
                    onDoubleClick={(e) => handleDoubleClick(e, 'vitamind-info')}
                  >
                    {vitaminDMessage()}
                    {copyFeedback.show && copyFeedback.id === 'vitamind-info' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="day-length" 
                    onDoubleClick={(e) => handleDoubleClick(e, 'day-length')}
                  >
                    Day Length: {dayLength}
                    {copyFeedback.show && copyFeedback.id === 'day-length' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="solar-noon" 
                    onDoubleClick={(e) => handleDoubleClick(e, 'solar-noon')}
                  >
                    Solar Noon Time: {solarNoonTime}
                    {copyFeedback.show && copyFeedback.id === 'solar-noon' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="highest-angle" 
                    onDoubleClick={(e) => handleDoubleClick(e, 'highest-angle')}
                  >
                    Highest Daily Sun Angle: {highestSunAngle}°
                    {copyFeedback.show && copyFeedback.id === 'highest-angle' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="longitude" 
                    onDoubleClick={(e) => handleDoubleClick(e, 'longitude')}
                  >
                    Longitude: {clickedLng}
                    {copyFeedback.show && copyFeedback.id === 'longitude' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="latitude" 
                    onDoubleClick={(e) => handleDoubleClick(e, 'latitude')}
                  >
                    Latitude: {clickedLat}
                    {copyFeedback.show && copyFeedback.id === 'latitude' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="map-zoom" 
                    onDoubleClick={(e) => handleDoubleClick(e, 'map-zoom')}
                  >
                    Map Zoom: {mapZoom}
                    {copyFeedback.show && copyFeedback.id === 'map-zoom' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="mkdocs-link" 
                  >
                    Documentation: <a href="https://tommyroar.github.io/vitamind/docs/" target="_blank" rel="noopener noreferrer" className="calendar-link">Vitamind Docs</a>
                  </p>
                </div>
              </div>
            ) : (
              <div className="calendar-view">
                <div className="calendar-options">
                  <a 
                    href={`https://www.google.com/calendar/render?action=TEMPLATE&text=V-D+Day+in+${encodeURIComponent(cityName)}!&details=Sun+is+above+45°+in+${encodeURIComponent(cityName)}.+Perfect+time+for+Vitamin+D!&location=${encodeURIComponent(cityName)}+(${clickedLat},${clickedLng})&dates=${formatToGoogleCalendarDate(startTimeAbove45)}/${formatToGoogleCalendarDate(endTimeAbove45)}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="calendar-button google-button"
                  >
                    <svg className="calendar-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84c-.21 1.12-.82 2.07-1.74 2.7v2.24h2.81c1.65-1.52 2.6-3.76 2.6-6.3z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.79.53-1.8.85-3.12.85-2.39 0-4.41-1.61-5.14-3.77H1.03v2.32C2.51 16.03 5.52 18 9 18z"/><path fill="#FBBC05" d="M3.86 10.7c-.18-.53-.29-1.1-.29-1.7s.11-1.17.29-1.7V4.98H1.03C.37 6.19 0 7.56 0 9s.37 2.81 1.03 4.02l2.83-2.32z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.47.89 11.43 0 9 0 5.52 0 2.51 1.97 1.03 4.98l2.83 2.32C4.59 5.19 6.61 3.58 9 3.58z"/></svg>
                    Google Calendar
                  </a>
                  <button onClick={generateICS} className="calendar-button apple-button">
                    <svg className="calendar-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><path fill="currentColor" d="M14.1 9.5c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.7-1.8-3.3-1.8-1.4-.1-2.8.8-3.5.8s-1.9-.8-3-.8c-1.5 0-2.9.9-3.7 2.3-1.6 2.8-.4 6.9 1.1 8.6.8 1.1 1.7 2.3 2.9 2.3s1.6-.7 3.1-.7 1.9.7 3.1.7c1.2 0 2-.1 2.8-1.2.9-1.3 1.3-2.6 1.3-2.7 0 0-2.4-1-2.4-3.9zm-2.6-6.6c.6-.8 1.1-1.9.9-3-.9.1-2 1.1-2.6 1.9-.6.7-1.1 1.8-.9 2.9 1 .1 2-.8 2.6-1.8z"/></svg>
                    Apple / iCal
                  </button>
                </div>
                <button className="back-button" onClick={() => setModalView('stats')}>←</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* #17: Floating settings FAB — text size, window size, clear cache, re-prompt location */}
      <div className="settings-fab" onClick={e => e.stopPropagation()}>
        <button
          className="settings-hamburger"
          onClick={() => setShowSettings(prev => !prev)}
          aria-label="Settings"
        >
          {showSettings ? '×' : '☰'}
        </button>
        {showSettings && (
          <div className="settings-panel">
            <div className="settings-block">
              <span className="settings-label">Text Size</span>
              <div className="settings-stepper">
                <button onClick={() => adjustFontSize(-0.1)}>−</button>
                <span>{fontSize.toFixed(1)}</span>
                <button onClick={() => adjustFontSize(0.1)}>+</button>
              </div>
            </div>
            <div className="settings-block">
              <span className="settings-label">Window Size</span>
              <div className="settings-stepper">
                <button onClick={() => adjustModalSize(-0.1)}>−</button>
                <span>{modalSize.toFixed(1)}</span>
                <button onClick={() => adjustModalSize(0.1)}>+</button>
              </div>
            </div>
            <div className="settings-divider" />
            <button className="settings-action-button" onClick={handleClearCache}>Clear Cache</button>
            <button className="settings-action-button" onClick={handleRelocate}>Re-prompt Location</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;