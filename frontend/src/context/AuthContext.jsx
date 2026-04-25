// src/context/AuthContext.jsx
// ─────────────────────────────────────────────────────────────
//  Global Auth State powered by Firebase
//  Wraps entire app - provides user, loading, plan, usage
// ─────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange, getUserDoc, PLAN_LIMITS } from '../firebase/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null); // Firebase Auth user
  const [userDoc,      setUserDoc]      = useState(null); // Firestore user document
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    // If auth is not available (missing env keys), stop loading
    const unsubscribe = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          const doc = await getUserDoc(fbUser.uid);
          setUserDoc(doc);
        } catch (err) {
          console.error('Failed to load user document:', err);
        }
      } else {
        setUserDoc(null);
      }

      setLoading(false);
    });

    return () => unsubscribe(); // cleanup on unmount
  }, []);

  // Refresh user document from Firestore (call after plan upgrade etc.)
  const refreshUserDoc = async () => {
    if (!firebaseUser) return;
    try {
      const doc = await getUserDoc(firebaseUser.uid);
      setUserDoc(doc);
    } catch (err) {
      console.error('Failed to refresh user document:', err);
    }
  };

  // Shorthand helpers
  const plan      = userDoc?.plan || 'free';
  const limits    = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const isLoggedIn = !!firebaseUser;

  // Combined user object for easy access in components
  const user = firebaseUser ? {
    uid:           firebaseUser.uid,
    id:            firebaseUser.uid,
    name:          firebaseUser.displayName || userDoc?.name || 'User',
    email:         firebaseUser.email,
    photoURL:      firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
    plan,
    limits,
    createdAt:     userDoc?.createdAt,
    usage:         userDoc?.usage || { generations: 0 },
  } : null;

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      userDoc,
      loading,
      isLoggedIn,
      plan,
      limits,
      refreshUserDoc,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
