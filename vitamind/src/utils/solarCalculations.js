import SunCalc from 'suncalc';

function formatTime(date) {
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
 *                   and potentially durationAbove45 (string) and daysUntilBelow45 (number) if sun is above 45 today.
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

  // If today's highest angle is already >= 45
  let durationAbove45 = null;
  let daysUntilBelow45 = null;

  if (vitaminDDate && daysUntilVitaminD === 0) {
    // Calculate duration sun is above 45 degrees today
    const intervalMinutes = 5;
    let minutesAbove45 = 0;
    const startOfDay = new Date(today);
    startOfDay.setUTCHours(0, 0, 0, 0); // Ensure startOfDay is UTC normalized

    for (let i = 0; i < (24 * 60) / intervalMinutes; i++) {
      const currentTime = new Date(startOfDay.getTime() + i * intervalMinutes * 60 * 1000);
      const sunPos = SunCalc.getPosition(currentTime, latitude, longitude);
      if (sunPos.altitude * 180 / Math.PI >= 45) {
        minutesAbove45 += intervalMinutes;
      }
    }
    const hours = Math.floor(minutesAbove45 / 60);
    const minutes = minutesAbove45 % 60;
    durationAbove45 = `${hours}h ${minutes}m`;

    // Calculate how many days until highest angle drops below 45 for the whole day
    for (let i = 1; i < 366; i++) { // Check up to a year from tomorrow
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

  return { vitaminDDate, daysUntilVitaminD, durationAbove45, daysUntilBelow45 };
}