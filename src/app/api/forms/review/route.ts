import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { formSubmissions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

    // 3. Veritabanında Kaydı Güncelle (Tenant İzolasyonunu Koru)
    console.log(`Form onaylanıyor/güncelleniyor. ID: ${submissionId}, Tenant: ${tenantId}`);
    const [updatedSubmission] = await db
      .update(formSubmissions)
      .set({
        dynamicData: dynamicData,
        status: status, // APPROVED veya PENDING_REVIEW
        verifiedBy: session.user.id,
        verifiedAt: new Date(),
      })
      .where(
        and(
          eq(formSubmissions.id, submissionId),
          eq(formSubmissions.tenantId, tenantId) // Güvenli izolasyon
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
