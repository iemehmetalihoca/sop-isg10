'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { arrayMove } from '@dnd-kit/sortable';
import { createDefaultDocument, createEmptySopDocument, blankInstructionPoint, nowStamp } from '@/lib/defaults';
import type { ActiveDocument, AppDocument, EditorMode, InstructionSectionId, SopSectionId } from '@/lib/types';

const HISTORY_LIMIT = 80;

interface SnapshotState {
  document: AppDocument;
  selectedSection: string | null;
  mode: EditorMode;
  past: AppDocument[];
  future: AppDocument[];
  hydrated: boolean;
  saveState: 'saved' | 'saving' | 'dirty';
  setHydrated: (value: boolean) => void;
  setSaveState: (value: SnapshotState['saveState']) => void;
  replaceDocument: (document: AppDocument, recordHistory?: boolean) => void;
  mutate: (recipe: (draft: AppDocument) => void, recordHistory?: boolean) => void;
  setActiveDocument: (type: ActiveDocument) => void;
  setMode: (mode: EditorMode) => void;
  setSelectedSection: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  reorderSopSections: (activeId: SopSectionId, overId: SopSectionId) => void;
  reorderInstructionSections: (activeId: InstructionSectionId, overId: InstructionSectionId) => void;
  reorderSafetyItems: (activeIndex: number, overIndex: number) => void;
  reorderEquipmentItems: (activeIndex: number, overIndex: number) => void;
  reorderPointItems: (activeIndex: number, overIndex: number) => void;
  reorderStepItems: (activeIndex: number, overIndex: number) => void;
  reorderInstructionPhotos: (activeId: string, overId: string) => void;
  reorderInstructionPointItems: (activeId: string, overId: string) => void;
  moveSafetyItem: (index: number, direction: -1 | 1) => void;
  moveSelectedSection: (direction: -1 | 1) => void;
  undo: () => void;
  redo: () => void;
  resetCurrent: () => void;
}

const cloneDocument = (doc: AppDocument) => structuredClone(doc);

