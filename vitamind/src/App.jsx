import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './vitamind.css';

// Set your Mapbox access token from environment variable
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null); // Ref to store the map instance
  const [lng, setLng] = useState(-70.9); // Default longitude
  const [lat, setLat] = useState(42.35); // Default latitude
  const [zoom, setZoom] = useState(9);   // Default zoom

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

    // Add navigation controls (optional)
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

    // Clean up on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <div className="app-main-container">
      <div ref={mapContainerRef} data-testid="map-container" className="map-display-area" />
    </div>
  );
}

export default App;
