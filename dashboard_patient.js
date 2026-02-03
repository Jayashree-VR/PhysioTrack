const { useState, useEffect } = React;
import { saveProgress, loadProgress } from './firebase_config.js';
import { capitalize, formatDateTime, tabActiveStyle, tabInactiveStyle, menuItemStyle } from './utils.js';
import { SessionChart, OverallExerciseChart } from './charts.js';

const e = React.createElement;


function loadStreakInfo(userId) {
    const key = `physio_streak_${userId}`;
    const raw = localStorage.getItem(key);
    let s;
    if (raw) {
        try {
            s = JSON.parse(raw);
        } catch (error) {
            s = { streak: 0, lastDate: null, totalMinutes: 0, totalSessions: 0, lastLogin: null };
        }
    } else {
        s = { streak: 0, lastDate: null, totalMinutes: 0, totalSessions: 0, lastLogin: null };
    }

    const todayISO = new Date().toISOString().slice(0, 10);
    let updatedStreak = s.streak;

    if (s.lastLogin !== todayISO) {
        if (s.lastLogin) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yISO = yesterday.toISOString().slice(0, 10);
            updatedStreak = s.lastLogin === yISO ? (s.streak || 0) + 1 : 1;
        } else {
            updatedStreak = 1;
        }
        s.streak = updatedStreak;
    }

    s.lastLogin = todayISO;
    localStorage.setItem(key, JSON.stringify(s));
    return s;
}

function ActiveExerciseView({ exercise, currentUser, onStop }) {
    const [isStarted, setIsStarted] = useState(false);
    const [duration, setDuration] = useState(0);
    const [status, setStatus] = useState("Ready to start?");
    const ESP32_IP = "192.168.190.136";

    useEffect(() => {
        let interval;
        if (isStarted) {
            interval = setInterval(() => setDuration(d => d + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isStarted]);

    const handleStartHardware = async () => {
        if (!currentUser || !currentUser.id) {
            alert("Error: User session not found.");
            return;
        }

        const jointConfigs = {
            elbow: { "Flexion": { limit: 120, down: 20 }, "Extension": { limit: 10, down: 80 } },
            knee: { "Flexion": { limit: 110, down: 30 }, "Extension": { limit: 5, down: 70 } },
            wrist: {
                "Flexion": { limit: 60, down: 10 },
                "Extension": { limit: 50, down: 10 },
                "Radial Deviation": { limit: 20, down: 5 },
                "Ulnar Deviation": { limit: 30, down: 5 }
            },
            ankle: { "Plantarflexion": { limit: 40, down: 5 }, "Dorsiflexion": { limit: 20, down: 5 } }
        };

        const config = (jointConfigs[exercise.joint] && jointConfigs[exercise.joint][exercise.name]) || { limit: 90, down: 15 };

        // Timeout logic to prevent infinite waiting
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            setStatus("Connecting to hardware...");
            const url = `http://${ESP32_IP}/start?ex=${encodeURIComponent(exercise.name)}&limit=${config.limit}&down=${config.down}&uid=${currentUser.id}&joint=${exercise.joint}`;

            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                signal: controller.signal
            });

            if (!response.ok) throw new Error(`ESP32 error: ${response.status}`);

            clearTimeout(timeoutId);
            setIsStarted(true);
            setStatus("🏃 Exercise Active...");
        } catch (err) {
            console.error("Hardware Start Error:", err);
            setStatus(err.name === 'AbortError' ? "Timeout: Device not found" : "Connection failed");
            alert("Could not start hardware. Ensure ESP32 is powered and on 172.21.116.136.");
        }
    };

    const handleStopHardware = async () => {
        setIsStarted(false);
        setStatus("Stopping and fetching data...");

        try {
            const response = await fetch(`http://${ESP32_IP}/stop`);
            const data = await response.json();
            onStop(data);
        } catch (err) {
            console.error("Hardware Stop Error:", err);
            alert("Hardware did not respond, but we will end the session locally.");
            onStop({});
        }
    };

    return e("div", { className: "card", style: { textAlign: 'center', padding: '30px' } },
        e("h2", null, exercise.name),
        e("div", { style: { height: '150px', margin: '20px 0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' } },
            e("p", { style: { fontWeight: '500', color: '#1e293b' } }, status)
        ),

        // Only show timer and buttons if NOT in the processing state
        status !== "Stopping and fetching data..." && [
            e("div", { key: "timer", style: { fontSize: '32px', fontWeight: 'bold', color: '#2563eb' } }, `${duration}s`),
            !isStarted
                ? e("button", { key: "start", className: "btn", onClick: handleStartHardware, style: { background: '#10b981', marginTop: '20px', width: '200px' } }, "Start Hardware")
                : e("button", { key: "stop", className: "btn", onClick: handleStopHardware, style: { background: '#ef4444', marginTop: '20px', width: '200px' } }, "Stop & Save")
        ]
    );
}

