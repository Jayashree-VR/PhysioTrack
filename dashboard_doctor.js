const { useState, useEffect } = React;
import { capitalize, formatDateTime } from './utils.js';
import { SessionChart, OverallExerciseChart } from './charts.js';
import {
    ref as dbRef,
    get as dbGet,
    set as dbSet,
    onValue,
    update as dbUpdate
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { db } from './firebase_config.js';

const e = React.createElement;


/* -------------------- DoctorDashboard Main -------------------- */
export function DoctorDashboard({ state, currentUser }) {

    /* 1: Normalize patientAssignments */
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

    /* 2: Fetch progress from Firebase */
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

    const handleUpdateSession = async (updatedSession) => {
        if (!selectedPatient || !updatedSession.sessionId) return;

        try {
            // 1. Reference the specific session
            const sessionRef = dbRef(db, `progress/${selectedPatient}/${updatedSession.sessionId}`);

            // 2. Construct the update object using DOT NOTATION
            // This ensures the feedback goes INTO the 'summary' folder 
            // without deleting the 'timeline' folder.
            const updates = {
                "summary/doctorFeedback": updatedSession.doctorFeedback,
                "summary/feedbackDate": new Date().toISOString()
            };

            // 3. Use dbUpdate instead of dbSet
            await dbUpdate(sessionRef, updates);

            // 4. Update local state to reflect the change in the UI
            setPatientsProgress(prev => {
                const currentPatientData = prev[selectedPatient] || {};
                const currentSession = currentPatientData[updatedSession.sessionId] || {};

                return {
                    ...prev,
                    [selectedPatient]: {
                        ...currentPatientData,
                        [updatedSession.sessionId]: {
                            ...currentSession,
                            summary: {
                                ...(currentSession.summary || {}),
                                doctorFeedback: updatedSession.doctorFeedback,
                                feedbackDate: updates["summary/feedbackDate"]
                            }
                        }
                    }
                };
            });
        } catch (err) {
            console.error("Error updating session feedback:", err);
            throw err;
        }
    };

    return e("section", { style: { minHeight: '100vh', background: colors.bg, padding: '40px' } },

        /* Header */
        e("div", { style: { marginBottom: 30 } },
            e("h2", null, `Welcome, ${currentUser.name}`),
            e("p", { style: { color: colors.textMuted } }, "Patient Monitoring & Clinical Progress")
        ),

        /* Main Grid Layout */
        e("div", {
            style: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: 30 }
        },
            /* LEFT SIDEBAR */
            e("aside", {
                style: {
                    background: colors.card,
                    padding: 20,
                    borderRadius: 16,
                    height: 'fit-content',
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                }
            },
                e("h3", { style: { fontSize: 14, color: colors.textMuted, marginBottom: 15 } }, "MY PATIENTS"),
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
                                border: `1px solid ${selectedPatient === p.id ? colors.primary : '#e2e8f0'}`,
                                background: selectedPatient === p.id ? '#ecfdf5' : '#fff'
                            }
                        },
                            e("div", { style: { fontWeight: 700 } }, p.name),
                            e("div", { style: { fontSize: 12, color: colors.textMuted } }, p.email)
                        )
                    )
            ),

            /* RIGHT MAIN VIEW - Duplication fixed by keeping only this block */
            e("main", null,
                loading
                    ? e("div", { style: { textAlign: 'center', padding: '50px' } }, "Loading patient data...")
                    : selectedPatient
                        ? e(DoctorPatientView, {
                            activePatient,
                            progress: activePatientProgress,
                            exercises: state.exercises,
                            onUpdateSession: handleUpdateSession
                        })
                        : e("div", { style: { background: '#fff', padding: '40px', borderRadius: '16px', textAlign: 'center' } }, "Select a patient from the sidebar to view their progress.")
            )
        )
    );
}


