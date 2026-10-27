'use client';

import { INSTRUCTION_LOCKING_STEPS, INSTRUCTION_REMOVAL_STEPS } from './defaults';
import { getEnergyIconSource, getInstructionIconLabel, getInstructionIconSource, getPpeIconSources } from './default-icons';
import { formatEnergySource, getEnergySourceTag, parseEnergySource } from './energy-source-tags';
import { tr } from './labels';
import type { AppDocument, InstructionPhoto, Person } from './types';

type WordApi = any;
type WordChild = any;
type ImageKind = 'png' | 'jpg' | 'gif' | 'bmp';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const SOP_MARGIN_X_MM = 10;
const SOP_MARGIN_TOP_MM = 8;
const SOP_MARGIN_BOTTOM_MM = 12;
const INSTRUCTION_MARGIN_X_MM = 8;
const INSTRUCTION_MARGIN_TOP_MM = 5;
const INSTRUCTION_MARGIN_BOTTOM_MM = 8;
const SOP_CONTENT_WIDTH_MM = A4_WIDTH_MM - SOP_MARGIN_X_MM * 2;
const INSTRUCTION_CONTENT_WIDTH_MM = A4_WIDTH_MM - INSTRUCTION_MARGIN_X_MM * 2;
const INSTRUCTION_WORKSPACE_WIDTH_MM = 194;
const COVER_OUTER_WIDTH_MM = 115;
const COVER_OUTER_HEIGHT_MM = 50;
const COVER_WORKSPACE_WIDTH_MM = 115;
const COVER_WORKSPACE_HEIGHT_MM = 50;
const MM_TO_TWIP = 1440 / 25.4;
const MM_TO_PX = 96 / 25.4;
const COMPOSITE_PX_PER_MM = 6;

const C = {
  text: '111827',
  line: '111111',
  light: 'EEF2F6',
  blue: '1479CF',
  blueSoft: 'EFF6FF',
  yellow: 'D4B800',
  green: '2FA84F',
  greenSoft: 'E5F4DE',
  red: 'DC2F3C',
  danger: 'E11D1D',
  orange: 'D6652D',
  white: 'FFFFFF',
  muted: '64748B',
};

const mmToTwip = (mm: number) => Math.round(mm * MM_TO_TWIP);
const mmToPx = (mm: number) => Math.max(1, Math.round(mm * MM_TO_PX));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const clean = (value: unknown) => String(value ?? '');

function splitTextRuns(D: WordApi, text: string, options: Record<string, unknown> = {}) {
  const parts = clean(text).replace(/\r\n/g, '\n').split('\n');
  return parts.map((part, index) => new D.TextRun({ ...options, text: part, break: index ? 1 : undefined }));
}

function p(D: WordApi, text = '', options: {
  bold?: boolean;
  color?: string;
  size?: number;
  align?: any;
  before?: number;
  after?: number;
  line?: number;
  keepNext?: boolean;
  italic?: boolean;
} = {}) {
  return new D.Paragraph({
    alignment: options.align,
    keepNext: options.keepNext,
    spacing: {
      before: options.before ?? 0,
      after: options.after ?? 0,
      line: options.line,
    },
    children: splitTextRuns(D, text, {
      bold: options.bold,
      color: options.color ?? C.text,
      size: options.size ?? 18,
      font: 'Arial',
      italics: options.italic,
    }),
  });
}

function imageParagraph(D: WordApi, run: any, align = D.AlignmentType.CENTER) {
  return new D.Paragraph({ alignment: align, spacing: { before: 0, after: 0 }, children: [run] });
}

function border(D: WordApi, color = C.line, size = 8) {
  return { style: D.BorderStyle.SINGLE, color, size };
}

function noneBorder(D: WordApi) {
  return { style: D.BorderStyle.NONE, color: C.white, size: 0 };
}

function allBorders(D: WordApi, color = C.line, size = 8) {
  const edge = border(D, color, size);
  return { top: edge, bottom: edge, left: edge, right: edge, insideHorizontal: edge, insideVertical: edge };
}

function noBorders(D: WordApi) {
  const edge = noneBorder(D);
  return { top: edge, bottom: edge, left: edge, right: edge, insideHorizontal: edge, insideVertical: edge };
}

function tc(D: WordApi, children: WordChild[] | WordChild | string, options: {
  widthMm?: number;
  span?: number;
  rowSpan?: number;
  fill?: string;
  color?: string;
  bold?: boolean;
  size?: number;
  align?: any;
  valign?: any;
  borders?: any;
  marginsMm?: number;
} = {}) {
  const normalized = typeof children === 'string'
    ? [p(D, children, { bold: options.bold, color: options.color, size: options.size, align: options.align })]
    : Array.isArray(children) ? children : [children];
  return new D.TableCell({
    children: normalized,
    columnSpan: options.span,
    rowSpan: options.rowSpan,
    width: options.widthMm != null ? { size: mmToTwip(options.widthMm), type: D.WidthType.DXA } : undefined,
    verticalAlign: options.valign ?? (D.VerticalAlignTable ?? D.VerticalAlign).CENTER,
    shading: options.fill ? { fill: options.fill, color: 'auto', type: D.ShadingType.CLEAR } : undefined,
    borders: options.borders ?? allBorders(D),
    margins: {
      top: mmToTwip(options.marginsMm ?? 0.8),
      bottom: mmToTwip(options.marginsMm ?? 0.8),
      left: mmToTwip(options.marginsMm ?? 1),
      right: mmToTwip(options.marginsMm ?? 1),
    },
  });
}

function trw(D: WordApi, cells: any[], options: { heightMm?: number; exact?: boolean } = {}) {
  return new D.TableRow({
    children: cells,
    cantSplit: true,
    height: options.heightMm != null
      ? { value: mmToTwip(options.heightMm), rule: options.exact ? D.HeightRule.EXACT : D.HeightRule.ATLEAST }
      : undefined,
  });
}

function tbl(D: WordApi, rows: any[], widthsMm: number[], options: { borders?: any; widthMm?: number } = {}) {
  return new D.Table({
    rows,
    width: { size: mmToTwip(options.widthMm ?? widthsMm.reduce((a, b) => a + b, 0)), type: D.WidthType.DXA },
    columnWidths: widthsMm.map(mmToTwip),
    layout: D.TableLayoutType.FIXED,
    borders: options.borders ?? allBorders(D),
  });
}

function spacer(D: WordApi, mm = 2) {
  return new D.Paragraph({ spacing: { before: 0, after: mmToTwip(mm) }, children: [] });
}

function sectionTitle(D: WordApi, text: string, widthMm: number, fill?: string, color = C.text, size = 22) {
  return tbl(D, [trw(D, [tc(D, text, { widthMm, fill, color, bold: true, size, marginsMm: 1.2 })])], [widthMm]);
}

function dataUrlParts(dataUrl: string): { type: ImageKind; bytes: Uint8Array } | null {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const binary = window.atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const type: ImageKind = mime.includes('png') ? 'png' : mime.includes('gif') ? 'gif' : mime.includes('bmp') ? 'bmp' : 'jpg';
  return { type, bytes };
}

async function fetchImageBytes(path: string): Promise<{ type: ImageKind; bytes: Uint8Array } | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const bytes = new Uint8Array(await response.arrayBuffer());
    const type: ImageKind = contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : contentType.includes('bmp') ? 'bmp' : 'jpg';
    return { type, bytes };
  } catch {
    return null;
  }
}

async function loadHtmlImage(src: string) {
  const image = new Image();
  image.src = src;
  await image.decode().catch(() => undefined);
  return image;
}

