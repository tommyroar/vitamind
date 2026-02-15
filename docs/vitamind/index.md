# VitaminD

The [VitaminD web application](https://tommyroar.github.io/maps/vitamind/) is a tool designed to predict when sufficient sun exposure for Vitamin D production will occur based on geographic location and sun data. It is built as a Single Page App (React) deployed via GitHub Pages.

## Latitude, Sun Angle, and Vitamin D Production

Vitamin D production is significantly influenced by latitude and the angle of the sun's rays, as this dictates the amount of UV-B radiation reaching the Earth's surface. UV-B radiation is essential for the skin's synthesis of Vitamin D.

### Key Relationships:

*   **Solar Zenith Angle**: This is the angle of the sun's light relative to the vertical. At higher latitudes, in the early morning or late afternoon, and during winter months, the solar zenith angle increases. As this angle increases, more UV-B radiation is absorbed by the ozone layer, reducing the amount that reaches the Earth's surface and thus limiting vitamin D production. [Source: National Institutes of Health](https://ods.od.nih.gov/factsheets/VitaminD-Consumer/)
*   **"Vitamin D Winter"**: In regions at higher latitudes (generally above 34 degrees), the sun is too low in the sky during winter months for effective UV-B penetration, making vitamin D synthesis nearly impossible. This period is often referred to as a "vitamin D winter." For example, in Boston, Massachusetts (above 34 degrees latitude), vitamin D synthesis is impossible for four months of the year, and in Edmonton, Canada, for six months. Some models suggest that at latitudes beyond 50 degrees, no vitamin D synthesis occurs outside of summer. [Source: Weston A. Price Foundation](https://www.westonaprice.org/health-topics/modern-diseases/the-miracle-of-vitamin-d/)
*   **Equator vs. Higher Latitudes**: Those closer to the equator, where the midday sun is high in the sky year-round, can produce vitamin D throughout the year. Even small migrations from equatorial regions can lead to significant decreases in vitamin D synthesis during non-summer months at higher latitudes. [Source: GrassrootsHealth](https://www.grassrootshealth.net/blog/sun-exposure-vitamin-d-benefits/)
*   **Optimal Sun Angle**: Studies suggest significant vitamin D3 production occurs when the solar altitude angle is greater than 45 degrees. A common guideline is that if your shadow is shorter than you are, the sun's angle is sufficient for vitamin D production. [Source: National Institutes of Health (Health Professional Fact Sheet)](https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/)
*   **Other Factors**: Beyond latitude and sun angle, other factors like clouds, air pollution (e.g., sulfur dioxide, nitrous oxide, ozone), altitude, and reflective surfaces (like snow) can also affect the amount of UV-B radiation reaching the skin and, consequently, vitamin D production. [Source: National Institutes of Health](https://ods.od.nih.gov/factsheets/VitaminD-Consumer/)

### Monthly Sun Exposure Recommendations

General guidelines for sun exposure to produce Vitamin D focus on daily or weekly exposure, which can be extrapolated over a month. Key factors influencing the duration of exposure required:

*   **UV Index**: A UV Index of 3 or higher is generally required for effective Vitamin D synthesis. When the UV Index is below 3 (common during winter months in many regions), Vitamin D production is significantly limited or impossible. [Source: health.vic.gov.au]
*   **Skin Type**: Individuals with darker skin tones possess more melanin, which acts as a natural sunscreen, necessitating three to six times more sun exposure than those with lighter skin to produce an equivalent amount of Vitamin D. [Source: National Institutes of Health](https://ods.od.nih.gov/factsheets/VitaminD-Consumer/)
*   **Time of Day**: The most effective period for Vitamin D production is typically between 10 a.m. and 3 p.m. when UVB rays are strongest. [Source: examine.com]
*   **Amount of Skin Exposed**: Exposing areas like the face, arms, and hands for a few minutes most days when the UV index is 3 or above can be sufficient for many.
*   **Latitude and Season**: As previously discussed, higher latitudes and winter months drastically reduce the potential for Vitamin D synthesis.

**General Exposure Guidelines:**
For most individuals, 5 to 30 minutes of unprotected sun exposure to the hands, face, and arms, at least three times a week, between 10 a.m. and 3 p.m., is often considered sufficient to prevent Vitamin D deficiency when conditions (UV Index > 3) are optimal. It's crucial to balance this with minimizing the risk of skin damage and cancer. Longer exposure periods do not necessarily lead to more Vitamin D production, as UVB rays eventually degrade the vitamin D already synthesized, acting as a natural safety mechanism. In situations where adequate sun exposure is not feasible, dietary intake or supplementation may be necessary. [Source: examine.com, health.vic.gov.au]

### Sources:

*   **National Institutes of Health**: [Consumer Fact Sheet](https://ods.od.nih.gov/factsheets/VitaminD-Consumer/), [Health Professional Fact Sheet](https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/)
*   **Weston A. Price Foundation**: [The Miracle of Vitamin D](https://www.westonaprice.org/health-topics/modern-diseases/the-miracle-of-vitamin-d/)
*   **GrassrootsHealth**: [Sun Exposure & Vitamin D Benefits](https://www.grassrootshealth.net/blog/sun-exposure-vitamin-d-benefits/)
*   **health.vic.gov.au**: [Better Health Channel - Vitamin D - sun exposure](https://www.betterhealth.vic.gov.au/health/healthyliving/vitamin-d-sun-exposure)
*   **examine.com**: [Vitamin D - Scientific References](https://examine.com/supplements/vitamin-d/research/#how-to-optimize-vitamin-d-levels)


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

