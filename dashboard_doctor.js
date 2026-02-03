const { useState } = React;
import { capitalize, formatDateTime } from './utils.js';
import { SessionChart, OverallExerciseChart } from './charts.js';
import { loadProgress, saveProgress } from './firebase_config.js';


const e = React.createElement;

/* -------------------- DoctorDashboard Components -------------------- */
export function DoctorDashboard({ state, currentUser, signOut }) {
    const assignedPatients = state.users.filter(
        (u) => u.role === 'patient' && currentUser.patients && currentUser.patients.includes(u.id)
    );

    const [selectedPatient, setSelectedPatient] = useState(assignedPatients.length > 0 ? assignedPatients[0].id : null);

    const activePatient = assignedPatients.find(p => p.id === selectedPatient);
    const activePatientProgress = selectedPatient ? (state.progress[selectedPatient] || []) : [];
    return e("section", null,
        e("div", { className: "dash-top" },
            e("h2", null, ` ${currentUser.name}`),
            e("button", { className: "btn", onClick: signOut }, "Sign out")
        ),
        e("div", { className: "dash-grid" },
            e("aside", { className: "card" },
                e("h3", null, "My Patients"),
                assignedPatients.map((p) =>
                    e("div", {
                        key: p.id,
                        className: "patient-item",
                        style: { cursor: 'pointer', background: selectedPatient === p.id ? '#f3f6fb' : 'white' }
                    },
                        e("div", null,
                            e("strong", null, p.name),
                            e("div", { className: "muted" }, p.email)
                        ),
                        e("button", {
                            className: `btn ghost`,
                            onClick: () => setSelectedPatient(p.id)
                        }, selectedPatient === p.id ? "Viewing" : "View")
                    )
                )
            ),
            e("main", { style: { minHeight: '60vh' } },
                selectedPatient
                    ? e(DoctorPatientView, { activePatient, progress: activePatientProgress, exercises: state.exercises, allUsers: state.users })
                    : e("div", { className: "card", style: { padding: 30, textAlign: 'center' } },
                        e("h3", { className: "muted" }, "Select a patient to view their progress.")
                    )
            )
        )
    );
}

function DoctorPatientView({ activePatient, progress, exercises, allUsers }) {
    const [activeTab, setActiveTab] = useState("overview");

    // 🛑 FIX: Use || [] to ensure progress is an array, preventing the 'reduce' error.
    const safeProgress = progress || [];

    const progressByExercise = progress.reduce((acc, session) => {
        const key = session.exerciseId || session.exercise || 'unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(session);
        return acc;
    }, {});

    const doctor = allUsers.find(u => u.id === activePatient.assignedDoctorId);

    return e('div', null,
        e('div', { className: 'card', style: { marginBottom: 20, padding: 20 } },
            e('h3', { style: { color: '#2563eb', marginBottom: 5 } }, activePatient.name),
            e('p', { className: 'muted', style: { margin: '0 0 10px 0' } }, `Email: ${activePatient.email}`),
            doctor && e('p', { className: 'muted', style: { margin: 0 } }, `Assigned Doctor: Dr. ${doctor.name}`),
            !doctor && e('p', { className: 'muted', style: { margin: 0 } }, `Assigned Doctor: N/A`),
        ),

        e("div", { style: { display: "flex", gap: 10, marginBottom: 20 } },
            e("button", { onClick: () => setActiveTab("overview"), style: tabStyle(activeTab === "overview") }, "📊 Overview"),
            e("button", { onClick: () => setActiveTab("prescription"), style: tabStyle(activeTab === "prescription") }, "📝 Prescription")
        ),

        activeTab === "overview" && e('div', null,
            e('h3', { style: { color: '#0066cc', marginBottom: 15 } }, 'Overall Progress'),
            e('div', { className: 'grid', style: { gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 } },
                Object.entries(progressByExercise).map(([exerciseId, sessions]) => {
                    const exerciseName = exercises.find(e => e.id === exerciseId)?.name || capitalize(exerciseId.replace(/-/g, ' '));
                    return e('div', { key: exerciseId, className: 'card' },
                        e('h4', { style: { marginBottom: 10, color: '#10b981' } }, exerciseName),
                        e(OverallExerciseChart, { data: sessions, title: `Max Angle - ${exerciseName}` })
                    );
                })
            ),

            e('h3', { style: { color: '#0066cc', marginBottom: 15, marginTop: 30 } }, 'All Sessions'),
            e(DoctorSessionList, { progress })

        ),

        activeTab === "prescription" && e(DoctorPrescriptionView, { activePatient, exercises })
    );

    function tabStyle(isActive) {
        return {
            padding: '10px 18px',
            borderRadius: '8px',
            border: isActive ? 'none' : '1px solid #d1d5db',
            fontWeight: '600',
            cursor: 'pointer',
            background: isActive ? '#2563eb' : 'white',
            color: isActive ? 'white' : '#374151',
            transition: 'all 0.2s'
        };
    }
}

