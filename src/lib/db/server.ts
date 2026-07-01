import { drizzle } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL must be specified in env variables!");
}

const pool = new Pool({
  connectionString: dbUrl,
});

export const db = drizzle(pool, { schema });
