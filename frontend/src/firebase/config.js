import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAQHvfqlijvB4iDZxtjaSsFmCUlLOJGUzc",
    authDomain: "voiceforge-3e37f.firebaseapp.com",
    projectId: "voiceforge-3e37f",
    storageBucket: "voiceforge-3e37f.firebasestorage.app",
    messagingSenderId: "966004797293",
    appId: "1:966004797293:web:660c77af3d4475ba903464",
    measurementId: "G-2556L814EC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export default app;