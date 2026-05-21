import { check, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  // nullable so we can later support SSO providers with no password
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const files = pgTable('files', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  mimeType: text('mime_type'),
  storagePath: text('storage_path').notNull(),
  sizeBytes: integer('size_bytes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Each row is one revision of a rationale entry. A rationale belongs to exactly
// one parent (project XOR file) — enforced by the DB check constraint.
// entryId groups all revisions of the same logical entry.
export const rationales = pgTable(
  'rationales',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Groups all revisions of the same logical entry. Set equal to id on first revision.
    entryId: uuid('entry_id').notNull().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    fileId: uuid('file_id').references(() => files.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    version: integer('version').notNull().default(1),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'rationale_has_one_parent',
      sql`(${table.projectId} IS NOT NULL AND ${table.fileId} IS NULL) OR (${table.projectId} IS NULL AND ${table.fileId} IS NOT NULL)`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type Rationale = typeof rationales.$inferSelect;
export type NewRationale = typeof rationales.$inferInsert;
