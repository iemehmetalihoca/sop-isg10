'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type DragEvent as ReactDragEvent } from 'react';
import { ClipboardPaste, Copy, ImagePlus, MoreHorizontal, Plus, Scissors, Trash2 } from 'lucide-react';
import { PhotoActionMenu } from '@/components/fields/PhotoActionMenu';
import { InlineText } from '@/components/fields/InlineField';
import { useEditorStore } from '@/store/editor-store';
import { imageFileToDataUrl } from '@/lib/files';
import { cryptoId } from '@/lib/defaults';
import { tr } from '@/lib/labels';
import type { InstructionLockEquipmentPhoto, InstructionPoint } from '@/lib/types';

// Dimensions are local to the Kilitleme Ekipmanı column (NOT the full-width photo gallery).
// Percent-based horizontal positioning keeps the editor usable at different A4 zoom levels.
const SPACE_MM = 36;
const DEFAULT_W = 16;
const DEFAULT_H = 13;
const GAP = 1;
const MIN_W = 6;
const MIN_H = 6;
const MAX_H = 95;
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
type Handle = typeof HANDLES[number];
type Frame = { x: number; y: number; w: number; h: number };
type Crop = { left: number; top: number; right: number; bottom: number };
type Session = { pointerId: number; kind: 'move' | 'resize' | 'crop'; handle?: Handle; startX: number; startY: number; initial: Frame; crop?: Crop; pxPerMm: number; mediaWidth?: number; mediaHeight?: number };
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
const half = (n: number) => Math.round(n * 2) / 2;

export function equipmentFrame(photo: InstructionLockEquipmentPhoto, index: number): Frame {
  const w = clamp(Number(photo.widthMm) || DEFAULT_W, MIN_W, SPACE_MM);
  const h = clamp(Number(photo.heightMm) || DEFAULT_H, MIN_H, MAX_H);
  return {
    x: clamp(photo.xMm == null ? (index % 2) * (DEFAULT_W + GAP) : Number(photo.xMm), 0, SPACE_MM - w),
    y: Math.max(0, photo.yMm == null ? Math.floor(index / 2) * (DEFAULT_H + GAP) : Number(photo.yMm)),
    w, h,
  };
}

function overlaps(a: Frame, b: Frame) {
  return !(a.x + a.w + GAP <= b.x || b.x + b.w + GAP <= a.x || a.y + a.h + GAP <= b.y || b.y + b.h + GAP <= a.y);
}

function findSlot(existing: Frame[], w = DEFAULT_W, h = DEFAULT_H, preferred?: Frame): Frame {
  const candidates: Frame[] = [];
  if (preferred) candidates.push(preferred);
  // Prefer side-by-side, then new lines, rather than stacking tiny thumbnails.
  for (let y = 0; y <= Math.max(18, ...existing.map((item) => item.y + item.h + 5)); y += 1) {
    for (let x = 0; x <= SPACE_MM - w; x += 1) candidates.push({ x, y, w, h });
  }
  return candidates.find((candidate) => !existing.some((frame) => overlaps(candidate, frame))) ?? {
    x: 0, y: Math.max(0, ...existing.map((frame) => frame.y + frame.h + GAP)), w, h,
  };
}

function cropImageRect(photo: InstructionLockEquipmentPhoto, frame: Frame): Crop {
  const ratio = (photo.naturalWidth || 4) / Math.max(1, photo.naturalHeight || 3);
  const frameRatio = frame.w / frame.h;
  if (ratio > frameRatio) {
    const height = 100 * frameRatio / ratio;
    return { left: 0, right: 100, top: (100 - height) / 2, bottom: (100 + height) / 2 };
  }
  const width = 100 * ratio / frameRatio;
  return { top: 0, bottom: 100, left: (100 - width) / 2, right: (100 + width) / 2 };
}

