// Import các function cần thiết từ Firebase
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// Cấu hình Firebase
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyB-uFBlob2uzsb3yhJ9XNWEV9b1jhYC2AE",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "newhopefood-36cff.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "newhopefood-36cff",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "newhopefood-36cff.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "655502160606",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:655502160606:web:9b14e89a73517eb362884f",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-EC88SFD0WG"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);