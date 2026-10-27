'use client';

import { Fragment, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { ClipboardPaste, Copy, GripVertical, ImagePlus, MoreHorizontal, Plus, Scissors, Trash2, X } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { InlineText } from '@/components/fields/InlineField';
import { InstructionEquipmentWorkspace } from './InstructionEquipmentWorkspace';
import { PhotoActionMenu } from '@/components/fields/PhotoActionMenu';
import { LotoMetaHeader } from '@/components/editor/LotoMetaHeader';
import { useEditorStore } from '@/store/editor-store';
import { cryptoId, blankInstructionPoint, INSTRUCTION_LOCKING_STEPS, INSTRUCTION_REMOVAL_STEPS } from '@/lib/defaults';
import { tr } from '@/lib/labels';
import { imageFileToDataUrl } from '@/lib/files';
import { PPE_ICON_CHOICES, WARNING_ICON_CHOICES, getInstructionIconLabel, getInstructionIconSource } from '@/lib/default-icons';
import { ENERGY_SOURCE_TAG_CHOICES, compositeEnergySourceTagDataUrl, formatEnergySource, getEnergySourceTag, parseEnergySource, type EnergySourceTagCode } from '@/lib/energy-source-tags';
import type { InstructionPhoto, InstructionPoint, Lang } from '@/lib/types';

export function InstructionMetaSection() {
  return <LotoMetaHeader scope="instruction" />;
}

function InstructionIconCell({ kind }: { kind: 'ppe' | 'warning' }) {
  const document = useEditorStore((s) => s.document);
  const mutate = useEditorStore((s) => s.mutate);
  const [pickerOpen, setPickerOpen] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const keys = kind === 'ppe' ? document.instruction.ppeIcons : document.instruction.hazardIcons;
  const choices = kind === 'ppe' ? PPE_ICON_CHOICES : WARNING_ICON_CHOICES;

  useEffect(() => {
    if (!pickerOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && cellRef.current && !cellRef.current.contains(target)) setPickerOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setPickerOpen(false);
    };

    window.document.addEventListener('pointerdown', closeOnOutsidePointer);
    window.document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.document.removeEventListener('pointerdown', closeOnOutsidePointer);
      window.document.removeEventListener('keydown', closeOnEscape);
    };
  }, [pickerOpen]);

  const toggle = (key: string) => mutate((d) => {
    const list = kind === 'ppe' ? d.instruction.ppeIcons : d.instruction.hazardIcons;
    const index = list.indexOf(key);
    if (index >= 0) list.splice(index, 1);
    else list.push(key);
  });

  const remove = (key: string) => mutate((d) => {
    const list = kind === 'ppe' ? d.instruction.ppeIcons : d.instruction.hazardIcons;
    const index = list.indexOf(key);
    if (index >= 0) list.splice(index, 1);
  });

  return (
    <div className="instruction-icon-cell" ref={cellRef}>
      <div className="instruction-icon-strip">
        {keys.map((key) => {
          const iconSrc = getInstructionIconSource(kind, key);
          if (!iconSrc) return null;
          return <span key={key} className="instruction-icon-item" title={getInstructionIconLabel(kind, key)}>
            <img src={iconSrc} alt={getInstructionIconLabel(kind, key)} />
            <button type="button" className="instruction-icon-remove no-print" title="Kaldır" onClick={() => remove(key)}><X size={11} /></button>
          </span>;
        })}
        <button
          type="button"
          className={`instruction-icon-add no-print ${pickerOpen ? 'open' : ''}`}
          title={pickerOpen ? 'Simge seçiciyi kapat' : 'Simge ekle'}
          aria-label={pickerOpen ? 'Simge seçiciyi kapat' : 'Simge ekle'}
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((value) => !value)}
        >{pickerOpen ? <X size={15} /> : <Plus size={15} />}</button>
      </div>
      {pickerOpen ? <div className="instruction-icon-picker no-print" role="dialog" aria-label={kind === 'ppe' ? 'KKD simgesi seç' : 'Tehlike simgesi seç'}>
        {choices.map((choice) => <button key={choice.key} type="button" className={keys.includes(choice.key) ? 'selected' : ''} title={choice.label} onClick={() => toggle(choice.key)}>
          <img src={choice.src} alt={choice.label} />
        </button>)}
      </div> : null}
    </div>
  );
}

export function InstructionSummarySection() {
  const lang = useEditorStore((s) => s.document.uiLang);
  return (
    <table className="instruction-summary"><thead><tr><th>{tr('KULLANILMASI GEREKEN KKD', lang)}</th><th>{tr('TEHLİKELER', lang)}</th></tr></thead><tbody><tr>
      <td><InstructionIconCell kind="ppe" /></td>
      <td><InstructionIconCell kind="warning" /></td>
    </tr></tbody></table>
  );
}

export function InstructionLockingSection() {
  const count = useEditorStore((s) => s.document.instruction.pointCount);
  const lang = useEditorStore((s) => s.document.uiLang);
  const mutate = useEditorStore((s) => s.mutate);
  return (
    <div className="locking-summary"><div className="locking-point-info"><div className="locking-point-caption">{tr('Kilitleme Noktası', lang)}</div><InlineText className="locking-count-input" value={count} onChange={(v) => mutate((d) => { d.instruction.pointCount = v; })} /></div><div className="locking-steps-box"><div className="locking-steps-title">{tr('Kilitleme Adımları', lang)}</div><div className="locking-steps-text">{tr(INSTRUCTION_LOCKING_STEPS, lang)}</div></div></div>
  );
}

type PhotoResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

type PhotoGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  totalHeight: number;
};

type PhotoCollisionEdges = {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
};

const EMPTY_COLLISION_EDGES: PhotoCollisionEdges = { top: false, right: false, bottom: false, left: false };

type PhotoCropRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type PhotoCropHandle = PhotoResizeHandle;

const PHOTO_WORKSPACE_WIDTH_MM = 194;
const PHOTO_WORKSPACE_MIN_HEIGHT_MM = 30;
const PHOTO_WORKSPACE_MAX_HEIGHT_MM = 180;
const PHOTO_WORKSPACE_PADDING_MM = 2;
const PHOTO_CAPTION_HEIGHT_MM = 0;
const PHOTO_GAP_MM = 0.5;
const PHOTO_MIN_WIDTH_MM = 10;
const PHOTO_MIN_HEIGHT_MM = 8;
const PHOTO_MAX_WIDTH_MM = 175;
const PHOTO_MAX_HEIGHT_MM = 70;
const PHOTO_SNAP_MM = 1.5;

const roundHalfMm = (value: number) => Math.round(value * 2) / 2;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const clampPhotoWidth = (value: number) => roundHalfMm(clamp(value, PHOTO_MIN_WIDTH_MM, PHOTO_MAX_WIDTH_MM));
const clampPhotoHeight = (value: number) => roundHalfMm(clamp(value, PHOTO_MIN_HEIGHT_MM, PHOTO_MAX_HEIGHT_MM));

function fitPhotoAspect(heightMm: number, aspect: number) {
  const safeAspect = Math.max(0.08, aspect);
  let height = clampPhotoHeight(heightMm);
  let width = height * safeAspect;

  // Normal fotoğraf çerçevesi her zaman görselin gerçek en-boy oranını korur.
  // Böylece object-fit: contain nedeniyle çerçevenin içinde beyaz/şeffaf letterbox alanı oluşmaz.
  if (width > PHOTO_MAX_WIDTH_MM) {
    width = PHOTO_MAX_WIDTH_MM;
    height = width / safeAspect;
  }
  if (height > PHOTO_MAX_HEIGHT_MM) {
    height = PHOTO_MAX_HEIGHT_MM;
    width = height * safeAspect;
  }
  if (width < PHOTO_MIN_WIDTH_MM) {
    width = PHOTO_MIN_WIDTH_MM;
    height = width / safeAspect;
  }
  if (height < PHOTO_MIN_HEIGHT_MM) {
    height = PHOTO_MIN_HEIGHT_MM;
    width = height * safeAspect;
  }

  // Aşırı yatay/dikey görsellerde de çalışma alanı sınırını oranı bozmadan koru.
  if (width > PHOTO_WORKSPACE_WIDTH_MM) {
    width = PHOTO_WORKSPACE_WIDTH_MM;
    height = width / safeAspect;
  }

  return { width: roundHalfMm(width), height: roundHalfMm(height) };
}

