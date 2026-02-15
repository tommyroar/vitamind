# Vitamind SPA

The Vitamind SPA is a tool designed to calculate sun exposure for Vitamin D production based on geographic location.

## Sun Calculation Methodology

The application uses the [**`suncalc`**](https://github.com/mourner/suncalc) library for its core astronomical calculations.

### How `suncalc` Works

`suncalc` is a powerful, lightweight JavaScript library that computes sun and moon positions and phases. Crucially, it operates using **mathematical formulas** rather than relying on large, pre-calculated datasets.

It performs calculations based on astronomical algorithms that model the Earth's orbit and tilt. By providing a specific `Date`, `latitude`, and `longitude`, it can dynamically and accurately compute celestial positions for any time, past or present.

### Project-Specific Implementation

The `solarCalculations.js` utility in this project builds upon `suncalc` to provide specialized, actionable information related to Vitamin D synthesis.

-   **Vitamin D Threshold**: The key feature is the use of a **45-degree sun altitude threshold**. Scientific research indicates that when the sun is below this angle, the atmosphere filters out most of the UVB radiation required for the skin to produce Vitamin D.
-   **Finding the "Vitamin D Window"**: The application iterates through dates to determine the precise start and end times of the day when the sun is above this 45-degree mark.
-   **Seasonal Awareness**: It can also project forward to tell you how many days are left in the "Vitamin D season" before the sun's peak daily altitude drops below 45 degrees.

## Mapbox Integration

The application integrates [Mapbox](https://docs.mapbox.com/api/) to provide an interactive geographic interface for sun data analysis.

### Visualization & Rendering

-   **[Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)**: The project utilizes the Mapbox GL JS library for high-performance, WebGL-based map rendering.
-   **Basemap**: The map uses the [`navigation-night-v1`](https://docs.mapbox.com/api/maps/styles/#mapbox-navigation-night-v1) style, which provides a clean, dark aesthetic that minimizes visual noise and ensures the UI elements remain highly legible.
-   **Navigation Controls**: Standard zoom and rotation controls are integrated to allow for easy map manipulation.

### Location Services

-   **[Geocoding API](https://docs.mapbox.com/api/search/geocoding/)**: When a user clicks the map or retrieves their position via GPS, the application calls the Mapbox Geocoding API. Specifically, it uses reverse geocoding to transform geographic coordinates (longitude and latitude) into descriptive city names.
-   **User Geolocation**: On initial load, the SPA utilizes the browser's Geolocation API to identify the user's current location. This data is used to automatically center the map and immediately present relevant solar statistics for the user's actual environment.
-   **Interactive Selection**: Users can click anywhere on the global map to instantly recalculate solar data for that specific point, enabling cross-comparison of Vitamin D potential across different regions.

