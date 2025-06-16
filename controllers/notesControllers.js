const { pool } = require("../initDB");
const ensureUserExists = require("./ensureUserExists");

exports.addNote = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { verses, note, visibility} = req.body;

		// Validación básica
		if (!Array.isArray(verses) || verses.length === 0 || !note?.trim()) {
			return res.status(400).json({
				statusCode: 400,
				status: "fail",
				message: "Debes enviar una nota y una lista de versículos.",
			});
		}

		const visibilityOptions = ['private', 'friends', 'public'];
		const finalVisibility = visibilityOptions.includes(visibility) ? visibility : 'private';

		// Asegura que el usuario exista
		await ensureUserExists(req.user);

		// Crear la nota
		const { rows: noteRows } = await pool.query(
			`INSERT INTO notes (user_id, note, visibility) VALUES ($1, $2, $3) RETURNING id`,
			[userId, note, finalVisibility]
		);
		const noteId = noteRows[0].id;

		// Asociar nota con versículos
		const values = [];
		const placeholders = verses.map((verseId, i) => {
			values.push(noteId, verseId);
			return `($${i * 2 + 1}, $${i * 2 + 2})`;
		}).join(", ");

		await pool.query(
			`INSERT INTO note_verse (note_id, verse_id) VALUES ${placeholders}`,
			values
		);

		return res.status(201).json({
			statusCode: 201,
			status: "success",
			message: "Nota creada y asociada con éxito.",
			data: {
				noteId,
				verses: verses,
			},
		});
	} catch (error) {
		next(error);
	}
}

exports.getNotesByVerse = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { verseId } = req.params;

		if (!verseId) {
			return res.status(400).json({
				statusCode: 400,
				status: "fail",
				message: "Debes enviar bookId, chapter y verse.",
			});
		}

		// Obtener notas del usuario para ese versículo
		const { rows: notesWithVerses } = await pool.query(
			`
			SELECT 
				n.id AS note_id,
				n.note,
				n.created_at,
				n.visibility,
				v.id AS verse_id,
				v.book_id,
				v.chapter,
				v.verse,
				v.text
			FROM notes n
			JOIN note_verse nv1 ON nv1.note_id = n.id
			JOIN note_verse nv2 ON nv2.note_id = n.id
			JOIN verses v ON v.id = nv2.verse_id
			WHERE nv1.verse_id = $1 AND n.user_id = $2
			ORDER BY n.created_at DESC, v.book_id, v.chapter, v.verse
			`,
			[verseId, userId]
		);

		// Agrupar por nota
		const notesMap = new Map();

		for (const row of notesWithVerses) {
			const noteId = row.note_id;
			if (!notesMap.has(noteId)) {
				notesMap.set(noteId, {
					id: noteId,
					text: row.note,
					createdAt: row.created_at,
					visibility: row.visibility,
					verses: [],
				});
			}

			notesMap.get(noteId).verses.push({
				id: row.verse_id,
				bookId: row.book_id,
				chapter: row.chapter,
				verse: row.verse,
				text: row.text,
			});
		}

		return res.status(200).json({
			statusCode: 200,
			status: "success",
			data: {
				verseId,
				notes: Array.from(notesMap.values())
			}
		});
	} catch (error) {
		console.error("Error al obtener nota del versículo:", error);
		next(error);
	}
};

exports.getFeedNotes = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const pagina = parseInt(req.query.pagina) || 1;
		const limite = parseInt(req.query.limite) || 10;
		const offset = (pagina - 1) * limite;

		// Contar total de notas visibles para el feed
		const { rows: countRows } = await pool.query(
			`
			SELECT COUNT(*) FROM notes n
			LEFT JOIN friendships f ON (
				(f.user_id = $1 AND f.friend_id = n.user_id)
				OR (f.friend_id = $1 AND f.user_id = n.user_id)
			)
			WHERE 
				n.user_id = $1
				OR (n.visibility = 'public' AND n.user_id != $1)
				OR (
					n.visibility = 'friends' 
					AND n.user_id != $1 
					AND f.status = 'accepted'
				)
			`,
			[userId]
		);
		const totalNotas = parseInt(countRows[0].count);
		const totalPaginas = Math.ceil(totalNotas / limite);

		// Obtener notas visibles con paginación
		const { rows: notas } = await pool.query(
			`
			SELECT 
				n.id,
				n.note,
				n.visibility,
				n.created_at,
				u.id AS user_id,
				u.first_name,
				u.last_name,
				u.image
			FROM notes n
			JOIN users u ON u.id = n.user_id
			LEFT JOIN friendships f ON (
				(f.user_id = $1 AND f.friend_id = n.user_id)
				OR (f.friend_id = $1 AND f.user_id = n.user_id)
			)
			WHERE 
				n.user_id = $1
				OR (n.visibility = 'public' AND n.user_id != $1)
				OR (
					n.visibility = 'friends' 
					AND n.user_id != $1 
					AND f.status = 'accepted'
				)
			ORDER BY n.created_at DESC
			LIMIT $2 OFFSET $3
			`,
			[userId, limite, offset]
		);

		// Obtener versículos para cada nota
		const notaIds = notas.map(n => n.id);
		let versesMap = {};

		if (notaIds.length > 0) {
			const { rows: verses } = await pool.query(
				`
				SELECT 
					nv.note_id,
					v.id,
					v.book_id,
					v.chapter,
					v.verse,
					v.text
				FROM note_verse nv
				JOIN verses v ON v.id = nv.verse_id
				WHERE nv.note_id = ANY($1::int[])
				ORDER BY v.book_id, v.chapter, v.verse
				`,
				[notaIds]
			);

			versesMap = verses.reduce((acc, v) => {
				if (!acc[v.note_id]) acc[v.note_id] = [];
				acc[v.note_id].push({
					id: v.id,
					bookId: v.book_id,
					chapter: v.chapter,
					verse: v.verse,
					text: v.text,
				});
				return acc;
			}, {});
		}

		// Armar respuesta final
		const data = notas.map(nota => ({
			id: nota.id,
			text: nota.note,
			visibility: nota.visibility,
			createdAt: nota.created_at,
			authorName: [nota.first_name, nota.last_name].filter(Boolean).join(" "),
			authorImage: nota.image,
			verses: versesMap[nota.id] || [],
		}));

		return res.status(200).json({
			statusCode: 200,
			status: "success",
			paginacion: {
				paginaActual: pagina,
				totalPaginas,
			},
			data,
		});
	} catch (error) {
		console.error("Error al obtener feed de notas:", error);
		next(error);
	}
};


