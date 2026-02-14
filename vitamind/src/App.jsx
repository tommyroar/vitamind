import React, { useRef, useEffect, useState, createContext, useContext } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'; // Keep existing CSS for general styling

// Theme Context for Dark Mode
const ThemeContext = createContext(null);

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark'); // Default to dark mode
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    document.body.className = theme; // Apply theme class to body
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// MenuBar Component (will be in its own file later)
const MenuBar = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  return (
    <nav className="menu-bar">
      <div className="menu-left">
        <span className="app-title">Vitamind Maps</span>
      </div>
      <div className="menu-right">
        <button onClick={toggleTheme} className="theme-toggle">
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
        <a href="#about" className="menu-item">About</a>
        <a href="#contact" className="menu-item">Contact</a>
      </div>
    </nav>
  );
};

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
    <ThemeProvider>
      <div className="app-layout">
        <MenuBar />
        <div className="map-container-wrapper" style={{ flexGrow: 1 }}>
          <div ref={mapContainerRef} data-testid="map-container" style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
