# Run this from: C:\Users\abc\Desktop\MITHLESH\CHATBOT\voiceforge\frontend
# Open PowerShell as Administrator and run: .\fix.ps1

Write-Host "Creating all VoiceForge frontend files..." -ForegroundColor Cyan

# Create folders
New-Item -ItemType Directory -Force -Path "src\components" | Out-Null
New-Item -ItemType Directory -Force -Path "src\hooks" | Out-Null

# ── index.html ──────────────────────────────────────────────
Set-Content -Path "index.html" -Encoding UTF8 -Value @'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VoiceForge</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
'@

# ── vite.config.js ──────────────────────────────────────────
Set-Content -Path "vite.config.js" -Encoding UTF8 -Value @'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'https://voiceforge-backend-aqey.onrender.com', changeOrigin: true },
      '/generated': { target: 'https://voiceforge-backend-aqey.onrender.com', changeOrigin: true }
    }
  }
})
'@

# ── src/index.css ────────────────────────────────────────────
Set-Content -Path "src\index.css" -Encoding UTF8 -Value @'
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #0a0a0f; --bg2: #111118; --bg3: #18181f; --bg4: #1e1e28;
  --border: rgba(255,255,255,0.07); --border-hover: rgba(255,255,255,0.14);
  --accent: #e8d5b0; --accent2: #c9a96e; --accent-glow: rgba(232,213,176,0.15);
  --text: #f0ede8; --text2: #9a9590; --text3: #5a5650;
  --success: #7ec8a0; --error: #e87c7c; --warning: #e8c47c;
  --radius: 12px; --radius-lg: 20px;
  --shadow: 0 4px 24px rgba(0,0,0,0.4); --shadow-lg: 0 8px 48px rgba(0,0,0,0.6);
  --font-display: 'DM Serif Display', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'DM Mono', monospace;
  --transition: 0.2s cubic-bezier(0.4,0,0.2,1);
}
html { font-size: 16px; }
body { font-family: var(--font-body); background: var(--bg); color: var(--text); min-height: 100vh; -webkit-font-smoothing: antialiased; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg2); }
::-webkit-scrollbar-thumb { background: var(--bg4); border-radius: 3px; }
::selection { background: rgba(232,213,176,0.2); color: var(--accent); }
@keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
@keyframes pulse-ring { 0%{transform:scale(1);opacity:.8;} 50%{transform:scale(1.08);opacity:.4;} 100%{transform:scale(1);opacity:.8;} }
@keyframes waveform { 0%,100%{transform:scaleY(0.3);} 50%{transform:scaleY(1);} }
@keyframes spin { to { transform:rotate(360deg); } }
.fade-up { animation: fadeUp 0.5s ease both; }
.fade-up-1 { animation-delay:0.05s; }
.fade-up-2 { animation-delay:0.1s; }
.fade-up-3 { animation-delay:0.15s; }
.fade-up-4 { animation-delay:0.2s; }
'@

# ── src/main.jsx ─────────────────────────────────────────────
Set-Content -Path "src\main.jsx" -Encoding UTF8 -Value @'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
'@

# ── src/hooks/useApi.js ──────────────────────────────────────
Set-Content -Path "src\hooks\useApi.js" -Encoding UTF8 -Value @'
import axios from 'axios';
const BASE = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: BASE });
export const uploadVoice = async (file, name, onProgress) => {
  const form = new FormData();
  form.append('audio', file);
  form.append('name', name || file.name.replace(/\.[^/.]+$/, ''));
  const { data } = await api.post('/upload-voice', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress?.(Math.round((e.loaded / e.total) * 100)),
  });
  return data;
};
export const generateVoice = async ({ voiceProfileId, text, stability, similarityBoost, style }) => {
  const { data } = await api.post('/generate-voice', { voiceProfileId, text, stability, similarityBoost, style });
  return data;
};
export const getVoices = async () => { const { data } = await api.get('/voices'); return data.voices; };
export const deleteVoice = async (id) => { const { data } = await api.delete(`/voices/${id}`); return data; };
export default api;
'@

