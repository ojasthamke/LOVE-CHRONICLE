import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { URL } from 'url';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL.trim();
const dbUrl = new URL(connectionString);

// Neon requires SSL. rejectUnauthorized: false is often needed for local development
// to avoid certificate issues, though Neon certificates are generally valid.
export const pool = new Pool({
  host: dbUrl.hostname,
  port: dbUrl.port ? parseInt(dbUrl.port) : 5432,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1), // remove leading '/'
  ssl: {
    rejectUnauthorized: false,
  }
});

export const db = drizzle(pool, { schema });
