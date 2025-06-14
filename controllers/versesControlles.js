const { throwNotFoundError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const ensureUserExists = require("./ensureUserExists");

exports.getVerses = async (req, res, next) => {
    const { bookId, chapter } = req.params;
    const userId = req.user?.id;

    try {
        const { rows } = await pool.query(
        `
            SELECT 
                v.*,
                hv.color AS highlight_color,
                CASE WHEN hv.verse_id IS NOT NULL THEN true ELSE false END AS is_highlighted,
                CASE WHEN n.id IS NOT NULL THEN true ELSE false END AS has_note
            FROM verses v
            LEFT JOIN highlighted_verse hv 
                ON hv.verse_id = v.id AND hv.user_id = $3
            LEFT JOIN note_verse nv 
                ON nv.verse_id = v.id
            LEFT JOIN notes n 
                ON n.id = nv.note_id AND n.user_id = $3
            WHERE v.book_id = $1 AND v.chapter = $2
            ORDER BY v.verse ASC
        `,
            [bookId, chapter, userId]
        );

        if (rows.length === 0) {
            throwNotFoundError("No hay versículos por mostrar.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: rows.map(v => ({
                id: v.id,
                bookId: v.book_id,
                chapter: v.chapter,
                verse: v.verse,
                text: v.text,
                isHighlighted: v.is_highlighted,
                highlightColor: v.highlight_color,
                hasNote: v.has_note
            }))
        });
    } catch (error) {
        next(error);
    }
};

exports.highlightVerse = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { verses, color } = req.body;
		const { bookId, chapter } = req.params;

		if (!Array.isArray(verses) || verses.length === 0) {
			return res.status(400).json({
				statusCode: 400,
				status: "fail",
				message: "Debes enviar una lista de versículos.",
			});
		}

		// Validar color permitido o especial para borrar
		const validColors = ['yellow', 'green', 'blue', 'pink'];
		const isDeleteAction = color === 'transparent';

		if (!isDeleteAction && !validColors.includes(color)) {
			return res.status(400).json({
				statusCode: 400,
				status: "fail",
				message: "Color no permitido.",
			});
		}

		await ensureUserExists(req.user);

		// Buscar los IDs reales de los versículos
		const verseIds = [];

		for (const verse of verses) {
			const { rows } = await pool.query(
				`SELECT id FROM verses WHERE book_id = $1 AND chapter = $2 AND verse = $3 LIMIT 1`,
				[bookId, chapter, verse]
			);
			if (rows.length > 0) verseIds.push(rows[0].id);
		}

		if (verseIds.length === 0) {
			return res.status(404).json({
				statusCode: 404,
				status: "fail",
				message: "Ninguno de los versículos fue encontrado.",
			});
		}

		// Si es para eliminar el subrayado
		if (isDeleteAction) {
			await pool.query(
				`DELETE FROM highlighted_verse WHERE user_id = $1 AND verse_id = ANY($2::int[])`,
				[userId, verseIds]
			);

			return res.status(200).json({
				statusCode: 200,
				status: "success",
				message: "Subrayado(s) eliminados.",
			});
		}

		// Si es para insertar o actualizar
		const values = [];
		const placeholders = verseIds.map((verseId, index) => {
			const base = index * 3;
			values.push(userId, verseId, color);
			return `($${base + 1}, $${base + 2}, $${base + 3})`;
		}).join(", ");

		await pool.query(`
			INSERT INTO highlighted_verse (user_id, verse_id, color)
			VALUES ${placeholders}
			ON CONFLICT (user_id, verse_id) DO UPDATE SET color = EXCLUDED.color
		`, values);

		return res.status(200).json({
			statusCode: 200,
			status: "success",
			message: "Versículo(s) subrayados con éxito.",
		});
	} catch (error) {
		console.error("Error al subrayar versículos:", error);
		next(error);
	}
};


