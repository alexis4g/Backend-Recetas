const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    nivelDeCocina: { 
        type: String, 
        enum: ['principiante', 'intermedio', 'avanzado'], // Enum definition for allowed values
        default: 'principiante' // Default value
    }
});

module.exports = mongoose.model('Usuario', UsuarioSchema);

