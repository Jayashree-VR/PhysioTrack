const { useState, useEffect, useRef, useMemo } = React;
import { capitalize } from './utils.js';

const e = React.createElement;

// --- Single Session Chart (Normalized to start at 0°) ---
export function SessionChart({ session }) {
  const canvasRef = useRef(null);

  // 1. Prepare and Normalize Data
  const normalizedData = useMemo(() => {
    const rawTimeline = session.timeline && session.timeline.length > 0
      ? session.timeline
      : [];

    if (rawTimeline.length === 0) return [];

    // The first point is the "Neutral" or "Resting" position (e.g., 94°)
    const baseAngle = rawTimeline[0].angle;

    return rawTimeline.map(d => ({
      step: d.step || d.time,
      // Calculate displacement from neutral. 
      // This ensures 94° -> 125° is displayed as 0° -> 31°
      displayAngle: Math.abs(d.angle - baseAngle)
    }));
  }, [session.timeline]);

  useEffect(() => {
    if (!canvasRef.current || !window.Chart || normalizedData.length === 0) return;

    const ctx = canvasRef.current.getContext("2d");

    // Cleanup previous chart instance
    if (canvasRef.current.chart) {
      canvasRef.current.chart.destroy();
    }

    const labels = normalizedData.map(d => d.step);
    const dataValues = normalizedData.map(d => d.displayAngle);

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Movement Angle (°)",
          data: dataValues,
          backgroundColor: "rgba(37, 99, 235, 0.1)",
          borderColor: "#2563eb",
          pointRadius: 3,
          pointBackgroundColor: "#2563eb",
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` Degrees moved: ${context.parsed.y}°`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Time Step' },
            grid: { display: false }
          },
          y: {
            // Force start at 0 so the "31°" peak is visually accurate
            beginAtZero: true,
            title: { display: true, text: 'Degrees from Neutral (°)' },
            ticks: { stepSize: 10 },
            // Suggest a max to keep the graph from looking too volatile if movement is small
            suggestedMax: 45
          }
        }
      }
    });

    canvasRef.current.chart = chart;
    return () => chart.destroy();
  }, [normalizedData]);

  return e("div", { style: { height: 200, width: '100%' } },
    normalizedData.length > 0
      ? e("canvas", { ref: canvasRef })
      : e("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' } }, "No movement data to display")
  );
}

// --- Overall Exercise Progress Chart ---
export function OverallExerciseChart({ data = [], title = "Max Angle Progress" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;

    const ctx = canvasRef.current.getContext("2d");
    if (canvasRef.current.chart) {
      canvasRef.current.chart.destroy();
    }

    // Grouping by Date and getting the best (max) angle for that day
    const byDate = {};
    data.forEach((d) => {
      const date = (d.date || (d.dateTime || "").slice(0, 10)) || "unknown";
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(d.maxAngle || 0);
    });

    const labels = Object.keys(byDate).sort();
    const values = labels.map((l) => Math.max(...byDate[l]));

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Peak Performance (°)",
          data: values,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.25,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
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
            font: { size: 16, weight: 'bold' },
            padding: { bottom: 20 }
          },
          tooltip: {
            callbacks: {
              label: (context) => ` Max Angle Reached: ${context.parsed.y}°`
            }
          }
        },
        scales: {
          x: { title: { display: true, text: 'Date' } },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Max Angle (°)' },
            suggestedMax: 60
          }
        }
      }
    });

    canvasRef.current.chart = chart;
    return () => chart.destroy();
  }, [data, title]);

  return e("div", { style: { height: 220, width: '100%' } }, e("canvas", { ref: canvasRef }));
}