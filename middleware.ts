import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/reset-password'];
const PASSWORD_MAX_AGE_DAYS = 30;
const EXEMPT_FROM_EXPIRY = ['/login', '/change-password', '/reset-password'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Force a password reset every 30 days, regardless of how the user signed in.
  if (user) {
    const isExempt = EXEMPT_FROM_EXPIRY.some((p) => request.nextUrl.pathname.startsWith(p));
    if (!isExempt) {
      const lastSet = user.user_metadata?.password_updated_at as string | undefined;
      const ageMs = lastSet ? Date.now() - new Date(lastSet).getTime() : Infinity;
      const maxAgeMs = PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
      if (ageMs > maxAgeMs) {
        return NextResponse.redirect(new URL('/change-password?expired=1', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
