import { NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./lib/auth";

const PROTECTED_API_METHODS = ["POST", "PUT", "DELETE", "PATCH"];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isValid = await verifySessionToken(token);

  // /admin পেইজ প্রোটেক্ট করা (লগইন পেইজ বাদে)
  if (pathname.startsWith("/admin")) {
    if (!isValid) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Data পরিবর্তন করে এমন API রুটগুলো প্রোটেক্ট করা (GET সবার জন্য খোলা থাকবে)
  const isApiData =
    pathname.startsWith("/api/members") ||
    pathname.startsWith("/api/deposits") ||
    pathname.startsWith("/api/investments");

  if (isApiData && PROTECTED_API_METHODS.includes(req.method)) {
    if (!isValid) {
      return NextResponse.json(
        { error: "Unauthorized. আগে লগইন করুন।" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/members/:path*", "/api/deposits/:path*", "/api/investments/:path*"],
};
