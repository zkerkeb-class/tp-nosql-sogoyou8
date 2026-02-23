import express from 'express';
import Team from '../models/team.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// POST /api/teams — Créer une équipe
router.post('/', auth, async (req, res) => {
    try {
        const team = await Team.create({
            user: req.user.id,
            name: req.body.name,
            pokemons: req.body.pokemons || []
        });

        res.status(201).json(team);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// GET /api/teams — Lister mes équipes
router.get('/', auth, async (req, res) => {
    try {
        const teams = await Team.find({ user: req.user.id }).populate('pokemons');
        res.json(teams);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/teams/:id — Détail d'une équipe
router.get('/:id', auth, async (req, res) => {
    try {
        const team = await Team.findOne({ _id: req.params.id, user: req.user.id }).populate('pokemons');

        if (!team) {
            return res.status(404).json({ error: 'Équipe non trouvée' });
        }

        res.json(team);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/teams/:id — Modifier une équipe
router.put('/:id', auth, async (req, res) => {
    try {
        const team = await Team.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { name: req.body.name, pokemons: req.body.pokemons },
            { new: true, runValidators: true }
        ).populate('pokemons');

        if (!team) {
            return res.status(404).json({ error: 'Équipe non trouvée' });
        }

        res.json(team);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/teams/:id — Supprimer une équipe
router.delete('/:id', auth, async (req, res) => {
    try {
        const team = await Team.findOneAndDelete({ _id: req.params.id, user: req.user.id });

        if (!team) {
            return res.status(404).json({ error: 'Équipe non trouvée' });
        }

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;