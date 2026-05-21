import { eq, desc, and, ilike, or, inArray } from 'drizzle-orm';
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
  return db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, ownerId))
    .orderBy(desc(projects.updatedAt));
}

export function touchProject(db: DB, projectId: string) {
  return db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}

export async function searchForUser(db: DB, ownerId: string, q: string) {
  const pattern = `%${q.trim()}%`;
  const lower = q.trim().toLowerCase();

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, ownerId))
    .orderBy(desc(projects.updatedAt));

  const projectIds = userProjects.map((p) => p.id);

  const matchingProjects = userProjects.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      (p.description?.toLowerCase() ?? '').includes(lower),
  );

  if (projectIds.length === 0) {
    return { projects: matchingProjects, rationales: [] as RationaleSearchRow[] };
  }

  const rows = await db
    .select({
      id: rationales.id,
      entryId: rationales.entryId,
      projectId: rationales.projectId,
      fileId: rationales.fileId,
      body: rationales.body,
      version: rationales.version,
      createdAt: rationales.createdAt,
      fileProjectId: files.projectId,
    })
    .from(rationales)
    .leftJoin(files, eq(rationales.fileId, files.id))
    .where(
      and(
        ilike(rationales.body, pattern),
        or(inArray(rationales.projectId, projectIds), inArray(files.projectId, projectIds)),
      ),
    )
    .orderBy(rationales.entryId, desc(rationales.version));

  // Keep highest version per entryId
  const seen = new Set<string>();
  const matchingRationales: RationaleSearchRow[] = [];
  for (const r of rows) {
    if (seen.has(r.entryId)) continue;
    seen.add(r.entryId);
    matchingRationales.push({ ...r, resolvedProjectId: r.projectId ?? r.fileProjectId! });
  }

  return { projects: matchingProjects, rationales: matchingRationales };
}

type RationaleSearchRow = {
  id: string;
  entryId: string;
  projectId: string | null;
  fileId: string | null;
  body: string;
  version: number;
  createdAt: Date;
  fileProjectId: string | null;
  resolvedProjectId: string;
};

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