function photoDimensions(photo: InstructionPhoto, fallbackHeightMm: number) {
  const aspect = Math.max(0.08, (Number(photo.width) || 4) / Math.max(1, Number(photo.height) || 3));
  const requestedHeight = photo.displayHeightMm ?? photo.sizeMm ?? fallbackHeightMm;

  // V4.2.6: Kullanıcı kenar tutamacıyla X/Y eksenini bağımsız değiştirmişse
  // kaydedilmiş frame ölçülerini aynen koru. Sadece eski kayıtlarda genişlik yoksa
  // doğal fotoğraf oranından güvenli bir başlangıç genişliği üret.
  const height = clampPhotoHeight(requestedHeight);
  const width = photo.displayWidthMm != null
    ? clampPhotoWidth(photo.displayWidthMm)
    : fitPhotoAspect(height, aspect).width;

  return { width, height, totalHeight: height + PHOTO_CAPTION_HEIGHT_MM };
}

function dynamicPhotoWorkspaceHeight(photos: InstructionPhoto[], fallbackHeightMm: number, draft?: PhotoGeometry) {
  let bottom = draft ? Math.max(0, draft.y) + draft.totalHeight : 0;
  for (const photo of photos) {
    const dims = photoDimensions(photo, fallbackHeightMm);
    bottom = Math.max(bottom, Math.max(0, Number(photo.yMm) || 0) + dims.totalHeight);
  }
  return roundHalfMm(clamp(
    Math.max(PHOTO_WORKSPACE_MIN_HEIGHT_MM, bottom > 0 ? bottom + PHOTO_WORKSPACE_PADDING_MM : PHOTO_WORKSPACE_MIN_HEIGHT_MM),
    PHOTO_WORKSPACE_MIN_HEIGHT_MM,
    PHOTO_WORKSPACE_MAX_HEIGHT_MM,
  ));
}

function findFreePhotoPositionExpandable(
  width: number,
  totalHeight: number,
  occupied: PhotoGeometry[],
  currentHeightMm: number,
  preferred?: { x: number; y: number },
) {
  const startHeight = roundHalfMm(clamp(Math.max(PHOTO_WORKSPACE_MIN_HEIGHT_MM, currentHeightMm), PHOTO_WORKSPACE_MIN_HEIGHT_MM, PHOTO_WORKSPACE_MAX_HEIGHT_MM));
  let height = startHeight;
  while (height <= PHOTO_WORKSPACE_MAX_HEIGHT_MM + 0.001) {
    const position = findFreePhotoPosition(width, totalHeight, occupied, height, preferred);
    if (position) return position;
    if (height >= PHOTO_WORKSPACE_MAX_HEIGHT_MM) break;
    height = Math.min(PHOTO_WORKSPACE_MAX_HEIGHT_MM, height + 5);
  }
  return null;
}

function rectanglesOverlap(a: PhotoGeometry, b: PhotoGeometry, gap = PHOTO_GAP_MM) {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.totalHeight + gap <= b.y ||
    b.y + b.totalHeight + gap <= a.y
  );
}

function collisionEdgesFor(candidate: PhotoGeometry, others: PhotoGeometry[]): PhotoCollisionEdges {
  const edges: PhotoCollisionEdges = { ...EMPTY_COLLISION_EDGES };
  const cornerToleranceMm = 1;

  for (const other of others) {
    if (!rectanglesOverlap(candidate, other)) continue;

    const candidateCenterX = candidate.x + candidate.width / 2;
    const candidateCenterY = candidate.y + candidate.totalHeight / 2;
    const otherCenterX = other.x + other.width / 2;
    const otherCenterY = other.y + other.totalHeight / 2;

    const horizontalSide: keyof Pick<PhotoCollisionEdges, 'left' | 'right'> = candidateCenterX <= otherCenterX ? 'right' : 'left';
    const verticalSide: keyof Pick<PhotoCollisionEdges, 'top' | 'bottom'> = candidateCenterY <= otherCenterY ? 'bottom' : 'top';

    const horizontalPenetration = horizontalSide === 'right'
      ? candidate.x + candidate.width + PHOTO_GAP_MM - other.x
      : other.x + other.width + PHOTO_GAP_MM - candidate.x;
    const verticalPenetration = verticalSide === 'bottom'
      ? candidate.y + candidate.totalHeight + PHOTO_GAP_MM - other.y
      : other.y + other.totalHeight + PHOTO_GAP_MM - candidate.y;

    // Dik bir kenardan temas varsa yalnız o kenarı boya. Köşe teması iki eksende
    // benzer miktarda gerçekleşirse ilgili iki kenarı birden kırmızı göster.
    if (horizontalPenetration + cornerToleranceMm < verticalPenetration) {
      edges[horizontalSide] = true;
    } else if (verticalPenetration + cornerToleranceMm < horizontalPenetration) {
      edges[verticalSide] = true;
    } else {
      edges[horizontalSide] = true;
      edges[verticalSide] = true;
    }
  }

  return edges;
}

function hasCollisionEdge(edges: PhotoCollisionEdges) {
  return edges.top || edges.right || edges.bottom || edges.left;
}

function clampGeometry(geometry: PhotoGeometry, workspaceHeightMm: number): PhotoGeometry {
  const width = clampPhotoWidth(Math.min(geometry.width, PHOTO_WORKSPACE_WIDTH_MM));
  // Fotoğraf alanı artık içeriğe göre büyüdüğü için fotoğrafı mevcut alan yüksekliğine
  // kilitlemiyoruz. Sadece azami dinamik çalışma alanını aşmasını engelliyoruz.
  const height = roundHalfMm(clamp(geometry.height, PHOTO_MIN_HEIGHT_MM, PHOTO_MAX_HEIGHT_MM));
  const totalHeight = height + PHOTO_CAPTION_HEIGHT_MM;
  const maxY = Math.max(0, PHOTO_WORKSPACE_MAX_HEIGHT_MM - totalHeight - PHOTO_WORKSPACE_PADDING_MM);
  return {
    x: roundHalfMm(clamp(geometry.x, 0, Math.max(0, PHOTO_WORKSPACE_WIDTH_MM - width))),
    y: roundHalfMm(clamp(geometry.y, 0, maxY)),
    width,
    height,
    totalHeight,
  };
}

