const { pool } = require("../initDB");
const ensureUserExists = require("./ensureUserExists");

exports.getFriendsList = async (req, res, next) => {
	try {
		const userId = req.user.id;
		await ensureUserExists(req.user);

		const { rows: friends } = await pool.query(
			`
			SELECT 
				u.id,
				u.first_name,
				u.last_name,
				u.image,
				u.email
			FROM friendships f
			JOIN users u ON (
				-- Si yo envié la solicitud, mi amigo es el friend_id
				(f.user_id = $1 AND u.id = f.friend_id)
				-- Si me la enviaron, mi amigo es el user_id
				OR (f.friend_id = $1 AND u.id = f.user_id)
			)
			WHERE f.status = 'accepted' AND (f.user_id = $1 OR f.friend_id = $1)
			`,
			[userId]
		);

		res.status(200).json({
			statusCode: 200,
			status: "success",
			data: friends,
		});
	} catch (error) {
		console.error("Error al obtener la lista de amigos:", error);
		next(error);
	}
};

exports.searchNonFriends = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const search = (req.query.consulta || "").trim();

		// Si no hay consulta, no buscar nada
		if (!search) {
			return res.json({ data: [] });
		}

		await ensureUserExists(req.user);

		const { rows } = await pool.query(
			`
			SELECT u.id, u.first_name, u.last_name, u.email, u.image
			FROM users u
			WHERE u.id != $1
			  AND (
				  LOWER(u.first_name || ' ' || u.last_name) LIKE LOWER('%' || $2 || '%')
				  OR LOWER(u.email) LIKE LOWER('%' || $2 || '%')
			  )
			  AND u.id NOT IN (
				  SELECT friend_id FROM friendships WHERE user_id = $1
				  UNION
				  SELECT user_id FROM friendships WHERE friend_id = $1
			  )
			ORDER BY u.first_name ASC
			LIMIT 20;
			`,
			[userId, search]
		);

		res.json({ data: rows });
	} catch (error) {
		next(error);
	}
};

exports.sendFriendRequest = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { recipientId } = req.body;

		if (!recipientId || userId === recipientId) {
			return res.status(400).json({ error: "ID de destinatario inválido." });
		}

		// Verifica si ya existe una relación entre los usuarios
		const { rows } = await pool.query(
			`
			SELECT 1 FROM friendships 
			WHERE (user_id = $1 AND friend_id = $2) 
			   OR (user_id = $2 AND friend_id = $1)
			`,
			[userId, recipientId]
		);

		if (rows.length > 0) {
			return res.status(409).json({ error: "Ya existe una relación entre estos usuarios." });
		}

		// Insertar solicitud pendiente
		await pool.query(
			`
			INSERT INTO friendships (user_id, friend_id, status)
			VALUES ($1, $2, 'pending')
			`,
			[userId, recipientId]
		);

		res.status(201).json({ message: "Solicitud de amistad enviada." });
	} catch (error) {
		next(error);
	}
};


exports.getReceivedRequests = async (req, res, next) => {
	try {
		const userId = req.user.id;
		await ensureUserExists(req.user);

		const { rows } = await pool.query(
			`
			SELECT u.id, u.first_name, u.last_name, u.image
			FROM friendships f
			JOIN users u ON u.id = f.user_id
			WHERE f.friend_id = $1 AND f.status = 'pending'
			ORDER BY f.created_at DESC
			`,
			[userId]
		);

		res.status(200).json({
			statusCode: 200,
			status: "success",
			data: rows,
		});
	} catch (error) {
		console.error("Error al obtener solicitudes:", error);
		next(error);
	}
};

exports.acceptFriendRequest = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id: senderId } = req.params;

		// Validación básica
		if (!senderId || senderId === userId) {
			return res.status(400).json({ error: "ID inválido." });
		}

		// Verifica que exista una solicitud pendiente enviada al usuario actual
		const { rows } = await pool.query(
			`
			SELECT * FROM friendships 
			WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'
			`,
			[senderId, userId]
		);

		if (rows.length === 0) {
			return res.status(404).json({ error: "No se encontró una solicitud pendiente." });
		}

		// Actualizar el estado a 'accepted'
		await pool.query(
			`
			UPDATE friendships 
			SET status = 'accepted' 
			WHERE user_id = $1 AND friend_id = $2
			`,
			[senderId, userId]
		);

		res.json({ message: "Solicitud de amistad aceptada." });
	} catch (error) {
		next(error);
	}
};

exports.rejectFriendRequest = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id: senderId } = req.params;

		// Validación
		if (!senderId || senderId === userId) {
			return res.status(400).json({ error: "ID inválido." });
		}

		// Eliminar la solicitud pendiente
		const result = await pool.query(
			`
			DELETE FROM friendships 
			WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'
			`,
			[senderId, userId]
		);

		if (result.rowCount === 0) {
			return res.status(404).json({ error: "No se encontró una solicitud pendiente para rechazar." });
		}

		res.json({ message: "Solicitud de amistad rechazada." });
	} catch (error) {
		next(error);
	}
};

exports.deleteFriend = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const friendId = req.params.id;

		if (!friendId || userId === friendId) {
			return res.status(400).json({ error: "ID de amigo inválido." });
		}

		await pool.query(
			`
			DELETE FROM friendships 
			WHERE (user_id = $1 AND friend_id = $2)
			   OR (user_id = $2 AND friend_id = $1)
			`,
			[userId, friendId]
		);

		res.status(200).json({ message: "Amistad eliminada." });
	} catch (error) {
		next(error);
	}
};
