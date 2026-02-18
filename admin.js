import {
    initializeApp,
    getApps,
    deleteApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
    ref as dbRef,
    set as dbSet,
    update,
    query,
    orderByChild,
    onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import { firebaseConfig, db } from "./firebase_config.js";

const e = React.createElement;
const SECONDARY_APP_NAME = "SecondaryAuth";

export function AdminChatPage({ currentUser, state, setState }) {
    const [selectedPatientId, setSelectedPatientId] = React.useState(null);
    const [replyText, setReplyText] = React.useState("");
    const chatEndRef = React.useRef(null);

    const allMessages = state.messages || [];
    const groups = allMessages.reduce((acc, m) => {
        const pId = m.senderRole === 'admin' ? m.receiverId : m.senderId;
        const pName = m.senderRole === 'admin' ? (m.receiverName || "User") : (m.senderName || "User");
        if (!acc[pId]) acc[pId] = { id: pId, name: pName, messages: [] };
        acc[pId].messages.push(m);
        return acc;
    }, {});

    const conversations = Object.values(groups);
    const selectedConv = conversations.find(c => c.id === selectedPatientId);
    const activeChat = selectedConv ? [...selectedConv.messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) : [];

    // React.useEffect(() => {
    //     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // }, [activeChat]);

    const handleSend = async () => {
        if (!replyText.trim() || !selectedPatientId) return;
        const msgId = Date.now().toString();
        const newMsg = {
            id: msgId, senderId: currentUser.id, senderName: 'Admin',
            receiverId: selectedPatientId, receiverName: selectedConv.name,
            text: replyText, timestamp: new Date().toISOString(),
            senderRole: 'admin', status: 'unread'
        };
        await dbSet(dbRef(db, `messages/${msgId}`), newMsg);
        setReplyText("");
    };

    return e('div', {
        style: {
            height: 'calc(100vh - 100px)', // Leaves room for your top navbar
            padding: '20px 40px',          // Pulls the app away from screen edges
            background: '#f1f5f9',         // Background of the "page"
            display: 'flex',
            justifyContent: 'center'
        }
    },
        // Main Container (The "Floating" Box)
        e('div', {
            style: {
                width: '100%',
                maxWidth: '1200px',        // Prevents it from being too wide on big screens
                background: '#fff',
                borderRadius: '16px',      // Rounded corners for the whole app
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                overflow: 'hidden',        // Clips children to the rounded corners
                border: '1px solid #e2e8f0',
                height: '500px'
            }
        },

            /* Sidebar */
            e('div', {
                style: {
                    width: '300px',
                    borderRight: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#fff'
                }
            },
                e('div', { style: { padding: '24px', borderBottom: '1px solid #f1f5f9' } },
                    e('h3', { style: { margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' } }, 'Support Inbox')
                ),
                e('div', { style: { flex: 1, overflowY: 'auto' } },
                    conversations.map(conv => e('div', {
                        key: conv.id,
                        onClick: () => setSelectedPatientId(conv.id),
                        style: {
                            padding: '16px 20px', cursor: 'pointer', borderBottom: '1px solid #f8fafc',
                            background: selectedPatientId === conv.id ? '#f0fdfa' : 'transparent',
                            borderLeft: selectedPatientId === conv.id ? '4px solid #0d9488' : '4px solid transparent',
                            transition: 'all 0.2s'
                        }
                    },
                        e('div', { style: { fontWeight: '700', fontSize: '14px', color: '#1e293b' } }, conv.name),
                        e('div', { style: { fontSize: '12px', color: '#64748b', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                            conv.messages.at(-1)?.text)
                    ))
                )
            ),

            /* Chat Area */
            e('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', height: '450px' } },
                selectedPatientId ? e(React.Fragment, null,
                    // Header
                    e('div', { style: { padding: '16px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' } },
                        e('div', { style: { width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' } }),
                        e('span', { style: { fontWeight: '700', fontSize: '15px' } }, selectedConv.name),
                        e('span', { style: { fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px' } }, 'Patient')
                    ),
                    // Messages
                    e('div', { style: { flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' } },
                        activeChat.map(m => e('div', {
                            key: m.id,
                            style: {
                                alignSelf: m.senderRole === 'admin' ? 'flex-end' : 'flex-start',
                                background: m.senderRole === 'admin' ? '#0d9488' : '#fff',
                                color: m.senderRole === 'admin' ? '#fff' : '#1e293b',
                                padding: '10px 16px', borderRadius: '14px', maxWidth: '70%',
                                fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                border: m.senderRole === 'admin' ? 'none' : '1px solid #e2e8f0'
                            }
                        }, m.text)),
                        e('div', { ref: chatEndRef })
                    ),
                    // Input
                    e('div', { style: { padding: '20px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' } },
                        e('input', {
                            value: replyText, onChange: e => setReplyText(e.target.value),
                            onKeyDown: e => e.key === 'Enter' && handleSend(),
                            placeholder: 'Write your message...',
                            style: { flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', background: '#f8fafc' }
                        }),
                        e('button', {
                            onClick: handleSend,
                            style: { background: '#0d9488', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }
                        }, 'Send')
                    )
                ) : e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' } }, 'Select a patient to start')
            )
        )
    );
}

export function AdminDashboard({ state, currentUser, signOut, setState }) {
    const [activeView, setActiveView] = React.useState("management"); // "management" or "chat"
    const [newDoc, setNewDoc] = React.useState({ name: "", email: "" });
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const doctors = state.users.filter(u => u.role === "doctor");
    const patients = state.users.filter(u => u.role === "patient");
    const unreadCount = (state.messages || []).filter(m => m.status === "unread").length;

    const theme = {
        primary: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        bg: "#f8fafc",
        card: "#ffffff",
        textPrimary: "#0f172a",
        textSecondary: "#64748b"
    };

    // --- Handlers ---
    const syncAssignments = async (doctorId, updatedList) => {
        try {
            await update(dbRef(db, `users/${doctorId}`), { patientAssignments: updatedList });
            setState(prev => ({
                ...prev,
                users: prev.users.map(u => u.id === doctorId ? { ...u, patientAssignments: updatedList } : u)
            }));
        } catch (err) { console.error("Sync Error:", err); }
    };

    const handleAddDoctor = async (ev) => {
        ev.preventDefault();
        if (!newDoc.name || !newDoc.email) return;
        setIsSubmitting(true);
        const autoPassword = `doc00${doctors.length + 1}`;
        try {
            const tempApp = getApps().find(app => app.name === SECONDARY_APP_NAME) || initializeApp(firebaseConfig, SECONDARY_APP_NAME);
            const tempAuth = getAuth(tempApp);
            const userCred = await createUserWithEmailAndPassword(tempAuth, newDoc.email, autoPassword);

            const doctorData = {
                id: userCred.user.uid,
                name: newDoc.name,
                email: newDoc.email,
                role: "doctor",
                patientAssignments: []
            };

            await dbSet(dbRef(db, `users/${doctorData.id}`), doctorData);
            setState(prev => ({ ...prev, users: [...prev.users, doctorData] }));
            await deleteApp(tempApp);
            setNewDoc({ name: "", email: "" });
            alert(`Doctor added successfully!\nPassword: ${autoPassword}`);
        } catch (err) { alert(err.message); } finally { setIsSubmitting(false); }
    };

    // --- UI Helpers ---
    const NavButton = (label, viewId) => e("button", {
        onClick: () => setActiveView(viewId),
        style: {
            padding: "10px 24px", borderRadius: "10px", border: "none", cursor: "pointer",
            fontWeight: "700", fontSize: "14px", transition: "0.2s",
            background: activeView === viewId ? theme.primary : "transparent",
            color: activeView === viewId ? "white" : theme.textSecondary,
        }
    }, label);

    const StatCard = (label, value, color = theme.textPrimary) => e("div", {
        style: { background: theme.card, padding: "24px", borderRadius: "16px", flex: 1, border: "1px solid #e2e8f0" }
    },
        e("span", { style: { color: theme.textSecondary, fontSize: "12px", fontWeight: "700", textTransform: "uppercase" } }, label),
        e("div", { style: { fontSize: "28px", fontWeight: "800", marginTop: "8px", color: color } }, value)
    );

    return e("div", { style: { minHeight: "100vh", background: theme.bg, fontFamily: "Inter, sans-serif" } },

        // TOP NAVIGATION HEADER
        e("div", { style: { background: "white", borderBottom: "1px solid #e2e8f0", padding: "15px 40px", position: "sticky", top: 0, zIndex: 100 } },
            e("div", { style: { maxWidth: "1250px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" } },
                e("div", null,
                    e("h1", { style: { fontSize: "22px", fontWeight: "900", color: theme.textPrimary, margin: 0 } }, "HealthDesk Admin"),
                    e("div", { style: { display: 'flex', alignItems: 'center', gap: '5px' } },
                        e("div", { style: { width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' } }),
                        e("span", { style: { fontSize: '12px', color: theme.textSecondary, fontWeight: '600' } }, "System Live")
                    )
                ),
                e("div", { style: { display: "flex", gap: "8px", background: "#f1f5f9", padding: "6px", borderRadius: "14px" } },
                    NavButton("Staff Management", "management"),
                    NavButton(`Support Chat`, "chat")
                )
            )
        ),

        activeView === "management" ? (
            // --- VIEW 1: STAFF MANAGEMENT ---
            e("div", { style: { padding: "40px" } },
                e("div", { style: { maxWidth: "1200px", margin: "0 auto 40px auto", display: "flex", gap: "24px" } },
                    StatCard("Total Doctors", doctors.length),
                    StatCard("Active Patients", patients.length)
                ),
                e("div", { style: { maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "380px 1fr", gap: "40px" } },
                    // Sidebar Form
                    e("aside", null,
                        e("div", { style: { background: theme.card, padding: "30px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" } },
                            e("h3", { style: { margin: "0 0 24px 0", fontSize: "20px", fontWeight: "700" } }, "Add Medical Staff"),
                            e("form", { onSubmit: handleAddDoctor },
                                e("label", { style: { display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "8px", color: theme.textSecondary } }, "FULL NAME"),
                                e("input", {
                                    style: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", marginBottom: "20px" },
                                    placeholder: "Dr. Jane Smith", value: newDoc.name,
                                    onChange: ev => setNewDoc({ ...newDoc, name: ev.target.value })
                                }),
                                e("label", { style: { display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "8px", color: theme.textSecondary } }, "WORK EMAIL"),
                                e("input", {
                                    style: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", marginBottom: "30px" },
                                    placeholder: "smith@hospital.com", value: newDoc.email,
                                    onChange: ev => setNewDoc({ ...newDoc, email: ev.target.value })
                                }),
                                e("button", {
                                    type: "submit", disabled: isSubmitting,
                                    style: { width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: theme.primary, color: "white", fontWeight: "700", cursor: "pointer" }
                                }, isSubmitting ? "Processing..." : "Create Account")
                            )
                        )
                    ),
                    // Doctor List
                    e("main", { style: { display: "grid", gap: "24px" } },
                        doctors.map(doc => e("div", { key: doc.id, style: { background: theme.card, borderRadius: "20px", padding: "24px", border: "1px solid #e2e8f0" } },
                            e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "20px" } },
                                e("div", null,
                                    e("h4", { style: { fontSize: "20px", margin: 0 } }, doc.name),
                                    e("span", { style: { color: theme.textSecondary, fontSize: "14px" } }, doc.email)
                                ),
                                e("button", {
                                    onClick: () => { if (confirm("Delete doctor profile?")) dbSet(dbRef(db, `users/${doc.id}`), null); },
                                    style: { background: "#fee2e2", color: theme.danger, border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }
                                }, "DELETE STAFF")
                            ),
                            e("div", { style: { background: "#f8fafc", borderRadius: "16px", padding: "20px" } },
                                e("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "16px" } },
                                    e("span", { style: { fontSize: "12px", fontWeight: "800", color: theme.textSecondary } }, "ASSIGNED PATIENTS"),
                                    e("span", { style: { fontSize: "12px", fontWeight: "800" } }, (doc.patientAssignments || []).length)
                                ),
                                e("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } },
                                    (doc.patientAssignments || []).map(assign => {
                                        const p = patients.find(pat => pat.id === assign.id);
                                        const isOnHold = assign.status === "on-hold";
                                        return e("div", { key: assign.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${isOnHold ? theme.warning : "#e2e8f0"}` } },
                                            e("div", null,
                                                e("div", { style: { fontSize: "14px", fontWeight: "700", color: isOnHold ? theme.warning : theme.textPrimary } }, p?.name || "Unknown"),
                                                e("div", { style: { fontSize: "10px", color: theme.textSecondary } }, isOnHold ? "PROGRAM PAUSED" : "ACTIVE PROGRAM")
                                            ),
                                            e("div", { style: { display: "flex", gap: "10px" } },
                                                e("button", {
                                                    onClick: () => {
                                                        const updated = doc.patientAssignments.map(a => a.id === assign.id ? { ...a, status: isOnHold ? "active" : "on-hold" } : a);
                                                        syncAssignments(doc.id, updated);
                                                    },
                                                    style: { border: "none", background: "none", cursor: "pointer" }
                                                }, isOnHold ? "▶️" : "⏸️"),
                                                e("button", {
                                                    onClick: () => {
                                                        const updated = doc.patientAssignments.filter(a => a.id !== assign.id);
                                                        syncAssignments(doc.id, updated);
                                                    },
                                                    style: { border: "none", background: "none", cursor: "pointer", color: theme.danger }
                                                }, "✕")
                                            )
                                        );
                                    })
                                ),
                                e("select", {
                                    value: "",
                                    onChange: ev => {
                                        const updated = [...(doc.patientAssignments || []), { id: ev.target.value, status: "active" }];
                                        syncAssignments(doc.id, updated);
                                    },
                                    style: { width: "100%", marginTop: "16px", padding: "10px", borderRadius: "8px", border: "2px dashed #cbd5e1", color: theme.primary, fontWeight: "600" }
                                },
                                    e("option", { value: "" }, "+ Assign New Patient"),
                                    patients.filter(p => !(doc.patientAssignments || []).find(a => a.id === p.id)).map(p => e("option", { value: p.id, key: p.id }, p.name))
                                )
                            )
                        ))
                    )
                )
            )
        ) : (
            // --- VIEW 2: SUPPORT CHAT ---
            e("div", { style: { height: "calc(100vh - 73px)" } },
                e(AdminChatPage, { currentUser, state, setState })
            )
        )
    );
}