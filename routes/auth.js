import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Le nom d\'utilisateur et le mot de passe sont requis.' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Ce nom d\'utilisateur est déjà pris.' });
        }

        // Le pre-save hashera automatiquement le mot de passe
        const user = new User({ username, password });
        await user.save();

        res.status(201).json({ message: `Utilisateur ${user.username} créé avec succès.` });
    } catch (error) {
        console.error('Erreur register:', error);
        res.status(400).json({ error: error.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Le nom d\'utilisateur et le mot de passe sont requis.' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Identifiants invalides.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Identifiants invalides.' });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: 'Configuration serveur manquante (JWT_SECRET).' });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (error) {
        console.error('Erreur login:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;