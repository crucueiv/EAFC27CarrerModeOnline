import { auth } from "@/lib/auth";

export default auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/squad/:path*",
    "/calendar/:path*",
    "/lineup/:path*",
    "/transfers/:path*",
    "/competitions/:path*",
  ],
};
