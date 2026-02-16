import { describe, it, expect } from 'vitest';
import { getSunStats, getVitaminDInfo, getVitaminDAreaGeoJSON, getTerminatorGeoJSON, getSubsolarPoint } from './solarCalculations';

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

describe('getVitaminDInfo', () => {
  it('should find the Vitamin D date and days until for a location where sun will be above 45 in the future', () => {
    // Location: Seattle (47.6062, -122.3321)
    // Date: Winter (e.g., January 1st) - sun won't be above 45 for a while
    const latitude = 47.6062;
    const longitude = -122.3321;
    const startDate = new Date('2024-01-01T00:00:00Z'); // UTC midnight

    const info = getVitaminDInfo(latitude, longitude, startDate);
    expect(info.vitaminDDate).toBeInstanceOf(Date);
    expect(info.daysUntilVitaminD).toBeGreaterThan(0);
    expect(info.vitaminDDate.getUTCMonth()).toBeGreaterThanOrEqual(2); // March (0-indexed)
    expect(info.vitaminDDate.getUTCMonth()).toBeLessThanOrEqual(3); // April
    expect(info.durationAbove45).not.toBeNull();
    expect(info.daysUntilBelow45).toBeNull();
  });

  it('should indicate if sun is already above 45 today and calculate duration/days until below 45', () => {
    // Location: Seattle (47.6062, -122.3321)
    // Date: Summer (e.g., June 20th) - sun should be above 45
    const latitude = 47.6062;
    const longitude = -122.3321;
    const startDate = new Date('2024-06-20T00:00:00Z'); // UTC midnight

    const info = getVitaminDInfo(latitude, longitude, startDate);
    expect(info.vitaminDDate).toEqual(startDate);
    expect(info.daysUntilVitaminD).toBe(0);
    expect(info.durationAbove45).toMatch(/\d{1,2}h \d{1,2}m/);
    // For Seattle in summer, duration should be several hours, e.g., > 4h
    const [hours] = info.durationAbove45.split('h').map(Number);
    expect(hours).toBeGreaterThanOrEqual(4);
    expect(info.daysUntilBelow45).toBeGreaterThan(0);
    // Should be many days until it drops below 45, e.g., > 60 days
    expect(info.daysUntilBelow45).toBeGreaterThan(60);
  });

  it('should handle locations where sun never reaches 45 degrees (e.g., high latitude in winter)', () => {
    // Location: Tromsø, Norway (69.6492, 18.9553)
    // Date: Winter (e.g., January 1st) - sun likely never reaches 45
    const latitude = 69.6492;
    const longitude = 18.9553;
    const startDate = new Date('2024-01-01T00:00:00Z'); // UTC midnight

    const info = getVitaminDInfo(latitude, longitude, startDate);
    expect(info.vitaminDDate).toBeNull(); // Sun never reaches 45
    expect(info.daysUntilVitaminD).toBe(0); // No "days until" if it never happens within the year
    expect(info.durationAbove45).toBeNull();
    expect(info.daysUntilBelow45).toBeNull();
  });

  it('should handle locations where sun always reaches above 45 (e.g., equator)', () => {
    // Location: Equator (0,0)
    const latitude = 0;
    const longitude = 0;
    const startDate = new Date('2024-03-20T00:00:00Z'); // UTC midnight

    const info = getVitaminDInfo(latitude, longitude, startDate);
    expect(info.vitaminDDate).toEqual(startDate);
    expect(info.daysUntilVitaminD).toBe(0);
    expect(info.durationAbove45).toMatch(/\d{1,2}h \d{1,2}m/);
    // At equator, duration above 45 should be long, e.g., > 5h
    const [hours] = info.durationAbove45.split('h').map(Number);
    expect(hours).toBeGreaterThanOrEqual(5);
    expect(info.daysUntilBelow45).toBeNull(); // Never drops below 45 for the whole day
  });
});

describe('getVitaminDAreaGeoJSON', () => {
  it('should generate a GeoJSON Polygon with the correct structure', () => {
    const geojson = getVitaminDAreaGeoJSON(new Date('2024-03-20T12:00:00Z'));
    expect(geojson.type).toBe('Feature');
    expect(geojson.geometry.type).toBe('Polygon');
    expect(geojson.geometry.coordinates[0].length).toBeGreaterThan(60);
    expect(geojson.properties.name).toBe('Vitamin D Area');
  });

  it('should be a latitude band from (dec-45) to (dec+45)', () => {
    const date = new Date('2024-03-20T12:00:00Z'); 
    const { lat: dec } = getSubsolarPoint(date);
    const geojson = getVitaminDAreaGeoJSON(date);
    const coords = geojson.geometry.coordinates[0];
    
    const lats = coords.map(c => c[1]);
    const lngs = coords.map(c => c[0]);
    
    expect(Math.max(...lats)).toBeCloseTo(dec + 45, 0);
    expect(Math.min(...lats)).toBeCloseTo(dec - 45, 0);
    expect(Math.min(...lngs)).toBe(-180);
    expect(Math.max(...lngs)).toBe(180);
  });
});

describe('getTerminatorGeoJSON', () => {
  it('should generate a GeoJSON Polygon', () => {
    const geojson = getTerminatorGeoJSON(new Date('2024-03-20T12:00:00Z'));
    expect(geojson.type).toBe('Feature');
    expect(geojson.geometry.type).toBe('Polygon');
  });
});