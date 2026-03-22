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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

export const dbRef = ref(db, "users");

export const loadProgress = (userId, callback) => {
  const progressRef = dbRef(db, `progress/${userId}`);
  onValue(progressRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Converts Firebase object into an array sorted by date
      const sessions = Object.values(data).sort((a, b) =>
        new Date(b.dateTime) - new Date(a.dateTime)
      );
      callback(sessions);
    } else {
      callback([]);
    }
  });
};

const saveProgress = async (userId, sessionData) => {
  const { sessionId, timeline, ...summaryData } = sessionData;

  const summaryRef = dbRef(db, `progress/${userId}/${sessionId}/summary`);
  const timelineRef = dbRef(db, `progress/${userId}/${sessionId}/timeline`);

  await set(summaryRef, summaryData);
  await set(timelineRef, timeline || []);
};

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

export {
  createUserWithEmailAndPassword as fbCreateUser,
  signInWithEmailAndPassword as fbSignInUser,
  ref,
  onValue,
  update,
  get,
  set
};
