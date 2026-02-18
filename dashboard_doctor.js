const { useState, useEffect } = React;
import { capitalize, formatDateTime } from './utils.js';
import { SessionChart, OverallExerciseChart } from './charts.js';
import {
    ref as dbRef,
    get as dbGet,
    set as dbSet
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { db } from './firebase_config.js';

const e = React.createElement;

/* -------------------- DoctorDashboard Main -------------------- */
export function DoctorDashboard({ state, currentUser }) {

    /* -------------------- FIX 1: Normalize patientAssignments -------------------- */
    const assignments = currentUser.patientAssignments
        ? Object.values(currentUser.patientAssignments)
            .filter(p => p.status === "active")
        : [];

    const assignedPatients = (state.users || []).filter(u =>
        u.role === "patient" &&
        assignments.some(a => a.id === u.id)
    );

    const [selectedPatient, setSelectedPatient] = useState(
        assignedPatients.length ? assignedPatients[0].id : null
    );

    const activePatient = assignedPatients.find(p => p.id === selectedPatient);

    /* -------------------- FIX 2: Fetch progress from Firebase -------------------- */
    const [patientsProgress, setPatientsProgress] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!assignments.length) return;

        const fetchProgress = async () => {
            setLoading(true);
            try {
                const promises = assignments.map(a =>
                    dbGet(dbRef(db, `progress/${a.id}`))
                );

                const snaps = await Promise.all(promises);

                const progressMap = {};
                snaps.forEach((snap, idx) => {
                    if (snap.exists()) {
                        progressMap[assignments[idx].id] = snap.val();
                    }
                });

                setPatientsProgress(progressMap);
            } catch (err) {
                console.error("Doctor progress fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProgress();
    }, [currentUser.id]);

    const activePatientProgress =
        selectedPatient && patientsProgress[selectedPatient]
            ? patientsProgress[selectedPatient]
            : {};

    const colors = {
        primary: "#10b981",
        bg: "#f1f5f9",
        card: "#ffffff",
        textMuted: "#64748b"
    };

    return e("section", { style: { minHeight: '100vh', background: colors.bg, padding: '40px' } },

        /* -------------------- Header -------------------- */
        e("div", { style: { marginBottom: 30 } },
            e("h2", null, `Welcome, ${currentUser.name}`),
            e("p", { style: { color: colors.textMuted } },
                "Patient Monitoring & Clinical Progress"
            )
        ),

        e("div", {
            style: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: 30 }
        },

            /* -------------------- Sidebar -------------------- */
            e("aside", {
                style: {
                    background: colors.card,
                    padding: 20,
                    borderRadius: 16,
                    height: 'fit-content'
                }
            },
                e("h3", { style: { fontSize: 14, color: colors.textMuted } }, "MY PATIENTS"),

                assignedPatients.length === 0
                    ? e("p", null, "No patients assigned.")
                    : assignedPatients.map(p =>
                        e("div", {
                            key: p.id,
                            onClick: () => setSelectedPatient(p.id),
                            style: {
                                cursor: 'pointer',
                                padding: 12,
                                borderRadius: 10,
                                marginBottom: 10,
                                border: `1px solid ${selectedPatient === p.id ? colors.primary : '#e2e8f0'
                                    }`,
                                background: selectedPatient === p.id ? '#ecfdf5' : '#fff'
                            }
                        },
                            e("div", { style: { fontWeight: 700 } }, p.name),
                            e("div", { style: { fontSize: 12, color: colors.textMuted } }, p.email)
                        )
                    )
            ),

            /* -------------------- Main View -------------------- */
            e("main", null,
                loading
                    ? e("div", null, "Loading patient data...")
                    : selectedPatient
                        ? e(DoctorPatientView, {
                            activePatient,
                            progress: activePatientProgress,
                            exercises: state.exercises
                        })
                        : e("div", null, "Select a patient")
            )
        )
    );
}


