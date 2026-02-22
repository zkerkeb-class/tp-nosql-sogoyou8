import 'dotenv/config';
import mongoose from 'mongoose';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Pokemon from '../models/pokemon.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connecté à MongoDB !');

        const rawData = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'pokemons.json'), 'utf-8'));

        // Filtrer les entrées qui ont au minimum un id, un nom et un type
        const data = rawData
            .filter(p => p.id && p.name && p.type)
            .map(p => {
                // Ajouter l'image shiny si elle existe
                const shinyPath = join(__dirname, '..', 'assets', 'pokemons', 'shiny', `${p.id}.png`);
                return {
                    ...p,
                    shinyImage: existsSync(shinyPath)
                        ? `http://localhost:${process.env.PORT || 3000}/assets/pokemons/shiny/${p.id}.png`
                        : null
                };
            });

        await Pokemon.deleteMany({});
        console.log('Collection vidée.');

        const result = await Pokemon.insertMany(data);
        console.log(`${result.length} Pokémon insérés avec succès !`);

        await mongoose.connection.close();
        console.log('Connexion fermée.');
    } catch (error) {
        console.error('Erreur lors du seed :', error.message);
        process.exit(1);
    }
};

seed();