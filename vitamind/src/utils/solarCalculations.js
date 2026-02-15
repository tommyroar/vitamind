import SunCalc from 'suncalc';

/**
 * Calculates the highest daily angle of the sun (solar noon altitude) for a given location and date.
 * @param {number} latitude - The latitude of the location.
 * @param {number} longitude - The longitude of the location.
 * @param {Date} [date=new Date()] - The date for which to calculate the solar angle. Defaults to today.
 * @returns {number} The solar altitude in degrees at solar noon.
 */
export function getHighestDailySunAngle(latitude, longitude, date = new Date()) {
  const times = SunCalc.getTimes(date, latitude, longitude);
  const solarNoon = times.solarNoon;

  if (!solarNoon) {
    // This can happen for locations near the poles during certain times of the year
    return 0; // Or throw an error, depending on desired behavior
  }

  const sunPosition = SunCalc.getPosition(solarNoon, latitude, longitude);
  // Convert radians to degrees for altitude
  const altitudeDegrees = sunPosition.altitude * 180 / Math.PI;

  // If the sun is always below the horizon, the highest angle is 0.
  return Math.max(0, altitudeDegrees);
}