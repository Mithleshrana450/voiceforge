import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const [page, setPage] = React.useState('landing');

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <span style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text3)', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>Loading...</p>
      </div>
    </div>
  );

  if (user) return <Dashboard />;
  if (page === 'login') return <AuthPage onBack={() => setPage('landing')} defaultMode="login" />;
  if (page === 'signup') return <AuthPage onBack={() => setPage('landing')} defaultMode="signup" />;

  return (
    <LandingPage
      onGetStarted={() => setPage('signup')}
      onLogin={() => setPage('login')}
    />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}