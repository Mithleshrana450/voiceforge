import React, { useState } from 'react';
import { Mic2, Mail, Lock, User, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AuthPage = ({ onBack, defaultMode = 'login' }) => {
  const [mode, setMode] = useState(defaultMode); // 'login' | 'signup' | 'forgot'
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const { login } = useAuth();

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setError(null);
    if (!form.email || !form.password) return setError('Please fill in all fields.');
    if (mode === 'signup' && !form.name) return setError('Please enter your name.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      login(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!form.email) return setError('Enter your email address.');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Password reset link sent to your email.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const Input = ({ icon, type, placeholder, value, onChange, right }) => (
    <div style={{ position: 'relative', marginBottom: '12px' }}>
      <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }}>{icon}</div>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: `12px ${right ? '44px' : '14px'} 12px 42px`, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
        onFocus={e => e.target.style.borderColor = 'var(--accent2)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
      {right && <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text3)' }} onClick={right}>{showPass ? <EyeOff size={15} /> : <Eye size={15} />}</div>}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '300px', background: 'radial-gradient(ellipse, rgba(232,213,176,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        {/* Back button */}
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginBottom: '28px', fontFamily: 'var(--font-body)', padding: '0' }}>
          <ArrowLeft size={14} /> Back to home
        </button>

        {/* Card */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '24px', padding: '40px 36px' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(232,213,176,0.1)', border: '1px solid rgba(232,213,176,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Mic2 size={22} color="var(--accent)" />
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', marginBottom: '6px' }}>
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: '14px' }}>
              {mode === 'login' ? 'Sign in to your VoiceForge account' : mode === 'signup' ? 'Start cloning voices for free' : 'Enter your email to get a reset link'}
            </p>
          </div>

          {/* Google button */}
          {mode !== 'forgot' && (
            <>
              <button onClick={handleGoogleLogin} style={{ width: '100%', padding: '12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px', fontWeight: '500', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
            </>
          )}

          {/* Error / Success */}
          {error && (
            <div style={{ background: 'rgba(232,124,124,0.08)', border: '1px solid rgba(232,124,124,0.25)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(126,200,160,0.08)', border: '1px solid rgba(126,200,160,0.25)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--success)', marginBottom: '16px' }}>
              {success}
            </div>
          )}

          {/* Form fields */}
          {mode === 'signup' && (
            <Input icon={<User size={15} />} type="text" placeholder="Full name" value={form.name} onChange={v => set('name', v)} />
          )}
          <Input icon={<Mail size={15} />} type="email" placeholder="Email address" value={form.email} onChange={v => set('email', v)} />
          {mode !== 'forgot' && (
            <Input icon={<Lock size={15} />} type={showPass ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={v => set('password', v)} right={() => setShowPass(!showPass)} />
          )}

          {mode === 'login' && (
            <button onClick={() => { setMode('forgot'); setError(null); }} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)', marginBottom: '16px', padding: 0 }}>
              Forgot password?
            </button>
          )}

          {/* Submit */}
          <button
            onClick={mode === 'forgot' ? handleForgot : handleSubmit}
            disabled={loading}
            style={{ width: '100%', padding: '13px', background: loading ? 'var(--bg4)' : 'var(--accent)', border: 'none', borderRadius: '10px', color: loading ? 'var(--text3)' : 'var(--bg)', fontWeight: '700', fontFamily: 'var(--font-body)', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            {loading ? <><span style={{ width: '15px', height: '15px', border: '2px solid var(--text3)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Please wait...</> : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>

          {/* Switch mode */}
          <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text3)' }}>
            {mode === 'login' ? (
              <>Don't have an account?{' '}
                <button onClick={() => { setMode('signup'); setError(null); }} style={{ background: 'none', border: 'none', color: 'var(--accent2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '600', padding: 0 }}>Sign up free</button>
              </>
            ) : mode === 'signup' ? (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(null); }} style={{ background: 'none', border: 'none', color: 'var(--accent2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '600', padding: 0 }}>Sign in</button>
              </>
            ) : (
              <button onClick={() => { setMode('login'); setError(null); }} style={{ background: 'none', border: 'none', color: 'var(--accent2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', padding: 0 }}>Back to sign in</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;