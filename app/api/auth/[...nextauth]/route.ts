import { handlers } from "@/lib/auth";
import type { NextRequest } from "next/server";

// next-auth v5 beta + Next.js 16 type compatibility shim
export const GET = handlers.GET as (req: NextRequest) => Promise<Response>;
export const POST = handlers.POST as (req: NextRequest) => Promise<Response>;