async function imageRunFit(D: WordApi, src: string, maxWidthMm: number, maxHeightMm: number, lang: AppDocument['uiLang']) {
  if (!src) return null;
  const image = await loadHtmlImage(src);
  const aspect = Math.max(0.01, (image.naturalWidth || 4) / Math.max(1, image.naturalHeight || 3));
  let widthMm = maxWidthMm;
  let heightMm = widthMm / aspect;
  if (heightMm > maxHeightMm) {
    heightMm = maxHeightMm;
    widthMm = heightMm * aspect;
  }
  let media = dataUrlParts(src);
  if (!media) return null;
  if (media.type === 'gif' || /^data:image\/webp/i.test(src)) {
    const canvas = window.document.createElement('canvas');
    canvas.width = Math.max(1, image.naturalWidth || 1);
    canvas.height = Math.max(1, image.naturalHeight || 1);
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(image, 0, 0);
      media = dataUrlParts(canvas.toDataURL('image/png'));
    }
  }
  if (!media) return null;
  return new D.ImageRun({
    data: media.bytes,
    type: media.type,
    transformation: { width: mmToPx(widthMm), height: mmToPx(heightMm) },
    altText: { title: tr('LOTO fotoğrafı', lang), description: tr('LOTO dokümanı fotoğrafı', lang), name: tr('LOTO fotoğrafı', lang) },
  });
}

async function compositeCoverPhoto(document: AppDocument) {
  if (!document.coverPhoto) return '';
  const canvas = window.document.createElement('canvas');
  canvas.width = Math.round(COVER_OUTER_WIDTH_MM * COMPOSITE_PX_PER_MM);
  canvas.height = Math.round(COVER_OUTER_HEIGHT_MM * COMPOSITE_PX_PER_MM);
  const context = canvas.getContext('2d');
  if (!context) return document.coverPhoto;
  context.clearRect(0, 0, canvas.width, canvas.height);
  const image = await loadHtmlImage(document.coverPhoto);
  const xMm = clamp(Number(document.coverPhotoXmm) || 0, 0, COVER_WORKSPACE_WIDTH_MM);
  const yMm = clamp(Number(document.coverPhotoYmm) || 0, 0, COVER_WORKSPACE_HEIGHT_MM);
  const widthMm = clamp(Number(document.coverPhotoWidthMm) || COVER_WORKSPACE_WIDTH_MM, 1, COVER_WORKSPACE_WIDTH_MM);
  const heightMm = clamp(Number(document.coverPhotoHeightMm) || COVER_WORKSPACE_HEIGHT_MM, 1, COVER_WORKSPACE_HEIGHT_MM);
  context.drawImage(
    image,
    Math.round(xMm * COMPOSITE_PX_PER_MM),
    Math.round(yMm * COMPOSITE_PX_PER_MM),
    Math.round(widthMm * COMPOSITE_PX_PER_MM),
    Math.round(heightMm * COMPOSITE_PX_PER_MM),
  );
  return canvas.toDataURL('image/png');
}


function boundedCellPhotoGeometry(item: { photoXPercent: number; photoYPercent: number; photoWidthPercent: number; photoHeightPercent: number }) {
  const widthPercent = clamp(Number(item.photoWidthPercent) || 100, 12, 100);
  const heightPercent = clamp(Number(item.photoHeightPercent) || 100, 12, 100);
  return {
    xPercent: clamp(Number(item.photoXPercent) || 0, 0, 100 - widthPercent),
    yPercent: clamp(Number(item.photoYPercent) || 0, 0, 100 - heightPercent),
    widthPercent,
    heightPercent,
  };
}

async function compositeBoundedCellPhoto(src: string, item: { photoXPercent: number; photoYPercent: number; photoWidthPercent: number; photoHeightPercent: number }, workspaceWidthMm: number, workspaceHeightMm: number) {
  if (!src) return '';
  const geometry = boundedCellPhotoGeometry(item);
  const canvas = window.document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(workspaceWidthMm * COMPOSITE_PX_PER_MM));
  canvas.height = Math.max(1, Math.round(workspaceHeightMm * COMPOSITE_PX_PER_MM));
  const context = canvas.getContext('2d');
  if (!context) return src;
  const image = await loadHtmlImage(src);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    image,
    Math.round((geometry.xPercent / 100) * canvas.width),
    Math.round((geometry.yPercent / 100) * canvas.height),
    Math.round((geometry.widthPercent / 100) * canvas.width),
    Math.round((geometry.heightPercent / 100) * canvas.height),
  );
  return canvas.toDataURL('image/png');
}

function instructionPhotoGeometry(photo: InstructionPhoto, fallbackHeightMm: number) {
  const aspect = Math.max(0.08, (Number(photo.width) || 4) / Math.max(1, Number(photo.height) || 3));
  const height = clamp(Number(photo.displayHeightMm ?? photo.sizeMm ?? fallbackHeightMm), 8, 70);
  let width = photo.displayWidthMm != null ? clamp(Number(photo.displayWidthMm), 10, 175) : height * aspect;
  if (width > INSTRUCTION_WORKSPACE_WIDTH_MM) width = INSTRUCTION_WORKSPACE_WIDTH_MM;
  return {
    x: clamp(Number(photo.xMm) || 0, 0, INSTRUCTION_WORKSPACE_WIDTH_MM),
    y: Math.max(0, Number(photo.yMm) || 0),
    width,
    height,
  };
}

// The Word cell uses a composite of the actual image frames rather than 8.6 mm
// thumbnails. It preserves the user's move / resize / cropped image geometry.
async function instructionLockEquipmentChildren(D: WordApi, point: { lockEquipment: string; lockEquipmentPhotos?: Array<{
  src: string; xMm?: number | null; yMm?: number | null;
  widthMm?: number | null; heightMm?: number | null;
}> }, cellWidthMm: number, lang: AppDocument['uiLang']) {
  const photos = Array.isArray(point.lockEquipmentPhotos) ? point.lockEquipmentPhotos.filter((photo) => photo?.src) : [];
  const children: any[] = [];
  if (photos.length) {
    const sourceWidthMm = 36; // Matches InstructionEquipmentWorkspace.tsx.
    const widthMm = Math.max(8, cellWidthMm - 3);
    const scale = widthMm / sourceWidthMm;
    const frames = photos.map((photo, index) => {
      const w = clamp(Number(photo.widthMm) || 16, 6, 36);
      const h = clamp(Number(photo.heightMm) || 13, 6, 95);
      const x = clamp(photo.xMm == null ? index % 2 * 17 : Number(photo.xMm), 0, sourceWidthMm - w);
      const y = Math.max(0, photo.yMm == null ? Math.floor(index / 2) * 14 : Number(photo.yMm));
      return { photo, x, y, w, h };
    });
    const heightMm = Math.max(13, ...frames.map((frame) => frame.y + frame.h + 1.5));
    // Split unusually tall workspaces so Word's table row is not one massive image.
    const sliceMm = 65;
    const pixelsPerMm = 7;
    const decoded = await Promise.all(frames.map(async (frame) => {
      try { return { ...frame, image: await loadHtmlImage(frame.photo.src) }; }
      catch { return { ...frame, image: null }; }
    }));
    for (let offset = 0; offset < heightMm; offset += sliceMm) {
      const chunkHeightMm = Math.min(sliceMm, heightMm - offset);
      const canvas = window.document.createElement('canvas');
      canvas.width = Math.ceil(sourceWidthMm * pixelsPerMm);
      canvas.height = Math.ceil(chunkHeightMm * pixelsPerMm);
      const context = canvas.getContext('2d');
      if (!context) continue;
      for (const frame of decoded) {
        if (!frame.image || !frame.image.naturalWidth || !frame.image.naturalHeight) continue;
        // Browser rendering uses object-fit:fill, just as the upper photo workspace.
        context.drawImage(frame.image,
          Math.round(frame.x * pixelsPerMm), Math.round((frame.y - offset) * pixelsPerMm),
          Math.round(frame.w * pixelsPerMm), Math.round(frame.h * pixelsPerMm));
      }
      const run = makeImageRunFromDataUrl(D, canvas.toDataURL('image/png'), widthMm, chunkHeightMm * scale, tr('Kilitleme Ekipmanı', lang));
      if (run) children.push(new D.Paragraph({
        alignment: D.AlignmentType.LEFT, spacing: { before: 0, after: 0 }, children: [run],
      }));
    }
  }
  if (point.lockEquipment) children.push(p(D, point.lockEquipment, { size: 13.2, align: D.AlignmentType.CENTER }));
  if (!children.length) children.push(p(D, '', { size: 14 }));
  return children;
}

