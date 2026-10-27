import tagGl from '../assets/energy-source-tags/energy-tag-gl.png';
import tagSteam from '../assets/energy-source-tags/energy-tag-s.png';
import tagElectric from '../assets/energy-source-tags/energy-tag-e.png';
import tagGas from '../assets/energy-source-tags/energy-tag-g.png';
import tagPneumatic from '../assets/energy-source-tags/energy-tag-p.png';
import tagChemical from '../assets/energy-source-tags/energy-tag-c.png';
import tagWater from '../assets/energy-source-tags/energy-tag-w.png';
import tagThermal from '../assets/energy-source-tags/energy-tag-t.png';
import tagValve from '../assets/energy-source-tags/energy-tag-v.png';

const src = (asset: { src: string } | string) => typeof asset === 'string' ? asset : asset.src;

export const ENERGY_SOURCE_TAG_CODES = ['GL', 'S', 'E', 'G', 'P', 'C', 'W', 'T', 'V'] as const;
export type EnergySourceTagCode = (typeof ENERGY_SOURCE_TAG_CODES)[number];

export type EnergySourceTagChoice = {
  code: EnergySourceTagCode;
  label: string;
  src: string;
  numberColor: string;
  numberLeftPct: number;
  numberWidthPct: number;
  numberFontScale: number;
};

export const ENERGY_SOURCE_TAG_CHOICES: EnergySourceTagChoice[] = [
  { code: 'GL', label: 'GL', src: src(tagGl), numberColor: '#00a978', numberLeftPct: 0.785, numberWidthPct: 0.105, numberFontScale: 0.24 },
  { code: 'S', label: 'S', src: src(tagSteam), numberColor: '#231f20', numberLeftPct: 0.69, numberWidthPct: 0.14, numberFontScale: 0.24 },
  { code: 'E', label: 'E', src: src(tagElectric), numberColor: '#ed1c24', numberLeftPct: 0.695, numberWidthPct: 0.14, numberFontScale: 0.24 },
  { code: 'G', label: 'G', src: src(tagGas), numberColor: '#8e44ad', numberLeftPct: 0.685, numberWidthPct: 0.145, numberFontScale: 0.24 },
  { code: 'P', label: 'P', src: src(tagPneumatic), numberColor: '#ffffff', numberLeftPct: 0.69, numberWidthPct: 0.14, numberFontScale: 0.24 },
  { code: 'C', label: 'C', src: src(tagChemical), numberColor: '#1f8c8c', numberLeftPct: 0.69, numberWidthPct: 0.14, numberFontScale: 0.24 },
  { code: 'W', label: 'W', src: src(tagWater), numberColor: '#ffffff', numberLeftPct: 0.69, numberWidthPct: 0.14, numberFontScale: 0.24 },
  { code: 'T', label: 'T', src: src(tagThermal), numberColor: '#00a878', numberLeftPct: 0.69, numberWidthPct: 0.14, numberFontScale: 0.24 },
  { code: 'V', label: 'V', src: src(tagValve), numberColor: '#231f20', numberLeftPct: 0.685, numberWidthPct: 0.145, numberFontScale: 0.24 },
];

const BY_CODE = Object.fromEntries(ENERGY_SOURCE_TAG_CHOICES.map((item) => [item.code, item])) as Record<EnergySourceTagCode, EnergySourceTagChoice>;

export function getEnergySourceTag(code: string | undefined | null) {
  return code && code in BY_CODE ? BY_CODE[code as EnergySourceTagCode] : null;
}

export function formatEnergySource(code: string | undefined | null, number: string | undefined | null) {
  const normalizedCode = String(code ?? '').trim().toUpperCase();
  const normalizedNumber = String(number ?? '').trim();
  return normalizedCode ? `${normalizedCode}${normalizedNumber}` : normalizedNumber;
}

export function parseEnergySource(value: string | undefined | null): { code: EnergySourceTagCode | ''; number: string } {
  const normalized = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const ordered = [...ENERGY_SOURCE_TAG_CODES].sort((a, b) => b.length - a.length);
  const code = ordered.find((candidate) => normalized.startsWith(candidate));
  if (!code) return { code: '', number: '' };
  const remainder = normalized.slice(code.length).replace(/^[-–—:]+/, '');
  return { code, number: remainder };
}

function createHtmlImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Enerji etiketi görseli yüklenemedi: ${source}`));
    image.src = source;
  });
}

export async function compositeEnergySourceTagDataUrl(codeValue: string | undefined | null, numberValue: string | undefined | null) {
  const tag = getEnergySourceTag(codeValue);
  if (!tag) return '';
  if (typeof window === 'undefined') return tag.src;
  const image = await createHtmlImage(tag.src);
  const canvas = window.document.createElement('canvas');
  canvas.width = Math.max(1, image.naturalWidth || 1200);
  canvas.height = Math.max(1, image.naturalHeight || 600);
  const context = canvas.getContext('2d');
  if (!context) return tag.src;
  context.clearRect(0, 0, canvas.width, canvas.height);
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
