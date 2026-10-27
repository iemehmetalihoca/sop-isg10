'use client';

import { useEditorStore } from '@/store/editor-store';
import { tr } from '@/lib/labels';

export function DocumentHeader({ title }: { title: string }) {
  const lang = useEditorStore((state) => state.document.uiLang);
  return (
    <div className="document-header">
      <div className="document-logo"><img src="./lesaffre-logo.jpg" alt="Lesaffre Türkiye" /></div>
      <h1>{tr(title, lang)}</h1>
      <b>{tr('Kurum İçi / Internal', lang)}</b>
    </div>
  );
}