function DoctorSessionList({ progress }) {
    const sorted = [...progress].sort((a, b) => new Date(b.dateTime || b.date) - new Date(a.dateTime || a.date));

    if (!sorted.length) {
        return e("div", { className: "muted card", style: { padding: 20 } }, "No recorded sessions for this patient yet.");
    }

    return e('div', null,
        sorted.map((s) => e("div", { key: s.sessionId || s.dateTime, style: { marginBottom: 20, borderBottom: '1px solid #eee', paddingBottom: 15 } },
            e("h4", null, `${capitalize(s.joint || "")} — ${s.exercise || s.exerciseId || ""}`),
            e("div", { style: { display: "flex", gap: 14, alignItems: "flex-start" } },
                e("div", { style: { flex: "1 1 700px", background: "#fff", padding: 12, borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.03)" } },
                    e(SessionChart, { session: s })
                ),
                e("div", { style: { width: 220, background: "#fff", padding: 12, borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.03)" } },
                    e("div", { style: { fontWeight: 700 } }, `Date: ${formatDateTime(s.dateTime || s.date)}`),
                    e("div", { className: "muted", style: { marginTop: 8 } }, `Duration: ${s.durationMins || 15} mins`),
                    e("div", { className: "muted" }, `Reps: ${s.repsDone || 0}`),
                    e("div", { className: "muted" }, `Max angle: ${s.maxAngle || "-"}°`)
                )
            )
        ))
    );
}

function DoctorPrescriptionView({ activePatient, exercises }) {
    const [selectedExercise, setSelectedExercise] = useState(exercises[0]?.id || '');
    const [targetAngle, setTargetAngle] = useState(exercises.find(e => e.id === selectedExercise)?.targetAngle || 120);
    const [reps, setReps] = useState(exercises.find(e => e.id === selectedExercise)?.reps || 10);

    const onSave = (ev) => {
        ev.preventDefault();
        alert(`Prescription for ${activePatient.name} updated: ${reps} reps to reach ${targetAngle}° for ${exercises.find(e => e.id === selectedExercise)?.name}. (Demo only - no actual DB write)`);
    };

    return e('div', { className: 'card', style: { padding: 20 } },
        e('h3', { style: { color: '#0066cc', marginBottom: 20 } }, `Set Prescription for ${activePatient.name}`),
        e('form', { onSubmit: onSave, style: { maxWidth: 600 } },
            e('div', { style: { marginBottom: 15 } },
                e('label', { style: { fontWeight: 600, display: 'block', marginBottom: 5 } }, 'Exercise'),
                e('select', {
                    value: selectedExercise,
                    onChange: (e) => setSelectedExercise(e.target.value),
                    required: true,
                    style: inputStyle()
                },
                    exercises.map(e => e('option', { key: e.id, value: e.id }, e.name))
                )
            ),

            e('div', { style: { marginBottom: 15, display: 'flex', gap: 20 } },
                e('div', { style: { flex: 1 } },
                    e('label', { style: { fontWeight: 600, display: 'block', marginBottom: 5 } }, 'Target Angle (° of Flexion)'),
                    e('input', {
                        type: 'number',
                        value: targetAngle,
                        onChange: (e) => setTargetAngle(e.target.value),
                        min: 0,
                        max: 180,
                        required: true,
                        style: inputStyle()
                    })
                ),
                e('div', { style: { flex: 1 } },
                    e('label', { style: { fontWeight: 600, display: 'block', marginBottom: 5 } }, 'Reps per Session'),
                    e('input', {
                        type: 'number',
                        value: reps,
                        onChange: (e) => setReps(e.target.value),
                        min: 1,
                        required: true,
                        style: inputStyle()
                    })
                )
            ),

            e('button', {
                className: 'btn',
                type: 'submit',
                style: { marginTop: 15, background: '#10b981' }
            }, 'Save Prescription')
        )
    );

    function inputStyle() {
        return {
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            fontSize: '1rem',
            outline: 'none',
            boxSizing: 'border-box'
        };
    }
}