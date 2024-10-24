const express = require('express');
const Receta = require('../models/Receta');
const Usuario = require('../models/Usuario');
const router = express.Router();
const autorizacion = require('../middleware/check-auth'); // Importamos el middleware de autorización

//----------------------------funcion actualiza usuarios al crear o eliminar recetas
const actualizarNivelUsuario = async (usuarioId) => {
    try {
        // Contamos el número total de recetas creadas por el usuario
        const cantidadDeRecetas = await Receta.countDocuments({ autor: usuarioId });

        // Determinamos el nuevo nivel basado en la cantidad de recetas
        let nuevoNivel;
        if (cantidadDeRecetas <= 2) {
            nuevoNivel = 'principiante';
        } 
        else if (cantidadDeRecetas <= 5) { 
            nuevoNivel = 'intermedio';
        } 
        else if (cantidadDeRecetas > 8) {
            nuevoNivel = 'avanzado';
        }

        // Actualizamos el nivel del usuario en la base de datos
        await Usuario.findByIdAndUpdate(usuarioId, { nivelDeCocina: nuevoNivel });
    } catch (error) {
        console.error('Error actualizando nivel de usuario:', error);
    }
};

// Buscar recetas por ingrediente, nivel de dificultad, tiempo de preparación y/o usuario específico (no requiere autenticación)
router.get('/buscar', async (req, res) => {
    const { ingrediente, nivel, maxTiempo, usuarioId } = req.query; // Obtenemos los parámetros de la query string
    const filtros = {}; // Inicializamos un objeto para los filtros

    // Si se proporciona ingrediente, lo agregamos al filtro
    if (ingrediente) {
        filtros.ingredientes = { $regex: ingrediente, $options: 'i' }; // 'i' hace que la búsqueda no distinga mayúsculas y minúsculas
      }

    // Si se proporciona nivel de dificultad, lo agregamos al filtro
    if (nivel) {
        filtros.nivelDeDificultad = nivel;
    }

    // Si se proporciona tiempo máximo de preparación, lo agregamos al filtro
    if (maxTiempo) {
        filtros.tiempoDePreparacion = { $lte: parseInt(maxTiempo, 10) };
    }

    // Si se proporciona usuarioId, lo agregamos al filtro
    if (usuarioId) {
        filtros.autor = usuarioId;
    }

    try {
        // Buscamos recetas usando el filtro dinámico
        const recetas = await Receta.find(filtros).populate('autor', 'nombre nivelDeCocina').sort({ titulo: 1 });
        res.json(recetas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Crear nueva receta (autorización requerida)
router.post('/crear', autorizacion, async (req, res) => {
    try {
        // Usamos el ID del usuario autenticado que proviene del token
        const nuevaReceta = new Receta({
            ...req.body,
            autor: req.userData.userId // El usuario autenticado será el autor de la receta
        });

        const recetaGuardada = await nuevaReceta.save();

        // Actualizamos el nivel del usuario después de crear la receta
        await actualizarNivelUsuario(nuevaReceta.autor);

        res.status(201).json(recetaGuardada);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Obtener todas las recetas (no requiere autenticación)
router.get('/', async (req, res) => {
    try {
        const recetas = await Receta.find().populate('autor', 'nombre nivelDeCocina');
        res.json(recetas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Obtener una receta específica por su id
router.get('/:id', async (req, res) => {
    try {
        const receta = await Receta.findById(req.params.id).populate('autor', 'nombre nivelDeCocina');
        if (!receta) {
            return res.status(404).json({ message: 'Receta no encontrada' });
        }
        res.json(receta);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
module.exports = router;

// Obtener recetas de un usuario específico (no requiere autenticación)
router.get('/usuario/:usuarioId', async (req, res) => {
    try {
        const recetasUsuario = await Receta.find({ autor: req.params.usuarioId });
        res.json(recetasUsuario);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Actualizar una receta (autorización requerida)
router.put('/actualizar/:id', autorizacion, async (req, res) => {
    try {
        const receta = await Receta.findOne({ _id: req.params.id, autor: req.userData.userId }); // Verificamos que el usuario autenticado sea el autor de la receta
        if (!receta) {
            return res.status(404).json({ message: 'Receta no encontrada o no tienes permiso para actualizarla' });
        }

        const recetaActualizada = await Receta.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(recetaActualizada);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Eliminar una receta (autorización requerida)
router.delete('/eliminar/:id', autorizacion, async (req, res) => {
    try {
        // Verificamos que la receta exista y que el usuario autenticado sea el autor
        const recetaEliminada = await Receta.findOneAndDelete({ _id: req.params.id, autor: req.userData.userId });
        if (!recetaEliminada) {
            return res.status(404).json({ message: 'Receta no encontrada o no tienes permiso para eliminarla' });
        }

        // Actualizamos el nivel del usuario después de eliminar la receta
        await actualizarNivelUsuario(recetaEliminada.autor);

        res.json({ message: 'Receta eliminada con éxito' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

