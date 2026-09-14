/**
 * One-off data migration: Neon -> self-hosted Supabase.
 *
 * Reads both connection strings from .env.local and never prints them:
 *   NEON_DATABASE_URL  source (Neon)
 *   DATABASE_URL       target (Supabase, through the SSH tunnel)
 *
 * The target tables must already exist (run `npx drizzle-kit push` first).
 *
 * Usage:
 *   node scripts/migrate-neon-to-supabase.mjs --dry-run   # counts only, writes nothing
 *   node scripts/migrate-neon-to-supabase.mjs             # copies the rows
 *
 * Why a script instead of pg_dump: Neon runs Postgres 17 and Supabase runs 15.
 * A pg_dump 17 output can contain settings that Postgres 15 rejects, and a
 * single row does not justify fighting that.
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local", quiet: true });

// Keep DATE and TIMESTAMP (without time zone) as raw strings. By default pg
// converts them to JS Dates in the local time zone, which can shift the value
// by hours or even a day when it is written back.
pg.types.setTypeParser(1082, (value) => value); // date
pg.types.setTypeParser(1114, (value) => value); // timestamp

const TABLES = ["profile", "projects"];
const dryRun = process.argv.includes("--dry-run");

const sourceUrl = process.env.NEON_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

if (!sourceUrl) fail("NEON_DATABASE_URL is not set in .env.local");
if (!targetUrl) fail("DATABASE_URL is not set in .env.local");
if (sourceUrl === targetUrl) fail("source and target are the same database");
if (/neon\.tech/.test(targetUrl)) {
  fail("DATABASE_URL still points to Neon; it must point to Supabase");
}

const source = new pg.Client({ connectionString: sourceUrl });
const target = new pg.Client({ connectionString: targetUrl });

async function copyTable(table) {
  const { rows } = await source.query(
    `select * from public.${table} order by id`
  );
  const {
    rows: [{ n: alreadyThere }],
  } = await target.query(`select count(*)::int as n from public.${table}`);

  console.log(
    `${table}: ${rows.length} rows in Neon, ${alreadyThere} already in Supabase`
  );
  if (dryRun || rows.length === 0) return;

  const columns = Object.keys(rows[0]);
  const columnList = columns.map((column) => `"${column}"`).join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

  // ON CONFLICT makes the script safe to re-run: existing ids are skipped.
  const insertSql =
    `insert into public.${table} (${columnList}) ` +
    `values (${placeholders}) on conflict (id) do nothing`;

  let inserted = 0;
  for (const row of rows) {
    const result = await target.query(
      insertSql,
      columns.map((column) => row[column])
    );
    inserted += result.rowCount;
  }

  // Inserting explicit ids does not advance the serial sequence. Without this,
  // the next insert made by the app would try id 1 again and fail.
  await target.query(
    `select setval(pg_get_serial_sequence('public.${table}', 'id'), ` +
      `coalesce(max(id), 1), max(id) is not null) from public.${table}`
  );

  console.log(
    `${table}: inserted ${inserted}, skipped ${rows.length - inserted} (already present)`
  );
}

try {
  await source.connect();
  await target.connect();

  // All tables in one transaction: either everything is copied or nothing is.
  if (!dryRun) await target.query("begin");
  for (const table of TABLES) await copyTable(table);
  if (!dryRun) await target.query("commit");

  console.log(
    dryRun ? "Dry run finished, nothing was written." : "Migration committed."
  );
} catch (error) {
  if (!dryRun) await target.query("rollback").catch(() => {});
  // Connection errors can include the URL; never echo it.
  fail(String(error.message).replace(/postgres(ql)?:\/\/\S+/g, "<url hidden>"));
} finally {
  await source.end().catch(() => {});
  await target.end().catch(() => {});
}
