import { eq, desc } from 'drizzle-orm';
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
export function createRationale(db: DB, data: NewRationale) {
  return db.insert(rationales).values(data).returning();
}

export function getRationalesByProject(db: DB, projectId: string) {
  return db
    .select()
    .from(rationales)
    .where(eq(rationales.projectId, projectId))
    .orderBy(desc(rationales.version));
}

export function getRationalesByFile(db: DB, fileId: string) {
  return db
    .select()
    .from(rationales)
    .where(eq(rationales.fileId, fileId))
    .orderBy(desc(rationales.version));
}
