import { neon } from "@neondatabase/serverless";

// Tagged-template SQL client — use as: sql`SELECT * FROM whatsnext_users WHERE id = ${id}`
// or for raw DDL: sql.query(rawString)
export const sql = neon(process.env.DATABASE_URL!);
