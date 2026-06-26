import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { formSubmissions, products, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

function slugify(text: string): string {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '.')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[şŞ]/g, 's')
    .replace(/[ıİ]/g, 'i')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9.]/g, '');
}

export async function POST(req: NextRequest) {
  try {
    // 1. Yetki Kontrolü (Sadece KALITE_MUDURU ve FIRMA_SAHIBI onaylayabilir)
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== 'KALITE_MUDURU' && role !== 'FIRMA_SAHIBI') {
      return NextResponse.json({ error: 'Bu işlemi yapmaya yetkiniz bulunmamaktadır (Yetkisiz Rol)' }, { status: 403 });
    }

    const tenantId = (session.user as any).tenantId;

    // 2. Body Parametrelerini Al
    const { submissionId, dynamicData, status } = await req.json();

    if (!submissionId || !dynamicData || !status) {
      return NextResponse.json({ error: 'Eksik parametreler (submissionId, dynamicData, status gereklidir)' }, { status: 400 });
    }

    // 3. Otomatik Öğrenme (Auto-Learning Pipeline)
    if (status === 'APPROVED') {
      // 3.1. Ürün Adı Öğrenme
      const urunAdi = (dynamicData.urunAdi || '').toString().trim();
      if (urunAdi) {
        const productExists = await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.tenantId, tenantId),
              eq(products.productName, urunAdi)
            )
          )
          .limit(1);

        if (productExists.length === 0) {
          console.log(`Auto-Learn: Yeni ürün sözlüğe ekleniyor -> ${urunAdi}`);
          await db.insert(products).values({
            tenantId,
            productName: urunAdi,
          });
        }
      }

      // 3.2. Operatör/Personel İsimleri Öğrenme
      if (Array.isArray(dynamicData.kontroller)) {
        for (const row of dynamicData.kontroller) {
          const operatorName = (row.kontrolEden || '').toString().trim();
          if (operatorName) {
            const userExists = await db
              .select()
              .from(users)
              .where(
                and(
                  eq(users.tenantId, tenantId),
                  eq(users.name, operatorName)
                )
              )
              .limit(1);

            if (userExists.length === 0) {
              console.log(`Auto-Learn: Yeni operatör kullanıcı tablosuna ekleniyor -> ${operatorName}`);
              const tempEmail = `${slugify(operatorName)}@temp-tenant.com`;
              const tempPasswordHash = await bcrypt.hash('gida-operator-temp-pass', 10);
              
              try {
                await db.insert(users).values({
                  tenantId,
                  name: operatorName,
                  email: tempEmail,
                  passwordHash: tempPasswordHash,
                  role: 'VARDIYA_AMIRI',
                });
              } catch (e) {
                // Email çakışması veya başka bir hata durumunda logla ve geç
                console.warn(`Operatör eklenemedi (muhtemelen e-posta zaten var): ${tempEmail}`);
              }
            }
          }
        }
      }
    }

    // 4. Veritabanında Kaydı Güncelle (Tenant İzolasyonunu Koru)
    console.log(`Form onaylanıyor/güncelleniyor. ID: ${submissionId}, Tenant: ${tenantId}`);
    const [updatedSubmission] = await db
      .update(formSubmissions)
      .set({
        dynamicData: dynamicData,
        status: status, // APPROVED veya PENDING_REVIEW
        verifiedBy: (session.user as any).id,
        verifiedAt: new Date(),
      })
      .where(
        and(
          eq(formSubmissions.id, submissionId),
          eq(formSubmissions.tenantId, tenantId)
        )
      )
      .returning();

    if (!updatedSubmission) {
      return NextResponse.json({ error: 'Form bulunamadı veya bu işlem için yetkisizsiniz' }, { status: 451 });
    }

    console.log(`Form başarıyla onaylandı ve mühürlendi. ID: ${submissionId}`);
    return NextResponse.json({
      success: true,
      message: 'Form başarıyla mühürlendi ve resmi kayda dönüştürüldü.',
      submission: updatedSubmission,
    });
  } catch (error: any) {
    console.error('API /forms/review Hatası:', error);
    return NextResponse.json(
      { error: error.message || 'Form inceleme ve onay tünelinde hata oluştu' },
      { status: 500 }
    );
  }
}
