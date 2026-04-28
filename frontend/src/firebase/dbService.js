// src/firebase/dbService.js
// ═══════════════════════════════════════════════════════════
//  Complete Firestore Database Service
//  Handles: Users, Voice Profiles, Generation History, Usage
// ═══════════════════════════════════════════════════════════

import {
    doc, collection,
    setDoc, getDoc, updateDoc, deleteDoc,
    addDoc, getDocs,
    query, where, orderBy, limit, startAfter,
    serverTimestamp, Timestamp,
    onSnapshot,
} from 'firebase/firestore';
import { db } from './config';

// ─────────────────────────────────────────────────────────
//  COLLECTION NAMES
// ─────────────────────────────────────────────────────────
const COLLECTIONS = {
    USERS: 'users',
    VOICES: 'voiceProfiles',    // sub-collection: users/{uid}/voiceProfiles
    HISTORY: 'generationHistory', // sub-collection: users/{uid}/generationHistory
};

// ─────────────────────────────────────────────────────────
//  USER OPERATIONS
// ─────────────────────────────────────────────────────────

// Create or update user document on login/signup
export const createUserDocument = async (firebaseUser, extraData = {}) => {
    const userRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        // New user — create fresh document
        await setDoc(userRef, {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || extraData.name || 'User',
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || null,
            plan: 'free',
            provider: extraData.provider || 'email',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            usage: {
                generations: 0,
                month: currentMonth(),
            },
            stats: {
                totalGenerations: 0,
                totalVoices: 0,
                totalChars: 0,
            },
        });
        console.log('[DB] New user created:', firebaseUser.email);
    } else {
        // Existing user — update last login
        await updateDoc(userRef, {
            lastLoginAt: serverTimestamp(),
            // Update name/photo if changed (e.g. Google profile update)
            ...(firebaseUser.displayName && { name: firebaseUser.displayName }),
            ...(firebaseUser.photoURL && { photoURL: firebaseUser.photoURL }),
        });
    }

    return getUserDocument(firebaseUser.uid);
};

// Get user document
export const getUserDocument = async (uid) => {
    const snapshot = await getDoc(doc(db, COLLECTIONS.USERS, uid));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

// Update user profile
export const updateUserDocument = async (uid, updates) => {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
        ...updates,
        updatedAt: serverTimestamp(),
    });
    return getUserDocument(uid);
};

// Update user plan
export const updateUserPlan = async (uid, plan) => {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
        plan,
        updatedAt: serverTimestamp(),
    });
};

// ─────────────────────────────────────────────────────────
//  USAGE TRACKING
// ─────────────────────────────────────────────────────────

export const getUsage = async (uid) => {
    const userDoc = await getUserDocument(uid);
    if (!userDoc) return { generations: 0, month: currentMonth() };
    const usage = userDoc.usage || { generations: 0, month: currentMonth() };
    // Reset if new month
    if (usage.month !== currentMonth()) return { generations: 0, month: currentMonth() };
    return usage;
};

export const incrementUsage = async (uid, charCount = 0) => {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const month = currentMonth();
    const usage = (data.usage?.month === month)
        ? { generations: (data.usage.generations || 0) + 1, month }
        : { generations: 1, month };

    const stats = data.stats || { totalGenerations: 0, totalVoices: 0, totalChars: 0 };

    await updateDoc(userRef, {
        usage,
        'stats.totalGenerations': (stats.totalGenerations || 0) + 1,
        'stats.totalChars': (stats.totalChars || 0) + charCount,
        updatedAt: serverTimestamp(),
    });

    return usage;
};

// ─────────────────────────────────────────────────────────
//  VOICE PROFILES
// ─────────────────────────────────────────────────────────

// Save a new voice profile
export const saveVoiceProfile = async (uid, profileData) => {
    const colRef = collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.VOICES);
    const docRef = await addDoc(colRef, {
        ...profileData,
        uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // Update voice count in user stats
    const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
    if (userSnap.exists()) {
        const stats = userSnap.data().stats || {};
        await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
            'stats.totalVoices': (stats.totalVoices || 0) + 1,
            updatedAt: serverTimestamp(),
        });
    }

    return { id: docRef.id, ...profileData };
};

// Get all voice profiles for a user
export const getVoiceProfiles = async (uid) => {
    const colRef = collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.VOICES);
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Get a single voice profile
export const getVoiceProfile = async (uid, profileId) => {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid, COLLECTIONS.VOICES, profileId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// Delete a voice profile
export const deleteVoiceProfile = async (uid, profileId) => {
    await deleteDoc(doc(db, COLLECTIONS.USERS, uid, COLLECTIONS.VOICES, profileId));

    // Update voice count in user stats
    const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
    if (userSnap.exists()) {
        const stats = userSnap.data().stats || {};
        await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
            'stats.totalVoices': Math.max((stats.totalVoices || 1) - 1, 0),
            updatedAt: serverTimestamp(),
        });
    }
};

// ─────────────────────────────────────────────────────────
//  GENERATION HISTORY
// ─────────────────────────────────────────────────────────

// Save a generation to history
export const saveGenerationHistory = async (uid, historyData) => {
    const colRef = collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.HISTORY);
    const docRef = await addDoc(colRef, {
        ...historyData,
        uid,
        createdAt: serverTimestamp(),
    });
    return { id: docRef.id, ...historyData };
};

// Get generation history (paginated)
export const getGenerationHistory = async (uid, limitCount = 20, lastDoc = null) => {
    const colRef = collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.HISTORY);
    let q = query(colRef, orderBy('createdAt', 'desc'), limit(limitCount));
    if (lastDoc) q = query(colRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(limitCount));

    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }));
    const lastVisible = snap.docs[snap.docs.length - 1] || null;
    return { items, lastVisible, hasMore: snap.docs.length === limitCount };
};

// Delete a single history item
export const deleteHistoryItem = async (uid, historyId) => {
    await deleteDoc(doc(db, COLLECTIONS.USERS, uid, COLLECTIONS.HISTORY, historyId));
};

// Clear all history for a user
export const clearAllHistory = async (uid) => {
    const colRef = collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.HISTORY);
    const snap = await getDocs(colRef);
    const deletes = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletes);
};

// ─────────────────────────────────────────────────────────
//  REAL-TIME LISTENERS
// ─────────────────────────────────────────────────────────

// Listen to user document changes in real-time
export const listenToUserDoc = (uid, callback) => {
    return onSnapshot(doc(db, COLLECTIONS.USERS, uid), (snap) => {
        if (snap.exists()) callback({ id: snap.id, ...snap.data() });
    });
};

// Listen to voice profiles in real-time
export const listenToVoiceProfiles = (uid, callback) => {
    const colRef = collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.VOICES);
    const q = query(colRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

// ─────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────

export function currentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}