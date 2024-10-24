const mongoose = require('mongoose');

const RecetaSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    ingredientes: { type: [String], required: true },
    instrucciones: { type: [String], required: true },
    tiempoDePreparacion: { type: Number, required: true },
    nivelDeDificultad: { type: String, default: 'principiante' },
    autor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
});

module.exports = mongoose.model('Receta', RecetaSchema);

