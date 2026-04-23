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
              <span>â‘  Upload or record voice</span><span style={{ color:'var(--border)' }}>â†’</span>
              <span>â‘¡ Enter your text</span><span style={{ color:'var(--border)' }}>â†’</span>
              <span>â‘¢ Click Generate</span><span style={{ color:'var(--border)' }}>â†’</span>
              <span style={{ color:'var(--accent2)' }}>â‘£ Download the result</span>
            </div>
          </div>
        </div>
      </div>
      <ToastProvider/>
      <style>{`@media(max-width:768px){main{grid-template-columns:1fr!important;}}`}</style>
    </>
  );
}
