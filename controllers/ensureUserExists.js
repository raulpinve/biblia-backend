const { pool } = require("../initDB");

const ensureUserExists = async (user) => {
	const { id, firstName, lastName, emailAddresses, phoneNumbers, imageUrl } = user;

	const firstNameSafe = firstName || null;
	const lastNameSafe = lastName || null;
	const email = emailAddresses?.[0]?.emailAddress || null;
	const phoneNumber = phoneNumbers?.[0]?.phoneNumber || null;
	const image = imageUrl || null;

	await pool.query(`
		INSERT INTO users (id, first_name, last_name, email, phone_number, image)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO NOTHING
	`, [id, firstNameSafe, lastNameSafe, email, phoneNumber, image]);
};

module.exports = ensureUserExists