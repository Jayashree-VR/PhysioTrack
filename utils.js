const { useState, useEffect } = React;

/* -------------------- Sample Data & State Management -------------------- */

// FIX: Export the constants so they can be imported in main.js
export const SAMPLE_USERS = [];
export const SAMPLE_EXERCISES = []; 
export const SAMPLE_PROGRESS = {};

const STORAGE_KEY = 'physiotrack_full';

// Load state from local storage, merging with initial users fetched from Firebase
export function loadAppState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const initialUsersRaw = localStorage.getItem("physiotrack_initial_users");
  const initialUsers = initialUsersRaw ? JSON.parse(initialUsersRaw) : SAMPLE_USERS;

  if (!raw) {
    const s = {
      users: initialUsers,
      exercises: SAMPLE_EXERCISES,
      progress: SAMPLE_PROGRESS,
      currentUserId: null
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return s;
  }
  try {
    const loadedState = JSON.parse(raw);
    // Ensure users list is updated from the initial fetch/sample if needed
    return {
        ...loadedState,
        users: initialUsers.length > loadedState.users.length ? initialUsers : loadedState.users
    };
  } catch (e) {
    console.error("Error parsing stored state:", e);
    return {
      users: initialUsers,
      exercises: SAMPLE_EXERCISES,
      progress: SAMPLE_PROGRESS,
      currentUserId: null
    };
  }
}

export function saveAppState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* -------------------- Router Hook -------------------- */
export function useHashRoute() {
  const [route, setRoute] = useState(location.hash.replace('#', '') || '/');
  useEffect(() => {
    const onHash = () => setRoute(location.hash.replace('#', '') || '/');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const push = (p) => { location.hash = p; };
  return { route, push };
}


/* -------------------- Utility Functions & Styles -------------------- */
export function capitalize(s = "") {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

export function formatDateTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return iso;
  }
}

export function tabActiveStyle() {
  return {
    padding: '10px 18px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    background: '#2563eb', // --accent
    color: 'white',
    transition: 'background 0.2s'
  };
}

export function tabInactiveStyle() {
  return {
    padding: '10px 18px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    background: 'white',
    color: '#374151',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };
}

export function menuItemStyle(active) {
  return {
    padding: "10px 12px",
    borderRadius: 8,
    marginBottom: 8,
    cursor: "pointer",
    color: active ? "#fff" : "#2563eb",
    background: active ? "#2563eb" : "transparent",
    fontWeight: 600,
    transition: "all 0.2s"
  };
}