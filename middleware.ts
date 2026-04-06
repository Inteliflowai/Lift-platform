import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/admin", "/school", "/evaluator", "/interviewer"];
const PUBLIC_PREFIXES = ["/session", "/invite", "/consent"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Candidate-facing routes are fully public (token-based, no Supabase Auth)
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Only protect dashboard routes
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch role from public.users via user_tenant_roles
  const { data: roles } = await supabase
    .from("user_tenant_roles")
    .select("role, tenant_id")
    .eq("user_id", user.id);

  const userRoles = roles?.map((r) => r.role) ?? [];

  // Role-based route protection
  if (pathname.startsWith("/admin") && !userRoles.includes("platform_admin")) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  if (
    pathname.startsWith("/school") &&
    !userRoles.includes("school_admin") &&
    !userRoles.includes("platform_admin")
  ) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  if (
    pathname.startsWith("/evaluator") &&
    !userRoles.includes("evaluator") &&
    !userRoles.includes("school_admin") &&
    !userRoles.includes("platform_admin")
  ) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  if (
    pathname.startsWith("/interviewer") &&
    !userRoles.includes("interviewer") &&
    !userRoles.includes("platform_admin")
  ) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