exports.getNoteWithVerses = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { noteId } = req.params;

		if (!noteId) {
			return res.status(400).json({
				statusCode: 400,
				status: "fail",
				message: "Debes proporcionar el ID de la nota.",
			});
		}

		// Buscar nota del usuario
		const { rows: noteRows } = await pool.query(
			`
			SELECT id, note, visibility, created_at
			FROM notes
			WHERE id = $1 AND user_id = $2
			`,
			[noteId, userId]
		);

		if (noteRows.length === 0) {
			return res.status(404).json({
				statusCode: 404,
				status: "fail",
				message: "Nota no encontrada o no te pertenece.",
			});
		}

		const note = noteRows[0];

		// Obtener versículos asociados
		const { rows: verses } = await pool.query(
			`
			SELECT 
				v.id,
				v.book_id,
				v.chapter,
				v.verse,
				v.text
			FROM note_verse nv
			JOIN verses v ON v.id = nv.verse_id
			WHERE nv.note_id = $1
			ORDER BY v.book_id, v.chapter, v.verse
			`,
			[noteId]
		);

		return res.status(200).json({
			statusCode: 200,
			status: "success",
			data: {
				note: {
					id: note.id,
					text: note.note,
					visibility: note.visibility,
					createdAt: note.created_at,
					verses: verses.map(v => ({
						id: v.id,
						bookId: v.book_id,
						chapter: v.chapter,
						verse: v.verse,
						text: v.text
					}))
				}
			}
		});
	} catch (error) {
		console.error("Error al obtener la nota con sus versículos:", error);
		next(error);
	}
};
exports.getNotesWithVerses = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const pagina = parseInt(req.query.pagina) || 1;
		const limite = parseInt(req.query.limite) || 10;
		const offset = (pagina - 1) * limite;

		// Obtener total de notas del usuario
		const { rows: countRows } = await pool.query(
			`SELECT COUNT(*) FROM notes WHERE user_id = $1`,
			[userId]
		);
		const totalNotas = parseInt(countRows[0].count);
		const totalPaginas = Math.ceil(totalNotas / limite);

		// Obtener las notas paginadas
		const { rows: notas } = await pool.query(
			`
			SELECT id, note, visibility, created_at
			FROM notes
			WHERE user_id = $1
			ORDER BY created_at DESC
			LIMIT $2 OFFSET $3
			`,
			[userId, limite, offset]
		);

		// Si no hay notas
		if (notas.length === 0) {
			return res.status(200).json({
				statusCode: 200,
				status: "success",
				paginacion: {
					paginaActual: pagina,
					totalPaginas
				},
				data: []
			});
		}

		// Obtener versículos para todas las notas
		const notaIds = notas.map(n => n.id);
		const { rows: verses } = await pool.query(
			`
			SELECT 
				nv.note_id,
				v.id,
				v.book_id,
				v.chapter,
				v.verse,
				v.text
			FROM note_verse nv
			JOIN verses v ON v.id = nv.verse_id
			WHERE nv.note_id = ANY($1::int[])
			ORDER BY v.book_id, v.chapter, v.verse
			`,
			[notaIds]
		);

		// Agrupar versículos por nota
		const versosPorNota = {};
		verses.forEach(v => {
			if (!versosPorNota[v.note_id]) versosPorNota[v.note_id] = [];
			versosPorNota[v.note_id].push({
				id: v.id,
				bookId: v.book_id,
				chapter: v.chapter,
				verse: v.verse,
				text: v.text
			});
		});

		// Armar la respuesta final
		const data = notas.map(n => ({
			id: n.id,
			text: n.note,
			visibility: n.visibility,
			createdAt: n.created_at,
			verses: versosPorNota[n.id] || []
		}));

		return res.status(200).json({
			statusCode: 200,
			status: "success",
			paginacion: {
				paginaActual: pagina,
				totalPaginas
			},
			data
		});
	} catch (error) {
		console.error("Error al obtener las notas con versículos:", error);
		next(error);
	}
};

