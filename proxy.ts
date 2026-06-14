// proxy.ts (root — this is what Next.js actually runs)
import { createClient } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
    const { supabaseResponse, supabase } = createClient(request);

    // Refresh session — required for Server Components to read auth state
    const { data: { user } } = await supabase.auth.getUser();

    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/signup');
    const isProtected = request.nextUrl.pathname.startsWith('/dashboard') ||
        request.nextUrl.pathname.startsWith('/decision-lab') ||
        request.nextUrl.pathname.startsWith('/onboarding');

    if (!user && isProtected) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    if (user && isAuthRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return supabaseResponse;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};