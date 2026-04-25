import React, { useState, useEffect } from 'react';
import { Mic2, LogOut, CreditCard, Zap, User, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PricingCards } from './LandingPage';
import VoiceUploader from '../components/VoiceUploader';
import GeneratePanel from '../components/GeneratePanel';
import GenerationHistory from '../components/GenerationHistory';
import ToastProvider, { toast } from '../components/Toast';
import { getVoices, deleteVoice } from '../hooks/useApi';
import { Trash2, RefreshCw } from 'lucide-react';

const PLAN_LIMITS = {
    free: { generations: 5, voices: 1, chars: 500 },
    pro: { generations: 500, voices: 5, chars: 2500 },
    business: { generations: Infinity, voices: Infinity, chars: 2500 },
};

const Dashboard = () => {
    const { user, logout, updateUser } = useAuth();
    const [tab, setTab] = useState('studio'); // 'studio' | 'billing' | 'account'
    const [voices, setVoices] = useState([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState(null);
    const [history, setHistory] = useState([]);
    const [usage, setUsage] = useState({ generations: 0 });
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [payLoading, setPayLoading] = useState(false);

    const plan = user?.plan || 'free';
    const limits = PLAN_LIMITS[plan];

    useEffect(() => { fetchVoices(); fetchUsage(); }, []);

    const fetchVoices = async () => {
        try { const list = await getVoices(); setVoices(list); if (list.length > 0 && !selectedVoiceId) setSelectedVoiceId(list[list.length - 1].id); }
        catch (_) { }
    };

    const fetchUsage = async () => {
        try {
            const res = await fetch('/api/usage', { headers: { Authorization: `Bearer ${user?.token}` } });
            if (res.ok) { const d = await res.json(); setUsage(d); }
        } catch (_) { }
    };

    const handleVoiceCreated = (result) => {
        if (voices.length >= limits.voices && limits.voices !== Infinity) {
            toast.error(`Free plan allows only ${limits.voices} voice profile. Upgrade to add more.`);
            return;
        }
        const v = { id: result.voiceProfileId, name: result.voiceName, demo: result.demo, createdAt: new Date().toISOString() };
        setVoices(prev => [...prev, v]);
        setSelectedVoiceId(v.id);
        toast.success(`Voice "${result.voiceName}" created!`);
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Delete this voice profile?')) return;
        try { await deleteVoice(id); setVoices(prev => prev.filter(v => v.id !== id)); if (selectedVoiceId === id) setSelectedVoiceId(null); toast.success('Deleted'); }
        catch (_) { toast.error('Delete failed'); }
    };

    const handleGenerated = (item) => {
        const newUsage = { ...usage, generations: (usage.generations || 0) + 1 };
        setUsage(newUsage);
        setHistory(prev => [...prev, item]);
    };

    const handleUpgrade = async (newPlan) => {
        if (newPlan === 'free') return;
        setPayLoading(true);
        try {
            const res = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` },
                body: JSON.stringify({ plan: newPlan }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Open Razorpay
            const options = {
                key: data.razorpayKey,
                amount: data.amount,
                currency: 'INR',
                name: 'VoiceForge',
                description: `${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)} Plan`,
                order_id: data.orderId,
                handler: async (response) => {
                    try {
                        const verifyRes = await fetch('/api/payment/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` },
                            body: JSON.stringify({ ...response, plan: newPlan }),
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            updateUser({ plan: newPlan });
                            toast.success(`Upgraded to ${newPlan} plan!`);
                            setShowUpgrade(false);
                        } else {
                            toast.error('Payment verification failed');
                        }
                    } catch (_) { toast.error('Payment verification failed'); }
                },
                prefill: { name: user?.name, email: user?.email },
                theme: { color: '#c9a96e' },
                modal: { ondismiss: () => setPayLoading(false) },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            toast.error(err.message || 'Payment failed');
        } finally {
            setPayLoading(false);
        }
    };

    const usagePct = limits.generations === Infinity ? 0 : Math.min((usage.generations / limits.generations) * 100, 100);
    const nearLimit = usagePct >= 80;

    // ── Sidebar nav ──────────────────────────────────────────
    const NavBtn = ({ id, icon, label }) => (
        <button onClick={() => setTab(id)} style={{ width: '100%', padding: '10px 14px', background: tab === id ? 'rgba(232,213,176,0.08)' : 'transparent', border: `1px solid ${tab === id ? 'rgba(232,213,176,0.15)' : 'transparent'}`, borderRadius: '8px', color: tab === id ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: tab === id ? '600' : '400', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', transition: 'all 0.15s' }}>
            {icon} {label}
        </button>
    );

    return (
        <>
            <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
                {/* Sidebar */}
                <aside style={{ width: '220px', flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '20px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px', padding: '4px 6px' }}>
                        <Mic2 size={18} color="var(--accent)" />
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '17px' }}>VoiceForge</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <NavBtn id="studio" icon={<Mic2 size={14} />} label="Studio" />
                        <NavBtn id="billing" icon={<CreditCard size={14} />} label="Billing" />
                        <NavBtn id="account" icon={<User size={14} />} label="Account" />
                    </div>

                    {/* Usage meter */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>Generations</span>
                            <span style={{ fontSize: '11px', color: nearLimit ? 'var(--warning)' : 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                                {usage.generations}/{limits.generations === Infinity ? '∞' : limits.generations}
                            </span>
                        </div>
                        <div style={{ height: '4px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${usagePct}%`, background: nearLimit ? 'var(--warning)' : 'var(--accent2)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
                        </div>
                        {nearLimit && plan !== 'business' && (
                            <button onClick={() => setTab('billing')} style={{ width: '100%', marginTop: '8px', padding: '7px', background: 'rgba(232,196,124,0.1)', border: '1px solid rgba(232,196,124,0.3)', borderRadius: '6px', color: 'var(--warning)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                <Zap size={11} /> Upgrade now
                            </button>
                        )}
                    </div>

                    {/* Plan badge */}
                    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '3px' }}>Current plan</div>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: plan === 'free' ? 'var(--text2)' : plan === 'pro' ? 'var(--accent2)' : 'var(--success)', textTransform: 'capitalize' }}>{plan}</div>
                    </div>

                    <button onClick={logout} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text3)', padding: '9px 14px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <LogOut size={13} /> Sign out
                    </button>
                </aside>

                {/* Main content */}
                <main style={{ flex: 1, overflow: 'auto', padding: '32px', maxWidth: '1100px' }}>

                    {/* ── STUDIO TAB ── */}
                    {tab === 'studio' && (
                        <div>
                            <div style={{ marginBottom: '28px' }}>
                                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', marginBottom: '6px' }}>
                                    Welcome back, {user?.name?.split(' ')[0] || 'there'} 👋
                                </h1>
                                <p style={{ color: 'var(--text3)', fontSize: '14px' }}>Clone voices and generate speech below.</p>
                            </div>

                            {/* Limit warning banner */}
                            {usage.generations >= limits.generations && limits.generations !== Infinity && (
                                <div style={{ background: 'rgba(232,124,124,0.08)', border: '1px solid rgba(232,124,124,0.25)', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                    <span style={{ color: 'var(--error)', fontSize: '14px' }}>You've used all {limits.generations} generations this month.</span>
                                    <button onClick={() => setTab('billing')} style={{ background: 'var(--accent)', border: 'none', color: 'var(--bg)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Zap size={13} /> Upgrade plan
                                    </button>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                                {/* Voice profiles */}
                                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden' }}>
                                    <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '2px' }}>Voice Profiles</h2>
                                            <p style={{ fontSize: '12px', color: 'var(--text3)' }}>{voices.length}/{limits.voices === Infinity ? '∞' : limits.voices} used</p>
                                        </div>
                                        <button onClick={fetchVoices} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text3)', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><RefreshCw size={12} /></button>
                                    </div>
                                    {voices.length > 0 && (
                                        <div style={{ borderBottom: '1px solid var(--border)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '160px', overflowY: 'auto' }}>
                                            {voices.map(v => (
                                                <div key={v.id} onClick={() => setSelectedVoiceId(v.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: '7px', cursor: 'pointer', background: selectedVoiceId === v.id ? 'rgba(232,213,176,0.06)' : 'var(--bg3)', border: `1px solid ${selectedVoiceId === v.id ? 'rgba(232,213,176,0.15)' : 'transparent'}` }}>
                                                    <span style={{ fontSize: '13px', color: selectedVoiceId === v.id ? 'var(--accent)' : 'var(--text2)' }}>{v.name}</span>
                                                    <button onClick={e => handleDelete(v.id, e)} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '2px', display: 'flex', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}><Trash2 size={12} /></button>
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
                                        <p style={{ fontSize: '12px', color: 'var(--text3)' }}>Max {limits.chars === Infinity ? '∞' : limits.chars} chars per generation</p>
                                    </div>
                                    <div style={{ padding: '18px 22px 22px' }}>
                                        <GeneratePanel
                                            voices={voices}
                                            selectedVoiceId={selectedVoiceId}
                                            onSelectVoice={setSelectedVoiceId}
                                            onGenerated={handleGenerated}
                                            maxChars={limits.chars}
                                            disabled={usage.generations >= limits.generations && limits.generations !== Infinity}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* History */}
                            {history.length > 0 && (
                                <div style={{ marginTop: '20px' }}>
                                    <GenerationHistory history={history} onClear={() => setHistory([])} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── BILLING TAB ── */}
                    {tab === 'billing' && (
                        <div>
                            <div style={{ marginBottom: '32px' }}>
                                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', marginBottom: '6px' }}>Billing & Plans</h1>
                                <p style={{ color: 'var(--text3)', fontSize: '14px' }}>Manage your subscription and usage.</p>
                            </div>

                            {/* Usage stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                                {[
                                    { label: 'Generations used', value: usage.generations, max: limits.generations },
                                    { label: 'Voice profiles', value: voices.length, max: limits.voices },
                                    { label: 'Current plan', value: plan.charAt(0).toUpperCase() + plan.slice(1), max: null },
                                ].map((s, i) => (
                                    <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 22px' }}>
                                        <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>{s.label}</p>
                                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--accent)' }}>
                                            {s.max !== null ? `${s.value}/${s.max === Infinity ? '∞' : s.max}` : s.value}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', marginBottom: '20px' }}>Choose a plan</h2>
                            <PricingCards currentPlan={plan} onUpgrade={handleUpgrade} />
                        </div>
                    )}

                    {/* ── ACCOUNT TAB ── */}
                    {tab === 'account' && (
                        <div>
                            <div style={{ marginBottom: '32px' }}>
                                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', marginBottom: '6px' }}>Account Settings</h1>
                                <p style={{ color: 'var(--text3)', fontSize: '14px' }}>Manage your profile and preferences.</p>
                            </div>
                            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '28px', maxWidth: '480px' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(232,213,176,0.1)', border: '1px solid rgba(232,213,176,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', fontSize: '24px' }}>
                                    {user?.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {[['Name', user?.name], ['Email', user?.email], ['Plan', plan.charAt(0).toUpperCase() + plan.slice(1)], ['Member since', new Date(user?.createdAt || Date.now()).toLocaleDateString()]].map(([label, value]) => (
                                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text3)' }}>{label}</span>
                                            <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={logout} style={{ marginTop: '24px', background: 'transparent', border: '1px solid rgba(232,124,124,0.3)', color: 'var(--error)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <LogOut size={13} /> Sign out
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <ToastProvider />
            <style>{`@media(max-width:768px){main{grid-template-columns:1fr!important;}aside{width:60px!important;}}`}</style>
        </>
    );
};

export default Dashboard;