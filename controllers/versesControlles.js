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
                verses.id,
                verses.book_id,
                verses.chapter,
                verses.verse,
                verses.text,
                MAX(highlighted_verse.color) AS highlight_color,
                BOOL_OR(highlighted_verse.verse_id IS NOT NULL) AS is_highlighted,
                BOOL_OR(notes.id IS NOT NULL) AS has_note
            FROM verses
            LEFT JOIN highlighted_verse 
                ON highlighted_verse.verse_id = verses.id AND highlighted_verse.user_id = $3
            LEFT JOIN note_verse 
                ON note_verse.verse_id = verses.id
            LEFT JOIN notes 
                ON notes.id = note_verse.note_id AND notes.user_id = $3
            WHERE verses.book_id = $1 AND verses.chapter = $2
            GROUP BY verses.id
            ORDER BY verses.verse ASC
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

		// Si es para eliminar el subrayado
		if (isDeleteAction) {
			await pool.query(
				`DELETE FROM highlighted_verse WHERE user_id = $1 AND verse_id = ANY($2::int[])`,
				[userId, verses]
			);

			return res.status(200).json({
				statusCode: 200,
				status: "success",
				message: "Subrayado(s) eliminados.",
			});
		}

		// Si es para insertar o actualizar
		const values = [];
		const placeholders = verses.map((verseId, index) => {
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


