const express = require('express');
const Usuario = require('../models/Usuario');
const Receta = require('../models/Receta'); // Importamos el modelo de recetas
const router = express.Router();
const bcrypt = require('bcryptjs'); // Importación de librería
const jwt = require('jsonwebtoken');
const autorizacion = require('../middleware/check-auth'); // Importamos el middleware de autorización
require('dotenv').config();  // Cargar variables de entorno


router.get('/:id', autorizacion, async (req, res) => {
  const usuarioId = req.params.id; // ID del usuario que se va a obtener
  const usuarioAutenticadoId = req.userData.userId; // ID del usuario autenticado extraído del token

  // Solo permitimos obtener los datos si el usuario autenticado es el mismo que el que intenta acceder
  if (usuarioId !== usuarioAutenticadoId) {
      return res.status(403).json({ message: 'No tienes permiso para acceder a estos datos' });
  }

  try {
      // Encontramos al usuario por su ID
      const usuario = await Usuario.findById(usuarioId);

      if (!usuario) {
          return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      res.json({
          id: usuario._id,
          nombre: usuario.nombre,
          email: usuario.email,
          nivelDeCocina: usuario.nivelDeCocina,
      });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});

// Crear nuevo usuario
router.post('/crear', async (req, res, next) => {
    const { nombre, email, password, nivelDeCocina } = req.body;
    let hashedPassword;
    let nuevoUsuario;

    try {
        // Encriptar la contraseña
        hashedPassword = await bcrypt.hash(password, 12);

        // Crear el usuario
        nuevoUsuario = new Usuario({
            nombre,
            email,
            password: hashedPassword, // La nueva password será la encriptada
            nivelDeCocina,
        });

        // Guardar el usuario en la base de datos
        const usuarioGuardado = await nuevoUsuario.save();

    } catch (error) {
        return res.status(400).json({ message: error.message });
    }

    // Creación del token JWT
    let token;
    try {
        token = jwt.sign(
            {
                userId: nuevoUsuario.id,
                email: nuevoUsuario.email,
            },
            process.env.JWT_SECRET, 
            { expiresIn: '1h' } // El token expira en 1 hora
        );
    } catch (error) {
        const err = new Error('El proceso de alta ha fallado');
        err.code = 500;
        return next(err);
    }

    // Responder con éxito, incluyendo el token y los datos del usuario
    res.status(201).json({
        userId: nuevoUsuario.id,
        email: nuevoUsuario.email,
        token: token,
    });
});



//-------------------------------------------------------------------------------



// * Login de docentes
router.post("/login", async (req, res, next) => {
  const { email, password } = req.body;
  let usuarioExiste;

  // (1) Comprobación de email
  try {
    usuarioExiste = await Usuario.findOne({ email: email });
  } catch (error) {
    const err = new Error("No se ha podido realizar la operación. Pruebe más tarde");
    err.code = 500;
    return next(err);
  }

  // ? ¿Qué pasa si el docente no existe?
  if (!usuarioExiste) {
    const error = new Error("No se ha podido identificar al usuario. Credenciales erróneas.");
    error.code = 422; // ! 422: Datos de usuario inválidos
    return next(error);
  }

  // (2) Si existe el docente, ahora toca comprobar las contraseñas.
  let esValidoElPassword = false;
  try {
    esValidoElPassword = await bcrypt.compare(password, usuarioExiste.password);
  } catch (error) {
    const err = new Error("Error al verificar la contraseña. Intente de nuevo.");
    err.code = 500;
    return next(err);
  }

  if (!esValidoElPassword) {
    const error = new Error("No se ha podido identificar al usuario. Credenciales erróneas.");
    error.code = 401; // ! 401: Fallo de autenticación
    return next(error);
  }

  // (3) Generación del token
  let token;
  try {
    token = jwt.sign(
      {
        userId: usuarioExiste.id,
        email: usuarioExiste.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );
  } catch (error) {
    const err = new Error("El proceso de login ha fallado");
    err.code = 500;
    return next(err);
  }

  // (4) Responder con éxito, enviando el token y datos del usuario
  res.status(200).json({
    mensaje: "Docente ha entrado con éxito en el sistema",
    userId: usuarioExiste.id,
    email: usuarioExiste.email,
    token: token,
  });
});







//------------------------------------------------------------------------------
// // Ruta para login básico
// router.post('/login', async (req, res) => {
//     const { email, password } = req.body;

//     try {
//         const usuario = await Usuario.findOne({ email, password });
//         if (!usuario) {
//             return res.status(400).json({ message: 'Credenciales incorrectas' });
//         }

//         // Si el usuario existe, devolvemos sus datos
//         res.json({
//             message: 'Login exitoso',
//             usuario: {
//                 id: usuario._id,
//                 nombre: usuario.nombre,
//                 email: usuario.email,
//                 nivelDeCocina: usuario.nivelDeCocina,
//             }
//         });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// });

// Eliminar usuario y sus recetas (requiere autenticación)
router.delete('/eliminar/:id', autorizacion, async (req, res) => {
    const usuarioId = req.params.id;
    const usuarioAutenticadoId = req.userData.userId; // ID del usuario autenticado desde el token

    if (usuarioId !== usuarioAutenticadoId) {
        return res.status(403).json({ message: 'No tienes permiso para eliminar este usuario' });
    }

    try {
        // Eliminar todas las recetas del usuario
        await Receta.deleteMany({ autor: usuarioId });

        // Eliminar el usuario
        const usuarioEliminado = await Usuario.findByIdAndDelete(usuarioId);

        if (!usuarioEliminado) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario y sus recetas eliminados con éxito' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Modificar un usuario (requiere autenticación)
router.put('/modificar/:id', autorizacion, async (req, res) => {
    const usuarioId = req.params.id; // ID del usuario que se va a modificar
    const usuarioAutenticadoId = req.userData.userId; // ID del usuario autenticado extraído del token

    // Solo permitimos modificar si el usuario autenticado es el mismo que el que intenta modificar
    if (usuarioId !== usuarioAutenticadoId) {
        return res.status(403).json({ message: 'No tienes permiso para modificar este usuario' });
    }

    try {
        // Encontramos al usuario por su ID y actualizamos sus datos
        const usuarioActualizado = await Usuario.findByIdAndUpdate(usuarioId, req.body, { new: true });

        if (!usuarioActualizado) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({
            message: 'Usuario actualizado con éxito',
            usuario: {
                id: usuarioActualizado._id,
                nombre: usuarioActualizado.nombre,
                email: usuarioActualizado.email,
                nivelDeCocina: usuarioActualizado.nivelDeCocina,
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;