exports.getAllNotesWithVerses = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const pagina = parseInt(req.query.pagina) || 1;
		const limite = parseInt(req.query.limite) || 10;
		const offset = (pagina - 1) * limite;
		const consulta = req.query.consulta?.toLowerCase() || "";

		// Total de notas del usuario con filtro
		const { rows: countRows } = await pool.query(
			`SELECT COUNT(*) FROM notes WHERE user_id = $1 AND LOWER(note) ILIKE $2`,
			[userId, `%${consulta}%`]
		);
		const totalNotas = parseInt(countRows[0].count);
		const totalPaginas = Math.ceil(totalNotas / limite);

		// Obtener notas paginadas y filtradas
		const { rows: notas } = await pool.query(
			`
			SELECT id, note, visibility, created_at
			FROM notes
			WHERE user_id = $1 AND LOWER(note) ILIKE $2
			ORDER BY created_at DESC
			LIMIT $3 OFFSET $4
			`,
			[userId, `%${consulta}%`, limite, offset]
		);

		// Si no hay notas
		if (notas.length === 0) {
			return res.status(200).json({
				statusCode: 200,
				status: "success",
				paginacion: {
					paginaActual: pagina,
					totalPaginas
				},
				data: []
			});
		}

		// Obtener versículos asociados
		const notaIds = notas.map(n => n.id);
		const { rows: verses } = await pool.query(
			`
			SELECT 
				nv.note_id,
				v.id,
				v.book_id,
				v.chapter,
				v.verse,
				v.text
			FROM note_verse nv
			JOIN verses v ON v.id = nv.verse_id
			WHERE nv.note_id = ANY($1::int[])
			ORDER BY v.book_id, v.chapter, v.verse
			`,
			[notaIds]
		);

		const versosPorNota = {};
		for (const v of verses) {
			if (!versosPorNota[v.note_id]) versosPorNota[v.note_id] = [];
			versosPorNota[v.note_id].push({
				id: v.id,
				bookId: v.book_id,
				chapter: v.chapter,
				verse: v.verse,
				text: v.text
			});
		}

		const data = notas.map(n => ({
			id: n.id,
			text: n.note,
			visibility: n.visibility,
			createdAt: n.created_at,
			verses: versosPorNota[n.id] || []
		}));

		return res.status(200).json({
			statusCode: 200,
			status: "success",
			paginacion: {
				paginaActual: pagina,
				totalPaginas
			},
			data
		});
	} catch (error) {
		console.error("Error al obtener todas las notas del usuario:", error);
		next(error);
	}
};



exports.updateNote = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { noteId } = req.params;
		const { note, visibility } = req.body;

		// Validar datos básicos
		if (!note || !['private', 'friends', 'public'].includes(visibility)) {
			return res.status(400).json({
				statusCode: 400,
				status: "fail",
				message: "Texto o visibilidad inválidos.",
			});
		}

		// Verificar que la nota exista y pertenezca al usuario
		const { rows: existingNote } = await pool.query(
			`SELECT id FROM notes WHERE id = $1 AND user_id = $2`,
			[noteId, userId]
		);

		if (existingNote.length === 0) {
			return res.status(404).json({
				statusCode: 404,
				status: "fail",
				message: "Nota no encontrada o no te pertenece.",
			});
		}
		// Actualizar la nota (solo texto y visibilidad)
		await pool.query(
			`UPDATE notes SET note = $1, visibility = $2 WHERE id = $3`,
			[note, visibility, noteId]
		);

		return res.status(200).json({
			statusCode: 200,
			status: "success",
			message: "Nota actualizada correctamente."
		});
	} catch (error) {
		console.error("Error al actualizar nota:", error);
		next(error);
	}
};

exports.deleteNote = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { noteId } = req.params;

		// Verifica que la nota exista y pertenezca al usuario
		const { rows: existingNote } = await pool.query(
			`SELECT id FROM notes WHERE id = $1 AND user_id = $2`,
			[noteId, userId]
		);

		if (existingNote.length === 0) {
			return res.status(404).json({
				statusCode: 404,
				status: "fail",
				message: "Nota no encontrada o no te pertenece.",
			});
		}

		await pool.query(
			`DELETE FROM notes WHERE id = $1 AND user_id = $2`,
			[noteId, userId]
		);

		return res.status(200).json({
			statusCode: 200,
			status: "success",
			message: "Nota eliminada correctamente.",
		});
	} catch (error) {
		console.error("Error al eliminar nota:", error);
		next(error);
	}
};