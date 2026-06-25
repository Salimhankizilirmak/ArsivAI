import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Hoş Geldiniz, {session?.user?.name}!</h1>
        <p className="text-slate-400 mt-2">GIDA-REHBERİ yerel kalite yönetim paneli üzerinden fabrikanızın kalite verilerini takip edebilirsiniz.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 font-medium">Toplam Dijital Form</span>
            <span className="text-teal-400 text-2xl">📋</span>
          </div>
          <span className="text-4xl font-bold text-white">0</span>
          <p className="text-xs text-slate-500 mt-2">Fabrikanız bünyesinde kayıtlı form tanımları</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 font-medium">Onay Bekleyenler</span>
            <span className="text-amber-400 text-2xl">⏳</span>
          </div>
          <span className="text-4xl font-bold text-white">0</span>
          <p className="text-xs text-slate-500 mt-2">Kalite Müdürü onayı bekleyen formlar</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 font-medium">Son 24 Saat Analiz</span>
            <span className="text-emerald-400 text-2xl">⚡</span>
          </div>
          <span className="text-4xl font-bold text-white">0</span>
          <p className="text-xs text-slate-500 mt-2">OCR ve Vision AI ile taranan yeni formlar</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Son Form Akış Tüneli</h3>
            <p className="text-xs text-slate-400 mt-1">İşçiler tarafından sahada çekilen ve doğrulama bekleyen son formlar</p>
          </div>
          <a href="/review" className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-500 transition-all">
            Doğrulama Ekranına Git →
          </a>
        </div>

        <div className="border border-dashed border-slate-800 rounded-xl p-12 text-center text-slate-500">
          <span className="text-4xl block mb-3">📂</span>
          Henüz taranmış veya yüklenmiş form verisi bulunmamaktadır.
        </div>
      </div>
    </div>
  );
}
