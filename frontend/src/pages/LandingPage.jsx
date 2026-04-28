import React, { useState, useEffect } from 'react';
import { Mic2, Zap, Shield, Globe, ChevronRight, Play, Star, Check, ArrowRight } from 'lucide-react';

const STATS = [
  { value: '10K+', label: 'Voices Cloned' },
  { value: '50K+', label: 'Audio Generated' },
  { value: '99.9%', label: 'Uptime' },
  { value: '150+', label: 'Countries' },
];

const FEATURES = [
  { icon: <Mic2 size={22} />, title: 'Instant Voice Cloning', desc: 'Upload 30 seconds of audio and clone any voice with stunning accuracy using cutting-edge AI.' },
  { icon: <Zap size={22} />, title: 'Lightning Fast', desc: 'Generate full paragraphs of cloned speech in under 3 seconds. No waiting, no queues.' },
  { icon: <Globe size={22} />, title: 'Multilingual', desc: 'Generate speech in 29 languages while preserving the original voice characteristics.' },
  { icon: <Shield size={22} />, title: 'Secure & Private', desc: 'Your voice data is encrypted end-to-end. Delete anytime. We never share your data.' },
];

const TESTIMONIALS = [
  { name: 'Priya S.', role: 'Content Creator', text: 'VoiceForge changed how I produce content. I record once and generate unlimited voiceovers.', stars: 5 },
  { name: 'Rahul M.', role: 'Podcast Host', text: "The voice cloning quality is unreal. My listeners can't tell the AI from my real voice.", stars: 5 },
  { name: 'Sneha K.', role: 'YouTuber', text: 'Finally a tool that works for Indian accents! The quality is perfect for my audience.', stars: 5 },
];

