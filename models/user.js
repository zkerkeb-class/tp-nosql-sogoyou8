import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Le nom d\'utilisateur est requis'],
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Le mot de passe est requis']
    },
    favorites: {
        type: [Number],
        default: []
    }
});

// Middleware pre-save pour hasher le mot de passe
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

const User = mongoose.model('User', userSchema);

export default User;