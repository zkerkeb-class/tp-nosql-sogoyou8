import express from 'express';
import User from '../models/user.js';
import Pokemon from '../models/pokemon.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// POST /api/favorites/:pokemonId
router.post('/:pokemonId', auth, async (req, res) => {
    try {
        const pokemonId = parseInt(req.params.pokemonId);

        const pokemon = await Pokemon.findOne({ id: pokemonId });
        if (!pokemon) {
            return res.status(404).json({ error: 'Pokémon non trouvé' });
        }

        await User.findByIdAndUpdate(req.user.id, {
            $addToSet: { favorites: pokemonId }
        });

        const displayName = pokemon.name.french || pokemon.name.english || 'Pokémon';
        res.json({ message: `${displayName} ajouté aux favoris.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/favorites/:pokemonId
router.delete('/:pokemonId', auth, async (req, res) => {
    try {
        const pokemonId = parseInt(req.params.pokemonId);

        await User.findByIdAndUpdate(req.user.id, {
            $pull: { favorites: pokemonId }
        });

        res.json({ message: 'Pokémon retiré des favoris.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/favorites
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const pokemons = await Pokemon.find({ id: { $in: user.favorites } });

        res.json(pokemons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;