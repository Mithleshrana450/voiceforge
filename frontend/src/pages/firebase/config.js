// src/firebase/config.js
// ─────────────────────────────────────────────────────────────
//  Firebase Configuration
//  Replace all values below with YOUR Firebase project values
//  Get them from: https://console.firebase.google.com
//  → Your Project → Project Settings → Your Apps → Web App
// ─────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

// Initialize Firebase
const app      = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const db       = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Optional: force account selection every time
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
