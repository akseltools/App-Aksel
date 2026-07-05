/**
 * app/api/auth/session/route.ts
 * API Route to fetch current session info on the client.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/actions";

export async function GET() {
  try {
    const session = await getSession();
    return NextResponse.json({
      user: session.user || null,
    });
  } catch (error) {
    console.error("[Session API] Error fetching session:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