# ── src/hooks/useRecorder.js ─────────────────────────────────
Set-Content -Path "src\hooks\useRecorder.js" -Encoding UTF8 -Value @'
import { useState, useRef, useCallback } from 'react';
export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const start = useCallback(async () => {
    setError(null); setAudioBlob(null); setAudioUrl(null); setDuration(0); chunks.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' } : {};
      mediaRecorder.current = new MediaRecorder(stream, options);
      mediaRecorder.current.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mediaRecorder.current.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: mediaRecorder.current.mimeType || 'audio/webm' });
        setAudioBlob(blob); setAudioUrl(URL.createObjectURL(blob));
      };
      mediaRecorder.current.start(100);
      startTimeRef.current = Date.now(); setIsRecording(true);
      timerRef.current = setInterval(() => setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000)), 500);
    } catch (err) {
      setError(err.name === 'NotAllowedError' ? 'Microphone access denied.' : `Recording error: ${err.message}`);
    }
  }, []);
  const stop = useCallback(() => {
    if (mediaRecorder.current && isRecording) { mediaRecorder.current.stop(); clearInterval(timerRef.current); setIsRecording(false); }
  }, [isRecording]);
  const clear = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null); setAudioUrl(null); setDuration(0); setError(null);
  }, [audioUrl]);
  const formatDuration = (secs) => `${Math.floor(secs/60).toString().padStart(2,'0')}:${(secs%60).toString().padStart(2,'0')}`;
  return { isRecording, duration, formatDuration, error, audioBlob, audioUrl, start, stop, clear };
};
'@

# ── src/components/WaveformBars.jsx ─────────────────────────
Set-Content -Path "src\components\WaveformBars.jsx" -Encoding UTF8 -Value @'
import React from 'react';
const WaveformBars = ({ active=false, count=12, color='var(--accent)', height=32 }) => (
  <div style={{ display:'flex', alignItems:'center', gap:'3px', height:`${height}px` }}>
    {Array.from({length:count}).map((_,i) => (
      <div key={i} style={{
        width:'3px', borderRadius:'2px', background:color,
        height: active ? `${20+Math.random()*80}%` : '20%',
        animation: active ? `waveform ${0.6+(i%4)*0.15}s ease-in-out infinite alternate` : 'none',
        animationDelay:`${i*0.05}s`, transition:'height 0.3s ease', opacity: active?0.9:0.3,
      }}/>
    ))}
  </div>
);
export default WaveformBars;
'@