function findFreePhotoPosition(
  width: number,
  totalHeight: number,
  occupied: PhotoGeometry[],
  workspaceHeightMm: number,
  preferred?: { x: number; y: number },
) {
  const maxX = Math.max(0, PHOTO_WORKSPACE_WIDTH_MM - width);
  const maxY = Math.max(0, workspaceHeightMm - totalHeight);
  const candidates: Array<{ x: number; y: number; score: number }> = [];
  for (let y = 0; y <= maxY + 0.001; y += 1) {
    for (let x = 0; x <= maxX + 0.001; x += 1) {
      const candidate: PhotoGeometry = { x, y, width, height: Math.max(PHOTO_MIN_HEIGHT_MM, totalHeight - PHOTO_CAPTION_HEIGHT_MM), totalHeight };
      if (occupied.some((item) => rectanglesOverlap(candidate, item))) continue;
      const score = preferred ? Math.hypot(x - preferred.x, y - preferred.y) : y * 1000 + x;
      candidates.push({ x: roundHalfMm(x), y: roundHalfMm(y), score });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.score - b.score);
  return { x: candidates[0].x, y: candidates[0].y };
}

function snapPhotoGeometry(candidate: PhotoGeometry, others: PhotoGeometry[], workspaceHeightMm: number) {
  let { x, y } = candidate;
  const maxX = Math.max(0, PHOTO_WORKSPACE_WIDTH_MM - candidate.width);
  const snap = (value: number, target: number) => Math.abs(value - target) <= PHOTO_SNAP_MM ? target : value;

  x = snap(x, 0);
  x = snap(x, maxX);
  y = snap(y, 0);

  for (const other of others) {
    x = snap(x, other.x);
    x = snap(x + candidate.width, other.x + other.width) - candidate.width;
    x = snap(x, other.x + other.width + PHOTO_GAP_MM);
    x = snap(x + candidate.width + PHOTO_GAP_MM, other.x) - candidate.width - PHOTO_GAP_MM;
    y = snap(y, other.y);
    y = snap(y + candidate.totalHeight, other.y + other.totalHeight) - candidate.totalHeight;
    y = snap(y, other.y + other.totalHeight + PHOTO_GAP_MM);
    y = snap(y + candidate.totalHeight + PHOTO_GAP_MM, other.y) - candidate.totalHeight - PHOTO_GAP_MM;
  }

  return clampGeometry({ ...candidate, x, y }, workspaceHeightMm);
}


function resolveMoveGeometry(candidate: PhotoGeometry, others: PhotoGeometry[], workspaceHeightMm: number) {
  const desired = snapPhotoGeometry(clampGeometry(candidate, workspaceHeightMm), others, workspaceHeightMm);
  if (!others.some((other) => rectanglesOverlap(desired, other))) return desired;

  const candidates: PhotoGeometry[] = [];
  const pushCandidate = (geometry: PhotoGeometry) => {
    const clamped = clampGeometry(geometry, workspaceHeightMm);
    if (!others.some((other) => rectanglesOverlap(clamped, other))) candidates.push(clamped);
  };

  for (const other of others) {
    // Engele çarpınca hareketi tamamen reddetmek yerine fotoğrafı en yakın
    // geçerli kenara kaydır. Böylece kullanıcı engelin çevresinde akıcı
    // şekilde dolaşabilir; final konumda çakışma yine mümkün değildir.
    pushCandidate({ ...desired, x: other.x - desired.width - PHOTO_GAP_MM });
    pushCandidate({ ...desired, x: other.x + other.width + PHOTO_GAP_MM });
    pushCandidate({ ...desired, y: other.y - desired.totalHeight - PHOTO_GAP_MM });
    pushCandidate({ ...desired, y: other.y + other.totalHeight + PHOTO_GAP_MM });

    pushCandidate({ ...desired, x: other.x - desired.width - PHOTO_GAP_MM, y: other.y - desired.totalHeight - PHOTO_GAP_MM });
    pushCandidate({ ...desired, x: other.x + other.width + PHOTO_GAP_MM, y: other.y - desired.totalHeight - PHOTO_GAP_MM });
    pushCandidate({ ...desired, x: other.x - desired.width - PHOTO_GAP_MM, y: other.y + other.totalHeight + PHOTO_GAP_MM });
    pushCandidate({ ...desired, x: other.x + other.width + PHOTO_GAP_MM, y: other.y + other.totalHeight + PHOTO_GAP_MM });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => Math.hypot(a.x - desired.x, a.y - desired.y) - Math.hypot(b.x - desired.x, b.y - desired.y));
  return candidates[0];
}


function containImageRectPercent(photo: InstructionPhoto, frameWidth: number, frameHeight: number): PhotoCropRect {
  const naturalAspect = Math.max(0.0001, (Number(photo.width) || 4) / Math.max(1, Number(photo.height) || 3));
  const frameAspect = Math.max(0.0001, frameWidth / Math.max(0.0001, frameHeight));
  if (naturalAspect >= frameAspect) {
    const visibleHeightPct = clamp((frameAspect / naturalAspect) * 100, 0, 100);
    const top = (100 - visibleHeightPct) / 2;
    return { left: 0, top, right: 100, bottom: top + visibleHeightPct };
  }
  const visibleWidthPct = clamp((naturalAspect / frameAspect) * 100, 0, 100);
  const left = (100 - visibleWidthPct) / 2;
  return { left, top: 0, right: left + visibleWidthPct, bottom: 100 };
}

function cropRectSize(rect: PhotoCropRect) {
  return { width: Math.max(0, rect.right - rect.left), height: Math.max(0, rect.bottom - rect.top) };
}

async function cropPhotoDataUrl(
  src: string,
  cropRect: PhotoCropRect,
  imageRect: PhotoCropRect,
  lang: Lang,
) {
  const image = new Image();
  image.src = src;
  await image.decode().catch(() => undefined);
  const naturalWidth = image.naturalWidth || 1;
  const naturalHeight = image.naturalHeight || 1;
  const imageWidthPct = Math.max(0.0001, imageRect.right - imageRect.left);
  const imageHeightPct = Math.max(0.0001, imageRect.bottom - imageRect.top);

  const x1 = clamp((cropRect.left - imageRect.left) / imageWidthPct, 0, 1);
  const y1 = clamp((cropRect.top - imageRect.top) / imageHeightPct, 0, 1);
  const x2 = clamp((cropRect.right - imageRect.left) / imageWidthPct, 0, 1);
  const y2 = clamp((cropRect.bottom - imageRect.top) / imageHeightPct, 0, 1);

  const sx = Math.max(0, Math.floor(x1 * naturalWidth));
  const sy = Math.max(0, Math.floor(y1 * naturalHeight));
  const sw = Math.max(1, Math.min(naturalWidth - sx, Math.ceil((x2 - x1) * naturalWidth)));
  const sh = Math.max(1, Math.min(naturalHeight - sy, Math.ceil((y2 - y1) * naturalHeight)));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const context = canvas.getContext('2d');
  if (!context) throw new Error(tr('Kırpma için canvas oluşturulamadı.', lang));
  context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  return { src: canvas.toDataURL('image/png'), width: sw, height: sh };
}

function InstructionPhotoTile({
  photo,
  index,
  fallbackHeightMm,
  workspaceHeightMm,
  allPhotos,
  selected,
  menuOpen,
  clipboardAvailable,
  onSelect,
  onMenuToggle,
  onMenuClose,
  onCopy,
  onPaste,
  onDelete,
}: {
  photo: InstructionPhoto;
  index: number;
  fallbackHeightMm: number;
  workspaceHeightMm: number;
  allPhotos: InstructionPhoto[];
  selected: boolean;
  menuOpen: boolean;
  clipboardAvailable: boolean;
  onSelect: () => void;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
}) {
  const lang = useEditorStore((s) => s.document.uiLang);
  const mutate = useEditorStore((s) => s.mutate);
  const mode = useEditorStore((s) => s.mode);
  const photoMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const [cropEditing, setCropEditing] = useState(false);
  const [cropDraft, setCropDraft] = useState<PhotoCropRect>({ left: 0, top: 0, right: 100, bottom: 100 });
  const [cropBusy, setCropBusy] = useState(false);
  const [interaction, setInteraction] = useState<'move' | 'resize' | null>(null);
  const [collisionEdges, setCollisionEdges] = useState<PhotoCollisionEdges>({ ...EMPTY_COLLISION_EDGES });
  const dims = photoDimensions(photo, fallbackHeightMm);
  const committed = clampGeometry({
    x: Number(photo.xMm) || 0,
    y: Number(photo.yMm) || 0,
    width: dims.width,
    height: dims.height,
    totalHeight: dims.totalHeight,
  }, workspaceHeightMm);
  const [draft, setDraft] = useState(committed);
  const draftRef = useRef(committed);
  const sessionRef = useRef<{
    kind: 'move' | 'resize';
    handle?: PhotoResizeHandle;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    start: PhotoGeometry;
    pxPerMm: number;
    aspect: number;
  } | null>(null);
  const cropSessionRef = useRef<{
    handle: PhotoCropHandle;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    start: PhotoCropRect;
    mediaWidthPx: number;
    mediaHeightPx: number;
  } | null>(null);

  useEffect(() => {
    if (interaction) return;
    draftRef.current = committed;
    setDraft(committed);
  }, [committed.x, committed.y, committed.width, committed.height, committed.totalHeight, interaction]);

  useEffect(() => {
    if (mode !== 'edit' || !selected) {
      setCropEditing(false);
      setCropBusy(false);
      cropSessionRef.current = null;
    }
  }, [mode, selected]);

  const otherRects = allPhotos.filter((item) => item.id !== photo.id).map((item) => {
    const otherDims = photoDimensions(item, fallbackHeightMm);
    return clampGeometry({
      x: Number(item.xMm) || 0,
      y: Number(item.yMm) || 0,
      width: otherDims.width,
      height: otherDims.height,
      totalHeight: otherDims.totalHeight,
    }, workspaceHeightMm);
  });

  const isValid = (candidate: PhotoGeometry) => !otherRects.some((other) => rectanglesOverlap(candidate, other));

  const syncLiveWorkspaceHeight = (candidate: PhotoGeometry) => {
    const workspace = mediaRef.current?.closest('.instruction-photo-workspace') as HTMLElement | null;
    if (!workspace) return;
    const otherBottom = otherRects.reduce((max, item) => Math.max(max, item.y + item.totalHeight), 0);
    const bottom = Math.max(otherBottom, candidate.y + candidate.totalHeight);
    const nextHeight = roundHalfMm(clamp(
      Math.max(PHOTO_WORKSPACE_MIN_HEIGHT_MM, bottom + PHOTO_WORKSPACE_PADDING_MM),
      PHOTO_WORKSPACE_MIN_HEIGHT_MM,
      PHOTO_WORKSPACE_MAX_HEIGHT_MM,
    ));
    workspace.style.height = `${nextHeight}mm`;
  };

  const setCandidate = (candidate: PhotoGeometry) => {
    const raw = clampGeometry(candidate, workspaceHeightMm);
    const rawCollisionEdges = collisionEdgesFor(raw, otherRects);
    const snapped = snapPhotoGeometry(raw, otherRects, workspaceHeightMm);
    const valid = isValid(snapped);
    // Resize sırasında yalnız gerçekten temas eden kenarı kırmızı göster.
    // Köşe teması varsa iki ilgili kenar birlikte kırmızı olabilir.
    setCollisionEdges(hasCollisionEdge(rawCollisionEdges) ? rawCollisionEdges : (valid ? { ...EMPTY_COLLISION_EDGES } : collisionEdgesFor(snapped, otherRects)));
    if (!valid) return;
    syncLiveWorkspaceHeight(snapped);
    draftRef.current = snapped;
    setDraft(snapped);
  };

  const setMoveCandidate = (candidate: PhotoGeometry) => {
    const raw = clampGeometry(candidate, workspaceHeightMm);
    const rawCollisionEdges = collisionEdgesFor(raw, otherRects);
    const resolved = resolveMoveGeometry(candidate, otherRects, workspaceHeightMm);
    // Yumuşak çarpışma final geometriyi geçerli alanda tutarken, kullanıcının
    // hangi kenarla engele temas ettiğini hareket boyunca canlı göster.
    setCollisionEdges(hasCollisionEdge(rawCollisionEdges) ? rawCollisionEdges : { ...EMPTY_COLLISION_EDGES });
    if (!resolved) return;
    syncLiveWorkspaceHeight(resolved);
    draftRef.current = resolved;
    setDraft(resolved);
  };

  const commitGeometry = () => {
    const next = draftRef.current;
    setInteraction(null);
    sessionRef.current = null;
    setCollisionEdges({ ...EMPTY_COLLISION_EDGES });
    if (next.x === committed.x && next.y === committed.y && next.width === committed.width && next.height === committed.height) return;
    mutate((document) => {
      const target = document.instruction.photos.find((item) => item.id === photo.id);
      if (!target) return;
      target.xMm = next.x;
      target.yMm = next.y;
      target.displayWidthMm = next.width;
      target.displayHeightMm = next.height;
      target.sizeMm = next.height;
      target.offsetXMm = 0;
      target.offsetYMm = 0;
      target.alignment = 'custom';
    });
  };

  const startMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (mode !== 'edit' || event.button !== 0 || cropEditing) return;
    const target = event.target as HTMLElement;
    if (target.closest('button,input,.photo-action-menu')) return;
    const workspace = event.currentTarget.closest('.instruction-photo-workspace') as HTMLElement | null;
    if (!workspace) return;
    event.preventDefault();
    onSelect();
    const rect = workspace.getBoundingClientRect();
    sessionRef.current = {
      kind: 'move', pointerId: event.pointerId, startClientX: event.clientX, startClientY: event.clientY,
      start: draftRef.current, pxPerMm: Math.max(0.01, rect.width / PHOTO_WORKSPACE_WIDTH_MM), aspect: draftRef.current.width / Math.max(1, draftRef.current.height),
    };
    setInteraction('move');
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const movePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = sessionRef.current;
    if (!session || session.kind !== 'move' || session.pointerId !== event.pointerId) return;
    const dx = (event.clientX - session.startClientX) / session.pxPerMm;
    const dy = (event.clientY - session.startClientY) / session.pxPerMm;
    setMoveCandidate({ ...session.start, x: session.start.x + dx, y: session.start.y + dy });
  };

  const endMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = sessionRef.current;
    if (!session || session.kind !== 'move' || session.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    commitGeometry();
  };

  const startResize = (handle: PhotoResizeHandle, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (mode !== 'edit' || cropEditing) return;
    const workspace = event.currentTarget.closest('.instruction-photo-workspace') as HTMLElement | null;
    if (!workspace) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    const rect = workspace.getBoundingClientRect();
    sessionRef.current = {
      kind: 'resize', handle, pointerId: event.pointerId, startClientX: event.clientX, startClientY: event.clientY,
      start: draftRef.current, pxPerMm: Math.max(0.01, rect.width / PHOTO_WORKSPACE_WIDTH_MM), aspect: draftRef.current.width / Math.max(1, draftRef.current.height),
    };
    setInteraction('resize');
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const resizePointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = sessionRef.current;
    if (!session || session.kind !== 'resize' || session.pointerId !== event.pointerId || !session.handle) return;
    event.preventDefault();
    const dx = (event.clientX - session.startClientX) / session.pxPerMm;
    const dy = (event.clientY - session.startClientY) / session.pxPerMm;
    const start = session.start;
    const handle = session.handle;
    let x = start.x;
    let y = start.y;
    let width = start.width;
    let height = start.height;

    // V4.2.6 resize modeli:
    // - Köşeler: mevcut frame oranını koruyarak genel büyüt/küçült.
    // - Sol/sağ kenar: yalnız genişliği değiştir; karşı kenar sabit kalır.
    // - Üst/alt kenar: yalnız yüksekliği değiştir; karşı kenar sabit kalır.
    if (handle === 'e') {
      width = clampPhotoWidth(start.width + dx);
    } else if (handle === 'w') {
      width = clampPhotoWidth(start.width - dx);
      x = start.x + (start.width - width);
    } else if (handle === 's') {
      height = clampPhotoHeight(start.height + dy);
    } else if (handle === 'n') {
      height = clampPhotoHeight(start.height - dy);
      y = start.y + (start.height - height);
    } else {
      const horizontal = handle.includes('e') ? dx : -dx;
      const vertical = handle.includes('s') ? dy : -dy;
      const widthScale = (start.width + horizontal) / Math.max(0.1, start.width);
      const heightScale = (start.height + vertical) / Math.max(0.1, start.height);
      let scale = Math.abs(widthScale - 1) >= Math.abs(heightScale - 1) ? widthScale : heightScale;
      const minScale = Math.max(PHOTO_MIN_WIDTH_MM / start.width, PHOTO_MIN_HEIGHT_MM / start.height);
      const maxScale = Math.min(PHOTO_MAX_WIDTH_MM / start.width, PHOTO_MAX_HEIGHT_MM / start.height);
      scale = clamp(scale, minScale, maxScale);
      width = roundHalfMm(start.width * scale);
      height = roundHalfMm(start.height * scale);

      if (handle.includes('w')) x = start.x + (start.width - width);
      if (handle.includes('n')) y = start.y + (start.height - height);
    }

    setCandidate({ x, y, width, height, totalHeight: height + PHOTO_CAPTION_HEIGHT_MM });
  };

  const endResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = sessionRef.current;
    if (!session || session.kind !== 'resize' || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    commitGeometry();
  };

  const nudge = (dx: number, dy: number) => {
    const candidate = clampGeometry({ ...draftRef.current, x: draftRef.current.x + dx, y: draftRef.current.y + dy }, workspaceHeightMm);
    if (!isValid(candidate)) return;
    syncLiveWorkspaceHeight(candidate);
    draftRef.current = candidate;
    setDraft(candidate);
    mutate((document) => {
      const target = document.instruction.photos.find((item) => item.id === photo.id);
      if (!target) return;
      target.xMm = candidate.x;
      target.yMm = candidate.y;
    });
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (mode !== 'edit' || !selected || interaction || cropEditing) return;
    const step = event.shiftKey ? 2 : 0.5;
    if (event.key === 'ArrowLeft') { event.preventDefault(); nudge(-step, 0); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); nudge(step, 0); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); nudge(0, -step); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); nudge(0, step); }
  };

  const replacePhoto = async (file?: File) => {
    if (!file) return;
    try {
      const src = await imageFileToDataUrl(file, lang);
      const image = new Image();
      image.src = src;
      await image.decode().catch(() => undefined);
      mutate((document) => {
        const target = document.instruction.photos.find((item) => item.id === photo.id);
        if (!target) return;
        target.src = src;
        target.originalSrc = null;
        target.width = image.naturalWidth || target.width;
        target.height = image.naturalHeight || target.height;
        target.cropEnabled = false;
        target.cropZoom = 1;
        target.cropXPct = 50;
        target.cropYPct = 50;
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : tr('Görsel yüklenemedi.', lang));
    }
  };

  const cropImageRect = containImageRectPercent(photo, draft.width, draft.height);

  const beginInlineCrop = () => {
    if (mode !== 'edit') return;
    onSelect();
    setInteraction(null);
    sessionRef.current = null;
    cropSessionRef.current = null;
    setCropDraft(cropImageRect);
    setCropEditing(true);
  };

  const startCropHandle = (handle: PhotoCropHandle, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!cropEditing || cropBusy) return;
    const media = mediaRef.current;
    if (!media) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = media.getBoundingClientRect();
    cropSessionRef.current = {
      handle,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      start: cropDraft,
      mediaWidthPx: Math.max(1, rect.width),
      mediaHeightPx: Math.max(1, rect.height),
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveCropHandle = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = cropSessionRef.current;
    if (!session || session.pointerId !== event.pointerId || cropBusy) return;
    event.preventDefault();
    event.stopPropagation();
    const dxPct = (event.clientX - session.startClientX) / session.mediaWidthPx * 100;
    const dyPct = (event.clientY - session.startClientY) / session.mediaHeightPx * 100;
    const imageWidth = Math.max(0.1, cropImageRect.right - cropImageRect.left);
    const imageHeight = Math.max(0.1, cropImageRect.bottom - cropImageRect.top);
    const minWidth = Math.min(imageWidth, Math.max(4, 14 / session.mediaWidthPx * 100));
    const minHeight = Math.min(imageHeight, Math.max(4, 14 / session.mediaHeightPx * 100));
    const next = { ...session.start };
    const handle = session.handle;

    // Kenar tutamaçları yalnız tek ekseni, köşeler ise iki ekseni birlikte değiştirir.
    if (handle.includes('w')) {
      next.left = clamp(session.start.left + dxPct, cropImageRect.left, session.start.right - minWidth);
    }
    if (handle.includes('e')) {
      next.right = clamp(session.start.right + dxPct, session.start.left + minWidth, cropImageRect.right);
    }
    if (handle.includes('n')) {
      next.top = clamp(session.start.top + dyPct, cropImageRect.top, session.start.bottom - minHeight);
    }
    if (handle.includes('s')) {
      next.bottom = clamp(session.start.bottom + dyPct, session.start.top + minHeight, cropImageRect.bottom);
    }
    setCropDraft(next);
  };

  const endCropHandle = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = cropSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    cropSessionRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const applyInlineCrop = async () => {
    if (cropBusy) return;
    const size = cropRectSize(cropDraft);
    if (size.width < 0.5 || size.height < 0.5) return;
    setCropBusy(true);
    try {
      const cropped = await cropPhotoDataUrl(photo.src, cropDraft, cropImageRect, lang);
      mutate((document) => {
        const target = document.instruction.photos.find((item) => item.id === photo.id);
        if (!target) return;
        target.originalSrc = target.originalSrc || target.src;
        target.src = cropped.src;
        target.width = cropped.width;
        target.height = cropped.height;
        target.cropEnabled = false;
        target.cropZoom = 1;
        target.cropXPct = 50;
        target.cropYPct = 50;
      });
      setCropEditing(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : tr('Fotoğraf kırpılamadı.', lang));
    } finally {
      setCropBusy(false);
      cropSessionRef.current = null;
    }
  };

  const restoreOriginalPhoto = async () => {
    if (!photo.originalSrc || cropBusy) return;
    setCropBusy(true);
    try {
      const image = new Image();
      image.src = photo.originalSrc;
      await image.decode().catch(() => undefined);
      mutate((document) => {
        const target = document.instruction.photos.find((item) => item.id === photo.id);
        if (!target || !target.originalSrc) return;
        target.src = target.originalSrc;
        target.originalSrc = null;
        target.width = image.naturalWidth || target.width;
        target.height = image.naturalHeight || target.height;
        target.cropEnabled = false;
        target.cropZoom = 1;
        target.cropXPct = 50;
        target.cropYPct = 50;
      });
      setCropEditing(false);
    } finally {
      setCropBusy(false);
      cropSessionRef.current = null;
    }
  };

  const cropStyle = cropEditing ? {
    objectFit: 'contain' as const,
    objectPosition: 'center',
    transform: 'none',
    transformOrigin: 'center',
  } : photo.cropEnabled ? {
    objectFit: 'cover' as const,
    objectPosition: `${clamp(Number(photo.cropXPct) || 50, 0, 100)}% ${clamp(Number(photo.cropYPct) || 50, 0, 100)}%`,
    transform: `scale(${clamp(Number(photo.cropZoom) || 1, 1, 3)})`,
    transformOrigin: `${clamp(Number(photo.cropXPct) || 50, 0, 100)}% ${clamp(Number(photo.cropYPct) || 50, 0, 100)}%`,
  } : {
    // Normal serbest resize'da frame'i tamamen doldur. Böylece sol/sağ veya
    // üst/alt kenardan bağımsız genişletme/daraltma beyaz letterbox üretmez.
    objectFit: 'fill' as const,
    objectPosition: 'center',
    transform: 'none',
    transformOrigin: 'center',
  };

  const handles: PhotoResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  return (
    <figure
      className={`instruction-photo-free-tile${selected ? ' photo-selected' : ''}${hasCollisionEdge(collisionEdges) ? ' photo-collision' : ''}${collisionEdges.left ? ' photo-collision-left' : ''}${collisionEdges.right ? ' photo-collision-right' : ''}${collisionEdges.top ? ' photo-collision-top' : ''}${collisionEdges.bottom ? ' photo-collision-bottom' : ''}${interaction ? ' photo-interacting' : ''}`}
      style={{ left: `${draft.x}mm`, top: `${draft.y}mm`, width: `${draft.width}mm`, zIndex: selected || interaction ? 40 : 1 }}
      onPointerDown={() => { if (mode === 'edit') onSelect(); }}
    >
      <div
        ref={mediaRef}
        className="instruction-photo-free-media"
        tabIndex={mode === 'edit' ? 0 : -1}
        style={{ width: `${draft.width}mm`, height: `${draft.height}mm` }}
        onPointerDown={startMove}
        onPointerMove={movePointer}
        onPointerUp={endMove}
        onPointerCancel={endMove}
        onKeyDown={onKeyDown}
        title={mode === 'edit' ? tr('Sürükle: taşı · Kenar/köşe: boyutlandır · Ok tuşları: ince ayar', lang) : undefined}
      >
        <img
          className="instruction-photo-free-img"
          src={photo.src}
          alt={photo.caption || `${tr('Fotoğraf', lang)} ${index + 1}`}
          draggable={false}
          style={cropStyle}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (!image.naturalWidth || !image.naturalHeight || (photo.width === image.naturalWidth && photo.height === image.naturalHeight)) return;
            mutate((document) => {
              const target = document.instruction.photos.find((item) => item.id === photo.id);
              if (target) { target.width = image.naturalWidth; target.height = image.naturalHeight; }
            }, false);
          }}
        />
        {mode === 'edit' && selected && cropEditing && (
          <>
            <div
              className="photo-inline-crop-selection no-print"
              style={{
                left: `${cropDraft.left}%`,
                top: `${cropDraft.top}%`,
                width: `${Math.max(0, cropDraft.right - cropDraft.left)}%`,
                height: `${Math.max(0, cropDraft.bottom - cropDraft.top)}%`,
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <span className="photo-inline-crop-grid" aria-hidden="true" />
              {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as PhotoCropHandle[]).map((handle) => (
                <button
                  key={handle}
                  type="button"
                  className={`photo-inline-crop-handle crop-${handle}`}
                  aria-label={`${tr('Kırpma tutamacı', lang)} ${handle}`}
                  onPointerDown={(event) => startCropHandle(handle, event)}
                  onPointerMove={moveCropHandle}
                  onPointerUp={endCropHandle}
                  onPointerCancel={endCropHandle}
                />
              ))}
            </div>
            <div className="photo-inline-crop-toolbar no-print" onPointerDown={(event) => event.stopPropagation()}>
              {photo.originalSrc && (
                <button type="button" className="secondary" disabled={cropBusy} onClick={() => { void restoreOriginalPhoto(); }}>{tr('Orijinal', lang)}</button>
              )}
              <button type="button" className="secondary" disabled={cropBusy} onClick={() => { setCropEditing(false); cropSessionRef.current = null; }}>{tr('İptal', lang)}</button>
              <button type="button" className="primary" disabled={cropBusy} onClick={() => { void applyInlineCrop(); }}>{cropBusy ? tr('Uygulanıyor…', lang) : tr('Uygula', lang)}</button>
            </div>
          </>
        )}
        {mode === 'edit' && selected && !cropEditing && handles.map((handle) => (
          <button
            key={handle}
            type="button"
            className={`photo-resize-handle photo-resize-${handle} no-print`}
            aria-label={`${tr('Fotoğraf', lang)} ${index + 1} · ${tr('yeniden boyutlandır', lang)}`}
            onPointerDown={(event) => startResize(handle, event)}
            onPointerMove={resizePointer}
            onPointerUp={endResize}
            onPointerCancel={endResize}
          />
        ))}
        {mode === 'edit' && selected && !cropEditing && (
          <>
            <input ref={replaceInputRef} hidden className="no-print" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { void replacePhoto(event.target.files?.[0]); event.currentTarget.value = ''; }} />
            <button type="button" ref={photoMenuTriggerRef} className="photo-menu-trigger no-print" aria-expanded={menuOpen} aria-label={tr('Fotoğraf işlemleri', lang)} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onMenuToggle(); }}><MoreHorizontal size={14} /></button>
            {menuOpen && (
              <PhotoActionMenu triggerRef={photoMenuTriggerRef} onDismiss={onMenuClose}>
                <button type="button" role="menuitem" onClick={() => { replaceInputRef.current?.click(); onMenuToggle(); }}><ImagePlus size={13} /> {tr('Değiştir', lang)}</button>
                <button type="button" role="menuitem" onClick={() => { beginInlineCrop(); onMenuToggle(); }}><Scissors size={13} /> {tr('Kırp', lang)}</button>
                <button type="button" role="menuitem" onClick={onCopy}><Copy size={13} /> {tr('Kopyala', lang)}</button>
                <button type="button" role="menuitem" disabled={!clipboardAvailable} onClick={onPaste}><ClipboardPaste size={13} /> {tr('Yapıştır', lang)}</button>
                <div className="photo-action-menu-separator" />
                <button type="button" role="menuitem" className="danger" onClick={onDelete}><Trash2 size={13} /> {tr('Sil', lang)}</button>
              </PhotoActionMenu>
            )}
          </>
        )}
        {interaction && <span className="photo-resize-dimensions no-print">{draft.width.toFixed(1)} × {draft.height.toFixed(1)} mm</span>}
      </div>
    </figure>
  );
}

