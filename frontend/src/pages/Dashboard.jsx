// src/pages/Dashboard.jsx
// ═══════════════════════════════════════════════════════════
//  Full Dashboard with Firestore Database Integration
//  Studio + History + Billing + Account tabs
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  Mic2, LogOut, CreditCard, User, Zap,
  RefreshCw, Trash2, Clock, BarChart2, Settings,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import {
  updateUserPlan,
  saveVoiceProfile,
  getVoiceProfiles,
  deleteVoiceProfile,
  saveGenerationHistory,
  incrementUsage,
} from '../firebase/dbService';
import { useAuth, PLAN_LIMITS } from '../context/AuthContext';
import { PricingCards } from './LandingPage';
import HistoryPage from './HistoryPage';
import VoiceUploader from '../components/VoiceUploader';
import GeneratePanel from '../components/GeneratePanel';
import ToastProvider, { toast } from '../components/Toast';

const Dashboard = () => {
  const { user, usage, limits, canGenerate, refreshUsage, refreshUserDoc } = useAuth();
  const [tab, setTab] = useState('studio');
  const [voices, setVoices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [payLoading, setPayLoading] = useState(false);

  const plan = user?.plan || 'free';

  // Load voice profiles from Firestore on mount
  useEffect(() => {
    if (user?.uid) loadVoices();
  }, [user?.uid]);

  const loadVoices = async () => {
    setLoadingVoices(true);
    try {
      const profiles = await getVoiceProfiles(user.uid);
      setVoices(profiles);
      if (profiles.length > 0 && !selectedId) {
        setSelectedId(profiles[0].id);
      }
    } catch (_) {
      toast.error('Failed to load voice profiles');
    } finally {
      setLoadingVoices(false);
    }
  };

  // ── Voice created → save to Firestore ──────────────────
  const handleVoiceCreated = async (result) => {
    if (voices.length >= limits.voices && limits.voices !== Infinity) {
      toast.error(`Your ${plan} plan allows ${limits.voices} voice profile(s). Upgrade to add more.`);
      return;
    }
    try {
      const saved = await saveVoiceProfile(user.uid, {
        name: result.voiceName,
        elevenLabsVoiceId: result.elevenLabsVoiceId || null,
        demo: result.demo || false,
        fileName: result.fileName || null,
      });
      setVoices(prev => [saved, ...prev]);
      setSelectedId(saved.id);
      await refreshUserDoc(); // update voice count in stats
      toast.success(`Voice "${result.voiceName}" saved!`);
    } catch (err) {
      toast.error('Failed to save voice profile');
    }
  };

  // ── Voice deleted → remove from Firestore ──────────────
  const handleDeleteVoice = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this voice profile?')) return;
    try {
      await deleteVoiceProfile(user.uid, id);
      setVoices(prev => prev.filter(v => v.id !== id));
      if (selectedId === id) setSelectedId(voices.find(v => v.id !== id)?.id || null);
      await refreshUserDoc();
      toast.success('Voice profile deleted');
    } catch (_) { toast.error('Failed to delete voice profile'); }
  };

  // ── Generation complete → save to Firestore history ────
  const handleGenerated = async (item) => {
    try {
      await saveGenerationHistory(user.uid, {
        text: item.text,
        voiceName: item.voiceName,
        voiceId: item.voiceProfileId || selectedId,
        audioUrl: item.audioUrl || null,
        filename: item.filename || null,
        charCount: item.text?.length || 0,
        model: 'eleven_multilingual_v2',
        stability: item.stability || 0.5,
        similarity: item.similarity || 0.75,
        demo: item.demo || false,
      });
      await incrementUsage(user.uid, item.text?.length || 0);
      await refreshUsage();
    } catch (err) {
      console.error('Failed to save generation history:', err);
    }
  };

  // ── Razorpay payment ────────────────────────────────────
  const handleUpgrade = async (newPlan) => {
    if (newPlan === 'free' || newPlan === plan) return;
    setPayLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: newPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const options = {
        key: data.razorpayKey,
        amount: data.amount,
        currency: 'INR',
        name: 'VoiceForge',
        description: `${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)} Plan`,
        order_id: data.orderId,
        handler: async (response) => {
          try {
            // Verify on backend
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ ...response, plan: newPlan }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              // Update plan in Firestore
              await updateUserPlan(user.uid, newPlan);
              await refreshUserDoc();
              toast.success(`🎉 Upgraded to ${newPlan} plan!`);
            } else {
              toast.error('Payment verification failed. Contact support.');
            }
          } catch (_) { toast.error('Failed to verify payment.'); }
        },
        prefill: { name: user.name, email: user.email },
        theme: { color: '#c9a96e' },
        modal: { ondismiss: () => setPayLoading(false) },
      };

      if (!window.Razorpay) {
        toast.error('Payment system not loaded. Please refresh the page.');
        setPayLoading(false);
        return;
      }
      new window.Razorpay(options).open();
    } catch (err) {
      toast.error(err.message || 'Payment failed. Please try again.');
      setPayLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); }
    catch (_) { }
  };

  // Usage calculations
  const usagePct = limits.generations === Infinity ? 0 : Math.min(((usage.generations || 0) / limits.generations) * 100, 100);
  const nearLimit = usagePct >= 80;
  const atLimit = limits.generations !== Infinity && (usage.generations || 0) >= limits.generations;

  // ── Sidebar nav button ──────────────────────────────────
  const NavBtn = ({ id, icon, label, badge }) => (
    <button onClick={() => setTab(id)} style={{ width: '100%', padding: '9px 12px', background: tab === id ? 'rgba(232,213,176,0.08)' : 'transparent', border: `1px solid ${tab === id ? 'rgba(232,213,176,0.15)' : 'transparent'}`, borderRadius: '8px', color: tab === id ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: tab === id ? '600' : '400', display: 'flex', alignItems: 'center', gap: '9px', textAlign: 'left', transition: 'all 0.15s', position: 'relative' }}>
      {icon} {label}
      {badge && <span style={{ marginLeft: 'auto', fontSize: '10px', background: 'rgba(232,196,124,0.2)', color: 'var(--warning)', border: '1px solid rgba(232,196,124,0.3)', padding: '1px 6px', borderRadius: '8px' }}>{badge}</span>}
    </button>
  );

  // ── Stat card ──────────────────────────────────────────
  const StatCard = ({ label, value, sub }) => (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 20px' }}>
      <p style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--accent)', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>{sub}</p>}
    </div>
  );

  return (
    <>
      <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: '220px', flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '18px 12px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px', padding: '4px 8px' }}>
            <Mic2 size={17} color="var(--accent)" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '17px' }}>VoiceForge</span>
          </div>

          {/* Nav links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
            <p style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', padding: '0 8px', marginBottom: '6px', letterSpacing: '0.08em' }}>MENU</p>
            <NavBtn id="studio" icon={<Mic2 size={14} />} label="Studio" />
            <NavBtn id="history" icon={<Clock size={14} />} label="History" />
            <NavBtn id="billing" icon={<CreditCard size={14} />} label="Billing" />
            <NavBtn id="account" icon={<User size={14} />} label="Account" />
          </div>

          {/* Usage meter */}
          <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--bg3)', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Monthly usage</span>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: nearLimit ? 'var(--warning)' : 'var(--text3)' }}>
                {usage.generations || 0}/{limits.generations === Infinity ? '∞' : limits.generations}
              </span>
            </div>
            <div style={{ height: '4px', background: 'var(--bg4)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${usagePct}%`, background: atLimit ? 'var(--error)' : nearLimit ? 'var(--warning)' : 'var(--accent2)', borderRadius: '2px', transition: 'width 0.5s' }} />
            </div>
            {nearLimit && plan !== 'business' && (
              <button onClick={() => setTab('billing')} style={{ width: '100%', marginTop: '8px', padding: '5px', background: 'rgba(232,196,124,0.1)', border: '1px solid rgba(232,196,124,0.25)', borderRadius: '5px', color: 'var(--warning)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Zap size={10} /> Upgrade
              </button>
            )}
          </div>

          {/* Plan badge */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '2px', fontFamily: 'var(--font-mono)' }}>PLAN</div>
            <div style={{ fontWeight: '600', fontSize: '13px', color: plan === 'free' ? 'var(--text2)' : plan === 'pro' ? 'var(--accent2)' : 'var(--success)', textTransform: 'capitalize' }}>{plan}</div>
          </div>

          {/* Logout */}
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text3)', padding: '8px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,124,124,0.4)'; e.currentTarget.style.color = 'var(--error)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)'; }}>
            <LogOut size={13} /> Sign out
          </button>
        </aside>

        {/* ── Main Content ── */}
        <main style={{ flex: 1, overflow: 'auto', padding: '32px', maxWidth: '1100px' }}>

          {/* ════════ STUDIO TAB ════════ */}
          {tab === 'studio' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', marginBottom: '4px' }}>
                  Welcome back, {user?.name?.split(' ')[0] || 'there'} 👋
                </h1>
                <p style={{ color: 'var(--text3)', fontSize: '14px' }}>Clone voices and generate speech below.</p>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
                <StatCard label="Total generations" value={user?.stats?.totalGenerations || 0} />
                <StatCard label="Voice profiles" value={voices.length} sub={`of ${limits.voices === Infinity ? '∞' : limits.voices} allowed`} />
                <StatCard label="This month" value={usage.generations || 0} sub={`of ${limits.generations === Infinity ? '∞' : limits.generations}`} />
                <StatCard label="Total chars" value={((user?.stats?.totalChars || 0) / 1000).toFixed(1) + 'k'} />
              </div>

              {/* Limit warning */}
              {atLimit && (
                <div style={{ background: 'rgba(232,124,124,0.07)', border: '1px solid rgba(232,124,124,0.2)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ color: 'var(--error)', fontSize: '14px' }}>You've used all {limits.generations} generations this month.</span>
                  <button onClick={() => setTab('billing')} style={{ background: 'var(--accent)', border: 'none', color: 'var(--bg)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={13} /> Upgrade plan
                  </button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                {/* Voice Profiles card */}
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden' }}>
                  <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '2px' }}>Voice Profiles</h2>
                      <p style={{ fontSize: '12px', color: 'var(--text3)' }}>{voices.length}/{limits.voices === Infinity ? '∞' : limits.voices} saved in database</p>
                    </div>
                    <button onClick={loadVoices} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text3)', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <RefreshCw size={12} />
                    </button>
                  </div>

                  {/* Voice list */}
                  {loadingVoices ? (
                    <div style={{ padding: '24px', textAlign: 'center' }}>
                      <span style={{ width: '20px', height: '20px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                  ) : voices.length > 0 ? (
                    <div style={{ borderBottom: '1px solid var(--border)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '180px', overflowY: 'auto' }}>
                      {voices.map(v => (
                        <div key={v.id} onClick={() => setSelectedId(v.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: '7px', cursor: 'pointer', background: selectedId === v.id ? 'rgba(232,213,176,0.06)' : 'var(--bg3)', border: `1px solid ${selectedId === v.id ? 'rgba(232,213,176,0.15)' : 'transparent'}`, transition: 'all 0.15s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: selectedId === v.id ? 'var(--accent2)' : 'var(--text3)', flexShrink: 0 }} />
                            <span style={{ fontSize: '13px', color: selectedId === v.id ? 'var(--accent)' : 'var(--text2)' }}>{v.name}</span>
                            {v.demo && <span style={{ fontSize: '10px', background: 'rgba(232,196,124,0.1)', color: 'var(--warning)', border: '1px solid rgba(232,196,124,0.2)', padding: '1px 5px', borderRadius: '4px' }}>demo</span>}
                          </div>
                          <button onClick={e => handleDeleteVoice(v.id, e)} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '2px', borderRadius: '4px', display: 'flex' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div style={{ padding: '18px 22px 22px' }}>
                    <VoiceUploader onVoiceCreated={handleVoiceCreated} />
                  </div>
                </div>

                {/* Generate Speech card */}
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden' }}>
                  <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '2px' }}>Generate Speech</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text3)' }}>
                      Max {limits.chars} chars · history saved to database
                    </p>
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
            </div>
          )}

          {/* ════════ HISTORY TAB ════════ */}
          {tab === 'history' && <HistoryPage />}

          {/* ════════ BILLING TAB ════════ */}
          {tab === 'billing' && (
            <div>
              <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', marginBottom: '4px' }}>Billing & Plans</h1>
                <p style={{ color: 'var(--text3)', fontSize: '14px' }}>Manage your subscription and usage.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '32px' }}>
                <StatCard label="Generations this month" value={`${usage.generations || 0}/${limits.generations === Infinity ? '∞' : limits.generations}`} />
                <StatCard label="Voice profiles saved" value={`${voices.length}/${limits.voices === Infinity ? '∞' : limits.voices}`} />
                <StatCard label="Current plan" value={plan.charAt(0).toUpperCase() + plan.slice(1)} />
              </div>

              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', marginBottom: '20px' }}>Choose a plan</h2>
              <PricingCards currentPlan={plan} onUpgrade={handleUpgrade} />
            </div>
          )}

          {/* ════════ ACCOUNT TAB ════════ */}
          {tab === 'account' && (
            <div>
              <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', marginBottom: '4px' }}>Account Settings</h1>
                <p style={{ color: 'var(--text3)', fontSize: '14px' }}>Your profile stored in Firebase.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                {/* Profile card */}
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '28px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(232,213,176,0.1)', border: '1px solid rgba(232,213,176,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', overflow: 'hidden', fontSize: '24px' }}>
                    {user?.photoURL
                      ? <img src={user.photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : user?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '16px' }}>Profile</h2>
                  {[
                    ['Name', user?.name],
                    ['Email', user?.email],
                    ['Plan', plan.charAt(0).toUpperCase() + plan.slice(1)],
                    ['Login method', user?.provider === 'google' ? '🔵 Google' : '📧 Email'],
                    ['Email verified', user?.emailVerified ? '✅ Yes' : '❌ No'],
                    ['Member since', user?.createdAt?.seconds
                      ? new Date(user.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                      : 'N/A'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text3)' }}>{label}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>{value}</span>
                    </div>
                  ))}
                  <button onClick={handleLogout} style={{ marginTop: '20px', background: 'transparent', border: '1px solid rgba(232,124,124,0.3)', color: 'var(--error)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LogOut size={13} /> Sign out
                  </button>
                </div>

                {/* Stats card */}
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '28px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '16px' }}>Lifetime Stats</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      ['Total generations', user?.stats?.totalGenerations || 0],
                      ['Voice profiles made', user?.stats?.totalVoices || 0],
                      ['Total characters', (user?.stats?.totalChars || 0).toLocaleString()],
                      ['This month', `${usage.generations || 0} generations`],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text3)' }}>{label}</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--accent)' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <ToastProvider />
      <style>{`
        @media(max-width: 900px) {
          main > div > div[style*="grid-template-columns: repeat(4"] { grid-template-columns: repeat(2,1fr) !important; }
          main > div > div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
        @media(max-width: 600px) {
          aside { width: 56px !important; padding: 12px 8px !important; }
          aside span, aside p { display: none; }
        }
      `}</style>
    </>
  );
};

export default Dashboard;