async function compositeInstructionPhotos(document: AppDocument) {
  const fallbackHeightMm = Number(document.instruction.photoLayout.heightMm) || 20;
  const geometries = document.instruction.photos
    .filter((photo) => Boolean(photo.src))
    .map((photo) => ({ photo, geometry: instructionPhotoGeometry(photo, fallbackHeightMm) }));
  const contentBottomMm = geometries.reduce((max, item) => Math.max(max, item.geometry.y + item.geometry.height), 0);
  // Arayüzdeki dinamik fotoğraf alanıyla aynı davranış: boş/az içerikte 30 mm,
  // fotoğraf alt sınırı aşağı indikçe alan da aşağı doğru büyür.
  const workspaceHeightMm = clamp(Math.max(30, contentBottomMm > 0 ? contentBottomMm + 2 : 30), 30, 180);
  const canvas = window.document.createElement('canvas');
  canvas.width = Math.round(INSTRUCTION_WORKSPACE_WIDTH_MM * COMPOSITE_PX_PER_MM);
  canvas.height = Math.round(workspaceHeightMm * COMPOSITE_PX_PER_MM);
  const context = canvas.getContext('2d');
  if (!context) return { dataUrl: '', heightMm: workspaceHeightMm };
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (const { photo, geometry } of geometries) {
    const image = await loadHtmlImage(photo.src);
    context.drawImage(
      image,
      Math.round(geometry.x * COMPOSITE_PX_PER_MM),
      Math.round(geometry.y * COMPOSITE_PX_PER_MM),
      Math.round(geometry.width * COMPOSITE_PX_PER_MM),
      Math.round(geometry.height * COMPOSITE_PX_PER_MM),
    );
  }
  return { dataUrl: canvas.toDataURL('image/png'), heightMm: workspaceHeightMm };
}

function makeImageRunFromDataUrl(D: WordApi, dataUrl: string, widthMm: number, heightMm: number, title: string) {
  const media = dataUrlParts(dataUrl);
  if (!media) return null;
  return new D.ImageRun({
    data: media.bytes,
    type: media.type,
    transformation: { width: mmToPx(widthMm), height: mmToPx(heightMm) },
    altText: { title, description: title, name: title },
  });
}

async function makeImageRunFromSource(D: WordApi, source: string, widthMm: number, heightMm: number, title: string) {
  if (!source) return null;
  const inline = dataUrlParts(source);
  const media = inline ?? await fetchImageBytes(source);
  if (!media) return null;
  return new D.ImageRun({
    data: media.bytes,
    type: media.type,
    transformation: { width: mmToPx(widthMm), height: mmToPx(heightMm) },
    altText: { title, description: title, name: title },
  });
}

function commonHeader(D: WordApi, logo: { type: ImageKind; bytes: Uint8Array } | null, title: string, lang: AppDocument['uiLang'], instruction = false) {
  const widths = instruction ? [34, INSTRUCTION_CONTENT_WIDTH_MM - 61, 27] : [42, SOP_CONTENT_WIDTH_MM - 75, 33];
  const logoChildren: WordChild[] = [];
  if (logo) {
    logoChildren.push(imageParagraph(D, new D.ImageRun({
      data: logo.bytes,
      type: logo.type,
      transformation: { width: mmToPx(instruction ? 29 : 40), height: mmToPx(instruction ? 14.5 : 18) },
      altText: { title: 'Lesaffre Türkiye', description: 'Lesaffre Türkiye', name: 'Lesaffre Türkiye' },
    }), D.AlignmentType.LEFT));
  } else {
    logoChildren.push(p(D, 'LESAFFRE', { bold: true, size: 18 }));
  }
  return tbl(D, [trw(D, [
    tc(D, logoChildren, { widthMm: widths[0], borders: noBorders(D), valign: (D.VerticalAlignTable ?? D.VerticalAlign).TOP, marginsMm: 0 }),
    tc(D, [p(D, title, { bold: instruction, size: instruction ? 30.6 : 38, align: D.AlignmentType.CENTER })], { widthMm: widths[1], borders: noBorders(D), valign: (D.VerticalAlignTable ?? D.VerticalAlign).TOP, marginsMm: 0 }),
    tc(D, [p(D, tr('Kurum İçi / Internal', lang), { bold: true, color: C.orange, size: instruction ? 14.6 : 16, align: D.AlignmentType.RIGHT })], { widthMm: widths[2], borders: noBorders(D), valign: (D.VerticalAlignTable ?? D.VerticalAlign).TOP, marginsMm: 0 }),
  ], { heightMm: instruction ? 19 : 25, exact: true })], widths, { borders: noBorders(D) });
}

function pageProps(D: WordApi, instruction = false) {
  return {
    type: D.SectionType.NEXT_PAGE,
    page: {
      size: { width: mmToTwip(A4_WIDTH_MM), height: mmToTwip(A4_HEIGHT_MM), orientation: D.PageOrientation.PORTRAIT },
      margin: instruction
        ? { top: mmToTwip(INSTRUCTION_MARGIN_TOP_MM), bottom: mmToTwip(INSTRUCTION_MARGIN_BOTTOM_MM), left: mmToTwip(INSTRUCTION_MARGIN_X_MM), right: mmToTwip(INSTRUCTION_MARGIN_X_MM) }
        : { top: mmToTwip(SOP_MARGIN_TOP_MM), bottom: mmToTwip(SOP_MARGIN_BOTTOM_MM), left: mmToTwip(SOP_MARGIN_X_MM), right: mmToTwip(SOP_MARGIN_X_MM) },
    },
  };
}

function checkboxText(checked: boolean, label: string) {
  return `${checked ? '☑' : '☐'} ${label}`;
}

