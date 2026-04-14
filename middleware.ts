export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: [
    '/((?!api/auth|api/webhooks|api/cron|api/health|auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
