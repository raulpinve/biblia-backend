const { body, param, query } = require('express-validator');
const manejarErroresDeValidacion = require('./manejarErroresDeValidacion');

const validarAddNote = [
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
    body('note')
        .trim()
        .notEmpty()
        .withMessage('La nota no puede estar vacía.'),

    body('visibility')
        .optional()
        .isIn(['private', 'friends', 'public'])
        .withMessage('La visibilidad debe ser: private, friends o public.'),
    manejarErroresDeValidacion
];

const validarGetNotesByVerse = [
    param('verseId')
        .exists()
        .withMessage('Debes enviar verseId.')
        .bail()
        .isInt({ gt: 0 })
        .withMessage('El verseId debe ser un número entero positivo.'),
    manejarErroresDeValidacion
];

const validarGetFeedNotes = [
    query('pagina')
        .optional()
        .isInt({ min: 1 })
        .withMessage('La página debe ser un número entero positivo mayor o igual a 1.'),
]

const validateGetAllNotesWithVerses = [
	query('pagina')
		.optional()
		.isInt({ min: 1 })
		.withMessage('La página debe ser un número entero mayor a 0.'),
	query('limite')
		.optional()
		.isInt({ min: 1, max: 100 })
		.withMessage('El límite debe ser un número entre 1 y 100.'),
	query('consulta')
		.optional()
		.isString()
		.withMessage('La consulta debe ser un texto.'),
];

const validateUpdateNote = [
	param('noteId')
		.isInt({ min: 1 })
		.withMessage('El ID de la nota debe ser un número entero válido.'),

	body('note')
		.trim()
		.notEmpty()
		.withMessage('El texto de la nota no puede estar vacío.'),

	body('visibility')
		.isIn(['private', 'friends', 'public'])
		.withMessage('La visibilidad debe ser "private", "friends" o "public".'),
];


module.exports = {
    validarAddNote,
    validarGetNotesByVerse,
    validarGetFeedNotes,
    validateGetAllNotesWithVerses,
    validateUpdateNote
}