import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    /*
     * Aşağıdaki özel yollar dışındaki tüm dashboard / panel sayfalarını korur:
     * - api/auth (NextAuth API endpoint'leri)
     * - login (Giriş ekranı)
     * - license-expired (Lisans kilit ekranı)
     * - _next/static (Statik dosyalar)
     * - _next/image (Resim optimizasyon dosyaları)
     * - favicon.ico (Site simgesi)
     */
    '/((?!api/auth|login|license-expired|_next/static|_next/image|favicon.ico).*)',
  ],
};
