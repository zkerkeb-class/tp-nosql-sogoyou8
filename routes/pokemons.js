import express from 'express';
import Pokemon from '../models/pokemon.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// GET /api/pokemons
router.get('/', async (req, res) => {
    try {
        const { type, name, sort, page = 1, limit = 50 } = req.query;

        const filter = {};

        if (type) {
            filter.type = type;
        }

        if (name) {
            // Chercher dans le nom français ET anglais
            filter.$or = [
                { 'name.french': { $regex: name, $options: 'i' } },
                { 'name.english': { $regex: name, $options: 'i' } }
            ];
        }

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const skip = (pageNum - 1) * limitNum;

        let query = Pokemon.find(filter);

        if (sort) {
            query = query.sort(sort);
        } else {
            query = query.sort('id');
        }

        query = query.skip(skip).limit(limitNum);

        const [data, total] = await Promise.all([
            query,
            Pokemon.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limitNum);

        res.json({
            data,
            page: pageNum,
            limit: limitNum,
            total,
            totalPages
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/pokemons/:id
router.get('/:id', async (req, res) => {
    try {
        const pokemon = await Pokemon.findOne({ id: parseInt(req.params.id) });
        if (!pokemon) {
            return res.status(404).json({ error: 'Pokémon non trouvé' });
        }
        res.json(pokemon);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/pokemons
router.post('/', auth, async (req, res) => {
    try {
        const pokemon = await Pokemon.create(req.body);
        res.status(201).json(pokemon);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT /api/pokemons/:id
router.put('/:id', auth, async (req, res) => {
    try {
        const pokemon = await Pokemon.findOneAndUpdate(
            { id: parseInt(req.params.id) },
            req.body,
            { new: true, runValidators: true }
        );

        if (!pokemon) {
            return res.status(404).json({ error: 'Pokémon non trouvé' });
        }

        res.json(pokemon);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/pokemons/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const pokemon = await Pokemon.findOneAndDelete({ id: parseInt(req.params.id) });

        if (!pokemon) {
            return res.status(404).json({ error: 'Pokémon non trouvé' });
        }

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;