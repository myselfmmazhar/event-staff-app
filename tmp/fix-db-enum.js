
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

function normalizePgConnectionString(raw) {
    try {
        const { URL } = require('url');
        const url = new URL(raw);
        url.searchParams.delete("pgbouncer");
        url.searchParams.delete("connection_limit");
        url.searchParams.delete("pool_timeout");
        return url.toString();
    } catch {
        return raw;
    }
}

async function main() {
    if (!connectionString) {
        console.error('Missing DIRECT_URL or DATABASE_URL in .env');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: normalizePgConnectionString(connectionString),
    });

    console.log('Connecting to database...');

    try {
        // Attempt to add the PUBLISHED value to the EventStatus enum natively in PostgreSQL
        await pool.query(`ALTER TYPE "EventStatus" ADD VALUE 'PUBLISHED'`);
        console.log('Successfully added "PUBLISHED" to EventStatus enum.');
    } catch (error) {
        if (error && error.code === '42710') {
            console.log('Value "PUBLISHED" already exists in EventStatus enum.');
        } else {
            console.error('Error adding value to enum:', error);
            process.exit(1);
        }
    }

    await pool.end();
    console.log('Done.');
}

main();
