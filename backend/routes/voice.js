const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';
const API_KEY = () => process.env.ELEVENLABS_API_KEY;

// In-memory voice profiles (keyed by userId or 'guest')
const voiceProfiles = new Map();

// ── Multer ───────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, process.env.UPLOAD_DIR || './uploads'),
    filename: (req, file, cb) => cb(null, `voice_${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({
    storage,
    limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 25) * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.mp3', '.wav', '.m4a', '.ogg', '.webm'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext) || file.mimetype.startsWith('audio/')) cb(null, true);
        else cb(new Error('Audio files only (MP3, WAV, M4A, OGG, WebM)'));
    },
});

const getUserKey = (req) => req.user?.id || 'guest';

// ── GET /api/voices ──────────────────────────────────────────
router.get('/voices', optionalAuth, (req, res) => {
    const key = getUserKey(req);
    const all = Array.from(voiceProfiles.values())
        .filter(v => v.ownerKey === key)
        .map(({ id, name, elevenLabsVoiceId, createdAt, demo }) => ({ id, name, elevenLabsVoiceId, createdAt, demo }));
    res.json({ voices: all });
});

// ── POST /api/upload-voice ───────────────────────────────────
router.post('/upload-voice', optionalAuth, upload.single('audio'), async (req, res, next) => {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    const key = getUserKey(req);
    const plan = req.user?.plan || 'free';
    const limits = db.getPlanLimits(plan);

    // Check voice profile limit
    const existing = Array.from(voiceProfiles.values()).filter(v => v.ownerKey === key);
    if (limits.voices !== Infinity && existing.length >= limits.voices) {
        fs.unlink(req.file.path, () => { });
        return res.status(403).json({
            error: `Your ${plan} plan allows ${limits.voices} voice profile(s). Upgrade to add more.`,
            limitReached: true,
        });
    }

    const voiceName = req.body.name || `Voice ${Date.now()}`;

    try {
        let elevenLabsVoiceId = null;

        if (API_KEY()) {
            const form = new FormData();
            form.append('name', voiceName);
            form.append('files', fs.createReadStream(req.file.path), { filename: req.file.filename, contentType: req.file.mimetype || 'audio/mpeg' });

            const response = await axios.post(`${ELEVENLABS_BASE}/voices/add`, form, {
                headers: { 'xi-api-key': API_KEY(), ...form.getHeaders() },
            });
            elevenLabsVoiceId = response.data.voice_id;
        }

        const profileId = uuidv4();
        voiceProfiles.set(profileId, {
            id: profileId, name: voiceName, elevenLabsVoiceId,
            ownerKey: key, filePath: req.file.path,
            createdAt: new Date().toISOString(),
            demo: !API_KEY(),
        });

        res.json({ success: true, voiceProfileId: profileId, voiceName, elevenLabsVoiceId, demo: !API_KEY() });
    } catch (err) {
        if (req.file?.path) fs.unlink(req.file.path, () => { });
        const msg = err.response?.data?.detail?.message || err.message;
        next({ status: err.response?.status || 500, message: `Voice upload failed: ${msg}` });
    }
});

// ── POST /api/generate-voice ─────────────────────────────────
router.post('/generate-voice', optionalAuth, async (req, res, next) => {
    const { voiceProfileId, text, stability = 0.5, similarityBoost = 0.75, style = 0 } = req.body;

    if (!voiceProfileId) return res.status(400).json({ error: 'voiceProfileId required' });
    if (!text?.trim()) return res.status(400).json({ error: 'text required' });

    const plan = req.user?.plan || 'free';
    const limits = db.getPlanLimits(plan);

    // Enforce char limit
    const maxChars = limits.generations === Infinity ? 2500 : plan === 'free' ? 500 : 2500;
    if (text.length > maxChars) return res.status(400).json({ error: `Text too long. Your plan allows ${maxChars} characters.` });

    // Enforce generation limit
    if (req.user) {
        if (!db.canGenerate(req.user.id, plan)) {
            return res.status(403).json({
                error: `You've used all ${limits.generations} generations for this month. Upgrade your plan for more.`,
                limitReached: true,
            });
        }
    }

    const key = getUserKey(req);
    const profile = voiceProfiles.get(voiceProfileId);
    if (!profile) return res.status(404).json({ error: 'Voice profile not found' });
    if (profile.ownerKey !== key) return res.status(403).json({ error: 'Not your voice profile' });

    try {
        if (!API_KEY() || profile.demo) {
            // Increment usage even in demo mode
            if (req.user) db.incrementUsage(req.user.id);
            return res.json({ success: true, demo: true, message: 'Demo mode — add ELEVENLABS_API_KEY for real audio', audioUrl: null });
        }

        const ttsResponse = await axios.post(
            `${ELEVENLABS_BASE}/text-to-speech/${profile.elevenLabsVoiceId}`,
            {
                text: text.trim(),
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: parseFloat(stability), similarity_boost: parseFloat(similarityBoost), style: parseFloat(style), use_speaker_boost: true },
            },
            { headers: { 'xi-api-key': API_KEY(), Accept: 'audio/mpeg', 'Content-Type': 'application/json' }, responseType: 'arraybuffer' }
        );

        const filename = `generated_${uuidv4()}.mp3`;
        const outputPath = path.join(process.env.GENERATED_DIR || './generated', filename);
        fs.writeFileSync(outputPath, ttsResponse.data);
        setTimeout(() => fs.unlink(outputPath, () => { }), 60 * 60 * 1000);

        // Track usage
        if (req.user) db.incrementUsage(req.user.id);

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.json({ success: true, audioUrl: `${baseUrl}/generated/${filename}`, filename, characterCount: text.trim().length });
    } catch (err) {
        const msg = err.response?.data ? Buffer.from(err.response.data).toString() : err.message;
        let detail = msg;
        try { detail = JSON.parse(msg)?.detail?.message || msg; } catch (_) { }
        next({ status: err.response?.status || 500, message: `Generation failed: ${detail}` });
    }
});

// ── DELETE /api/voices/:id ───────────────────────────────────
router.delete('/voices/:id', optionalAuth, async (req, res, next) => {
    const profile = voiceProfiles.get(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Not found' });
    if (profile.ownerKey !== getUserKey(req)) return res.status(403).json({ error: 'Not your voice profile' });

    try {
        if (API_KEY() && profile.elevenLabsVoiceId && !profile.demo) {
            await axios.delete(`${ELEVENLABS_BASE}/voices/${profile.elevenLabsVoiceId}`, { headers: { 'xi-api-key': API_KEY() } });
        }
        if (profile.filePath) fs.unlink(profile.filePath, () => { });
        voiceProfiles.delete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        next({ status: 500, message: 'Failed to delete voice profile' });
    }
});

module.exports = router;