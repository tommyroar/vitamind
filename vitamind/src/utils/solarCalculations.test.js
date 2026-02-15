import { describe, it, expect } from 'vitest';
import { getHighestDailySunAngle } from './solarCalculations';

describe('getHighestDailySunAngle', () => {
  it('should calculate the highest daily sun angle for a given location and date (equator, equinox)', () => {
    // Location: Equator (0, 0), Date: Spring Equinox (March 20)
    const latitude = 0;
    const longitude = 0;
    const date = new Date('2024-03-20T12:00:00Z'); // UTC noon on equinox

    const angle = getHighestDailySunAngle(latitude, longitude, date);
    // At the equator on an equinox, the sun should be directly overhead (90 degrees) at solar noon.
    // Allow for a small margin of error due to floating point and library precision.
    expect(angle).toBeCloseTo(90, 0); // 0 decimal place precision
  });

  it('should calculate the highest daily sun angle for a specific location (Seattle, Summer Solstice)', () => {
    // Location: Seattle (47.6062, -122.3321), Date: Summer Solstice (June 20)
    const latitude = 47.6062;
    const longitude = -122.3321;
    const date = new Date('2024-06-20T12:00:00Z'); // UTC noon on solstice

    const angle = getHighestDailySunAngle(latitude, longitude, date);
    // Expected value will be less than 90. Need an approximate value.
    // For Seattle on Summer Solstice, the sun's highest angle should be around 65-66 degrees.
    // This value can be verified using an online solar calculator for June 20, 2024, at Seattle's coordinates.
    expect(angle).toBeGreaterThan(60);
    expect(angle).toBeLessThan(70);
    expect(angle).toBeCloseTo(66, 0); // Approximation from online calculators
  });

  it('should calculate the highest daily sun angle for a specific location (Seattle, Winter Solstice)', () => {
    // Location: Seattle (47.6062, -122.3321), Date: Winter Solstice (December 21)
    const latitude = 47.6062;
    const longitude = -122.3321;
    const date = new Date('2024-12-21T12:00:00Z'); // UTC noon on solstice

    const angle = getHighestDailySunAngle(latitude, longitude, date);
    // For Seattle on Winter Solstice, the sun's highest angle should be around 18-20 degrees.
    expect(angle).toBeGreaterThan(15);
    expect(angle).toBeLessThan(25);
    expect(angle).toBeCloseTo(19, 0); // Approximation from online calculators
  });

  it('should return 0 for locations where solarNoon is undefined (e.g., near poles during polar night)', () => {
    // Location: North Pole (90, 0), Date: Winter Solstice (December 21)
    const latitude = 90;
    const longitude = 0;
    const date = new Date('2024-12-21T12:00:00Z'); // During polar night

    const angle = getHighestDailySunAngle(latitude, longitude, date);
    expect(angle).toBe(0);
  });
});
