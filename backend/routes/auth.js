const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../db');
const { ObjectId } = require('mongodb');
const { requireAuth } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const db = getDB();

        // Validate
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        // Check uniqueness
        const existingUser = await db.collection('users').findOne({
            $or: [{ email }, { username }]
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert
        const result = await db.collection('users').insertOne({
            username,
            email,
            password: hashedPassword,
            createdAt: new Date()
        });

        const user = { id: result.insertedId, username, email };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({ token, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = getDB();

        const userDoc = await db.collection('users').findOne({ email });
        if (!userDoc) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, userDoc.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = { id: userDoc._id, username: userDoc.username, email: userDoc.email };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });

        res.json({ token, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Me
router.get('/me', requireAuth, async (req, res) => {
    try {
        const db = getDB();
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(req.user.id) },
            { projection: { password: 0 } }
        );
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
