export type Lang = 'tr' | 'en' | 'fr';
export type ActiveDocument = 'sop' | 'instruction';
export type EditorMode = 'edit' | 'preview';

export interface ProjectMeta {
  fileVersion: string;
  fileRevision: number;
  createdAt: string;
  lastModified: string;
  sourceFileName: string;
}

export interface Person {
  name: string;
  phone: string;
  date: string;
  time: string;
  department: string;
  duty: string;
  signature: string;
}

export interface Equipment {
  no: number;
  equipmentNo: string;
  name: string;
  qty: string;
  photo: string;
  originalPhoto: string;
  photoXPercent: number;
  photoYPercent: number;
  photoWidthPercent: number;
  photoHeightPercent: number;
}

export interface LotoPoint {
  no: number;
  pointNo: string;
  equipmentType: string;
  lockType: string;
  action: 'Kapatıldı' | 'Açıldı';
  authorizedPerson: string;
}

export interface Step {
  no: number;
  description: string;
  photo: string;
  originalPhoto: string;
  photoXPercent: number;
  photoYPercent: number;
  photoWidthPercent: number;
  photoHeightPercent: number;
  authorized: string;
  approver: string;
  verifier: string;
}

export interface SelectableOption {
  id: string;
  label: string;
  checked: boolean;
}

export interface InstructionLockEquipmentPhoto {
  id: string;
  src: string;
  originalSrc: string;
  // Optional for backwards compatibility with older saved LOTO projects.
  xMm?: number | null;
  yMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  naturalWidth?: number;
  naturalHeight?: number;
}

export interface InstructionPoint {
  id: string;
  energySource: string;
  energyTagCode: '' | 'GL' | 'S' | 'E' | 'G' | 'P' | 'C' | 'W' | 'T' | 'V';
  energyTagNumber: string;
  responsible: string;
  method: string;
  lockEquipment: string;
  lockEquipmentPhotos: InstructionLockEquipmentPhoto[];
  controlMethod: string;
}

export interface InstructionSigner {
  name: string;
  duty: string;
}

export interface InstructionPhoto {
  id: string;
  src: string;
  originalSrc: string | null;
  caption: string;
  width: number;
  height: number;
  sizeMm: number | null;
  displayWidthMm: number | null;
  displayHeightMm: number | null;
  offsetXMm: number;
  offsetYMm: number;
  alignment: 'left' | 'center' | 'right' | 'custom';
  xMm: number | null;
  yMm: number | null;
  cropEnabled: boolean;
  cropZoom: number;
  cropXPct: number;
  cropYPct: number;
}

export type SopSectionId =
  | 'sop-general'
  | 'sop-safety'
  | 'sop-equipment'
  | 'sop-personnel-points'
  | 'sop-steps';

export type InstructionSectionId =
  | 'instruction-meta'
  | 'instruction-work-scope'
  | 'instruction-summary'
  | 'instruction-locking'
  | 'instruction-photos'
  | 'instruction-points'
  | 'instruction-removal'
  | 'instruction-signers';

export interface LotoHeaderMeta {
  equipment: string;
  location: string;
  jobDescription: string;
  publishDate: string;
  revision: string;
  sopNo: string;
  referenceNo: string;
}

export interface InstructionDocument {
  meta: LotoHeaderMeta;
  ppeSummary: string;
  hazardSummary: string;
  ppeIcons: string[];
  hazardIcons: string[];
  pointCount: string;
  photos: InstructionPhoto[];
  photoLayout: { heightMm: number; workspaceHeightMm: number };
  points: InstructionPoint[];
  preparedBy: InstructionSigner;
  verifiedBy: InstructionSigner;
  approvedBy: InstructionSigner;
}

export interface EditorSettings {
  sopSectionOrder: SopSectionId[];
  instructionSectionOrder: InstructionSectionId[];
  zoom: number;
}

export interface AppDocument {
  schemaVersion: string;
  project: ProjectMeta;
  uiLang: Lang;
  activeDocument: ActiveDocument;
  labels: Record<string, string>;
  instruction: InstructionDocument;
  meta: LotoHeaderMeta;
  lotoType: { simple: boolean; complex: boolean };
  coverPhoto: string;
  coverPhotoOriginal: string;
  coverPhotoScale: number;
  coverPhotoXmm: number;
  coverPhotoYmm: number;
  coverPhotoWidthMm: number;
  coverPhotoHeightMm: number;
  ppe: SelectableOption[];
  energies: SelectableOption[];
  otherEnergy: string;
  safety: string[];
  units: { production: boolean; maintenance: boolean; contractor: boolean };
  workers: Person[];
  verifier: Person;
  equipments: Equipment[];
  personnel: Person[];
  points: LotoPoint[];
  steps: Step[];
  commissioning: Person[];
  editor: EditorSettings;
}