function personTable(D: WordApi, title: string, people: Person[], lang: AppDocument['uiLang'], widthMm = SOP_CONTENT_WIDTH_MM) {
  const widths = [10, 35, 30, 38, 40, widthMm - 153];
  const rows = [
    trw(D, [tc(D, title, { span: 6, widthMm, bold: true, size: 18, align: D.AlignmentType.LEFT, fill: C.light })]),
    trw(D, [
      tc(D, tr('No', lang), { widthMm: widths[0], bold: true, size: 16, align: D.AlignmentType.CENTER, fill: C.light }),
      tc(D, tr('İsim', lang), { widthMm: widths[1], bold: true, size: 16, align: D.AlignmentType.CENTER, fill: C.light }),
      tc(D, tr('Telefon', lang), { widthMm: widths[2], bold: true, size: 16, align: D.AlignmentType.CENTER, fill: C.light }),
      tc(D, tr('Bölüm / Şirket', lang), { widthMm: widths[3], bold: true, size: 16, align: D.AlignmentType.CENTER, fill: C.light }),
      tc(D, `${tr('Görev', lang)} / ${tr('Tarih', lang)}`, { widthMm: widths[4], bold: true, size: 16, align: D.AlignmentType.CENTER, fill: C.light }),
      tc(D, tr('İmza', lang), { widthMm: widths[5], bold: true, size: 16, align: D.AlignmentType.CENTER, fill: C.light }),
    ], { heightMm: 7 }),
  ];
  people.forEach((person, index) => {
    rows.push(trw(D, [
      tc(D, String(index + 1), { widthMm: widths[0], size: 16, align: D.AlignmentType.CENTER }),
      tc(D, clean(person.name), { widthMm: widths[1], size: 16 }),
      tc(D, clean(person.phone), { widthMm: widths[2], size: 16 }),
      tc(D, clean(person.department), { widthMm: widths[3], size: 16 }),
      tc(D, clean(person.duty || person.date), { widthMm: widths[4], size: 16 }),
      tc(D, clean(person.signature), { widthMm: widths[5], size: 16 }),
    ], { heightMm: 8 }));
  });
  return tbl(D, rows, widths);
}

async function sopGeneralPage(D: WordApi, document: AppDocument, logo: any) {
  const lang = document.uiLang;
  const children: WordChild[] = [commonHeader(D, logo, tr('LOTO STANDART OPERASYON PROSEDÜRÜ', lang), lang)];
  const metaWidths = [34, 34, 28, 41, 53];
  children.push(tbl(D, [
    trw(D, [
      tc(D, tr('Ekipman:', lang), { widthMm: metaWidths[0], bold: true, size: 16 }),
      tc(D, document.meta.equipment, { widthMm: metaWidths[1], size: 16 }),
      tc(D, tr('Lokasyon:', lang), { widthMm: metaWidths[2], bold: true, size: 16 }),
      tc(D, document.meta.location, { widthMm: metaWidths[3], size: 16 }),
      tc(D, [
        p(D, `${tr('Yayınlanma Tarihi:', lang)} ${document.meta.publishDate}`, { size: 14.5 }),
        p(D, `${tr('Revizyon:', lang)} ${document.meta.revision}`, { size: 14.5 }),
        p(D, `${tr('LOTO SOP Numarası:', lang)} ${document.meta.sopNo}`, { size: 14.5 }),
        p(D, `${tr('Referans LOTO Talimat Numarası:', lang)} ${document.meta.referenceNo}`, { size: 14.5 }),
      ], { widthMm: metaWidths[4], rowSpan: 2, valign: (D.VerticalAlignTable ?? D.VerticalAlign).TOP, marginsMm: 1 }),
    ], { heightMm: 9 }),
    trw(D, [
      tc(D, tr('İş Tanımı:', lang), { widthMm: metaWidths[0], bold: true, size: 16 }),
      tc(D, document.meta.jobDescription, { widthMm: metaWidths[1] + metaWidths[2] + metaWidths[3], span: 3, size: 16 }),
    ], { heightMm: 9 }),
  ], metaWidths));

  children.push(spacer(D, 1.5));
  const selectedLotoTypes = [
    document.lotoType.simple ? tr('Basit LOTO: En fazla bir adet departman tarafından yapılan', lang) : '',
    document.lotoType.complex ? tr('Kompleks LOTO: Birden fazla departmanın dahil olduğu, LOTO SOP veya LOTO Talimatı bulunmayan', lang) : '',
  ].filter(Boolean);
  children.push(tbl(D, [trw(D, [
    tc(D, selectedLotoTypes.length ? selectedLotoTypes.map((label) => `☑ ${label}`).join('     ') : tr('Seçim yapılmamış', lang), {
      widthMm: SOP_CONTENT_WIDTH_MM,
      bold: selectedLotoTypes.length > 0,
      size: 20,
      align: D.AlignmentType.CENTER,
      borders: noBorders(D),
    }),
  ])], [SOP_CONTENT_WIDTH_MM], { borders: noBorders(D) }));

  if (document.coverPhoto) {
    const cover = await compositeCoverPhoto(document);
    const run = cover ? makeImageRunFromDataUrl(D, cover, COVER_OUTER_WIDTH_MM, COVER_OUTER_HEIGHT_MM, tr('LOTO SOP kapak fotoğrafı', lang)) : null;
    if (run) {
      children.push(spacer(D, 1));
      children.push(imageParagraph(D, run));
    }
  }

  children.push(spacer(D, 1));
  const ppeWidths = [SOP_CONTENT_WIDTH_MM / 3, SOP_CONTENT_WIDTH_MM / 3, SOP_CONTENT_WIDTH_MM / 3];
  const selectedPpe = document.ppe.filter((item) => item.checked);
  const ppeRows: any[] = [];
  if (selectedPpe.length) {
    for (let i = 0; i < selectedPpe.length; i += 3) {
      const cells: any[] = [];
      for (const offset of [0, 1, 2]) {
        const item = selectedPpe[i + offset];
        if (!item) {
          cells.push(tc(D, '', { widthMm: ppeWidths[offset], fill: C.white, marginsMm: 1.2 }));
          continue;
        }
        const iconRuns = (await Promise.all(
          getPpeIconSources(item).map((source) => makeImageRunFromSource(D, source, 9.5, 9.5, tr(item.label, lang))),
        )).filter(Boolean);
        const content: WordChild[] = [];
        if (iconRuns.length) {
          content.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 0, after: 40 }, children: iconRuns }));
        }
        content.push(p(D, `☑ ${tr(item.label, lang)}`, { bold: true, size: 15, align: D.AlignmentType.CENTER }));
        cells.push(tc(D, content, {
          widthMm: ppeWidths[offset], fill: C.greenSoft, marginsMm: 1.2,
        }));
      }
      ppeRows.push(trw(D, cells, { heightMm: 15 }));
    }
  } else {
    ppeRows.push(trw(D, [
      tc(D, tr('Seçim yapılmamış', lang), { span: 3, widthMm: SOP_CONTENT_WIDTH_MM, size: 15.5, align: D.AlignmentType.CENTER, fill: C.white, marginsMm: 1.2 }),
    ], { heightMm: 9 }));
  }
  children.push(tbl(D, ppeRows, ppeWidths));
  children.push(spacer(D, 2));

  const energyWidths = [65, 65, 60];
  const selectedEnergies = document.energies.filter((item) => item.checked);
  const energyLeftRows: any[] = [];
  if (selectedEnergies.length) {
    for (let i = 0; i < selectedEnergies.length; i += 2) {
      const rowCells: any[] = [];
      for (const offset of [0, 1]) {
        const item = selectedEnergies[i + offset];
        if (!item) {
          rowCells.push(tc(D, '', { widthMm: 65, fill: C.white, marginsMm: 1 }));
          continue;
        }
        const icon = getEnergyIconSource(item);
        const iconRun = icon ? await makeImageRunFromSource(D, icon, 8, 8, tr(item.label, lang)) : null;
        const cellChildren: WordChild[] = [];
        if (iconRun) cellChildren.push(imageParagraph(D, iconRun));
        cellChildren.push(p(D, `☑ ${tr(item.label, lang)}`, { bold: true, size: 14.5, align: D.AlignmentType.CENTER }));
        rowCells.push(tc(D, cellChildren, {
          widthMm: 65, fill: C.blueSoft, marginsMm: 1,
        }));
      }
      energyLeftRows.push(trw(D, rowCells, { heightMm: 13 }));
    }
  } else {
    energyLeftRows.push(trw(D, [
      tc(D, tr('Seçim yapılmamış', lang), { span: 2, widthMm: 130, size: 15.5, align: D.AlignmentType.CENTER, fill: C.white, marginsMm: 1 }),
    ], { heightMm: 8 }));
  }
  const nestedEnergy = tbl(D, energyLeftRows, [65, 65], { widthMm: 130 });
  children.push(tbl(D, [
    trw(D, [
      tc(D, tr('LOTO Uygulanacak Enerji Tipi', lang), { span: 2, widthMm: 130, bold: true, size: 20, align: D.AlignmentType.CENTER, fill: C.light }),
      tc(D, tr('Diğer', lang), { widthMm: 60, bold: true, size: 20, align: D.AlignmentType.CENTER, fill: C.light }),
    ], { heightMm: 8 }),
    trw(D, [
      tc(D, [nestedEnergy], { span: 2, widthMm: 130, marginsMm: 0 }),
      tc(D, document.otherEnergy, { widthMm: 60, size: 16, valign: (D.VerticalAlignTable ?? D.VerticalAlign).TOP }),
    ], { heightMm: 34 }),
  ], energyWidths));
  return children;
}

