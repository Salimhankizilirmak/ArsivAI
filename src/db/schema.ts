import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Form onay durumları için Enum tanımı
export const statusEnum = pgEnum('form_submission_status', ['PENDING_REVIEW', 'APPROVED']);

// Kullanıcı rolleri için Enum tanımı
export const roleEnum = pgEnum('user_role', ['FIRMA_SAHIBI', 'KALITE_MUDURU', 'VARDIYA_AMIRI']);

// 1. Tenants (Fabrikalar / Kiracılar)
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: text('company_name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Users (Kullanıcılar)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Form Types (Fabrikaya özel form tanımları)
export const formTypes = pgTable('form_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  displayName: text('display_name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Form Submissions (Dijitalleşen veri havuzu)
export const formSubmissions = pgTable('form_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  formTypeId: uuid('form_type_id')
    .references(() => formTypes.id, { onDelete: 'restrict' })
    .notNull(),
  rawImageUrl: text('raw_image_url').notNull(), // Supabase Storage'dan veya lokal disk/S3'ten gelecek görsel URL'i
  dynamicData: jsonb('dynamic_data').notNull(),  // Formun OCR/düzenlenebilir input verileri
  status: statusEnum('status').default('PENDING_REVIEW').notNull(),
  verifiedBy: uuid('verified_by')
    .references(() => users.id, { onDelete: 'set null' }), // Onaylayan kullanıcı ID'si
  verifiedAt: timestamp('verified_at'),           // Onaylandığı anın zaman damgası
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Tablo İlişkileri ---

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  formTypes: many(formTypes),
  formSubmissions: many(formSubmissions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  verifiedSubmissions: many(formSubmissions),
}));

export const formTypesRelations = relations(formTypes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [formTypes.tenantId],
    references: [tenants.id],
  }),
  submissions: many(formSubmissions),
}));

export const formSubmissionsRelations = relations(formSubmissions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [formSubmissions.tenantId],
    references: [tenants.id],
  }),
  formType: one(formTypes, {
    fields: [formSubmissions.formTypeId],
    references: [formTypes.id],
  }),
  verifier: one(users, {
    fields: [formSubmissions.verifiedBy],
    references: [users.id],
  }),
}));