export const useEditorStore = create<SnapshotState>()(immer((set, get) => ({
  document: createDefaultDocument(),
  selectedSection: null,
  mode: 'edit',
  past: [],
  future: [],
  hydrated: false,
  saveState: 'saved',

  setHydrated(value) { set((state) => { state.hydrated = value; }); },
  setSaveState(value) { set((state) => { state.saveState = value; }); },

  replaceDocument(document, recordHistory = false) {
    const current = get().document;
    set((state) => {
      if (recordHistory) {
        state.past.push(cloneDocument(current));
        if (state.past.length > HISTORY_LIMIT) state.past.shift();
        state.future = [];
      }
      // Preserve imported metadata; user edits update lastModified separately.
      state.document = cloneDocument(document);
      state.saveState = 'dirty';
    });
  },

  mutate(recipe, recordHistory = true) {
    // Skip full document cloning for transient UI-only changes.
    const before = recordHistory ? cloneDocument(get().document) : null;
    set((state) => {
      if (recordHistory && before) {
        state.past.push(before);
        if (state.past.length > HISTORY_LIMIT) state.past.shift();
        state.future = [];
      }
      recipe(state.document);
      state.document.project.lastModified = nowStamp();
      state.saveState = 'dirty';
    });
  },

  setActiveDocument(type) {
    get().mutate((draft) => { draft.activeDocument = type; }, false);
    set((state) => { state.selectedSection = null; });
  },
  setMode(mode) { set((state) => { state.mode = mode; state.selectedSection = null; }); },
  setSelectedSection(id) { set((state) => { state.selectedSection = id; }); },
  setZoom(zoom) { get().mutate((draft) => { draft.editor.zoom = Math.max(0.5, Math.min(1.4, zoom)); }, false); },

  reorderSopSections() {
    // LOTO SOP sayfa sırası sabittir; sayfa düzeyinde yeniden sıralama bilinçli olarak kapalıdır.
  },

  reorderInstructionSections(activeId, overId) {
    get().mutate((draft) => {
      const from = draft.editor.instructionSectionOrder.indexOf(activeId);
      const to = draft.editor.instructionSectionOrder.indexOf(overId);
      if (from !== -1 && to !== -1) draft.editor.instructionSectionOrder = arrayMove(draft.editor.instructionSectionOrder, from, to);
    });
  },

  reorderSafetyItems(activeIndex, overIndex) {
    get().mutate((draft) => {
      if (activeIndex < 0 || overIndex < 0 || activeIndex >= draft.safety.length || overIndex >= draft.safety.length || activeIndex === overIndex) return;
      draft.safety = arrayMove(draft.safety, activeIndex, overIndex);
    });
  },

  reorderEquipmentItems(activeIndex, overIndex) {
    get().mutate((draft) => {
      if (activeIndex < 0 || overIndex < 0 || activeIndex >= draft.equipments.length || overIndex >= draft.equipments.length || activeIndex === overIndex) return;
      draft.equipments = arrayMove(draft.equipments, activeIndex, overIndex);
      draft.equipments.forEach((item, index) => { item.no = index + 1; });
    });
  },

  reorderPointItems(activeIndex, overIndex) {
    get().mutate((draft) => {
      if (activeIndex < 0 || overIndex < 0 || activeIndex >= draft.points.length || overIndex >= draft.points.length || activeIndex === overIndex) return;
      draft.points = arrayMove(draft.points, activeIndex, overIndex);
      draft.points.forEach((item, index) => { item.no = index + 1; });
    });
  },

  reorderStepItems(activeIndex, overIndex) {
    get().mutate((draft) => {
      if (activeIndex < 0 || overIndex < 0 || activeIndex >= draft.steps.length || overIndex >= draft.steps.length || activeIndex === overIndex) return;
      draft.steps = arrayMove(draft.steps, activeIndex, overIndex);
      draft.steps.forEach((item, index) => { item.no = index + 1; });
    });
  },

  reorderInstructionPhotos(activeId, overId) {
    get().mutate((draft) => {
      const from = draft.instruction.photos.findIndex((item) => item.id === activeId);
      const to = draft.instruction.photos.findIndex((item) => item.id === overId);
      if (from === -1 || to === -1 || from === to) return;
      draft.instruction.photos = arrayMove(draft.instruction.photos, from, to);
    });
  },

  reorderInstructionPointItems(activeId, overId) {
    get().mutate((draft) => {
      const from = draft.instruction.points.findIndex((item) => item.id === activeId);
      const to = draft.instruction.points.findIndex((item) => item.id === overId);
      if (from === -1 || to === -1 || from === to) return;
      draft.instruction.points = arrayMove(draft.instruction.points, from, to);
    });
  },

  moveSafetyItem(index, direction) {
    const target = index + direction;
    const length = get().document.safety.length;
    if (index < 0 || target < 0 || index >= length || target >= length) return;
    get().reorderSafetyItems(index, target);
  },

  moveSelectedSection(direction) {
    const state = get();
    const id = state.selectedSection;
    if (!id) return;
    if (state.document.activeDocument === 'sop') return;
    const order = state.document.editor.instructionSectionOrder;
    const index = order.indexOf(id as InstructionSectionId);
    const target = index + direction;
    if (index >= 0 && target >= 0 && target < order.length) state.reorderInstructionSections(order[index], order[target]);
  },

  undo() {
    const state = get();
    const previous = state.past[state.past.length - 1];
    if (!previous) return;
    const currentLang = state.document.uiLang;
    set((draft) => {
      draft.past.pop();
      draft.future.push(cloneDocument(state.document));
      const restored = cloneDocument(previous);
      restored.uiLang = currentLang;
      draft.document = restored;
      draft.saveState = 'dirty';
    });
  },

  redo() {
    const state = get();
    const next = state.future[state.future.length - 1];
    if (!next) return;
    const currentLang = state.document.uiLang;
    set((draft) => {
      draft.future.pop();
      draft.past.push(cloneDocument(state.document));
      const restored = cloneDocument(next);
      restored.uiLang = currentLang;
      draft.document = restored;
      draft.saveState = 'dirty';
    });
  },

  resetCurrent() {
    // Clear *content*, not "reset to example data". The selected document
    // alone is erased; preserve the other document, language and editor setup.
    if (get().document.activeDocument === 'instruction') {
      const emptyInstruction = createDefaultDocument().instruction;
      emptyInstruction.pointCount = '';
      emptyInstruction.points = [blankInstructionPoint()];
      get().mutate((draft) => {
        draft.instruction = emptyInstruction;
      });
    } else {
      const emptySop = createEmptySopDocument();
      get().mutate((draft) => {
        const keepInstruction = draft.instruction;
        const keepEditor = draft.editor;
        const keepUiLang = draft.uiLang;
        const keepLabels = draft.labels;
        Object.assign(draft, emptySop);
        draft.instruction = keepInstruction;
        draft.activeDocument = 'sop';
        draft.editor = keepEditor;
        draft.uiLang = keepUiLang;
        draft.labels = keepLabels;
      });
    }
    set((state) => { state.selectedSection = null; });
  },
})));
