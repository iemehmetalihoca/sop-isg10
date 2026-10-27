import * as z from 'zod';
import { APP_DATA_VERSION, createDefaultDocument, cryptoId, DEFAULT_LABELS } from './defaults';
import type { AppDocument } from './types';
import { ENERGY_SOURCE_TAG_CODES, parseEnergySource } from './energy-source-tags';

const personSchema = z.object({
  name: z.string().default(''), phone: z.string().default(''), date: z.string().default(''), time: z.string().default(''),
  department: z.string().default(''), duty: z.string().default(''), signature: z.string().default(''),
});

const photoSchema = z.object({
  id: z.string().default(''), src: z.string().default(''), originalSrc: z.string().nullable().default(null), caption: z.string().default(''),
  width: z.coerce.number().default(4), height: z.coerce.number().default(3), sizeMm: z.coerce.number().nullable().default(null),
  displayWidthMm: z.coerce.number().nullable().default(null), displayHeightMm: z.coerce.number().nullable().default(null),
  offsetXMm: z.coerce.number().default(0), offsetYMm: z.coerce.number().default(0),
  alignment: z.enum(['left', 'center', 'right', 'custom']).default('center'),
  xMm: z.coerce.number().nullable().default(null), yMm: z.coerce.number().nullable().default(null),
  cropEnabled: z.coerce.boolean().default(false), cropZoom: z.coerce.number().default(1),
  cropXPct: z.coerce.number().default(50), cropYPct: z.coerce.number().default(50),
});

const instructionLockEquipmentPhotoSchema = z.object({
  id: z.string().default(''),
  src: z.string().default(''),
  originalSrc: z.string().default(''),
  xMm: z.coerce.number().nullable().default(null),
  yMm: z.coerce.number().nullable().default(null),
  widthMm: z.coerce.number().nullable().default(null),
  heightMm: z.coerce.number().nullable().default(null),
  naturalWidth: z.coerce.number().default(4),
  naturalHeight: z.coerce.number().default(3),
});

const instructionPointSchema = z.object({
  id: z.string().optional(),
  energySource: z.string().default(''),
  energyTagCode: z.enum(ENERGY_SOURCE_TAG_CODES).or(z.literal('')).default(''),
  energyTagNumber: z.string().default(''),
  responsible: z.string().default(''), method: z.string().default(''),
  lockEquipment: z.string().default(''), controlMethod: z.string().default(''),
});

const selectableSchema = z.object({
  id: z.string(), label: z.string().default(''), checked: z.boolean().default(false),
});

