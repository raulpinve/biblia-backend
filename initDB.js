const { Pool } = require("pg");

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.BD_PASSWORD,
    port: process.env.DB_PORT,
});

async function initDB() {
    try {
        const client = await pool.connect();
        client.release();
    } catch (error) {
        process.exit(1);
    }
}

module.exports = { initDB, pool };
