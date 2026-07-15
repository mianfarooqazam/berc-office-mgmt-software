import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "berc_session";

async function hasSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");
  const isApp =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/employees") ||
    pathname.startsWith("/departments") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/meetings") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/documents") ||
    pathname.startsWith("/announcements") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/integrations") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/ai");

  const loggedIn = await hasSession(request);

  if (isApp && !loggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if ((pathname === "/" || isAuthPage) && loggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname === "/" && !loggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
