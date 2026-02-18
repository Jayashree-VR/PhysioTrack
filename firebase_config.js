import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

export const firebaseConfig = {
  apiKey: "AIzaSyB7Ky9xLtDshhGk8zUYJ7OoreJ45rZEzmg",
  authDomain: "physiotrack-b59df.firebaseapp.com",
  databaseURL: "https://physiotrack-b59df-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "physiotrack-b59df",
  storageBucket: "physiotrack-b59df.firebasestorage.app",
  messagingSenderId: "497761157613",
  appId: "1:497761157613:web:712af6dabe175fdabea7e4"
};

// 1. Initialize
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);


// 2. Define the reference that was missing before
export const dbRef = ref(db, "users");

// 3. Helper Functions
export function saveProgress(userId, sessionData) {
  const sessionRef = ref(db, `progress/${userId}/${sessionData.sessionId}`);
  return set(sessionRef, sessionData);
}

export function loadProgress(userId, callback) {
  if (!userId) return;
  const userProgressRef = ref(db, `progress/${userId}`);
  onValue(userProgressRef, (snapshot) => {
    const data = snapshot.val();
    callback(data ? Object.values(data) : []);
  });
}

export async function fetchUsersFromDB() {
  try {
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
      const users = Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }));
      localStorage.setItem("physiotrack_initial_users", JSON.stringify(users));
    }
  } catch (err) {
    console.error("Firebase fetch error:", err);
  }
}

// 4. Re-export Firebase methods with your preferred names
export {
  createUserWithEmailAndPassword as fbCreateUser,
  signInWithEmailAndPassword as fbSignInUser,
  ref,
  onValue,
  update,
  get,
  set
};

// Start the fetch
fetchUsersFromDB();
