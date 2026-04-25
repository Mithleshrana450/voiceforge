// db.js — In-memory store (replace with real DB for production)
// For production: use MongoDB (mongoose) or PostgreSQL (prisma)

const { v4: uuidv4 } = require('uuid');

const users = new Map();       // id → user
const byEmail = new Map();     // email → id
const sessions = new Map();    // token → userId
const usageStore = new Map();  // userId → { generations, month }

const PLAN_LIMITS = {
    free: { generations: 5, voices: 1 },
    pro: { generations: 500, voices: 5 },
    business: { generations: Infinity, voices: Infinity },
};

module.exports = {
    // ── Users ────────────────────────────────
    createUser({ name, email, passwordHash, googleId, plan = 'free' }) {
        if (byEmail.has(email)) throw new Error('Email already registered');
        const id = uuidv4();
        const user = {
            id, name, email,
            passwordHash: passwordHash || null,
            googleId: googleId || null,
            plan,
            createdAt: new Date().toISOString(),
        };
        users.set(id, user);
        byEmail.set(email, id);
        return user;
    },

    findByEmail(email) {
        const id = byEmail.get(email);
        return id ? users.get(id) : null;
    },

    findById(id) {
        return users.get(id) || null;
    },

    findByGoogleId(googleId) {
        for (const user of users.values()) {
            if (user.googleId === googleId) return user;
        }
        return null;
    },

    updateUser(id, updates) {
        const user = users.get(id);
        if (!user) throw new Error('User not found');
        const updated = { ...user, ...updates };
        users.set(id, updated);
        return updated;
    },

    // ── Plan limits ──────────────────────────
    getPlanLimits(plan) {
        return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    },

    // ── Usage tracking ───────────────────────
    getUsage(userId) {
        const now = new Date();
        const month = `${now.getFullYear()}-${now.getMonth() + 1}`;
        const key = `${userId}:${month}`;
        return usageStore.get(key) || { generations: 0, month };
    },

    incrementUsage(userId) {
        const now = new Date();
        const month = `${now.getFullYear()}-${now.getMonth() + 1}`;
        const key = `${userId}:${month}`;
        const current = usageStore.get(key) || { generations: 0, month };
        const updated = { ...current, generations: current.generations + 1 };
        usageStore.set(key, updated);
        return updated;
    },

    canGenerate(userId, plan) {
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
        if (limits.generations === Infinity) return true;
        const usage = this.getUsage(userId);
        return usage.generations < limits.generations;
    },

    PLAN_LIMITS,
};