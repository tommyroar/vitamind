# Vitamind SPA

The Vitamind SPA is a tool designed to calculate sun exposure for Vitamin D production based on geographic location.

## Sun Calculation Methodology

The application uses the **`suncalc`** library for its core astronomical calculations.

### How `suncalc` Works

`suncalc` is a powerful, lightweight JavaScript library that computes sun and moon positions and phases. Crucially, it operates using **mathematical formulas** rather than relying on large, pre-calculated datasets.

It performs calculations based on astronomical algorithms that model the Earth's orbit and tilt. By providing a specific `Date`, `latitude`, and `longitude`, it can dynamically and accurately compute celestial positions for any time, past or present.

### Project-Specific Implementation

The `solarCalculations.js` utility in this project builds upon `suncalc` to provide specialized, actionable information related to Vitamin D synthesis.

-   **Vitamin D Threshold**: The key feature is the use of a **45-degree sun altitude threshold**. Scientific research indicates that when the sun is below this angle, the atmosphere filters out most of the UVB radiation required for the skin to produce Vitamin D.
-   **Finding the "Vitamin D Window"**: The application iterates through dates to determine the precise start and end times of the day when the sun is above this 45-degree mark.
-   **Seasonal Awareness**: It can also project forward to tell you how many days are left in the "Vitamin D season" before the sun's peak daily altitude drops below 45 degrees.

