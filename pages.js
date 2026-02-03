const { useState, useEffect, useRef } = React;
import { fbSignInUser, fbCreateUser, ref, get, set } from './firebase_config.js';
import { capitalize, loadAppState } from './utils.js';

const e = React.createElement;

/* -------------------- Design System -------------------- */
const theme = {
  colors: {
    primary: '#0284c7',
    primaryDark: '#0369a1',
    secondary: '#0f172a',
    accent: '#38bdf8',
    background: '#f8fafc',
    cardBg: '#ffffff',
    text: '#334155',
    textLight: '#64748b',
    success: '#10b981',
    border: '#e2e8f0'
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    glow: '0 0 15px rgba(2, 132, 199, 0.15)'
  },
  radius: '12px'
};

/* -------------------- Shared Styles -------------------- */
const navLinkStyle = () => ({
  color: theme.colors.text,
  fontWeight: '500',
  transition: 'color 0.2s',
  fontSize: '0.95rem',
  textDecoration: 'none',
  cursor: 'pointer'
});

const btnBase = {
  borderRadius: '8px',
  padding: '14px 28px',
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: 'none'
};

/* -------------------- Header & Footer -------------------- */
export function Header({ currentUser, signOut, push }) {
  return e('header', {
    style: {
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: `1px solid ${theme.colors.border}`,
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px 40px'
    }
  },
    e('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }, onClick: () => push('/') },
      e('div', {
        style: {
          background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})`,
          color: '#fff',
          width: '35px',
          height: '35px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          fontWeight: 'bold',
          boxShadow: theme.shadows.glow
        }
      }, 'PT'),
      e('strong', { style: { color: theme.colors.secondary, fontSize: '1.2rem' } }, 'PhysioTrack')
    ),
    e('nav', { style: { display: 'flex', gap: '25px', alignItems: 'center' } },
      e('a', { onClick: () => push('/'), style: navLinkStyle() }, 'Home'),
      e('a', { onClick: () => push('/about'), style: navLinkStyle() }, 'About'),
      !currentUser ? e('a', {
        onClick: () => push('/signin'),
        style: { ...navLinkStyle(), color: theme.colors.primary, fontWeight: '700' }
      }, 'Sign in') : e('a', { onClick: signOut, style: navLinkStyle() }, 'Sign Out'),
      e('a', { onClick: () => push('/contact'), style: navLinkStyle() }, 'Contact')
    )
  );
}

export function Footer() {
  return e('footer', {
    style: { marginTop: 'auto', padding: '30px 0', textAlign: 'center', color: theme.colors.textLight, borderTop: `1px solid ${theme.colors.border}`, background: '#fff', fontSize: '0.9rem' }
  }, '© 2025 PhysioTrack Innovations. Advancing Rehabilitation Technology.');
}

/* -------------------- Home Component -------------------- */
export function Home({ push }) {
  const chartInitializedRef = useRef(false);

  useEffect(() => {
    // Ensuring DOM and Chart.js are ready
    const timer = setTimeout(() => {
      if (!chartInitializedRef.current && window.Chart) {
        initMiniCharts();
        chartInitializedRef.current = true;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  function initMiniCharts() {
    const pc = document.getElementById('miniPatientChart');
    const dc = document.getElementById('miniDoctorChart');
    if (pc) {
      new Chart(pc.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['M', 'T', 'W', 'T', 'F'],
          datasets: [{ data: [8, 10, 12, 9, 11], backgroundColor: theme.colors.primary, borderRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
      });
    }
    if (dc) {
      new Chart(dc.getContext('2d'), {
        type: 'line',
        data: {
          labels: ['W1', 'W2', 'W3', 'W4'],
          datasets: [{ data: [52, 55, 57, 60], borderColor: theme.colors.success, borderWidth: 2, tension: 0.4, fill: true, backgroundColor: 'rgba(16, 185, 129, 0.1)', pointRadius: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
      });
    }
  }

  return e('main', { style: { background: theme.colors.background, minHeight: '100vh', fontFamily: 'Inter, sans-serif' } },
    // Hero Section
    e('section', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '80px 40px', gap: '60px', background: 'linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%)' } },
      e('div', { style: { flex: '1 1 500px', maxWidth: '650px' } },
        e('div', { style: { display: 'inline-block', padding: '6px 12px', background: '#e0f2fe', color: theme.colors.primary, borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', marginBottom: '20px' } }, '🚀 The Future of Remote Physiotherapy'),
        e('h1', { style: { fontSize: '3.5rem', lineHeight: '1.1', color: theme.colors.secondary, fontWeight: '800', marginBottom: '24px' } }, 'Rehabilitation Reimagined.'),
        e('p', { style: { fontSize: '1.25rem', lineHeight: '1.7', marginBottom: '32px', color: theme.colors.textLight } }, 'Accelerate recovery with precision. PhysioTrack bridges the gap between clinic and home using advanced IoT motion analytics.'),
        e('div', { style: { display: 'flex', gap: '16px' } },
          e('button', { onClick: () => push('/signup'), style: { ...btnBase, background: theme.colors.primary, color: '#fff', boxShadow: '0 4px 14px 0 rgba(2, 132, 199, 0.39)' } }, 'Start Recovery Journey'),
          e('button', { onClick: () => push('/about'), style: { ...btnBase, background: '#fff', color: theme.colors.text, border: `1px solid ${theme.colors.border}` } }, 'Explore Technology')
        )
      ),
      e('aside', { style: { flex: '1 1 400px', maxWidth: '100%' } },
        e('div', { style: { background: '#fff', borderRadius: '24px', padding: '30px', boxShadow: theme.shadows.lg, border: `1px solid ${theme.colors.border}` } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' } },
            e('div', { style: { fontSize: '32px', background: '#f0f9ff', padding: '10px', borderRadius: '12px' } }, '📡'),
            e('div', null,
              e('h3', { style: { margin: 0, color: theme.colors.secondary } }, 'Live Bio-Feedback'),
              e('span', { style: { fontSize: '0.9rem', color: theme.colors.success, fontWeight: '600' } }, '● Active Connection')
            )
          ),
          e('p', { style: { color: theme.colors.textLight, lineHeight: '1.5' } }, 'Precision tracking powered by ESP32 sensors provides instant feedback on ROM.'),
          e('div', { style: { marginTop: '25px', display: 'flex', gap: '15px' } },
            miniChartCard('Patient Progress', 'miniPatientChart', theme.colors.primary),
            miniChartCard('Doctor Analytics', 'miniDoctorChart', theme.colors.success)
          )
        )
      )
    )
  );

  function miniChartCard(title, id, color) {
    return e('div', { style: { flex: 1, background: '#f8fafc', borderRadius: '12px', padding: '10px', textAlign: 'center' } },
      e('span', { style: { fontSize: '0.75rem', fontWeight: '700', color: color } }, title),
      e('div', { style: { height: '60px' } }, e('canvas', { id: id }))
    );
  }
}

/* -------------------- Auth Components (Shared Styles) -------------------- */
const authLayout = (children, title) => e('section', {
  style: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '80vh',
    background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
    padding: '20px'
  }
},
  e('div', {
    style: {
      background: '#fff',
      padding: '40px',
      borderRadius: '16px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      width: '100%',
      maxWidth: '400px',
      border: `1px solid ${theme.colors.border}`
    }
  },
    e('div', { style: { textAlign: 'center', marginBottom: '30px' } },
      e('div', { style: { fontSize: '2rem', fontWeight: '800', color: theme.colors.primary, marginBottom: '10px' } }, 'PT'),
      e('h2', { style: { color: theme.colors.secondary, fontSize: '1.5rem' } }, title)
    ),
    children
  )
);

const authInputStyle = () => ({
  width: '100%',
  padding: '12px 15px',
  marginBottom: '15px',
  borderRadius: '8px',
  border: `1px solid ${theme.colors.border}`,
  fontSize: '1rem',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box'
});

const authBtnStyle = (loading) => ({
  width: '100%',
  padding: '12px',
  background: loading ? theme.colors.textLight : theme.colors.primary,
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: '600',
  cursor: loading ? 'not-allowed' : 'pointer',
  marginTop: '10px'
});

/* -------------------- Sign In Component -------------------- */
export function SignInPage({ signIn, push }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(ev) {
    // - Preserving auth logic
    ev.preventDefault();
    setLoading(true);
    try {
      const auth = window.firebaseAuth;
      const db = window.firebaseDB;
      const userCredential = await fbSignInUser(auth, email, password);
      const authUser = userCredential.user;
      const dbRef = ref(db, "users");
      const snapshot = await get(dbRef);
      let signedInUser = null;
      let allUsers = [];

      if (snapshot.exists()) {
        const allUsersData = snapshot.val();
        allUsers = Object.entries(allUsersData).map(([id, data]) => ({ id, ...data }));
        signedInUser = allUsers.find(u => u.id === authUser.uid);
      }

      if (!signedInUser) {
        const storedState = loadAppState();
        signedInUser = storedState.users.find(u => u.email === authUser.email);
        allUsers = storedState.users;
        if (!signedInUser) throw new Error("User data not found.");
      }
      await signIn(signedInUser, allUsers);
    } catch (error) {
      console.error(error);
      alert('Sign in failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  }

  return authLayout(
    e('form', { onSubmit: handleSubmit },
      e('div', { style: { marginBottom: '5px', fontWeight: '500', color: theme.colors.text } }, 'Email'),
      e('input', { type: 'email', value: email, onInput: e => setEmail(e.target.value), required: true, style: authInputStyle(), placeholder: 'doctor@clinic.com' }),

      e('div', { style: { marginBottom: '5px', fontWeight: '500', color: theme.colors.text } }, 'Password'),
      e('input', { type: 'password', value: password, onInput: e => setPassword(e.target.value), required: true, style: authInputStyle(), placeholder: '••••••••' }),

      e('button', { type: 'submit', disabled: loading, style: authBtnStyle(loading) }, loading ? 'Authenticating...' : 'Sign In'),

      e('div', { style: { marginTop: '20px', textAlign: 'center', fontSize: '0.9rem' } },
        e('span', { style: { color: theme.colors.textLight } }, "Don't have an account? "),
        e('a', {
          href: '#/signup',
          onClick: (ev) => { ev.preventDefault(); push('/signup'); },
          style: { color: theme.colors.primary, fontWeight: '600', textDecoration: 'none', cursor: 'pointer' }
        }, 'Register now')
      )
    ),
    'Welcome Back'
  );
}

/* -------------------- Sign Up Component -------------------- */
export function SignUpPage({ push, signIn }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(ev) {
    // - Preserving auth logic
    ev.preventDefault();
    setLoading(true);
    try {
      const auth = window.firebaseAuth;
      const db = window.firebaseDB;
      const userCredential = await fbCreateUser(auth, email, password);
      const authUser = userCredential.user;
      const newUserData = { email, name, role: 'patient', assignedDoctorId: null };
      await set(ref(db, `users/${authUser.uid}`), newUserData);

      const dbRef = ref(db, "users");
      const snapshot = await get(dbRef);
      let allUsers = [];
      let createdUser = null;
      if (snapshot.exists()) {
        const allUsersData = snapshot.val();
        allUsers = Object.entries(allUsersData).map(([id, data]) => ({ id, ...data }));
        createdUser = allUsers.find(u => u.id === authUser.uid);
      }
      if (createdUser) await signIn(createdUser, allUsers);
      else push('/signin');

    } catch (error) {
      console.error(error);
      alert('Registration failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return authLayout(
    e('form', { onSubmit: handleSubmit },
      e('div', { style: { marginBottom: '5px', fontWeight: '500', color: theme.colors.text } }, 'Full Name'),
      e('input', { type: 'text', value: name, onInput: e => setName(e.target.value), required: true, style: authInputStyle(), placeholder: 'John Doe' }),

      e('div', { style: { marginBottom: '5px', fontWeight: '500', color: theme.colors.text } }, 'Email Address'),
      e('input', { type: 'email', value: email, onInput: e => setEmail(e.target.value), required: true, style: authInputStyle(), placeholder: 'patient@email.com' }),

      e('div', { style: { marginBottom: '5px', fontWeight: '500', color: theme.colors.text } }, 'Password'),
      e('input', { type: 'password', value: password, onInput: e => setPassword(e.target.value), required: true, minLength: 6, style: authInputStyle(), placeholder: 'Min 6 chars' }),

      e('button', { type: 'submit', disabled: loading, style: authBtnStyle(loading) }, loading ? 'Creating Profile...' : 'Create Account'),

      e('div', { style: { marginTop: '20px', textAlign: 'center', fontSize: '0.9rem' } },
        e('span', { style: { color: theme.colors.textLight } }, "Already registered? "),
        e('a', {
          href: '#/signin',
          onClick: (ev) => { ev.preventDefault(); push('/signin'); },
          style: { color: theme.colors.primary, fontWeight: '600', textDecoration: 'none', cursor: 'pointer' }
        }, 'Log in here')
      )
    ),
    'Patient Registration'
  );
}

// Helper Components
function miniChartCard(title, canvasId, color) {
  return e('div', {
    style: {
      flex: 1,
      minWidth: 0, // <--- CRITICAL FIX: prevents flex item from overflowing container
      background: '#f8fafc',
      borderRadius: '12px',
      padding: '10px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }
  },
    e('span', { style: { fontSize: '0.8rem', fontWeight: '600', color: color, marginBottom: '5px' } }, title),
    e('div', { style: { height: '60px', width: '100%' } },
      e('canvas', { id: canvasId })
    )
  );
}

function benefitCard(icon, title, desc) {
  return e('div', {
    style: {
      flex: '1 1 300px',
      padding: '30px',
      textAlign: 'left',
      background: '#f8fafc', // theme.colors.background
      borderRadius: '16px',
      border: '1px solid #e2e8f0', // theme.colors.border
      transition: 'transform 0.2s'
    }
  },
    e('div', { style: { fontSize: '32px', marginBottom: '15px', background: '#fff', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' } }, icon),
    e('h4', { style: { fontSize: '1.2rem', marginBottom: '10px', color: '#0f172a' } }, title), // theme.colors.secondary
    e('p', { style: { color: '#64748b', lineHeight: '1.6' } }, desc) // theme.colors.textLight
  );
}


/* -------------------- About Component -------------------- */
export function About() {
  return e('section', {
    className: 'about-section',
    style: {
      padding: '60px 20px',
      maxWidth: '1000px',
      margin: '0 auto',
      fontFamily: 'Inter, sans-serif',
      color: theme.colors.text
    }
  },
    // Intro
    e('div', { style: { textAlign: 'center', marginBottom: '60px' } },
      e('h2', { style: { fontSize: '2.5rem', color: theme.colors.secondary, marginBottom: '20px', fontWeight: '800' } }, 'Our Mission'),
      e('p', { style: { fontSize: '1.2rem', lineHeight: '1.8', color: theme.colors.textLight, maxWidth: '800px', margin: '0 auto' } },
        'PhysioTrack is dedicated to democratizing access to high-quality physiotherapy. By merging IoT innovation with clinical practice, we empower patients to recover faster and help doctors make data-backed decisions.')
    ),

    // How it Works Grid
    e('h3', { style: { color: theme.colors.primary, marginBottom: '30px', textAlign: 'center', fontSize: '1.5rem' } }, 'The Ecosystem'),
    e('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px'
      }
    },
      featureCard('🦾', 'Smart Hardware', 'ESP32 microcontroller paired with MPU6050 accelerometers capture precise 3-axis motion data in real-time.'),
      featureCard('☁️', 'Cloud Sync', 'Seamless, secure data transmission via Wi-Fi to Firebase Realtime Database ensures zero data loss.'),
      featureCard('🩺', 'Doctor Portal', 'Clinicians access a comprehensive dashboard to review session logs, maximum angles, and consistency.'),
      featureCard('📱', 'Patient Feedback', 'Immediate visual cues and gamified progress tracking keep motivation levels high during recovery.')
    ),

    // Team Section
    e('div', { style: { marginTop: '80px', background: '#f1f5f9', borderRadius: '20px', padding: '40px', textAlign: 'center' } },
      e('h3', { style: { color: theme.colors.secondary, marginBottom: '15px' } }, 'Engineering & Research'),
      e('p', { style: { color: theme.colors.textLight, maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' } },
        'Developed by a multidisciplinary team of engineers and healthcare professionals under the mentorship of Dr. R. Mehta. We are committed to solving real-world healthcare challenges through technology.')
    )
  );

  function featureCard(icon, title, text) {
    return e('div', {
      style: {
        background: theme.colors.cardBg,
        padding: '25px',
        borderRadius: theme.radius,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadows.sm
      }
    },
      e('div', { style: { fontSize: '30px', marginBottom: '15px' } }, icon),
      e('h4', { style: { marginBottom: '10px', color: theme.colors.secondary } }, title),
      e('p', { style: { fontSize: '0.95rem', lineHeight: '1.6', color: theme.colors.textLight, margin: 0 } }, text)
    );
  }
}

/* -------------------- Contact Component -------------------- */
export function Contact() {
  function onSubmit(ev) {
    ev.preventDefault();
    alert('Thank you. This is a demo prototype.');
  }

  return e('section', {
    style: {
      padding: '60px 20px',
      maxWidth: '1100px',
      margin: '0 auto',
      fontFamily: 'Inter, sans-serif'
    }
  },
    e('div', { style: { textAlign: 'center', marginBottom: '50px' } },
      e('h2', { style: { fontSize: '2.2rem', color: theme.colors.secondary, marginBottom: '10px', fontWeight: '800' } }, 'Get in Touch'),
      e('p', { style: { color: theme.colors.textLight, fontSize: '1.1rem' } }, 'Questions about deployment or features? Our team is ready to assist.')
    ),

    e('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '30px',
        alignItems: 'start'
      }
    },
      // Form 1: Support
      contactForm('Technical Support', 'For hardware setup or software issues.', 'Describe the issue...'),

      // Form 2: Sales/General
      contactForm('Partnership Inquiries', 'For clinics and hospital integration.', 'Tell us about your organization...')
    ),

    // Contact Info Footer
    e('div', {
      style: {
        marginTop: '60px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '40px',
        paddingTop: '40px',
        borderTop: `1px solid ${theme.colors.border}`
      }
    },
      contactDetail('🏢', 'Headquarters', 'PhysioTrack Labs, Chennai, India'),
      contactDetail('✉️', 'Email Support', 'support@physiotrack.io'),
      contactDetail('📞', 'Direct Line', '+91 44 1234 5678')
    )
  );

  function contactForm(title, subtitle, placeholder) {
    return e('form', {
      onSubmit: onSubmit,
      style: {
        background: theme.colors.cardBg,
        padding: '30px',
        borderRadius: theme.radius,
        boxShadow: theme.shadows.md,
        border: `1px solid ${theme.colors.border}`
      }
    },
      e('h3', { style: { marginBottom: '5px', color: theme.colors.secondary } }, title),
      e('p', { style: { fontSize: '0.9rem', color: theme.colors.textLight, marginBottom: '20px' } }, subtitle),
      e('input', { required: true, placeholder: 'Your Email', style: inputStyle() }),
      e('textarea', { required: true, rows: 4, placeholder: placeholder, style: inputStyle() }),
      e('button', {
        type: 'submit',
        style: {
          width: '100%',
          padding: '12px',
          background: theme.colors.secondary,
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          cursor: 'pointer'
        }
      }, 'Send Message')
    );
  }

  function contactDetail(icon, label, value) {
    return e('div', { style: { display: 'flex', alignItems: 'center', gap: '15px' } },
      e('span', { style: { fontSize: '24px' } }, icon),
      e('div', null,
        e('div', { style: { fontSize: '0.85rem', fontWeight: '700', color: theme.colors.textLight, textTransform: 'uppercase' } }, label),
        e('div', { style: { color: theme.colors.secondary, fontWeight: '500' } }, value)
      )
    );
  }

  function inputStyle() {
    return {
      width: '100%',
      padding: '12px',
      marginBottom: '15px',
      borderRadius: '8px',
      border: `1px solid ${theme.colors.border}`,
      background: '#f8fafc',
      outline: 'none',
      fontSize: '0.95rem',
      boxSizing: 'border-box'
    };
  }
}

