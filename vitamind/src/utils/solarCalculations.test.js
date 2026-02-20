import { describe, it, expect } from 'vitest';
import { getSunStats, getVitaminDInfo, getVitaminDAreaGeoJSON, getTerminatorGeoJSON, getSubsolarPoint, getNorthernVitaminDLat } from './solarCalculations';

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
  it('should generate a GeoJSON FeatureCollection with Fill and Boundary', () => {
    const geojson = getVitaminDAreaGeoJSON(new Date('2024-03-20T12:00:00Z'));
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toHaveLength(2);
    expect(geojson.features[0].geometry.type).toBe('Polygon');
    expect(geojson.features[1].geometry.type).toBe('MultiLineString');
    expect(geojson.features[0].properties.layerType).toBe('fill');
    expect(geojson.features[1].properties.layerType).toBe('boundary');
  });

  it('should be consistent with getVitaminDInfo for San Diego on Feb 16, 2026', () => {
    const lat = 32.7361;
    const lng = -117.1611;
    const date = new Date('2026-02-16T12:00:00Z');
    
    // Check info: On Feb 16, San Diego peak altitude is 44.997 (just below 45)
    // So daysUntilVitaminD should be > 0 (it reaches 45 on Feb 17)
    const info = getVitaminDInfo(lat, lng, date);
    expect(info.daysUntilVitaminD).toBeGreaterThan(0);
    
    // Check GeoJSON area at San Diego longitude
    const geojson = getVitaminDAreaGeoJSON(date);
    const fillFeature = geojson.features.find(f => f.properties.layerType === 'fill');
    const coords = fillFeature.geometry.coordinates[0];
    
    // Find points near San Diego's longitude
    const pointsNearLng = coords.filter(c => Math.abs(c[0] - lng) <= 2);
    const latsAtLng = pointsNearLng.map(c => c[1]);
    const maxLatAtLng = Math.max(...latsAtLng);
    
    // Since peak altitude < 45, the latitude 32.7361 must be OUTSIDE the band today.
    // Specifically, for Northern Hemisphere in winter, it's above the band.
    expect(lat).toBeGreaterThan(maxLatAtLng);
  });
});

describe('getNorthernVitaminDLat', () => {
  const LA_LNG = -118.2437;

  it('should return approximately 45° at the spring equinox', () => {
    // At equinox declination ≈ 0°, so northern terminus ≈ 0 + 45 = 45°
    const lat = getNorthernVitaminDLat(new Date('2024-03-20T12:00:00Z'), LA_LNG);
    expect(lat).toBeCloseTo(45, 0);
  });

  it('should return approximately 68.5° at summer solstice', () => {
    // Declination ≈ +23.5°, northern terminus ≈ 23.5 + 45 = 68.5°
    const lat = getNorthernVitaminDLat(new Date('2024-06-20T12:00:00Z'), LA_LNG);
    expect(lat).toBeCloseTo(68.5, 0);
  });

  it('should return approximately 21.5° at winter solstice', () => {
    // Declination ≈ -23.5°, northern terminus ≈ -23.5 + 45 = 21.5°
    const lat = getNorthernVitaminDLat(new Date('2024-12-21T12:00:00Z'), LA_LNG);
    expect(lat).toBeCloseTo(21.5, 0);
  });

  it('should return approximately 33–34° near Long Beach for 2026-02-19', () => {
    // Declination ≈ -11°, northern terminus ≈ 34° (Long Beach is ~33.8°N).
    // Use a range rather than exact match due to SunCalc precision.
    const lat = getNorthernVitaminDLat(new Date('2026-02-19T12:00:00Z'), LA_LNG);
    expect(lat).toBeGreaterThan(32);
    expect(lat).toBeLessThan(35);
  });

  it('should never exceed 90°', () => {
    // Even at extreme declinations the result must be clamped
    const lat = getNorthernVitaminDLat(new Date('2024-06-20T12:00:00Z'), 0);
    expect(lat).toBeLessThanOrEqual(90);
  });

  it('should always be greater than or equal to decDeg (always north of subsolar point)', () => {
    const date = new Date('2024-09-15T12:00:00Z');
    const { lat: decDeg } = getSubsolarPoint(date);
    const northLat = getNorthernVitaminDLat(date, LA_LNG);
    expect(northLat).toBeGreaterThanOrEqual(decDeg);
  });

  it('should be consistent with the max latitude in getVitaminDAreaGeoJSON at the same longitude', () => {
    // Use -118 (on the 2° grid) to avoid interpolation mismatch
    const date = new Date('2024-03-20T12:00:00Z');
    const gridLng = -118;
    const northLat = getNorthernVitaminDLat(date, gridLng);

    const geojson = getVitaminDAreaGeoJSON(date);
    const fill = geojson.features.find(f => f.properties.layerType === 'fill');
    const maxLat = Math.max(...fill.geometry.coordinates[0]
      .filter(c => c[0] === gridLng)
      .map(c => c[1]));

    expect(northLat).toBeCloseTo(maxLat, 1);
  });
});

describe('getTerminatorGeoJSON', () => {
  it('should generate a GeoJSON FeatureCollection', () => {
    const geojson = getTerminatorGeoJSON(new Date('2024-03-20T12:00:00Z'));
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBeGreaterThanOrEqual(1);
    expect(geojson.features.some(f => f.properties.layerType === 'fill')).toBe(true);
    expect(geojson.features.some(f => f.properties.layerType === 'boundary')).toBe(true);
  });
});