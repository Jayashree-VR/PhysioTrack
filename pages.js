const { useState, useEffect, useRef } = React;
// At the top of pages.js
import { fbCreateUser, fbSignInUser, ref, get, db, auth, onValue, update } from './firebase_config.js';
import { getDatabase, set, query, orderByChild } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { capitalize, loadAppState } from './utils.js';



const e = React.createElement;

/* -------------------- Enhanced Teal & White Design System -------------------- */
const theme = {
  colors: {
    primary: '#2dd4bf',      // Vibrant Teal
    primaryDark: '#0d9488',  // Deep Forest Teal
    secondary: '#0f172a',    // Navy Slate (for readability)
    accent: '#99f6e4',       // Soft Mint
    background: '#ffffff',   // Pure White
    cardBg: '#f9fafb',       // Ultra-light Grey/White
    text: '#1e293b',
    textLight: '#64748b',
    success: '#10b981',
    border: '#e2e8f0',
    inputBg: '#fcfcfd',
    gradient: 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)'
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 12px rgba(45, 212, 191, 0.08)',
    lg: '0 20px 25px -5px rgba(0, 0, 0, 0.03), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
    glow: '0 0 15px rgba(45, 212, 191, 0.3)'
  },
  radius: '16px'
};

/* -------------------- Enhanced Shared Styles -------------------- */
const navLinkStyle = (isActive = false) => ({
  color: isActive ? '#0d9488' : '#64748b', // Teal for active, slate for inactive
  fontWeight: '500',
  transition: 'all 0.2s ease',
  fontSize: '1rem',
  textDecoration: 'none',
  cursor: 'pointer',
  padding: '12px 0', // Vertical padding for hit area
  margin: '0 15px',
  borderBottom: isActive ? `2px solid #2dd4bf` : '2px solid transparent', // The underline indicator
  display: 'inline-block'
});

const btnBase = {
  borderRadius: '12px',
  padding: '12px 28px',
  fontSize: '0.95rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: theme.shadows.sm
};

const tealBtn = {
  ...btnBase,
  background: theme.colors.gradient,
  color: '#fff',
  boxShadow: theme.shadows.glow
};

const outlineBtn = {
  ...btnBase,
  background: '#fff',
  color: theme.colors.primaryDark,
  border: `1.5px solid ${theme.colors.primary}`,
  boxShadow: 'none'
};

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  marginBottom: '20px',
  borderRadius: '12px',
  border: '1px solid #e2e8f0', // Clean border
  background: '#fcfcfd',       // Slight off-white
  fontSize: '1rem',
  outline: 'none',
  boxSizing: 'border-box',
  display: 'block'
};

// Style Definitions
const primaryBtn = {
  background: '#0d9488',
  color: '#fff',
  padding: '10px 20px',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: '600',
  transition: 'background 0.2s'
};

const cardStyle = {
  background: '#fff',
  padding: '24px',
  borderRadius: '16px',
  marginBottom: '20px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  border: '1px solid #e2e8f0'
};

/* -------------------- Header & Footer -------------------- */

