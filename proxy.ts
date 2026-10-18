import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

const GUEST_ONLY = ["/login", "/register"];
const ONBOARDING = "/onboarding";
const HOME = "/tables";

// Optimistic page redirects only. Every API route re-verifies the session
// itself, so this is never the sole line of defense.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const redirect = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (GUEST_ONLY.includes(pathname)) {
    if (!session) return NextResponse.next();
    return redirect(session.profileComplete ? HOME : ONBOARDING);
  }

  if (!session) return redirect("/login");

  if (pathname === ONBOARDING) {
    return session.profileComplete ? redirect(HOME) : NextResponse.next();
  }

  if (!session.profileComplete) return redirect(ONBOARDING);
  if (pathname === "/") return redirect(HOME);

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