/* -------------------- Patient Detailed View -------------------- */
function DoctorPatientView({ activePatient, progress, exercises, onUpdateSession }) {
    const [activeTab, setActiveTab] = useState("overview");
    const [subTab, setSubTab] = useState("daily");

    // Inside DoctorDashboard or DoctorPatientView where you process progress
    const progressArray = progress && typeof progress === 'object' && !Array.isArray(progress)
        ? Object.entries(progress).map(([sessionId, val]) => {
            // FIX: Check if data is inside 'summary' or at the root of the session
            const data = val.summary ? val.summary : val;

            return {
                sessionId: sessionId,
                ...data,
                // Ensure timeline is captured regardless of structure
                timeline: val.timeline || []
            };
        }).sort((a, b) => new Date(b.dateTime || b.date) - new Date(a.dateTime || a.date))
        : [];

    const validSessions = progressArray.filter(s => s && (s.exercise || s.exerciseId));

    const progressByExercise = validSessions.reduce((acc, session) => {
        const key = session.exerciseId || session.exercise || 'unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(session);
        return acc;
    }, {});

    return e('div', null,
        e('div', { style: { background: '#fff', padding: '24px', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } },
            e('h3', { style: { color: '#10b981', margin: '0 0 5px 0', fontSize: '22px' } }, activePatient.name),
            e('p', { style: { color: '#64748b', margin: 0 } }, `ID: ${activePatient.id} | Email: ${activePatient.email}`)
        ),

        e("div", { style: { display: "flex", gap: 12, marginBottom: "24px" } },
            e("button", { onClick: () => setActiveTab("overview"), style: tabStyle(activeTab === "overview") }, "📊 Health Overview"),
            e("button", { onClick: () => setActiveTab("prescription"), style: tabStyle(activeTab === "prescription") }, "📝 Care Plan")
        ),

        activeTab === "overview" && e('div', null,
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

            subTab === "history" && e('div', null,
                e(DoctorSessionList, {
                    progress: validSessions,
                    onUpdateSession: onUpdateSession
                })
            )
        ),

        activeTab === "prescription" && e(DoctorPrescriptionView, { activePatient, exercises })
    );

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

function DoctorSessionList({ progress, onUpdateSession }) {
    const sorted = [...(progress || [])].sort((a, b) => {
        const dateA = new Date(b.dateTime || b.date || 0);
        const dateB = new Date(a.dateTime || a.date || 0);
        return dateA - dateB;
    });

    if (!sorted.length) {
        return e("div", {
            style: { background: '#fff', padding: '40px', borderRadius: '16px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0' }
        }, "No clinical sessions recorded yet.");
    }

    const handleSendFeedback = async (session) => {
        const message = prompt(`Add clinical note for ${session.exercise}:`);

        if (message && message.trim()) {
            const updatedSession = {
                ...session,
                doctorFeedback: message,
                feedbackDate: new Date().toISOString()
            };

            try {
                await onUpdateSession(updatedSession);
                alert("Feedback saved successfully.");
            } catch (err) {
                console.error("Failed to save feedback:", err);
            }
        }
    };

    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: '15px' } },
        sorted.map((s, index) => {
            const sessionKey = s.sessionId || `doc-sess-${index}`;

            return e("div", {
                key: sessionKey,
                style: { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }
            },
                e("div", { style: { flex: 1, height: '200px' } }, e(SessionChart, { session: s })),

                e("div", { style: { width: '250px', borderLeft: '1px solid #f1f5f9', paddingLeft: '20px', display: 'flex', flexDirection: 'column' } },
                    e("div", { style: { fontWeight: '700', marginBottom: '10px', fontSize: '16px', color: '#0f172a' } },
                        `${capitalize(s.joint || "")} — ${capitalize(s.exercise || s.exerciseId || "Exercise")}`
                    ),

                    e("div", { style: { flex: 1 } },
                        e("div", { style: { fontSize: '13px', color: '#64748b', marginBottom: '4px' } }, `📅 ${formatDateTime(s.dateTime || s.date)}`),
                        e("div", { style: { fontSize: '13px', color: '#64748b', marginBottom: '4px' } }, `⏱️ ${s.durationMins || 0} mins`),
                        // FIX: Ensure it picks up repsDone from your Firebase data
                        e("div", { style: { fontSize: '13px', color: '#64748b', marginBottom: '4px' } }, `🔄 ${s.repsDone ?? s.reps ?? 0} Reps`),
                        e("div", {
                            style: { display: 'inline-block', padding: '4px 10px', background: '#ecfdf5', color: '#059669', borderRadius: '6px', fontWeight: '800', fontSize: '13px' }
                        }, `Max: ${s.maxAngle || "-"}°`)
                    ),

                    /* Display Feedback */
                    s.doctorFeedback
                        ? e("div", {
                            style: {
                                marginTop: '15px',
                                padding: '12px',
                                background: '#f8fafc',
                                borderRadius: '8px',
                                borderLeft: '4px solid #10b981',
                                fontSize: '12px',
                                color: '#334155'
                            }
                        },
                            e("strong", { style: { display: 'block', marginBottom: '4px', color: '#10b981' } }, "Clinical Note:"),
                            // FIX: Wrapping the text in a span or div ensures stable rendering
                            e("div", null, s.doctorFeedback)
                        )
                        : e("button", {
                            onClick: () => handleSendFeedback(s),
                            style: feedbackButtonStyle()
                        }, "💬 Send Feedback")
                )
            );
        })
    );
}

