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

    // 2. Örnek Kullanıcılar Oluştur (Kalite Müdürü ve Vardiya Amiri)
    console.log('Kullanıcılar (Users) ekleniyor...');
    const passwordHash = await bcrypt.hash('password123', 10);
    
    // 2.1. Kemal Kalite (Kalite Müdürü)
    const [user1] = await db.insert(schema.users).values({
      tenantId: tenant.id,
      name: 'Kemal Kalite',
      email: 'kalite@novexistech.com',
      passwordHash: passwordHash,
      role: 'KALITE_MUDURU',
    }).returning();
    console.log(`Kullanıcı oluşturuldu: ${user1.name} (${user1.email}) - Rol: KALITE_MUDURU`);

    // 2.2. Mehmet Düvenci (Vardiya Amiri / Operatör)
    const [user2] = await db.insert(schema.users).values({
      tenantId: tenant.id,
      name: 'Mehmet Düvenci', // Soyadı düzeltilmiş el yazısı sahibi
      email: 'mehmet.duvenci@novexistech.com',
      passwordHash: passwordHash,
      role: 'VARDIYA_AMIRI',
    }).returning();
    console.log(`Kullanıcı oluşturuldu: ${user2.name} (${user2.email}) - Rol: VARDIYA_AMIRI`);

    // 3. Örnek Ürün Sözlüğü Ekle (Fuzzy Match için)
    console.log('Ürünler (Products) ekleniyor...');
    const productsData = [
      { tenantId: tenant.id, productName: 'Triton' },
      { tenantId: tenant.id, productName: 'Taco' },
      { tenantId: tenant.id, productName: 'Kutlu Rulo' },
    ];

    for (const prod of productsData) {
      const [inserted] = await db.insert(schema.products).values(prod).returning();
      console.log(`Ürün eklendi: ${inserted.productName}`);
    }

    // 4. Örnek Form Tipleri Ekle
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
