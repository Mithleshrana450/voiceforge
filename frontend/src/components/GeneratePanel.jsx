import React, { useState } from 'react';
import { Sparkles, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import WaveformBars from './waveformBars';
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
          {result.demo ? <div style={{ background:'rgba(232,196,124,0.08)',border:'1px solid rgba(232,196,124,0.3)',borderRadius:'var(--radius)',padding:'16px',fontSize:'13px',color:'var(--warning)',textAlign:'center' }}>Demo mode â€” add ELEVENLABS_API_KEY to backend/.env</div>
          : <AudioPlayer src={result.audioUrl} filename={result.filename} label="Generated voice output"/>}
        </div>
      )}
    </div>
  );
};
export default GeneratePanel;
