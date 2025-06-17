const { query, param, body } = require('express-validator');

exports.validateSearchNonFriends = [
	query('consulta')
		.trim()
		.notEmpty()
		.withMessage('Debes enviar una consulta para buscar usuarios.')
		.isLength({ min: 2 })
		.withMessage('La consulta debe tener al menos 2 caracteres.'),
];

exports.validateAcceptFriendRequest = [
	param('id')
		.exists().withMessage('El ID del remitente es obligatorio.')
		.bail()
		.isString().withMessage('El ID debe ser una cadena.')
		.isLength({ min: 5 }).withMessage('El ID debe tener al menos 5 caracteres.')
];

exports.validateSendFriendRequest = [
	body('recipientId')
		.exists().withMessage('El ID del destinatario es obligatorio.')
		.bail()
		.isString().withMessage('El ID debe ser una cadena.')
		.isLength({ min: 5 }).withMessage('El ID debe tener al menos 5 caracteres.')
];

exports.validateRejectFriendRequest = [
	param('id')
		.exists().withMessage('El ID del remitente es obligatorio.')
		.bail()
		.isString().withMessage('El ID debe ser una cadena.')
		.isLength({ min: 5 }).withMessage('El ID debe tener al menos 5 caracteres.')
		.matches(/^[a-zA-Z0-9_-]+$/).withMessage('El ID contiene caracteres no válidos.')
];

exports.validateDeleteFriend = [
	param('id')
		.exists().withMessage('El ID del amigo es obligatorio.')
		.bail()
		.isString().withMessage('El ID debe ser una cadena.')
		.isLength({ min: 5 }).withMessage('El ID debe tener al menos 5 caracteres.')
];