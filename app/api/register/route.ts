import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name:     z.string().min(1).max(80),
  email:    z.string().email(),
  password: z.string().min(6).max(100),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { name, email, password } = parsed.data;

  const existing = await sql`SELECT id FROM whatsnext_users WHERE email = ${email} LIMIT 1`;
  if (existing.length > 0) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  await sql`INSERT INTO whatsnext_users (email, password, name) VALUES (${email}, ${hashed}, ${name})`;

  return NextResponse.json({ ok: true }, { status: 201 });
}
