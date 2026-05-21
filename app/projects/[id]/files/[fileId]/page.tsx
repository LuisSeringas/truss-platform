import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import {
  getFileById,
  getLatestRationalesByFile,
  getProjectById,
} from '@/lib/db/repository';
import RationaleSection from '../../rationale-section';

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function FilePage({
  params,
}: {
  params: Promise<{ id: string; fileId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id, fileId } = await params;
  const project = await getProjectById(db, id);
  if (!project || project.ownerId !== session.user.id) redirect('/dashboard');

  const file = await getFileById(db, fileId);
  if (!file || file.projectId !== id) redirect(`/projects/${id}`);

  const rationales = await getLatestRationalesByFile(db, fileId);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3 flex-wrap">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
            ← Projects
          </Link>
          <span className="text-gray-300">/</span>
          <Link href={`/projects/${id}`} className="text-sm text-gray-500 hover:text-gray-900">
            {project.name}
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-900">{file.name}</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        <section className="rounded-lg border border-gray-200 bg-white px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">File details</h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <dt className="text-gray-500">Name</dt>
            <dd className="text-gray-900">{file.name}</dd>
            {file.mimeType && (
              <>
                <dt className="text-gray-500">Type</dt>
                <dd className="text-gray-900">{file.mimeType}</dd>
              </>
            )}
            {file.sizeBytes && (
              <>
                <dt className="text-gray-500">Size</dt>
                <dd className="text-gray-900">{formatBytes(file.sizeBytes)}</dd>
              </>
            )}
            <dt className="text-gray-500">Added</dt>
            <dd className="text-gray-900">{new Date(file.createdAt).toLocaleDateString()}</dd>
          </dl>
          <div className="mt-4">
            <a
              href={`/api/projects/${id}/files/${fileId}/download`}
              className="inline-block rounded bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Download
            </a>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Rationale</h2>
          <RationaleSection
            projectId={id}
            fileId={fileId}
            initialEntries={rationales as Parameters<typeof RationaleSection>[0]['initialEntries']}
          />
        </section>
      </div>
    </main>
  );
}
