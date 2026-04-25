// src/pages/Dashboard.jsx
// Uses Firebase auth state and Firestore for real data
import React, { useState, useEffect } from 'react';
import { Mic2, LogOut, CreditCard, User, Zap, RefreshCw, Trash2, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logOut, upgradePlan, PLAN_LIMITS } from '../firebase/authService';
import { PricingCards } from './LandingPage';
import VoiceUploader from '../components/VoiceUploader';
import GeneratePanel from '../components/GeneratePanel';
import GenerationHistory from '../components/GenerationHistory';
import ToastProvider, { toast } from '../components/Toast';
import { getVoices, deleteVoice, API_BASE_URL } from '../hooks/useApi';

const Dashboard = () => {
  const { user, refreshUserDoc } = useAuth();
  const [tab,        setTab]        = useState('studio');
  const [voices,     setVoices]     = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [history,    setHistory]    = useState([]);
  const [payLoading, setPayLoading] = useState(false);

  const plan   = user?.plan   || 'free';
  const limits = user?.limits || PLAN_LIMITS.free;
  const usage  = user?.usage  || { generations: 0 };

  useEffect(() => { fetchVoices(); }, []);

  const fetchVoices = async () => {
    try {
      const list = await getVoices();
      setVoices(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[list.length - 1].id);
    } catch (_) {}
  };

  const handleVoiceCreated = (result) => {
    if (voices.length >= limits.voices && limits.voices !== Infinity) {
      toast.error(`Your ${plan} plan allows ${limits.voices} voice profile(s). Upgrade to add more.`);
      return;
    }
    const v = { id: result.voiceProfileId, name: result.voiceName, demo: result.demo, createdAt: new Date().toISOString() };
    setVoices(prev => [...prev, v]);
    setSelectedId(v.id);
    toast.success(`Voice "${result.voiceName}" created!`);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this voice profile?')) return;
    try {
      await deleteVoice(id);
      setVoices(prev => prev.filter(v => v.id !== id));
      if (selectedId === id) setSelectedId(null);
      toast.success('Voice profile deleted');
    } catch (_) { toast.error('Failed to delete'); }
  };

  const handleGenerated = async (item) => {
    setHistory(prev => [...prev, item]);
    await refreshUserDoc(); // refresh usage from Firestore
  };

  // ── Razorpay upgrade ──────────────────────────────────────
  const handleUpgrade = async (newPlan) => {
    if (newPlan === 'free' || newPlan === plan) return;
    setPayLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.firebaseUser?.getIdToken()}` },
        body: JSON.stringify({ plan: newPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const options = {
        key:         data.razorpayKey,
        amount:      data.amount,
        currency:    'INR',
        name:        'VoiceForge',
        description: `${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)} Plan`,
        order_id:    data.orderId,
        handler: async (response) => {
          try {
            // Save to Firestore directly
            await upgradePlan(user.uid, newPlan);
            await refreshUserDoc();
            toast.success(`🎉 Upgraded to ${newPlan} plan!`);
          } catch (_) { toast.error('Plan update failed. Contact support.'); }
        },
        prefill: { name: user.name, email: user.email },
        theme:   { color: '#c9a96e' },
        modal:   { ondismiss: () => setPayLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.message || 'Payment failed');
      setPayLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await logOut(); } catch (_) {}
  };

  const usagePct  = limits.generations === Infinity ? 0 : Math.min((usage.generations / limits.generations) * 100, 100);
  const nearLimit = usagePct >= 80;
  const atLimit   = limits.generations !== Infinity && usage.generations >= limits.generations;

  const NavBtn = ({ id, icon, label }) => (
    <button onClick={() => setTab(id)} style={{ width: '100%', padding: '9px 14px', background: tab === id ? 'rgba(232,213,176,0.08)' : 'transparent', border: `1px solid ${tab === id ? 'rgba(232,213,176,0.15)' : 'transparent'}`, borderRadius: '8px', color: tab === id ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: tab === id ? '600' : '400', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', transition: 'all 0.15s' }}>
      {icon} {label}
    </button>
  );

  return (
    <>
      <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
        {/* Sidebar */}
        <aside style={{ width: '220px', flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '20px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px', padding: '4px 6px' }}>
            <Mic2 size={17} color="var(--accent)" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '17px' }}>VoiceForge</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <NavBtn id="studio"  icon={<Mic2 size={14} />}       label="Studio" />
            <NavBtn id="billing" icon={<CreditCard size={14} />}  label="Billing" />
            <NavBtn id="account" icon={<User size={14} />}        label="Account" />
          </div>

          {/* Usage meter */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>Generations</span>
              <span style={{ fontSize: '11px', color: nearLimit ? 'var(--warning)' : 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                {usage.generations}/{limits.generations === Infinity ? '∞' : limits.generations}
              </span>
            </div>
            <div style={{ height: '4px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${usagePct}%`, background: nearLimit ? 'var(--warning)' : 'var(--accent2)', borderRadius: '2px', transition: 'width 0.5s' }} />
            </div>
            {nearLimit && plan !== 'business' && (
              <button onClick={() => setTab('billing')} style={{ width: '100%', marginTop: '8px', padding: '6px', background: 'rgba(232,196,124,0.1)', border: '1px solid rgba(232,196,124,0.3)', borderRadius: '6px', color: 'var(--warning)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <Zap size={11} /> Upgrade now
              </button>
            )}
          </div>

          {/* Plan badge */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '3px' }}>Current plan</div>
            <div style={{ fontWeight: '600', fontSize: '13px', color: plan === 'free' ? 'var(--text2)' : plan === 'pro' ? 'var(--accent2)' : 'var(--success)', textTransform: 'capitalize' }}>{plan}</div>
          </div>

          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text3)', padding: '9px 14px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'border-color 0.2s, color 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,124,124,0.4)'; e.currentTarget.style.color = 'var(--error)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)'; }}>
            <LogOut size={13} /> Sign out
          </button>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflow: 'auto', padding: '32px' }}>

          {/* ── STUDIO ── */}
          {tab === 'studio' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', marginBottom: '4px' }}>
                  Welcome back, {user?.name?.split(' ')[0] || 'there'} 👋
                </h1>
                <p style={{ color: 'var(--text3)', fontSize: '14px' }}>Clone voices and generate speech below.</p>
              </div>

              {atLimit && (
                <div style={{ background: 'rgba(232,124,124,0.07)', border: '1px solid rgba(232,124,124,0.2)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ color: 'var(--error)', fontSize: '14px' }}>You've used all {limits.generations} generations this month.</span>
                  <button onClick={() => setTab('billing')} style={{ background: 'var(--accent)', border: 'none', color: 'var(--bg)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={13} /> Upgrade plan
                  </button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                {/* Voice Profiles */}
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden' }}>
                  <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '2px' }}>Voice Profiles</h2>
                      <p style={{ fontSize: '12px', color: 'var(--text3)' }}>{voices.length}/{limits.voices === Infinity ? '∞' : limits.voices} used</p>
                    </div>
                    <button onClick={fetchVoices} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text3)', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <RefreshCw size={12} />
                    </button>
                  </div>
                  {voices.length > 0 && (
                    <div style={{ borderBottom: '1px solid var(--border)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '160px', overflowY: 'auto' }}>
                      {voices.map(v => (
                        <div key={v.id} onClick={() => setSelectedId(v.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: '7px', cursor: 'pointer', background: selectedId === v.id ? 'rgba(232,213,176,0.06)' : 'var(--bg3)', border: `1px solid ${selectedId === v.id ? 'rgba(232,213,176,0.15)' : 'transparent'}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: selectedId === v.id ? 'var(--accent2)' : 'var(--text3)', flexShrink: 0 }} />
                            <span style={{ fontSize: '13px', color: selectedId === v.id ? 'var(--accent)' : 'var(--text2)' }}>{v.name}</span>
                          </div>
                          <button onClick={e => handleDelete(v.id, e)} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '2px', display: 'flex', borderRadius: '4px' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ padding: '18px 22px 22px' }}>
                    <VoiceUploader onVoiceCreated={handleVoiceCreated} />
                  </div>
                </div>

                {/* Generate */}
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden' }}>
                  <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '2px' }}>Generate Speech</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text3)' }}>Max {limits.chars} chars · {limits.generations === Infinity ? 'Unlimited' : limits.generations} generations/month</p>
                  </div>
                  <div style={{ padding: '18px 22px 22px' }}>
                    <GeneratePanel
                      voices={voices}
                      selectedVoiceId={selectedId}
                      onSelectVoice={setSelectedId}
                      onGenerated={handleGenerated}
                      maxChars={limits.chars}
                      disabled={atLimit}
                    />
                  </div>
                </div>
              </div>

              {history.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <GenerationHistory history={history} onClear={() => setHistory([])} />
                </div>
              )}
            </div>
          )}

          {/* ── BILLING ── */}
          {tab === 'billing' && (
            <div>
              <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', marginBottom: '4px' }}>Billing & Plans</h1>
                <p style={{ color: 'var(--text3)', fontSize: '14px' }}>Manage your subscription and usage.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '32px' }}>
                {[
                  { label: 'Generations used', value: `${usage.generations}/${limits.generations === Infinity ? '∞' : limits.generations}` },
                  { label: 'Voice profiles',   value: `${voices.length}/${limits.voices === Infinity ? '∞' : limits.voices}` },
                  { label: 'Current plan',      value: plan.charAt(0).toUpperCase() + plan.slice(1) },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px 22px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>{s.label}</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color: 'var(--accent)' }}>{s.value}</p>
                  </div>
                ))}
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '20px' }}>Choose a plan</h2>
              <PricingCards currentPlan={plan} onUpgrade={handleUpgrade} />
            </div>
          )}

          {/* ── ACCOUNT ── */}
          {tab === 'account' && (
            <div>
              <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', marginBottom: '4px' }}>Account Settings</h1>
                <p style={{ color: 'var(--text3)', fontSize: '14px' }}>Your profile and account details.</p>
              </div>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '28px', maxWidth: '480px' }}>
                {/* Avatar */}
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(232,213,176,0.1)', border: '1px solid rgba(232,213,176,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', fontSize: '26px', overflow: 'hidden' }}>
                  {user?.photoURL
                    ? <img src={user.photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : user?.name?.[0]?.toUpperCase() || '?'}
                </div>

                {[
                  ['Name',         user?.name],
                  ['Email',        user?.email],
                  ['Plan',         plan.charAt(0).toUpperCase() + plan.slice(1)],
                  ['Email verified', user?.emailVerified ? '✅ Verified' : '❌ Not verified'],
                  ['Member since',  user?.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text3)' }}>{label}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>{value}</span>
                  </div>
                ))}

                <button onClick={handleLogout} style={{ marginTop: '24px', background: 'transparent', border: '1px solid rgba(232,124,124,0.3)', color: 'var(--error)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <ToastProvider />
      <style>{`@media(max-width:768px){main>div>div[style*="grid"]{grid-template-columns:1fr!important;}aside{width:56px!important;padding:12px 8px!important;}aside span{display:none;}}`}</style>
    </>
  );
};

export default Dashboard;