/* -------------------- Patient Detailed View -------------------- */
function DoctorPatientView({ activePatient, progress, exercises }) {
    const [activeTab, setActiveTab] = useState("overview");
    const [subTab, setSubTab] = useState("daily"); // New state for the inner toggle

    // Standardize Firebase Object data into an Array
    const progressArray = progress && typeof progress === 'object' && !Array.isArray(progress)
        ? Object.values(progress)
        : (Array.isArray(progress) ? progress : []);

    const validSessions = progressArray.filter(s => s && (s.exercise || s.exerciseId));

    // Group sessions by exercise for the Overall Progress charts
    const progressByExercise = validSessions.reduce((acc, session) => {
        const key = session.exerciseId || session.exercise || 'unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(session);
        return acc;
    }, {});

    return e('div', null,
        // Main Patient Header
        e('div', { style: { background: '#fff', padding: '24px', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } },
            e('h3', { style: { color: '#10b981', margin: '0 0 5px 0', fontSize: '22px' } }, activePatient.name),
            e('p', { style: { color: '#64748b', margin: 0 } }, `ID: ${activePatient.id} | Email: ${activePatient.email}`)
        ),

        // Primary Tabs: Health Overview vs Care Plan
        e("div", { style: { display: "flex", gap: 12, marginBottom: "24px" } },
            e("button", { onClick: () => setActiveTab("overview"), style: tabStyle(activeTab === "overview") }, "📊 Health Overview"),
            e("button", { onClick: () => setActiveTab("prescription"), style: tabStyle(activeTab === "prescription") }, "📝 Care Plan")
        ),

        // --- HEALTH OVERVIEW CONTENT ---
        activeTab === "overview" && e('div', null,
            // Secondary Toggle Bar (Similar to Patient Dashboard)
            e("div", { style: { display: "flex", gap: 10, marginBottom: "20px", background: '#e2e8f0', padding: '5px', borderRadius: '12px', width: 'fit-content' } },
                e("button", {
                    onClick: () => setSubTab("daily"),
                    style: subTabStyle(subTab === "daily")
                }, "Overall Progress"),
                e("button", {
                    onClick: () => setSubTab("history"),
                    style: subTabStyle(subTab === "history")
                }, "Session History")
            ),

            // Toggle View 1: Overall Progress Charts
            subTab === "daily" && e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' } },
                Object.entries(progressByExercise).length > 0 ?
                    Object.entries(progressByExercise).map(([exerciseId, sessions]) => {
                        const exerciseName = exercises?.find(ex => ex.id === exerciseId)?.name || capitalize(exerciseId.replace(/-/g, ' '));
                        return e('div', { key: exerciseId, style: { background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' } },
                            e('h4', { style: { color: '#10b981', marginTop: 0 } }, exerciseName),
                            e(OverallExerciseChart, { data: sessions, title: `Range of Motion Progress` })
                        );
                    }) :
                    e("div", { style: { gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#64748b' } }, "No progress data available for charts.")
            ),

            // Toggle View 2: Detailed Session History
            subTab === "history" && e('div', null,
                e(DoctorSessionList, { progress: validSessions })
            )
        ),

        activeTab === "prescription" && e(DoctorPrescriptionView, { activePatient, exercises })
    );

    // --- STYLES ---
    function tabStyle(isActive) {
        return {
            padding: '12px 24px', borderRadius: '10px', border: 'none', fontWeight: '700', cursor: 'pointer',
            background: isActive ? '#10b981' : '#fff', color: isActive ? '#fff' : '#64748b',
            boxShadow: isActive ? '0 4px 6px -1px rgba(16, 185, 129, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.2s'
        };
    }

    function subTabStyle(isActive) {
        return {
            padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '14px',
            background: isActive ? '#fff' : 'transparent', color: isActive ? '#10b981' : '#64748b',
            boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s'
        };
    }
}

/* -------------------- Session History List -------------------- */
function DoctorSessionList({ progress }) {
    // FIX 3: Robust sorting logic
    const sorted = [...(progress || [])].sort((a, b) => {
        const dateA = new Date(b.dateTime || b.date);
        const dateB = new Date(a.dateTime || a.date);
        return dateA - dateB;
    });

    if (!sorted.length) {
        return e("div", {
            style: { background: '#fff', padding: '40px', borderRadius: '16px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0' }
        }, "No clinical sessions recorded yet.");
    }

    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: '15px' } },
        sorted.map((s) => e("div", {
            key: s.sessionId || s.dateTime || Math.random(),
            style: { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '20px' }
        },
            e("div", { style: { flex: 1, height: '200px' } }, e(SessionChart, { session: s })),
            e("div", { style: { width: '250px', borderLeft: '1px solid #f1f5f9', paddingLeft: '20px' } },
                e("div", { style: { fontWeight: '700', marginBottom: '10px' } }, capitalize(s.exercise || s.exerciseId || "Exercise")),
                e("div", { style: { fontSize: '13px', color: '#64748b' } }, `📅 ${formatDateTime(s.dateTime || s.date)}`),
                e("div", { style: { fontSize: '13px', color: '#64748b', marginTop: '5px' } }, `⏱️ ${s.durationMins || 1} mins`),
                e("div", { style: { fontSize: '13px', color: '#64748b' } }, `🔄 ${s.repsDone || 0} Reps`),
                e("div", {
                    style: { marginTop: '10px', display: 'inline-block', padding: '4px 8px', background: '#ecfdf5', color: '#059669', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px' }
                }, `Max: ${s.maxAngle || "-"}°`)
            )
        ))
    );
}

function DoctorPrescriptionView({ activePatient }) {
    // 1. Manually defined exercise data
    const jointData = {
        elbow: { "Flexion": { limit: 120, down: 20 }, "Extension": { limit: 10, down: 80 } },
        knee: { "Flexion": { limit: 110, down: 30 }, "Extension": { limit: 5, down: 70 } },
        wrist: { "Flexion": { limit: 60, down: 10 }, "Extension": { limit: 50, down: 10 }, "Radial Deviation": { limit: 20, down: 5 }, "Ulnar Deviation": { limit: 30, down: 5 } },
        ankle: { "Plantarflexion": { limit: 40, down: 5 }, "Dorsiflexion": { limit: 20, down: 5 } }
    };

    const [selectedJoint, setSelectedJoint] = useState("elbow");
    const [selectedExercise, setSelectedExercise] = useState("Flexion");
    const [targetAngle, setTargetAngle] = useState(120);
    const [reps, setReps] = useState(10);
    const [isSaving, setIsSaving] = useState(false);

    // Update targets automatically when joint or exercise changes
    const updateDefaults = (joint, ex) => {
        const defaults = jointData[joint][ex];
        if (defaults) {
            setTargetAngle(defaults.limit);
        }
    };

    const handleJointChange = (e) => {
        const joint = e.target.value;
        const firstEx = Object.keys(jointData[joint])[0];
        setSelectedJoint(joint);
        setSelectedExercise(firstEx);
        updateDefaults(joint, firstEx);
    };

    const handleExerciseChange = (e) => {
        const ex = e.target.value;
        setSelectedExercise(ex);
        updateDefaults(selectedJoint, ex);
    };

    const onSave = async (ev) => {
        ev.preventDefault();
        setIsSaving(true);
        try {
            // Updated path using your DB structure
            const path = `prescriptions/${activePatient.id}/${selectedJoint}_${selectedExercise.replace(/\s+/g, '_')}`;
            await dbSet(dbRef(db, path), {
                joint: selectedJoint,
                exercise: selectedExercise,
                targetAngle: parseInt(targetAngle),
                reps: parseInt(reps),
                updatedAt: new Date().toISOString()
            });
            alert(`Prescription saved for ${activePatient.name}`);
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return e('div', { className: 'card', style: { padding: 30, background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' } },
        e('h3', { style: { color: '#0ea5e9', marginBottom: 25, marginTop: 0 } }, `New Prescription: ${activePatient.name}`),

        e('form', { onSubmit: onSave },
            e('div', { style: { display: 'flex', gap: 20, marginBottom: 20 } },
                // Joint Selection
                e('div', { style: { flex: 1 } },
                    e('label', { style: { display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '8px' } }, 'TARGET JOINT'),
                    e('select', {
                        value: selectedJoint,
                        onChange: handleJointChange,
                        style: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }
                    }, Object.keys(jointData).map(j => e('option', { key: j, value: j }, capitalize(j))))
                ),
                // Exercise Selection
                e('div', { style: { flex: 1 } },
                    e('label', { style: { display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '8px' } }, 'EXERCISE TYPE'),
                    e('select', {
                        value: selectedExercise,
                        onChange: handleExerciseChange,
                        style: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }
                    }, Object.keys(jointData[selectedJoint]).map(ex => e('option', { key: ex, value: ex }, ex)))
                )
            ),

            e('div', { style: { display: 'flex', gap: 20, marginBottom: 30 } },
                e('div', { style: { flex: 1 } },
                    e('label', { style: { display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '8px' } }, 'TARGET ANGLE (°)'),
                    e('input', {
                        type: 'number',
                        value: targetAngle,
                        onChange: (e) => setTargetAngle(e.target.value),
                        style: { width: '90%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }
                    })
                ),
                e('div', { style: { flex: 1 } },
                    e('label', { style: { display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '8px' } }, 'REPS PER SESSION'),
                    e('input', {
                        type: 'number',
                        value: reps,
                        onChange: (e) => setReps(e.target.value),
                        style: { width: '90%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }
                    })
                )
            ),

            e('button', {
                type: 'submit',
                disabled: isSaving,
                style: {
                    width: '100%', padding: '14px', borderRadius: '8px', background: '#10b981', color: 'white',
                    fontWeight: '700', border: 'none', cursor: 'pointer', opacity: isSaving ? 0.7 : 1
                }
            }, isSaving ? "Saving..." : "Save to Patient Record")
        )
    );
}
