/**
 * Firebase Configuration and Initialization
 */

const firebaseConfig = {
  apiKey: "AIzaSyCOD3_QgxBt4U2hDzxSctIHYfxNR39Wkjc",
  authDomain: "nori-rice.firebaseapp.com",
  projectId: "nori-rice",
  storageBucket: "nori-rice.firebasestorage.app",
  messagingSenderId: "735508204387",
  appId: "1:735508204387:web:368ff56a95d63449afa156",
  measurementId: "G-QXL6Z030VX"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { db, auth, analytics };
