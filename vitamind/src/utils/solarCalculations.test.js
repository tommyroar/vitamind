import { describe, it, expect } from 'vitest';
import { getSunStats } from './solarCalculations';

describe('getSunStats', () => {
  it('should calculate the highest daily sun angle, solar noon time, and day length for a given location and date (equator, equinox)', () => {
    // Location: Equator (0, 0), Date: Spring Equinox (March 20)
    const latitude = 0;
    const longitude = 0;
    const date = new Date('2024-03-20T12:00:00Z'); // UTC noon on equinox

    const stats = getSunStats(latitude, longitude, date);
    expect(stats.highestSunAngle).toBeCloseTo(90, 0); // At the equator on an equinox, the sun should be directly overhead (90 degrees)
    expect(stats.solarNoonTime).toMatch(/\d{1,2}:\d{2} (AM|PM)/); // Check format
    expect(stats.dayLength).toMatch(/\d{1,2}h \d{1,2}m/); // Check format
  });

  it('should calculate sun stats for a specific location (Seattle, Summer Solstice)', () => {
    // Location: Seattle (47.6062, -122.3321), Date: Summer Solstice (June 20)
    const latitude = 47.6062;
    const longitude = -122.3321;
    const date = new Date('2024-06-20T12:00:00Z'); // UTC noon on solstice

    const stats = getSunStats(latitude, longitude, date);
    expect(stats.highestSunAngle).toBeCloseTo(66, 0); // Around 65-66 degrees
    expect(stats.solarNoonTime).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
    // Day length in Seattle in June should be long, e.g., >= 15h
    const [hours] = stats.dayLength.split('h').map(Number);
    expect(hours).toBeGreaterThanOrEqual(15); // Changed to toBeGreaterThanOrEqual
  });

  it('should calculate sun stats for a specific location (Seattle, Winter Solstice)', () => {
    // Location: Seattle (47.6062, -122.3321), Date: Winter Solstice (December 21)
    const latitude = 47.6062;
    const longitude = -122.3321;
    const date = new Date('2024-12-21T12:00:00Z'); // UTC noon on solstice

    const stats = getSunStats(latitude, longitude, date);
    expect(stats.highestSunAngle).toBeCloseTo(19, 0); // Around 18-20 degrees
    expect(stats.solarNoonTime).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
    // Day length in Seattle in December should be short, e.g., < 9h
    const [hours] = stats.dayLength.split('h').map(Number);
    expect(hours).toBeLessThan(9);
  });

  it('should return 0.00 for highestSunAngle, a valid solarNoonTime, and "0h 0m" for dayLength for locations during polar night', () => { // Updated description
    // Location: North Pole (90, 0), Date: Winter Solstice (December 21)
    const latitude = 90;
    const longitude = 0;
    const date = new Date('2024-12-21T12:00:00Z'); // During polar night

    const stats = getSunStats(latitude, longitude, date);
    expect(stats.highestSunAngle).toBe('0.00'); // Check string representation
    expect(stats.solarNoonTime).toMatch(/\d{1,2}:\d{2} (AM|PM)/); // Solar noon is still defined, even if sun is below horizon
    expect(stats.dayLength).toBe('0h 0m'); // Updated expected day length
  });

  it('should return correct highestSunAngle, solarNoonTime, and 24h dayLength for locations during polar day', () => {
    // Location: North Pole (90, 0), Date: Summer Solstice (June 20)
    const latitude = 90;
    const longitude = 0;
    const date = new Date('2024-06-20T12:00:00Z'); // During polar day

    const stats = getSunStats(latitude, longitude, date);
    expect(stats.highestSunAngle).toBeCloseTo(23.4, 0); // Sun is always above horizon, highest point is 90 - latitude + axial tilt (approx 23.4)
    expect(stats.solarNoonTime).toMatch(/\d{1,2}:\d{2} (AM|PM)/); // Solar noon is still defined
    expect(stats.dayLength).toBe('24h 0m'); // Day length for polar day should be 24h
  });
});
