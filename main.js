const { useState, useEffect } = React;
import { useHashRoute, loadAppState, saveAppState, SAMPLE_EXERCISES } from './utils.js';
import { signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { db } from "./firebase_config.js";


import { Header, Footer, Home, About, ContactUs, EditProfile, SignInPage, SignUpPage, MessagesPage } from './pages.js';
import { DoctorDashboard } from './dashboard_doctor.js';
import { PatientDashboard } from './dashboard_patient.js';
import { AdminDashboard } from './admin.js';

const e = React.createElement;

function App() {
  const { route, push } = useHashRoute();
  const [state, setState] = useState(() => loadAppState());
  const currentUser = state.users.find(u => u.id === state.currentUserId) || null;

  // Protect Dashboard Route
  useEffect(() => {
    if (!currentUser && route === '/dashboard') {
      push('/signin');
    }
  }, [currentUser, route]);

  // Sync state changes to localStorage
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  // --- NEW: Firebase Real-time Listener ---
  // This ensures messages and users are always up to date
  useEffect(() => {
    const messagesRef = ref(db, 'messages');

    // Listen for messages
    const unsubscribeMessages = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const messageList = data
        ? Object.entries(data).map(([id, val]) => ({ id, ...val }))
        : [];

      setState(prev => ({
        ...prev,
        messages: messageList
      }));
    });

    // Cleanup listeners when app closes
    return () => unsubscribeMessages();
  }, []);

  // --- Sign-In Logic ---
  async function signIn(user, allUsers) {
    if (!user || !user.id) return;
    const newState = { ...state, users: allUsers, currentUserId: user.id };
    setState(newState);
  }

  // --- Sign-Out Logic ---
  function signOut() {
    if (window.firebaseAuth) {
      firebaseSignOut(window.firebaseAuth).catch(console.error);
    }
    const loggedOutState = { ...state, currentUserId: null };
    setState(loggedOutState);
    push('/signin');
  }

  // --- Session Logic ---
  function addSessionForPatient(pid, session) {
    setState(s => ({
      ...s,
      progress: {
        ...s.progress,
        [pid]: [...(s.progress[pid] || []), session]
      }
    }));
  }

  // Inside your main app's initialization
  const progressRef = ref(db, 'progress');
  onValue(progressRef, (snapshot) => {
    const data = snapshot.val();
    // Update your global 'state' here so Dr. Ram receives the 'progress' object
    updateState({ progress: data });
  });

  return e('div', {
    style: { display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#fcfcfd' }
  },
    e(Header, { currentUser, signOut, push }),
    e('main', { style: { flex: 1 } },
      route === '/' && e(Home, { push }),
      route === '/about' && e(About),
      route === '/contact' && e(ContactUs),
      route === '/signin' && e(SignInPage, { signIn, push }),
      route === '/signup' && e(SignUpPage, { push, signIn }),
      route === '/profile' && e(EditProfile, { currentUser, push }),
      // route === '/notifications' && e(Notifications, { push }),
      route === '/messages' && e(MessagesPage, { currentUser }),
      route === '/dashboard' && currentUser && (
        currentUser.role === 'admin'
          ? e(AdminDashboard, { state, currentUser, signOut, setState })
          : currentUser.role === 'doctor'
            ? e(DoctorDashboard, { state, currentUser, signOut })
            : e(PatientDashboard, { state, currentUser, addSessionForPatient, signOut })
      )),
    e(Footer)
  );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(e(App));
