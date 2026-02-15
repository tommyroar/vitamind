import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './vitamind.css';
import { getHighestDailySunAngle } from './utils/solarCalculations';

// Set your Mapbox access token from environment variable
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

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

      setCurrentZoom(currentMapZoom.toFixed(2));
      setClickedLat(clickLat.toFixed(4));
      setClickedLng(clickLng.toFixed(4));

      const angle = getHighestDailySunAngle(clickLat, clickLng);
      setHighestSunAngle(angle.toFixed(2));
      
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

  const closeModal = () => setShowModal(false);

  return (
    <div className="app-main-container">
      <div ref={mapContainerRef} data-testid="map-container" className="map-display-area" />

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Map Information</h2>
            <p>Zoom Level: {currentZoom}</p>
            <p>Latitude: {clickedLat}</p>
            <p>Longitude: {clickedLng}</p>
            <p>Highest Daily Sun Angle: {highestSunAngle}°</p>
            <button onClick={closeModal}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