export function InstructionPhotosSection() {
  const photos = useEditorStore((s) => s.document.instruction.photos);
  const lang = useEditorStore((s) => s.document.uiLang);
  const fallbackHeightMm = useEditorStore((s) => s.document.instruction.photoLayout.heightMm);
  const workspaceHeightMm = dynamicPhotoWorkspaceHeight(photos, fallbackHeightMm);
  const mode = useEditorStore((s) => s.mode);
  const mutate = useEditorStore((s) => s.mutate);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [clipboardPhoto, setClipboardPhoto] = useState<InstructionPhoto | null>(null);
  const [externalDrag, setExternalDrag] = useState(false);

  useEffect(() => {
    const missing = photos.some((photo) => photo.xMm == null || photo.yMm == null);
    if (!missing) return;
    const occupied: PhotoGeometry[] = [];
    const placements = new Map<string, { x: number; y: number }>();
    for (const photo of photos) {
      const dims = photoDimensions(photo, fallbackHeightMm);
      const currentX = photo.xMm == null ? null : Number(photo.xMm);
      const currentY = photo.yMm == null ? null : Number(photo.yMm);
      let position = currentX != null && currentY != null ? { x: currentX, y: currentY } : null;
      if (!position) {
        position = findFreePhotoPositionExpandable(dims.width, dims.totalHeight, occupied, workspaceHeightMm) ?? { x: 0, y: 0 };
      }
      const geometry = clampGeometry({ x: position.x + (Number(photo.offsetXMm) || 0), y: position.y + (Number(photo.offsetYMm) || 0), width: dims.width, height: dims.height, totalHeight: dims.totalHeight }, workspaceHeightMm);
      occupied.push(geometry);
      placements.set(photo.id, { x: geometry.x, y: geometry.y });
    }
    mutate((document) => {
      document.instruction.photos.forEach((photo) => {
        const placement = placements.get(photo.id);
        if (!placement) return;
        photo.xMm = placement.x;
        photo.yMm = placement.y;
        photo.offsetXMm = 0;
        photo.offsetYMm = 0;
      });
    }, false);
  }, [photos, fallbackHeightMm, workspaceHeightMm, mutate]);

  useEffect(() => {
    if (mode !== 'edit') {
      setSelectedId(null);
      setOpenMenuId(null);
      return;
    }
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && workspaceRef.current?.contains(target)) return;
      if ((event.target as HTMLElement | null)?.closest?.('.photo-crop-dialog, [data-photo-action-menu-portal="true"]')) return;
      setSelectedId(null);
      setOpenMenuId(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
        setSelectedId(null);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [mode]);

  const occupiedRects = () => photos.map((photo) => {
    const dims = photoDimensions(photo, fallbackHeightMm);
    return clampGeometry({ x: Number(photo.xMm) || 0, y: Number(photo.yMm) || 0, width: dims.width, height: dims.height, totalHeight: dims.totalHeight }, workspaceHeightMm);
  });

  const createPhotoFromFile = async (file: File, preferred?: { x: number; y: number }) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const src = await imageFileToDataUrl(file, lang);
      const image = new Image();
      image.src = src;
      await image.decode().catch(() => undefined);
      const naturalWidth = image.naturalWidth || 4;
      const naturalHeight = image.naturalHeight || 3;
      const aspect = Math.max(0.08, naturalWidth / Math.max(1, naturalHeight));
      const height = clampPhotoHeight(Math.min(30, workspaceHeightMm - PHOTO_CAPTION_HEIGHT_MM));
      const width = clampPhotoWidth(height * aspect);
      const position = findFreePhotoPositionExpandable(width, height + PHOTO_CAPTION_HEIGHT_MM, occupiedRects(), workspaceHeightMm, preferred);
      if (!position) {
        window.alert(tr('Fotoğraf çalışma alanı azami yüksekliğe ulaştı. Bir fotoğrafı küçültün, taşıyın veya silin.', lang));
        return;
      }
      const id = cryptoId('photo');
      mutate((document) => {
        document.instruction.photos.push({
          id, src, originalSrc: null, caption: '', width: naturalWidth, height: naturalHeight, sizeMm: height,
          displayWidthMm: width, displayHeightMm: height, offsetXMm: 0, offsetYMm: 0, alignment: 'custom',
          xMm: position.x, yMm: position.y, cropEnabled: false, cropZoom: 1, cropXPct: 50, cropYPct: 50,
        });
      });
      setSelectedId(id);
      setOpenMenuId(null);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : tr('Görsel yüklenemedi.', lang));
    }
  };

  const pastePhoto = (anchor: InstructionPhoto) => {
    if (!clipboardPhoto) return;
    const dims = photoDimensions(clipboardPhoto, fallbackHeightMm);
    const preferred = { x: (Number(anchor.xMm) || 0) + photoDimensions(anchor, fallbackHeightMm).width + PHOTO_GAP_MM, y: Number(anchor.yMm) || 0 };
    const position = findFreePhotoPositionExpandable(dims.width, dims.totalHeight, occupiedRects(), workspaceHeightMm, preferred);
    if (!position) {
      window.alert(tr('Kopyalanan fotoğraf için çalışma alanı azami yüksekliğe ulaştı.', lang));
      return;
    }
    const id = cryptoId('photo');
    mutate((document) => {
      document.instruction.photos.push({ ...structuredClone(clipboardPhoto), id, xMm: position.x, yMm: position.y });
    });
    setSelectedId(id);
    setOpenMenuId(null);
  };

  return (
    <div
      ref={workspaceRef}
      className={`instruction-photo-workspace${externalDrag ? ' external-drag-active' : ''}`}
      style={{ height: `${workspaceHeightMm}mm` }}
      onPointerDown={(event) => {
        if (mode === 'edit' && event.target === event.currentTarget) {
          setSelectedId(null);
          setOpenMenuId(null);
        }
      }}
      onDragEnter={(event) => {
        if (mode !== 'edit' || !Array.from(event.dataTransfer.types).includes('Files')) return;
        event.preventDefault();
        setExternalDrag(true);
      }}
      onDragOver={(event) => {
        if (mode !== 'edit' || !Array.from(event.dataTransfer.types).includes('Files')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setExternalDrag(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setExternalDrag(false);
      }}
      onDrop={(event) => {
        if (mode !== 'edit') return;
        const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
        if (!files.length) return;
        event.preventDefault();
        setExternalDrag(false);
        const rect = event.currentTarget.getBoundingClientRect();
        const x = clamp((event.clientX - rect.left) / Math.max(1, rect.width) * PHOTO_WORKSPACE_WIDTH_MM, 0, PHOTO_WORKSPACE_WIDTH_MM);
        const y = clamp((event.clientY - rect.top) / Math.max(1, rect.height) * workspaceHeightMm, 0, workspaceHeightMm);
        void createPhotoFromFile(files[0], { x, y });
      }}
    >
      <div className="instruction-photo-workspace-hint no-print">{tr('Fotoğraf alanı', lang)} · {PHOTO_WORKSPACE_WIDTH_MM} × {workspaceHeightMm} mm · {tr('İçeriğe göre otomatik büyür / küçülür', lang)}</div>
      {photos.map((photo, index) => (
        <InstructionPhotoTile
          key={photo.id}
          photo={photo}
          index={index}
          fallbackHeightMm={fallbackHeightMm}
          workspaceHeightMm={workspaceHeightMm}
          allPhotos={photos}
          selected={selectedId === photo.id}
          menuOpen={openMenuId === photo.id}
          clipboardAvailable={Boolean(clipboardPhoto)}
          onSelect={() => { setSelectedId(photo.id); if (openMenuId && openMenuId !== photo.id) setOpenMenuId(null); }}
          onMenuToggle={() => setOpenMenuId((value) => value === photo.id ? null : photo.id)}
          onMenuClose={() => setOpenMenuId(null)}
          onCopy={() => { setClipboardPhoto(structuredClone(photo)); setOpenMenuId(null); }}
          onPaste={() => pastePhoto(photo)}
          onDelete={() => {
            if (!window.confirm(tr('Bu fotoğraf silinsin mi?', lang))) return;
            mutate((document) => {
              const target = document.instruction.photos.findIndex((item) => item.id === photo.id);
              if (target >= 0) document.instruction.photos.splice(target, 1);
            });
            setSelectedId(null);
            setOpenMenuId(null);
          }}
        />
      ))}
      {mode === 'edit' && (
        <>
          <input ref={addInputRef} hidden className="no-print" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void createPhotoFromFile(file); event.currentTarget.value = ''; }} />
          <button type="button" className="instruction-photo-workspace-add no-print" onClick={() => addInputRef.current?.click()}><Plus size={18} /><span>{tr('Fotoğraf ekle', lang)}</span></button>
        </>
      )}
      {externalDrag && <div className="instruction-photo-external-drop no-print"><ImagePlus size={24} /><b>{tr('Fotoğrafı buraya bırak', lang)}</b></div>}
    </div>
  );
}