function authorizedWorkersTable(D: WordApi, document: AppDocument) {
  const lang = document.uiLang;
  const widths = [30.4, 33, 30.4, 33, 30.4, 32.8];
  const rows: any[] = [trw(D, [tc(D, tr('Yetkili Çalışanlar', lang), { span: 6, widthMm: SOP_CONTENT_WIDTH_MM, bold: true, size: 17.5, fill: C.light })], { heightMm: 7 })];
  document.workers.forEach((person) => {
    rows.push(trw(D, [
      tc(D, `${tr('İsim', lang)}:`, { widthMm: widths[0], bold: true, size: 16 }),
      tc(D, person.name, { widthMm: widths[1], size: 16 }),
      tc(D, `${tr('Tarih', lang)}:`, { widthMm: widths[2], bold: true, size: 16 }),
      tc(D, person.date || person.duty, { widthMm: widths[3], size: 16 }),
      tc(D, `${tr('Bölüm', lang)}:`, { widthMm: widths[4], bold: true, size: 16 }),
      tc(D, person.department, { widthMm: widths[5], size: 16 }),
    ], { heightMm: 8 }));
    rows.push(trw(D, [
      tc(D, `${tr('Telefon', lang)}:`, { widthMm: widths[0], bold: true, size: 16 }),
      tc(D, person.phone, { widthMm: widths[1], size: 16 }),
      tc(D, `${tr('Saat', lang)}:`, { widthMm: widths[2], bold: true, size: 16 }),
      tc(D, person.time, { widthMm: widths[3], size: 16 }),
      tc(D, `${tr('İmza', lang)}:`, { widthMm: widths[4], bold: true, size: 16 }),
      tc(D, person.signature, { widthMm: widths[5], size: 16 }),
    ], { heightMm: 8 }));
  });
  return tbl(D, rows, widths);
}

function verifierTable(D: WordApi, document: AppDocument) {
  const lang = document.uiLang;
  const widths = [32, 31, 32, 31, 32, 32];
  return tbl(D, [
    trw(D, [tc(D, tr('Doğrulayan: Bu kısım yalnızca kompleks LOTO uygulamasında doldurulacaktır.', lang), { span: 6, widthMm: SOP_CONTENT_WIDTH_MM, bold: true, size: 16 })]),
    trw(D, [
      tc(D, `${tr('İsim', lang)}:`, { widthMm: widths[0], bold: true, size: 16 }), tc(D, document.verifier.name, { widthMm: widths[1], size: 16 }),
      tc(D, `${tr('Tarih / Saat', lang)}:`, { widthMm: widths[2], bold: true, size: 16 }), tc(D, `${document.verifier.date}${document.verifier.date || document.verifier.time ? ' / ' : ''}${document.verifier.time}`, { widthMm: widths[3], size: 16 }),
      tc(D, `${tr('Bölüm', lang)}:`, { widthMm: widths[4], bold: true, size: 16 }), tc(D, document.verifier.department, { widthMm: widths[5], size: 16 }),
    ], { heightMm: 8 }),
    trw(D, [
      tc(D, `${tr('Telefon', lang)}:`, { widthMm: widths[0], bold: true, size: 16 }), tc(D, document.verifier.phone, { widthMm: widths[1], size: 16 }),
      tc(D, `${tr('Görev', lang)}:`, { widthMm: widths[2], bold: true, size: 16 }), tc(D, document.verifier.duty, { widthMm: widths[3], size: 16 }),
      tc(D, `${tr('İmza', lang)}:`, { widthMm: widths[4], bold: true, size: 16 }), tc(D, document.verifier.signature, { widthMm: widths[5], size: 16 }),
    ], { heightMm: 8 }),
  ], widths);
}

function sopSafetyPage(D: WordApi, document: AppDocument, logo: any) {
  const lang = document.uiLang;
  const children: WordChild[] = [commonHeader(D, logo, tr('LOTO STANDART OPERASYON PROSEDÜRÜ', lang), lang)];
  const safetyChildren: WordChild[] = [p(D, tr('İş Güvenliği Önlemleri', lang), { bold: true, size: 26, align: D.AlignmentType.CENTER, after: 80 })];
  document.safety.forEach((item, index) => safetyChildren.push(p(D, `${index + 1}. ${tr(item, lang)}`, { bold: true, size: 18.4, after: 35, line: 230 })));
  children.push(tbl(D, [trw(D, [tc(D, safetyChildren, { widthMm: SOP_CONTENT_WIDTH_MM, borders: allBorders(D, C.danger, 14), valign: (D.VerticalAlignTable ?? D.VerticalAlign).TOP, marginsMm: 2 })])], [SOP_CONTENT_WIDTH_MM], { borders: allBorders(D, C.danger, 14) }));
  children.push(spacer(D, 3));
  children.push(sectionTitle(D, tr('1. LOTO Yapacak Yetkilendirilmiş Personel Birimi', lang), SOP_CONTENT_WIDTH_MM));
  children.push(tbl(D, [trw(D, [
    tc(D, checkboxText(document.units.production, tr('Üretim', lang)), { widthMm: SOP_CONTENT_WIDTH_MM / 3, bold: true, size: 18, align: D.AlignmentType.CENTER }),
    tc(D, checkboxText(document.units.maintenance, tr('Bakım', lang)), { widthMm: SOP_CONTENT_WIDTH_MM / 3, bold: true, size: 18, align: D.AlignmentType.CENTER }),
    tc(D, checkboxText(document.units.contractor, tr('Müteahhit Firma', lang)), { widthMm: SOP_CONTENT_WIDTH_MM / 3, bold: true, size: 18, align: D.AlignmentType.CENTER }),
  ], { heightMm: 9 })], [SOP_CONTENT_WIDTH_MM / 3, SOP_CONTENT_WIDTH_MM / 3, SOP_CONTENT_WIDTH_MM / 3]));
  children.push(spacer(D, 1.5));
  children.push(authorizedWorkersTable(D, document));
  children.push(spacer(D, 1.5));
  children.push(verifierTable(D, document));
  return children;
}

