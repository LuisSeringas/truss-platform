import { eq, desc, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { files, projects, rationales, users } from './schema';
import type { NewFile, NewProject, NewRationale, NewUser } from './schema';
import type * as schema from './schema';

type DB = PostgresJsDatabase<typeof schema>;

// Users
export function createUser(db: DB, data: NewUser) {
  return db.insert(users).values(data).returning();
}

export function getUserById(db: DB, id: string) {
  return db.select().from(users).where(eq(users.id, id)).then((rows) => rows[0] ?? null);
}

export function getUserByEmail(db: DB, email: string) {
  return db.select().from(users).where(eq(users.email, email)).then((rows) => rows[0] ?? null);
}

// Projects
export function createProject(db: DB, data: NewProject) {
  return db.insert(projects).values(data).returning();
}

export function getProjectById(db: DB, id: string) {
  return db.select().from(projects).where(eq(projects.id, id)).then((rows) => rows[0] ?? null);
}

export function getProjectsByOwner(db: DB, ownerId: string) {
  return db.select().from(projects).where(eq(projects.ownerId, ownerId));
}

// Files
export function createFile(db: DB, data: NewFile) {
  return db.insert(files).values(data).returning();
}

export function getFileById(db: DB, id: string) {
  return db.select().from(files).where(eq(files.id, id)).then((rows) => rows[0] ?? null);
}

export function getFilesByProject(db: DB, projectId: string) {
  return db.select().from(files).where(eq(files.projectId, projectId));
}

// Rationales
// Each insert is one revision. entryId groups all revisions of the same logical entry.

export function createRationale(db: DB, data: NewRationale) {
  return db.insert(rationales).values(data).returning();
}

// Latest revision per entry — project-level rationales.
export function getLatestRationalesByProject(db: DB, projectId: string) {
  return db
    .selectDistinctOn([rationales.entryId])
    .from(rationales)
    .where(eq(rationales.projectId, projectId))
    .orderBy(rationales.entryId, desc(rationales.version));
}

// Latest revision per entry — file-level rationales.
export function getLatestRationalesByFile(db: DB, fileId: string) {
  return db
    .selectDistinctOn([rationales.entryId])
    .from(rationales)
    .where(eq(rationales.fileId, fileId))
    .orderBy(rationales.entryId, desc(rationales.version));
}

// All revisions of a single entry, newest first.
export function getRationaleHistory(db: DB, entryId: string) {
  return db
    .select()
    .from(rationales)
    .where(eq(rationales.entryId, entryId))
    .orderBy(desc(rationales.version));
}

// Latest revision of an entry — used for auth checks before edit/delete.
export function getLatestRationaleByEntryId(db: DB, entryId: string) {
  return db
    .select()
    .from(rationales)
    .where(eq(rationales.entryId, entryId))
    .orderBy(desc(rationales.version))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

// Add a new revision. Reads the current max version + inherits parent from latest revision.
export async function addRationaleRevision(db: DB, entryId: string, body: string, userId: string) {
  const latest = await getLatestRationaleByEntryId(db, entryId);
  if (!latest) throw new Error('Rationale entry not found');

  const [revision] = await db
    .insert(rationales)
    .values({
      entryId,
      projectId: latest.projectId,
      fileId: latest.fileId,
      body,
      version: latest.version + 1,
      createdBy: userId,
    })
    .returning();
  return revision;
}

// Delete all revisions of an entry.
export function deleteRationaleEntry(db: DB, entryId: string) {
  return db.delete(rationales).where(eq(rationales.entryId, entryId)).returning();
}

// Legacy — kept for compatibility but prefer getLatestRationalesByProject.
export function getRationalesByProject(db: DB, projectId: string) {
  return db
    .select()
    .from(rationales)
    .where(eq(rationales.projectId, projectId))
    .orderBy(desc(rationales.version));
}

// Legacy — kept for compatibility but prefer getLatestRationalesByFile.
export function getRationalesByFile(db: DB, fileId: string) {
  return db
    .select()
    .from(rationales)
    .where(eq(rationales.fileId, fileId))
    .orderBy(desc(rationales.version));
}
