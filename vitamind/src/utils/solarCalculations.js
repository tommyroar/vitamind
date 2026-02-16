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
 * Calculates the subsolar point (latitude and longitude) for a given date.
 * @param {Date} date 
 * @returns {{lat: number, lng: number}}
 */
export function getSubsolarPoint(date) {
  const sunPosAtNorthPole = SunCalc.getPosition(date, 90, 0);
  const decDeg = sunPosAtNorthPole.altitude * 180 / Math.PI;
  
  // Calculate Subsolar Longitude
  // Sun is over 0° longitude at solar noon at the prime meridian.
  const timesAtZero = SunCalc.getTimes(date, 0, 0);
  const solarNoonAtZero = timesAtZero.solarNoon;
  
  if (!solarNoonAtZero) {
    // Fallback to simple approximation if SunCalc fails
    const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    return { lat: decDeg, lng: (12 - utcHours) * 15 };
  }

  const utcTime = date.getTime();
  const solarNoonTime = solarNoonAtZero.getTime();
  
  // Each hour difference is 15 degrees. 
  // If date is BEFORE solar noon, the sun is to the EAST (positive longitude).
  // If date is AFTER solar noon, the sun is to the WEST (negative longitude).
  const sunLng = (solarNoonTime - utcTime) / (1000 * 60 * 60) * 15;

  return { lat: decDeg, lng: sunLng };
}

/**
 * Generates a GeoJSON polygon representing the area where the sun will rise above 45 degrees today.
 * This is a latitude band from (declination - 45) to (declination + 45).
 * @param {Date} [date=new Date()] - The date for which to calculate.
 * @returns {object} GeoJSON Feature representing the Vitamin D area.
 */
export function getVitaminDAreaGeoJSON(date = new Date()) {
  const { lat: decDeg } = getSubsolarPoint(date);
  
  const minLat = Math.max(-90, decDeg - 45);
  const maxLat = Math.min(90, decDeg + 45);

  // Define the band. We use multiple points along the top and bottom to ensure 
  // correct rendering on a globe projection.
  const points = [];
  for (let lng = -180; lng <= 180; lng += 10) {
    points.push([lng, minLat]);
  }
  for (let lng = 180; lng >= -180; lng -= 10) {
    points.push([lng, maxLat]);
  }
  points.push(points[0]); // Close the polygon

  return {
    type: 'Feature',
    properties: { name: 'Vitamin D Area' },
    geometry: {
      type: 'Polygon',
      coordinates: [points]
    }
  };
}

/**
 * Generates a GeoJSON polygon representing the nighttime area (solar terminator).
 * @param {Date} [date=new Date()] - The date for which to calculate the terminator.
 * @returns {object} GeoJSON Feature representing the nighttime polygon.
 */
export function getTerminatorGeoJSON(date = new Date()) {
  const { lat: decDeg, lng: sunLng } = getSubsolarPoint(date);
  const dec = decDeg * Math.PI / 180;

  const points = [];
  const resolution = 2; // degrees

  // 3. Generate the terminator line
  // tan(phi) = -cos(lng - sunLng) / tan(dec)
  for (let lng = -180; lng <= 180; lng += resolution) {
    const h = (lng - sunLng) * Math.PI / 180;
    const tanPhi = -Math.cos(h) / Math.tan(dec);
    let lat = Math.atan(tanPhi) * 180 / Math.PI;
    points.push([lng, lat]);
  }

  // 4. Construct the nighttime polygon
  const nightPoints = [...points];
  if (decDeg > 0) {
    // South Pole is in dark
    nightPoints.push([180, -90]);
    nightPoints.push([-180, -90]);
  } else {
    // North Pole is in dark
    nightPoints.push([180, 90]);
    nightPoints.push([-180, 90]);
  }
  nightPoints.push(nightPoints[0]); // Close the polygon

  return {
    type: 'Feature',
    properties: { name: 'Night' },
    geometry: {
      type: 'Polygon',
      coordinates: [nightPoints]
    }
  };
}