const { useState, useEffect, useRef, useMemo } = React;
import { capitalize } from './utils.js';

const e = React.createElement;

// --- Single Session Chart ---
export function SessionChart({ session }) {
  const canvasRef = useRef(null);

  const normalizedData = useMemo(() => {
    const timelineRaw = session.timeline || {};
    const timelineArray = Array.isArray(timelineRaw)
      ? timelineRaw
      : Object.values(timelineRaw);

    return timelineArray.filter(Boolean).map(d => ({
      step: d.step ?? d.rep ?? 0,
      displayAngle: d.angle ?? 0
    }));
  }, [session.timeline]);

  useEffect(() => {
    if (!canvasRef.current || !window.Chart || normalizedData.length === 0) return;

    const ctx = canvasRef.current.getContext("2d");
    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: normalizedData.map(d => d.step),
        datasets: [{
          label: "Angle (°)",
          data: normalizedData.map(d => d.displayAngle),
          backgroundColor: "rgba(37, 99, 235, 0.1)",
          borderColor: "#2563eb",
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          // REMOVES the box and the angle heading at the top
          legend: { display: false }
        },
        scales: {
          x: {
            // ADDS the "Reps" heading below the X-axis
            title: {
              display: true,
              text: 'Reps',
              font: { weight: '600' }
            }
          },
          y: {
            beginAtZero: false,
            title: { display: true, text: 'Degrees (°)' }
          }
        }
      }
    });

    return () => chart.destroy();
  }, [normalizedData]);

  return e("div", { style: { height: 220, width: '100%' } },
    normalizedData.length > 0 ? e("canvas", { ref: canvasRef }) : e("div", null, "No data")
  );
}

// --- Overall Exercise Progress Chart ---
export function OverallExerciseChart({ data = [], title = "Max Angle Progress" }) {
  const canvasRef = useRef(null);

  const processedData = useMemo(() => {
    if (!data.length) return { labels: [], values: [] };

    const byDate = {};
    data.forEach((d) => {
      let dateKey = "Unknown";
      if (d.date) {
        dateKey = d.date;
      } else if (d.dateTime) {
        dateKey = new Date(d.dateTime).toISOString().split('T')[0];
      }
      const angle = parseFloat(d.maxAngle) || 0;
      if (!byDate[dateKey] || angle > byDate[dateKey]) {
        byDate[dateKey] = angle;
      }
    });

    const sortedDates = Object.keys(byDate).sort();
    return {
      labels: sortedDates,
      values: sortedDates.map(date => byDate[date])
    };
  }, [data]);

  useEffect(() => {
    if (!canvasRef.current || !window.Chart || processedData.labels.length === 0) return;

    const ctx = canvasRef.current.getContext("2d");

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: processedData.labels,
        datasets: [{
          label: "Peak Performance (°)",
          data: processedData.values,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.2,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: "#10b981"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: title,
            font: { size: 14, weight: '600' }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Date',
              font: { weight: '600' }
            }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Max Angle (°)' }
          }
        }
      }
    });

    return () => chart.destroy();
  }, [processedData, title]);

  return e("div", { style: { height: 250, width: '100%' } },
    processedData.labels.length > 0
      ? e("canvas", { ref: canvasRef })
      : e("div", { style: { textAlign: 'center', padding: '20px', color: '#64748b' } }, "No progress data yet")
  );
}
