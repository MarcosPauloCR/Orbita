import { NextRequest, NextResponse } from "next/server";
import {
  GATE_COOKIE,
  SESSION_COOKIE,
  verifyGateToken,
  verifySessionToken,
} from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const session = sessionToken ? await verifySessionToken(sessionToken) : null;

  if (pathname.startsWith("/app")) {
    if (!session) {
      // Não revela que /login existe — some de volta na disfarce.
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL("/app", request.url));
    }

    const gateToken = request.cookies.get(GATE_COOKIE)?.value;
    const gateValid = gateToken ? await verifyGateToken(gateToken) : false;
    if (!gateValid) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/app/:path*"],
};
