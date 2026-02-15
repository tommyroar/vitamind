import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './vitamind.css';
import { getSunStats, getVitaminDInfo, formatTime, getYearlySunData } from './utils/solarCalculations';

// Set your Mapbox access token from environment variable
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const FONT_SIZE_STORAGE_KEY = 'vitamind_modal_font_size';
const DEFAULT_FONT_SIZE = 1.0; // Corresponds to 1em
const MODAL_SIZE_STORAGE_KEY = 'vitamind_modal_size';
const DEFAULT_MODAL_SIZE = 1.0; // Corresponds to 100% of base dimensions
const BASE_MODAL_WIDTH = 400; // Base width in pixels
const BASE_MODAL_HEIGHT = 350; // Base height in pixels

const SunAngleGraph = ({ yearlyData, highestSunAngle, vitaminDDate, daysUntilVitaminD }) => {
  if (!yearlyData || !yearlyData.length) return null;

  const width = 350;
  const height = 100;
  const padding = 20;
  const graphWidth = width - 2 * padding;
  const graphHeight = height - 2 * padding;

  const points = yearlyData.map((d, i) => {
    const x = padding + (i / 11) * graphWidth;
    const y = padding + graphHeight - (d.angle / 90) * graphHeight;
    return `${x},${y}`;
  }).join(' ');

  const today = new Date();
  const currentMonthIndex = today.getMonth();
  const currentDay = today.getDate();
  // Approximate current position on X axis
  const currentX = padding + ((currentMonthIndex + currentDay / 30) / 12) * graphWidth;
  const currentY = padding + graphHeight - (parseFloat(highestSunAngle) / 90) * graphHeight;

  // Calculate V-Day position if it's in the future
  let vDayX = null;
  let vDayY = null;
  if (vitaminDDate && daysUntilVitaminD > 0) {
    const vMonthIndex = vitaminDDate.getMonth();
    const vDay = vitaminDDate.getDate();
    vDayX = padding + ((vMonthIndex + vDay / 30) / 12) * graphWidth;
    // For simplicity, we assume it's right at 45 on that day
    vDayY = padding + graphHeight - (45 / 90) * graphHeight;
  }

  // Calculate overall min/max for labels
  const angles = yearlyData.map(d => d.angle);
  const maxAngle = Math.max(...angles).toFixed(1);
  const minAngle = Math.min(...angles).toFixed(1);

  return (
    <div className="sun-graph-container">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        {/* 45 degree line */}
        <line 
          x1={padding} y1={padding + graphHeight - (45/90) * graphHeight} 
          x2={padding + graphWidth} y2={padding + graphHeight - (45/90) * graphHeight} 
          stroke="#F92672" strokeDasharray="4 2" strokeWidth="1" opacity="0.5"
        />
        <text x={padding} y={padding + graphHeight - (45/90) * graphHeight - 2} fontSize="6" fill="#F92672">45°</text>
        
        {/* Main curve */}
        <polyline points={points} fill="none" stroke="#66D9EF" strokeWidth="2" strokeLinejoin="round" />
        
        {/* Today indicator */}
        <circle cx={currentX} cy={currentY} r="4" fill="#A6E22E" />
        <text x={currentX + 6} y={currentY} fontSize="8" fill="#A6E22E" fontWeight="bold">Today: {highestSunAngle}°</text>

        {/* V-Day indicator */}
        {vDayX !== null && (
          <>
            <circle cx={vDayX} cy={vDayY} r="3" fill="#66D9EF" />
            <text x={vDayX} y={vDayY - 8} fontSize="7" fill="#66D9EF" textAnchor="middle">V-Day: {vitaminDDate.toLocaleDateString()}</text>
          </>
        )}

        {/* Min/Max Labels */}
        <text x={width - padding} y={padding + 5} fontSize="7" fill="#E6DB74" textAnchor="end">Highest max: {maxAngle}°</text>
        <text x={width - padding} y={height - padding - 5} fontSize="7" fill="#AE81FF" textAnchor="end">Lowest max: {minAngle}°</text>

        {/* Month labels */}
        {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => (
          <text key={i} x={padding + (i / 11) * graphWidth} y={height - 5} fontSize="6" fill="#F8F8F2" textAnchor="middle">{m}</text>
        ))}
      </svg>
    </div>
  );
};

