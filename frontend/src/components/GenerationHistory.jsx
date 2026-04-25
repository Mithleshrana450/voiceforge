import React from 'react';
import { History, Trash2 } from 'lucide-react';
import AudioPlayer from './AudioPlayer';

const GenerationHistory = ({ history, onClear }) => {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden' }}>
      <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={16} color="var(--text3)" />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '2px' }}>Generation History</h2>
        </div>
        <button 
          onClick={onClear}
          style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>
      <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {history.slice().reverse().map((item) => (
          <div key={item.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: 'var(--text3)' }}>
              <span>{item.voiceName}</span>
              <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px', fontStyle: 'italic' }}>
              "{item.text.length > 60 ? item.text.substring(0, 60) + '...' : item.text}"
            </p>
            {item.demo ? (
              <div style={{ fontSize: '11px', color: 'var(--warning)' }}>Demo generated</div>
            ) : (
              <AudioPlayer src={item.audioUrl} filename={item.filename} label="Generated audio" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GenerationHistory;
