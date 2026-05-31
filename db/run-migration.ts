import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env") });

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL not set");

  const sql = neon(databaseUrl);
  const migrationSql = fs.readFileSync(path.join(__dirname, "migrate.sql"), "utf-8");

  console.log("Running What's Next? migration...");
  await sql.query(migrationSql);
  console.log("✅ Migration complete — all whatsnext_* tables created.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
