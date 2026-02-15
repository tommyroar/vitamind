import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './vitamind.css';
import { getSunStats, getVitaminDInfo, formatTime, getYearlySunData } from './utils/solarCalculations';

// Set your Mapbox access token from environment variable
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const FONT_SIZE_STORAGE_KEY = 'vitamind_modal_font_size';
const DEFAULT_FONT_SIZE = 1.0; // Corresponds to 1em
const MODAL_SIZE_STORAGE_KEY = 'vitamind_modal_size';
const DEFAULT_MODAL_SIZE = 1.0; // Corresponds to 100% of base dimensions
const BASE_MODAL_WIDTH = 400; // Base width in pixels
const BASE_MODAL_HEIGHT = 350; // Base height in pixels

const SunAngleGraph = ({ yearlyData, highestSunAngle, vitaminDDate, daysUntilVitaminD }) => {
  if (!yearlyData || !yearlyData.length) return null;

  const width = 350;
  const height = 100;
  const padding = 20;
  const graphWidth = width - 2 * padding;
  const graphHeight = height - 2 * padding;

  const today = new Date();
  const currentMonthIndex = today.getMonth();
  const currentDay = today.getDate();
  
  // Calculate interpolated index for today relative to the 15th-of-month points
  const t = currentMonthIndex + (currentDay - 15) / 30.44;
  const currentX = padding + (Math.max(0, Math.min(11, t)) / 11) * graphWidth;
  
  // Interpolate angle to stay exactly on the piecewise linear graph line
  const idx1 = Math.max(0, Math.min(10, Math.floor(t)));
  const idx2 = idx1 + 1;
  const ratio = Math.max(0, Math.min(1, t - idx1));
  const interpolatedAngle = yearlyData[idx1].angle * (1 - ratio) + yearlyData[idx2].angle * ratio;
  const currentY = padding + graphHeight - (interpolatedAngle / 90) * graphHeight;

  const points = yearlyData.map((d, i) => {
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
    const vt = vMonthIndex + (vDay - 15) / 30.44;
    vDayX = padding + (Math.max(0, Math.min(11, vt)) / 11) * graphWidth;
    vDayY = padding + graphHeight - (45 / 90) * graphHeight;
  }

  // Calculate overall min/max
  const angles = yearlyData.map(d => d.angle);
  const maxVal = Math.max(...angles);
  const minVal = Math.min(...angles);
  const maxIdx = yearlyData.findIndex(d => d.angle === maxVal);
  const minIdx = yearlyData.findIndex(d => d.angle === minVal);
  const maxEntry = yearlyData[maxIdx];
  const minEntry = yearlyData[minIdx];
  
  const maxX = padding + (maxIdx / 11) * graphWidth;
  const maxY = padding + graphHeight - (maxVal / 90) * graphHeight;
  const minX = padding + (minIdx / 11) * graphWidth;
  const minY = padding + graphHeight - (minVal / 90) * graphHeight;

  return (
    <div className="sun-graph-container">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <line 
          x1={padding} y1={padding + graphHeight - (45/90) * graphHeight} 
          x2={padding + graphWidth} y2={padding + graphHeight - (45/90) * graphHeight} 
          stroke="#F92672" strokeDasharray="4 2" strokeWidth="1" opacity="0.5"
        />
        <text x={padding} y={padding + graphHeight - (45/90) * graphHeight - 2} fontSize="6" fill="#F92672">45°</text>
        <polyline points={points} fill="none" stroke="#66D9EF" strokeWidth="2" strokeLinejoin="round" />
        
        {/* Today point: crossed circle */}
        <g stroke="#A6E22E" strokeWidth="1.5">
          <circle cx={currentX} cy={currentY} r="4" fill="none" />
          <line x1={currentX - 4} y1={currentY} x2={currentX + 4} y2={currentY} />
          <line x1={currentX} y1={currentY - 4} x2={currentX} y2={currentY + 4} />
        </g>
        <text x={currentX} y={currentY - 18} fontSize="11" fill="#F8F8F2" fontWeight="bold" textAnchor="middle">T: {highestSunAngle}°</text>
        
        {vDayX !== null && (
          <>
            {/* V-Day point: crossed circle */}
            <g stroke="#66D9EF" strokeWidth="1.5">
              <circle cx={vDayX} cy={vDayY} r="4" fill="none" />
              <line x1={vDayX - 4} y1={vDayY} x2={vDayX + 4} y2={vDayY} />
              <line x1={vDayX} y1={vDayY - 4} x2={vDayX} y2={vDayY + 4} />
            </g>
            <text x={vDayX} y={vDayY + 22} fontSize="11" fill="#F8F8F2" fontWeight="bold" textAnchor="middle">V: {vitaminDDate.toLocaleDateString()}</text>
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
        {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => (
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
  const [lng] = useState(-122.3321); // Default longitude for Seattle
  const [lat] = useState(47.6062); // Default latitude for Seattle
  const [zoom] = useState(4);   // Default zoom for Seattle (showing Western US)

  const [showModal, setShowModal] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [clickedLat, setClickedLat] = useState(null);
  const [clickedLng, setClickedLng] = useState(null);
  const [highestSunAngle, setHighestSunAngle] = useState(null);
  const [solarNoonTime, setSolarNoonTime] = useState(null);
  const [dayLength, setDayLength] = useState(null);
  const [currentDateFormatted, setCurrentDateFormatted] = useState('');
  const [fontSize, setFontSize] = useState(() => {
    const storedFontSize = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    return storedFontSize ? parseFloat(storedFontSize) : DEFAULT_FONT_SIZE;
  });
  const [modalSize, setModalSize] = useState(() => {
    const storedModalSize = localStorage.getItem(MODAL_SIZE_STORAGE_KEY);
    return storedModalSize ? parseFloat(storedModalSize) : DEFAULT_MODAL_SIZE;
  });

  // Vitamin D related states
  const [vitaminDDate, setVitaminDDate] = useState(null);
  const [daysUntilVitaminD, setDaysUntilVitaminD] = useState(null);
  const [startTimeAbove45, setStartTimeAbove45] = useState(null);
  const [endTimeAbove45, setEndTimeAbove45] = useState(null);
  const [durationAbove45, setDurationAbove45] = useState(null);
  const [daysUntilBelow45, setDaysUntilBelow45] = useState(null);
  
  const [activeFieldId, setActiveFieldId] = useState('vitamind-info'); // State to track the currently zoomed field
  const [copyFeedback, setCopyFeedback] = useState({ show: false, message: '', id: null });
  const [modalView, setModalView] = useState('stats'); // 'stats' or 'calendar'
  const [yearlyData, setYearlyData] = useState([]);


  const [cityName, setCityName] = useState('');


  useEffect(() => {
    if (!mapboxgl.accessToken) {
      console.error("Mapbox access token is not set. Please ensure VITE_MAPBOX_ACCESS_TOKEN is configured.");
      return;
    }
    if (mapRef.current) return; // Initialize map only once

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1', // Night navigation basemap
      center: [lng, lat],
      zoom: zoom
    });

    const fetchCityName = async (lng, lat) => {
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
    };

    mapRef.current.on('click', (e) => {
      const currentMapZoom = mapRef.current.getZoom();
      const clickLat = e.lngLat.lat;
      const clickLng = e.lngLat.lng;
      const today = new Date();

      setCurrentZoom(currentMapZoom.toFixed(2));
      setClickedLat(clickLat.toFixed(4));
      setClickedLng(clickLng.toFixed(4));
      setCurrentDateFormatted(today.toLocaleDateString());

      fetchCityName(clickLng, clickLat);

      const sunStats = getSunStats(clickLat, clickLng, today);
      setHighestSunAngle(sunStats.highestSunAngle);
      setSolarNoonTime(sunStats.solarNoonTime);
      setDayLength(sunStats.dayLength);
      
      const vitaminDInfo = getVitaminDInfo(clickLat, clickLng, today);
      setVitaminDDate(vitaminDInfo.vitaminDDate);
      setDaysUntilVitaminD(vitaminDInfo.daysUntilVitaminD);
      setStartTimeAbove45(vitaminDInfo.startTimeAbove45);
      setEndTimeAbove45(vitaminDInfo.endTimeAbove45);
      setDurationAbove45(vitaminDInfo.durationAbove45);
      setDaysUntilBelow45(vitaminDInfo.daysUntilBelow45);

      setYearlyData(getYearlySunData(clickLat, clickLng));

      setShowModal(true);
      setModalView('stats');
    });

    // Add navigation controls (optional)
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

    // Clean up on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [lat, lng, zoom]); // dependencies for Mapbox init

  // Effect to update localStorage when fontSize changes
  useEffect(() => {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize.toString());
  }, [fontSize]);

  // Effect to update localStorage when modalSize changes
  useEffect(() => {
    localStorage.setItem(MODAL_SIZE_STORAGE_KEY, modalSize.toString());
  }, [modalSize]);


  const closeModal = () => {
    setShowModal(false);
    setModalView('stats');
    setActiveFieldId('vitamind-info'); // Reset active field on close
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

  const handleFieldClick = (id) => {
    setActiveFieldId(id);
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
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:V Day in ${cityName}!`,
      `DESCRIPTION:Sun is above 45° in ${cityName}. Perfect time for Vitamin D!`,
      `LOCATION:${cityName} (${clickedLat}, ${clickedLng})`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'v-day.ics');
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
    const daysFromTodayStr = `(${daysUntilVitaminD} days from today)`;

    if (daysUntilVitaminD === 0 && durationAbove45) {
      // Sun is above 45 today
      return (
        <>
          In <strong>{cityName}</strong> on <span className="calendar-link" onClick={triggerCalendar}>{linkContent}</span> {daysFromTodayStr}, the sun will be above 45° for {durationAbove45}.
          {daysUntilBelow45 !== null ? ` It will be below 45° for the whole day in ${daysUntilBelow45} days.` : ` It will always be above 45° for the whole day.`}
        </>
      );
    } else {
      // Sun will be above 45 in the future
      return (
        <>
          In <strong>{cityName}</strong> on <span className="calendar-link" onClick={triggerCalendar}>{linkContent}</span> {daysFromTodayStr}, the sun will get higher than 45° above the horizon, which allows your body to naturally create Vitamin D.
        </>
      );
    }
  };


  return (
    <div className="app-main-container">
      <div ref={mapContainerRef} data-testid="map-container" className="map-display-area" />

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              fontSize: `${fontSize}em`, 
              width: `${(modalView === 'calendar' ? 0.6 : 1.0) * BASE_MODAL_WIDTH * modalSize}px`,
              height: `${(modalView === 'calendar' ? 0.6 : 1.0) * BASE_MODAL_HEIGHT * modalSize}px`
            }}
          >
            <div className="modal-header">
              <h2>
                {modalView === 'calendar' 
                  ? 'Add to Calendar' 
                  : (daysUntilVitaminD === 0 ? `V-D Day in ${cityName}!` : daysUntilVitaminD > 0 ? `V-D Day -${daysUntilVitaminD} in ${cityName}` : `Sun Stats: ${cityName}`)
                }
              </h2>
              <button className="close-button" onClick={closeModal}>&times;</button>
            </div>
            
            {modalView === 'stats' ? (
              <div className="modal-body-container">
                <div className="sidebar left-sidebar">
                  <button onClick={() => adjustFontSize(0.1)}>Text +</button>
                  <button onClick={() => adjustFontSize(-0.1)}>Text -</button>
                </div>
                
                <div ref={scrollContainerRef} className="modal-scroll-content">
                  <SunAngleGraph 
                    yearlyData={yearlyData} 
                    highestSunAngle={highestSunAngle} 
                    vitaminDDate={vitaminDDate}
                    daysUntilVitaminD={daysUntilVitaminD}
                  />
                  {/* Reversed order of fields */}
                  <p 
                    id="vitamind-info" 
                    className={activeFieldId === 'vitamind-info' ? 'zoomed-field' : ''}
                    onClick={() => handleFieldClick('vitamind-info')}
                    onDoubleClick={(e) => handleDoubleClick(e, 'vitamind-info')}
                  >
                    {vitaminDMessage()}
                    {copyFeedback.show && copyFeedback.id === 'vitamind-info' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="day-length" 
                    className={activeFieldId === 'day-length' ? 'zoomed-field' : ''}
                    onClick={() => handleFieldClick('day-length')}
                    onDoubleClick={(e) => handleDoubleClick(e, 'day-length')}
                  >
                    Day Length: {dayLength}
                    {copyFeedback.show && copyFeedback.id === 'day-length' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="solar-noon" 
                    className={activeFieldId === 'solar-noon' ? 'zoomed-field' : ''}
                    onClick={() => handleFieldClick('solar-noon')}
                    onDoubleClick={(e) => handleDoubleClick(e, 'solar-noon')}
                  >
                    Solar Noon Time: {solarNoonTime}
                    {copyFeedback.show && copyFeedback.id === 'solar-noon' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="highest-angle" 
                    className={activeFieldId === 'highest-angle' ? 'zoomed-field' : ''}
                    onClick={() => handleFieldClick('highest-angle')}
                    onDoubleClick={(e) => handleDoubleClick(e, 'highest-angle')}
                  >
                    Highest Daily Sun Angle for {currentDateFormatted}: {highestSunAngle}°
                    {copyFeedback.show && copyFeedback.id === 'highest-angle' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="longitude" 
                    className={activeFieldId === 'longitude' ? 'zoomed-field' : ''}
                    onClick={() => handleFieldClick('longitude')}
                    onDoubleClick={(e) => handleDoubleClick(e, 'longitude')}
                  >
                    Longitude: {clickedLng}
                    {copyFeedback.show && copyFeedback.id === 'longitude' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="latitude" 
                    className={activeFieldId === 'latitude' ? 'zoomed-field' : ''}
                    onClick={() => handleFieldClick('latitude')}
                    onDoubleClick={(e) => handleDoubleClick(e, 'latitude')}
                  >
                    Latitude: {clickedLat}
                    {copyFeedback.show && copyFeedback.id === 'latitude' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="zoom-level" 
                    className={activeFieldId === 'zoom-level' ? 'zoomed-field' : ''}
                    onClick={() => handleFieldClick('zoom-level')}
                    onDoubleClick={(e) => handleDoubleClick(e, 'zoom-level')}
                  >
                    Zoom Level: {currentZoom}
                    {copyFeedback.show && copyFeedback.id === 'zoom-level' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                </div>

                <div className="sidebar right-sidebar">
                  <button onClick={() => adjustModalSize(0.1)}>Win +</button>
                  <button onClick={() => adjustModalSize(-0.1)}>Win -</button>
                </div>
              </div>
            ) : (
              <div className="calendar-view">
                <div className="calendar-options">
                  <a 
                    href={`https://www.google.com/calendar/render?action=TEMPLATE&text=V+Day+in+${encodeURIComponent(cityName)}!&details=Sun+is+above+45°+in+${encodeURIComponent(cityName)}.+Perfect+time+for+Vitamin+D!&location=${encodeURIComponent(cityName)}+(${clickedLat},${clickedLng})&dates=${formatToGoogleCalendarDate(startTimeAbove45)}/${formatToGoogleCalendarDate(endTimeAbove45)}`} 
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
                <button className="back-button" onClick={() => setModalView('stats')}>Back</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;