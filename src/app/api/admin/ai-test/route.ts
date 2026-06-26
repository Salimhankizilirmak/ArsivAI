import { NextRequest, NextResponse } from 'next/server';
import { preprocessImage } from '@/lib/imageProcessor';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const usersRaw = formData.get('users') as string;
    const productsRaw = formData.get('products') as string;

    if (!file) {
      return NextResponse.json({ error: 'Test edilmek üzere bir görsel yüklenmelidir.' }, { status: 400 });
    }

    // Virgülle ayrılmış sözlük girdilerini array'e dönüştür
    const usersDict = usersRaw ? usersRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    const productsDict = productsRaw ? productsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    // 1. Resmi Buffer'a Çevir
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // 2. Sharp ile Görsel İyileştirme (Önişleme)
    console.log('Test Pipeline: Sharp önişleme başlatılıyor...');
    const processedImage = await preprocessImage(inputBuffer);
    
    // Önizleme için işlenmiş resmi base64 URI formatına getir
    const processedBase64 = `data:image/jpeg;base64,${processedImage.buffer.toString('base64')}`;

    // 3. Yerel AI Motoruna Gönder (Novexis-AI Core)
    const localAiUrl = process.env.NOVEXIS_AI_URL || 'http://localhost:5000/api/v1/vision';
    let aiResult: Record<string, any> = {};
    let isMock = false;

    try {
      console.log(`Test Pipeline: Yerel AI motoruna bağlanılıyor: ${localAiUrl}`);
      const response = await fetch(localAiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: processedImage.buffer.toString('base64'),
          formName: 'Playground Test Formu',
          contextDictionary: {
            users: usersDict,
            products: productsDict,
          }
        })
      });

      if (response.ok) {
        const json = await response.json();
        aiResult = json.data || json;
      } else {
        throw new Error('Yerel motor hata kodu döndü');
      }
    } catch (e) {
      console.warn('Test Pipeline: Yerel AI servisi yanıt vermedi, simülatör verileri dolduruluyor.');
      isMock = true;
      aiResult = generateMockTestOutput(usersDict, productsDict);
    }

    return NextResponse.json({
      success: true,
      processedImage: processedBase64,
      data: aiResult,
      isMock: isMock
    });
  } catch (error: any) {
    console.error('API /admin/ai-test Hatası:', error);
    return NextResponse.json(
      { error: error.message || 'Simülasyon işlemi sırasında sistemsel hata' },
      { status: 500 }
    );
  }
}

function generateMockTestOutput(users: string[], products: string[]): Record<string, any> {
  const bugun = new Date().toISOString().split('T')[0];
  
  // Sözlükteki ilk elemanları veya varsayılanları çek (Fuzzy Match simülasyonu)
  const matchedProduct = products.length > 0 ? products[0] : 'Bilinmeyen Ürün (Sözlüğe Ekleyin)';
  const matchedUser = users.length > 0 ? users[0] : 'Bilinmeyen Operatör';

  return {
    tarih: bugun,
    formAdi: 'Playground Üretim Takip Formu',
    urunAdi: matchedProduct,
    kontroller: [
      { saat: '08:30', deger: '24.2 °C', uygunluk: true, kontrolEden: matchedUser },
      { saat: '12:30', deger: '25.0 °C', uygunluk: true, kontrolEden: matchedUser },
      { saat: '16:30', deger: 'Limit aşımı, fırın kapatıldı', uygunluk: false, kontrolEden: matchedUser }
    ],
    notlar: `Yerel AI Sözlük Koruması Aktif. Tespit edilen lot verileri yerel veritabanı ile eşleştirildi.`
  };
}
