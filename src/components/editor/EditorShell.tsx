'use client';

import { useEffect, useRef } from 'react';
import { Toolbar } from './Toolbar';
import { DocumentCanvas } from './DocumentCanvas';
import { loadLocalDraft, saveLocalDraft } from '@/lib/db';
import { normalizeImportedDocument } from '@/lib/schema';
import { useEditorStore } from '@/store/editor-store';
import { tr } from '@/lib/labels';

export function EditorShell() {
  const document = useEditorStore((s) => s.document);
  const hydrated = useEditorStore((s) => s.hydrated);
  const setHydrated = useEditorStore((s) => s.setHydrated);
  const replaceDocument = useEditorStore((s) => s.replaceDocument);
  const setSaveState = useEditorStore((s) => s.setSaveState);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const moveSelectedSection = useEditorStore((s) => s.moveSelectedSection);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let live = true;

    const hydrateEditor = async () => {
      let timeoutId: number | undefined;
      try {
        // Continue startup if local IndexedDB is unavailable or unresponsive.
        const draft = await Promise.race([
          loadLocalDraft(),
          new Promise<null>((resolve) => {
            timeoutId = window.setTimeout(() => {
              console.warn('Yerel taslak yükleme zaman aşımına uğradı; editör taslaksız açılıyor.');
              resolve(null);
            }, 2500);
          }),
        ]);

        if (!live) return;
        if (draft) {
          try {
            replaceDocument(normalizeImportedDocument(draft), false);
          } catch (error) {
            // Keep unreadable local drafts intact to avoid accidental data loss.
            console.error('Yerel taslak açılamadı; taslak IndexedDB içinde korunuyor.', error);
            window.alert(tr('Yerel otomatik taslak açılamadı. Güvenlik için taslak silinmedi; mevcut yedeğinizi Yedeği Yükle ile geri açabilirsiniz.', useEditorStore.getState().document.uiLang));
          }
        }
      } catch (error) {
        // A stale or incompatible local IndexedDB state must not prevent the editor from
        // opening. Persistence can retry naturally on the next autosave.
        console.error('Yerel taslak okunamadı; editör taslaksız açılıyor.', error);
      } finally {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        if (live) {
          setHydrated(true);
          setSaveState('saved');
        }
      }
    };

    void hydrateEditor();
    return () => { live = false; };
  }, [replaceDocument, setHydrated, setSaveState]);

  useEffect(() => {
    window.document.documentElement.lang = document.uiLang;
  }, [document.uiLang]);

  useEffect(() => {
    if (!hydrated) return;
    if (timer.current) clearTimeout(timer.current);
    setSaveState('saving');
    timer.current = setTimeout(() => {
      void saveLocalDraft(document).then(() => setSaveState('saved')).catch(() => setSaveState('dirty'));
    }, 450);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [document, hydrated, setSaveState]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag ?? '');
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); return; }
      if (!isTyping && event.altKey && event.key === 'ArrowUp') { event.preventDefault(); moveSelectedSection(-1); }
      if (!isTyping && event.altKey && event.key === 'ArrowDown') { event.preventDefault(); moveSelectedSection(1); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, moveSelectedSection]);

  if (!hydrated) return <div className="boot-screen"><img src="./lesaffre-logo.jpg" alt="Lesaffre" /><strong>{tr('LOTO SOP Editörü hazırlanıyor…', document.uiLang)}</strong></div>;
  return <div className="app-root"><Toolbar /><DocumentCanvas /></div>;
}
