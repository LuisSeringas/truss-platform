'use client';

import { useState } from 'react';

type RationaleEntry = {
  id: string;
  entryId: string;
  body: string;
  version: number;
  createdAt: Date | string;
};

type HistoryRevision = {
  id: string;
  body: string;
  version: number;
  createdAt: string;
};

type Props = {
  projectId: string;
  /** Set when this section is for a specific file; omit for project-level rationale. */
  fileId?: string;
  initialEntries: RationaleEntry[];
};

export default function RationaleSection({ projectId, fileId, initialEntries }: Props) {
  const [entries, setEntries] = useState<RationaleEntry[]>(initialEntries);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [historyEntryId, setHistoryEntryId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRevision[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const baseUrl = fileId
    ? `/api/projects/${projectId}/files/${fileId}/rationales`
    : `/api/projects/${projectId}/rationales`;

  async function handleCreate() {
    if (!draft.trim()) return;
    setSaving(true);
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: draft.trim() }),
    });
    if (res.ok) {
      const entry: RationaleEntry = await res.json();
      setEntries((prev) => [entry, ...prev]);
      setDraft('');
      setComposing(false);
    }
    setSaving(false);
  }

  async function handleEdit(entryId: string) {
    if (!editDraft.trim()) return;
    setSaving(true);
    const url = fileId
      ? `/api/projects/${projectId}/files/${fileId}/rationales/${entryId}`
      : `/api/projects/${projectId}/rationales/${entryId}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: editDraft.trim() }),
    });
    if (res.ok) {
      const updated: RationaleEntry = await res.json();
      setEntries((prev) =>
        prev.map((e) => (e.entryId === entryId ? { ...e, ...updated } : e)),
      );
      setEditingEntryId(null);
      setEditDraft('');
    }
    setSaving(false);
  }

  async function handleDelete(entryId: string) {
    if (!confirm('Delete this rationale entry and all its revisions?')) return;
    const url = fileId
      ? `/api/projects/${projectId}/files/${fileId}/rationales/${entryId}`
      : `/api/projects/${projectId}/rationales/${entryId}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.entryId !== entryId));
    }
  }

  async function handleShowHistory(entryId: string) {
    if (historyEntryId === entryId) {
      setHistoryEntryId(null);
      return;
    }
    setHistoryLoading(true);
    setHistoryEntryId(entryId);
    const url = fileId
      ? `/api/projects/${projectId}/files/${fileId}/rationales/${entryId}/history`
      : `/api/projects/${projectId}/rationales/${entryId}/history`;
    const res = await fetch(url);
    if (res.ok) setHistory(await res.json());
    setHistoryLoading(false);
  }

  return (
    <div className="mt-2">
      {entries.length === 0 && !composing && (
        <p className="text-xs text-gray-400 italic">No rationale yet.</p>
      )}

      <ul className="space-y-3">
        {entries.map((entry) => (
          <li key={entry.entryId} className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
            {editingEntryId === entry.entryId ? (
              <div className="space-y-2">
                <textarea
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm font-mono text-gray-800 focus:border-blue-400 focus:outline-none"
                  rows={5}
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(entry.entryId)}
                    disabled={saving || !editDraft.trim()}
                    className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Save revision
                  </button>
                  <button
                    onClick={() => { setEditingEntryId(null); setEditDraft(''); }}
                    className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">{entry.body}</pre>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  <span>v{entry.version}</span>
                  <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => {
                      setEditingEntryId(entry.entryId);
                      setEditDraft(entry.body);
                    }}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    Edit
                  </button>
                  {entry.version > 1 && (
                    <button
                      onClick={() => handleShowHistory(entry.entryId)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {historyEntryId === entry.entryId ? 'Hide history' : `${entry.version} revisions`}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(entry.entryId)}
                    className="text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>

                {historyEntryId === entry.entryId && (
                  <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                    {historyLoading ? (
                      <p className="text-xs text-gray-400">Loading…</p>
                    ) : (
                      history.map((rev) => (
                        <div key={rev.id} className="rounded border border-gray-100 bg-white px-3 py-2">
                          <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                            <span className="font-medium">v{rev.version}</span>
                            <span>{new Date(rev.createdAt).toLocaleString()}</span>
                          </div>
                          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">{rev.body}</pre>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      {composing ? (
        <div className="mt-3 space-y-2">
          <textarea
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm font-mono text-gray-800 focus:border-blue-400 focus:outline-none"
            rows={4}
            placeholder="Explain the decision, calc, assumption, or reference…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !draft.trim()}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => { setComposing(false); setDraft(''); }}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setComposing(true)}
          className="mt-2 text-xs text-blue-500 hover:text-blue-700"
        >
          + Add rationale
        </button>
      )}
    </div>
  );
}