function feedbackButtonStyle() {
    return {
        marginTop: '15px', width: '100%', padding: '10px',
        background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: '8px', color: '#64748b',
        fontSize: '12px', fontWeight: '700', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        transition: 'all 0.2s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    };
}

export function DoctorPrescriptionView({ activePatient }) {
    const [currentPrescriptions, setCurrentPrescriptions] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    const theme = {
        primary: '#10b981',
        danger: '#ef4444',
        textMain: '#0f172a',
        border: '#e2e8f0',
        bgLight: '#f8fafc'
    };

    const [selectedJoint, setSelectedJoint] = useState("elbow");
    const [selectedExercise, setSelectedExercise] = useState("Flexion");
    const [upThreshold, setUpThreshold] = useState(120);
    const [downThreshold, setDownThreshold] = useState(20);
    const [reps, setReps] = useState(10);

    const jointData = {
        elbow: { "Flexion": { limit: 140, defaultUp: 120, defaultDown: 20 }, "Extension": { limit: 140, defaultUp: 10, defaultDown: 80 } },
        knee: { "Flexion": { limit: 150, defaultUp: 110, defaultDown: 30 }, "Extension": { limit: 150, defaultUp: 5, defaultDown: 70 } },
        wrist: { "Flexion": { limit: 60, defaultUp: 45, defaultDown: 10 }, "Extension": { limit: 60, defaultUp: 40, defaultDown: 10 } },
        ankle: { "Plantarflexion": { limit: 40, defaultUp: 30, defaultDown: 5 }, "Dorsiflexion": { limit: 30, defaultUp: 20, defaultDown: 5 } }
    };

    useEffect(() => {
        if (!activePatient?.id) return;
        const pRef = dbRef(db, `prescriptions/${activePatient.id}`);

        const unsubscribe = onValue(pRef, (snapshot) => {
            setCurrentPrescriptions(snapshot.val() || {});
        });

        return () => unsubscribe();
    }, [activePatient.id]);

    const handleSave = async () => {
        if (!activePatient?.id) return alert("No active patient selected");
        setIsSaving(true);

        try {
            const cleanJoint = selectedJoint.toLowerCase();
            // Option A: Keep unique per type (Standard)
            const prescriptionKey = `${cleanJoint}_${selectedExercise.replace(/\s+/g, '')}`;

            // Option B: If you want to allow truly unlimited (even duplicates):
            // const prescriptionKey = `${cleanJoint}_${selectedExercise}_${Date.now()}`;

            const prescriptionRef = dbRef(db, `prescriptions/${activePatient.id}/${prescriptionKey}`);

            await dbSet(prescriptionRef, {
                joint: cleanJoint,
                exercise: selectedExercise,
                upThreshold: Number(upThreshold),
                downThreshold: Number(downThreshold),
                reps: Number(reps),
                assignedAt: new Date().toISOString(),
                status: 'active'
            });

            alert("Exercise added to plan!");
        } catch (error) {
            alert("Save failed: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemove = async (key) => {
        if (!confirm(`Remove this exercise from the patient's plan?`)) return;
        try {
            await dbSet(dbRef(db, `prescriptions/${activePatient.id}/${key}`), null);
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const currentExData = jointData[selectedJoint][selectedExercise] || Object.values(jointData[selectedJoint])[0];
    const currentMaxROM = currentExData.limit;
    const isInvalidROM = upThreshold > currentMaxROM;

    const inputStyle = (hasError) => ({
        width: '90%', padding: '14px', borderRadius: '14px',
        border: `1.5px solid ${hasError ? theme.danger : theme.border}`,
        fontSize: '15px', color: theme.textMain, background: '#fff', outline: 'none'
    });

    const handleJointChange = (joint) => {
        setSelectedJoint(joint);
        const firstEx = Object.keys(jointData[joint])[0];
        setSelectedExercise(firstEx);
        setUpThreshold(jointData[joint][firstEx].defaultUp);
        setDownThreshold(jointData[joint][firstEx].defaultDown);
    };

    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: '30px' } },
        e('div', { style: { padding: '24px', background: '#fff', borderRadius: '14px', border: `1px solid ${theme.border}` } },
            e('div', { style: { marginBottom: '24px' } },
                e('span', { style: { color: theme.primary, fontWeight: '700', fontSize: '12px' } }, "NEW ASSIGNMENT"),
                e('h3', { style: { color: theme.textMain, margin: '4px 0', fontSize: '20px' } }, `Prescribe for ${activePatient?.name}`)
            ),
            e('form', { onSubmit: (ev) => { ev.preventDefault(); handleSave(); } },
                e('div', { style: { display: 'flex', gap: '24px', marginBottom: '24px' } },
                    e('div', { style: { flex: 1 } },
                        e('label', { style: { display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '8px' } }, 'JOINT'),
                        e('select', {
                            value: selectedJoint,
                            onChange: (e) => handleJointChange(e.target.value),
                            style: inputStyle()
                        }, Object.keys(jointData).map(j => e('option', { key: j, value: j }, j.toUpperCase())))
                    ),
                    e('div', { style: { flex: 1 } },
                        e('label', { style: { display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '8px' } }, 'EXERCISE'),
                        e('select', {
                            value: selectedExercise,
                            onChange: (e) => {
                                setSelectedExercise(e.target.value);
                                setUpThreshold(jointData[selectedJoint][e.target.value].defaultUp);
                                setDownThreshold(jointData[selectedJoint][e.target.value].defaultDown);
                            },
                            style: inputStyle()
                        }, Object.keys(jointData[selectedJoint]).map(ex => e('option', { key: ex, value: ex }, ex)))
                    )
                ),
                e('div', { style: { background: theme.bgLight, padding: '20px', borderRadius: '16px', marginBottom: '24px' } },
                    e('div', { style: { display: 'flex', gap: '16px' } },
                        e('div', { style: { flex: 1 } },
                            e('label', { style: { display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '8px' } }, `UP THRESHOLD (MAX ${currentMaxROM}°)`),
                            e('input', { type: 'number', value: upThreshold, onChange: (e) => setUpThreshold(e.target.value), style: inputStyle(isInvalidROM) })
                        ),
                        e('div', { style: { flex: 1 } },
                            e('label', { style: { display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '8px' } }, 'DOWN THRESHOLD'),
                            e('input', { type: 'number', value: downThreshold, onChange: (e) => setDownThreshold(e.target.value), style: inputStyle() })
                        ),
                        e('div', { style: { flex: 1 } },
                            e('label', { style: { display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '8px' } }, 'REPS'),
                            e('input', { type: 'number', value: reps, onChange: (e) => setReps(e.target.value), style: { ...inputStyle(), textAlign: 'center' } })
                        )
                    )
                ),
                e('button', {
                    type: 'submit',
                    disabled: isInvalidROM || isSaving || !activePatient,
                    style: {
                        width: '100%', padding: '16px', borderRadius: '12px',
                        background: isInvalidROM ? '#ccc' : theme.primary,
                        color: '#fff', border: 'none', cursor: 'pointer',
                        fontWeight: 'bold', fontSize: '15px'
                    }
                }, isSaving ? "Saving..." : "Add to Care Plan")
            )
        ),

        /* SECTION B: ACTIVE CARE PLAN (Removal List) */
        e('div', { style: { padding: '24px', background: '#fff', borderRadius: '14px', border: `1px solid ${theme.border}` } },
            e('h3', { style: { fontSize: '18px', marginBottom: '15px', color: theme.textMain } }, "Current Active Care Plan"),
            Object.keys(currentPrescriptions).length === 0
                ? e('p', { style: { color: '#64748b', textAlign: 'center', padding: '20px' } }, "No exercises currently assigned.")
                : e('div', { style: { display: 'grid', gap: '12px' } },
                    Object.entries(currentPrescriptions).map(([key, data]) =>
                        e('div', {
                            key: key,
                            style: {
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '16px', borderRadius: '12px', background: '#f8fafc',
                                border: '1px solid #e2e8f0'
                            }
                        },
                            e('div', null,
                                e('div', { style: { fontWeight: '700', color: theme.textMain } }, `${data.joint.toUpperCase()} - ${data.exercise}`),
                                e('div', { style: { fontSize: '13px', color: '#64748b' } }, `Goal: ${data.upThreshold}° | Reps: ${data.reps}`)
                            ),
                            e('button', {
                                onClick: () => handleRemove(key),
                                style: {
                                    padding: '8px 12px', borderRadius: '8px', border: `1px solid ${theme.danger}`,
                                    color: theme.danger, background: 'transparent', cursor: 'pointer',
                                    fontSize: '12px', fontWeight: '600'
                                }
                            }, "Remove")
                        )
                    )
                )
        )
    );
}
