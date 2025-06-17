const { body, param } = require("express-validator");
const manejarErroresDeValidacion = require("./manejarErroresDeValidacion");

const validarHighlightVerse = [
    body('verses')
        .isArray({ min: 1 })
        .withMessage('Debes enviar una lista de versículos.')
        .bail()
        .custom((verses) => {
            const allInts = verses.every(id => Number.isInteger(id));
            if (!allInts) {
                throw new Error('Todos los IDs de versículos deben ser enteros.');
            }
            return true;
        }),

    body('color')
        .isString()
        .withMessage('El color debe ser una cadena de texto.')
        .bail()
        .custom((value) => {
            const validColors = ['yellow', 'green', 'blue', 'pink', 'transparent'];
            if (!validColors.includes(value)) {
                throw new Error('Color no permitido.');
            }
            return true;
        }),
    manejarErroresDeValidacion
];

module.exports = {
    validarHighlightVerse,
}