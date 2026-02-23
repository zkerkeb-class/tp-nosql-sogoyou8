import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Le nom de l\'équipe est requis']
    },
    pokemons: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pokemon' }],
        validate: {
            validator: function (arr) {
                return arr.length <= 6;
            },
            message: 'Une équipe ne peut pas contenir plus de 6 Pokémon'
        },
        default: []
    }
});

const Team = mongoose.model('Team', teamSchema);

export default Team;