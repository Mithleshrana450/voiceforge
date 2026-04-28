import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { auth, db, googleProvider } from "./config";

export const PLAN_LIMITS = {
  free: { generations: 50, voices: 10, chars: 1000 },
  pro: { generations: 500, voices: 50, chars: 2500 },
  business: { generations: Infinity, voices: Infinity, chars: 2500 },
};

export const onAuthChange = (callback) => {
  if (!auth) {
    callback(null);
    return () => { };
  }
  return onAuthStateChanged(auth, callback);
};

export const getUserDoc = async (uid) => {
  if (!db) return null;
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
};

export const signUpWithEmail = async (name, email, password) => {
  if (!auth) throw new Error('Firebase is not configured. Please add VITE_FIREBASE_API_KEY to your environment variables.');
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: name });

  // Create user doc in Firestore
  await setDoc(doc(db, "users", user.uid), {
    name,
    email,
    plan: 'free',
    createdAt: serverTimestamp(),
    usage: { generations: 0 }
  });

  return user;
};

export const signInWithEmail = (email, password) => {
  if (!auth) throw new Error('Firebase is not configured. Please add VITE_FIREBASE_API_KEY to your environment variables.');
  return signInWithEmailAndPassword(auth, email, password);
};

export const signInWithGoogle = async () => {
  if (!auth) throw new Error('Firebase is not configured. Please add VITE_FIREBASE_API_KEY to your environment variables.');
  const { user } = await signInWithPopup(auth, googleProvider);

  // Check if user doc exists, if not create it
  const docRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    await setDoc(docRef, {
      name: user.displayName || 'User',
      email: user.email,
      plan: 'free',
      createdAt: serverTimestamp(),
      usage: { generations: 0 }
    });
  }

  return user;
};

export const logOut = () => signOut(auth);

export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

export const upgradePlan = async (uid, plan) => {
  const docRef = doc(db, "users", uid);
  await updateDoc(docRef, { plan });
};
