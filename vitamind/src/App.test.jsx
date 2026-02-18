// src/App.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import mapboxgl from 'mapbox-gl'; // Import mapbox-gl to access its mock

describe('App', () => {
  beforeEach(() => {
    // Reset mocks before each test so state from one test doesn't bleed into another
    vi.clearAllMocks();
    mapboxgl.supported.mockReturnValue(true);
  });

  it('renders without crashing and displays the map container', () => {
    render(<App />);

    // Check if the main container for the map is in the document
    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toBeInTheDocument();

    // Mapbox Map should be initialized with software rendering allowed as fallback
    expect(mapboxgl.Map).toHaveBeenCalledTimes(1);
    expect(mapboxgl.Map).toHaveBeenCalledWith({
      container: mapContainer,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [-122.3321, 47.6062],
      zoom: 9,
      projection: 'globe',
      failIfMajorPerformanceCaveat: false,
    });
  });

  it('shows WebGL error overlay when WebGL is completely unavailable', () => {
    // Both strict and lenient WebGL checks fail
    mapboxgl.supported.mockReturnValue(false);

    render(<App />);

    expect(screen.getByTestId('map-error')).toBeInTheDocument();
    expect(screen.getByText('Map Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/WebGL, which is not available/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Chrome/i).length).toBeGreaterThan(0);

    // Map should not have been initialized
    expect(mapboxgl.Map).not.toHaveBeenCalled();
  });

  it('shows generic error overlay when map initialization throws', () => {
    mapboxgl.Map.mockImplementationOnce(() => {
      throw new Error('WebGL context lost');
    });

    render(<App />);

    expect(screen.getByTestId('map-error')).toBeInTheDocument();
    expect(screen.getByText('Map Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/failed to initialize/i)).toBeInTheDocument();
  });

  it('does not show error overlay on successful initialization', () => {
    render(<App />);

    expect(screen.queryByTestId('map-error')).not.toBeInTheDocument();
  });
});
