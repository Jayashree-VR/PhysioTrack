const { useState, useEffect } = React;
import { useHashRoute, loadAppState, saveAppState, SAMPLE_EXERCISES } from './utils.js';
import { signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { Header, Footer, Home, About, Contact, SignInPage, SignUpPage } from './pages.js';
import { DoctorDashboard } from './dashboard_doctor.js';
import { PatientDashboard } from './dashboard_patient.js';

const e = React.createElement;

/* -------------------- Main App Component -------------------- */
function App() {
  const { route, push } = useHashRoute();
  const [state, setState] = useState(loadAppState());
  const currentUser = state.users.find(u => u.id === state.currentUserId) || null;

  // Redirect unauthenticated user from /dashboard
  useEffect(() => {
    if (!currentUser && route === '/dashboard') {
      push('/signin');
    }
  }, [currentUser, route]);

  // Persist state to localStorage on every change
  useEffect(() => saveAppState(state), [state]);

  // --- Sign-In Logic ---
  async function signIn(user, allUsers) {
    setState({
      users: allUsers,
      exercises: SAMPLE_EXERCISES,
      progress: state.progress, // Keep existing progress or fetch from DB
      currentUserId: user.id,
    });
    console.log("✅ Logged in user:", user);
    push('/dashboard');
  }

  // --- Sign-Out Logic ---
  function signOut() {
    if (window.firebaseAuth) {
      firebaseSignOut(window.firebaseAuth).catch(console.error);
    }

    // Clear user ID in local storage state
    try {
      const storedState = JSON.parse(localStorage.getItem("physiotrack_full"));
      if (storedState) {
        storedState.currentUserId = null;
        localStorage.setItem("physiotrack_full", JSON.stringify(storedState));
      }
    } catch (e) {
      console.error("Error clearing local storage on sign out:", e);
    }

    setState(s => ({
      ...s,
      currentUserId: null
    }));
    push('/signin');
  }

  // --- Session/Progress Logic ---
  function addSessionForPatient(pid, session) {
    setState(s => {
      const p = { ...s };
      if (!p.progress[pid]) p.progress[pid] = [];
      p.progress[pid].push(session);
      return p;
    });
  }

  // --- Render Logic ---
  return e('div', { className: 'container' },
    e(Header, { currentUser, signOut, push }),
    route === '/' && e(Home, { push }),
    route === '/about' && e(About),
    route === '/contact' && e(Contact),
    route === '/signin' && e(SignInPage, { signIn, push }),
    route === '/signup' && e(SignUpPage, { push, signIn }),
    route === '/dashboard' && currentUser && e(currentUser.role === 'doctor' ? DoctorDashboard : PatientDashboard, {
      state,
      currentUser,
      addSessionForPatient,
      signOut
    }),
    route === '/dashboard' && !currentUser && e(SignInPage, { signIn, push }),
    e(Footer)
  );
}

// -------------------- App Initialization (React 18) --------------------
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(e(App));    