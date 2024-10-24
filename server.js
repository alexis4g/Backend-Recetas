require('dotenv').config();  // Cargar variables de entorno
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// URI de conexión a MongoDB Atlas
const mongoURI = `mongodb+srv://alexis:${process.env.MONGODB_PASSWORD}@cluster0.cfg2k.mongodb.net/recetas_bbdd`;

// Conectar a MongoDB Atlas
mongoose.connect(mongoURI)  // Sin las opciones deprecadas
    .then(() => console.log('Conectado a MongoDB Atlas'))
    .catch((error) => console.error('Error al conectar a MongoDB Atlas:', error));

// Rutas
const usuariosRoutes = require('./routes/usuarios');
const recetasRoutes = require('./routes/recetas');

app.use('/api/usuarios', usuariosRoutes);
app.use('/api/recetas', recetasRoutes);

// Iniciar el servidor
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
