import SunCalc from 'suncalc';

/**
 * Formats a Date object into a 2-digit hour/minute string.
 * @param {Date} date - The date to format.
 * @returns {string} Formatted time string (e.g., "12:30 PM").
 */
export function formatTime(date) {
  if (!date) return 'N/A';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function calculateDayLength(times, highestSunAngle) {
  const { sunrise, sunset } = times;

  // If both sunrise and sunset are valid dates and sunset is after sunrise
  if (sunrise instanceof Date && sunset instanceof Date && sunset.getTime() > sunrise.getTime()) {
    const diff = sunset.getTime() - sunrise.getTime(); // Difference in milliseconds
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  } else {
    // If sunrise or sunset are null, or sunset is before sunrise (edge case for SunCalc),
    // it's effectively a polar day/night scenario for day length calculation.
    if (parseFloat(highestSunAngle) > 0) {
      return '24h 0m'; // Perpetual day
    } else {
      return '0h 0m'; // Perpetual night
    }
  }
}

/**
 * Calculates various sun statistics for a given location and date.
 * @param {number} latitude - The latitude of the location.
 * @param {number} longitude - The longitude of the location.
 * @param {Date} [date=new Date()] - The date for which to calculate the sun statistics. Defaults to today.
 * @returns {object} An object containing highestSunAngle, solarNoonTime, and dayLength.
 */
export function getSunStats(latitude, longitude, date = new Date()) {
  const times = SunCalc.getTimes(date, latitude, longitude);
  const solarNoon = times.solarNoon;

  let highestSunAngle = 0;
  if (solarNoon) {
    const sunPosition = SunCalc.getPosition(solarNoon, latitude, longitude);
    const altitudeDegrees = sunPosition.altitude * 180 / Math.PI;
    highestSunAngle = Math.max(0, altitudeDegrees);
  }

  const formattedHighestSunAngle = highestSunAngle.toFixed(2);
  const solarNoonTime = formatTime(solarNoon);
  const dayLength = calculateDayLength(times, formattedHighestSunAngle); // Pass times and highestSunAngle

  return { highestSunAngle: formattedHighestSunAngle, solarNoonTime, dayLength };
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Calculates information related to Vitamin D production based on sun's altitude.
 * Finds the first day (including today) where the sun's highest daily angle exceeds 45 degrees.
 * @param {number} latitude - The latitude of the location.
 * @param {number} longitude - The longitude of the location.
 * @param {Date} [startDate=new Date()] - The starting date for the calculation. Defaults to today.
 * @returns {object} An object containing vitaminDDate (Date), daysUntilVitaminD (number),
 *                   startTimeAbove45 (Date), endTimeAbove45 (Date),
 *                   and potentially durationAbove45 (string) and daysUntilBelow45 (number).
 */
export function getVitaminDInfo(latitude, longitude, startDate = new Date()) {
  const today = new Date(startDate);
  today.setUTCHours(0, 0, 0, 0); // Normalize to start of UTC day

  let vitaminDDate = null;
  let daysUntilVitaminD = 0;

  // Find the first day where highest sun angle >= 45
  for (let i = 0; i < 366; i++) { // Check up to a year from now
    const currentDate = addDays(today, i);
    const times = SunCalc.getTimes(currentDate, latitude, longitude);
    const solarNoon = times.solarNoon;

    if (solarNoon) {
      const sunPosition = SunCalc.getPosition(solarNoon, latitude, longitude);
      const altitudeDegrees = sunPosition.altitude * 180 / Math.PI;
      if (altitudeDegrees >= 45) {
        vitaminDDate = currentDate;
        daysUntilVitaminD = i;
        break;
      }
    }
  }

  let startTimeAbove45 = null;
  let endTimeAbove45 = null;
  let durationAbove45 = null;
  let daysUntilBelow45 = null;

  if (vitaminDDate) {
    // Find exact times on that date
    // We search the entire identified date
    const startOfDay = new Date(vitaminDDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    // Iterate every minute
    for (let i = 0; i < 24 * 60; i++) {
      const currentTime = new Date(startOfDay.getTime() + i * 60 * 1000);
      const sunPos = SunCalc.getPosition(currentTime, latitude, longitude);
      const altitude = sunPos.altitude * 180 / Math.PI;
      
      if (altitude >= 45) {
        if (!startTimeAbove45) startTimeAbove45 = currentTime;
        endTimeAbove45 = currentTime;
      }
    }

    if (startTimeAbove45 && endTimeAbove45) {
      const diffMinutes = Math.round((endTimeAbove45 - startTimeAbove45) / (1000 * 60));
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      durationAbove45 = `${hours}h ${minutes}m`;
    }

    // If it's today, find how many days until it drops below 45
    if (daysUntilVitaminD === 0) {
      for (let i = 1; i < 366; i++) {
        const futureDate = addDays(today, i);
        const times = SunCalc.getTimes(futureDate, latitude, longitude);
        const solarNoon = times.solarNoon;

        let highestFutureAngle = 0;
        if (solarNoon) {
          const sunPosition = SunCalc.getPosition(solarNoon, latitude, longitude);
          highestFutureAngle = sunPosition.altitude * 180 / Math.PI;
        }
        
        if (highestFutureAngle < 45) {
          daysUntilBelow45 = i;
          break;
        }
      }
    }
  }

  return { vitaminDDate, daysUntilVitaminD, startTimeAbove45, endTimeAbove45, durationAbove45, daysUntilBelow45 };
}

/**
 * Calculates the maximum solar angle for the 15th of each month for a year.
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Array<{month: string, angle: number}>}
 */
export function getYearlySunData(latitude, longitude) {
  const data = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = new Date().getFullYear();

  for (let m = 0; m < 12; m++) { // Note: 'i' should be 'm' in loop
    // Middle of the month for a representative angle
    const date = new Date(Date.UTC(year, m, 15, 12, 0, 0));
    const times = SunCalc.getTimes(date, latitude, longitude);
    const solarNoon = times.solarNoon || date;
    const sunPos = SunCalc.getPosition(solarNoon, latitude, longitude);
    const angle = Math.max(0, sunPos.altitude * 180 / Math.PI);
    data.push({ month: monthNames[m], angle });
  }
  return data;
}

/**
 * Generates a GeoJSON polygon representing the nighttime area (solar terminator).
 * @param {Date} [date=new Date()] - The date for which to calculate the terminator.
 * @returns {object} GeoJSON Feature representing the nighttime polygon.
 */
export function getTerminatorGeoJSON(date = new Date()) {
  // More accurate subsolar point calculation:
  const msInDay = 86400000;
  const time = date.getTime();
  const day = (time / msInDay) - (new Date('2000-01-01T12:00:00Z').getTime() / msInDay);
  const omega = 2.142980185 + 4.3943358517 * day;
  const e = 0.016709 - 0.00004193 * day;
  const m = 6.24006 + 6.283019552 * day;
  const l = m + e * Math.sin(m) * (2.0 + 2.5 * e * Math.cos(m)) + 0.033 * Math.sin(2.0 * m);
  const z = l + 0.0003 + 0.0048 * Math.cos(omega) + 0.0003 * Math.sin(omega);
  const eps = 0.40909 - 0.000000226 * day;
  const dec = Math.asin(Math.sin(eps) * Math.sin(z));
  
  // Greenwich Mean Sidereal Time
  const gmst = 18.697374558 + 24.06570982441908 * day;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(z), Math.cos(z));
  const lon = ((ra - (gmst * Math.PI / 12)) % (2 * Math.PI)) * 180 / Math.PI;
  const lat = dec * 180 / Math.PI;

  const points = [];
  const resolution = 2; // degrees
  
  // The terminator is a great circle 90 degrees away from the subsolar point
  for (let i = 0; i <= 360; i += resolution) {
    const angle = i * Math.PI / 180;
    const latRad = lat * Math.PI / 180;
    const lonRad = lon * Math.PI / 180;
    
    // Parametric equation of a great circle
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    
    const pLat = Math.asin(Math.cos(latRad) * x);
    const pLon = Math.atan2(Math.sin(latRad) * x, y) + lonRad;
    
    let pLonDeg = pLon * 180 / Math.PI;
    const pLatDeg = pLat * 180 / Math.PI;
    
    // Normalize longitude
    while (pLonDeg > 180) pLonDeg -= 360;
    while (pLonDeg < -180) pLonDeg += 360;
    
    points.push([pLonDeg, pLatDeg]);
  }

  // Sort points by longitude to avoid self-intersection when creating the polygon
  // For a proper night polygon, we need to decide which side is night.
  // The subsolar point is the center of the day. The antipode is the center of the night.
  
  // To handle the poles and wrapping, we construct the polygon by adding corners
  const nightPoints = [...points];
  
  // Check if north pole or south pole is in night
  // If subsolar lat > 0, south pole is in night. If < 0, north pole is in night.
  if (lat > 0) {
    // South pole is in dark
    nightPoints.push([180, -90]);
    nightPoints.push([-180, -90]);
  } else {
    // North pole is in dark
    nightPoints.push([180, 90]);
    nightPoints.push([-180, 90]);
  }
  nightPoints.push(nightPoints[0]);

  return {
    type: 'Feature',
    properties: { name: 'Night' },
    geometry: {
      type: 'Polygon',
      coordinates: [nightPoints]
    }
  };
}