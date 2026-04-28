// src/firebase/authService.js
// ─────────────────────────────────────────────────────────────
//  All Firebase Auth operations in one place
//  Email/Password + Google + Password Reset + Profile Update
// ─────────────────────────────────────────────────────────────

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  onAuthStateChanged,
  sendEmailVerification,
} from 'firebase/auth';

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { auth, db, googleProvider } from './config';

// ── Plan limits ──────────────────────────────────────────────
export const PLAN_LIMITS = {
  free:     { generations: 5,        voices: 10,        chars: 500  },
  pro:      { generations: 500,      voices: 5,        chars: 2500 },
  business: { generations: Infinity, voices: Infinity, chars: 2500 },
};

// ── Create user document in Firestore ───────────────────────
const createUserDoc = async (firebaseUser, extraData = {}) => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid:         firebaseUser.uid,
      name:        firebaseUser.displayName || extraData.name || 'User',
      email:       firebaseUser.email,
      photoURL:    firebaseUser.photoURL || null,
      plan:        'free',
      createdAt:   serverTimestamp(),
      updatedAt:   serverTimestamp(),
      provider:    extraData.provider || 'email',
      usage: {
        generations: 0,
        month: _currentMonth(),
      },
    });
  }

  return getUserDoc(firebaseUser.uid);
};

// ── Get user document from Firestore ────────────────────────
export const getUserDoc = async (uid) => {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? snapshot.data() : null;
};

// ── Sign Up with Email & Password ───────────────────────────
export const signUpWithEmail = async (name, email, password) => {
  // Validation
  if (!name?.trim())        throw new Error('Full name is required');
  if (!email?.trim())       throw new Error('Email address is required');
  if (!password)            throw new Error('Password is required');
  if (password.length < 6)  throw new Error('Password must be at least 6 characters');

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);

  // Set display name in Firebase Auth
  await updateProfile(credential.user, { displayName: name.trim() });

  // Send email verification
  await sendEmailVerification(credential.user);

  // Create Firestore document
  const userDoc = await createUserDoc(credential.user, { name: name.trim(), provider: 'email' });

  return { user: credential.user, userDoc };
};

// ── Sign In with Email & Password ───────────────────────────
export const signInWithEmail = async (email, password) => {
  if (!email?.trim()) throw new Error('Email address is required');
  if (!password)      throw new Error('Password is required');

  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const userDoc    = await getUserDoc(credential.user.uid);

  return { user: credential.user, userDoc };
};

// ── Sign In with Google ──────────────────────────────────────
export const signInWithGoogle = async () => {
  const credential = await signInWithPopup(auth, googleProvider);
  const userDoc    = await createUserDoc(credential.user, { provider: 'google' });
  return { user: credential.user, userDoc };
};

// ── Sign Out ─────────────────────────────────────────────────
export const logOut = async () => {
  await signOut(auth);
};

// ── Send Password Reset Email ────────────────────────────────
export const resetPassword = async (email) => {
  if (!email?.trim()) throw new Error('Email address is required');
  await sendPasswordResetEmail(auth, email.trim());
};

// ── Update Display Name ──────────────────────────────────────
export const updateUserName = async (newName) => {
  if (!auth.currentUser) throw new Error('Not logged in');
  await updateProfile(auth.currentUser, { displayName: newName });
  await updateDoc(doc(db, 'users', auth.currentUser.uid), {
    name: newName,
    updatedAt: serverTimestamp(),
  });
};

// ── Change Password (requires recent login) ──────────────────
export const changePassword = async (currentPassword, newPassword) => {
  if (!auth.currentUser) throw new Error('Not logged in');
  if (newPassword.length < 6) throw new Error('New password must be at least 6 characters');

  const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
  await reauthenticateWithCredential(auth.currentUser, credential);
  await updatePassword(auth.currentUser, newPassword);
};

// ── Upgrade Plan in Firestore ─────────────────────────────────
export const upgradePlan = async (uid, plan) => {
  await updateDoc(doc(db, 'users', uid), {
    plan,
    updatedAt: serverTimestamp(),
  });
};

// ── Track usage in Firestore ─────────────────────────────────
export const incrementUsage = async (uid) => {
  const userRef  = doc(db, 'users', uid);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) return;

  const data     = snapshot.data();
  const month    = _currentMonth();
  const usage    = data.usage || { generations: 0, month };

  // Reset counter if new month
  const generations = usage.month === month ? (usage.generations || 0) + 1 : 1;

  await updateDoc(userRef, {
    usage: { generations, month },
    updatedAt: serverTimestamp(),
  });

  return generations;
};

export const getUsage = async (uid) => {
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return { generations: 0, month: _currentMonth() };
  const data  = snapshot.data();
  const month = _currentMonth();
  if (!data.usage || data.usage.month !== month) return { generations: 0, month };
  return data.usage;
};

export const canGenerate = async (uid, plan) => {
  const limit = PLAN_LIMITS[plan]?.generations ?? 5;
  if (limit === Infinity) return true;
  const usage = await getUsage(uid);
  return usage.generations < limit;
};

// ── Delete account ───────────────────────────────────────────
export const deleteAccount = async () => {
  if (!auth.currentUser) throw new Error('Not logged in');
  await deleteUser(auth.currentUser);
};

// ── Auth state observer ──────────────────────────────────────
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

// ── Helper ───────────────────────────────────────────────────
function _currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}
