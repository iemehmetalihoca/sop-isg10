'use client';

import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { DocumentHeader } from './DocumentHeader';
import { useEditorStore } from '@/store/editor-store';
import type { SopSectionId } from '@/lib/types';
import {
  InstructionLockingSection,
  InstructionMetaSection,
  InstructionPhotosSection,
  InstructionPointsSection,
  InstructionRemovalSection,
  InstructionSignersSection,
  InstructionSummarySection,
} from '@/components/sections/instruction/InstructionSections';
import {
  SopEquipmentSection,
  SopGeneralSection,
  SopPersonnelPointsSection,
  SopSafetySection,
  SopStepsSection,
} from '@/components/sections/sop/SopSections';

const sopRegistry: Record<SopSectionId, { title: string; component: () => React.ReactNode }> = {
  'sop-general': { title: 'Genel Bilgiler · KKD · Enerji', component: () => <SopGeneralSection /> },
  'sop-safety': { title: 'İş Güvenliği · Yetkili Personel', component: () => <SopSafetySection /> },
  'sop-equipment': { title: 'LOTO Ekipmanları', component: () => <SopEquipmentSection /> },
  'sop-personnel-points': { title: 'Personel · LOTO Noktaları', component: () => <SopPersonnelPointsSection /> },
  'sop-steps': { title: 'LOTO Talimatı · Devreye Alma', component: () => <SopStepsSection /> },
};

const FIXED_SOP_ORDER: SopSectionId[] = [
  'sop-general',
  'sop-safety',
  'sop-equipment',
  'sop-personnel-points',
  'sop-steps',
];

export function DocumentCanvas() {
  const activeDocument = useEditorStore((s) => s.document.activeDocument);
  const zoom = useEditorStore((s) => s.document.editor.zoom);
  const reorderSafetyItems = useEditorStore((s) => s.reorderSafetyItems);
  const reorderEquipmentItems = useEditorStore((s) => s.reorderEquipmentItems);
  const reorderPointItems = useEditorStore((s) => s.reorderPointItems);
  const reorderStepItems = useEditorStore((s) => s.reorderStepItems);
  const reorderInstructionPhotos = useEditorStore((s) => s.reorderInstructionPhotos);
  const reorderInstructionPointItems = useEditorStore((s) => s.reorderInstructionPointItems);
  const mode = useEditorStore((s) => s.mode);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const active = String(event.active.id);
    const over = event.over ? String(event.over.id) : '';
    if (!over || active === over) return;

    if (active.startsWith('safety-row-')) {
      if (!over.startsWith('safety-row-')) return;
      const from = Number(active.replace('safety-row-', ''));
      const to = Number(over.replace('safety-row-', ''));
      if (Number.isInteger(from) && Number.isInteger(to)) reorderSafetyItems(from, to);
      return;
    }

    if (active.startsWith('equipment-row-')) {
      if (!over.startsWith('equipment-row-')) return;
      const from = Number(active.replace('equipment-row-', ''));
      const to = Number(over.replace('equipment-row-', ''));
      if (Number.isInteger(from) && Number.isInteger(to)) reorderEquipmentItems(from, to);
      return;
    }

    if (active.startsWith('point-row-')) {
      if (!over.startsWith('point-row-')) return;
      const from = Number(active.replace('point-row-', ''));
      const to = Number(over.replace('point-row-', ''));
      if (Number.isInteger(from) && Number.isInteger(to)) reorderPointItems(from, to);
      return;
    }

    if (active.startsWith('step-row-')) {
      if (!over.startsWith('step-row-')) return;
      const from = Number(active.replace('step-row-', ''));
      const to = Number(over.replace('step-row-', ''));
      if (Number.isInteger(from) && Number.isInteger(to)) reorderStepItems(from, to);
      return;
    }

    if (active.startsWith('instruction-photo-')) {
      if (!over.startsWith('instruction-photo-')) return;
      reorderInstructionPhotos(active.replace('instruction-photo-', ''), over.replace('instruction-photo-', ''));
      return;
    }

    if (active.startsWith('instruction-point-row-')) {
      if (!over.startsWith('instruction-point-row-')) return;
      reorderInstructionPointItems(active.replace('instruction-point-row-', ''), over.replace('instruction-point-row-', ''));
      return;
    }

  };

  return (
    <main className={`canvas-shell ${mode === 'preview' ? 'preview-mode' : 'edit-mode'}`}>
      <div className="canvas-stage" style={{ ['--document-zoom' as string]: String(zoom) }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          {activeDocument === 'instruction' ? (
            <div className="zoom-wrapper instruction-wrapper">
              <section className="a4-page instruction-page">
                <DocumentHeader title="KİLİTLEME / ETİKETLEME TALİMATI" />
                <InstructionMetaSection />
                <InstructionSummarySection />
                <InstructionLockingSection />
                <InstructionPhotosSection />
                <InstructionPointsSection />
                <InstructionRemovalSection />
                <InstructionSignersSection />
              </section>
            </div>
          ) : (
            <div className="zoom-wrapper sop-wrapper">
              {FIXED_SOP_ORDER.map((id) => {
                const def = sopRegistry[id];
                return <div key={id} className="fixed-sop-page">{def.component()}</div>;
              })}
            </div>
          )}
        </DndContext>
      </div>
    </main>
  );
}
