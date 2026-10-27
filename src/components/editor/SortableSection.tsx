'use client';

import type { ReactNode } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useEditorStore } from '@/store/editor-store';
import { tr } from '@/lib/labels';

export function SortableSection({ id, title, children, page = false }: { id: string; title: string; children: ReactNode; page?: boolean }) {
  const mode = useEditorStore((state) => state.mode);
  const lang = useEditorStore((state) => state.document.uiLang);
  const selectedSection = useEditorStore((state) => state.selectedSection);
  const setSelectedSection = useEditorStore((state) => state.setSelectedSection);
  const moveSelectedSection = useEditorStore((state) => state.moveSelectedSection);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: mode !== 'edit' });
  const selected = selectedSection === id;
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined };
  return (
    <div ref={setNodeRef} style={style} className={`sortable-section ${page ? 'sortable-page' : ''} ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`} onPointerDown={(event) => { if (mode === 'edit' && event.currentTarget === event.target) setSelectedSection(id); }}>
      {mode === 'edit' && (
        <div className="section-tools no-print">
          <button type="button" className="drag-handle" title={`${tr(title, lang)} · ${tr('bölümünü sürükle', lang)}`} {...attributes} {...listeners}><GripVertical size={16} /></button>
          <span>{tr(title, lang)}</span>
          <button type="button" title={tr('Yukarı taşı', lang)} onClick={() => { setSelectedSection(id); moveSelectedSection(-1); }}><ChevronUp size={15} /></button>
          <button type="button" title={tr('Aşağı taşı', lang)} onClick={() => { setSelectedSection(id); moveSelectedSection(1); }}><ChevronDown size={15} /></button>
        </div>
      )}
      <div onPointerDown={() => mode === 'edit' && setSelectedSection(id)}>{children}</div>
    </div>
  );
}