export function Header({ currentUser, signOut, push }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [adminMessages, setAdminMessages] = useState([]);

  const currentPath = window.location.hash.replace('#', '') || '/';
  const unreadAdminCount = adminMessages.filter(m => {
    return (
      m &&
      m.status === 'unread' &&
      m.senderRole === 'admin' &&
      m.receiverId === currentUser?.id
    );
  }).length;

  const navLinkStyle = (isActive) => ({
    padding: '0 15px',
    color: isActive ? '#0d9488' : '#64748b',
    fontWeight: isActive ? '700' : '500',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    position: 'relative'
  });

  const dropdownItemStyle = {
    display: 'block', width: '100%', padding: '10px 16px',
    textAlign: 'left', background: 'none', border: 'none',
    cursor: 'pointer', fontSize: '0.9rem'
  };

  React.useEffect(() => {
    if (currentUser?.id && currentUser?.role === 'patient') {
      const msgRef = ref(db, 'messages');
      // Using onValue to ensure real-time sync
      return onValue(msgRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list = Object.values(data).filter(m =>
            m && (m.receiverId === currentUser.id || m.senderId === currentUser.id)
          );
          setAdminMessages(list);
        } else {
          setAdminMessages([]); // Force clear if no messages exist
        }
      });
    }
  }, [currentUser]);





  return e('header', {
    style: {
      background: '#fff', borderBottom: '1px solid #f1f5f9', position: 'sticky',
      top: 0, zIndex: 1000, display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', padding: '0 80px', height: '80px'
    }
  },
    // Logo Section
    e('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }, onClick: () => push('/') },
      e('div', { style: { background: '#0d9488', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' } },
        e('span', { style: { color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' } }, 'V')),
      e('span', { style: { color: '#0d9488', fontSize: '1.5rem', fontWeight: '700' } }, 'PhysioTrack')),

    // Nav Section
    e('div', { style: { display: 'flex', alignItems: 'center', gap: '20px' } },
      e('nav', { style: { display: 'flex', alignItems: 'center' } },
        e('a', { onClick: () => push('/'), style: navLinkStyle(currentPath === '/') }, 'Home'),

        currentUser && e('a', {
          onClick: () => push('/dashboard'),
          style: navLinkStyle(currentPath.includes('/dashboard'))
        }, 'My Dashboard'),

        currentUser && currentUser.role === 'patient' && e('a', {
          onClick: () => push('/messages'),
          style: navLinkStyle(currentPath.includes('/messages'))
        },
          'Messages',
          // CRITICAL FIX: Only render the span if count is strictly greater than 0
          unreadAdminCount > 0 ? e('span', {
            style: {
              background: '#3b82f6', color: '#fff', borderRadius: '10px',
              padding: '2px 8px', fontSize: '10px', fontWeight: 'bold',
              minWidth: '18px', textAlign: 'center', border: '2px solid #fff',
              marginLeft: '4px'
            }
          }, unreadAdminCount) : null
        )
      ),

      // User Profile Dropdown
      // User Profile Dropdown
      currentUser ?
        e('div', { style: { display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '1px solid #f1f5f9', paddingLeft: '20px' } },
          e('div', { style: { position: 'relative' } },
            e('div', {
              onClick: () => setIsMenuOpen(!isMenuOpen),
              style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px', background: isMenuOpen ? '#f8fafc' : 'transparent' }
            },
              e('div', { style: { width: '32px', height: '32px', background: '#0d9488', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' } }, '👤'),
              e('span', { style: { fontWeight: '600', fontSize: '0.9rem' } }, currentUser.name || 'User')
            ),

            isMenuOpen && e('div', {
              style: { position: 'absolute', top: '50px', right: 0, width: '150px', background: '#fff', borderRadius: '8px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9', zIndex: 1001, padding: '4px 0' }
            },
              // Log Out is now the sole option
              e('button', {
                style: { ...dropdownItemStyle, color: '#ef4444', fontWeight: '600' },
                onClick: signOut
              }, '↳ Log Out')
            )
          )
        ) :
        e('button', {
          onClick: () => push('/signin'),
          style: { background: '#0d9488', color: '#fff', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }
        }, 'Sign In')
    ),

    // Overlay for closing menu
    isMenuOpen && e('div', {
      style: { position: 'fixed', inset: 0, zIndex: 999 },
      onClick: () => setIsMenuOpen(false)
    })
  );
}

export function Footer() {
  return e('footer', {
    style: {
      padding: '6px 0',
      textAlign: 'center',
      background: '#fff'
    }
  },
    e('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' } },
      e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.8 } }
      ),
      e('p', {
        style: {
          margin: 0,
          color: '#64748b',
          fontSize: '0.85rem',
          letterSpacing: '0.3px'
        }
      }, '© 2026 PhysioTrack Innovations. Empowering Recovery Through IoT.')
    )
  );
}


export function MessagesPage({ currentUser }) {
  const [chatMessages, setChatMessages] = React.useState([]);
  const [newMessage, setNewMessage] = React.useState("");

  // Load messages
  React.useEffect(() => {
    if (!currentUser?.id) return;

    const messagesRef = query(ref(db, 'messages'), orderByChild('timestamp'));

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setChatMessages([]);
        return;
      }

      const list = Object.values(data).filter(m =>
        m && (m.senderId === currentUser.id || m.receiverId === currentUser.id)
      );

      setChatMessages(
        list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      );
    });

    return () => unsubscribe();
  }, [currentUser]);

  // ✅ Mark admin → patient messages as read immediately after load
  React.useEffect(() => {
    if (!chatMessages.length) return;

    const updates = {};

    chatMessages.forEach(m => {
      if (
        m &&
        m.senderRole === 'admin' &&
        m.status === 'unread' &&
        String(m.receiverId) === String(currentUser.id)
      ) {
        updates[`${m.id}/status`] = 'read';
      }
    });

    if (Object.keys(updates).length > 0) {
      update(ref(db, 'messages'), updates);
    }
  }, [chatMessages, currentUser]);


  // Send message
  const handleSendChat = async () => {
    if (!newMessage.trim()) return;

    try {
      const msgId = Date.now().toString();

      await set(ref(db, `messages/${msgId}`), {
        id: msgId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role, // patient
        receiverId: 'admin', // keep consistent with admin UID if available
        text: newMessage,
        timestamp: new Date().toISOString(),
        status: 'unread'
      });

      setNewMessage("");
    } catch (err) {
      console.error("Send failed:", err);
    }
  };

  return React.createElement('div', { style: { padding: '40px', maxWidth: '800px', margin: '0 auto' } },
    React.createElement('h2', null, 'Support Chat'),

    React.createElement('div', {
      style: {
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #f1f5f9',
        height: '500px',
        display: 'flex',
        flexDirection: 'column'
      }
    },

      React.createElement('div', {
        style: {
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }
      },

        chatMessages.map(m =>
          React.createElement('div', {
            key: m.id,
            style: {
              alignSelf: m.senderId === currentUser.id ? 'flex-end' : 'flex-start',
              background: m.senderId === currentUser.id ? '#0d9488' : '#f1f5f9',
              color: m.senderId === currentUser.id ? '#fff' : '#1e293b',
              padding: '10px 15px',
              borderRadius: '12px',
              maxWidth: '70%'
            }
          }, m.text)
        )
      ),

      React.createElement('div', { style: { padding: '20px', display: 'flex', gap: '10px' } },

        React.createElement('input', {
          value: newMessage,
          onChange: (e) => setNewMessage(e.target.value),
          placeholder: 'Type a message...',
          style: { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }
        }),

        React.createElement('button', {
          onClick: handleSendChat,
          style: {
            background: '#0d9488',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px'
          }
        }, 'Send')
      )
    )
  );
}


