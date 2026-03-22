const { useState, useEffect } = React;
import { useHashRoute, loadAppState, saveAppState } from './utils.js';
import {
  auth,
  db,
  fetchUsersFromDB
} from './firebase_config.js'; // Ensure this matches your filename exactly
import {
  onAuthStateChanged,
  signOut as firebaseSignOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import { Header, Footer, Home, About, ContactUs, SignInPage, SignUpPage, MessagesPage } from './pages.js';
import { DoctorDashboard } from './dashboard_doctor.js';
import { PatientDashboard } from './dashboard_patient.js';
import { AdminDashboard } from './admin.js';

const e = React.createElement;

function App() {
  const { route, push } = useHashRoute();
  const [state, setState] = useState(() => loadAppState());

  // Derived state
  const currentUser = state.users.find(u => u.id === state.currentUserId) || null;

  // 1. AUTH OBSERVER: Sync Firebase Auth with React State
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is logged in, ensure we have the latest user list from DB
        fetchUsersFromDB();

        // If the local state doesn't know who the user is yet, update it
        if (!state.currentUserId) {
          setState(prev => ({ ...prev, currentUserId: firebaseUser.uid }));
        }
      } else {
        // User is logged out
        setState(prev => ({ ...prev, currentUserId: null }));
        if (route === '/dashboard') push('/signin');
      }
    });

    return () => unsubscribeAuth();
  }, [route]);

  useEffect(() => {
    if (!currentUser) return;

    const messagesRef = ref(db, 'messages');
    const progressRef = ref(db, 'progress');

    // Sync Messages
    const unsubMessages = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const messageList = data
        ? Object.entries(data).map(([id, val]) => ({ id, ...val }))
        : [];

      setState(prev => ({ ...prev, messages: messageList }));
    });

    const unsubProgress = onValue(progressRef, (snapshot) => {
      const data = snapshot.val() || {};
      setState(prev => ({ ...prev, progress: data }));
    });

    return () => {
      unsubMessages();
      unsubProgress();
    };
  }, [currentUser?.id]);

  useEffect(() => {
    saveAppState(state);
  }, [state]);

  // --- Actions ---
  async function signIn(user, allUsers) {
    if (!user || !user.id) return;
    setState(prev => ({ ...prev, users: allUsers, currentUserId: user.id }));
  }

  function signOut() {
    firebaseSignOut(auth)
      .then(() => {
        setState(prev => ({ ...prev, currentUserId: null }));
        push('/signin');
      })
      .catch(console.error);
  }

  function addSessionForPatient(pid, session) {
    setState(s => ({
      ...s,
      progress: {
        ...s.progress,
        [pid]: [...(s.progress[pid] || []), session]
      }
    }));
  }

  // --- Rendering ---
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
      route === '/messages' && e(MessagesPage, { currentUser }),
      route === '/dashboard' && currentUser && (
        currentUser.role === 'admin'
          ? e(AdminDashboard, { state, currentUser, signOut, setState })
          : currentUser.role === 'doctor'
            ? e(DoctorDashboard, { state, currentUser, signOut })
            : e(PatientDashboard, { state, currentUser, addSessionForPatient, signOut })
      )
    ),
    e(Footer)
  );
}

// Render the App
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(e(App));
