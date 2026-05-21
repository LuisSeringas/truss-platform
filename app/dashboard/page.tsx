import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getProjectsByOwner, searchForUser } from '@/lib/db/repository';
import CreateProjectForm from './create-project-form';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  const [projects, searchResults] = await Promise.all([
    getProjectsByOwner(db, session.user.id),
    query ? searchForUser(db, session.user.id, query) : null,
  ]);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Truss</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{session.user.email}</span>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button type="submit" className="text-sm text-gray-600 hover:text-gray-900">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Projects</h2>
          <CreateProjectForm />
        </div>

        <form method="GET" action="/dashboard" className="mb-8 flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search projects and rationale…"
            className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Search
          </button>
          {query && (
            <Link
              href="/dashboard"
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Clear
            </Link>
          )}
        </form>

        {searchResults ? (
          <div className="space-y-8">
            {searchResults.projects.length === 0 && searchResults.rationales.length === 0 ? (
              <p className="text-sm text-gray-500">No results for &ldquo;{query}&rdquo;.</p>
            ) : (
              <>
                {searchResults.projects.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Projects
                    </h3>
                    <ul className="space-y-3">
                      {searchResults.projects.map((project) => (
                        <li key={project.id}>
                          <Link
                            href={`/projects/${project.id}`}
                            className="block rounded-lg border border-gray-200 bg-white px-5 py-4 hover:border-gray-300 hover:shadow-sm transition-shadow"
                          >
                            <p className="font-medium text-gray-900">{project.name}</p>
                            {project.description && (
                              <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {searchResults.rationales.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Rationale entries
                    </h3>
                    <ul className="space-y-3">
                      {searchResults.rationales.map((r) => (
                        <li key={r.entryId}>
                          <Link
                            href={
                              r.fileId
                                ? `/projects/${r.resolvedProjectId}/files/${r.fileId}`
                                : `/projects/${r.resolvedProjectId}`
                            }
                            className="block rounded-lg border border-gray-200 bg-white px-5 py-4 hover:border-gray-300 hover:shadow-sm transition-shadow"
                          >
                            <p className="text-sm text-gray-800 line-clamp-3">{r.body}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              v{r.version} · {new Date(r.createdAt).toLocaleDateString()}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            {projects.length === 0 ? (
              <p className="text-sm text-gray-500">No projects yet. Create your first one.</p>
            ) : (
              <ul className="space-y-3">
                {projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      className="block rounded-lg border border-gray-200 bg-white px-5 py-4 hover:border-gray-300 hover:shadow-sm transition-shadow"
                    >
                      <p className="font-medium text-gray-900">{project.name}</p>
                      {project.description && (
                        <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Updated {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}
