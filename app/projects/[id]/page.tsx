import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { getFilesByProject, getProjectById } from '@/lib/db/repository';
import FileUploader from './file-uploader';

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;
  const project = await getProjectById(db, id);
  if (!project || project.ownerId !== session.user.id) redirect('/dashboard');

  const files = await getFilesByProject(db, id);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
            ← Projects
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-900">{project.name}</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {project.description && (
          <p className="text-sm text-gray-600 mb-8">{project.description}</p>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-gray-900">Files</h2>
          <FileUploader projectId={id} />
        </div>

        {files.length === 0 ? (
          <p className="text-sm text-gray-500">No files yet. Upload your first one.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {files.map((file) => (
              <li key={file.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatBytes(file.sizeBytes)}
                    {file.sizeBytes ? ' · ' : ''}
                    {new Date(file.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={`/api/projects/${project.id}/files/${file.id}/download`}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
