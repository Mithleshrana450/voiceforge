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
