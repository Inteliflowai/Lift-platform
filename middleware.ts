import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/admin", "/school", "/evaluator", "/interviewer", "/support"];
const PUBLIC_PREFIXES = ["/session", "/invite", "/consent", "/register", "/buy"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Hide pricing/register routes when LIFT_HIDE_PRICING is true
  if (process.env.LIFT_HIDE_PRICING === "true") {
    if (pathname === "/register" || pathname === "/pricing" || pathname.startsWith("/register")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

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

  // Force password change for guest-purchased accounts
  if (
    user.user_metadata?.must_change_password &&
    !pathname.startsWith("/settings/account") &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(new URL("/settings/account?change_password=true", request.url));
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
  if (
    pathname.startsWith("/support") &&
    !userRoles.includes("grade_dean") &&
    !userRoles.includes("learning_specialist") &&
    !userRoles.includes("school_admin") &&
    !userRoles.includes("platform_admin")
  ) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // License suspension check — redirect to /suspended if license is suspended
  // Skip for platform admins and the suspended page itself
  if (
    !pathname.startsWith("/suspended") &&
    !userRoles.includes("platform_admin")
  ) {
    const tenantId = roles?.[0]?.tenant_id;
    if (tenantId) {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: license } = await adminClient
        .from("tenant_licenses")
        .select("status")
        .eq("tenant_id", tenantId)
        .single();

      if (
        license?.status === "suspended" ||
        license?.status === "cancelled"
      ) {
        return NextResponse.redirect(
          new URL("/suspended", request.url)
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
