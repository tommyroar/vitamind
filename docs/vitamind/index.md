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

## Latitude, Sun Angle, and Vitamin D Production

Vitamin D production is significantly influenced by latitude and the angle of the sun's rays, as this dictates the amount of UV-B radiation reaching the Earth's surface. UV-B radiation is essential for the skin's synthesis of vitamin D.

### Key Relationships:

*   **Solar Zenith Angle**: This is the angle of the sun's light relative to the vertical. At higher latitudes, in the early morning or late afternoon, and during winter months, the solar zenith angle increases. As this angle increases, more UV-B radiation is absorbed by the ozone layer, reducing the amount that reaches the Earth's surface and thus limiting vitamin D production. [Source: NIH]
*   **"Vitamin D Winter"**: In regions at higher latitudes (generally above 34 degrees), the sun is too low in the sky during winter months for effective UV-B penetration, making vitamin D synthesis nearly impossible. This period is often referred to as a "vitamin D winter." For example, in Boston, Massachusetts (above 34 degrees latitude), vitamin D synthesis is impossible for four months of the year, and in Edmonton, Canada, for six months. Some models suggest that at latitudes beyond 50 degrees, no vitamin D synthesis occurs outside of summer. [Source: westonaprice.org, grassrootshealth.net]
*   **Equator vs. Higher Latitudes**: Those closer to the equator, where the midday sun is high in the sky year-round, can produce vitamin D throughout the year. Even small migrations from equatorial regions can lead to significant decreases in vitamin D synthesis during non-summer months at higher latitudes. [Source: grassrootshealth.net]
*   **Optimal Sun Angle**: Studies suggest significant vitamin D3 production occurs when the solar altitude angle is greater than 45 degrees. A common guideline is that if your shadow is shorter than you are, the sun's angle is sufficient for vitamin D production. [Source: researchgate.net]
*   **Other Factors**: Beyond latitude and sun angle, other factors like clouds, air pollution (e.g., sulfur dioxide, nitrous oxide, ozone), altitude, and reflective surfaces (like snow) can also affect the amount of UV-B radiation reaching the skin and, consequently, vitamin D production. [Source: NIH, researchgate.net]

### Sources:

*   **NIH**: [National Institutes of Health](https://www.nih.gov/)
*   **westonaprice.org**: [Weston A. Price Foundation](https://www.westonaprice.org/)
*   **grassrootshealth.net**: [GrassrootsHealth](https://www.grassrootshealth.net/)
*   **researchgate.net**: [ResearchGate](https://www.researchgate.net/)

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

