import mongoose from 'mongoose';

const allowedTypes = [
    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic',
    'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
];

const pokemonSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: [true, 'L\'identifiant est requis'],
        unique: true,
        min: [1, 'L\'identifiant doit être un entier positif']
    },
    name: {
        english: { type: String },
        french: { type: String, required: [true, 'Le nom français est requis'] },
        japanese: { type: String },
        chinese: { type: String }
    },
    type: {
        type: [String],
        required: [true, 'Le type est requis'],
        validate: {
            validator: function (types) {
                return types.length > 0 && types.every(t => allowedTypes.includes(t));
            },
            message: () => `Type(s) invalide(s). Types autorisés : ${allowedTypes.join(', ')}`
        }
    },
    base: {
        HP: { type: Number, min: [1, 'HP doit être entre 1 et 255'], max: [255, 'HP doit être entre 1 et 255'] },
        Attack: { type: Number, min: [1, 'L\'attaque doit être entre 1 et 255'], max: [255, 'L\'attaque doit être entre 1 et 255'] },
        Defense: { type: Number, min: [1, 'La défense doit être entre 1 et 255'], max: [255, 'La défense doit être entre 1 et 255'] },
        SpecialAttack: { type: Number, min: [1, 'L\'attaque spéciale doit être entre 1 et 255'], max: [255, 'L\'attaque spéciale doit être entre 1 et 255'] },
        SpecialDefense: { type: Number, min: [1, 'La défense spéciale doit être entre 1 et 255'], max: [255, 'La défense spéciale doit être entre 1 et 255'] },
        Speed: { type: Number, min: [1, 'La vitesse doit être entre 1 et 255'], max: [255, 'La vitesse doit être entre 1 et 255'] }
    },
    image: { type: String },
    shinyImage: { type: String }
});

const Pokemon = mongoose.model('Pokemon', pokemonSchema);

export default Pokemon;