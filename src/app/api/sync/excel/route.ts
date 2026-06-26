import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as 'users' | 'products';
    const tenantId = formData.get('tenantId') as string;

    if (!file || !type || !tenantId) {
      return NextResponse.json(
        { error: 'Eksik parametreler (file, type ve tenantId gereklidir)' },
        { status: 400 }
      );
    }

    // 1. Excel Dosyasını Buffer Olarak Oku
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. SheetJS (xlsx) ile Parse Et
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

    console.log(`Excel parse edildi. Toplam satır sayısı: ${rows.length}, Senkronizasyon Tipi: ${type}`);

    let insertedCount = 0;
    let updatedCount = 0;

    // 3. Tabloya Göre Veri Kaydetme (UPSERT Mantığı)
    if (type === 'products') {
      for (const row of rows) {
        // Kolon adı eşleştirmelerinde esneklik sağlama
        const productName = (row.product_name || row.productName || row['Ürün Adı'] || row['urun_adi'] || '').toString().trim();
        
        if (!productName) continue;

        // Ürün zaten var mı kontrol et
        const exists = await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.tenantId, tenantId),
              eq(products.productName, productName)
            )
          )
          .limit(1);

        if (exists.length === 0) {
          await db.insert(products).values({
            tenantId,
            productName,
          });
          insertedCount++;
        }
      }
    } else if (type === 'users') {
      for (const row of rows) {
        const name = (row.name || row.ad || row['Ad Soyad'] || '').toString().trim();
        const email = (row.email || row.eposta || '').toString().trim().toLowerCase();
        const rawRole = (row.role || row.rol || 'VARDIYA_AMIRI').toString().trim().toUpperCase();
        const password = (row.password || row.sifre || 'gida1234').toString().trim();

        if (!name || !email) continue;

        // Rol değerini enum uyumlu hale getir
        let role: 'FIRMA_SAHIBI' | 'KALITE_MUDURU' | 'VARDIYA_AMIRI' = 'VARDIYA_AMIRI';
        if (rawRole.includes('SAHIBI') || rawRole.includes('OWNER')) {
          role = 'FIRMA_SAHIBI';
        } else if (rawRole.includes('MUDUR') || rawRole.includes('MANAGER')) {
          role = 'KALITE_MUDURU';
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // Kullanıcı email ile kayıtlı mı kontrol et
        const exists = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (exists.length === 0) {
          await db.insert(users).values({
            tenantId,
            name,
            email,
            passwordHash,
            role,
          });
          insertedCount++;
        } else {
          // Güncelleme yap (Rol veya Ad Soyad değişmiş olabilir)
          await db
            .update(users)
            .set({
              name,
              passwordHash,
              role,
              tenantId, // Tenant eşleştirmesini de güncelle
            })
            .where(eq(users.email, email));
          updatedCount++;
        }
      }
    } else {
      return NextResponse.json({ error: 'Geçersiz senkronizasyon tipi' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `${type} listesi başarıyla senkronize edildi.`,
      added: insertedCount,
      updated: updatedCount,
    });
  } catch (error: any) {
    console.error('Excel Sync Hatası:', error);
    return NextResponse.json(
      { error: error.message || 'Senkronizasyon sırasında hata oluştu' },
      { status: 500 }
    );
  }
}
