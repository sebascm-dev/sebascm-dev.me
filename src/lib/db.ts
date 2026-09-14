import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy env.example to .env.local and fill it in."
  );
}

// Next recarga los módulos en caliente durante el desarrollo. Sin esta caché
// cada recarga abriría un Pool nuevo y agotaría las conexiones de Postgres.
const globalForDb = globalThis as typeof globalThis & {
  __dbPool?: Pool;
};

// El modo SSL lo decide la connection string, no el código: una URL interna de
// Docker va sin TLS, y basta añadirle `?sslmode=require` si algún día la base
// de datos deja de estar en una red privada.
const pool = globalForDb.__dbPool ?? new Pool({ connectionString });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__dbPool = pool;
}

export const db = drizzle(pool, { schema });
