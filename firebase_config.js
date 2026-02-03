import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
// All necessary database functions imported
import { getDatabase, ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// 🔧 1. Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB7Ky9xLtDshhGk8zUYJ7OoreJ45rZEzmg",
  authDomain: "physiotrack-b59df.firebaseapp.com",
  databaseURL: "https://physiotrack-b59df-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "physiotrack-b59df",
  storageBucket: "physiotrack-b59df.firebasestorage.app",
  messagingSenderId: "497761157613",
  appId: "1:497761157613:web:712af6dabe175fdabea7e4"
};

// 🔧 2. Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Make globals for legacy access (e.g., in Sign In/Up pages)
window.firebaseAuth = auth;
window.firebaseDB = db;

console.log("✅ Firebase connected successfully!");

// ------------------- Firebase Helper Functions -------------------

function saveProgress(userId, sessionData) {
  // Path: /progress/{userId}/{sessionId}
  const sessionRef = ref(db, `progress/${userId}/${sessionData.sessionId}`);
  set(sessionRef, sessionData)
    .then(() => console.log(`[Firebase] Progress saved for user ${userId}.`))
    .catch(error => console.error(`[Firebase] Error saving progress: ${error.message}`));
}

// 🛑 FIX: Removed 'export' keyword from function definition to prevent re-declaration
// Sets up a real-time listener and converts the data object to an array for React state.
function loadProgress(userId, callback) {
  if (!userId) return;

  // Path: /progress/{userId}
  const userProgressRef = ref(db, `progress/${userId}`);

  // onValue creates a continuous listener
  onValue(userProgressRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Convert the object of sessions into an array of sessions
      const sessions = Object.keys(data).map(key => data[key]);
      callback(sessions); // Update the React state (setProgress)
    } else {
      callback([]); // Pass an empty array if no data exists
    }
  }, (error) => {
    console.error("Firebase loadProgress error:", error);
    callback([]);
  });
}

// 3. Fetch users once and cache locally (Awaited by main app)
export async function fetchUsersFromDB() {
  try {
    const dbRef = ref(db, "users");
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
      const users = Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }));
      // This is a minimal initial cache, not the full app state
      localStorage.setItem("physiotrack_initial_users", JSON.stringify(users));
      console.log("✅ Initial users loaded from Firebase.");
    } else {
      console.warn("⚠️ No users found in Firebase DB.");
    }
  } catch (err) {
    console.error("❌ Error fetching users:", err);
  }
}

// Wait for data load before continuing (ensure users are in cache/memory)
await fetchUsersFromDB();

// Export core functions, including the now-defined progress helpers.
export { auth, db, createUserWithEmailAndPassword as fbCreateUser, signInWithEmailAndPassword as fbSignInUser, ref, get, set, loadProgress, saveProgress };