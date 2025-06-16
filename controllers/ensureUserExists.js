const { pool } = require("../initDB");

const ensureUserExists = async (user) => {
	const { id, nombre, apellidos, email, phone_number, imagen } = user;
	const firstNameSafe = nombre || null;
	const lastNameSafe = apellidos || null;
	const emailSafe = email || null;
	const phoneNumberSafe = phone_number || null;

	await pool.query(`
		INSERT INTO users (id, first_name, last_name, email, phone_number, image)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO NOTHING
	`, [id, firstNameSafe, lastNameSafe, emailSafe, phoneNumberSafe, imagen]);
};

module.exports = ensureUserExists