async function sopEquipmentPage(D: WordApi, document: AppDocument, logo: any) {
  const lang = document.uiLang;
  const widths = [10, 35, 45, 22, 78];
  const rows: any[] = [
    trw(D, [tc(D, tr('2. Kullanılacak LOTO Ekipmanları', lang), { span: 5, widthMm: SOP_CONTENT_WIDTH_MM, bold: true, size: 18, fill: C.light })]),
    trw(D, [
      tc(D, tr('No', lang), { widthMm: widths[0], bold: true, size: 16, align: D.AlignmentType.CENTER, fill: C.light }),
      tc(D, tr('Ekipman Numarası', lang), { widthMm: widths[1], bold: true, size: 16, align: D.AlignmentType.CENTER, fill: C.light }),
      tc(D, tr('Ekipman İsmi', lang), { widthMm: widths[2], bold: true, size: 16, align: D.AlignmentType.CENTER, fill: C.light }),
      tc(D, tr('Kullanılan Adet', lang), { widthMm: widths[3], bold: true, size: 16, align: D.AlignmentType.CENTER, fill: C.light }),
      tc(D, tr('Ekipman Fotoğrafı', lang), { widthMm: widths[4], bold: true, size: 16, align: D.AlignmentType.CENTER, fill: C.light }),
    ], { heightMm: 8 }),
  ];
  for (let index = 0; index < document.equipments.length; index += 1) {
    const item = document.equipments[index];
    const photoDataUrl = item.photo ? await compositeBoundedCellPhoto(item.photo, item, widths[4] - 4, 25) : '';
    const run = photoDataUrl ? makeImageRunFromDataUrl(D, photoDataUrl, widths[4] - 4, 25, tr('LOTO fotoğrafı', lang)) : null;
    rows.push(trw(D, [
      tc(D, String(index + 1), { widthMm: widths[0], size: 17, align: D.AlignmentType.CENTER }),
      tc(D, item.equipmentNo, { widthMm: widths[1], size: 17, align: D.AlignmentType.CENTER }),
      tc(D, tr(item.name, lang), { widthMm: widths[2], size: 17, align: D.AlignmentType.CENTER }),
      tc(D, item.qty, { widthMm: widths[3], size: 17, align: D.AlignmentType.CENTER }),
      tc(D, run ? [imageParagraph(D, run)] : '', { widthMm: widths[4], align: D.AlignmentType.CENTER, marginsMm: 0.8 }),
    ], { heightMm: 30 }));
  }
  return [commonHeader(D, logo, tr('LOTO STANDART OPERASYON PROSEDÜRÜ', lang), lang), tbl(D, rows, widths)];
}

function sopPersonnelPointsPage(D: WordApi, document: AppDocument, logo: any) {
  const lang = document.uiLang;
  const children: WordChild[] = [commonHeader(D, logo, tr('LOTO STANDART OPERASYON PROSEDÜRÜ', lang), lang)];
  children.push(personTable(D, tr('3. Çalışacak Personel Listesi', lang), document.personnel, lang));
  children.push(spacer(D, 3));
  const widths = [9, 32, 43, 43, 25, 38];
  const rows: any[] = [
    trw(D, [tc(D, tr('4. LOTO Noktaları', lang), { span: 6, widthMm: SOP_CONTENT_WIDTH_MM, bold: true, size: 18, fill: C.light })]),
    trw(D, [
      tc(D, tr('No', lang), { widthMm: widths[0], bold: true, size: 15.5, align: D.AlignmentType.CENTER, fill: C.light }),
      tc(D, tr('Kilitleme Noktası', lang), { widthMm: widths[1], bold: true, size: 15.5, align: D.AlignmentType.CENTER, fill: C.light }),
      tc(D, tr('LOTO Uygulanacak Ekipman Tipi', lang), { widthMm: widths[2], bold: true, size: 15.5, align: D.AlignmentType.CENTER, fill: C.light }),
      tc(D, tr('Kullanılan LOTO Ekipman Tipi', lang), { widthMm: widths[3], bold: true, size: 15.5, align: D.AlignmentType.CENTER, fill: C.light }),
      tc(D, tr('Yapılan İşlem', lang), { widthMm: widths[4], bold: true, size: 15.5, align: D.AlignmentType.CENTER, fill: C.light }),
      tc(D, tr('Yetkili Personel', lang), { widthMm: widths[5], bold: true, size: 15.5, align: D.AlignmentType.CENTER, fill: C.light }),
    ], { heightMm: 9 }),
  ];
  document.points.forEach((point, index) => rows.push(trw(D, [
    tc(D, String(index + 1), { widthMm: widths[0], size: 15.5, align: D.AlignmentType.CENTER }),
    tc(D, point.pointNo, { widthMm: widths[1], size: 15.5, align: D.AlignmentType.CENTER }),
    tc(D, tr(point.equipmentType, lang), { widthMm: widths[2], size: 15.5, align: D.AlignmentType.CENTER }),
    tc(D, tr(point.lockType, lang), { widthMm: widths[3], size: 15.5, align: D.AlignmentType.CENTER }),
    tc(D, tr(point.action, lang), { widthMm: widths[4], size: 15.5, align: D.AlignmentType.CENTER }),
    tc(D, point.authorizedPerson, { widthMm: widths[5], size: 15.5, align: D.AlignmentType.CENTER }),
  ], { heightMm: 12 })));
  children.push(tbl(D, rows, widths));
  return children;
}

async function sopStepsPages(D: WordApi, document: AppDocument, logo: any) {
  const lang = document.uiLang;
  const groups: typeof document.steps[] = [];
  for (let i = 0; i < document.steps.length; i += 6) groups.push(document.steps.slice(i, i + 6));
  if (!groups.length) groups.push([]);
  const pages: WordChild[][] = [];
  for (let pageIndex = 0; pageIndex < groups.length; pageIndex += 1) {
    const group = groups[pageIndex];
    const children: WordChild[] = [commonHeader(D, logo, tr('LOTO STANDART OPERASYON PROSEDÜRÜ', lang), lang)];
    const widths = [13, 52, 43, 27, 27, 28];
    const rows: any[] = [
      trw(D, [tc(D, pageIndex ? tr('5. LOTO Talimatı - devam', lang) : tr('5. LOTO Talimatı', lang), { span: 6, widthMm: SOP_CONTENT_WIDTH_MM, bold: true, size: 18, fill: C.light })]),
      trw(D, [
        tc(D, tr('Adımlar', lang), { widthMm: widths[0], bold: true, size: 15.5, align: D.AlignmentType.CENTER, fill: C.light }),
        tc(D, tr('Açıklama', lang), { widthMm: widths[1], bold: true, size: 15.5, align: D.AlignmentType.CENTER, fill: C.light }),
        tc(D, tr('Fotoğraf', lang), { widthMm: widths[2], bold: true, size: 15.5, align: D.AlignmentType.CENTER, fill: C.light }),
        tc(D, tr('Yetkili', lang), { widthMm: widths[3], bold: true, size: 15.5, align: D.AlignmentType.CENTER, fill: C.light }),
        tc(D, tr('Onaylayan', lang), { widthMm: widths[4], bold: true, size: 15.5, align: D.AlignmentType.CENTER, fill: C.light }),
        tc(D, tr('Doğrulayan', lang), { widthMm: widths[5], bold: true, size: 15.5, align: D.AlignmentType.CENTER, fill: C.light }),
      ], { heightMm: 8 }),
    ];
    for (let localIndex = 0; localIndex < group.length; localIndex += 1) {
      const step = group[localIndex];
      const globalIndex = pageIndex * 6 + localIndex;
      const photoDataUrl = step.photo ? await compositeBoundedCellPhoto(step.photo, step, widths[2] - 3, 27) : '';
      const run = photoDataUrl ? makeImageRunFromDataUrl(D, photoDataUrl, widths[2] - 3, 27, tr('LOTO fotoğrafı', lang)) : null;
      rows.push(trw(D, [
        tc(D, String(globalIndex + 1), { widthMm: widths[0], size: 15.5, align: D.AlignmentType.CENTER }),
        tc(D, tr(step.description, lang), { widthMm: widths[1], size: 15.5, valign: (D.VerticalAlignTable ?? D.VerticalAlign).TOP }),
        tc(D, run ? [imageParagraph(D, run)] : '', { widthMm: widths[2], marginsMm: 0.5, align: D.AlignmentType.CENTER }),
        tc(D, step.authorized, { widthMm: widths[3], size: 15.5, align: D.AlignmentType.CENTER }),
        tc(D, step.approver, { widthMm: widths[4], size: 15.5, align: D.AlignmentType.CENTER }),
        tc(D, step.verifier, { widthMm: widths[5], size: 15.5, align: D.AlignmentType.CENTER }),
      ], { heightMm: 29 }));
    }
    children.push(tbl(D, rows, widths));
    if (pageIndex === groups.length - 1) {
      children.push(spacer(D, 3));
      children.push(sectionTitle(D, tr('6. Devreye Alma', lang), SOP_CONTENT_WIDTH_MM));
      children.push(p(D, tr('* Kilitleme adımlarını ters sırayla izleyerek izolasyon kaldırma işlemini gerçekleştirin.', lang), { bold: true, size: 18, after: 70 }));
      children.push(personTable(D, tr('Devreye Alma Kişileri', lang), document.commissioning, lang));
    }
    pages.push(children);
  }
  return pages;
}