export const importSchema = z.object({
  schemaVersion: z.string().optional(),
  project: z.record(z.string(), z.unknown()).optional(),
  uiLang: z.enum(['tr', 'en', 'fr']).optional(),
  activeDocument: z.enum(['sop', 'instruction']).optional(),
  labels: z.record(z.string(), z.string()).optional(),
  instruction: z.record(z.string(), z.unknown()).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  lotoType: z.record(z.string(), z.unknown()).optional(),
  coverPhoto: z.string().optional(),
  coverPhotoOriginal: z.string().optional(),
  coverPhotoScale: z.coerce.number().optional(),
  coverPhotoXmm: z.coerce.number().optional(),
  coverPhotoYmm: z.coerce.number().optional(),
  coverPhotoWidthMm: z.coerce.number().optional(),
  coverPhotoHeightMm: z.coerce.number().optional(),
  ppe: z.array(selectableSchema.partial({ checked: true })).optional(),
  energies: z.array(selectableSchema.partial({ checked: true })).optional(),
  otherEnergy: z.string().optional(),
  safety: z.array(z.string()).optional(),
  units: z.record(z.string(), z.unknown()).optional(),
  workers: z.array(personSchema.partial()).optional(),
  verifier: personSchema.partial().optional(),
  equipments: z.array(z.record(z.string(), z.unknown())).optional(),
  personnel: z.array(personSchema.partial()).optional(),
  points: z.array(z.record(z.string(), z.unknown())).optional(),
  steps: z.array(z.record(z.string(), z.unknown())).optional(),
  commissioning: z.array(personSchema.partial()).optional(),
  editor: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const asString = (value: unknown) => typeof value === 'string' ? value : '';
const asBool = (value: unknown) => Boolean(value);
const asNumber = (value: unknown, fallback: number) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function normalizeImportedDocument(input: unknown): AppDocument {
  const raw = importSchema.parse(input);
  const base = createDefaultDocument();
  const instruction = (raw.instruction ?? {}) as Record<string, unknown>;
  const instructionMeta = (instruction.meta ?? {}) as Record<string, unknown>;
  const photoLayout = (instruction.photoLayout ?? {}) as Record<string, unknown>;
  const project = (raw.project ?? {}) as Record<string, unknown>;
  const meta = (raw.meta ?? {}) as Record<string, unknown>;
  const lotoType = (raw.lotoType ?? {}) as Record<string, unknown>;
  const units = (raw.units ?? {}) as Record<string, unknown>;
  const editor = (raw.editor ?? {}) as Record<string, unknown>;

  const imported: AppDocument = {
    ...base,
    schemaVersion: APP_DATA_VERSION,
    project: {
      ...base.project,
      fileVersion: APP_DATA_VERSION,
      fileRevision: asNumber(project.fileRevision, base.project.fileRevision),
      createdAt: typeof project.createdAt === 'string' ? project.createdAt : base.project.createdAt,
      lastModified: typeof project.lastModified === 'string' ? project.lastModified : base.project.lastModified,
      sourceFileName: asString(project.sourceFileName),
    },
    uiLang: raw.uiLang ?? base.uiLang,
    activeDocument: raw.activeDocument ?? base.activeDocument,
    labels: { ...DEFAULT_LABELS, ...(raw.labels ?? {}) },
    meta: {
      equipment: asString(meta.equipment), location: asString(meta.location), jobDescription: asString(meta.jobDescription),
      publishDate: asString(meta.publishDate), revision: asString(meta.revision), sopNo: asString(meta.sopNo), referenceNo: asString(meta.referenceNo),
    },
    lotoType: { simple: asBool(lotoType.simple), complex: asBool(lotoType.complex) },
    coverPhoto: raw.coverPhoto ?? '',
    coverPhotoOriginal: asString(raw.coverPhotoOriginal),
    // Preserve the legacy compatibility value exactly.
    coverPhotoScale: asNumber(raw.coverPhotoScale, base.coverPhotoScale),
    coverPhotoXmm: Math.max(0, Math.min(105, asNumber(raw.coverPhotoXmm, 0))),
    coverPhotoYmm: Math.max(0, Math.min(42, asNumber(raw.coverPhotoYmm, 0))),
    coverPhotoWidthMm: Math.max(10, Math.min(115, asNumber(raw.coverPhotoWidthMm, 92))),
    coverPhotoHeightMm: Math.max(8, Math.min(50, asNumber(raw.coverPhotoHeightMm, 38))),
    ppe: raw.ppe?.map((item) => ({ id: item.id, label: item.label, checked: Boolean(item.checked) })) ?? base.ppe,
    energies: raw.energies?.map((item) => ({ id: item.id, label: item.label, checked: Boolean(item.checked) })) ?? base.energies,
    otherEnergy: raw.otherEnergy ?? '',
    safety: raw.safety !== undefined ? [...raw.safety] : base.safety,
    units: { production: asBool(units.production), maintenance: asBool(units.maintenance), contractor: asBool(units.contractor) },
    workers: raw.workers !== undefined ? raw.workers.map((person) => ({ ...base.workers[0], ...person })) : base.workers,
    verifier: raw.verifier ? ({ ...base.verifier, ...raw.verifier }) : base.verifier,
    equipments: raw.equipments !== undefined ? raw.equipments.map((row, index) => ({
      no: index + 1,
      equipmentNo: asString(row.equipmentNo),
      name: asString(row.name),
      qty: asString(row.qty),
      photo: asString(row.photo),
      originalPhoto: asString(row.originalPhoto),
      photoXPercent: Math.max(0, Math.min(88, asNumber(row.photoXPercent, 0))),
      photoYPercent: Math.max(0, Math.min(88, asNumber(row.photoYPercent, 0))),
      photoWidthPercent: Math.max(12, Math.min(100, asNumber(row.photoWidthPercent, 100))),
      photoHeightPercent: Math.max(12, Math.min(100, asNumber(row.photoHeightPercent, 100))),
    })) : base.equipments,
    personnel: raw.personnel !== undefined ? raw.personnel.map((person) => ({ ...base.personnel[0], ...person })) : base.personnel,
    points: raw.points !== undefined ? raw.points.map((point, index) => ({
      no: index + 1, pointNo: asString(point.pointNo), equipmentType: asString(point.equipmentType), lockType: asString(point.lockType),
      action: ['Açıldı', 'Opened', 'Ouvert'].includes(asString(point.action)) ? 'Açıldı' : 'Kapatıldı', authorizedPerson: asString(point.authorizedPerson),
    })) : base.points,
    steps: raw.steps !== undefined ? raw.steps.map((step, index) => ({
      no: index + 1,
      description: asString(step.description),
      photo: asString(step.photo),
      originalPhoto: asString(step.originalPhoto),
      photoXPercent: Math.max(0, Math.min(88, asNumber(step.photoXPercent, 0))),
      photoYPercent: Math.max(0, Math.min(88, asNumber(step.photoYPercent, 0))),
      photoWidthPercent: Math.max(12, Math.min(100, asNumber(step.photoWidthPercent, 100))),
      photoHeightPercent: Math.max(12, Math.min(100, asNumber(step.photoHeightPercent, 100))),
      authorized: asString(step.authorized),
      approver: asString(step.approver),
      verifier: asString(step.verifier),
    })) : base.steps,
    commissioning: raw.commissioning !== undefined ? raw.commissioning.map((person) => ({ ...base.commissioning[0], ...person })) : base.commissioning,
    instruction: {
      ...base.instruction,
      meta: {
        equipment: asString(instructionMeta.equipment),
        location: asString(instructionMeta.location),
        jobDescription: asString(instructionMeta.jobDescription) || asString(instructionMeta.workScope),
        publishDate: asString(instructionMeta.publishDate) || asString(instructionMeta.issueDate),
        revision: asString(instructionMeta.revision) || asString(instructionMeta.revisionNo),
        sopNo: asString(instructionMeta.sopNo),
        referenceNo: asString(instructionMeta.referenceNo) || asString(instructionMeta.instructionNo),
      },
      ppeSummary: asString(instruction.ppeSummary), hazardSummary: asString(instruction.hazardSummary),
      ppeIcons: Array.isArray(instruction.ppeIcons) ? instruction.ppeIcons.filter((value): value is string => typeof value === 'string') : [],
      hazardIcons: Array.isArray(instruction.hazardIcons) ? instruction.hazardIcons.filter((value): value is string => typeof value === 'string') : [],
      pointCount: typeof instruction.pointCount === 'string' ? instruction.pointCount : base.instruction.pointCount,
      photoLayout: {
        heightMm: Math.max(10, Math.min(35, asNumber(photoLayout.heightMm, 20))),
        workspaceHeightMm: Math.max(30, Math.min(180, asNumber(photoLayout.workspaceHeightMm, 30))),
      },
      photos: Array.isArray(instruction.photos) ? instruction.photos.map((photo) => {
        const parsed = photoSchema.parse(photo);
        return { ...parsed, id: parsed.id || cryptoId('photo') };
      }).filter((photo) => photo.src) : [],
      points: Array.isArray(instruction.points) ? instruction.points.map((point) => {
        const parsed = instructionPointSchema.parse(point);
        const legacy = parseEnergySource(parsed.energySource);
        const energyTagCode = parsed.energyTagCode || legacy.code;
        const energyTagNumber = parsed.energyTagNumber || legacy.number;
        const energySource = energyTagCode ? `${energyTagCode}${energyTagNumber}` : parsed.energySource;
        const rawPhotos = Array.isArray((point as Record<string, unknown>).lockEquipmentPhotos)
          ? ((point as Record<string, unknown>).lockEquipmentPhotos as unknown[])
          : [];
        const lockEquipmentPhotos = rawPhotos
          .map((photo) => instructionLockEquipmentPhotoSchema.parse(photo))
          .map((photo) => ({
            id: photo.id || cryptoId('ilep'),
            src: photo.src,
            originalSrc: photo.originalSrc || '',
            xMm: photo.xMm, yMm: photo.yMm,
            widthMm: photo.widthMm, heightMm: photo.heightMm,
            naturalWidth: photo.naturalWidth, naturalHeight: photo.naturalHeight,
          }))
          .filter((photo) => photo.src);
        return { ...parsed, energyTagCode, energyTagNumber, energySource, lockEquipmentPhotos, id: parsed.id || cryptoId('ip') };
      }) : base.instruction.points,
      preparedBy: { ...base.instruction.preparedBy, ...((instruction.preparedBy as Record<string, string> | undefined) ?? {}) },
      verifiedBy: { ...base.instruction.verifiedBy, ...((instruction.verifiedBy as Record<string, string> | undefined) ?? {}) },
      approvedBy: { ...base.instruction.approvedBy, ...((instruction.approvedBy as Record<string, string> | undefined) ?? {}) },
    },
    editor: {
      zoom: Math.max(0.5, Math.min(1.4, asNumber(editor.zoom, base.editor.zoom))),
      sopSectionOrder: [...base.editor.sopSectionOrder],
      instructionSectionOrder: Array.isArray(editor.instructionSectionOrder) ? editor.instructionSectionOrder.filter((id): id is AppDocument['editor']['instructionSectionOrder'][number] => base.editor.instructionSectionOrder.includes(id as never)) : base.editor.instructionSectionOrder,
    },
  };

  if (!imported.editor.sopSectionOrder.length) imported.editor.sopSectionOrder = base.editor.sopSectionOrder;
  if (!imported.editor.instructionSectionOrder.length) imported.editor.instructionSectionOrder = base.editor.instructionSectionOrder;
  return imported;
}