export function PatientDashboard({ state, currentUser, addSessionForPatient, signOut }) {
    const [activeTab, setActiveTab] = useState("exercises");
    const [activeExercise, setActiveExercise] = useState(null);
    const [streakInfo, setStreakInfo] = useState(() => loadStreakInfo(currentUser.id));
    const [progress, setProgress] = useState([]);
    const JOINTS = [
        { key: "elbow", name: "Elbow", exercises: ["Flexion", "Extension"] },
        { key: "knee", name: "Knee", exercises: ["Flexion", "Extension"] },
        { key: "wrist", name: "Wrist", exercises: ["Flexion", "Extension", "Radial Deviation", "Ulnar Deviation"] },
        { key: "ankle", name: "Ankle", exercises: ["Plantarflexion", "Dorsiflexion"] }
    ];

    useEffect(() => {
        if (!currentUser || !currentUser.id) return;
        loadProgress(currentUser.id, (sessions) => setProgress(sessions));
    }, [currentUser.id]);

    useEffect(() => {
        setStreakInfo(loadStreakInfo(currentUser.id));
    }, [currentUser.id]);

    function updateStreakMinutes(minutesToAdd = 0) {
        const key = `physio_streak_${currentUser.id}`;
        const raw = JSON.parse(localStorage.getItem(key) || "{}");
        raw.totalMinutes = (raw.totalMinutes || 0) + minutesToAdd;
        raw.totalSessions = (raw.totalSessions || 0) + 1;
        raw.lastDate = new Date().toISOString().slice(0, 10);
        localStorage.setItem(key, JSON.stringify(raw));
        setStreakInfo(raw);
    }

    const handleSessionComplete = (espData) => {
        if (!currentUser || !currentUser.id) {
            console.error("No user ID found. Cannot process session.");
            return;
        }

        const now = new Date();

        const session = {
            sessionId: espData.sessionId,
            date: espData.date || now.toISOString().slice(0, 10),
            dateTime: espData.dateTime || now.toISOString(),
            durationMins: espData.durationMins || 1,
            exercise: espData.exercise || activeExercise.name,
            exerciseId: `${(espData.joint || activeExercise.joint)}-${(espData.exercise || activeExercise.name)
                .toLowerCase()
                .replace(/\s+/g, "-")}`,
            joint: espData.joint || activeExercise.joint,
            maxAngle: espData.maxAngle || 0,
            repsDone: espData.reps || 0,
            timeline: espData.timeline || []
        };

        updateStreakMinutes(session.durationMins);
        setActiveExercise(null);
        setActiveTab("progress");
    };



    const getJointEmoji = (key) => {
        const emojis = { elbow: '💪', knee: '🦵', wrist: '✋', ankle: '🦶' };
        return emojis[key] || '🦴';
    };

    function ExercisesView() {
        return e("div", null,
            e("h3", { style: { color: "#2563eb", marginBottom: 15 } }, "Your Exercises"),
            e("div", { style: { display: "flex", flexWrap: "wrap", gap: "20px", justifyContent: "flex-start" } },
                JOINTS.map((jointData) => e("div", { key: jointData.key, className: "card", style: { flex: "1 1 200px", minWidth: 200, maxWidth: 300, padding: 0, boxShadow: "0 8px 25px rgba(0,0,0,0.05)" } },
                    e("div", { style: { background: "#eef2ff", padding: "15px 18px", borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottom: "1px solid #c7d2fe" } },
                        e("h4", { style: { margin: 0, color: "#2563eb", fontSize: "1.2em", fontWeight: 700 } }, `${getJointEmoji(jointData.key)} ${capitalize(jointData.name)}`)
                    ),
                    e("div", { style: { display: "flex", flexDirection: "column", gap: 10, padding: "0 18px 18px 18px" } },
                        jointData.exercises.map((ex) => e("div", { key: ex, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px dashed #e0e7ff" } },
                            e("div", { style: { fontWeight: 500, color: '#333' } }, ex),
                            e("button", { className: "btn", style: { background: '#10b981', padding: '6px 12px', fontSize: '0.9em', borderRadius: 6 }, onClick: () => setActiveExercise({ name: ex, joint: jointData.key }) }, "Select")
                        ))
                    )
                ))
            )
        );
    }

    // FIXED CODE
    if (activeExercise) {
        return e(ActiveExerciseView, {
            exercise: activeExercise,
            currentUser: currentUser, // <--- ADD THIS LINE
            onStop: handleSessionComplete
        });
    }

    return e("section", null,
        e("div", { className: "dash-top" },
            e('div', null, e("h2", null, `Welcome, ${currentUser.name}!`)),
            e("button", { className: "btn", onClick: signOut }, "Sign out")
        ),
        e("div", { className: "dash-grid" },
            e("aside", { style: { background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 10px 30px rgba(15,23,42,0.04)" } },
                e("h3", { style: { color: "#2563eb", marginBottom: 12 } }, "Menu"),
                e("div", { onClick: () => setActiveTab("exercises"), style: menuItemStyle(activeTab === "exercises") }, "🏋️‍♀️ Exercises"),
                e("div", { onClick: () => setActiveTab("progress"), style: menuItemStyle(activeTab === "progress") }, "📊 Progress"),
                e("div", { onClick: () => setActiveTab("achievements"), style: menuItemStyle(activeTab === "achievements") }, "🏆 Achievements")
            ),
            e("main", null,
                activeTab === "exercises" && e(ExercisesView),
                activeTab === "progress" && e(ProgressTabs, { sessions: progress }),
                activeTab === "achievements" && e(OverallAchievementsView, { streakInfo, progress })
            )
        )
    );
}

function ProgressTabs({ sessions }) {
    const [tab, setTab] = useState("daily");

    // Sort sessions by date (newest first)
    const sorted = [...sessions].sort((a, b) => new Date(b.dateTime || b.date) - new Date(a.dateTime || a.date));

    // Group by exercise
    const byExercise = sessions.reduce((acc, s) => {
        const id = s.exerciseId || s.exercise || "unknown";
        if (!acc[id]) acc[id] = [];
        acc[id].push(s);
        return acc;
    }, {});

    return e("div", null,
        e("div", { style: { display: "flex", gap: 12, marginBottom: 18 } },
            e("button", { onClick: () => setTab("daily"), style: tab === "daily" ? tabActiveStyle() : tabInactiveStyle() }, "Daily Progress"),
            e("button", { onClick: () => setTab("overall"), style: tab === "overall" ? tabActiveStyle() : tabInactiveStyle() }, "Overall Progress")
        ),
        tab === "daily" ?
            e("div", null, sorted.length ? sorted.map((s, index) =>
                // FIX: Combine sessionId with index to guarantee uniqueness even if data is messy
                e("div", { key: s.sessionId || `session-${index}-${s.dateTime}`, style: { marginBottom: 26 } },
                    e("h4", null, `${capitalize(s.joint || "")} — ${s.exercise || s.exerciseId || ""}`),
                    e("div", { style: { display: "flex", gap: 14, alignItems: "flex-start" } },
                        e("div", { style: { flex: "1 1 700px", background: "#fff", padding: 12, borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.03)" } }, e(SessionChart, { session: s })),
                        e("div", { style: { width: 220, background: "#fff", padding: 12, borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.03)" } },
                            e("div", { style: { fontWeight: 700 } }, `Date: ${formatDateTime(s.dateTime || s.date)}`),
                            e("div", { className: "muted", style: { marginTop: 8 } }, `Duration: ${s.durationMins || 1} min`),
                            e("div", { className: "muted" }, `Reps: ${s.repsDone || 0}`),
                            e("div", { className: "muted" }, `Max angle: ${s.maxAngle || "-"}°`)
                        )
                    )
                )
            ) : e("div", { className: "muted card", style: { padding: 20 } }, "No sessions yet.")) :

            e("div", null, Object.keys(byExercise).length ? Object.entries(byExercise).map(([exerciseId, exerciseSessions]) =>
                // exerciseId is derived from the object keys, so it's already unique here
                e("div", { key: exerciseId, className: "card", style: { marginBottom: 20 } },
                    e("h3", { style: { color: '#10b981' } }, capitalize(exerciseId.replace(/-/g, ' '))),
                    e(OverallExerciseChart, { data: exerciseSessions, title: "Max Angle Progression" })
                )
            ) : e("div", { className: "muted card", style: { padding: 20 } }, "No data available."))
    );
}

function OverallAchievementsView({ streakInfo, progress }) {
    const [tab, setTab] = useState("streaks");
    return e("div", null,
        e("div", { style: { display: "flex", gap: 10, marginBottom: 25 } },
            e("button", { onClick: () => setTab("streaks"), style: tab === "streaks" ? tabActiveStyle() : tabInactiveStyle() }, "🔥 Streak Status"),
            e("button", { onClick: () => setTab("badges"), style: tab === "badges" ? tabActiveStyle() : tabInactiveStyle() }, "🏅 Badges")
        ),
        tab === "streaks" ? e(StreakView, { streakInfo }) : e(BadgesView, { streakInfo, progress })
    );
}

function StreakView({ streakInfo }) {
    const isMaintaining = streakInfo.lastDate === new Date().toISOString().slice(0, 10);
    const progressToNext = (streakInfo.streak % 7) || 0;
    const progressPercent = (progressToNext / 7) * 100;
    return e("div", { style: { display: 'flex', gap: 25, alignItems: 'flex-start', flexWrap: 'wrap' } },
        e("div", { style: { flex: '1 1 60%' } },
            e("h3", { style: { color: "#eab308", marginBottom: 5 } }, "🔥 Daily Commitment Streak"),
            e("p", { style: { fontSize: '4em', fontWeight: 800, color: '#eab308', margin: '0 0 5px 0' } }, streakInfo.streak || 0),
            e("div", { style: { padding: 15, background: '#fffbeb', borderLeft: '5px solid #eab308', borderRadius: 8, marginBottom: 30 } },
                e("p", { style: { margin: 0, fontWeight: 600 } }, isMaintaining ? "Keep it up!" : "Log a session today!"),
                e("small", { className: "muted" }, `Last exercise: ${streakInfo.lastDate || 'Never'}`)
            ),
            e("div", { style: { background: '#eef2ff', borderRadius: 8, height: 16, marginBottom: 10, overflow: 'hidden' } },
                e('div', { style: { width: `${progressPercent}%`, height: '100%', background: '#eab308', transition: 'width 0.5s', borderRadius: 8 } })
            ),
            e("p", { className: "muted" }, `Day ${progressToNext} of your 7-day goal.`)
        ),
        e('div', { className: 'card', style: { flex: '1 1 30%', minWidth: 250, padding: 20, border: '1px solid #eee' } },
            e("h3", { style: { color: '#0066cc', textAlign: 'center' } }, "Lifetime Metrics"),
            e('div', { style: { textAlign: 'center', marginBottom: 20 } },
                e('h4', null, 'Total Sessions'),
                e('p', { style: { fontSize: '2.5em', fontWeight: 800, color: '#0066cc' } }, streakInfo.totalSessions || 0)
            ),
            e('div', { style: { textAlign: 'center' } },
                e('h4', null, 'Total Minutes'),
                e('p', { style: { fontSize: '2.5em', fontWeight: 800, color: '#0066cc' } }, streakInfo.totalMinutes || 0)
            )
        )
    );
}



function BadgesView({ streakInfo, progress }) {
    const uniqueExercises = new Set(progress.map(s => s.exerciseId)).size;
    const totalSessions = streakInfo.totalSessions || 0;
    const highRepSessions = progress.filter(s => s.repsDone >= 12).length;
    const maxAngle120Reached = progress.some(s => s.maxAngle >= 120);
    const maxAngle135Reached = progress.some(s => s.maxAngle >= 135);

    const badges = [
        { id: "time-60", name: "First Hour", earned: streakInfo.totalMinutes >= 60, desc: "Total 1 hour (60 min) of exercise", emoji: '⏱️' },
        { id: "time-300", name: "Five-Hour Hero", earned: streakInfo.totalMinutes >= 300, desc: "Total 5 hours (300 min) of exercise", emoji: '💪' },
        { id: "time-600", name: "10-Hour Master", earned: streakInfo.totalMinutes >= 600, desc: "Total 10 hours (600 min) of exercise", emoji: '🌟' },
        { id: "time-900", name: "15-Hour Pro", earned: streakInfo.totalMinutes >= 900, desc: "Total 15 hours (900 min) of exercise", emoji: '⚙️' },
        { id: "time-1200", name: "20-Hour Master", earned: streakInfo.totalMinutes >= 1200, desc: "Total 20 hours (1200 min) of exercise", emoji: '💎' },
        { id: "time-1800", name: "30-Hour Guru", earned: streakInfo.totalMinutes >= 1800, desc: "Total 30 hours (1800 min) of exercise", emoji: '🧘‍♀️' },
        { id: "streak-7", name: "Weekly Warrior", earned: streakInfo.streak >= 7, desc: "Log sessions 7 days in a row", emoji: '⚡' },
        { id: "streak-14", name: "Two-Week Tune-up", earned: streakInfo.streak >= 14, desc: "Log sessions 14 days in a row", emoji: '✅' },
        { id: "streak-30", name: "Monthly Champion", earned: streakInfo.streak >= 30, desc: "Log sessions 30 days in a row", emoji: '🏆' },
        { id: "streak-60", name: "Two-Month Titan", earned: streakInfo.streak >= 60, desc: "Log sessions 60 days in a row", emoji: '🥇' },
        { id: "streak-90", name: "Quarterly Quest", earned: streakInfo.streak >= 90, desc: "Log sessions 90 days in a row", emoji: '🗓️' },
        { id: "variety-3", name: "Triple Threat", earned: uniqueExercises >= 3, desc: "Complete 3 different types of exercises", emoji: '🎯' },
        { id: "variety-5", name: "Five Star Focus", earned: uniqueExercises >= 5, desc: "Complete 5 different types of exercises", emoji: '⭐' },
        { id: "variety-8", name: "Full Spectrum", earned: uniqueExercises >= 8, desc: "Complete all available exercise types", emoji: '🌈' },
        { id: "sessions-10", name: "First Decade", earned: totalSessions >= 10, desc: "Complete 10 total sessions", emoji: '🔟' },
        { id: "sessions-25", name: "Quarter Century", earned: totalSessions >= 25, desc: "Complete 25 total sessions", emoji: '💯' },
        { id: "sessions-50", name: "Recovery King", earned: totalSessions >= 50, desc: "Complete 50 total sessions", emoji: '👑' },
        { id: "sessions-100", name: "Century Club", earned: totalSessions >= 100, desc: "Complete 100 total sessions", emoji: '🚀' },
        { id: "sessions-200", name: "Double Century", earned: totalSessions >= 200, desc: "Complete 200 total sessions", emoji: '🥇' }, // NEW
        { id: "focus-5", name: "Five Focused Days", earned: highRepSessions >= 5, desc: "Log 5 total sessions with 12 or more reps", emoji: '🧠' }, // NEW
        { id: "angle-120", name: "Max Angle 120", earned: maxAngle120Reached, desc: "Achieve a peak angle of 120° or greater", emoji: '📐' }, // NEW
        { id: "angle-135", name: "Max Angle 135", earned: maxAngle135Reached, desc: "Achieve a peak angle of 135° or greater", emoji: '🚀' } // NEW
    ];

    return e("div", null,
        e("h3", { style: { color: "#2563eb" } }, "Your Achievements"),
        e("div", { style: { display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" } },
            badges.map((b) => e("div", {
                key: b.id,
                className: "card",
                style: {
                    width: 160,
                    height: 140,
                    borderRadius: 12,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: 10,
                    boxShadow: b.earned ? "0 12px 30px rgba(37,99,235,0.1)" : "0 4px 10px rgba(0,0,0,0.05)",
                    background: b.earned ? '#eef2ff' : '#f9f9f9',
                    border: b.earned ? '2px solid #2563eb' : '1px solid #ddd',
                    opacity: b.earned ? 1 : 0.6
                }
            },
                e("div", { style: { fontSize: '2.5em', marginBottom: 5 } }, b.emoji),
                e("strong", { style: { marginBottom: 3, color: b.earned ? '#2563eb' : '#333' } }, b.name),
                e("p", { className: "muted", style: { fontSize: '0.75em', margin: 0, lineHeight: 1.2 } }, b.desc)
            ))
        )
    );
}