export function ContactUs() {
  const cardStyle = { background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px', border: `1px solid ${theme.colors.border}` };

  return e('div', { style: { padding: '60px 80px', maxWidth: '1200px', margin: '0 auto' } },
    e('h1', { style: { textAlign: 'center', marginBottom: '40px' } }, 'Contact ', e('span', { style: { color: theme.colors.primaryDark } }, 'Us')),

    e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px' } },
      // Left Info Column
      e('div', null,
        e('div', { style: cardStyle }, e('span', { style: { fontSize: '1.5rem' } }, '✉️'), e('div', null, e('b', null, 'Email'), e('p', { style: { margin: 0 } }, 'support@physiotrack.com'))),
        e('div', { style: cardStyle }, e('span', { style: { fontSize: '1.5rem' } }, '📞'), e('div', null, e('b', null, 'Phone'), e('p', { style: { margin: 0 } }, '+1 (555) 123-4567'))),
        e('div', { style: cardStyle }, e('span', { style: { fontSize: '1.5rem' } }, '📍'), e('div', null, e('b', null, 'Address'), e('p', { style: { margin: 0 } }, '123 Health St, Medical City')))
      ),
      // Right Form Column
      e('div', { style: { background: '#fff', padding: '40px', borderRadius: theme.radius, boxShadow: theme.shadows.lg } },
        e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' } },
          e('input', { style: inputStyle, placeholder: 'Your Name' }),
          e('input', { style: inputStyle, placeholder: 'Email Address' })
        ),
        e('input', { style: inputStyle, placeholder: 'Subject' }),
        e('textarea', { style: { ...inputStyle, height: '150px', resize: 'none' }, placeholder: 'Tell us how we can help you...' }),
        e('button', { style: { ...tealBtn, width: '100%' } }, 'Send Message 🚀')
      )
    )
  );
}