async function compositeEnergySourceTag(codeValue: string, numberValue: string) {
  const tag = getEnergySourceTag(codeValue);
  if (!tag) return '';
  const image = await loadHtmlImage(tag.src);
  const canvas = window.document.createElement('canvas');
  canvas.width = Math.max(1, image.naturalWidth || 1200);
  canvas.height = Math.max(1, image.naturalHeight || 600);
  const context = canvas.getContext('2d');
  if (!context) return '';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const number = String(numberValue ?? '').trim();
  if (number) {
    const fontScale = number.length <= 2 ? tag.numberFontScale : number.length === 3 ? tag.numberFontScale * 0.88 : tag.numberFontScale * 0.78;
    const fontSize = Math.round(canvas.height * fontScale);
    context.font = `700 ${fontSize}px Arial, sans-serif`;
    context.fillStyle = tag.numberColor;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const left = canvas.width * tag.numberLeftPct;
    const width = canvas.width * tag.numberWidthPct;
    context.fillText(number, left + width / 2, canvas.height * 0.532, width);
  }
  return canvas.toDataURL('image/png');
}

async function instructionIconParagraph(D: WordApi, keys: string[], kind: 'ppe' | 'warning') {
  const children: any[] = [];
  for (const key of keys) {
    const source = getInstructionIconSource(kind, key);
    if (!source) continue;
    const run = await makeImageRunFromSource(D, source, 9, 9, getInstructionIconLabel(kind, key));
    if (!run) continue;
    if (children.length) children.push(new D.TextRun({ text: ' ' }));
    children.push(run);
  }
  return new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children });
}

