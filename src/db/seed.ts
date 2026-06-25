import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgres://gida_user:gida_secure_pass@localhost:5432/gida_rehberi';
const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });

async function seed() {
  console.log('🌱 Veritabanı tohumlama (seeding) başlatıldı...');

  try {
    // 1. Örnek Bir Tenant (Fabrika) Oluştur
    console.log('Kiracı (Tenant) ekleniyor...');
    const [tenant] = await db.insert(schema.tenants).values({
      companyName: 'Novexistech Gıda Fabrikası A.Ş.',
    }).returning();

    console.log(`Tenant oluşturuldu: ${tenant.companyName} [ID: ${tenant.id}]`);

    // 2. Örnek Kalite Müdürü Kullanıcısı Oluştur
    console.log('Kullanıcı (User) ekleniyor...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const [user] = await db.insert(schema.users).values({
      tenantId: tenant.id,
      name: 'Kemal Kalite',
      email: 'kalite@novexistech.com',
      passwordHash: passwordHash,
      role: 'KALITE_MUDURU',
    }).returning();

    console.log(`Kullanıcı oluşturuldu: ${user.name} (${user.email}) - Şifre: password123 [ID: ${user.id}]`);

    // 3. Örnek Form Tipleri Ekle
    console.log('Form Tipleri (Form Types) ekleniyor...');
    const formTypesData = [
      { tenantId: tenant.id, displayName: 'Metal Dedektör Temizlik Formu' },
      { tenantId: tenant.id, displayName: 'Hamur Takip ve Mayalama Formu' },
      { tenantId: tenant.id, displayName: 'Kritik Kontrol Noktası Sıcaklık Formu' },
    ];

    for (const ft of formTypesData) {
      const [inserted] = await db.insert(schema.formTypes).values(ft).returning();
      console.log(`Form tipi oluşturuldu: ${inserted.displayName}`);
    }

    console.log('🚀 Tohumlama başarıyla tamamlandı!');
  } catch (error) {
    console.error('❌ Tohumlama hatası:', error);
  } finally {
    await pool.end();
  }
}

seed();
