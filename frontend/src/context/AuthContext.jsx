// src/context/AuthContext.jsx
// ═══════════════════════════════════════════════════════════
//  Global Auth + Database State
//  Powered by Firebase Auth + Firestore
//  Provides user, plan, limits, usage across entire app
// ═══════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import {
  createUserDocument,
  getUserDocument,
  listenToUserDoc,
  getUsage,
} from '../firebase/dbService';

export const PLAN_LIMITS = {
  free: { generations: 50, voices: 10, chars: 1000 },
  pro: { generations: 500, voices: 50, chars: 2500 },
  business: { generations: Infinity, voices: Infinity, chars: 2500 },
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({ generations: 0 });

  useEffect(() => {
    let unsubDoc = null;

    // Firebase Auth state observer
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          // Create/update user in Firestore
          const doc = await createUserDocument(fbUser);
          setUserDoc(doc);

          // Load usage
          const u = await getUsage(fbUser.uid);
          setUsage(u);

          // Real-time listener on user document
          unsubDoc = listenToUserDoc(fbUser.uid, (updatedDoc) => {
            setUserDoc(updatedDoc);
            // Sync usage from real-time update
            if (updatedDoc.usage) setUsage(updatedDoc.usage);
          });
        } catch (err) {
          console.error('[Auth] Failed to load user document:', err);
        }
      } else {
        // Logged out
        setUserDoc(null);
        setUsage({ generations: 0 });
        if (unsubDoc) { unsubDoc(); unsubDoc = null; }
      }

      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const refreshUsage = async () => {
    if (!firebaseUser) return;
    const u = await getUsage(firebaseUser.uid);
    setUsage(u);
  };

  const refreshUserDoc = async () => {
    if (!firebaseUser) return;
    const doc = await getUserDocument(firebaseUser.uid);
    setUserDoc(doc);
  };

  // Computed values
  const plan = userDoc?.plan || 'free';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  const user = firebaseUser ? {
    uid: firebaseUser.uid,
    id: firebaseUser.uid,
    name: firebaseUser.displayName || userDoc?.name || 'User',
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL || null,
    emailVerified: firebaseUser.emailVerified,
    plan,
    limits,
    stats: userDoc?.stats || { totalGenerations: 0, totalVoices: 0, totalChars: 0 },
    createdAt: userDoc?.createdAt,
    provider: userDoc?.provider || 'email',
  } : null;

  const canGenerate = () => {
    if (limits.generations === Infinity) return true;
    return (usage.generations || 0) < limits.generations;
  };

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      userDoc,
      loading,
      isLoggedIn: !!firebaseUser,
      plan,
      limits,
      usage,
      canGenerate,
      refreshUsage,
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