/* -------------------- Home Component -------------------- */
export function Home({ push }) {
  const chartInitializedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!chartInitializedRef.current && window.Chart) {
        initMiniCharts();
        chartInitializedRef.current = true;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  function initMiniCharts() {
    const ctx = document.getElementById('heroChart')?.getContext('2d');
    if (ctx) {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['W1', 'W2', 'W3', 'W4', 'W5'],
          datasets: [{
            data: [45, 52, 48, 70, 85],
            borderColor: theme.colors.primary,
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: theme.colors.primary
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
      });
    }
  }

  return e('main', { style: { background: theme.colors.background, minHeight: '100vh' } },
    e('section', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', padding: '100px 40px', gap: '80px' } },
      e('div', { style: { flex: '1 1 500px', maxWidth: '600px' } },
        e('span', { style: { display: 'inline-block', padding: '8px 16px', background: '#f0f9ff', color: theme.colors.primary, borderRadius: '30px', fontSize: '0.8rem', fontWeight: '700', marginBottom: '24px' } }, '✨ REHABILITATION 2.0'),
        e('h1', { style: { fontSize: '4rem', lineHeight: '1.1', color: theme.colors.secondary, fontWeight: '800', marginBottom: '24px' } }, 'Data-Driven \nRecovery.'),
        e('p', { style: { fontSize: '1.25rem', color: theme.colors.textLight, lineHeight: '1.6', marginBottom: '40px' } }, 'Bridge the gap between the clinic and home with real-time bio-feedback and professional motion analytics.'),
        e('div', { style: { display: 'flex', gap: '16px' } },
          e('button', { onClick: () => push('/signup'), style: { ...btnBase, background: theme.colors.primary, color: '#fff', boxShadow: theme.shadows.glow } }, 'Start Journey'),
          e('button', { onClick: () => push('/about'), style: { ...btnBase, background: 'transparent', color: theme.colors.text, border: `1px solid ${theme.colors.border}` } }, 'Learn More')
        )
      ),
      e('div', { style: { flex: '1 1 400px', maxWidth: '480px' } },
        e('div', { style: { background: '#fff', borderRadius: '32px', padding: '40px', boxShadow: theme.shadows.lg } },
          e('div', { style: { marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' } },
            e('div', { style: { width: '12px', height: '12px', borderRadius: '50%', background: theme.colors.success } }),
            e('strong', { style: { color: theme.colors.secondary } }, 'Live ROM Tracking')
          ),
          e('div', { style: { height: '200px', background: '#f8fafc', borderRadius: '16px', padding: '10px' } },
            e('canvas', { id: 'heroChart' })
          )
        )
      )
    )
  );
}

/* -------------------- Auth Components -------------------- */
const authWrapper = (title, subtitle, children, push) => e('section', {
  style: {
    display: 'flex',
    minHeight: '90vh',
    background: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px'
  }
},
  e('div', {
    style: {
      display: 'flex',
      background: '#fff',
      borderRadius: '32px',
      boxShadow: theme.shadows.lg,
      width: '100%',
      maxWidth: '1000px',
      overflow: 'hidden',
      minHeight: '600px'
    }
  },
    // Left Panel (Dark Sidebar)
    e('div', {
      style: {
        flex: '1',
        background: '#0f172a', // Navy Slate
        padding: '60px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        color: '#fff'
      }
    },
      e('h2', {
        style: { color: theme.colors.primary, fontSize: '1.5rem', fontWeight: '800', marginBottom: '40px', cursor: 'pointer' },
        onClick: () => push('/')
      }, 'PhysioTrack'),
      e('h1', { style: { fontSize: '2.5rem', lineHeight: '1.2', fontWeight: '700', marginBottom: '20px' } },
        'Your journey to recovery starts here.'
      ),
      e('p', { style: { fontSize: '1.1rem', color: '#94a3b8', lineHeight: '1.6' } },
        'Join over 10,000+ patients tracking their way to a healthier life.'
      )
    ),

    // Right Panel (Form Area)
    e('div', {
      style: {
        flex: '1.2',
        padding: '60px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }
    },
      e('h2', { style: { fontSize: '1.8rem', color: theme.colors.secondary, marginBottom: '8px' } }, title),
      e('p', { style: { color: theme.colors.textLight, marginBottom: '32px', fontSize: '1rem' } }, subtitle),
      children
    )
  )
);

export function SignInPage({ signIn, push }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setLoading(true);
    try {
      const userCredential = await fbSignInUser(auth, email, password);
      const usersRef = ref(db, "users");
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        const users = Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }));
        const user = users.find(u => u.id === userCredential.user.uid);

        if (user) {
          await signIn(user, users);
          push('/dashboard');
        } else {
          alert("Account found, but profile data is missing. Please contact support.");
        }
      } else {
        alert("Database error: No users found in system.");
      }
    } catch (err) {
      let friendlyMessage = err.message;
      if (err.code === 'auth/wrong-password') friendlyMessage = "Incorrect password.";
      if (err.code === 'auth/user-not-found') friendlyMessage = "No account found with this email.";
      alert('Login Failed: ' + friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return authWrapper(
    'Welcome Back',
    'Enter your details to access your dashboard.',
    e('form', { onSubmit: handleSubmit },
      e('label', { style: { display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: theme.colors.secondary } }, 'Email Address'),
      e('input', { style: inputStyle, type: 'email', value: email, onInput: e => setEmail(e.target.value), placeholder: 'name@example.com' }),

      e('label', { style: { display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: theme.colors.secondary } }, 'Password'),
      e('input', { style: inputStyle, type: 'password', value: password, onInput: e => setPassword(e.target.value), placeholder: '••••••••' }),

      e('button', {
        type: 'submit',
        disabled: loading,
        style: { ...btnBase, width: '100%', background: theme.colors.primary, color: '#fff', fontSize: '1rem' }
      }, loading ? 'Processing...' : 'Continue →'),

      e('div', { style: { marginTop: '20px' } },
        e('a', {
          style: { color: '#2563eb', fontSize: '0.9rem', textDecoration: 'underline', cursor: 'pointer' },
          onClick: () => alert('Reset link sent to email.')
        }, 'Forgot password?'),
        // e('p', { style: { marginTop: '15px', fontSize: '0.9rem', color: theme.colors.textLight } },
        //   "New here? ",
        //   e('a', { onClick: () => push('/signup'), style: { color: theme.colors.primary, cursor: 'pointer', fontWeight: '700' } }, 'Create account')
        // )
      )
    ),
    push
  );
}

export function SignUpPage({ push, signIn }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setLoading(true);
    try {
      const auth = window.firebaseAuth;
      const db = window.firebaseDB;
      const userCredential = await fbCreateUser(auth, email, password);
      const newUserData = { email, name, role: 'patient', assignedDoctorId: null };
      await set(ref(db, `users/${userCredential.user.uid}`), newUserData);
      push('/signin');
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  return authWrapper(
    'Create Account',
    'Join our community and start tracking your recovery.',
    e('form', { onSubmit: handleSubmit },
      e('label', { style: { display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' } }, 'Full Name'),
      e('input', { style: inputStyle, placeholder: 'John Doe', value: name, onInput: e => setName(e.target.value) }),

      e('label', { style: { display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' } }, 'Email Address'),
      e('input', { style: inputStyle, placeholder: 'name@example.com', type: 'email', value: email, onInput: e => setEmail(e.target.value) }),

      e('label', { style: { display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' } }, 'Create Password'),
      e('input', { style: inputStyle, placeholder: 'Min. 6 characters', type: 'password', value: password, onInput: e => setPassword(e.target.value) }),

      e('button', {
        type: 'submit',
        disabled: loading,
        style: { ...btnBase, width: '100%', background: theme.colors.primary, color: '#fff' }
      }, 'Register Now →'),

      e('p', { style: { marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: theme.colors.textLight } },
        "Already have an account? ",
        e('a', { onClick: () => push('/signin'), style: { color: theme.colors.primary, cursor: 'pointer', fontWeight: '700' } }, 'Sign In')
      )
    ),
    push
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


