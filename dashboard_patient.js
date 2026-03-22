const { useState, useEffect } = React;
import {
    ref as dbRef,
    get,
    onValue,
    set,
    remove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { db } from './firebase_config.js';
import { capitalize, formatDateTime, tabActiveStyle, tabInactiveStyle, menuItemStyle } from './utils.js';
import { SessionChart, OverallExerciseChart } from './charts.js';

const e = React.createElement;

/* -------------------- Helper Functions -------------------- */
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

const saveProgress = async (userId, sessionData) => {
    const { sessionId, timeline, ...summaryData } = sessionData;

    const summaryRef = dbRef(db, `progress/${userId}/${sessionId}/summary`);
    const timelineRef = dbRef(db, `progress/${userId}/${sessionId}/timeline`);

    await set(summaryRef, summaryData);
    await set(timelineRef, timeline || []);

    await set(timelineRef, Array.isArray(timeline) ? timeline : []);
};

/* -------------------- Sidebar & Stat Components -------------------- */
const SidebarLink = ({ label, icon, active, onClick }) => e('div', {
    onClick,
    style: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: '600',
        transition: 'all 0.2s',
        marginBottom: '8px',
        background: active ? '#0d9488' : 'transparent',
        color: active ? '#fff' : '#64748b',
    }
}, e('span', { style: { fontSize: '1.2rem' } }, icon), label);

const StatCard = ({ label, value, sub, icon, color = '#0d9488' }) => e('div', {
    style: {
        flex: 1,
        background: '#fff',
        padding: '24px',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    }
},
    e('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '16px' } },
        e('span', { style: { color: '#64748b', fontSize: '0.9rem', fontWeight: '600' } }, label),
        e('span', { style: { fontSize: '1.2rem' } }, icon)
    ),
    e('div', { style: { fontSize: '1.8rem', fontWeight: '700', color: '#0f172a' } }, value),
    e('div', { style: { fontSize: '0.85rem', color: color, marginTop: '4px', fontWeight: '500' } }, sub)
);