async function croppedPhoto(src: string, region: Crop, imageRect: Crop) {
  const image = new Image();
  image.src = src;
  await image.decode();
  const iw = image.naturalWidth || 1;
  const ih = image.naturalHeight || 1;
  const left = clamp((region.left - imageRect.left) / (imageRect.right - imageRect.left), 0, 1);
  const top = clamp((region.top - imageRect.top) / (imageRect.bottom - imageRect.top), 0, 1);
  const right = clamp((region.right - imageRect.left) / (imageRect.right - imageRect.left), 0, 1);
  const bottom = clamp((region.bottom - imageRect.top) / (imageRect.bottom - imageRect.top), 0, 1);
  const sx = Math.floor(iw * left), sy = Math.floor(ih * top);
  const sw = Math.max(1, Math.min(iw - sx, Math.ceil(iw * (right - left))));
  const sh = Math.max(1, Math.min(ih - sy, Math.ceil(ih * (bottom - top))));
  const canvas = document.createElement('canvas');
  canvas.width = sw; canvas.height = sh;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Kırpma alanı oluşturulamadı.');
  context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  return { src: canvas.toDataURL('image/png'), naturalWidth: sw, naturalHeight: sh };
}

export function InstructionEquipmentWorkspace({ point, rowIndex }: { point: InstructionPoint; rowIndex: number }) {
  const mode = useEditorStore((s) => s.mode);
  const lang = useEditorStore((s) => s.document.uiLang);
  const mutate = useEditorStore((s) => s.mutate);
  const editable = mode === 'edit';
  const photos = point.lockEquipmentPhotos ?? [];
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<Session | null>(null);
  const draftRef = useRef<Record<string, Frame>>({});
  const [live, setLive] = useState<Record<string, Frame>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [cropId, setCropId] = useState<string | null>(null);
  const [cropDraft, setCropDraft] = useState<Crop>({ left: 0, top: 0, right: 100, bottom: 100 });
  const [working, setWorking] = useState(false);
  const [dropTarget, setDropTarget] = useState(false);
  const [clipboard, setClipboard] = useState<InstructionLockEquipmentPhoto | null>(null);
  const updatePoint = (update: (target: InstructionPoint) => void, recordHistory = true) => mutate((doc) => {
    const target = doc.instruction.points.find((candidate) => candidate.id === point.id);
    if (target) update(target);
  }, recordHistory);

  const frames = photos.map((photo, i) => ({ photo, frame: live[photo.id] ?? equipmentFrame(photo, i) }));
  const heightMm = photos.length ? Math.max(13, ...frames.map(({ frame }) => frame.y + frame.h + 1.5)) : 0;
  const current = photos.find((photo) => photo.id === selected) ?? null;
  const cropFrame = current ? frames.find(({ photo }) => photo.id === current.id)?.frame : undefined;
  const imageRect = current && cropFrame ? cropImageRect(current, cropFrame) : { left: 0, top: 0, right: 100, bottom: 100 };

  useEffect(() => {
    if (!editable) { setMenuId(null); setCropId(null); setSelected(null); }
  }, [editable]);
  useEffect(() => {
    if (!selected) return;
    const dismiss = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && (workspaceRef.current?.parentElement?.contains(target) || (target instanceof Element && target.closest('[data-photo-action-menu-portal]')))) return;
      setSelected(null); setMenuId(null); setCropId(null);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [selected]);
  useEffect(() => {
    if (selected && !photos.some((photo) => photo.id === selected)) { setSelected(null); setMenuId(null); setCropId(null); }
  }, [photos, selected]);

  const saveFrame = (id: string, frame: Frame) => updatePoint((p) => {
    const target = p.lockEquipmentPhotos.find((photo) => photo.id === id);
    if (target) { target.xMm = half(frame.x); target.yMm = half(frame.y); target.widthMm = half(frame.w); target.heightMm = half(frame.h); }
  });
  const setFrame = (id: string, next: Frame) => {
    draftRef.current[id] = next;
    setLive((previous) => ({ ...previous, [id]: next }));
  };
  const beginPointer = (event: ReactPointerEvent<HTMLElement>, id: string, kind: 'move' | 'resize', handle?: Handle) => {
    if (!editable || cropId || working || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (kind === 'move' && target.closest('button,input')) return;
    event.preventDefault(); event.stopPropagation();
    setSelected(id); setMenuId(null);
    const frame = frames.find(({ photo }) => photo.id === id)?.frame;
    if (!frame || !workspaceRef.current) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    sessionRef.current = { pointerId: event.pointerId, kind, handle, startX: event.clientX, startY: event.clientY,
      initial: { ...frame }, pxPerMm: rect.width / SPACE_MM };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLElement>, id: string) => {
    const session = sessionRef.current;
    if (!session || session.pointerId !== event.pointerId || session.kind === 'crop') return;
    event.preventDefault(); event.stopPropagation();
    const dx = (event.clientX - session.startX) / Math.max(.1, session.pxPerMm);
    const dy = (event.clientY - session.startY) / Math.max(.1, session.pxPerMm);
    const start = session.initial;
    let { x, y, w, h } = start;
    if (session.kind === 'move') { x += dx; y += dy; }
    else {
      const handle = session.handle || 'se';
      if (handle.includes('e')) w += dx;
      if (handle.includes('w')) { w -= dx; x += dx; }
      if (handle.includes('s')) h += dy;
      if (handle.includes('n')) { h -= dy; y += dy; }
      // Corner handles keep the current aspect ratio; edge handles change just one dimension.
      if (handle.length === 2) {
        const scale = Math.abs(w / start.w - 1) >= Math.abs(h / start.h - 1) ? w / start.w : h / start.h;
        const boundedScale = clamp(scale, Math.max(MIN_W / start.w, MIN_H / start.h), Math.min(SPACE_MM / start.w, MAX_H / start.h));
        w = start.w * boundedScale; h = start.h * boundedScale;
        x = handle.includes('w') ? start.x + start.w - w : start.x;
        y = handle.includes('n') ? start.y + start.h - h : start.y;
      }
    }
    w = clamp(w, MIN_W, SPACE_MM); h = clamp(h, MIN_H, MAX_H);
    x = clamp(x, 0, SPACE_MM - w); y = Math.max(0, y);
    const candidate = { x: half(x), y: half(y), w: half(w), h: half(h) };
    const otherFrames = frames.filter(({ photo }) => photo.id !== id).map(({ frame }) => frame);
    if (otherFrames.some((frame) => overlaps(candidate, frame))) {
      // When moving, step below an occupied region rather than trapping the dragged photo.
      if (session.kind !== 'move') return;
      const below = { ...candidate, y: Math.max(...otherFrames.map((frame) => frame.y + frame.h + GAP), candidate.y) };
      if (otherFrames.some((frame) => overlaps(below, frame))) return;
      setFrame(id, below);
      return;
    }
    setFrame(id, candidate);
  };
  const pointerEnd = (event: ReactPointerEvent<HTMLElement>, id: string) => {
    const session = sessionRef.current;
    if (!session || session.pointerId !== event.pointerId || session.kind === 'crop') return;
    event.preventDefault(); event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    sessionRef.current = null;
    const next = draftRef.current[id];
    if (next) saveFrame(id, next);
    setLive((previous) => { const copy = { ...previous }; delete copy[id]; return copy; });
    delete draftRef.current[id];
  };

  const loadFiles = async (files: File[]) => {
    if (!files.length || working) return;
    setWorking(true);
    try {
      const additions: InstructionLockEquipmentPhoto[] = [];
      const occupied = frames.map(({ frame }) => frame);
      for (const file of files) {
        const src = await imageFileToDataUrl(file, lang, 800, 0.86);
        const image = new Image(); image.src = src;
        await image.decode().catch(() => undefined);
        const aspect = (image.naturalWidth || 4) / Math.max(1, image.naturalHeight || 3);
        const w = aspect < .65 ? 12 : 16;
        const h = clamp(w / Math.max(.2, aspect), 9, 19);
        const position = findSlot(occupied, w, h);
        occupied.push(position);
        additions.push({ id: cryptoId('ilep'), src, originalSrc: src,
          naturalWidth: image.naturalWidth || 4, naturalHeight: image.naturalHeight || 3,
          xMm: position.x, yMm: position.y, widthMm: position.w, heightMm: position.h });
      }
      updatePoint((p) => { p.lockEquipmentPhotos.push(...additions); });
      setSelected(additions.at(-1)?.id ?? null);
    } catch (error) { window.alert(error instanceof Error ? error.message : tr('Görsel yüklenemedi.', lang)); }
    finally { setWorking(false); }
  };
  const replaceSelected = async (file?: File) => {
    if (!file || !selected) return;
    setWorking(true);
    try {
      const src = await imageFileToDataUrl(file, lang, 800, .86);
      const image = new Image(); image.src = src; await image.decode().catch(() => undefined);
      updatePoint((p) => { const photo = p.lockEquipmentPhotos.find((i) => i.id === selected); if (photo) {
        photo.src = src; photo.originalSrc = src;
        photo.naturalWidth = image.naturalWidth || 4; photo.naturalHeight = image.naturalHeight || 3;
      }});
    } catch (error) { window.alert(error instanceof Error ? error.message : tr('Görsel yüklenemedi.', lang)); }
    finally { setWorking(false); }
  };
  const startCrop = () => {
    if (!current || !cropFrame) return;
    setCropDraft(cropImageRect(current, cropFrame)); setCropId(current.id); setMenuId(null);
  };
  const cropPointerDown = (handle: Handle, event: ReactPointerEvent<HTMLButtonElement>, frame: Frame) => {
    event.preventDefault(); event.stopPropagation();
    const rect = event.currentTarget.closest('.instruction-equipment-media')?.getBoundingClientRect();
    sessionRef.current = { kind: 'crop', pointerId: event.pointerId, handle, startX: event.clientX, startY: event.clientY,
      initial: frame, crop: { ...cropDraft }, pxPerMm: 1, mediaWidth: rect?.width || 1, mediaHeight: rect?.height || 1 };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const cropPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = sessionRef.current;
    if (!session || session.kind !== 'crop' || session.pointerId !== event.pointerId || !session.crop || !session.handle) return;
    event.preventDefault(); event.stopPropagation();
    const dx = (event.clientX - session.startX) / (session.mediaWidth || 1) * 100;
    const dy = (event.clientY - session.startY) / (session.mediaHeight || 1) * 100;
    const next = { ...session.crop };
    if (session.handle.includes('w')) next.left = clamp(session.crop.left + dx, imageRect.left, next.right - 3);
    if (session.handle.includes('e')) next.right = clamp(session.crop.right + dx, next.left + 3, imageRect.right);
    if (session.handle.includes('n')) next.top = clamp(session.crop.top + dy, imageRect.top, next.bottom - 3);
    if (session.handle.includes('s')) next.bottom = clamp(session.crop.bottom + dy, next.top + 3, imageRect.bottom);
    setCropDraft(next);
  };
  const cropPointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (sessionRef.current?.kind !== 'crop' || sessionRef.current.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    sessionRef.current = null;
  };
  const applyCrop = async () => {
    if (!current || !cropFrame || working) return;
    setWorking(true);
    try {
      const result = await croppedPhoto(current.src, cropDraft, imageRect);
      updatePoint((p) => { const item = p.lockEquipmentPhotos.find((i) => i.id === current.id); if (item) {
        item.originalSrc ||= item.src; item.src = result.src;
        item.naturalWidth = result.naturalWidth; item.naturalHeight = result.naturalHeight;
      }});
      setCropId(null);
    } catch (error) { window.alert(error instanceof Error ? error.message : tr('Fotoğraf kırpılamadı.', lang)); }
    finally { setWorking(false); }
  };
  const restoreCrop = () => {
    if (!current?.originalSrc) return;
    const original = current.originalSrc;
    const photoId = current.id;
    const image = new Image(); image.src = original;
    void image.decode().catch(() => undefined).then(() => updatePoint((p) => {
      const item = p.lockEquipmentPhotos.find((i) => i.id === photoId);
      if (item) { item.src = original; item.naturalWidth = image.naturalWidth || item.naturalWidth; item.naturalHeight = image.naturalHeight || item.naturalHeight; }
    }));
    setCropId(null);
  };
  const paste = () => {
    if (!clipboard) return;
    const position = findSlot(frames.map(({ frame }) => frame), clipboard.widthMm || DEFAULT_W, clipboard.heightMm || DEFAULT_H);
    const newPhoto = { ...structuredClone(clipboard), id: cryptoId('ilep'), xMm: position.x, yMm: position.y,
      widthMm: position.w, heightMm: position.h };
    updatePoint((p) => p.lockEquipmentPhotos.push(newPhoto));
    setSelected(newPhoto.id); setMenuId(null);
  };
  return <div className={`instruction-lock-equipment-cell instruction-equipment-editor${dropTarget ? ' is-drop-target' : ''}`}
    onDragEnter={(event: ReactDragEvent) => { if (editable && Array.from(event.dataTransfer.types).includes('Files')) { event.preventDefault(); setDropTarget(true); } }}
    onDragOver={(event: ReactDragEvent) => { if (editable && Array.from(event.dataTransfer.types).includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDropTarget(true); } }}
    onDragLeave={(event: ReactDragEvent) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(false); }}
    onDrop={(event: ReactDragEvent) => { if (!editable) return; const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
      if (!files.length) return; event.preventDefault(); event.stopPropagation(); setDropTarget(false); void loadFiles(files); }}>
    {photos.length ? <div className="instruction-equipment-workspace" ref={workspaceRef} style={{ height: `${heightMm}mm` }}
      aria-label={tr('Kilitleme Ekipmanı', lang)}>
      {frames.map(({ photo, frame }, i) => {
        const active = selected === photo.id && editable;
        const cropping = cropId === photo.id;
        return <div key={photo.id} className={`instruction-equipment-photo${active ? ' is-selected' : ''}${cropping ? ' is-cropping' : ''}`}
          style={{ left: `${frame.x / SPACE_MM * 100}%`, top: `${frame.y}mm`, width: `${frame.w / SPACE_MM * 100}%`, height: `${frame.h}mm`, zIndex: active ? 10 : 1 }}>
          <div className="instruction-equipment-media" tabIndex={editable ? 0 : -1}
            title={editable ? tr('Sürükle: taşı · Kenar/köşe: boyutlandır', lang) : undefined}
            onPointerDown={(event) => beginPointer(event, photo.id, 'move')}
            onPointerMove={(event) => pointerMove(event, photo.id)}
            onPointerUp={(event) => pointerEnd(event, photo.id)}
            onPointerCancel={(event) => pointerEnd(event, photo.id)}
            onKeyDown={(event) => {
              if (!editable || cropId || !active || !event.key.startsWith('Arrow')) return;
              event.preventDefault();
              const dist = event.shiftKey ? 2 : .5;
              const next = { ...frame, x: clamp(frame.x + (event.key === 'ArrowRight' ? dist : event.key === 'ArrowLeft' ? -dist : 0), 0, SPACE_MM - frame.w),
                y: Math.max(0, frame.y + (event.key === 'ArrowDown' ? dist : event.key === 'ArrowUp' ? -dist : 0)) };
              if (!frames.some(({ photo: other, frame: otherFrame }) => other.id !== photo.id && overlaps(next, otherFrame))) saveFrame(photo.id, next);
            }}>
            <img src={photo.src} draggable={false} alt={`${tr('Kilitleme Ekipmanı', lang)} ${rowIndex + 1}.${i + 1}`}
              style={{ objectFit: cropping ? 'contain' : 'fill' }}
              onLoad={(event) => {
                const image = event.currentTarget;
                if (!image.naturalWidth || !image.naturalHeight) return;
                if (photo.naturalWidth === image.naturalWidth && photo.naturalHeight === image.naturalHeight) return;
                updatePoint((target) => {
                  const item = target.lockEquipmentPhotos.find((candidate) => candidate.id === photo.id);
                  if (item) { item.naturalWidth = image.naturalWidth; item.naturalHeight = image.naturalHeight; }
                }, false);
              }} />
            {cropping && <div className="photo-inline-crop-selection no-print" style={{ left: `${cropDraft.left}%`, top: `${cropDraft.top}%`,
              width: `${cropDraft.right - cropDraft.left}%`, height: `${cropDraft.bottom - cropDraft.top}%` }} onPointerDown={(event) => event.stopPropagation()}>
              <span className="photo-inline-crop-grid" />
              {HANDLES.map((handle) => <button key={handle} type="button" className={`photo-inline-crop-handle crop-${handle}`}
                title={`${tr('Kırp', lang)} ${handle}`} aria-label={`${tr('Kırp', lang)} ${handle}`}
                onPointerDown={(event) => cropPointerDown(handle, event, frame)}
                onPointerMove={cropPointerMove} onPointerUp={cropPointerEnd} onPointerCancel={cropPointerEnd} />)}
            </div>}
            {active && !cropping && HANDLES.map((handle) => <button key={handle} type="button"
              className={`photo-resize-handle photo-resize-${handle} no-print`} aria-label={`${tr('Fotoğraf', lang)} ${i + 1} · ${tr('yeniden boyutlandır', lang)}`}
              onPointerDown={(event) => beginPointer(event, photo.id, 'resize', handle)}
              onPointerMove={(event) => pointerMove(event, photo.id)}
              onPointerUp={(event) => pointerEnd(event, photo.id)}
              onPointerCancel={(event) => pointerEnd(event, photo.id)} />)}
          </div>
          {active && !cropping && <>
            <button type="button" ref={triggerRef} className="photo-menu-trigger no-print" aria-label={tr('Fotoğraf işlemleri', lang)}
              aria-expanded={menuId === photo.id} onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => { event.stopPropagation(); setMenuId((v) => v === photo.id ? null : photo.id); }}><MoreHorizontal size={14} /></button>
            {menuId === photo.id && <PhotoActionMenu triggerRef={triggerRef} onDismiss={() => setMenuId(null)}>
              <button type="button" role="menuitem" onClick={() => { replaceRef.current?.click(); setMenuId(null); }}><ImagePlus size={14} />{tr('Değiştir', lang)}</button>
              <button type="button" role="menuitem" onClick={startCrop}><Scissors size={14} />{tr('Kırp', lang)}</button>
              <button type="button" role="menuitem" onClick={() => { setClipboard(structuredClone(photo)); setMenuId(null); }}><Copy size={14} />{tr('Kopyala', lang)}</button>
              <button type="button" role="menuitem" disabled={!clipboard} onClick={paste}><ClipboardPaste size={14} />{tr('Yapıştır', lang)}</button>
              <div className="photo-action-menu-separator" />
              <button type="button" role="menuitem" className="danger" onClick={() => { updatePoint((p) => { p.lockEquipmentPhotos = p.lockEquipmentPhotos.filter((item) => item.id !== photo.id); });
                setSelected(null); setMenuId(null); }}><Trash2 size={14} />{tr('Sil', lang)}</button>
            </PhotoActionMenu>}
          </>}
          {active && cropping && <div className="instruction-equipment-crop-actions no-print" onPointerDown={(event) => event.stopPropagation()}>
            <button type="button" disabled={!photo.originalSrc || working} onClick={restoreCrop}>{tr('Orijinal', lang)}</button>
            <button type="button" disabled={working} onClick={() => setCropId(null)}>{tr('İptal', lang)}</button>
            <button type="button" disabled={working} onClick={() => { void applyCrop(); }}>{tr('Uygula', lang)}</button>
          </div>}
        </div>;
      })}
    </div> : editable ? <button type="button" className="instruction-lock-equipment-empty no-print" onClick={() => fileRef.current?.click()} disabled={working}>
      <ImagePlus size={18}/><small>{tr('Fotoğraf ekle', lang)}</small></button> : null}
    {editable && <>
      {photos.length > 0 && <button type="button" className="instruction-equipment-add-corner no-print" onClick={() => fileRef.current?.click()}
        disabled={working} title={tr('Fotoğraf ekle', lang)} aria-label={tr('Fotoğraf ekle', lang)}><Plus size={14}/></button>}
      <input hidden type="file" className="no-print" ref={fileRef} multiple accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ''; void loadFiles(files); }}/>
      <input hidden type="file" className="no-print" ref={replaceRef} accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void replaceSelected(file); }}/>
      <InlineText multiline className="instruction-lock-equipment-legacy" value={point.lockEquipment || ''}
        ariaLabel={tr('Kilitleme Ekipmanı', lang)} onChange={(value) => updatePoint((p) => { p.lockEquipment = value; })}/>
    </>}
    {!editable && point.lockEquipment && <div className="instruction-lock-equipment-legacy">{point.lockEquipment}</div>}
  </div>;
}
