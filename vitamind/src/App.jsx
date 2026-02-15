import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './vitamind.css';
import { getSunStats } from './utils/solarCalculations';

// Set your Mapbox access token from environment variable
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const FONT_SIZE_STORAGE_KEY = 'vitamind_modal_font_size';
const DEFAULT_FONT_SIZE = 1.0; // Corresponds to 1em

function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null); // Ref to store the map instance
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

  const closeModal = () => setShowModal(false);

  const adjustFontSize = (amount) => {
    setFontSize((prevSize) => {
      const newSize = Math.max(0.7, Math.min(1.5, prevSize + amount)); // Limit min/max size
      return parseFloat(newSize.toFixed(1)); // Keep 1 decimal place
    });
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
            <div className="modal-scroll-content">
              <p>Zoom Level: {currentZoom}</p>
              <p>Latitude: {clickedLat}</p>
              <p>Longitude: {clickedLng}</p>
              <p>Highest Daily Sun Angle for {currentDateFormatted}: {highestSunAngle}°</p>
              <p>Solar Noon Time: {solarNoonTime}</p>
              <p>Day Length: {dayLength}</p>
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
