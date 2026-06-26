'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ControlRow {
  saat: string;
  deger: string;
  uygunluk: boolean;
  kontrolEden: string;
}

interface ParsedForm {
  tarih: string;
  formAdi: string;
  urunAdi: string;
  kontroller: ControlRow[];
  notlar: string;
}

interface Submission {
  id: string;
  rawImageUrl: string;
  dynamicData: any;
  status: string;
  createdAt: string;
  formTypeName: string;
}

export default function ReviewPageClient({ initialSubmissions }: { initialSubmissions: Submission[] }) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [formData, setFormData] = useState<ParsedForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSelect = (sub: Submission) => {
    setSelectedSub(sub);
    const data = sub.dynamicData as ParsedForm;
    // Güvenli şema klonlama
    setFormData({
      tarih: data.tarih || '',
      formAdi: data.formAdi || sub.formTypeName,
      urunAdi: data.urunAdi || '',
      kontroller: Array.isArray(data.kontroller) 
        ? data.kontroller.map(c => ({
            saat: c.saat || '',
            deger: c.deger || '',
            uygunluk: typeof c.uygunluk === 'boolean' ? c.uygunluk : true,
            kontrolEden: c.kontrolEden || ''
          }))
        : [],
      notlar: data.notlar || ''
    });
    setError(null);
    setSuccessMsg(null);
  };

  const handleControlRowChange = (index: number, field: keyof ControlRow, value: any) => {
    if (!formData) return;
    const updatedRows = [...formData.kontroller];
    updatedRows[index] = { ...updatedRows[index], [field]: value };
    setFormData({ ...formData, kontroller: updatedRows });
  };

  const addRow = () => {
    if (!formData) return;
    setFormData({
      ...formData,
      kontroller: [...formData.kontroller, { saat: '', deger: '', uygunluk: true, kontrolEden: '' }]
    });
  };

  const removeRow = (index: number) => {
    if (!formData) return;
    const updatedRows = formData.kontroller.filter((_, i) => i !== index);
    setFormData({ ...formData, kontroller: updatedRows });
  };

  const handleApprove = async () => {
    if (!selectedSub || !formData) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/forms/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: selectedSub.id,
          dynamicData: formData,
          status: 'APPROVED',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Mühürleme işlemi sırasında hata oluştu.');
      }

      setSuccessMsg('Form verisi başarıyla mühürlendi ve resmi denetim kaydına dönüştürüldü.');
      setSubmissions(submissions.filter(s => s.id !== selectedSub.id));
      
      // 1.5 saniye sonra listeye geri dön
      setTimeout(() => {
        setSelectedSub(null);
        setFormData(null);
        setSuccessMsg(null);
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (selectedSub && formData) {
    return (
      <div className="h-full flex flex-col space-y-4">
        {/* Üst Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => { setSelectedSub(null); setFormData(null); }}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-850 hover:text-white transition-all text-xs font-semibold"
            >
              ← Listeye Geri Dön
            </button>
            <div>
              <h2 className="text-lg font-bold text-white">{selectedSub.formTypeName}</h2>
              <p className="text-xs text-slate-500 font-mono">Yükleme: {new Date(selectedSub.createdAt).toLocaleString('tr-TR')}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-lg shadow-teal-950/40 transition-all"
            >
              {loading ? 'Mühürleniyor...' : '✓ Onayla ve Mühürle'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-900/50 text-red-400 px-4 py-3 rounded-lg text-sm">
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 px-4 py-3 rounded-lg text-sm animate-pulse">
            🎉 {successMsg}
          </div>
        )}

        {/* Split Screen Gövdesi */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
          {/* Sol Panel: Orijinal Görsel */}
          <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 flex flex-col overflow-hidden relative group">
            <div className="text-xs text-slate-400 font-semibold mb-2 flex justify-between items-center">
              <span>Orijinal Form Fotoğrafı</span>
              <a 
                href={selectedSub.rawImageUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="text-teal-400 hover:underline"
              >
                Yeni Sekmede Aç ↗
              </a>
            </div>
            <div className="flex-1 relative bg-slate-950 border border-slate-850 rounded-lg overflow-auto flex items-center justify-center p-2 min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={selectedSub.rawImageUrl} 
                alt="Form Tarama Görseli" 
                className="max-h-full max-w-full object-contain rounded transition-all"
              />
            </div>
          </div>

          {/* Sağ Panel: Düzenlenebilir JSON Formu */}
          <div className="bg-slate-900 border border-slate-850 rounded-xl p-6 flex flex-col overflow-y-auto space-y-6">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 pb-2">
              Vision AI Çözümleme Sonuçları (Düzenlenebilir)
            </div>

            {/* Temel Meta Bilgileri */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase font-mono font-semibold">Tarih</label>
                <input
                  type="date"
                  value={formData.tarih}
                  onChange={(e) => setFormData({ ...formData, tarih: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase font-mono font-semibold">Form Adı</label>
                <input
                  type="text"
                  value={formData.formAdi}
                  onChange={(e) => setFormData({ ...formData, formAdi: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase font-mono font-semibold">Ürün Adı (Auto-Learn)</label>
                <input
                  type="text"
                  value={formData.urunAdi}
                  onChange={(e) => setFormData({ ...formData, urunAdi: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 text-slate-100 font-semibold text-teal-400"
                />
              </div>
            </div>

            {/* Tablo Kontrolleri */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-mono font-semibold text-slate-400 uppercase">Kontrol Kayıtları</span>
                <button
                  type="button"
                  onClick={addRow}
                  className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center space-x-1"
                >
                  <span>+ Yeni Satır Ekle</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Saat</th>
                      <th className="p-3">Ölçülen Değer</th>
                      <th className="p-3 text-center">Uygunluk</th>
                      <th className="p-3">Sorumlu</th>
                      <th className="p-3 text-center">Sil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/20">
                    {formData.kontroller.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-850/30 transition-all">
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.saat}
                            placeholder="08:00"
                            onChange={(e) => handleControlRowChange(index, 'saat', e.target.value)}
                            className="bg-slate-950 border border-slate-850 rounded px-2 py-1.5 w-16 text-center focus:outline-none focus:border-teal-500 font-mono text-slate-200"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.deger}
                            placeholder="29.8"
                            onChange={(e) => handleControlRowChange(index, 'deger', e.target.value)}
                            className="bg-slate-950 border border-slate-850 rounded px-2 py-1.5 w-full focus:outline-none focus:border-teal-500 text-slate-200"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleControlRowChange(index, 'uygunluk', !row.uygunluk)}
                            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                              row.uygunluk 
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 hover:bg-emerald-900/30' 
                                : 'bg-red-950/60 text-red-400 border border-red-900/40 hover:bg-red-900/30'
                            }`}
                          >
                            {row.uygunluk ? 'Uygun' : 'U. Değil'}
                          </button>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.kontrolEden}
                            placeholder="Ahmet U."
                            onChange={(e) => handleControlRowChange(index, 'kontrolEden', e.target.value)}
                            className="bg-slate-950 border border-slate-850 rounded px-2 py-1.5 w-full focus:outline-none focus:border-teal-500 text-slate-200"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="text-red-500 hover:text-red-400 text-sm font-bold"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notlar */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase font-mono font-semibold">Notlar ve Sapmalar</label>
              <textarea
                value={formData.notlar}
                rows={4}
                onChange={(e) => setFormData({ ...formData, notlar: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 text-slate-100 resize-none"
                placeholder="Form ile ilgili notlar..."
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Kalite Doğrulama Merkezi</h1>
        <p className="text-slate-450 mt-1">İşçiler tarafından yüklenen ve Vision AI ile okunan formların doğrulama kuyruğu.</p>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-16 text-center text-slate-500 max-w-lg mx-auto mt-12">
          <span className="text-5xl block mb-4">🎉</span>
          <h3 className="text-lg font-bold text-white mb-1">Kuyruk Temiz!</h3>
          <p className="text-xs text-slate-400">Onay bekleyen veya doğrulanması gereken yeni bir form kaydı bulunmuyor.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-850 rounded-xl overflow-hidden">
          <div className="bg-slate-950 px-6 py-4 border-b border-slate-800">
            <span className="text-xs font-mono font-semibold tracking-wider text-slate-450 uppercase">
              Kuyruktaki Formlar ({submissions.length})
            </span>
          </div>

          <div className="divide-y divide-slate-800">
            {submissions.map((sub) => (
              <div 
                key={sub.id} 
                className="p-6 flex flex-col md:flex-row md:items-center md:justify-between hover:bg-slate-850/20 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-bold text-base">{sub.formTypeName}</span>
                    <span className="px-2 py-0.5 bg-amber-950 text-amber-400 border border-amber-900/50 rounded text-[10px] font-mono uppercase">
                      İnceleniyor
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-slate-500 font-mono">
                    <span>ID: {sub.id.substring(0, 8)}...</span>
                    <span>Tarih: {new Date(sub.createdAt).toLocaleString('tr-TR')}</span>
                  </div>
                </div>

                <div className="mt-4 md:mt-0">
                  <button
                    onClick={() => handleSelect(sub)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-all"
                  >
                    Doğrula ve İncele →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
