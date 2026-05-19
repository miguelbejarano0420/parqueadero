const { validationResult } = require('express-validator');

// MIDDLEWARE DE VALIDACIÓN DE ENTRADAS
// Recibe un arreglo de reglas definidas con express-validator (body(), param())
// y las ejecuta sobre la petición antes de que llegue al controlador.
//
// Si algún dato no cumple las reglas (placa con formato incorrecto,
// método de pago inválido, contraseña muy corta, etc.), rechaza la
// petición con código 400 y devuelve el primer mensaje de error claro.
//
// Esto evita que datos malformados lleguen a la base de datos
// y centraliza la validación en un solo lugar reutilizable.
function validate(checks) {
  return async (req, res, next) => {
    // Ejecutar cada regla de validación sobre req.body / req.params / req.query
    for (const check of checks) await check.run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Retorna solo el primer error para no confundir al cliente
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }
    next(); // Todos los datos son válidos: continúa al controlador
  };
}

module.exports = validate;
