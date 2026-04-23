import React, { useState, useRef, useCallback } from 'react';
import { Upload, Mic, MicOff, RotateCcw, Check, AlertCircle, Square } from 'lucide-react';
import { useRecorder } from '../hooks/useRecorder';
import WaveformBars from './WaveformBars';
import AudioPlayer from './AudioPlayer';
import { uploadVoice } from '../hooks/useApi';

const VoiceUploader = ({ onVoiceCreated }) => {
    const [tab, setTab] = useState('upload'); // 'upload' | 'record'
    const [dragOver, setDragOver] = useState(false);
    const [file, setFile] = useState(null);
    const [voiceName, setVoiceName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const fileInputRef = useRef(null);
    const recorder = useRecorder();

    const handleFile = (f) => {
        if (!f) return;
        const allowed = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/x-wav'];
        const ext = f.name.split('.').pop().toLowerCase();
        const allowedExt = ['mp3', 'wav', 'm4a', 'ogg', 'webm'];
        if (!allowed.includes(f.type) && !allowedExt.includes(ext)) {
            setError('Please upload an audio file (MP3, WAV, M4A, OGG)');
            return;
        }
        if (f.size > 25 * 1024 * 1024) {
            setError('File too large. Max 25MB.');
            return;
        }
        setFile(f);
        setError(null);
        if (!voiceName) setVoiceName(f.name.replace(/\.[^/.]+$/, ''));
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    }, []);

    const handleUploadSubmit = async () => {
        const audioFile = tab === 'record'
            ? (recorder.audioBlob ? new File([recorder.audioBlob], 'recording.webm', { type: recorder.audioBlob.type }) : null)
            : file;

        if (!audioFile) return setError('Please provide an audio file or recording.');
        if (!voiceName.trim()) return setError('Please enter a name for this voice.');

        setError(null);
        setUploading(true);
        setUploadProgress(0);

        try {
            const result = await uploadVoice(audioFile, voiceName.trim(), setUploadProgress);
            setSuccess(result);
            onVoiceCreated?.(result);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setVoiceName('');
        setSuccess(null);
        setError(null);
        setUploadProgress(0);
        recorder.clear();
    };

    if (success) {
        return (
            <div className="fade-up" style={{
                background: 'rgba(126,200,160,0.08)',
                border: '1px solid rgba(126,200,160,0.3)',
                borderRadius: 'var(--radius)',
                padding: '24px',
                textAlign: 'center',
            }}>
                <div style={{
                    width: '48px', height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(126,200,160,0.15)',
                    border: '1px solid var(--success)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                }}>
                    <Check size={22} color="var(--success)" />
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '6px' }}>
                    Voice profile created
                </p>
                <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '4px' }}>
                    <strong style={{ color: 'var(--accent)' }}>{success.voiceName}</strong>
                </p>
                {success.demo && (
                    <p style={{ color: 'var(--warning)', fontSize: '12px', marginBottom: '16px' }}>
                        Demo mode active. Add your ElevenLabs API key for real voice cloning.
                    </p>
                )}
                <button onClick={reset} style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text2)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    marginTop: '8px',
                }}>
                    <RotateCcw size={13} /> Add another voice
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Tabs */}
            <div style={{
                display: 'flex',
                background: 'var(--bg3)',
                borderRadius: '10px',
                padding: '4px',
                marginBottom: '20px',
                gap: '4px',
            }}>
                {['upload', 'record'].map(t => (
                    <button
                        key={t}
                        onClick={() => { setTab(t); setError(null); }}
                        style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '7px',
                            border: 'none',
                            background: tab === t ? 'var(--bg4)' : 'transparent',
                            color: tab === t ? 'var(--accent)' : 'var(--text3)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            fontFamily: 'var(--font-body)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            transition: 'var(--transition)',
                            boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                        }}
                    >
                        {t === 'upload' ? <Upload size={13} /> : <Mic size={13} />}
                        {t === 'upload' ? 'Upload file' : 'Record mic'}
                    </button>
                ))}
            </div>

            {/* Upload area */}
            {tab === 'upload' && (
                <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => !file && fileInputRef.current?.click()}
                    style={{
                        border: `2px dashed ${dragOver ? 'var(--accent2)' : file ? 'rgba(126,200,160,0.4)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)',
                        padding: '32px 24px',
                        textAlign: 'center',
                        cursor: file ? 'default' : 'pointer',
                        background: dragOver ? 'var(--accent-glow)' : 'var(--bg3)',
                        transition: 'var(--transition)',
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*,.mp3,.wav,.m4a,.ogg"
                        style={{ display: 'none' }}
                        onChange={e => handleFile(e.target.files[0])}
                    />
                    {file ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                            <div style={{
                                width: '40px', height: '40px',
                                borderRadius: '50%',
                                background: 'rgba(126,200,160,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Check size={18} color="var(--success)" />
                            </div>
                            <p style={{ fontSize: '14px', color: 'var(--text)' }}>{file.name}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text3)' }}>
                                {(file.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                            <button
                                onClick={e => { e.stopPropagation(); setFile(null); }}
                                style={{
                                    background: 'transparent', border: '1px solid var(--border)',
                                    color: 'var(--text3)', padding: '4px 12px', borderRadius: '6px',
                                    cursor: 'pointer', fontSize: '12px',
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    ) : (
                        <>
                            <Upload size={28} color="var(--text3)" style={{ marginBottom: '12px' }} />
                            <p style={{ fontSize: '14px', marginBottom: '6px', color: 'var(--text2)' }}>
                                Drop audio file here or click to browse
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--text3)' }}>MP3, WAV, M4A up to 25MB</p>
                        </>
                    )}
                </div>
            )}

            {/* Record area */}
            {tab === 'record' && (
                <div style={{
                    background: 'var(--bg3)',
                    borderRadius: 'var(--radius)',
                    padding: '28px 24px',
                    textAlign: 'center',
                }}>
                    {recorder.error && (
                        <div style={{
                            background: 'rgba(232,124,124,0.1)',
                            border: '1px solid rgba(232,124,124,0.3)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            fontSize: '13px',
                            color: 'var(--error)',
                            marginBottom: '16px',
                            display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            <AlertCircle size={14} /> {recorder.error}
                        </div>
                    )}

                    {!recorder.audioUrl && !recorder.isRecording && (
                        <>
                            <div style={{
                                width: '64px', height: '64px',
                                borderRadius: '50%',
                                background: 'rgba(232,213,176,0.07)',
                                border: '1px solid var(--border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px',
                            }}>
                                <Mic size={28} color="var(--text3)" />
                            </div>
                            <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '16px' }}>
                                Record at least 30 seconds for best results
                            </p>
                            <button
                                onClick={recorder.start}
                                style={{
                                    background: 'var(--accent)',
                                    border: 'none',
                                    color: 'var(--bg)',
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontFamily: 'var(--font-body)',
                                    fontSize: '14px',
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                }}
                            >
                                <Mic size={15} /> Start recording
                            </button>
                        </>
                    )}

                    {recorder.isRecording && (
                        <>
                            <div style={{ position: 'relative', display: 'inline-flex', marginBottom: '16px' }}>
                                <div style={{
                                    width: '72px', height: '72px',
                                    borderRadius: '50%',
                                    background: 'rgba(232,124,124,0.1)',
                                    border: '1px solid var(--error)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    animation: 'pulse-ring 1.5s ease-in-out infinite',
                                }}>
                                    <Mic size={30} color="var(--error)" />
                                </div>
                            </div>
                            <p style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '24px',
                                color: 'var(--error)',
                                marginBottom: '12px',
                            }}>
                                {recorder.formatDuration(recorder.duration)}
                            </p>
                            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                                <WaveformBars active count={16} color="var(--error)" />
                            </div>
                            <button
                                onClick={recorder.stop}
                                style={{
                                    background: 'rgba(232,124,124,0.1)',
                                    border: '1px solid var(--error)',
                                    color: 'var(--error)',
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontFamily: 'var(--font-body)',
                                    fontSize: '14px',
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                }}
                            >
                                <Square size={14} fill="currentColor" /> Stop
                            </button>
                        </>
                    )}

                    {recorder.audioUrl && !recorder.isRecording && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <p style={{ color: 'var(--success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                <Check size={14} /> Recording ready ({recorder.formatDuration(recorder.duration)})
                            </p>
                            <AudioPlayer src={recorder.audioUrl} label="Preview recording" />
                            <button
                                onClick={recorder.clear}
                                style={{
                                    background: 'transparent', border: '1px solid var(--border)',
                                    color: 'var(--text3)', padding: '6px 14px', borderRadius: '6px',
                                    cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-body)',
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    alignSelf: 'center',
                                }}
                            >
                                <RotateCcw size={12} /> Re-record
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Voice name + submit */}
            {(file || recorder.audioUrl) && (
                <div className="fade-up" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text3)', display: 'block', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                            Voice profile name
                        </label>
                        <input
                            type="text"
                            value={voiceName}
                            onChange={e => setVoiceName(e.target.value)}
                            placeholder="e.g. My Voice, John's Voice..."
                            maxLength={50}
                            style={{
                                width: '100%',
                                background: 'var(--bg3)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '10px 14px',
                                color: 'var(--text)',
                                fontFamily: 'var(--font-body)',
                                fontSize: '14px',
                                outline: 'none',
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--accent2)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />
                    </div>

                    {error && (
                        <div style={{
                            background: 'rgba(232,124,124,0.08)',
                            border: '1px solid rgba(232,124,124,0.25)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            fontSize: '13px',
                            color: 'var(--error)',
                            display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            <AlertCircle size={13} /> {error}
                        </div>
                    )}

                    <button
                        onClick={handleUploadSubmit}
                        disabled={uploading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: uploading ? 'var(--bg4)' : 'var(--accent)',
                            border: 'none',
                            borderRadius: '10px',
                            color: uploading ? 'var(--text3)' : 'var(--bg)',
                            fontWeight: '600',
                            fontFamily: 'var(--font-body)',
                            fontSize: '14px',
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            transition: 'var(--transition)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}
                    >
                        {uploading ? (
                            <>
                                <span style={{
                                    width: '14px', height: '14px',
                                    border: '2px solid var(--text3)',
                                    borderTopColor: 'var(--accent)',
                                    borderRadius: '50%',
                                    display: 'inline-block',
                                    animation: 'spin 0.8s linear infinite',
                                }} />
                                {uploadProgress > 0 ? `Uploading ${uploadProgress}%…` : 'Creating voice profile…'}
                            </>
                        ) : (
                            <><Upload size={15} /> Create voice profile</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default VoiceUploader;