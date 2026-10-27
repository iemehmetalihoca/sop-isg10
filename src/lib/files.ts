import { APP_DATA_VERSION, nowStamp } from './defaults';
import { normalizeImportedDocument } from './schema';
import type { AppDocument, Lang } from './types';
import { tr } from './labels';

export function downloadJson(document: AppDocument) {
  const payload = structuredClone(document);
  payload.schemaVersion = APP_DATA_VERSION;
  payload.project.fileVersion = APP_DATA_VERSION;
  payload.project.fileRevision += 1;
  payload.project.lastModified = nowStamp();

  assertJsonRoundTrip(payload);

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  const name = payload.activeDocument === 'instruction'
    ? payload.uiLang === 'en' ? 'lockout-tagout-instruction' : payload.uiLang === 'fr' ? 'instruction-consignation-etiquetage' : 'kilitleme-etiketleme-talimati'
    : 'loto-sop';
  anchor.href = href;
  anchor.download = `${name}-v4-rev${String(payload.project.fileRevision).padStart(2, '0')}.json`;
  anchor.style.display = 'none';
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Delay URL cleanup so large JSON downloads can finish reading the Blob.
  window.setTimeout(() => URL.revokeObjectURL(href), 1500);
  return payload;
}

export async function readJsonFile(file: File) {
  const text = await file.text();
  return normalizeImportedDocument(JSON.parse(text));
}

export async function imageFileToDataUrl(file: File, lang: Lang, maxSide = 1400, quality = 0.82) {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) throw new Error(tr('Sadece PNG, JPG, WEBP veya GIF yüklenebilir.', lang));
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  if (file.type === 'image/gif') return raw;
  return new Promise<string>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const ratio = Math.min(1, maxSide / Math.max(image.width || 1, image.height || 1));
      const canvas = window.document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      const context = canvas.getContext('2d');
      if (!context) return resolve(raw);
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = () => resolve(raw);
    image.src = raw;
  });
}

function firstDifference(expected: unknown, actual: unknown, path = '$'): string | null {
  if (Object.is(expected, actual)) return null;
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) return path;
    if (expected.length !== actual.length) return `${path}.length`;
    for (let index = 0; index < expected.length; index += 1) {
      const difference = firstDifference(expected[index], actual[index], `${path}[${index}]`);
      if (difference) return difference;
    }
    return null;
  }
  if (expected && actual && typeof expected === 'object' && typeof actual === 'object') {
    const expectedRecord = expected as Record<string, unknown>;
    const actualRecord = actual as Record<string, unknown>;
    const keys = Array.from(new Set([...Object.keys(expectedRecord), ...Object.keys(actualRecord)])).sort();
    for (const key of keys) {
      if (!(key in expectedRecord) || !(key in actualRecord)) return `${path}.${key}`;
      const difference = firstDifference(expectedRecord[key], actualRecord[key], `${path}.${key}`);
      if (difference) return difference;
    }
    return null;
  }
  return path;
}

/**
 * Emulates a real cross-PC JSON transfer before the download is allowed:
 * AppDocument -> JSON text -> JSON.parse -> import schema/normalizer -> AppDocument.
 * Any field that would be dropped, reset or changed aborts the export.
 */
export function assertJsonRoundTrip(document: AppDocument) {
  const serialized = JSON.stringify(document);
  const reparsed = JSON.parse(serialized) as unknown;
  const restored = normalizeImportedDocument(reparsed);
  const difference = firstDifference(document, restored);
  if (difference) {
    throw new Error(`JSON bütünlük kontrolü başarısız. Yeniden açıldığında değişecek ilk alan: ${difference}`);
  }
  return restored;
}

