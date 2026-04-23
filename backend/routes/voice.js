const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';
const API_KEY = () => process.env.ELEVENLABS_API_KEY;

const elevenHeaders = () => ({
    'xi-api-key': API_KEY(),
    'Content-Type': 'application/json',
});

// In-memory voice profile store (use a DB in production)
const voiceProfiles = new Map();

// ── Multer storage ──────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = process.env.UPLOAD_DIR || './uploads';
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `voice_${uuidv4()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 25) * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.mp3', '.wav', '.m4a', '.ogg', '.webm'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext) || file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed (MP3, WAV, M4A, OGG, WebM)'));
        }
    }
});

// ── GET /api/voices ─────────────────────────────────────────────
// List saved voice profiles
router.get('/voices', (req, res) => {
    const list = Array.from(voiceProfiles.values()).map(v => ({
        id: v.id,
        name: v.name,
        elevenLabsVoiceId: v.elevenLabsVoiceId,
        createdAt: v.createdAt,
    }));
    res.json({ voices: list });
});

// ── POST /api/upload-voice ──────────────────────────────────────
// Upload audio sample + create ElevenLabs voice clone
router.post('/upload-voice', upload.single('audio'), async (req, res, next) => {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    const voiceName = req.body.name || `Voice ${Date.now()}`;
    const description = req.body.description || 'Cloned voice';

    try {
        if (!API_KEY()) {
            // Demo mode: return a fake profile without calling ElevenLabs
            const profileId = uuidv4();
            const profile = {
                id: profileId,
                name: voiceName,
                elevenLabsVoiceId: `demo_${profileId}`,
                filePath: req.file.path,
                createdAt: new Date().toISOString(),
                demo: true,
            };
            voiceProfiles.set(profileId, profile);
            return res.json({
                success: true,
                voiceProfileId: profileId,
                voiceName,
                demo: true,
                message: 'Demo mode: set ELEVENLABS_API_KEY for real voice cloning',
            });
        }

        // Create voice on ElevenLabs
        const form = new FormData();
        form.append('name', voiceName);
        form.append('description', description);
        form.append('files', fs.createReadStream(req.file.path), {
            filename: req.file.filename,
            contentType: req.file.mimetype || 'audio/mpeg',
        });

        const response = await axios.post(`${ELEVENLABS_BASE}/voices/add`, form, {
            headers: {
                'xi-api-key': API_KEY(),
                ...form.getHeaders(),
            },
        });

        const elevenLabsVoiceId = response.data.voice_id;
        const profileId = uuidv4();

        const profile = {
            id: profileId,
            name: voiceName,
            elevenLabsVoiceId,
            filePath: req.file.path,
            createdAt: new Date().toISOString(),
        };
        voiceProfiles.set(profileId, profile);

        res.json({
            success: true,
            voiceProfileId: profileId,
            elevenLabsVoiceId,
            voiceName,
        });

    } catch (err) {
        // Clean up uploaded file on error
        if (req.file?.path) fs.unlink(req.file.path, () => { });
        const msg = err.response?.data?.detail?.message || err.message;
        next({ status: err.response?.status || 500, message: `Voice upload failed: ${msg}` });
    }
});

// ── POST /api/generate-voice ────────────────────────────────────
// Generate TTS using a cloned voice
router.post('/generate-voice', async (req, res, next) => {
    const { voiceProfileId, text, stability = 0.5, similarityBoost = 0.75, style = 0 } = req.body;

    if (!voiceProfileId) return res.status(400).json({ error: 'voiceProfileId is required' });
    if (!text || text.trim().length === 0) return res.status(400).json({ error: 'text is required' });
    if (text.length > 2500) return res.status(400).json({ error: 'Text too long (max 2500 characters)' });

    const profile = voiceProfiles.get(voiceProfileId);
    if (!profile) return res.status(404).json({ error: 'Voice profile not found' });

    try {
        if (!API_KEY() || profile.demo) {
            // Demo mode: return a placeholder message
            return res.json({
                success: true,
                demo: true,
                message: 'Demo mode: Add ELEVENLABS_API_KEY to generate real audio',
                audioUrl: null,
            });
        }

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
                headers: {
                    ...elevenHeaders(),
                    Accept: 'audio/mpeg',
                },
                responseType: 'arraybuffer',
            }
        );

        const filename = `generated_${uuidv4()}.mp3`;
        const outputPath = path.join(process.env.GENERATED_DIR || './generated', filename);
        fs.writeFileSync(outputPath, ttsResponse.data);

        // Schedule cleanup after 1 hour
        setTimeout(() => fs.unlink(outputPath, () => { }), 60 * 60 * 1000);

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.json({
            success: true,
            audioUrl: `${baseUrl}/generated/${filename}`,
            filename,
            characterCount: text.trim().length,
        });

    } catch (err) {
        const msg = err.response?.data
            ? Buffer.from(err.response.data).toString()
            : err.message;
        let parsed;
        try { parsed = JSON.parse(msg); } catch (_) { }
        const detail = parsed?.detail?.message || msg;
        next({ status: err.response?.status || 500, message: `Generation failed: ${detail}` });
    }
});

// ── DELETE /api/voices/:id ──────────────────────────────────────
router.delete('/voices/:id', async (req, res, next) => {
    const profile = voiceProfiles.get(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Voice profile not found' });

    try {
        if (API_KEY() && !profile.demo) {
            await axios.delete(`${ELEVENLABS_BASE}/voices/${profile.elevenLabsVoiceId}`, {
                headers: elevenHeaders(),
            });
        }
        if (profile.filePath) fs.unlink(profile.filePath, () => { });
        voiceProfiles.delete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        next({ status: 500, message: 'Failed to delete voice profile' });
    }
});

module.exports = router;