/* -------------------- Active Exercise View -------------------- */
function ActiveExerciseView({ exercise, currentUser, onStop }) {
    const [isStarted, setIsStarted] = useState(false);
    const [duration, setDuration] = useState(0);
    const [status, setStatus] = useState("Ready to start?");

    const [liveData, setLiveData] = useState([]);
    const [liveAngle, setLiveAngle] = useState(0);
    const [currentSessionId, setCurrentSessionId] = useState(null);

    const ESP32_IP = "10.242.63.136";

    useEffect(() => {
        let interval;
        if (isStarted) {
            interval = setInterval(() => setDuration(d => d + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isStarted]);

    useEffect(() => {
        if (!isStarted || !currentSessionId || !currentUser?.id) return;

        const timelineRef = dbRef(db, `progress/${currentUser.id}/${currentSessionId}/timeline`);

        const unsubscribe = onValue(timelineRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const entries = Object.values(data).sort((a, b) => a.step - b.step);
                setLiveData(entries);
                const latest = entries[entries.length - 1];
                if (latest) setLiveAngle(latest.angle || 0);
            }
        });

        return () => unsubscribe();
    }, [isStarted, currentSessionId, currentUser.id]);

    const handleStartHardware = async () => {
        if (!currentUser?.id) return alert("User session not found.");
        try {
            setStatus("Connecting to hardware...");
            const url = `http://${ESP32_IP}/start?ex=${encodeURIComponent(exercise.name)}` +
                `&limit=${exercise.upThreshold}&down=${exercise.downThreshold}&uid=${currentUser.id}&joint=${exercise.joint}`;

            const response = await fetch(url, { mode: 'cors' });
            const data = await response.json();

            if (data.sessionId) {
                setCurrentSessionId(data.sessionId);
                setLiveData([]); // Reset graph for new session
                setIsStarted(true);
                setStatus("🏃 Exercise Active...");
            }
        } catch (err) {
            setStatus("Connection failed. Check ESP32 Power.");
            alert(`Ensure ESP32 is on ${ESP32_IP} and check your 5.29V supply.`);
        }
    };

    const handleStopClick = async () => {
        setIsStarted(false);
        setStatus("Finalizing data on Firebase...");

        try {
            await fetch(`http://${ESP32_IP}/stop`, { mode: 'cors' });
            onStop({
                sessionId: currentSessionId,
                isLiveSession: true
            });
        } catch (err) {
            console.warn("Stop signal sent, but connection closed early. This is normal on battery.");
            onStop({ sessionId: currentSessionId, isLiveSession: true });
        }
    };

    return e("div", { className: "card", style: { padding: '30px', background: '#fff', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' } },
        e("h2", { style: { textAlign: 'center', marginBottom: '10px', color: '#0f172a' } }, exercise.name),

        // --- LIVE GRAPH SECTION ---
        isStarted && e("div", { style: { marginBottom: '30px', background: '#f8fafc', padding: '20px', borderRadius: '15px', minHeight: '320px', position: 'relative', border: '1px solid #e2e8f0' } },
            // Target Line Label
            e("div", { style: { position: 'absolute', right: '30px', top: '15px', color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 1 } },
                `Target: ${exercise.upThreshold}°`
            ),
            liveData.length > 0
                ? e(SessionChart, {
                    session: { timeline: liveData },
                    target: exercise.upThreshold // Visual target line for the patient
                })
                : e("div", { style: { textAlign: 'center', color: '#64748b', marginTop: '130px' } },
                    e("p", null, "Waiting for first rep..."),
                    e("small", null, "Move past the target angle to begin recording.")
                )
        ),

        // --- LIVE STATS BAR ---
        isStarted && e("div", { style: { display: 'flex', justifyContent: 'space-around', marginBottom: '20px', padding: '20px', background: '#f0fdfa', borderRadius: '12px' } },
            e("div", { style: { textAlign: 'center' } },
                e("p", { style: { color: '#64748b', margin: 0, fontSize: '0.85rem', fontWeight: '600' } }, "CURRENT ANGLE"),
                e("h3", { style: { fontSize: '2.8rem', color: liveAngle >= exercise.upThreshold ? '#10b981' : '#0d9488', margin: 0, transition: 'color 0.3s' } }, `${liveAngle}°`)
            ),
            e("div", { style: { textAlign: 'center' } },
                e("p", { style: { color: '#64748b', margin: 0, fontSize: '0.85rem', fontWeight: '600' } }, "REPS COMPLETED"),
                e("h3", { style: { fontSize: '2.8rem', color: '#0d9488', margin: 0 } }, `${liveData.length}/${exercise.reps}`)
            )
        ),

        e("div", { style: { textAlign: 'center' } },
            e("div", { style: { fontSize: '32px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '15px' } }, `${duration}s`),
            !isStarted
                ? e("button", {
                    onClick: handleStartHardware,
                    style: { padding: '16px 48px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.1s' }
                }, "Start Exercise")
                : e("button", {
                    onClick: handleStopClick,
                    style: { padding: '16px 48px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }
                }, "Stop & Save")
        ),

        e("p", { style: { textAlign: 'center', marginTop: '15px', color: '#94a3b8', fontSize: '0.85rem' } }, status)
    );
}

/* -------------------- Patient Dashboard -------------------- */
/* -------------------- Main Patient Dashboard -------------------- */
export function PatientDashboard({ state, currentUser, signOut }) {
    // 1. Restore Doctor Assignment Logic (Fixes the ReferenceError)
    const assignedDoctor = state.users.find(u =>
        u.role === "doctor" &&
        u.patientAssignments?.some(assign => assign.id === currentUser.id)
    );
    const assignment = assignedDoctor?.patientAssignments?.find(a => a.id === currentUser.id);
    const isOnHold = assignment?.status === "on-hold";

    // 2. States
    const [prescriptions, setPrescriptions] = useState([]);
    const [activeTab, setActiveTab] = useState("overview");
    const [activeExercise, setActiveExercise] = useState(null);
    const [progress, setProgress] = useState([]);
    const [streakInfo, setStreakInfo] = useState({ streak: 0, totalMinutes: 0, totalSessions: 0, lastDate: null });

    // 3. Sync Metrics from Firebase Progress (Automated Calculation)
    useEffect(() => {
        if (progress.length === 0) return;

        // Calculate totals from Firebase progress array
        const totalMinutes = progress.reduce((sum, s) => sum + (Number(s.durationMins) || 0), 0);
        const uniqueDates = [...new Set(progress.map(s => s.date))].sort().reverse();

        // Calculate Streak logic
        let streak = 0;
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yISO = yesterday.toISOString().slice(0, 10);

        if (uniqueDates[0] === today || uniqueDates[0] === yISO) {
            streak = 1;
            for (let i = 0; i < uniqueDates.length - 1; i++) {
                const current = new Date(uniqueDates[i]);
                const next = new Date(uniqueDates[i + 1]);
                const diff = Math.round((current - next) / (1000 * 60 * 60 * 24));
                if (diff === 1) streak++;
                else break;
            }
        }

        setStreakInfo({
            streak: streak,
            totalMinutes: totalMinutes,
            totalSessions: progress.length,
            lastDate: uniqueDates[0] || null
        });
    }, [progress]);

    // 4. Listeners for Prescriptions and Progress
    useEffect(() => {
        if (!currentUser?.id) return;

        // Listen for Prescriptions
        const prescRef = dbRef(db, `prescriptions/${currentUser.id}`);
        const unsubPresc = onValue(prescRef, (snapshot) => {
            const data = snapshot.val();
            setPrescriptions(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : []);
        });

        // Listen for Progress Data
        const progressRef = dbRef(db, `progress/${currentUser.id}`);
        const unsubProg = onValue(progressRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const sessionArray = Object.entries(data).map(([sessionId, val]) => ({
                    sessionId,
                    ...(val.summary || {}),
                    timeline: val.timeline || []
                })).sort((a, b) => new Date(b.dateTime || b.date) - new Date(a.dateTime || a.date));
                setProgress(sessionArray);
            } else {
                setProgress([]);
            }
        });

        return () => { unsubPresc(); unsubProg(); };
    }, [currentUser.id]);

    const handleSessionComplete = async (espData) => {
        if (!currentUser?.id || !activeExercise) return;

        if (espData.isLiveSession) {
            try {
                await new Promise(r => setTimeout(r, 1500));

                const summaryRef = dbRef(db, `progress/${currentUser.id}/${espData.sessionId}/summary`);
                const snapshot = await get(summaryRef);
                const final = snapshot.val();

                // Use espData.reps as the primary source since Firebase summary was returning 0
                const repsDone = Number(espData.reps || final?.repsDone || 0);
                const targetReps = Number(activeExercise.reps);

                if (repsDone >= targetReps) {
                    const joint = activeExercise.joint.toLowerCase().trim();
                    // FIX: We use .name here because that is what ExercisesView sends
                    const exerciseName = activeExercise.name.trim();
                    const prescriptionKey = `${joint}_${exerciseName}`;

                    // 1. Delete from Firebase
                    await remove(dbRef(db, `prescriptions/${currentUser.id}/${prescriptionKey}`));

                    // 2. Local state is handled automatically by the onValue listener in your useEffect
                }
            } catch (err) {
                console.error("Session completion error:", err);
            }
        }

        setActiveExercise(null);
        setActiveTab("exercises"); // Change this to "exercises" so you can see it's gone
    };
    // 6. Sub-Views (Moved inside main function to access streakInfo state)
    function OverviewView() {
        return e('div', null,
            e('h1', { style: { fontSize: '1.8rem', fontWeight: '700', color: '#0f172a', marginBottom: '8px' } },
                'Welcome back, ', e('span', { style: { color: '#0d9488' } }, currentUser?.name || 'User')
            ),
            e('div', { style: { display: 'flex', gap: '20px', marginBottom: '32px', marginTop: '20px' } },
                e(StatCard, { label: 'Sessions Completed', value: streakInfo.totalSessions || 0, sub: 'Total cumulative', icon: '📈' }),
                e(StatCard, { label: 'Total Minutes', value: streakInfo.totalMinutes || 0, sub: 'Minutes active', icon: '🕒' })
            )
        );
    }

    function ExercisesView() {
        return e("div", null,
            e("h2", { style: { marginBottom: '8px' } }, "Prescribed Care Plan"),
            e("p", { style: { color: '#64748b', marginBottom: '24px' } }, "Complete your reps to clear these tasks."),
            e("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" } },
                prescriptions.length > 0 ? prescriptions.map((presc) => (
                    e("div", { key: presc.id, style: { background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0' } },
                        e("h4", { style: { color: "#0d9488", marginBottom: '16px' } }, presc.joint.toUpperCase()),
                        e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                            e("div", null,
                                e("div", { style: { fontWeight: '600' } }, presc.exercise),
                                e("div", { style: { fontSize: '0.75rem', color: '#64748b' } }, `Target: ${presc.upThreshold}° | ${presc.reps} Reps`)
                            ),
                            e("button", {
                                style: { background: '#0d9488', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
                                onClick: () => setActiveExercise({
                                    name: presc.exercise,
                                    joint: presc.joint,
                                    upThreshold: presc.upThreshold,
                                    downThreshold: presc.downThreshold,
                                    reps: presc.reps
                                })
                            }, "Start")
                        )
                    )
                )) : e("div", { style: { textAlign: 'center', gridColumn: '1/-1', padding: '40px' } }, "No pending prescriptions!")
            )
        );
    }

    // 7. Render Logic
    if (isOnHold) {
        return e("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' } },
            e("div", { style: { textAlign: 'center', background: 'white', padding: '50px', borderRadius: '32px' } }, "Program Paused")
        );
    }

    return e("div", { style: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' } },
        e('aside', { style: { width: '280px', background: '#fff', borderRight: '1px solid #e2e8f0', padding: '40px 24px', position: 'fixed', height: '100vh', display: 'flex', flexDirection: 'column', zIndex: 10 } },
            e('div', { style: { marginBottom: '40px', paddingLeft: '20px' } },
                e('h2', { style: { color: '#0d9488', fontWeight: '800' } }, 'PhysioTrack')
            ),
            e(SidebarLink, {
                label: 'Overview', icon: '📊',
                active: !activeExercise && activeTab === 'overview',
                onClick: () => { setActiveExercise(null); setActiveTab('overview'); }
            }),
            e(SidebarLink, {
                label: 'Exercises', icon: '🏋️',
                active: !!activeExercise || activeTab === 'exercises',
                onClick: () => setActiveTab('exercises')
            }),
            e(SidebarLink, {
                label: 'Progress', icon: '📈',
                active: !activeExercise && activeTab === 'progress',
                onClick: () => { setActiveExercise(null); setActiveTab('progress'); }
            }),
            e(SidebarLink, {
                label: 'Achievements', icon: '🏆',
                active: !activeExercise && activeTab === 'achievements',
                onClick: () => { setActiveExercise(null); setActiveTab('achievements'); }
            }),
            e('div', { style: { marginTop: 'auto' } },
                e('button', { onClick: signOut, style: { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', fontWeight: '600', cursor: 'pointer' } }, 'Sign Out')
            )
        ),
        e('main', { style: { marginLeft: '280px', flex: 1, padding: '40px 60px' } },
            activeExercise
                ? e(ActiveExerciseView, { exercise: activeExercise, currentUser, onStop: handleSessionComplete })
                : (() => {
                    if (activeTab === "overview") return e(OverviewView);
                    if (activeTab === "exercises") return e(ExercisesView);
                    if (activeTab === "progress") return e(ProgressTabs, { sessions: progress });
                    if (activeTab === "achievements") return e(OverallAchievementsView, { streakInfo, progress });
                })()
        )
    );
}


function ProgressTabs({ sessions }) {
    const [tab, setTab] = useState("daily");
    console.log("ProgressTabs received sessions:", sessions);
    const sorted = [...sessions].sort((a, b) => {
        const dateA = new Date(a.dateTime || a.date || 0);
        const dateB = new Date(b.dateTime || b.date || 0);
        return dateB - dateA;
    });

    const byExercise = sessions.reduce((acc, s) => {
        const id = s.exerciseId || s.exercise || "unknown";
        if (!acc[id]) acc[id] = [];
        acc[id].push(s);
        return acc;
    }, {});

    return e("div", null,
        // Tab Navigation
        e("div", { style: { display: "flex", gap: 12, marginBottom: 18 } },
            e("button", { onClick: () => setTab("daily"), style: tab === "daily" ? tabActiveStyle() : tabInactiveStyle() }, "Daily Progress"),
            e("button", { onClick: () => setTab("overall"), style: tab === "overall" ? tabActiveStyle() : tabInactiveStyle() }, "Overall Progress")
        ),

        tab === "daily" ?
            e("div", null, sorted.length ? sorted.map((s, index) => {
                // FIX 2: Stable key. Don't use dateTime in the key if it might change during an update.
                const uniqueKey = s.sessionId || `session-${index}`;
                const hasChartData = s.timeline && Array.isArray(s.timeline) && s.timeline.length > 0;

                // FIX 3: Ensure feedback exists and isn't just an empty string
                const hasFeedback = s.doctorFeedback && String(s.doctorFeedback).trim().length > 0;

                return e("div", { key: uniqueKey, style: { marginBottom: 20 } },
                    e("h4", { style: { marginBottom: 12, color: "#0f172a", fontWeight: '700' } },
                        `${capitalize(s.joint || "")} — ${s.exercise || s.exerciseId || ""}`
                    ),

                    e("div", { style: { display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" } },

                        // CHART CARD
                        e("div", {
                            style: {
                                flex: "1 1 500px",
                                background: "#fff",
                                padding: 10,
                                borderRadius: 12,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                                border: "1px solid #e2e8f0",
                                minHeight: "300px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center"
                            }
                        },
                            hasChartData
                                ? e(SessionChart, { session: s })
                                : e("div", { style: { textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' } },
                                    "No movement data recorded for this session."
                                )
                        ),

                        // STATS & FEEDBACK COLUMN
                        e("div", { style: { width: 200, display: "flex", flexDirection: "column", gap: 16, flexGrow: 1 } },

                            // SESSION INFO CARD
                            e("div", {
                                style: {
                                    background: "#fff",
                                    padding: 16,
                                    borderRadius: 12,
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                                    border: "1px solid #e2e8f0"
                                }
                            },
                                e("div", { style: { fontWeight: 700, marginBottom: 8, fontSize: "0.9rem" } }, `📅 ${formatDateTime(s.dateTime || s.date)}`),
                                e("div", { style: { color: "#64748b", fontSize: "0.85rem" } }, `Duration: ${s.durationMins || 0} min`),
                                // FIX 4: Check multiple possible field names for reps
                                e("div", { style: { color: "#64748b", fontSize: "0.85rem" } }, `Reps: ${s.repsDone ?? s.reps ?? 0}`),
                                e("div", { style: { color: "#0d9488", fontWeight: 600, marginTop: 4 } }, `Max angle: ${s.maxAngle || "-"}°`)
                            ),

                            // DOCTOR'S FEEDBACK CARD
                            e("div", {
                                style: {
                                    background: hasFeedback ? "#f0fdfa" : "#f8fafc",
                                    padding: 16,
                                    borderRadius: 12,
                                    border: hasFeedback ? "1px solid #ccfbf1" : "1px solid #e2e8f0",
                                    boxShadow: hasFeedback ? "0 4px 12px rgba(13, 148, 136, 0.1)" : "none",
                                    transition: "all 0.3s ease"
                                }
                            },
                                e("div", { style: { fontWeight: 700, color: hasFeedback ? "#0f766e" : "#64748b", marginBottom: 6, fontSize: "0.85rem" } }, "👨‍⚕️ Doctor's Feedback"),
                                e("div", {
                                    style: {
                                        fontSize: "0.85rem",
                                        color: hasFeedback ? "#134e4a" : "#94a3b8",
                                        lineHeight: "1.5",
                                        fontStyle: hasFeedback ? "normal" : "italic"
                                    }
                                },
                                    hasFeedback ? s.doctorFeedback : "No feedback provided for this session yet."
                                )
                            )
                        )
                    )
                );
            }) : e("div", { className: "muted card", style: { padding: 20 } }, "No sessions yet.")) :

            // Overall Progress Tab
            e("div", null, Object.keys(byExercise).length ? Object.entries(byExercise).map(([exerciseId, exerciseSessions]) =>
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
