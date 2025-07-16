
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = await createClient(request)

  // Refresh session if expired - important for server-side rendering
  await supabase.auth.getSession()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  // Protect admin routes
  if (pathname.startsWith('/admin/dashboard')) {
    if (!session) {
      // Redirect to login page if no session
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
  }

  // Redirect to dashboard if user is logged in and trying to access login page
  if (session && pathname === '/admin') {
     const url = request.nextUrl.clone()
     url.pathname = '/admin/dashboard'
     return NextResponse.redirect(url)
  }


  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