# ── src/components/AudioPlayer.jsx ──────────────────────────
Set-Content -Path "src\components\AudioPlayer.jsx" -Encoding UTF8 -Value @'
import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Download, Volume2 } from 'lucide-react';
const AudioPlayer = ({ src, filename='generated_voice.mp3', label }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  useEffect(() => { setPlaying(false); setProgress(0); setCurrentTime(0); }, [src]);
  const togglePlay = () => { if(!audioRef.current)return; playing?audioRef.current.pause():audioRef.current.play(); setPlaying(!playing); };
  const fmt = (s) => { if(!s||isNaN(s))return'0:00'; return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`; };
  return (
    <div style={{ background:'var(--bg4)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px', display:'flex', flexDirection:'column', gap:'12px' }}>
      {label && <div style={{ display:'flex', alignItems:'center', gap:'8px' }}><Volume2 size={14} color="var(--accent2)"/><span style={{ fontSize:'12px', color:'var(--text2)', fontFamily:'var(--font-mono)' }}>{label}</span></div>}
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={togglePlay} style={{ width:'40px',height:'40px',borderRadius:'50%',background:playing?'var(--accent)':'rgba(232,213,176,0.1)',border:'1px solid var(--accent2)',color:playing?'var(--bg)':'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,transition:'var(--transition)' }}>
          {playing?<Pause size={16}/>:<Play size={16}/>}
        </button>
        <div style={{ flex:1 }}>
          <div onClick={e=>{if(!audioRef.current)return;const r=e.currentTarget.getBoundingClientRect();audioRef.current.currentTime=((e.clientX-r.left)/r.width)*audioRef.current.duration;}} style={{ height:'4px',background:'var(--bg3)',borderRadius:'2px',cursor:'pointer',overflow:'hidden' }}>
            <div style={{ height:'100%',width:`${progress}%`,background:'var(--accent2)',borderRadius:'2px',transition:'width 0.1s linear' }}/>
          </div>
          <div style={{ display:'flex',justifyContent:'space-between',marginTop:'4px',fontSize:'11px',color:'var(--text3)',fontFamily:'var(--font-mono)' }}>
            <span>{fmt(currentTime)}</span><span>{fmt(duration)}</span>
          </div>
        </div>
        <button onClick={()=>{const a=document.createElement('a');a.href=src;a.download=filename;a.click();}} style={{ width:'36px',height:'36px',borderRadius:'8px',background:'transparent',border:'1px solid var(--border)',color:'var(--text2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0 }}>
          <Download size={14}/>
        </button>
      </div>
      <audio ref={audioRef} src={src} onTimeUpdate={()=>{if(!audioRef.current)return;setProgress((audioRef.current.currentTime/audioRef.current.duration)*100||0);setCurrentTime(audioRef.current.currentTime||0);}} onLoadedMetadata={()=>setDuration(audioRef.current?.duration||0)} onEnded={()=>setPlaying(false)} style={{ display:'none' }}/>
    </div>
  );
};
export default AudioPlayer;
'@

# ── src/components/Toast.jsx ─────────────────────────────────
Set-Content -Path "src\components\Toast.jsx" -Encoding UTF8 -Value @'
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
const listeners = new Set();
export const toast = {
  success: (msg) => listeners.forEach(fn => fn({ type:'success', msg })),
  error: (msg) => listeners.forEach(fn => fn({ type:'error', msg })),
  warning: (msg) => listeners.forEach(fn => fn({ type:'warning', msg })),
};
const COLORS = {
  success:{ bg:'rgba(126,200,160,0.1)', border:'rgba(126,200,160,0.3)', color:'var(--success)' },
  error:{ bg:'rgba(232,124,124,0.1)', border:'rgba(232,124,124,0.3)', color:'var(--error)' },
  warning:{ bg:'rgba(232,196,124,0.1)', border:'rgba(232,196,124,0.3)', color:'var(--warning)' },
};
let id=0;
const ToastProvider = () => {
  const [toasts,setToasts]=useState([]);
  useEffect(()=>{
    const h=({type,msg})=>{ const i=++id; setToasts(p=>[...p,{i,type,msg}]); setTimeout(()=>setToasts(p=>p.filter(t=>t.i!==i)),4000); };
    listeners.add(h); return()=>listeners.delete(h);
  },[]);
  if(!toasts.length)return null;
  return (
    <div style={{ position:'fixed',bottom:'24px',right:'24px',zIndex:9999,display:'flex',flexDirection:'column',gap:'8px',maxWidth:'360px' }}>
      {toasts.map(t=>{ const c=COLORS[t.type]; return (
        <div key={t.i} className="fade-up" style={{ background:c.bg,border:`1px solid ${c.border}`,borderRadius:'10px',padding:'12px 16px',display:'flex',alignItems:'center',gap:'10px',color:c.color,fontSize:'13px' }}>
          <span style={{ flex:1,color:'var(--text2)' }}>{t.msg}</span>
          <button onClick={()=>setToasts(p=>p.filter(x=>x.i!==t.i))} style={{ background:'none',border:'none',color:'var(--text3)',cursor:'pointer',display:'flex',padding:'2px' }}><X size={13}/></button>
        </div>
      );})}
    </div>
  );
};
export default ToastProvider;
'@

# ── src/components/VoiceUploader.jsx ────────────────────────
Set-Content -Path "src\components\VoiceUploader.jsx" -Encoding UTF8 -Value @'
import React, { useState, useRef, useCallback } from 'react';
import { Upload, Mic, RotateCcw, Check, AlertCircle, Square } from 'lucide-react';
import { useRecorder } from '../hooks/useRecorder';
import AudioPlayer from './AudioPlayer';
import { uploadVoice } from '../hooks/useApi';

const VoiceUploader = ({ onVoiceCreated }) => {
  const [tab, setTab] = useState('upload');
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
    if (f.size > 25*1024*1024) { setError('File too large. Max 25MB.'); return; }
    setFile(f); setError(null);
    if (!voiceName) setVoiceName(f.name.replace(/\.[^/.]+$/, ''));
  };

  const handleDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }, []);

  const handleSubmit = async () => {
    const audioFile = tab==='record' ? (recorder.audioBlob ? new File([recorder.audioBlob],'recording.webm',{type:recorder.audioBlob.type}) : null) : file;
    if (!audioFile) return setError('Please provide an audio file or recording.');
    if (!voiceName.trim()) return setError('Please enter a name for this voice.');
    setError(null); setUploading(true); setUploadProgress(0);
    try {
      const result = await uploadVoice(audioFile, voiceName.trim(), setUploadProgress);
      setSuccess(result); onVoiceCreated?.(result);
    } catch (err) { setError(err.response?.data?.error || err.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const reset = () => { setFile(null); setVoiceName(''); setSuccess(null); setError(null); setUploadProgress(0); recorder.clear(); };

  if (success) return (
    <div className="fade-up" style={{ background:'rgba(126,200,160,0.08)',border:'1px solid rgba(126,200,160,0.3)',borderRadius:'var(--radius)',padding:'24px',textAlign:'center' }}>
      <Check size={32} color="var(--success)" style={{ margin:'0 auto 12px' }}/>
      <p style={{ fontFamily:'var(--font-display)',fontSize:'18px',marginBottom:'6px' }}>Voice profile created!</p>
      <p style={{ color:'var(--accent)',fontSize:'14px',marginBottom:'4px' }}>{success.voiceName}</p>
      {success.demo && <p style={{ color:'var(--warning)',fontSize:'12px',marginBottom:'12px' }}>Demo mode — add ElevenLabs API key for real cloning.</p>}
      <button onClick={reset} style={{ background:'transparent',border:'1px solid var(--border)',color:'var(--text2)',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px',display:'inline-flex',alignItems:'center',gap:'6px',marginTop:'8px' }}>
        <RotateCcw size={13}/> Add another voice
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ display:'flex',background:'var(--bg3)',borderRadius:'10px',padding:'4px',marginBottom:'20px',gap:'4px' }}>
        {['upload','record'].map(t => (
          <button key={t} onClick={()=>{setTab(t);setError(null);}} style={{ flex:1,padding:'8px',borderRadius:'7px',border:'none',background:tab===t?'var(--bg4)':'transparent',color:tab===t?'var(--accent)':'var(--text3)',cursor:'pointer',fontSize:'13px',fontWeight:'500',fontFamily:'var(--font-body)',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',transition:'var(--transition)' }}>
            {t==='upload'?<Upload size={13}/>:<Mic size={13}/>} {t==='upload'?'Upload file':'Record mic'}
          </button>
        ))}
      </div>

      {tab==='upload' && (
        <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop} onClick={()=>!file&&fileInputRef.current?.click()}
          style={{ border:`2px dashed ${dragOver?'var(--accent2)':file?'rgba(126,200,160,0.4)':'var(--border)'}`,borderRadius:'var(--radius)',padding:'32px 24px',textAlign:'center',cursor:file?'default':'pointer',background:dragOver?'var(--accent-glow)':'var(--bg3)',transition:'var(--transition)' }}>
          <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg" style={{ display:'none' }} onChange={e=>handleFile(e.target.files[0])}/>
          {file ? (
            <div style={{ display:'flex',flexDirection:'column',gap:'8px',alignItems:'center' }}>
              <Check size={24} color="var(--success)"/>
              <p style={{ fontSize:'14px' }}>{file.name}</p>
              <p style={{ fontSize:'12px',color:'var(--text3)' }}>{(file.size/1024/1024).toFixed(1)} MB</p>
              <button onClick={e=>{e.stopPropagation();setFile(null);}} style={{ background:'transparent',border:'1px solid var(--border)',color:'var(--text3)',padding:'4px 12px',borderRadius:'6px',cursor:'pointer',fontSize:'12px' }}>Remove</button>
            </div>
          ) : (
            <><Upload size={28} color="var(--text3)" style={{ marginBottom:'12px' }}/><p style={{ fontSize:'14px',marginBottom:'6px',color:'var(--text2)' }}>Drop audio file or click to browse</p><p style={{ fontSize:'12px',color:'var(--text3)' }}>MP3, WAV, M4A up to 25MB</p></>
          )}
        </div>
      )}

      {tab==='record' && (
        <div style={{ background:'var(--bg3)',borderRadius:'var(--radius)',padding:'28px 24px',textAlign:'center' }}>
          {recorder.error && <div style={{ background:'rgba(232,124,124,0.1)',border:'1px solid rgba(232,124,124,0.3)',borderRadius:'8px',padding:'10px 14px',fontSize:'13px',color:'var(--error)',marginBottom:'16px' }}>{recorder.error}</div>}
          {!recorder.audioUrl && !recorder.isRecording && (
            <><Mic size={32} color="var(--text3)" style={{ margin:'0 auto 16px' }}/><p style={{ color:'var(--text2)',fontSize:'14px',marginBottom:'16px' }}>Record 30+ seconds for best results</p>
            <button onClick={recorder.start} style={{ background:'var(--accent)',border:'none',color:'var(--bg)',padding:'10px 24px',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontFamily:'var(--font-body)',fontSize:'14px',display:'inline-flex',alignItems:'center',gap:'8px' }}><Mic size={15}/> Start recording</button></>
          )}
          {recorder.isRecording && (
            <><div style={{ width:'64px',height:'64px',borderRadius:'50%',background:'rgba(232,124,124,0.1)',border:'1px solid var(--error)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',animation:'pulse-ring 1.5s ease-in-out infinite' }}><Mic size={28} color="var(--error)"/></div>
            <p style={{ fontFamily:'var(--font-mono)',fontSize:'24px',color:'var(--error)',marginBottom:'16px' }}>{recorder.formatDuration(recorder.duration)}</p>
            <button onClick={recorder.stop} style={{ background:'rgba(232,124,124,0.1)',border:'1px solid var(--error)',color:'var(--error)',padding:'10px 24px',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontFamily:'var(--font-body)',fontSize:'14px',display:'inline-flex',alignItems:'center',gap:'8px' }}><Square size={14} fill="currentColor"/> Stop</button></>
          )}
          {recorder.audioUrl && !recorder.isRecording && (
            <div style={{ display:'flex',flexDirection:'column',gap:'12px' }}>
              <p style={{ color:'var(--success)',fontSize:'13px' }}>✓ Recording ready ({recorder.formatDuration(recorder.duration)})</p>
              <AudioPlayer src={recorder.audioUrl} label="Preview recording"/>
              <button onClick={recorder.clear} style={{ background:'transparent',border:'1px solid var(--border)',color:'var(--text3)',padding:'6px 14px',borderRadius:'6px',cursor:'pointer',fontSize:'12px',fontFamily:'var(--font-body)',display:'inline-flex',alignItems:'center',gap:'6px',alignSelf:'center' }}><RotateCcw size={12}/> Re-record</button>
            </div>
          )}
        </div>
      )}

      {(file || recorder.audioUrl) && (
        <div className="fade-up" style={{ marginTop:'16px',display:'flex',flexDirection:'column',gap:'12px' }}>
          <div>
            <label style={{ fontSize:'12px',color:'var(--text3)',display:'block',marginBottom:'6px',fontFamily:'var(--font-mono)' }}>Voice profile name</label>
            <input type="text" value={voiceName} onChange={e=>setVoiceName(e.target.value)} placeholder="e.g. My Voice" maxLength={50}
              style={{ width:'100%',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'8px',padding:'10px 14px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'14px',outline:'none' }}
              onFocus={e=>e.target.style.borderColor='var(--accent2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
          </div>
          {error && <div style={{ background:'rgba(232,124,124,0.08)',border:'1px solid rgba(232,124,124,0.25)',borderRadius:'8px',padding:'10px 14px',fontSize:'13px',color:'var(--error)',display:'flex',alignItems:'center',gap:'8px' }}><AlertCircle size={13}/> {error}</div>}
          <button onClick={handleSubmit} disabled={uploading} style={{ width:'100%',padding:'12px',background:uploading?'var(--bg4)':'var(--accent)',border:'none',borderRadius:'10px',color:uploading?'var(--text3)':'var(--bg)',fontWeight:'600',fontFamily:'var(--font-body)',fontSize:'14px',cursor:uploading?'not-allowed':'pointer',transition:'var(--transition)',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px' }}>
            {uploading?<><span style={{ width:'14px',height:'14px',border:'2px solid var(--text3)',borderTopColor:'var(--accent)',borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite' }}/>{uploadProgress>0?`Uploading ${uploadProgress}%...`:'Creating...'}</>:<><Upload size={15}/> Create voice profile</>}
          </button>
        </div>
      )}
    </div>
  );
};
export default VoiceUploader;
'@

# ── src/components/GeneratePanel.jsx ────────────────────────
Set-Content -Path "src\components\GeneratePanel.jsx" -Encoding UTF8 -Value @'
import React, { useState } from 'react';
import { Sparkles, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import WaveformBars from './WaveformBars';
import { generateVoice } from '../hooks/useApi';
import { toast } from './Toast';

const GeneratePanel = ({ voices, selectedVoiceId, onSelectVoice, onGenerated }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [showAdv, setShowAdv] = useState(false);
  const [stability, setStability] = useState(0.5);
  const [similarity, setSimilarity] = useState(0.75);
  const [style, setStyle] = useState(0);
  const MAX = 2500;

  const handleGenerate = async () => {
    if (!selectedVoiceId) return setError('Select a voice profile first.');
    if (!text.trim()) return setError('Enter some text to generate.');
    if (text.length > MAX) return setError('Text too long.');
    setError(null); setLoading(true); setResult(null);
    try {
      const data = await generateVoice({ voiceProfileId:selectedVoiceId, text:text.trim(), stability, similarityBoost:similarity, style });
      setResult(data);
      const voice = voices.find(v=>v.id===selectedVoiceId);
      onGenerated?.({ id:Date.now(), timestamp:new Date().toISOString(), voiceName:voice?.name||'Unknown', text:text.trim(), audioUrl:data.audioUrl, filename:data.filename, demo:data.demo });
      if (!data.demo) toast.success('Audio generated!');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Generation failed';
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:'16px' }}>
      {voices.length===0 ? (
        <div style={{ background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'16px',fontSize:'13px',color:'var(--text3)',textAlign:'center' }}>Create a voice profile first</div>
      ) : (
        <div>
          <label style={{ fontSize:'12px',color:'var(--text3)',display:'block',marginBottom:'8px',fontFamily:'var(--font-mono)' }}>Voice profile</label>
          <div style={{ display:'flex',flexDirection:'column',gap:'6px' }}>
            {voices.map(v => (
              <button key={v.id} onClick={()=>onSelectVoice(v.id)} style={{ width:'100%',padding:'10px 14px',background:selectedVoiceId===v.id?'rgba(232,213,176,0.08)':'var(--bg3)',border:`1px solid ${selectedVoiceId===v.id?'var(--accent2)':'var(--border)'}`,borderRadius:'8px',color:selectedVoiceId===v.id?'var(--accent)':'var(--text2)',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:'13px',textAlign:'left',display:'flex',alignItems:'center',gap:'10px',transition:'var(--transition)' }}>
                <WaveformBars active={selectedVoiceId===v.id} count={4} height={18} color={selectedVoiceId===v.id?'var(--accent2)':'var(--text3)'}/>
                <span>{v.name}</span>
                {v.demo && <span style={{ marginLeft:'auto',fontSize:'10px',background:'rgba(232,196,124,0.15)',color:'var(--warning)',border:'1px solid rgba(232,196,124,0.3)',padding:'2px 7px',borderRadius:'4px' }}>demo</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label style={{ fontSize:'12px',color:'var(--text3)',display:'block',marginBottom:'6px',fontFamily:'var(--font-mono)' }}>Text to speak</label>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Type the text you want to hear in the cloned voice..." rows={5}
          style={{ width:'100%',background:'var(--bg3)',border:`1px solid ${text.length>MAX?'var(--error)':'var(--border)'}`,borderRadius:'10px',padding:'12px 14px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'14px',lineHeight:'1.6',resize:'vertical',outline:'none' }}
          onFocus={e=>e.target.style.borderColor='var(--accent2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
        <div style={{ textAlign:'right',fontSize:'11px',color:text.length>MAX?'var(--error)':'var(--text3)',fontFamily:'var(--font-mono)',marginTop:'4px' }}>{text.length}/{MAX}</div>
      </div>

      <button onClick={()=>setShowAdv(!showAdv)} style={{ background:'transparent',border:'1px solid var(--border)',borderRadius:'8px',color:'var(--text3)',padding:'8px 14px',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:'12px',display:'flex',alignItems:'center',gap:'6px',width:'100%',justifyContent:'center' }}>
        Voice settings {showAdv?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
      </button>

      {showAdv && (
        <div className="fade-up" style={{ background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'16px',display:'flex',flexDirection:'column',gap:'14px' }}>
          {[['Stability',stability,setStability],['Similarity boost',similarity,setSimilarity],['Style',style,setStyle]].map(([label,val,setter])=>(
            <div key={label}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'6px' }}>
                <label style={{ fontSize:'12px',color:'var(--text3)',fontFamily:'var(--font-mono)' }}>{label}</label>
                <span style={{ fontSize:'12px',color:'var(--accent2)',fontFamily:'var(--font-mono)' }}>{val.toFixed(2)}</span>
              </div>
              <input type="range" min={0} max={1} step={0.05} value={val} onChange={e=>setter(parseFloat(e.target.value))} style={{ width:'100%',accentColor:'var(--accent2)' }}/>
            </div>
          ))}
        </div>
      )}

      {error && <div style={{ background:'rgba(232,124,124,0.08)',border:'1px solid rgba(232,124,124,0.25)',borderRadius:'8px',padding:'10px 14px',fontSize:'13px',color:'var(--error)',display:'flex',alignItems:'center',gap:'8px' }}><AlertCircle size={13}/> {error}</div>}

      <button onClick={handleGenerate} disabled={loading||voices.length===0} style={{ width:'100%',padding:'14px',background:loading||voices.length===0?'var(--bg4)':'var(--accent)',border:'none',borderRadius:'12px',color:loading||voices.length===0?'var(--text3)':'var(--bg)',fontWeight:'700',fontFamily:'var(--font-body)',fontSize:'15px',cursor:loading||voices.length===0?'not-allowed':'pointer',transition:'var(--transition)',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px' }}>
        {loading?<><span style={{ width:'16px',height:'16px',border:'2px solid var(--text3)',borderTopColor:'var(--accent)',borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite' }}/>Generating...</>:<><Sparkles size={16}/> Generate voice</>}
      </button>

      {result && (
        <div className="fade-up">
          {result.demo ? <div style={{ background:'rgba(232,196,124,0.08)',border:'1px solid rgba(232,196,124,0.3)',borderRadius:'var(--radius)',padding:'16px',fontSize:'13px',color:'var(--warning)',textAlign:'center' }}>Demo mode — add ELEVENLABS_API_KEY to backend/.env</div>
          : <AudioPlayer src={result.audioUrl} filename={result.filename} label="Generated voice output"/>}
        </div>
      )}
    </div>
  );
};
export default GeneratePanel;
'@

# ── src/App.jsx ──────────────────────────────────────────────
Set-Content -Path "src\App.jsx" -Encoding UTF8 -Value @'
import React, { useState, useEffect } from 'react';
import { Mic2, Trash2, RefreshCw } from 'lucide-react';
import VoiceUploader from './components/VoiceUploader';
import GeneratePanel from './components/GeneratePanel';
import ToastProvider, { toast } from './components/Toast';
import { getVoices, deleteVoice } from './hooks/useApi';

export default function App() {
  const [voices, setVoices] = useState([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState(null);
  const [history, setHistory] = useState([]);
  const [backendOnline, setBackendOnline] = useState(null);

  const fetchVoices = async () => {
    try { const list = await getVoices(); setVoices(list); setBackendOnline(true); if(list.length>0&&!selectedVoiceId) setSelectedVoiceId(list[list.length-1].id); }
    catch(_) { setBackendOnline(false); }
  };

  useEffect(() => { fetchVoices(); }, []);

  const handleVoiceCreated = (result) => {
    const v = { id:result.voiceProfileId, name:result.voiceName, demo:result.demo, createdAt:new Date().toISOString() };
    setVoices(prev=>[...prev,v]); setSelectedVoiceId(v.id);
    toast.success(`Voice "${result.voiceName}" created!`);
  };

  const handleDelete = async (id,e) => {
    e.stopPropagation();
    if(!confirm('Delete this voice profile?'))return;
    try { await deleteVoice(id); setVoices(prev=>prev.filter(v=>v.id!==id)); if(selectedVoiceId===id) setSelectedVoiceId(null); toast.success('Deleted'); }
    catch(_) { toast.error('Delete failed'); }
  };

  return (
    <>
      <div style={{ minHeight:'100vh',display:'flex',flexDirection:'column' }}>
        <div style={{ position:'fixed',inset:0,zIndex:0,pointerEvents:'none',background:'radial-gradient(ellipse 60% 40% at 15% 15%,rgba(232,213,176,0.04) 0%,transparent 60%),radial-gradient(ellipse 50% 50% at 85% 80%,rgba(126,160,200,0.04) 0%,transparent 60%),var(--bg)' }}/>
        <div style={{ position:'relative',zIndex:1,flex:1,display:'flex',flexDirection:'column' }}>
          <header style={{ borderBottom:'1px solid var(--border)',padding:'0 24px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(10,10,15,0.85)',backdropFilter:'blur(16px)',position:'sticky',top:0,zIndex:10 }}>
            <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
              <div style={{ width:'32px',height:'32px',borderRadius:'8px',background:'rgba(232,213,176,0.1)',border:'1px solid rgba(232,213,176,0.2)',display:'flex',alignItems:'center',justifyContent:'center' }}><Mic2 size={16} color="var(--accent)"/></div>
              <span style={{ fontFamily:'var(--font-display)',fontSize:'18px' }}>VoiceForge</span>
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
              {backendOnline!==null && <div style={{ display:'flex',alignItems:'center',gap:'5px',fontSize:'11px',fontFamily:'var(--font-mono)',color:backendOnline?'var(--success)':'var(--error)' }}>
                <span style={{ width:'6px',height:'6px',borderRadius:'50%',background:backendOnline?'var(--success)':'var(--error)',boxShadow:backendOnline?'0 0 6px var(--success)':'0 0 6px var(--error)' }}/>
                {backendOnline?'API online':'API offline'}
              </div>}
              <span style={{ fontSize:'11px',color:'var(--text3)',fontFamily:'var(--font-mono)',background:'var(--bg3)',border:'1px solid var(--border)',padding:'3px 8px',borderRadius:'5px' }}>ElevenLabs</span>
            </div>
          </header>

          <div className="fade-up" style={{ textAlign:'center',padding:'48px 24px 8px' }}>
            <h1 style={{ fontFamily:'var(--font-display)',fontSize:'clamp(26px,4.5vw,46px)',lineHeight:1.15,letterSpacing:'-0.02em',marginBottom:'12px' }}>
              Clone any voice.{' '}<span style={{ color:'var(--accent2)',fontStyle:'italic' }}>Speak anything.</span>
            </h1>
            <p style={{ fontSize:'15px',color:'var(--text3)',maxWidth:'460px',margin:'0 auto' }}>Upload a voice sample or record yourself, then generate speech using AI.</p>
          </div>

          <main style={{ flex:1,maxWidth:'1120px',width:'100%',margin:'0 auto',padding:'32px 24px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',alignItems:'start' }}>
            <div className="fade-up fade-up-1" style={{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden' }}>
              <div style={{ padding:'20px 24px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                <div><h2 style={{ fontFamily:'var(--font-display)',fontSize:'20px',marginBottom:'2px' }}>Voice Profiles</h2><p style={{ fontSize:'12px',color:'var(--text3)' }}>Upload or record a sample</p></div>
                {voices.length>0 && <button onClick={fetchVoices} style={{ background:'transparent',border:'1px solid var(--border)',borderRadius:'8px',color:'var(--text3)',width:'32px',height:'32px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}><RefreshCw size={13}/></button>}
              </div>
              {voices.length>0 && (
                <div style={{ borderBottom:'1px solid var(--border)',padding:'12px 16px',display:'flex',flexDirection:'column',gap:'5px',maxHeight:'180px',overflowY:'auto' }}>
                  <p style={{ fontSize:'11px',color:'var(--text3)',fontFamily:'var(--font-mono)',padding:'0 4px 4px' }}>Saved ({voices.length})</p>
                  {voices.map(v => (
                    <div key={v.id} onClick={()=>setSelectedVoiceId(v.id)} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',borderRadius:'8px',cursor:'pointer',background:selectedVoiceId===v.id?'rgba(232,213,176,0.06)':'var(--bg3)',border:`1px solid ${selectedVoiceId===v.id?'rgba(232,213,176,0.15)':'transparent'}` }}>
                      <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
                        <span style={{ width:'6px',height:'6px',borderRadius:'50%',background:selectedVoiceId===v.id?'var(--accent2)':'var(--text3)' }}/>
                        <span style={{ fontSize:'13px',color:selectedVoiceId===v.id?'var(--accent)':'var(--text2)' }}>{v.name}</span>
                        {v.demo && <span style={{ fontSize:'10px',background:'rgba(232,196,124,0.12)',color:'var(--warning)',border:'1px solid rgba(232,196,124,0.25)',padding:'1px 6px',borderRadius:'4px' }}>demo</span>}
                      </div>
                      <button onClick={e=>handleDelete(v.id,e)} style={{ background:'transparent',border:'none',color:'var(--text3)',cursor:'pointer',padding:'3px',display:'flex',borderRadius:'4px' }} onMouseEnter={e=>e.currentTarget.style.color='var(--error)'} onMouseLeave={e=>e.currentTarget.style.color='var(--text3)'}><Trash2 size={12}/></button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ padding:'20px 24px 24px' }}><VoiceUploader onVoiceCreated={handleVoiceCreated}/></div>
            </div>

            <div className="fade-up fade-up-2" style={{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden' }}>
              <div style={{ padding:'20px 24px 16px',borderBottom:'1px solid var(--border)' }}>
                <h2 style={{ fontFamily:'var(--font-display)',fontSize:'20px',marginBottom:'2px' }}>Generate Speech</h2>
                <p style={{ fontSize:'12px',color:'var(--text3)' }}>Type text, hear the cloned voice</p>
              </div>
              <div style={{ padding:'20px 24px 24px' }}>
                <GeneratePanel voices={voices} selectedVoiceId={selectedVoiceId} onSelectVoice={setSelectedVoiceId} onGenerated={item=>setHistory(prev=>[...prev,item])}/>
              </div>
            </div>
          </main>

          <div className="fade-up fade-up-4" style={{ textAlign:'center',padding:'0 24px 40px' }}>
            <div style={{ display:'inline-flex',alignItems:'center',flexWrap:'wrap',justifyContent:'center',gap:'8px 20px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'50px',padding:'10px 28px',fontSize:'12px',color:'var(--text3)' }}>
              <span>① Upload or record voice</span><span style={{ color:'var(--border)' }}>→</span>
              <span>② Enter your text</span><span style={{ color:'var(--border)' }}>→</span>
              <span>③ Click Generate</span><span style={{ color:'var(--border)' }}>→</span>
              <span style={{ color:'var(--accent2)' }}>④ Download the result</span>
            </div>
          </div>
        </div>
      </div>
      <ToastProvider/>
      <style>{`@media(max-width:768px){main{grid-template-columns:1fr!important;}}`}</style>
    </>
  );
}
'@

Write-Host ""
Write-Host "All files created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Now run: npm run dev" -ForegroundColor Cyan
Write-Host "Then open: http://localhost:5173" -ForegroundColor Cyan
