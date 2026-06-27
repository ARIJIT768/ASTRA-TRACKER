require('dotenv').config();
const { Pool } = require('pg');

// Use DATABASE_URL from Vercel Postgres/Supabase
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // When deploying to most cloud DBs, SSL is required
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

async function initDb() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS members (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                pin VARCHAR(10) DEFAULT NULL,
                weekly_target_hours REAL DEFAULT 25.0,
                current_week_hours REAL DEFAULT 0.0,
                carryover_deficit REAL DEFAULT 0.0
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS logs (
                id SERIAL PRIMARY KEY,
                member_id INTEGER REFERENCES members(id),
                description TEXT NOT NULL,
                hours REAL NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS reminders (
                id SERIAL PRIMARY KEY,
                member_id INTEGER REFERENCES members(id),
                message TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS company_chat (
                id SERIAL PRIMARY KEY,
                member_id INTEGER REFERENCES members(id),
                member_name VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                file_data TEXT,
                file_type VARCHAR(255),
                file_name VARCHAR(255),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Seed 8 specific members if table is empty
        const { rows } = await pool.query("SELECT COUNT(*) FROM members");
        if (parseInt(rows[0].count) === 0) {
            const names = [
                "Sagnik Ghosh",
                "Sohini Poddar",
                "Arijit Banerjee",
                "Aindrila Dutta",
                "Ahana Santra",
                "Milan Ghosh",
                "Rajrupa Ghosh",
                "Sreejani Chowdhury"
            ];
            for (const name of names) {
                await pool.query("INSERT INTO members (name) VALUES ($1)", [name]);
            }
            console.log("Seeded 8 specific members into PostgreSQL");
        }
    } catch (err) {
        console.error("Database initialization error:", err);
    }
}

// In a serverless environment like Vercel, the db connection might be instantiated repeatedly.
// We call initDb lazily or rely on it completing early. 
// For safety, we just call it on load.
initDb();

module.exports = pool;
