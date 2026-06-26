'use client';

import React, { useState, useEffect } from 'react';

export default function PlaygroundClient() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [usersText, setUsersText] = useState('Mehmet Düvenci, Kemal Kalite, Ahmet Usta');
  const [productsText, setProductsText] = useState('Triton, Taco, Lavaş, Kutlu Rulo');
  
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [jsonOutput, setJsonOutput] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'processed' | 'json'>('processed');
  
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  // AI Core Sağlık Kontrolü
  const checkHealth = async () => {
    setCheckingHealth(true);
    try {
      const res = await fetch('/api/admin/ai-health');
      if (res.ok) {
        const data = await res.json();
        setIsOnline(data.online);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      // Reset outputs
      setProcessedImage(null);
      setJsonOutput(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setProcessedImage(null);
      setJsonOutput(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setProcessedImage(null);
    setJsonOutput(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('users', usersText);
    formData.append('products', productsText);

    try {
      const res = await fetch('/api/admin/ai-test', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Simülasyon işlemi başarısız.');
      }

      const data = await res.json();
      setProcessedImage(data.processedImage);
      setJsonOutput(data.data);
      setIsMock(data.isMock);
      setActiveTab('processed');
    } catch (err: any) {
      setError(err.message || 'Hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık ve Sağlık Kontrolü Göstergesi */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Novexis-AI™ Playground</h1>
          <p className="text-slate-400 mt-1">Veritabanına dokunmadan yerel görüntü işleme (Sharp) ve el yazısı çözme tünelini simüle edin.</p>
        </div>

        <div className="flex items-center space-x-4 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5">
          <span className="text-xs font-mono font-semibold tracking-wider text-slate-400 uppercase">AI Core Status:</span>
          {isOnline === null ? (
            <span className="text-xs text-slate-500">Kontrol ediliyor...</span>
          ) : isOnline ? (
            <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 font-bold">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>ONLINE (Novexis Core)</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs font-mono text-amber-500 font-bold">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              <span>OFFLINE (Simülatör Modu)</span>
            </div>
          )}
          <button 
            onClick={checkHealth}
            disabled={checkingHealth}
            className="p-1 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white rounded border border-slate-800 transition-all text-xs"
            title="Bağlantıyı Yenile"
          >
            {checkingHealth ? '⏳' : '🔄'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-900/50 text-red-400 px-4 py-3 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Ana Gövde */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sol Panel: Girişler ve Sözlükler */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-850 rounded-xl p-6 space-y-6">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 pb-2">
            1. Test Girdileri ve Dosya Yükleme
          </div>

          {/* Sürükle Bırak Alanı */}
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              file 
                ? 'border-teal-500/50 bg-teal-950/10' 
                : 'border-slate-850 hover:border-slate-700 bg-slate-950/30'
            }`}
          >
            <input 
              type="file" 
              id="playground-file" 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
            <label htmlFor="playground-file" className="cursor-pointer space-y-3 block">
              <span className="text-4xl block">📸</span>
              {file ? (
                <div>
                  <p className="text-sm font-semibold text-teal-400">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB - Değiştirmek için tıklayın</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-slate-350">Kalite formu görseli yükleyin</p>
                  <p className="text-xs text-slate-500 mt-1">Sürükleyip bırakın veya bilgisayarınızdan seçin</p>
                </div>
              )}
            </label>
          </div>

          {/* Orijinal Önizleme (Küçük) */}
          {previewUrl && (
            <div className="bg-slate-950 border border-slate-850 rounded-lg p-2 flex items-center justify-center h-48 overflow-hidden relative">
              <span className="absolute top-2 left-2 bg-slate-900/80 px-2 py-0.5 rounded text-[10px] text-slate-450 border border-slate-800 font-mono">Giriş Görseli</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Original Preview" className="max-h-full max-w-full object-contain rounded" />
            </div>
          )}

          {/* Dinamik Sözlük Simülatörü */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-400 uppercase mb-2">
                Dinamik Personel Sözlüğü (Fuzzy Match)
              </label>
              <textarea
                value={usersText}
                onChange={(e) => setUsersText(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-200 resize-none font-mono"
                placeholder="Mehmet Düvenci, Kemal Kalite (Virgülle ayırın)"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-400 uppercase mb-2">
                Dinamik Ürün Sözlüğü (Fuzzy Match)
              </label>
              <textarea
                value={productsText}
                onChange={(e) => setProductsText(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-200 resize-none font-mono"
                placeholder="Triton, Taco, Lavaş (Virgülle ayırın)"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-teal-950/40"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Pipeline Çalıştırılıyor...</span>
              </>
            ) : (
              <span>⚡ Yapay Zeka Tünelini Çalıştır</span>
            )}
          </button>
        </form>

        {/* Sağ Panel: Canlı Pipeline İzleme ve Sekmeler */}
        <div className="bg-slate-900 border border-slate-850 rounded-xl p-6 flex flex-col h-full min-h-[500px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              2. Canlı İzleme ve Analiz Çıktıları
            </span>

            {isMock && jsonOutput && (
              <span className="px-2 py-0.5 bg-amber-950/60 text-amber-400 border border-amber-900/40 rounded text-[10px] font-mono uppercase">
                Simüle Çıktı (Offline)
              </span>
            )}
          </div>

          {!jsonOutput && !loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 border border-dashed border-slate-800 rounded-xl">
              <span className="text-5xl block mb-4">🔬</span>
              <p className="text-sm font-semibold text-slate-400">Analiz Sonucu Bekleniyor</p>
              <p className="text-xs text-slate-650 text-center mt-1 max-w-xs">Soldan görsel yükleyip kelime sözlüklerini simüle ettikten sonra tüneli çalıştırın.</p>
            </div>
          ) : loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-500 mb-4"></div>
              <p className="text-xs text-slate-400 font-mono">Görsel Sharp ile filtreleniyor ve yerel AI çözüyor...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Sekme Seçiciler */}
              <div className="flex border-b border-slate-800 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('processed')}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                    activeTab === 'processed' 
                      ? 'border-teal-500 text-teal-400' 
                      : 'border-transparent text-slate-450 hover:text-white'
                  }`}
                >
                  Processed Image (Sharp)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('json')}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                    activeTab === 'json' 
                      ? 'border-teal-500 text-teal-400' 
                      : 'border-transparent text-slate-450 hover:text-white'
                  }`}
                >
                  Raw JSON Output
                </button>
              </div>

              {/* Sekme İçerikleri */}
              <div className="flex-1 overflow-auto bg-slate-950 border border-slate-850 rounded-xl p-4 min-h-[300px]">
                {activeTab === 'processed' && processedImage && (
                  <div className="h-full flex flex-col items-center justify-center relative">
                    <span className="absolute top-2 left-2 bg-slate-900/80 px-2.5 py-1 rounded text-[10px] text-teal-400 border border-teal-900/30 font-mono">
                      Sharpened + Grayscale + Normalized
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={processedImage} alt="Sharp Processed Preview" className="max-h-80 object-contain rounded" />
                  </div>
                )}

                {activeTab === 'json' && jsonOutput && (
                  <pre className="font-mono text-[11px] text-teal-400 h-full overflow-auto leading-relaxed">
                    {JSON.stringify(jsonOutput, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
