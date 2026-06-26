import { NextResponse } from 'next/server';

export async function GET() {
  const localAiUrl = process.env.NOVEXIS_AI_URL || 'http://localhost:5000/api/v1/vision';
  
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1200); // 1.2 saniye hızlı zaman aşımı

    // Sağlık kontrolü için yerel AI servisinin health endpoint'ine git
    const healthUrl = localAiUrl.replace('/vision', '/health');
    const response = await fetch(healthUrl, {
      signal: controller.signal,
    });
    
    clearTimeout(id);

    return NextResponse.json({ online: response.ok });
  } catch (e) {
    return NextResponse.json({ online: false, reason: 'Yerel yapay zeka servisine erişilemiyor (Bağlantı Yok)' });
  }
}
