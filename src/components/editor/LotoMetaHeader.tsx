'use client';

import { InlineText } from '@/components/fields/InlineField';
import { tr } from '@/lib/labels';
import { useEditorStore } from '@/store/editor-store';

type HeaderScope = 'sop' | 'instruction';

export function LotoMetaHeader({ scope = 'sop' }: { scope?: HeaderScope }) {
  const document = useEditorStore((s) => s.document);
  const mutate = useEditorStore((s) => s.mutate);
  const m = scope === 'instruction' ? document.instruction.meta : document.meta;
  const lang = document.uiLang;

  const setField = (field: keyof typeof m, value: string) => {
    mutate((d) => {
      const target = scope === 'instruction' ? d.instruction.meta : d.meta;
      target[field] = value;
    });
  };

  return (
    <table className="header-meta"><tbody>
      <tr>
        <th>{tr('Ekipman:', lang)}</th>
        <td><InlineText multiline className="header-meta-input" value={m.equipment} onChange={(v) => setField('equipment', v)} /></td>
        <th>{tr('Lokasyon:', lang)}</th>
        <td><InlineText multiline className="header-meta-input" value={m.location} onChange={(v) => setField('location', v)} /></td>
        <td rowSpan={2} className="header-side">
          <div className="header-side-stack">
            <div className="header-side-row"><b>{tr('Yayınlanma Tarihi:', lang)}</b><InlineText multiline className="header-side-input" value={m.publishDate} onChange={(v) => setField('publishDate', v)} /></div>
            <div className="header-side-row"><b>{tr('Revizyon:', lang)}</b><InlineText multiline className="header-side-input" value={m.revision} onChange={(v) => setField('revision', v)} /></div>
            <div className="header-side-row"><b>{tr('LOTO SOP Numarası:', lang)}</b><InlineText multiline className="header-side-input" value={m.sopNo} onChange={(v) => setField('sopNo', v)} /></div>
            <div className="header-side-row"><b>{tr('Referans LOTO Talimat Numarası:', lang)}</b><InlineText multiline className="header-side-input" value={m.referenceNo} onChange={(v) => setField('referenceNo', v)} /></div>
          </div>
        </td>
      </tr>
      <tr><th>{tr('İş Tanımı:', lang)}</th><td colSpan={3}><InlineText multiline className="header-meta-input" value={m.jobDescription} onChange={(v) => setField('jobDescription', v)} /></td></tr>
    </tbody></table>
  );
}
