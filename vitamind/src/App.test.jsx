// src/App.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';
import mapboxgl from 'mapbox-gl'; // Import mapbox-gl to access its mock

describe('App', () => {
  it('renders without crashing and displays the map container', () => {
    render(<App />);

    // Check if the main container for the map is in the document
    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toBeInTheDocument();

    // Optionally, check if mapboxgl.Map was called
    expect(mapboxgl.Map).toHaveBeenCalledTimes(1);
    expect(mapboxgl.Map).toHaveBeenCalledWith({
      container: mapContainer, // The mock should receive the actual DOM element
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [-70.9, 42.35],
      zoom: 9,
    });
  });

  // You might add more tests here, e.g., for user interactions if any
});