function EnergySourceEditor({ point, rowIndex }: { point: InstructionPoint; rowIndex: number }) {
  const mutate = useEditorStore((s) => s.mutate);
  const mode = useEditorStore((s) => s.mode);
  const lang = useEditorStore((s) => s.document.uiLang);
  const [open, setOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);
  const legacy = parseEnergySource(point.energySource);
  const code = point.energyTagCode || legacy.code;
  const number = point.energyTagNumber || legacy.number;
  const selected = getEnergySourceTag(code);
  const lightNumber = selected?.numberColor.toLowerCase() === '#ffffff';

  useEffect(() => {
    let active = true;
    if (!selected) {
      setPreviewSrc('');
      return () => { active = false; };
    }
    const render = async () => {
      try {
        const dataUrl = await compositeEnergySourceTagDataUrl(code, number);
        if (active) setPreviewSrc(dataUrl || selected.src);
      } catch {
        if (active) setPreviewSrc(selected.src);
      }
    };
    void render();
    return () => { active = false; };
  }, [selected, code, number]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current && !rootRef.current.contains(target)) setOpen(false);
    };
    const closeEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.document.addEventListener('pointerdown', closeOutside);
    window.document.addEventListener('keydown', closeEscape);
    return () => {
      window.document.removeEventListener('pointerdown', closeOutside);
      window.document.removeEventListener('keydown', closeEscape);
    };
  }, [open]);

  const updatePoint = (nextCode: EnergySourceTagCode | '', nextNumber: string) => {
    mutate((d) => {
      const target = d.instruction.points[rowIndex];
      target.energyTagCode = nextCode;
      target.energyTagNumber = nextNumber;
      target.energySource = formatEnergySource(nextCode, nextNumber);
    });
  };

  const choose = (nextCode: EnergySourceTagCode) => {
    updatePoint(nextCode, number);
    setOpen(false);
    window.setTimeout(() => numberInputRef.current?.focus(), 0);
  };

  if (mode !== 'edit') {
    if (!selected) return <div className="energy-tag-preview-fallback">{point.energySource}</div>;
    return <div className="energy-tag-preview">
      <img src={previewSrc || selected.src} alt={formatEnergySource(code, number) || selected.label} />
    </div>;
  }

  return <div ref={rootRef} className="energy-tag-editor">
    <div className={`energy-tag-card ${selected ? 'has-selection' : ''}`}>
      <button
        type="button"
        className={`energy-tag-select-trigger ${selected ? 'has-selection' : ''}`}
        onClick={() => setOpen((value) => !value)}
        title={tr('Enerji etiketi seç', lang)}
        aria-label={tr('Enerji etiketi seç', lang)}
      >
        {selected ? <img src={selected.src} alt={selected.label} /> : <span>{tr('Etiket seç', lang)}</span>}
      </button>
      {selected ? <input
        ref={numberInputRef}
        className="energy-tag-overlay-input"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={number}
        placeholder=""
        aria-label={tr('Enerji etiketi numarası', lang)}
        title={tr('Numarayı direkt görsel içinde girin', lang)}
        style={{
          color: selected.numberColor,
          '--energy-tag-number-left': `${selected.numberLeftPct * 100}%`,
          '--energy-tag-number-width': `${selected.numberWidthPct * 100}%`,
          '--energy-tag-input-hover-bg': lightNumber ? 'rgba(15,23,42,.20)' : 'rgba(255,255,255,.58)',
          '--energy-tag-input-focus-bg': lightNumber ? 'rgba(15,23,42,.62)' : 'rgba(255,255,255,.92)',
          '--energy-tag-input-hover-border': lightNumber ? 'rgba(255,255,255,.58)' : 'rgba(22,131,237,.45)',
          '--energy-tag-input-focus-border': lightNumber ? 'rgba(255,255,255,.88)' : '#1683ed',
          '--energy-tag-input-focus-ring': lightNumber ? 'rgba(15,23,42,.18)' : 'rgba(22,131,237,.2)',
          '--energy-tag-input-text-shadow': lightNumber ? '0 0 .7px rgba(0,0,0,.38)' : 'none',
        } as CSSProperties & Record<`--${string}`, string | number>}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onFocus={() => setOpen(false)}
        onChange={(event) => updatePoint(code, event.target.value.replace(/\D+/g, ''))}
      /> : null}
      {selected ? <img className="energy-tag-print-preview" src={previewSrc || selected.src} alt={formatEnergySource(code, number) || selected.label} /> : null}
    </div>
    {open ? <div className="energy-tag-picker no-print">
      <div className="energy-tag-picker-title">{tr('Enerji etiketi seç', lang)}</div>
      <div className="energy-tag-picker-grid">
        {ENERGY_SOURCE_TAG_CHOICES.map((choice) => <button
          key={choice.code}
          type="button"
          className={choice.code === code ? 'selected' : ''}
          onClick={() => choose(choice.code)}
          title={choice.code}
        >
          <img src={choice.src} alt={choice.label} />
          <span>{choice.code}</span>
        </button>)}
      </div>
      {selected ? <button type="button" className="energy-tag-clear" onClick={() => { updatePoint('', ''); setOpen(false); }}>{tr('Seçimi temizle', lang)}</button> : null}
    </div> : null}
  </div>;
}




