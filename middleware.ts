import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: any } }) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(loginUrl);
    }

    const role = token.role as string | undefined;

    if (pathname.startsWith("/inspection")) {
      if (!role || !["inspector", "manager"].includes(role)) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    if (pathname.startsWith("/dashboard")) {
      if (!role || role !== "manager") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    if (pathname.startsWith("/owner")) {
      if (!role || role !== "owner") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return true;
      },
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: ["/inspection/:path*", "/dashboard/:path*", "/owner/:path*"],
};
