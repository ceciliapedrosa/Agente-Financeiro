import { clearSession } from "@/lib/auth";
export async function POST(req:Request){await clearSession(); return Response.redirect(new URL('/login',req.url),303)}
