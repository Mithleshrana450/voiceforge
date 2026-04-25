// src/pages/AuthPage.jsx
// ─────────────────────────────────────────────────────────────
//  Login / Signup / Forgot Password
//  Powered by Firebase Auth
//  Inputs defined OUTSIDE component to prevent focus loss bug
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  Mic2, Mail, Lock, User,
  Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle,
} from 'lucide-react';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  resetPassword,
} from '../firebase/authService';

// ── Reusable input — defined OUTSIDE to prevent re-mount bug ──
const FormInput = ({ icon, type, placeholder, value, onChange, showToggle, onToggle, disabled }) => (
  <div style={{ position: 'relative', marginBottom: '12px' }}>
    <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none', zIndex: 1 }}>
      {icon}
    </div>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'name'}
      style={{
        width: '100%',
        background: disabled ? 'var(--bg4)' : 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: `12px ${showToggle ? '44px' : '14px'} 12px 42px`,
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
        cursor: disabled ? 'not-allowed' : 'text',
      }}
      onFocus={e => !disabled && (e.target.style.borderColor = 'var(--accent2)')}
      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
    />
    {showToggle && (
      <div onClick={onToggle} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text3)', zIndex: 1 }}>
        {type === 'password' ? <Eye size={15} /> : <EyeOff size={15} />}
      </div>
    )}
  </div>
);

// ── Main AuthPage ─────────────────────────────────────────────
const AuthPage = ({ onBack, defaultMode = 'login' }) => {
  const [mode,     setMode]     = useState(defaultMode);
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [success,  setSuccess]  = useState(null);

  // Form state — separate variables (NOT inside Input component)
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  const switchMode = (m) => { setMode(m); setError(null); setSuccess(null); };
  const clearError = () => setError(null);

  // ── Sign Up ──────────────────────────────────────────────
  const handleSignUp = async () => {
    setError(null);
    setLoading(true);
    try {
      await signUpWithEmail(name, email, password);
      setSuccess('Account created! Please check your email to verify your account.');
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Sign In ──────────────────────────────────────────────
  const handleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      // AuthContext auto-detects login via onAuthStateChanged
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Google Sign In ───────────────────────────────────────
  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(firebaseErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password ──────────────────────────────────────
  const handleForgot = async () => {
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess('Password reset email sent! Check your inbox and spam folder.');
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'signup') handleSignUp();
    else if (mode === 'login') handleSignIn();
    else handleForgot();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) handleSubmit();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '300px', background: 'radial-gradient(ellipse, rgba(232,213,176,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        {/* Back */}
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginBottom: '28px', fontFamily: 'var(--font-body)', padding: 0 }}>
          <ArrowLeft size={14} /> Back to home
        </button>

        {/* Card */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '24px', padding: '40px 36px' }}>

          {/* Logo + title */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(232,213,176,0.1)', border: '1px solid rgba(232,213,176,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Mic2 size={22} color="var(--accent)" />
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', marginBottom: '6px' }}>
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: '14px' }}>
              {mode === 'login' ? 'Sign in to VoiceForge' : mode === 'signup' ? 'Start cloning voices for free' : 'We\'ll send a reset link to your email'}
            </p>
          </div>

          {/* Google button */}
          {mode !== 'forgot' && (
            <>
              <button
                onClick={handleGoogle}
                disabled={loading}
                style={{ width: '100%', padding: '12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px', fontWeight: '500', transition: 'border-color 0.2s, background 0.2s' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = 'var(--accent2)'; }}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
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

          {/* Error message */}
          {error && (
            <div style={{ background: 'rgba(232,124,124,0.08)', border: '1px solid rgba(232,124,124,0.25)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--error)', display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '16px' }}>
              <AlertCircle size={13} style={{ marginTop: '1px', flexShrink: 0 }} /> {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div style={{ background: 'rgba(126,200,160,0.08)', border: '1px solid rgba(126,200,160,0.25)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--success)', display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '16px' }}>
              <CheckCircle size={13} style={{ marginTop: '1px', flexShrink: 0 }} /> {success}
            </div>
          )}

          {/* Form fields */}
          <div onKeyDown={handleKeyDown}>
            {mode === 'signup' && (
              <FormInput
                icon={<User size={15} />}
                type="text"
                placeholder="Full name"
                value={name}
                onChange={setName}
                disabled={loading}
              />
            )}
            <FormInput
              icon={<Mail size={15} />}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={setEmail}
              disabled={loading}
            />
            {mode !== 'forgot' && (
              <FormInput
                icon={<Lock size={15} />}
                type={showPass ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'Password (min 6 chars)' : 'Password'}
                value={password}
                onChange={setPassword}
                showToggle
                onToggle={() => setShowPass(p => !p)}
                disabled={loading}
              />
            )}
          </div>

          {/* Forgot password link */}
          {mode === 'login' && (
            <button onClick={() => switchMode('forgot')} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)', marginBottom: '16px', padding: 0, display: 'block', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent2)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}>
              Forgot password?
            </button>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: '100%', padding: '13px', background: loading ? 'var(--bg4)' : 'var(--accent)', border: 'none', borderRadius: '10px', color: loading ? 'var(--text3)' : 'var(--bg)', fontWeight: '700', fontFamily: 'var(--font-body)', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px', transition: 'background 0.2s, opacity 0.2s' }}>
            {loading
              ? <><span style={{ width: '15px', height: '15px', border: '2px solid var(--text3)', borderTopColor: 'var(--accent2)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Please wait...</>
              : mode === 'login'  ? 'Sign in'
              : mode === 'signup' ? 'Create account'
              : 'Send reset link'}
          </button>

          {/* Switch mode links */}
          <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text3)' }}>
            {mode === 'login' && (
              <>Don't have an account?{' '}
                <button onClick={() => switchMode('signup')} style={{ background: 'none', border: 'none', color: 'var(--accent2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '600', padding: 0 }}>
                  Sign up free
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>Already have an account?{' '}
                <button onClick={() => switchMode('login')} style={{ background: 'none', border: 'none', color: 'var(--accent2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '600', padding: 0 }}>
                  Sign in
                </button>
              </>
            )}
            {mode === 'forgot' && (
              <button onClick={() => switchMode('login')} style={{ background: 'none', border: 'none', color: 'var(--accent2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', padding: 0 }}>
                ← Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Convert Firebase error codes → friendly messages ─────────
function firebaseErrorMessage(err) {
  const code = err.code || '';
  const messages = {
    'auth/email-already-in-use':    'This email is already registered. Try signing in instead.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/weak-password':           'Password must be at least 6 characters.',
    'auth/user-not-found':          'No account found with this email.',
    'auth/wrong-password':          'Incorrect password. Try again or reset your password.',
    'auth/invalid-credential':      'Incorrect email or password. Please try again.',
    'auth/too-many-requests':       'Too many failed attempts. Please wait a few minutes and try again.',
    'auth/network-request-failed':  'Network error. Check your internet connection.',
    'auth/popup-blocked':           'Popup was blocked. Please allow popups for this site.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled.',
    'auth/user-disabled':           'This account has been disabled. Contact support.',
    'auth/requires-recent-login':   'Please sign in again to complete this action.',
  };
  return messages[code] || err.message || 'Something went wrong. Please try again.';
}

export default AuthPage;
