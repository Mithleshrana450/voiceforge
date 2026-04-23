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
