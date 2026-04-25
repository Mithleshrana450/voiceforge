import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Safety check: Ensure environment variables are loaded
const isConfigValid = !!firebaseConfig.apiKey;

let app;
try {
    if (!isConfigValid) {
        console.error("❌ Firebase API Key is missing! Add VITE_FIREBASE_API_KEY to your environment variables.");
    }
    app = initializeApp(firebaseConfig);
} catch (err) {
    console.error("❌ Firebase initialization failed:", err.message);
    app = {}; // Fallback to prevent crash during import
}

export const auth = isConfigValid ? getAuth(app) : null;
export const db = isConfigValid ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();
export default app;