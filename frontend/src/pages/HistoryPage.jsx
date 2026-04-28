// src/pages/HistoryPage.jsx
// ═══════════════════════════════════════════════════════════
//  Full Generation History Page
//  Loads from Firestore with pagination, search, delete
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
    Search, Trash2, Download, Play, Pause,
    ChevronDown, RefreshCw, Clock, Mic2, Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
    getGenerationHistory,
    deleteHistoryItem,
    clearAllHistory,
} from '../firebase/dbService';
import { toast } from '../components/Toast';

// ── Mini Audio Player ──────────────────────────────────────
const MiniPlayer = ({ src }) => {
    const [playing, setPlaying] = React.useState(false);
    const audioRef = React.useRef(null);

    const toggle = () => {
        if (!audioRef.current) return;
        if (playing) { audioRef.current.pause(); }
        else { audioRef.current.play(); }
        setPlaying(!playing);
    };

    if (!src) return <span style={{ fontSize: '12px', color: 'var(--text3)' }}>No audio</span>;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={toggle} style={{ width: '32px', height: '32px', borderRadius: '50%', background: playing ? 'var(--accent)' : 'rgba(232,213,176,0.1)', border: '1px solid var(--accent2)', color: playing ? 'var(--bg)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <a href={src} download style={{ color: 'var(--text3)', display: 'flex', alignItems: 'center' }} title="Download">
                <Download size={13} />
            </a>
            <audio ref={audioRef} src={src} onEnded={() => setPlaying(false)} style={{ display: 'none' }} />
        </div>
    );
};

// ── History Card ───────────────────────────────────────────
const HistoryCard = ({ item, onDelete }) => {
    const [expanded, setExpanded] = useState(false);

    const date = new Date(item.createdAt);
    const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    return (
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            {/* Header row */}
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Voice badge */}
                <div style={{ background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.25)', borderRadius: '6px', padding: '4px 10px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent2)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {item.voiceName || 'Unknown voice'}
                    </span>
                </div>

                {/* Text preview */}
                <p style={{ fontSize: '13px', color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expanded ? 'normal' : 'nowrap', fontStyle: 'italic', cursor: 'pointer', lineHeight: 1.5 }}
                    onClick={() => setExpanded(!expanded)}>
                    "{item.text}"
                </p>

                {/* Right side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <MiniPlayer src={item.audioUrl} />
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{dateStr}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{timeStr}</p>
                    </div>
                    <button onClick={() => onDelete(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}>
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ paddingTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {[
                            ['Characters', item.charCount || item.text?.length || '—'],
                            ['Model', item.model || 'eleven_multilingual_v2'],
                            ['Stability', item.stability ?? '0.50'],
                            ['Similarity', item.similarity ?? '0.75'],
                        ].map(([label, val]) => (
                            <div key={label} style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px' }}>
                                <p style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>{label}</p>
                                <p style={{ fontSize: '13px', color: 'var(--text2)' }}>{val}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main History Page ──────────────────────────────────────
const HistoryPage = () => {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [search, setSearch] = useState('');
    const [clearing, setClearing] = useState(false);

    const loadHistory = useCallback(async (reset = false) => {
        if (!user?.uid) return;
        reset ? setLoading(true) : setLoadingMore(true);
        try {
            const result = await getGenerationHistory(user.uid, 15, reset ? null : lastDoc);
            setItems(prev => reset ? result.items : [...prev, ...result.items]);
            setLastDoc(result.lastVisible);
            setHasMore(result.hasMore);
        } catch (err) {
            toast.error('Failed to load history');
        } finally {
            reset ? setLoading(false) : setLoadingMore(false);
        }
    }, [user?.uid, lastDoc]);

    useEffect(() => { loadHistory(true); }, [user?.uid]);

    const handleDelete = async (id) => {
        if (!confirm('Delete this generation?')) return;
        try {
            await deleteHistoryItem(user.uid, id);
            setItems(prev => prev.filter(i => i.id !== id));
            toast.success('Deleted');
        } catch (_) { toast.error('Failed to delete'); }
    };

    const handleClearAll = async () => {
        if (!confirm('Delete ALL generation history? This cannot be undone.')) return;
        setClearing(true);
        try {
            await clearAllHistory(user.uid);
            setItems([]);
            setHasMore(false);
            toast.success('History cleared');
        } catch (_) { toast.error('Failed to clear history'); }
        finally { setClearing(false); }
    };

    // Client-side search filter
    const filtered = search.trim()
        ? items.filter(i =>
            i.text?.toLowerCase().includes(search.toLowerCase()) ||
            i.voiceName?.toLowerCase().includes(search.toLowerCase())
        )
        : items;

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', marginBottom: '4px' }}>
                        Generation History
                    </h1>
                    <p style={{ color: 'var(--text3)', fontSize: '14px' }}>
                        {items.length} saved · all your generated audio clips
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => loadHistory(true)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text3)', padding: '8px 14px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw size={13} /> Refresh
                    </button>
                    {items.length > 0 && (
                        <button onClick={handleClearAll} disabled={clearing} style={{ background: 'transparent', border: '1px solid rgba(232,124,124,0.3)', borderRadius: '8px', color: 'var(--error)', padding: '8px 14px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', opacity: clearing ? 0.5 : 1 }}>
                            <Trash2 size={13} /> Clear all
                        </button>
                    )}
                </div>
            </div>

            {/* Search bar */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
                <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                <input
                    type="text"
                    placeholder="Search by text or voice name..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '11px 14px 11px 40px', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent2)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <span style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ color: 'var(--text3)', fontSize: '14px', marginTop: '16px' }}>Loading history...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px' }}>
                    <Clock size={40} color="var(--text3)" style={{ margin: '0 auto 16px' }} />
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '8px' }}>
                        {search ? 'No results found' : 'No history yet'}
                    </p>
                    <p style={{ color: 'var(--text3)', fontSize: '14px' }}>
                        {search ? 'Try a different search term' : 'Generate some speech and it will appear here'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filtered.map(item => (
                        <HistoryCard key={item.id} item={item} onDelete={handleDelete} />
                    ))}

                    {/* Load more */}
                    {hasMore && !search && (
                        <button
                            onClick={() => loadHistory(false)}
                            disabled={loadingMore}
                            style={{ width: '100%', padding: '12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
                            {loadingMore
                                ? <><span style={{ width: '14px', height: '14px', border: '2px solid var(--text3)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Loading...</>
                                : <><ChevronDown size={14} /> Load more</>}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default HistoryPage;