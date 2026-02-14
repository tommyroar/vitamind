// src/setupTests.js
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Set environment variable for process.env fallback
process.env.REACT_APP_MAPBOX_ACCESS_TOKEN = 'pk.test-token-from-process-env';

// Mock matchMedia for testing responsive components
window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

// Mock Mapbox GL JS to prevent errors during tests
// mapbox-gl requires a DOM environment and will error if not mocked
// We're mocking the core Map and NavigationControl to avoid runtime errors
vi.mock('mapbox-gl', () => {
  const mapboxgl = {
    Map: vi.fn(() => ({
      remove: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      addControl: vi.fn(),
    })),
    NavigationControl: vi.fn(),
    Marker: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
    })),
    accessToken: 'pk.test-token',
  };
  return {
    __esModule: true, // This indicates it's an ES module with a default export
    default: mapboxgl,
    ...mapboxgl, // Also export named properties for convenience if needed
  };
});
