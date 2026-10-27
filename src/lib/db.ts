import Dexie, { type EntityTable } from 'dexie';
import type { AppDocument } from './types';

interface DraftRow {
  id: string;
  document: AppDocument;
  updatedAt: number;
}

const db = new Dexie('loto-sop-react-editor') as Dexie & { drafts: EntityTable<DraftRow, 'id'> };
db.version(1).stores({ drafts: 'id, updatedAt' });

export async function saveLocalDraft(document: AppDocument) {
  await db.drafts.put({ id: 'active', document, updatedAt: Date.now() });
}

export async function loadLocalDraft() {
  const row = await db.drafts.get('active');
  return row?.document ?? null;
}

export async function clearLocalDraft() {
  await db.drafts.delete('active');
}
