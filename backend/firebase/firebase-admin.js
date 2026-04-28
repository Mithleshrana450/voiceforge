// backend/firebase-admin.js
// ═══════════════════════════════════════════════════════════
//  Firebase Admin SDK — Backend Connection to Firestore
//  Used by backend to read/write voice profiles and history
//  Works with the same Firebase project as the frontend
// ═══════════════════════════════════════════════════════════

const admin = require('firebase-admin');

let db = null;
let storage = null;

const initFirebase = () => {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    storage = admin.storage();
    return;
  }

  try {
    // Get service account from environment variable
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!serviceAccountJson) {
      console.warn('[Firebase] ⚠️  FIREBASE_SERVICE_ACCOUNT not set — Firestore disabled');
      return;
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`,
    });

    db = admin.firestore();
    storage = admin.storage();

    console.log('[Firebase] ✅ Admin SDK connected to Firestore');
    console.log(`[Firebase] ✅ Storage bucket: ${serviceAccount.project_id}.appspot.com`);

  } catch (err) {
    console.error('[Firebase] ❌ Failed to initialize:', err.message);
    console.warn('[Firebase] Running without Firestore — voice profiles will use memory only');
  }
};

// Initialize on require
initFirebase();

// ── Firestore helpers ──────────────────────────────────────

// Get user's voice profiles collection ref
const voiceProfilesRef = (uid) =>
  db?.collection('users').doc(uid).collection('voiceProfiles');

// Get user's generation history collection ref
const historyRef = (uid) =>
  db?.collection('users').doc(uid).collection('generationHistory');

// Save voice profile to Firestore
const saveVoiceProfile = async (uid, profileData) => {
  if (!db) return null;
  const ref = voiceProfilesRef(uid).doc(profileData.id);
  await ref.set({
    ...profileData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return profileData;
};

// Get a single voice profile from Firestore
const getVoiceProfile = async (uid, profileId) => {
  if (!db) return null;
  const snap = await voiceProfilesRef(uid).doc(profileId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
};

// Get all voice profiles for a user
const getAllVoiceProfiles = async (uid) => {
  if (!db) return [];
  const snap = await voiceProfilesRef(uid)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Delete a voice profile from Firestore
const deleteVoiceProfile = async (uid, profileId) => {
  if (!db) return;
  await voiceProfilesRef(uid).doc(profileId).delete();
};

// Save generation to history
const saveGeneration = async (uid, data) => {
  if (!db) return;
  await historyRef(uid).add({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update user stats
  await db.collection('users').doc(uid).update({
    'stats.totalGenerations': admin.firestore.FieldValue.increment(1),
    'stats.totalChars': admin.firestore.FieldValue.increment(data.charCount || 0),
    'usage.generations': admin.firestore.FieldValue.increment(1),
    'usage.month': currentMonth(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => { }); // Don't fail if user doc doesn't exist yet
};

// ── Firebase Storage helpers ──────────────────────────────

// Upload audio buffer to Firebase Storage — returns permanent URL
const uploadAudioToStorage = async (uid, audioBuffer, filename) => {
  if (!storage) return null;

  try {
    const bucket = storage.bucket();
    const filePath = `generated/${uid}/${filename}`;
    const file = bucket.file(filePath);

    await file.save(audioBuffer, {
      metadata: {
        contentType: 'audio/mpeg',
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Make file publicly accessible
    await file.makePublic();

    // Return permanent public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    console.log(`[Storage] ✅ Audio saved: ${publicUrl}`);
    return publicUrl;

  } catch (err) {
    console.error('[Storage] ❌ Upload failed:', err.message);
    return null;
  }
};

// Delete audio from Firebase Storage
const deleteAudioFromStorage = async (uid, filename) => {
  if (!storage) return;
  try {
    const bucket = storage.bucket();
    await bucket.file(`generated/${uid}/${filename}`).delete();
  } catch (_) { }
};

// ── Helper ────────────────────────────────────────────────
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

module.exports = {
  admin,
  db,
  storage,
  saveVoiceProfile,
  getVoiceProfile,
  getAllVoiceProfiles,
  deleteVoiceProfile,
  saveGeneration,
  uploadAudioToStorage,
  deleteAudioFromStorage,
  isFirebaseReady: () => !!db,
};
