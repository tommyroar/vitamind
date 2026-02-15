import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './vitamind.css';
import { getSunStats, getVitaminDInfo } from './utils/solarCalculations';

// Set your Mapbox access token from environment variable
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const FONT_SIZE_STORAGE_KEY = 'vitamind_modal_font_size';
const DEFAULT_FONT_SIZE = 1.0; // Corresponds to 1em

function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null); // Ref to store the map instance
  const scrollContainerRef = useRef(null); // Ref for the scrollable modal content
  const [lng, setLng] = useState(-122.3321); // Default longitude for Seattle
  const [lat, setLat] = useState(47.6062); // Default latitude for Seattle
  const [zoom, setZoom] = useState(4);   // Default zoom for Seattle (showing Western US)

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

  // Vitamin D related states
  const [vitaminDDate, setVitaminDDate] = useState(null);
  const [daysUntilVitaminD, setDaysUntilVitaminD] = useState(null);
  const [durationAbove45, setDurationAbove45] = useState(null);
  const [daysUntilBelow45, setDaysUntilBelow45] = useState(null);
  
  const [activeFieldId, setActiveFieldId] = useState('vitamind-info'); // State to track the currently zoomed field


  useEffect(() => {
    if (!mapboxgl.accessToken) {
      console.error("Mapbox access token is not set. Please ensure VITE_MAPBOX_ACCESS_TOKEN or REACT_APP_MAPBOX_ACCESS_TOKEN is configured.");
      return;
    }
    if (mapRef.current) return; // Initialize map only once

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1', // Night navigation basemap
      center: [lng, lat],
      zoom: zoom
    });

    mapRef.current.on('click', (e) => {
      const currentMapZoom = mapRef.current.getZoom();
      const clickLat = e.lngLat.lat;
      const clickLng = e.lngLat.lng;
      const today = new Date();

      setCurrentZoom(currentMapZoom.toFixed(2));
      setClickedLat(clickLat.toFixed(4));
      setClickedLng(clickLng.toFixed(4));
      setCurrentDateFormatted(today.toLocaleDateString());

      const sunStats = getSunStats(clickLat, clickLng, today);
      setHighestSunAngle(sunStats.highestSunAngle);
      setSolarNoonTime(sunStats.solarNoonTime);
      setDayLength(sunStats.dayLength);
      
      const vitaminDInfo = getVitaminDInfo(clickLat, clickLng, today);
      setVitaminDDate(vitaminDInfo.vitaminDDate);
      setDaysUntilVitaminD(vitaminDInfo.daysUntilVitaminD);
      setDurationAbove45(vitaminDInfo.durationAbove45);
      setDaysUntilBelow45(vitaminDInfo.daysUntilBelow45);

      setShowModal(true);
    });

    // Add navigation controls (optional)
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

    // Clean up on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount

  // Effect to update localStorage when fontSize changes
  useEffect(() => {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize.toString());
  }, [fontSize]);

  // Effect for IntersectionObserver to handle scroll-based zooming
  useEffect(() => {
    if (!showModal || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first intersecting entry with a significant intersectionRatio,
        // prioritizing those higher in the scroll area.
        let topmostVisibleId = null;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) { // 70% visible threshold
            if (topmostVisibleId === null || entry.target.offsetTop < scrollContainerRef.current.querySelector(`#${topmostVisibleId}`).offsetTop) {
                 topmostVisibleId = entry.target.id;
            }
          }
        }
        setActiveFieldId(topmostVisibleId);
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '0px',
        threshold: [0.1, 0.7, 1.0], // Observe at different visibility thresholds
      }
    );

    // Observe all child <p> elements
    Array.from(scrollContainerRef.current.children).forEach((child) => {
      if (child.tagName === 'P') { // Only observe paragraphs containing data
        observer.observe(child);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [showModal]); // Re-run when modal visibility changes


  const closeModal = () => setShowModal(false);

  const adjustFontSize = (amount) => {
    setFontSize((prevSize) => {
      const newSize = Math.max(0.7, Math.min(1.5, prevSize + amount)); // Limit min/max size
      return parseFloat(newSize.toFixed(1)); // Keep 1 decimal place
    });
  };

  const vitaminDMessage = () => {
    if (daysUntilVitaminD === 0 && durationAbove45) {
      // Sun is above 45 today
      let message = `Today, the sun will be above 45° for ${durationAbove45}.`;
      if (daysUntilBelow45 !== null) {
        message += ` It will be below 45° for the whole day in ${daysUntilBelow45} days.`;
      } else {
        message += ` It will always be above 45° for the whole day.`;
      }
      return message;
    } else if (vitaminDDate && daysUntilVitaminD > 0) {
      // Sun will be above 45 in the future
      return `On ${vitaminDDate.toLocaleDateString()} (in ${daysUntilVitaminD} days), the sun will get higher than 45° above the horizon, which allows your body to naturally create Vitamin D.`;
    } else if (vitaminDDate === null) {
      // Sun never reaches 45 degrees
      return `The sun will not reach 45° above the horizon at this location within a year, making Vitamin D production unlikely naturally.`;
    }
    return ''; // Default empty string
  };


  return (
    <div className="app-main-container">
      <div ref={mapContainerRef} data-testid="map-container" className="map-display-area" />

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ fontSize: `${fontSize}em` }}>
            <div className="modal-header">
              <h2>Sun Statistics &#x2600;</h2>
              <button className="close-button" onClick={closeModal}>&times;</button>
            </div>
            <div ref={scrollContainerRef} className="modal-scroll-content">
              {/* Reversed order of fields */}
              <p id="vitamind-info" className={activeFieldId === 'vitamind-info' ? 'zoomed-field' : ''}>{vitaminDMessage()}</p>
              <p id="day-length" className={activeFieldId === 'day-length' ? 'zoomed-field' : ''}>Day Length: {dayLength}</p>
              <p id="solar-noon" className={activeFieldId === 'solar-noon' ? 'zoomed-field' : ''}>Solar Noon Time: {solarNoonTime}</p>
              <p id="highest-angle" className={activeFieldId === 'highest-angle' ? 'zoomed-field' : ''}>Highest Daily Sun Angle for {currentDateFormatted}: {highestSunAngle}°</p>
              <p id="longitude" className={activeFieldId === 'longitude' ? 'zoomed-field' : ''}>Longitude: {clickedLng}</p>
              <p id="latitude" className={activeFieldId === 'latitude' ? 'zoomed-field' : ''}>Latitude: {clickedLat}</p>
              <p id="zoom-level" className={activeFieldId === 'zoom-level' ? 'zoomed-field' : ''}>Zoom Level: {currentZoom}</p>
            </div>
            <div className="font-size-controls">
              <button onClick={() => adjustFontSize(-0.1)}>-</button>
              <button onClick={() => adjustFontSize(0.1)}>+</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
