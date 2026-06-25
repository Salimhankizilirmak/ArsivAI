import { redirect } from 'next/navigation';
import { verifyLicense } from '@/lib/license';

export default async function LicenseExpiredPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  // Eğer lisans geçerliyse, bu sayfada kalınmasını engelle ve dashboard'a dön
  const { isValid } = await verifyLicense();
  if (isValid) {
    redirect('/');
  }

  const errorReason = searchParams.reason || 'Lisans Geçersiz / Bulunamadı';

  // Saat hilesi veya askıya alma durumuna göre özel uyarı başlığı belirle
  let title = 'TİCARİ LİSANS KİLİDİ DEVREDE';
  let isTampered = false;

  if (errorReason.includes('SAAT')) {
    title = 'GÜVENLİK KİLİDİ: SAAT MANİPÜLASYONU';
    isTampered = true;
  } else if (errorReason.includes('ASKIYA')) {
    title = 'LİSANSINIZ ASKIYA ALINMIŞTIR';
  } else if (errorReason.includes('SÜRESİ')) {
    title = 'LİSANS SÜRESİ DOLMUŞTUR';
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-[#0a0505] text-white p-4 relative overflow-hidden">
      {/* Kırmızı Arka Plan Işık Efekti */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-950/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-zinc-950 border border-red-950/80 rounded-2xl p-8 shadow-2xl shadow-red-950/20 text-center relative z-10">
        {/* Kilit İkonu */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-950/40 border border-red-800/40 text-red-500 text-3xl mb-6 animate-pulse">
          🔒
        </div>

        <h1 className="text-xl font-bold tracking-wider text-red-500 mb-2">{title}</h1>
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono mb-6">Novexistech Gıda-Rehberi On-Premise Protection</p>

        {/* Hata Bilgilendirme Kutusu */}
        <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 mb-6">
          <p className="text-xs text-red-400 font-mono tracking-wider uppercase mb-1">Engelleme Nedeni</p>
          <p className="text-sm font-semibold text-red-200">{errorReason}</p>
        </div>

        {isTampered ? (
          <div className="text-xs text-zinc-400 leading-relaxed text-left space-y-2 mb-8 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
            <span className="text-red-400 font-semibold block">⚠️ Kritik Emniyet Uyarısı:</span>
            Sistem saatinde geriye dönük bir değişiklik tespit edilmiştir. On-Premise veri tutarlılığını ve yasal denetim güvenliğini korumak amacıyla portal kilitlenmiştir.
            <strong className="block text-white mt-1">Çözüm:</strong> Lütfen sunucunuzun işletim sistemi saatini güncel dünya saati ile senkronize edin veya teknik ekibe başvurun.
          </div>
        ) : (
          <p className="text-xs text-zinc-400 leading-relaxed mb-8">
            Bu yerel kurulumun kullanım lisansı sona ermiş veya askıya alınmıştır. Fabrika içi dijital form yönetimine ve yasal denetim kayıtlarına erişimi devam ettirmek için yeni bir lisans dosyasını sisteme yüklemeniz gerekmektedir.
          </p>
        )}

        <div className="border-t border-zinc-900 pt-6 space-y-3">
          <div className="text-xs text-zinc-500">
            Müşteri Destek: <span className="text-zinc-300 font-mono">destek@novexistech.com</span>
          </div>
          <div className="text-[10px] text-zinc-600">
            Konteyner ID: <span className="font-mono">gida_rehberi_web_onprem</span>
          </div>
        </div>
      </div>
    </div>
  );
}
