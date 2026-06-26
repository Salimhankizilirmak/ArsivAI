import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Form onay durumları için Enum tanımı
export const statusEnum = pgEnum('form_submission_status', ['PENDING_REVIEW', 'APPROVED']);

// Kullanıcı rolleri için Enum tanımı
export const roleEnum = pgEnum('user_role', ['FIRMA_SAHIBI', 'KALITE_MUDURU', 'VARDIYA_AMIRI']);

// RAG Doküman işleme durumları için Enum tanımı
export const documentStatusEnum = pgEnum('document_processing_status', ['PROCESSING', 'COMPLETED', 'FAILED']);

// Chatbot mesajı gönderen taraflar için Enum tanımı
export const senderEnum = pgEnum('message_sender', ['USER', 'AI']);

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
  rawImageUrl: text('raw_image_url').notNull(), // Yerel diskteki görsel URL'i
  dynamicData: jsonb('dynamic_data').notNull(),  // Formun OCR/düzenlenebilir input verileri
  status: statusEnum('status').default('PENDING_REVIEW').notNull(),
  verifiedBy: uuid('verified_by')
    .references(() => users.id, { onDelete: 'set null' }), // Onaylayan kullanıcı ID'si
  verifiedAt: timestamp('verified_at'),           // Onaylandığı anın zaman damgası
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Products (Ürünler)
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  productName: text('product_name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. Documents (RAG Doküman Havuzu)
export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  documentName: text('document_name').notNull(),
  fileUrl: text('file_url').notNull(),
  parsedText: text('parsed_text'), // PDF'ten çıkarılan ham metin
  status: documentStatusEnum('status').default('PROCESSING').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Chatbot Sessions (Yapay Zeka Sohbet Oturumları)
export const chatbotSessions = pgTable('chatbot_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. Chatbot Messages (Sohbet Mesaj Geçmişi)
export const chatbotMessages = pgTable('chatbot_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id')
    .references(() => chatbotSessions.id, { onDelete: 'cascade' })
    .notNull(),
  message: text('message').notNull(),
  sender: senderEnum('sender').notNull(), // USER veya AI
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Tablo İlişkileri ---

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  products: many(products),
  formTypes: many(formTypes),
  formSubmissions: many(formSubmissions),
  documents: many(documents),
  chatbotSessions: many(chatbotSessions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  verifiedSubmissions: many(formSubmissions),
  chatbotSessions: many(chatbotSessions),
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

export const productsRelations = relations(products, ({ one }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [documents.tenantId],
    references: [tenants.id],
  }),
}));

export const chatbotSessionsRelations = relations(chatbotSessions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [chatbotSessions.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [chatbotSessions.userId],
    references: [users.id],
  }),
  messages: many(chatbotMessages),
}));

export const chatbotMessagesRelations = relations(chatbotMessages, ({ one }) => ({
  session: one(chatbotSessions, {
    fields: [chatbotMessages.sessionId],
    references: [chatbotSessions.id],
  }),
}));
