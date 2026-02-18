const { useState, useEffect } = React;

export const SAMPLE_USERS = [];
export const SAMPLE_EXERCISES = [];
export const SAMPLE_PROGRESS = {};

const STORAGE_KEY = 'physiotrack_full';

// utils.js

export function loadAppState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const initialUsersRaw = localStorage.getItem("physiotrack_initial_users");
    const initialUsers = initialUsersRaw ? JSON.parse(initialUsersRaw) : SAMPLE_USERS;

    const defaultState = {
        users: initialUsers,
        exercises: SAMPLE_EXERCISES,
        progress: SAMPLE_PROGRESS,
        currentUserId: null // Default to logged out
    };

    if (!raw) {
        return defaultState;
    }

    try {
        const loadedState = JSON.parse(raw);

        // Check if the saved user actually exists in the current users list
        const userExists = loadedState.users.some(u => u.id === loadedState.currentUserId);

        return {
            ...loadedState,
            users: initialUsers.length > loadedState.users.length ? initialUsers : loadedState.users,
            // If the user doesn't exist or you want to force login on fresh starts:
            currentUserId: userExists ? loadedState.currentUserId : null
        };
    } catch (e) {
        return defaultState;
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

    const push = (p) => {
        location.hash = p;
    };

    return { route, push };
}

/* -------------------- Utility Functions & Updated Styles -------------------- */

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

// Updated to match PhysioTrack Primary Blue: #0ea5e9
export function tabActiveStyle() {
    return {
        padding: '10px 20px',
        borderRadius: '10px',
        border: 'none',
        fontWeight: '600',
        cursor: 'pointer',
        background: '#0d9488', // Matches New Primary
        color: 'white',
        transition: 'all 0.2s ease',
        boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)'
    };
}

export function tabInactiveStyle() {
    return {
        padding: '10px 20px',
        borderRadius: '10px',
        border: '1px solid #f1f5f9',
        background: 'white',
        color: '#64748b',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    };
}

export function menuItemStyle(active) {
    return {
        padding: "12px 16px",
        borderRadius: '10px',
        marginBottom: '8px',
        cursor: "pointer",
        color: active ? "#fff" : "#1e293b",
        background: active ? "#0ea5e9" : "transparent",
        fontWeight: 600,
        transition: "all 0.2s ease",
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    };
}
