// backend/routes/voice.js
// ═══════════════════════════════════════════════════════════
//  Voice Routes — Firestore + Firebase Storage Backend
//  Voice profiles → saved permanently in Firestore
//  Generated audio → saved permanently in Firebase Storage
//  No more in-memory Map — survives all restarts
// ═══════════════════════════════════════════════════════════

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const {
    saveVoiceProfile,
    getVoiceProfile,
    getAllVoiceProfiles,
    deleteVoiceProfile,
    saveGeneration,
    uploadAudioToStorage,
    isFirebaseReady,
} = require('../firebase/firebase-admin');

const { optionalAuth } = require('../middleware/auth');
const db_local = require('../db'); // for usage limits

const router = express.Router();

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';
const API_KEY = () => process.env.ELEVENLABS_API_KEY;

// ── Fallback in-memory store (used only if Firebase not ready)
const memoryProfiles = new Map();

// ── Multer — temp local storage before uploading to ElevenLabs
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = process.env.UPLOAD_DIR || './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) =>
        cb(null, `voice_${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
});

const upload = multer({
    storage,
    limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 25) * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowed = ['.mp3', '.wav', '.m4a', '.ogg', '.webm'];
        if (allowed.includes(ext) || file.mimetype.startsWith('audio/')) cb(null, true);
        else cb(new Error('Only audio files allowed (MP3, WAV, M4A, OGG, WebM)'));
    },
});

// ── Get owner key (Firebase UID or guest) ──────────────────
const ownerKey = (req) => req.user?.id || req.user?.uid || 'guest';

// ── Save profile to Firestore or memory ───────────────────
const saveProfile = async (uid, profile) => {
    if (isFirebaseReady() && uid !== 'guest') {
        await saveVoiceProfile(uid, profile);
    }
    memoryProfiles.set(profile.id, { ...profile, ownerKey: uid });
};

// ── Get profile from Firestore or memory ──────────────────
const getProfile = async (uid, profileId) => {
    // First check memory (fastest)
    const mem = memoryProfiles.get(profileId);
    if (mem) return mem;

    // Then check Firestore
    if (isFirebaseReady() && uid !== 'guest') {
        const doc = await getVoiceProfile(uid, profileId);
        if (doc) {
            // Cache in memory for this session
            memoryProfiles.set(doc.id, { ...doc, ownerKey: uid });
            return doc;
        }
    }
    return null;
};

// ── GET /api/voices ────────────────────────────────────────
router.get('/voices', optionalAuth, async (req, res) => {
    const uid = ownerKey(req);
    try {
        let profiles = [];

        if (isFirebaseReady() && uid !== 'guest') {
            // Load from Firestore
            profiles = await getAllVoiceProfiles(uid);
            // Sync to memory cache
            profiles.forEach(p => memoryProfiles.set(p.id, { ...p, ownerKey: uid }));
        } else {
            // Fallback: memory only
            profiles = Array.from(memoryProfiles.values())
                .filter(v => v.ownerKey === uid);
        }

        res.json({
            voices: profiles.map(({ id, name, elevenLabsVoiceId, createdAt, demo }) => ({
                id, name, elevenLabsVoiceId, createdAt, demo,
            })),
        });
    } catch (err) {
        console.error('[Voices] GET error:', err.message);
        res.json({ voices: [] });
    }
});

// ── POST /api/upload-voice ─────────────────────────────────
router.post('/upload-voice', optionalAuth, upload.single('audio'), async (req, res, next) => {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    const uid = ownerKey(req);
    const plan = req.user?.plan || 'free';
    const limits = db_local.getPlanLimits(plan);

    // Check voice profile limit
    let existingCount = 0;
    try {
        if (isFirebaseReady() && uid !== 'guest') {
            const existing = await getAllVoiceProfiles(uid);
            existingCount = existing.length;
        } else {
            existingCount = Array.from(memoryProfiles.values()).filter(v => v.ownerKey === uid).length;
        }
    } catch (_) { }

    if (limits.voices !== Infinity && existingCount >= limits.voices) {
        fs.unlink(req.file.path, () => { });
        return res.status(403).json({
            error: `Your ${plan} plan allows ${limits.voices} voice profile(s). Upgrade to add more.`,
            limitReached: true,
        });
    }

    const voiceName = (req.body.name || `Voice ${Date.now()}`).trim();
    const profileId = uuidv4();

    try {
        let elevenLabsVoiceId = null;

        // ── ElevenLabs voice cloning ───────────────────────────
        if (API_KEY()) {
            console.log(`[Voice] Cloning voice for user ${uid}...`);
            const form = new FormData();
            form.append('name', voiceName);
            form.append('files', fs.createReadStream(req.file.path), {
                filename: req.file.filename,
                contentType: req.file.mimetype || 'audio/mpeg',
            });

            const response = await axios.post(`${ELEVENLABS_BASE}/voices/add`, form, {
                headers: { 'xi-api-key': API_KEY(), ...form.getHeaders() },
                timeout: 60000,
            });
            elevenLabsVoiceId = response.data.voice_id;
            console.log(`[Voice] ✅ ElevenLabs voice created: ${elevenLabsVoiceId}`);
        } else {
            console.log('[Voice] ⚠️  No ElevenLabs key — demo mode');
        }

        // ── Save profile ───────────────────────────────────────
        const profile = {
            id: profileId,
            name: voiceName,
            elevenLabsVoiceId: elevenLabsVoiceId,
            demo: !API_KEY(),
            createdAt: new Date().toISOString(),
        };

        await saveProfile(uid, profile);

        // Clean up temp file
        fs.unlink(req.file.path, () => { });

        console.log(`[Voice] Profile saved: ${profileId} for user ${uid}`);

        res.json({
            success: true,
            voiceProfileId: profileId,
            voiceName,
            elevenLabsVoiceId,
            demo: !API_KEY(),
            savedToDatabase: isFirebaseReady(),
        });

    } catch (err) {
        fs.unlink(req.file?.path, () => { });
        const msg = err.response?.data?.detail?.message || err.message;
        console.error('[Voice] Upload error:', msg);
        next({ status: err.response?.status || 500, message: `Voice upload failed: ${msg}` });
    }
});

// ── POST /api/generate-voice ───────────────────────────────
router.post('/generate-voice', optionalAuth, async (req, res, next) => {
    const {
        voiceProfileId,
        text,
        stability = 0.5,
        similarityBoost = 0.75,
        style = 0,
    } = req.body;

    if (!voiceProfileId) return res.status(400).json({ error: 'voiceProfileId is required' });
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

    const uid = ownerKey(req);
    const plan = req.user?.plan || 'free';
    const limits = db_local.getPlanLimits(plan);

    // Char limit check
    const maxChars = limits.chars || 500;
    if (text.length > maxChars) {
        return res.status(400).json({
            error: `Text too long. Your ${plan} plan allows ${maxChars} characters per generation.`,
        });
    }

    // Usage limit check
    if (req.user?.id && !db_local.canGenerate(req.user.id, plan)) {
        return res.status(403).json({
            error: `You've used all ${limits.generations} generations this month. Upgrade your plan.`,
            limitReached: true,
        });
    }

    // ── Load voice profile ────────────────────────────────────
    let profile = null;
    try {
        profile = await getProfile(uid, voiceProfileId);
    } catch (err) {
        console.error('[Generate] Profile lookup error:', err.message);
    }

    // Profile not found
    if (!profile) {
        console.warn(`[Generate] Profile ${voiceProfileId} not found for user ${uid}`);
        return res.status(404).json({
            error: 'Voice profile not found. Please create a new voice profile.',
        });
    }

    try {
        // ── Demo mode (no ElevenLabs key or demo profile) ────────
        if (!API_KEY() || profile.demo) {
            if (req.user?.id) db_local.incrementUsage(req.user.id);
            return res.json({
                success: true,
                demo: true,
                message: 'Demo mode — add ELEVENLABS_API_KEY to Render environment to generate real audio',
                audioUrl: null,
            });
        }

        // ── Real ElevenLabs TTS generation ───────────────────────
        console.log(`[Generate] Generating TTS for voice ${profile.elevenLabsVoiceId}...`);

        const ttsResponse = await axios.post(
            `${ELEVENLABS_BASE}/text-to-speech/${profile.elevenLabsVoiceId}`,
            {
                text: text.trim(),
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: parseFloat(stability),
                    similarity_boost: parseFloat(similarityBoost),
                    style: parseFloat(style),
                    use_speaker_boost: true,
                },
            },
            {
                headers: { 'xi-api-key': API_KEY(), Accept: 'audio/mpeg', 'Content-Type': 'application/json' },
                responseType: 'arraybuffer',
                timeout: 60000,
            }
        );

        const audioBuffer = Buffer.from(ttsResponse.data);
        const filename = `generated_${uuidv4()}.mp3`;
        let audioUrl = null;

        // ── Try Firebase Storage first (permanent) ────────────────
        if (isFirebaseReady() && uid !== 'guest') {
            audioUrl = await uploadAudioToStorage(uid, audioBuffer, filename);
            console.log(`[Generate] ✅ Audio saved to Firebase Storage`);
        }

        // ── Fallback: local file (temporary) ─────────────────────
        if (!audioUrl) {
            const generatedDir = process.env.GENERATED_DIR || './generated';
            if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

            const outputPath = path.join(generatedDir, filename);
            fs.writeFileSync(outputPath, audioBuffer);

            // Auto-delete local file after 2 hours
            setTimeout(() => fs.unlink(outputPath, () => { }), 2 * 60 * 60 * 1000);

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            audioUrl = `${baseUrl}/generated/${filename}`;
            console.log(`[Generate] ⚠️  Audio saved locally (temporary): ${audioUrl}`);
        }

        // ── Track usage ───────────────────────────────────────────
        if (req.user?.id) db_local.incrementUsage(req.user.id);

        // ── Save to generation history in Firestore ───────────────
        if (isFirebaseReady() && uid !== 'guest') {
            await saveGeneration(uid, {
                text: text.trim(),
                voiceName: profile.name,
                voiceId: voiceProfileId,
                audioUrl,
                filename,
                charCount: text.trim().length,
                model: 'eleven_multilingual_v2',
                stability: parseFloat(stability),
                similarity: parseFloat(similarityBoost),
            }).catch(err => console.error('[Generate] Failed to save history:', err.message));
        }

        console.log(`[Generate] ✅ Done for user ${uid}`);

        res.json({
            success: true,
            audioUrl,
            filename,
            characterCount: text.trim().length,
            storedPermanently: isFirebaseReady() && uid !== 'guest',
        });

    } catch (err) {
        const raw = err.response?.data ? Buffer.from(err.response.data).toString() : err.message;
        let detail = raw;
        try { detail = JSON.parse(raw)?.detail?.message || raw; } catch (_) { }
        console.error('[Generate] Error:', detail);
        next({ status: err.response?.status || 500, message: `Generation failed: ${detail}` });
    }
});

// ── DELETE /api/voices/:id ─────────────────────────────────
router.delete('/voices/:id', optionalAuth, async (req, res, next) => {
    const uid = ownerKey(req);

    try {
        const profile = await getProfile(uid, req.params.id);
        if (!profile) return res.status(404).json({ error: 'Voice profile not found' });

        // Delete from ElevenLabs
        if (API_KEY() && profile.elevenLabsVoiceId && !profile.demo) {
            await axios.delete(`${ELEVENLABS_BASE}/voices/${profile.elevenLabsVoiceId}`, {
                headers: { 'xi-api-key': API_KEY() },
            }).catch(err => console.warn('[Voice] ElevenLabs delete failed:', err.message));
        }

        // Delete from Firestore
        if (isFirebaseReady() && uid !== 'guest') {
            await deleteVoiceProfile(uid, req.params.id);
        }

        // Delete from memory cache
        memoryProfiles.delete(req.params.id);

        res.json({ success: true });
    } catch (err) {
        next({ status: 500, message: 'Failed to delete voice profile' });
    }
});

module.exports = router;