export const PricingCards = ({ onGetStarted, currentPlan, onUpgrade }) => {
  const PLANS = [
    {
      name: 'Free', key: 'free', price: '₹0', period: 'forever', color: 'var(--text2)',
      desc: 'Perfect for trying out VoiceForge',
      features: ['50 generations/month', '10 voice profiles', '1000 chars per generation'],
      cta: 'Get started free', highlight: false,
    },
    {
      name: 'Pro', key: 'pro', price: '₹499', period: '/month', color: 'var(--accent2)',
      desc: 'For serious creators and professionals',
      features: ['500 generations/month', '50 voice profiles', '2500 chars per generation', 'HD quality output', 'Priority support', 'Download MP3/WAV', 'API access'],
      cta: 'Upgrade to Pro', highlight: true,
    },
    {
      name: 'Business', key: 'business', price: '₹1999', period: '/month', color: '#7ec8a0',
      desc: 'For teams and high-volume use',
      features: ['Unlimited generations', 'Unlimited voice profiles', 'Unlimited chars', 'Ultra HD quality', '24/7 dedicated support', 'Team collaboration', 'Custom API integration', 'White-label option'],
      cta: 'Upgrade to Business', highlight: false,
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
      {PLANS.map((plan) => {
        const isCurrent = currentPlan === plan.key;
        return (
          <div key={plan.name} style={{
            background: plan.highlight ? 'rgba(232,213,176,0.04)' : 'var(--bg)',
            border: `1px solid ${plan.highlight ? 'var(--accent2)' : 'var(--border)'}`,
            borderRadius: '20px', padding: '32px 28px', position: 'relative',
            boxShadow: plan.highlight ? '0 0 40px rgba(201,169,110,0.1)' : 'none',
          }}>
            {plan.highlight && (
              <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent2)', color: 'var(--bg)', fontSize: '11px', fontWeight: '700', padding: '4px 14px', borderRadius: '20px', letterSpacing: '0.05em' }}>
                MOST POPULAR
              </div>
            )}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: plan.color, marginBottom: '6px' }}>{plan.name}</h3>
              <p style={{ color: 'var(--text3)', fontSize: '13px', marginBottom: '16px' }}>{plan.desc}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '40px' }}>{plan.price}</span>
                <span style={{ color: 'var(--text3)', fontSize: '14px' }}>{plan.period}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              {plan.features.map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Check size={14} color={plan.color} />
                  <span style={{ fontSize: '13px', color: 'var(--text2)' }}>{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => !isCurrent && (onUpgrade ? onUpgrade(plan.key) : onGetStarted?.())}
              disabled={isCurrent}
              style={{
                width: '100%', padding: '12px',
                background: isCurrent ? 'var(--bg3)' : plan.highlight ? 'var(--accent)' : 'transparent',
                border: `1px solid ${isCurrent ? 'var(--border)' : plan.highlight ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '10px',
                color: isCurrent ? 'var(--text3)' : plan.highlight ? 'var(--bg)' : 'var(--text2)',
                fontWeight: '600', fontFamily: 'var(--font-body)', fontSize: '14px',
                cursor: isCurrent ? 'default' : 'pointer',
              }}>
              {isCurrent ? '✓ Current plan' : plan.cta}
            </button>
          </div>
        );
      })}
    </div>
  );
};

const LandingPage = ({ onGetStarted, onLogin }) => {
  const [visible, setVisible] = useState(false);
  const [playingDemo, setPlayingDemo] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, borderBottom: '1px solid var(--border)', background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(20px)', padding: '0 5%', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(232,213,176,0.12)', border: '1px solid rgba(232,213,176,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mic2 size={17} color="var(--accent)" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px' }}>VoiceForge</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a href="#pricing" style={{ color: 'var(--text3)', fontSize: '14px', textDecoration: 'none', padding: '6px 12px' }}>Pricing</a>
          <button onClick={onLogin} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontFamily: 'var(--font-body)' }}>Sign in</button>
          <button onClick={onGetStarted} style={{ background: 'var(--accent)', border: 'none', color: 'var(--bg)', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-body)' }}>Get started free</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: '140px', paddingBottom: '80px', textAlign: 'center', padding: '140px 5% 80px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(232,213,176,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(30px)', transition: 'all 0.8s ease', maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(232,213,176,0.08)', border: '1px solid rgba(232,213,176,0.2)', borderRadius: '50px', padding: '6px 16px', marginBottom: '28px', fontSize: '13px', color: 'var(--accent2)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }} />
            Now live — Free plan available
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(42px, 7vw, 80px)', lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: '24px' }}>
            Your voice,{' '}
            <span style={{ color: 'var(--accent2)', fontStyle: 'italic' }}>anywhere.</span>
            <br />Instantly.
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2vw, 19px)', color: 'var(--text3)', maxWidth: '520px', margin: '0 auto 40px', lineHeight: 1.7 }}>
            Clone any voice in seconds. Generate unlimited speech. Power your content, products, and ideas with AI.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onGetStarted} style={{ background: 'var(--accent)', border: 'none', color: 'var(--bg)', padding: '14px 32px', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: '700', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              Start for free <ArrowRight size={17} />
            </button>
            <button onClick={() => setPlayingDemo(!playingDemo)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', padding: '14px 28px', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Play size={15} fill="currentColor" /> Hear a demo
            </button>
          </div>
          <p style={{ marginTop: '20px', fontSize: '13px', color: 'var(--text3)' }}>No credit card required · Free forever plan</p>
        </div>
        {/* Waveform demo */}
        <div style={{ maxWidth: '680px', margin: '56px auto 0', opacity: visible ? 1 : 0, transition: 'opacity 1s ease 0.4s' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
              <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>VoiceForge Studio</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '44px', justifyContent: 'center' }}>
              {Array.from({ length: 44 }).map((_, i) => (
                <div key={i} style={{ width: '4px', borderRadius: '2px', background: `hsl(${38 + i * 1.5}, 55%, ${45 + Math.abs(Math.sin(i * 0.7)) * 25}%)`, height: `${18 + Math.abs(Math.sin(i * 0.8 + 1)) * 65}%`, opacity: 0.65 + Math.sin(i * 0.4) * 0.35, animation: playingDemo ? `waveform ${0.5 + (i % 5) * 0.1}s ease-in-out infinite alternate` : 'none', animationDelay: `${i * 0.03}s` }} />
              ))}
            </div>
            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>"Hello, this is my cloned voice."</span>
              <span style={{ fontSize: '12px', color: playingDemo ? 'var(--success)' : 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{playingDemo ? '● PLAYING' : '○ PAUSED'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '56px 5%', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', textAlign: 'center' }}>
          {STATS.map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 4vw, 42px)', color: 'var(--accent)', marginBottom: '6px' }}>{s.value}</div>
              <div style={{ fontSize: '13px', color: 'var(--text3)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '90px 5%', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 46px)', marginBottom: '14px', letterSpacing: '-0.02em' }}>Everything you need to ship</h2>
          <p style={{ color: 'var(--text3)', fontSize: '15px', maxWidth: '460px', margin: '0 auto' }}>Professional voice cloning tools built for creators, developers, and businesses.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '26px 22px', transition: 'border-color 0.2s, transform 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(232,213,176,0.08)', border: '1px solid rgba(232,213,176,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--accent2)' }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', marginBottom: '9px' }}>{f.title}</h3>
              <p style={{ color: 'var(--text3)', fontSize: '13px', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '90px 5%', background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 46px)', marginBottom: '14px', letterSpacing: '-0.02em' }}>Simple, honest pricing</h2>
            <p style={{ color: 'var(--text3)', fontSize: '15px' }}>Start free. Upgrade when you need more.</p>
          </div>
          <PricingCards onGetStarted={onGetStarted} />
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '90px 5%', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 3.5vw, 40px)', textAlign: 'center', marginBottom: '44px', letterSpacing: '-0.02em' }}>Loved by creators</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', gap: '3px', marginBottom: '14px' }}>
                {Array.from({ length: t.stars }).map((_, j) => <Star key={j} size={13} fill="var(--accent2)" color="var(--accent2)" />)}
              </div>
              <p style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: 1.7, marginBottom: '16px', fontStyle: 'italic' }}>"{t.text}"</p>
              <div><p style={{ fontWeight: '600', fontSize: '14px' }}>{t.name}</p><p style={{ color: 'var(--text3)', fontSize: '12px' }}>{t.role}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '90px 5%', textAlign: 'center', background: 'var(--bg2)', borderTop: '1px solid var(--border)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 5vw, 52px)', marginBottom: '18px', letterSpacing: '-0.02em' }}>Ready to clone your voice?</h2>
        <p style={{ color: 'var(--text3)', fontSize: '15px', marginBottom: '32px' }}>Join 10,000+ creators already using VoiceForge.</p>
        <button onClick={onGetStarted} style={{ background: 'var(--accent)', border: 'none', color: 'var(--bg)', padding: '15px 38px', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: '700', fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
          Start for free <ChevronRight size={17} />
        </button>
        <p style={{ marginTop: '14px', fontSize: '13px', color: 'var(--text3)' }}>No credit card required</p>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '28px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mic2 size={15} color="var(--accent2)" /><span style={{ fontFamily: 'var(--font-display)', fontSize: '15px' }}>VoiceForge</span></div>
        <p style={{ color: 'var(--text3)', fontSize: '13px' }}>© 2026 VoiceForge. All rights reserved.</p>
        <div style={{ display: 'flex', gap: '20px' }}>
          {['Privacy', 'Terms', 'Contact'].map(l => <a key={l} href="#" style={{ color: 'var(--text3)', fontSize: '13px', textDecoration: 'none' }}>{l}</a>)}
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;