function SortableInstructionPointRow({ point, rowIndex, fields }: {
  point: InstructionPoint;
  rowIndex: number;
  fields: Array<[keyof InstructionPoint, string]>;
}) {
  const lang = useEditorStore((s) => s.document.uiLang);
  const mutate = useEditorStore((s) => s.mutate);
  const mode = useEditorStore((s) => s.mode);
  const sortableId = `instruction-point-row-${point.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    disabled: mode !== 'edit',
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 35 : undefined,
    position: 'relative' as const,
  };

  return (
    <tr ref={setNodeRef} style={style} className={`instruction-point-row sortable-table-row ${isDragging ? 'table-row-dragging' : ''}`}>
      {fields.map(([key], fieldIndex) => (
        <td className={key === 'controlMethod' ? 'instruction-point-action-anchor' : undefined} key={String(key)}>
          {fieldIndex === 0 ? (
            <div className="instruction-point-first-cell">
              <button
                type="button"
                className="table-row-drag-handle instruction-point-drag-handle no-print"
                title={`${rowIndex + 1}. ${tr('kilitleme noktası satırını sürükle', lang)}`}
                aria-label={`${rowIndex + 1}. ${tr('kilitleme noktası satırını sürükle', lang)}`}
                {...attributes}
                {...listeners}
              >
                <GripVertical size={13} strokeWidth={1.8} />
              </button>
              {key === 'energySource' ? (
                <EnergySourceEditor point={point} rowIndex={rowIndex} />
              ) : (
                <InlineText
                  multiline
                  value={String(point[key] ?? '')}
                  onChange={(v) => mutate((d) => { (d.instruction.points[rowIndex][key] as string) = v; })}
                />
              )}
            </div>
          ) : key === 'lockEquipment' ? (
            <InstructionEquipmentWorkspace point={point} rowIndex={rowIndex} />
          ) : (
            <InlineText
              multiline
              value={String(point[key] ?? '')}
              onChange={(v) => mutate((d) => { (d.instruction.points[rowIndex][key] as string) = v; })}
            />
          )}
          {key === 'controlMethod' ? (
            <button
              type="button"
              className="table-row-delete-outside no-print"
              title={tr('Kilitleme noktasını sil', lang)}
              aria-label={`${rowIndex + 1}. ${tr('Kilitleme noktasını sil', lang)}`}
              onClick={() => mutate((d) => {
                d.instruction.points.splice(rowIndex, 1);
                if (!d.instruction.points.length) d.instruction.points.push(blankInstructionPoint());
              })}
            >
              <Trash2 size={15} strokeWidth={1.8} />
            </button>
          ) : null}
        </td>
      ))}
    </tr>
  );
}

export function InstructionPointsSection() {
  const points = useEditorStore((s) => s.document.instruction.points);
  const lang = useEditorStore((s) => s.document.uiLang);
  const mutate = useEditorStore((s) => s.mutate);
  const fields: Array<[keyof InstructionPoint, string]> = [['energySource', 'Enerji Kaynağı'], ['responsible', 'Sorumlu'], ['method', 'Yöntem'], ['lockEquipment', 'Kilitleme Ekipmanı'], ['controlMethod', 'Kontrol Yöntemi']];
  const pointIds = points.map((point) => `instruction-point-row-${point.id}`);
  return (
    <div>
      <table className="instruction-points"><thead><tr>{fields.map(([, title]) => <th key={title}>{tr(title, lang)}</th>)}</tr></thead>
        <SortableContext items={pointIds} strategy={verticalListSortingStrategy}>
          <tbody>{points.map((point, rowIndex) => <SortableInstructionPointRow key={point.id} point={point} rowIndex={rowIndex} fields={fields} />)}</tbody>
        </SortableContext>
      </table>
      <button type="button" className="inline-add no-print" onClick={() => mutate((d) => { d.instruction.points.push(blankInstructionPoint()); d.instruction.pointCount = String(d.instruction.points.length); })}><Plus size={16} /> {tr('Kilitleme noktası ekle', lang)}</button>
    </div>
  );
}

export function InstructionRemovalSection() {
  const lang = useEditorStore((s) => s.document.uiLang);
  return <div className="removal-block"><div className="removal-title">{tr('Kilit ve Etiketlerin Kaldırılması', lang)}</div><div className="removal-text">{tr(INSTRUCTION_REMOVAL_STEPS, lang)}</div></div>;
}

export function InstructionSignersSection() {
  const document = useEditorStore((s) => s.document);
  const mutate = useEditorStore((s) => s.mutate);
  const lang = document.uiLang;
  const signers = [['preparedBy', 'Hazırlayan'], ['verifiedBy', 'Doğrulayan'], ['approvedBy', 'Onaylayan']] as const;
  return (
    <table className="instruction-signers">
      <colgroup>
        {signers.map(([key]) => <Fragment key={`${key}-cols`}><col className="instruction-signer-label-col" /><col className="instruction-signer-value-col" /></Fragment>)}
      </colgroup>
      <thead><tr>{signers.map(([, label]) => <th key={label} colSpan={2}>{tr(label, lang)}</th>)}</tr></thead>
      <tbody>
        <tr>
          {signers.map(([key]) => <Fragment key={`${key}-name`}><th className="instruction-signer-row-label">{tr('Adı Soyadı', lang)}</th><td><InlineText multiline value={document.instruction[key].name} onChange={(v) => mutate((d) => { d.instruction[key].name = v; })} /></td></Fragment>)}
        </tr>
        <tr>
          {signers.map(([key]) => <Fragment key={`${key}-duty`}><th className="instruction-signer-row-label">{tr('Görevi', lang)}</th><td><InlineText multiline value={document.instruction[key].duty} onChange={(v) => mutate((d) => { d.instruction[key].duty = v; })} /></td></Fragment>)}
        </tr>
      </tbody>
    </table>
  );
}