function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null); // Ref to store the map instance
  const scrollContainerRef = useRef(null); // Ref for the scrollable modal content
  const [lng] = useState(-122.3321); // Default longitude for Seattle
  const [lat] = useState(47.6062); // Default latitude for Seattle
  const [zoom] = useState(4);   // Default zoom for Seattle (showing Western US)

  const [showModal, setShowModal] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [clickedLat, setClickedLat] = useState(null);
  const [clickedLng, setClickedLng] = useState(null);
  const [highestSunAngle, setHighestSunAngle] = useState(null);
  const [solarNoonTime, setSolarNoonTime] = useState(null);
  const [dayLength, setDayLength] = useState(null);
  const [currentDateFormatted, setCurrentDateFormatted] = useState('');
  const [fontSize, setFontSize] = useState(() => {
    const storedFontSize = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    return storedFontSize ? parseFloat(storedFontSize) : DEFAULT_FONT_SIZE;
  });
  const [modalSize, setModalSize] = useState(() => {
    const storedModalSize = localStorage.getItem(MODAL_SIZE_STORAGE_KEY);
    return storedModalSize ? parseFloat(storedModalSize) : DEFAULT_MODAL_SIZE;
  });

  // Vitamin D related states
  const [vitaminDDate, setVitaminDDate] = useState(null);
  const [daysUntilVitaminD, setDaysUntilVitaminD] = useState(null);
  const [startTimeAbove45, setStartTimeAbove45] = useState(null);
  const [endTimeAbove45, setEndTimeAbove45] = useState(null);
  const [durationAbove45, setDurationAbove45] = useState(null);
  const [daysUntilBelow45, setDaysUntilBelow45] = useState(null);
  
  const [activeFieldId, setActiveFieldId] = useState('vitamind-info'); // State to track the currently zoomed field
  const [copyFeedback, setCopyFeedback] = useState({ show: false, message: '', id: null });
  const [modalView, setModalView] = useState('stats'); // 'stats' or 'calendar'
  const [yearlyData, setYearlyData] = useState([]);


  useEffect(() => {
    if (!mapboxgl.accessToken) {
      console.error("Mapbox access token is not set. Please ensure VITE_MAPBOX_ACCESS_TOKEN is configured.");
      return;
    }
    if (mapRef.current) return; // Initialize map only once

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1', // Night navigation basemap
      center: [lng, lat],
      zoom: zoom
    });

    mapRef.current.on('click', (e) => {
      const currentMapZoom = mapRef.current.getZoom();
      const clickLat = e.lngLat.lat;
      const clickLng = e.lngLat.lng;
      const today = new Date();

      setCurrentZoom(currentMapZoom.toFixed(2));
      setClickedLat(clickLat.toFixed(4));
      setClickedLng(clickLng.toFixed(4));
      setCurrentDateFormatted(today.toLocaleDateString());

      const sunStats = getSunStats(clickLat, clickLng, today);
      setHighestSunAngle(sunStats.highestSunAngle);
      setSolarNoonTime(sunStats.solarNoonTime);
      setDayLength(sunStats.dayLength);
      
      const vitaminDInfo = getVitaminDInfo(clickLat, clickLng, today);
      setVitaminDDate(vitaminDInfo.vitaminDDate);
      setDaysUntilVitaminD(vitaminDInfo.daysUntilVitaminD);
      setStartTimeAbove45(vitaminDInfo.startTimeAbove45);
      setEndTimeAbove45(vitaminDInfo.endTimeAbove45);
      setDurationAbove45(vitaminDInfo.durationAbove45);
      setDaysUntilBelow45(vitaminDInfo.daysUntilBelow45);

      setYearlyData(getYearlySunData(clickLat, clickLng));

      setShowModal(true);
      setModalView('stats');
    });

    // Add navigation controls (optional)
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

    // Clean up on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [lat, lng, zoom]); // dependencies for Mapbox init

  // Effect to update localStorage when fontSize changes
  useEffect(() => {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize.toString());
  }, [fontSize]);

  // Effect to update localStorage when modalSize changes
  useEffect(() => {
    localStorage.setItem(MODAL_SIZE_STORAGE_KEY, modalSize.toString());
  }, [modalSize]);


  const closeModal = () => {
    setShowModal(false);
    setModalView('stats');
    setActiveFieldId('vitamind-info'); // Reset active field on close
  };

  const adjustFontSize = (amount) => {
    setFontSize((prevSize) => {
      const newSize = Math.max(0.7, Math.min(1.5, prevSize + amount)); // Limit min/max size
      return parseFloat(newSize.toFixed(1)); // Keep 1 decimal place
    });
  };

  const adjustModalSize = (amount) => {
    setModalSize((prevSize) => {
      const newSize = Math.max(0.7, Math.min(1.5, prevSize + amount)); // Limit min/max size
      return parseFloat(newSize.toFixed(1)); // Keep 1 decimal place
    });
  };

  const handleFieldClick = (id) => {
    setActiveFieldId(id);
  };

  const handleDoubleClick = async (e, id) => {
    const textToCopy = e.target.innerText;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyFeedback({ show: true, message: 'Copied!', id });
      setTimeout(() => setCopyFeedback({ show: false, message: '', id: null }), 1500);
    } catch {
      setCopyFeedback({ show: true, message: 'Failed to copy!', id });
      setTimeout(() => setCopyFeedback({ show: false, message: '', id: null }), 1500);
    }
  };

  const formatToGoogleCalendarDate = (date) => {
    if (!date) return '';
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const generateICS = () => {
    if (!startTimeAbove45 || !endTimeAbove45) return;
    const start = formatToGoogleCalendarDate(startTimeAbove45);
    const end = formatToGoogleCalendarDate(endTimeAbove45);
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${start}`,
      `DTEND:${end}`,
      'SUMMARY:V Day!',
      'DESCRIPTION:Sun is above 45° at this location. Perfect time for Vitamin D!',
      `LOCATION:${clickedLat},${clickedLng}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'v-day.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const vitaminDMessage = () => {
    if (!vitaminDDate) {
      return "The sun will not reach 45° above the horizon at this location within a year, making Vitamin D production unlikely naturally.";
    }

    const dateStr = vitaminDDate.toLocaleDateString();
    const timeStr = formatTime(startTimeAbove45);

    const triggerCalendar = (e) => {
      e.stopPropagation();
      setModalView('calendar');
    };

    const linkContent = daysUntilVitaminD === 0 ? `today at ${timeStr}` : `${dateStr} at ${timeStr}`;
    const daysFromTodayStr = `(${daysUntilVitaminD} days from today)`;

    if (daysUntilVitaminD === 0 && durationAbove45) {
      // Sun is above 45 today
      return (
        <>
          On <span className="calendar-link" onClick={triggerCalendar}>{linkContent}</span> {daysFromTodayStr}, the sun will be above 45° for {durationAbove45}.
          {daysUntilBelow45 !== null ? ` It will be below 45° for the whole day in ${daysUntilBelow45} days.` : ` It will always be above 45° for the whole day.`}
        </>
      );
    } else {
      // Sun will be above 45 in the future
      return (
        <>
          On <span className="calendar-link" onClick={triggerCalendar}>{linkContent}</span> {daysFromTodayStr}, the sun will get higher than 45° above the horizon, which allows your body to naturally create Vitamin D.
        </>
      );
    }
  };


  return (
    <div className="app-main-container">
      <div ref={mapContainerRef} data-testid="map-container" className="map-display-area" />

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              fontSize: `${fontSize}em`, 
              width: `${BASE_MODAL_WIDTH * modalSize}px`,
              height: `${BASE_MODAL_HEIGHT * modalSize}px`
            }}
          >
            <div className="modal-header">
              <h2>{modalView === 'stats' ? 'Sun Statistics \u2600;' : 'Add to Calendar'}</h2>
              <button className="close-button" onClick={closeModal}>&times;</button>
            </div>
            
            {modalView === 'stats' ? (
              <>
                <div ref={scrollContainerRef} className="modal-scroll-content">
                  <SunAngleGraph 
                    yearlyData={yearlyData} 
                    highestSunAngle={highestSunAngle} 
                    vitaminDDate={vitaminDDate}
                    daysUntilVitaminD={daysUntilVitaminD}
                  />
                  {/* Reversed order of fields */}
                  <p 
                    id="vitamind-info" 
                    className={activeFieldId === 'vitamind-info' ? 'zoomed-field' : ''}
                    onClick={() => handleFieldClick('vitamind-info')}
                    onDoubleClick={(e) => handleDoubleClick(e, 'vitamind-info')}
                  >
                    {vitaminDMessage()}
                    {copyFeedback.show && copyFeedback.id === 'vitamind-info' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="day-length" 
                    className={activeFieldId === 'day-length' ? 'zoomed-field' : ''}
                    onClick={() => handleFieldClick('day-length')}
                    onDoubleClick={(e) => handleDoubleClick(e, 'day-length')}
                  >
                    Day Length: {dayLength}
                    {copyFeedback.show && copyFeedback.id === 'day-length' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="solar-noon" 
                    className={activeFieldId === 'solar-noon' ? 'zoomed-field' : ''}
                    onClick={() => handleFieldClick('solar-noon')}
                    onDoubleClick={(e) => handleDoubleClick(e, 'solar-noon')}
                  >
                    Solar Noon Time: {solarNoonTime}
                    {copyFeedback.show && copyFeedback.id === 'solar-noon' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="highest-angle" 
                    className={activeFieldId === 'highest-angle' ? 'zoomed-field' : ''}
                    onClick={() => handleFieldClick('highest-angle')}
                    onDoubleClick={(e) => handleDoubleClick(e, 'highest-angle')}
                  >
                    Highest Daily Sun Angle for {currentDateFormatted}: {highestSunAngle}°
                    {copyFeedback.show && copyFeedback.id === 'highest-angle' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="longitude" 
                    className={activeFieldId === 'longitude' ? 'zoomed-field' : ''}
                    onClick={() => handleFieldClick('longitude')}
                    onDoubleClick={(e) => handleDoubleClick(e, 'longitude')}
                  >
                    Longitude: {clickedLng}
                    {copyFeedback.show && copyFeedback.id === 'longitude' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="latitude" 
                    className={activeFieldId === 'latitude' ? 'zoomed-field' : ''}
                    onClick={() => handleFieldClick('latitude')}
                    onDoubleClick={(e) => handleDoubleClick(e, 'latitude')}
                  >
                    Latitude: {clickedLat}
                    {copyFeedback.show && copyFeedback.id === 'latitude' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                  <p 
                    id="zoom-level" 
                    className={activeFieldId === 'zoom-level' ? 'zoomed-field' : ''}
                    onClick={() => handleFieldClick('zoom-level')}
                    onDoubleClick={(e) => handleDoubleClick(e, 'zoom-level')}
                  >
                    Zoom Level: {currentZoom}
                    {copyFeedback.show && copyFeedback.id === 'zoom-level' && (
                      <span className="copy-feedback">{copyFeedback.message}</span>
                    )}
                  </p>
                </div>
                <div className="font-size-controls">
                  <button onClick={() => adjustFontSize(-0.1)}>Text -</button>
                  <button onClick={() => adjustFontSize(0.1)}>Text +</button>
                  <button onClick={() => adjustModalSize(-0.1)}>Window -</button>
                  <button onClick={() => adjustModalSize(0.1)}>Window +</button>
                </div>
              </>
            ) : (
              <div className="calendar-view">
                <div className="calendar-options">
                  <a 
                    href={`https://www.google.com/calendar/render?action=TEMPLATE&text=V+Day!&details=Sun+is+above+45°+at+this+location.+Perfect+time+for+Vitamin+D!&location=${clickedLat},${clickedLng}&dates=${formatToGoogleCalendarDate(startTimeAbove45)}/${formatToGoogleCalendarDate(endTimeAbove45)}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="calendar-button"
                  >
                    Google Calendar
                  </a>
                  <button onClick={generateICS} className="calendar-button">Download .ics</button>
                </div>
                <button className="back-button" onClick={() => setModalView('stats')}>Back to Stats</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;