async function instructionPage(D: WordApi, document: AppDocument, logo: any) {
  const lang = document.uiLang;
  const ins = document.instruction;
  const children: WordChild[] = [commonHeader(D, logo, tr('KİLİTLEME / ETİKETLEME TALİMATI', lang), lang, true)];
  const metaWidths = [34, 34, 28, 41, 53];
  children.push(tbl(D, [
    trw(D, [
      tc(D, tr('Ekipman:', lang), { widthMm: metaWidths[0], bold: true, size: 16 }),
      tc(D, ins.meta.equipment, { widthMm: metaWidths[1], size: 16 }),
      tc(D, tr('Lokasyon:', lang), { widthMm: metaWidths[2], bold: true, size: 16 }),
      tc(D, ins.meta.location, { widthMm: metaWidths[3], size: 16 }),
      tc(D, [
        p(D, `${tr('Yayınlanma Tarihi:', lang)} ${ins.meta.publishDate}`, { size: 14.5 }),
        p(D, `${tr('Revizyon:', lang)} ${ins.meta.revision}`, { size: 14.5 }),
        p(D, `${tr('LOTO SOP Numarası:', lang)} ${ins.meta.sopNo}`, { size: 14.5 }),
        p(D, `${tr('Referans LOTO Talimat Numarası:', lang)} ${ins.meta.referenceNo}`, { size: 14.5 }),
      ], { widthMm: metaWidths[4], rowSpan: 2, valign: (D.VerticalAlignTable ?? D.VerticalAlign).TOP, marginsMm: 1 }),
    ], { heightMm: 9 }),
    trw(D, [
      tc(D, tr('İş Tanımı:', lang), { widthMm: metaWidths[0], bold: true, size: 16 }),
      tc(D, ins.meta.jobDescription, { widthMm: metaWidths[1] + metaWidths[2] + metaWidths[3], span: 3, size: 16 }),
    ], { heightMm: 9 }),
  ], metaWidths));

  children.push(spacer(D, 1));
  children.push(tbl(D, [
    trw(D, [
      tc(D, tr('KULLANILMASI GEREKEN KKD', lang), { widthMm: 97, fill: C.blue, color: C.white, bold: true, size: 16.4, align: D.AlignmentType.CENTER }),
      tc(D, tr('TEHLİKELER', lang), { widthMm: 97, fill: C.yellow, color: C.text, bold: true, size: 16.4, align: D.AlignmentType.CENTER }),
    ]),
    trw(D, [
      tc(D, [await instructionIconParagraph(D, ins.ppeIcons, 'ppe')], { widthMm: 97, valign: (D.VerticalAlignTable ?? D.VerticalAlign).CENTER }),
      tc(D, [await instructionIconParagraph(D, ins.hazardIcons, 'warning')], { widthMm: 97, valign: (D.VerticalAlignTable ?? D.VerticalAlign).CENTER }),
    ], { heightMm: 12 }),
  ], [97, 97]));

  children.push(spacer(D, 1));
  const lockingRight = [
    p(D, tr('Kilitleme Adımları', lang), { bold: true, color: C.white, size: 15.4, align: D.AlignmentType.CENTER }),
    p(D, tr(INSTRUCTION_LOCKING_STEPS, lang), { size: 14, line: 220 }),
  ];
  children.push(tbl(D, [trw(D, [
    tc(D, [
      p(D, tr('Kilitleme Noktası', lang), { bold: true, size: 14.5 }),
      p(D, ins.pointCount, { bold: true, color: C.white, size: 27, align: D.AlignmentType.CENTER }),
    ], { widthMm: 32, fill: C.red, color: C.white, bold: true, align: D.AlignmentType.CENTER }),
    tc(D, lockingRight, { widthMm: 162, size: 14, valign: (D.VerticalAlignTable ?? D.VerticalAlign).TOP }),
  ])], [32, 162]));

  const composite = await compositeInstructionPhotos(document);
  if (composite.dataUrl) {
    const run = makeImageRunFromDataUrl(D, composite.dataUrl, INSTRUCTION_WORKSPACE_WIDTH_MM, composite.heightMm, tr('Kilitleme / Etiketleme fotoğraf çalışma alanı', lang));
    if (run) {
      children.push(spacer(D, 1));
      children.push(imageParagraph(D, run));
    }
  }

  children.push(spacer(D, 1));
  const pointWidths = [35, 35, 42, 42, 40];
  const pointRows: any[] = [trw(D, [
    tc(D, tr('Enerji Kaynağı', lang), { widthMm: pointWidths[0], fill: C.light, bold: true, size: 14.3, align: D.AlignmentType.CENTER }),
    tc(D, tr('Sorumlu', lang), { widthMm: pointWidths[1], fill: C.light, bold: true, size: 14.3, align: D.AlignmentType.CENTER }),
    tc(D, tr('Yöntem', lang), { widthMm: pointWidths[2], fill: C.light, bold: true, size: 14.3, align: D.AlignmentType.CENTER }),
    tc(D, tr('Kilitleme Ekipmanı', lang), { widthMm: pointWidths[3], fill: C.light, bold: true, size: 14.3, align: D.AlignmentType.CENTER }),
    tc(D, tr('Kontrol Yöntemi', lang), { widthMm: pointWidths[4], fill: C.light, bold: true, size: 14.3, align: D.AlignmentType.CENTER }),
  ], { heightMm: 8 })];
  for (const point of ins.points) {
    const legacy = parseEnergySource(point.energySource);
    const code = point.energyTagCode || legacy.code;
    const number = point.energyTagNumber || legacy.number;
    const tagImage = code ? await compositeEnergySourceTag(code, number) : '';
    const tagRun = tagImage ? makeImageRunFromDataUrl(D, tagImage, 29, 15.1, formatEnergySource(code, number) || tr('Enerji Kaynağı', lang)) : null;
    const energyCell = tagRun
      ? [imageParagraph(D, tagRun)]
      : [p(D, point.energySource, { size: 14, align: D.AlignmentType.CENTER })];
    pointRows.push(trw(D, [
      tc(D, energyCell, { widthMm: pointWidths[0], size: 14, valign: (D.VerticalAlignTable ?? D.VerticalAlign).CENTER, marginsMm: 0.5 }),
      tc(D, point.responsible, { widthMm: pointWidths[1], size: 14, valign: (D.VerticalAlignTable ?? D.VerticalAlign).TOP }),
      tc(D, point.method, { widthMm: pointWidths[2], size: 14, valign: (D.VerticalAlignTable ?? D.VerticalAlign).TOP }),
      tc(D, await instructionLockEquipmentChildren(D, point, pointWidths[3], lang), { widthMm: pointWidths[3], size: 14, valign: (D.VerticalAlignTable ?? D.VerticalAlign).TOP, marginsMm: 0.5 }),
      tc(D, point.controlMethod, { widthMm: pointWidths[4], size: 14, valign: (D.VerticalAlignTable ?? D.VerticalAlign).TOP }),
    ], { heightMm: 16.5 }));
  }
  children.push(tbl(D, pointRows, pointWidths));

  children.push(spacer(D, 1));
  children.push(tbl(D, [
    trw(D, [tc(D, tr('Kilit ve Etiketlerin Kaldırılması', lang), { widthMm: 194, fill: C.green, color: C.white, bold: true, size: 15.6, align: D.AlignmentType.CENTER })]),
    trw(D, [tc(D, tr(INSTRUCTION_REMOVAL_STEPS, lang), { widthMm: 194, size: 13.6, valign: (D.VerticalAlignTable ?? D.VerticalAlign).TOP })]),
  ], [194]));

  children.push(spacer(D, 1));
  const signerWidths = [21.34, 43.33, 21.34, 43.33, 21.34, 43.32];
  children.push(tbl(D, [
    trw(D, [
      tc(D, tr('Hazırlayan', lang), { span: 2, widthMm: signerWidths[0] + signerWidths[1], fill: C.green, color: C.white, bold: true, size: 15.4, align: D.AlignmentType.CENTER }),
      tc(D, tr('Doğrulayan', lang), { span: 2, widthMm: signerWidths[2] + signerWidths[3], fill: C.green, color: C.white, bold: true, size: 15.4, align: D.AlignmentType.CENTER }),
      tc(D, tr('Onaylayan', lang), { span: 2, widthMm: signerWidths[4] + signerWidths[5], fill: C.green, color: C.white, bold: true, size: 15.4, align: D.AlignmentType.CENTER }),
    ]),
    trw(D, [
      tc(D, tr('Adı Soyadı', lang), { widthMm: signerWidths[0], fill: 'F3F6F9', bold: true, size: 14.3 }), tc(D, ins.preparedBy.name, { widthMm: signerWidths[1], size: 14.8 }),
      tc(D, tr('Adı Soyadı', lang), { widthMm: signerWidths[2], fill: 'F3F6F9', bold: true, size: 14.3 }), tc(D, ins.verifiedBy.name, { widthMm: signerWidths[3], size: 14.8 }),
      tc(D, tr('Adı Soyadı', lang), { widthMm: signerWidths[4], fill: 'F3F6F9', bold: true, size: 14.3 }), tc(D, ins.approvedBy.name, { widthMm: signerWidths[5], size: 14.8 }),
    ], { heightMm: 8 }),
    trw(D, [
      tc(D, tr('Görevi', lang), { widthMm: signerWidths[0], fill: 'F3F6F9', bold: true, size: 14.3 }), tc(D, ins.preparedBy.duty, { widthMm: signerWidths[1], size: 14.8 }),
      tc(D, tr('Görevi', lang), { widthMm: signerWidths[2], fill: 'F3F6F9', bold: true, size: 14.3 }), tc(D, ins.verifiedBy.duty, { widthMm: signerWidths[3], size: 14.8 }),
      tc(D, tr('Görevi', lang), { widthMm: signerWidths[4], fill: 'F3F6F9', bold: true, size: 14.3 }), tc(D, ins.approvedBy.duty, { widthMm: signerWidths[5], size: 14.8 }),
    ], { heightMm: 8 }),
  ], signerWidths));
  return children;
}

function saveBlob(blob: Blob, name: string) {
  const href = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = href;
  anchor.download = name;
  anchor.style.display = 'none';
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 2500);
}

/**
 * Editable Word export.
 * - Text remains real Word text.
 * - Tables remain real Word tables.
 * - Table photos remain independent Word images.
 * - Free-position photo workspaces are composited to preserve exact geometry.
 */
export async function downloadWord(document: AppDocument) {
  const lang = document.uiLang;
  const D: WordApi = await import('docx');
  const logo = await fetchImageBytes('./lesaffre-logo.jpg');
  const sections: any[] = [];

  const addSection = (children: WordChild[], instruction = false) => {
    sections.push({ properties: pageProps(D, instruction), children });
  };

  addSection(await sopGeneralPage(D, document, logo));
  addSection(sopSafetyPage(D, document, logo));
  addSection(await sopEquipmentPage(D, document, logo));
  addSection(sopPersonnelPointsPage(D, document, logo));
  const stepPages = await sopStepsPages(D, document, logo);
  stepPages.forEach((children) => addSection(children));
  addSection(await instructionPage(D, document, logo), true);

  const wordDocument = new D.Document({
    creator: 'LOTO SOP Management',
    title: tr('LOTO SOP ve Kilitleme / Etiketleme Talimatı', lang),
    subject: 'LOTO editable Word export',
    description: tr('LOTO SOP Management uygulaması tarafından oluşturulan düzenlenebilir Word belgesi.', lang),
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 18, color: C.text },
          paragraph: { spacing: { after: 0, before: 0 } },
        },
      },
    },
    sections,
  });

  const blob = await D.Packer.toBlob(wordDocument);
  const revision = String(document.project.fileRevision).padStart(2, '0');
  const fileStem = lang === 'en'
    ? 'loto-sop-and-lockout-tagout-instruction'
    : lang === 'fr' ? 'loto-sop-et-instruction-consignation-etiquetage' : 'loto-sop-ve-kilitleme-talimati';
  saveBlob(blob, `${fileStem}-v4-rev${revision}.docx`);
}
