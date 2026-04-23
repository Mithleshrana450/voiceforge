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
