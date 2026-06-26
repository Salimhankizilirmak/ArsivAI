import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyLicense } from '@/lib/license';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Kimlik Doğrulama Kontrolü (Next-Auth)
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  // 2. Lisans Kontrolü (Kill-Switch ve Tarih Hilesi Koruması)
  const { isValid, reason } = await verifyLicense();
  if (!isValid) {
    redirect(`/license-expired?reason=${encodeURIComponent(reason || 'Bilinmeyen Hata')}`);
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      {/* Sol Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-6">
        <div>
          <div className="mb-8">
            <span className="text-xl font-bold tracking-wider text-teal-400">GIDA-REHBERİ</span>
            <p className="text-xs text-slate-500 font-mono">Novexistech On-Premise</p>
          </div>

          <nav className="space-y-2">
            <a href="/" className="flex items-center space-x-3 px-4 py-2.5 rounded-lg bg-slate-800 text-teal-300 font-medium transition-all">
              <span>📊 Dashboard</span>
            </a>
            <a href="/review" className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
              <span>🔍 Kalite Doğrulama</span>
            </a>
            <a href="/admin/ai-playground" className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
              <span>🔬 AI Playground</span>
            </a>
          </nav>
        </div>

        <div className="border-t border-slate-800 pt-6">
          <div className="flex flex-col mb-4">
            <span className="text-sm font-semibold text-slate-200">{session.user?.name || 'Kullanıcı'}</span>
            <span className="text-xs text-teal-500 uppercase tracking-widest font-mono mt-0.5">
              {(session.user as any).role?.replace('_', ' ')}
            </span>
          </div>
          <a
            href="/api/auth/signout"
            className="block text-center w-full px-4 py-2 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-950/70 border border-red-900/50 text-sm font-medium transition-all"
          >
            Çıkış Yap
          </a>
        </div>
      </aside>

      {/* Sağ Ana İçerik Alanı */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-900 bg-slate-900/50 flex items-center justify-between px-8">
          <span className="text-sm text-slate-400">
            Fabrika Kiracı ID: <span className="font-mono text-xs bg-slate-800 text-teal-400 px-2 py-1 rounded">{(session.user as any).tenantId}</span>
          </span>
          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-3 py-1.5 rounded-full">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Yerel Sunucu Aktif (On-Premise)</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
