import express from 'express';
import Pokemon from '../models/pokemon.js';

const router = express.Router();

// GET /api/stats — Statistiques avancées avec agrégation
router.get('/', async (req, res) => {
    try {
        // Nombre total
        const totalPokemons = await Pokemon.countDocuments();

        // Nombre de Pokémon par type
        const countByType = await Pokemon.aggregate([
            { $unwind: '$type' },
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Moyenne des HP par type
        const avgHPByType = await Pokemon.aggregate([
            { $match: { 'base.HP': { $exists: true } } },
            { $unwind: '$type' },
            { $group: { _id: '$type', avgHP: { $avg: '$base.HP' } } },
            { $sort: { avgHP: -1 } }
        ]);

        // Moyennes globales
        const globalAvgResult = await Pokemon.aggregate([
            {
                $match: {
                    'base.HP': { $exists: true },
                    'base.Attack': { $exists: true },
                    'base.Defense': { $exists: true },
                    'base.Speed': { $exists: true }
                }
            },
            {
                $group: {
                    _id: null,
                    avgHP: { $avg: '$base.HP' },
                    avgAttack: { $avg: '$base.Attack' },
                    avgDefense: { $avg: '$base.Defense' },
                    avgSpeed: { $avg: '$base.Speed' }
                }
            }
        ]);
        const globalAvg = globalAvgResult[0] || null;

        // Pokémon avec le plus d'attaque
        const highestAttack = await Pokemon.findOne({ 'base.Attack': { $exists: true } })
            .sort({ 'base.Attack': -1 })
            .select('id name type base image');

        // Pokémon avec le plus de HP
        const highestHP = await Pokemon.findOne({ 'base.HP': { $exists: true } })
            .sort({ 'base.HP': -1 })
            .select('id name type base image');

        // Pokémon le plus rapide
        const fastestPokemon = await Pokemon.findOne({ 'base.Speed': { $exists: true } })
            .sort({ 'base.Speed': -1 })
            .select('id name type base image');

        // Pokémon avec la meilleure défense
        const highestDefense = await Pokemon.findOne({ 'base.Defense': { $exists: true } })
            .sort({ 'base.Defense': -1 })
            .select('id name type base image');

        res.json({
            totalPokemons,
            countByType,
            avgHPByType,
            globalAvg,
            highestAttack,
            highestHP,
            fastestPokemon,
            highestDefense
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;