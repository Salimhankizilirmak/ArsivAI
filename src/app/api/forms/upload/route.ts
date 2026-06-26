import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { formSubmissions } from '@/db/schema';
import { preprocessImage } from '@/lib/imageProcessor';
import { parseFormWithAI } from '@/lib/ocrParser';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const formTypeId = formData.get('formTypeId') as string;
    const tenantId = formData.get('tenantId') as string;

    if (!file || !formTypeId || !tenantId) {
      return NextResponse.json(
        { error: 'Eksik parametreler (file, formTypeId ve tenantId zorunludur)' },
        { status: 400 }
      );
    }

    // 1. Dosyayı Buffer'a dönüştür
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // 2. Sharp ile görsel kontrast, siyah-beyaz ve boyut iyileştirmesi yap
    console.log('Sharp görsel iyileştirme başlatılıyor...');
    const processedImage = await preprocessImage(inputBuffer);
    console.log('Sharp görsel iyileştirme tamamlandı.');

    // 3. Dosyayı yerel depolama dizinine (public/uploads) kaydet
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Güvenli dosya ismi üretimi
    const fileExt = path.extname(file.name) || '.jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${fileExt}`;
    const filePath = path.join(uploadDir, fileName);
    
    fs.writeFileSync(filePath, processedImage.buffer);
    const rawImageUrl = `/uploads/${fileName}`;
    console.log(`Görsel yerel diske kaydedildi: ${rawImageUrl}`);

    // 4. OpenAI Vision API ile el yazısı ve tablo verisini oku
    console.log('Vision AI ile el yazısı tahlili başlatılıyor...');
    const dynamicData = await parseFormWithAI(processedImage.buffer, formTypeId, tenantId);
    console.log('Vision AI tahlili başarıyla tamamlandı.');

    // 5. Veritabanına PENDING_REVIEW durumunda kaydet
    const [submission] = await db.insert(formSubmissions).values({
      tenantId,
      formTypeId,
      rawImageUrl,
      dynamicData,
      status: 'PENDING_REVIEW',
    }).returning();

    return NextResponse.json({
      success: true,
      message: 'Form yüklendi ve Vision AI ile başarıyla analiz edildi.',
      submission: {
        id: submission.id,
        imageUrl: submission.rawImageUrl,
        status: submission.status,
        dynamicData: submission.dynamicData,
        createdAt: submission.createdAt
      }
    });
  } catch (error: any) {
    console.error('API /forms/upload Hatası:', error);
    return NextResponse.json(
      { error: error.message || 'Form yükleme ve işleme sırasında sistemsel hata' },
      { status: 500 }
    );
  }
}
