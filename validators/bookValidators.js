const { param } = require("express-validator");
const manejarErroresDeValidacion = require("./manejarErroresDeValidacion");

const validarBookId = [
    param('bookId')
        .isInt({ gt: 0 })
        .withMessage('El ID del libro debe ser un número entero mayor que 0'),
        manejarErroresDeValidacion
];

module.exports = {
    validarBookId
}