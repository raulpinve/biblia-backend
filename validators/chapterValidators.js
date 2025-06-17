const { param } = require("express-validator");
const manejarErroresDeValidacion = require("./manejarErroresDeValidacion");

const validarChapter = [
    param('chapter')
        .isInt({ gt: 0 })
        .withMessage('El ID del capítulo debe ser un número entero mayor que 0'),
        manejarErroresDeValidacion
];

module.exports = {
    validarChapter
}