import { db } from '@/db';
import { formSubmissions, formTypes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ReviewPageClient from './ReviewPageClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const tenantId = (session.user as any).tenantId;

  // Onay bekleyen form gönderimlerini veritabanından çek (Join kullanarak)
  const submissions = await db
    .select({
      id: formSubmissions.id,
      rawImageUrl: formSubmissions.rawImageUrl,
      dynamicData: formSubmissions.dynamicData,
      status: formSubmissions.status,
      createdAt: formSubmissions.createdAt,
      formTypeName: formTypes.displayName,
    })
    .from(formSubmissions)
    .innerJoin(formTypes, eq(formSubmissions.formTypeId, formTypes.id))
    .where(
      and(
        eq(formSubmissions.tenantId, tenantId),
        eq(formSubmissions.status, 'PENDING_REVIEW')
      )
    );

  // JSON string ve obje dönüşümünü temizleme
  const formattedSubmissions = submissions.map(sub => ({
    ...sub,
    dynamicData: typeof sub.dynamicData === 'string' ? JSON.parse(sub.dynamicData) : sub.dynamicData,
    createdAt: sub.createdAt.toISOString()
  }));

  return (
    <ReviewPageClient initialSubmissions={formattedSubmissions} />
  );
}
