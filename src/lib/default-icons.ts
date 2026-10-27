// Safety icon catalog bundled with the application.

import ppeFaceShield from '../assets/safety-icons/ppe/ppe-face-shield.jpg';
import ppeHarnessFallArrest from '../assets/safety-icons/ppe/ppe-harness-fall-arrest.jpg';
import ppeHearingProtection from '../assets/safety-icons/ppe/ppe-hearing-protection.jpg';
import ppeRespiratorMask from '../assets/safety-icons/ppe/ppe-respirator-mask.jpg';
import ppeBootsAntistatic from '../assets/safety-icons/ppe/ppe-boots-antistatic.jpg';
import ppeGlovesChemical from '../assets/safety-icons/ppe/ppe-gloves-chemical.png';
import ppeHelmet from '../assets/safety-icons/ppe/ppe-helmet.jpg';
import ppeBootsProtective from '../assets/safety-icons/ppe/ppe-boots-protective.jpg';
import ppeWeldingHelmet from '../assets/safety-icons/ppe/ppe-welding-helmet.jpg';
import ppeGoggles from '../assets/safety-icons/ppe/ppe-goggles.jpg';
import ppeGlovesProtective from '../assets/safety-icons/ppe/ppe-gloves-protective.jpg';
import ppeSuitProtective from '../assets/safety-icons/ppe/ppe-suit-protective.jpg';

import warningHotSurface from '../assets/safety-icons/warnings/warning-hot-surface.jpg';
import warningLaserBeam from '../assets/safety-icons/warnings/warning-laser-beam.jpg';
import warningHighNoise from '../assets/safety-icons/warnings/warning-high-noise.jpg';
import warningElectricity from '../assets/safety-icons/warnings/warning-electricity.jpg';
import warningHydraulic from '../assets/safety-icons/warnings/warning-hydraulic.jpg';
import warningMechanicalRotation from '../assets/safety-icons/warnings/warning-mechanical-rotation.jpg';
import warningSlipperySurface from '../assets/safety-icons/warnings/warning-slippery-surface.jpg';
import warningFallingObjects from '../assets/safety-icons/warnings/warning-falling-objects.jpg';
import warningSharpEdge from '../assets/safety-icons/warnings/warning-sharp-edge.jpg';
import warningCorrosive from '../assets/safety-icons/warnings/warning-corrosive.jpg';
import warningSteam from '../assets/safety-icons/warnings/warning-steam.jpg';
import warningFallHazard from '../assets/safety-icons/warnings/warning-fall-hazard.jpg';
import warningPressureBurst from '../assets/safety-icons/warnings/warning-pressure-burst.png';
import warningArcFlash from '../assets/safety-icons/warnings/warning-arc-flash.jpg';

import energyElectric from '../assets/safety-icons/energy/energy-electric.jpg';
import energySteam from '../assets/safety-icons/energy/energy-steam.jpg';
import energyMechanical from '../assets/safety-icons/energy/energy-mechanical.jpg';
import energyPneumatic from '../assets/safety-icons/energy/energy-pneumatic.png';
import energyChemical from '../assets/safety-icons/energy/energy-chemical.jpg';
import energyHydraulic from '../assets/safety-icons/energy/energy-hydraulic.jpg';
import energyThermal from '../assets/safety-icons/energy/energy-thermal.jpg';
import energyFoodGradeLiquid from '../assets/safety-icons/energy/energy-food-grade-liquid.png';

const src = (asset: { src: string } | string) => typeof asset === 'string' ? asset : asset.src;

type IconChoice = { key: string; label: string; src: string };

export const PPE_ICON_CHOICES: IconChoice[] = [
  { key: 'ppe-gloves-protective', label: 'Koruyucu Eldiven', src: src(ppeGlovesProtective) },
  { key: 'ppe-gloves-chemical', label: 'Kimyasal Eldiven', src: src(ppeGlovesChemical) },
  { key: 'ppe-suit-protective', label: 'Koruyucu Tulum', src: src(ppeSuitProtective) },
  { key: 'ppe-helmet', label: 'Baret', src: src(ppeHelmet) },
  { key: 'ppe-boots-protective', label: 'Koruyucu Ayakkabı / Çizme', src: src(ppeBootsProtective) },
  { key: 'ppe-boots-antistatic', label: 'Antistatik Ayakkabı', src: src(ppeBootsAntistatic) },
  { key: 'ppe-hearing-protection', label: 'Kulak Koruyucu', src: src(ppeHearingProtection) },
  { key: 'ppe-harness-fall-arrest', label: 'Paraşüt Tipi Emniyet Kemeri', src: src(ppeHarnessFallArrest) },
  { key: 'ppe-welding-helmet', label: 'Kaynak Maskesi', src: src(ppeWeldingHelmet) },
  { key: 'ppe-face-shield', label: 'Yüz Koruyucu Vizör', src: src(ppeFaceShield) },
  { key: 'ppe-goggles', label: 'Koruyucu Gözlük', src: src(ppeGoggles) },
  { key: 'ppe-respirator-mask', label: 'Solunum Koruyucu Maske', src: src(ppeRespiratorMask) },
];

export const WARNING_ICON_CHOICES: IconChoice[] = [
  { key: 'warning-corrosive', label: 'Aşındırıcı Madde', src: src(warningCorrosive) },
  { key: 'warning-sharp-edge', label: 'Keskin Nokta / Kesici Yüzey', src: src(warningSharpEdge) },
  { key: 'warning-electricity', label: 'Elektrik', src: src(warningElectricity) },
  { key: 'warning-hot-surface', label: 'Sıcak Yüzey', src: src(warningHotSurface) },
  { key: 'warning-slippery-surface', label: 'Kaygan Zemin', src: src(warningSlipperySurface) },
  { key: 'warning-fall-hazard', label: 'Düşme', src: src(warningFallHazard) },
  { key: 'warning-pressure-burst', label: 'Basınç / Patlama Riski', src: src(warningPressureBurst) },
  { key: 'warning-arc-flash', label: 'Ark Parlaması', src: src(warningArcFlash) },
  { key: 'warning-laser-beam', label: 'Lazer Işını', src: src(warningLaserBeam) },
  { key: 'warning-high-noise', label: 'Yüksek Ses Seviyesi', src: src(warningHighNoise) },
  { key: 'warning-hydraulic', label: 'Hidrolik Tehlike', src: src(warningHydraulic) },
  { key: 'warning-mechanical-rotation', label: 'Dönen Mekanik Parça', src: src(warningMechanicalRotation) },
  { key: 'warning-falling-objects', label: 'Düşen Nesne', src: src(warningFallingObjects) },
  { key: 'warning-steam', label: 'Buhar', src: src(warningSteam) },
];

const PPE_BY_KEY = Object.fromEntries(PPE_ICON_CHOICES.map((item) => [item.key, item])) as Record<string, IconChoice>;
const WARNING_BY_KEY = Object.fromEntries(WARNING_ICON_CHOICES.map((item) => [item.key, item])) as Record<string, IconChoice>;

export const PPE_OPTION_ICON_KEYS: Record<string, { ppe: string; warning: string }> = {
  heatGlove: { ppe: 'ppe-gloves-protective', warning: 'warning-hot-surface' },
  mechanicGlove: { ppe: 'ppe-gloves-protective', warning: 'warning-sharp-edge' },
  insulatedGlove: { ppe: 'ppe-gloves-protective', warning: 'warning-electricity' },
  arcSuit: { ppe: 'ppe-suit-protective', warning: 'warning-arc-flash' },
  insulatedBoot: { ppe: 'ppe-boots-protective', warning: 'warning-electricity' },
  workBoot: { ppe: 'ppe-boots-protective', warning: 'warning-slippery-surface' },
  specialSuit: { ppe: 'ppe-suit-protective', warning: 'warning-pressure-burst' },
  overall: { ppe: 'ppe-suit-protective', warning: 'warning-corrosive' },
  boot: { ppe: 'ppe-boots-protective', warning: 'warning-corrosive' },
  faceShield: { ppe: 'ppe-face-shield', warning: 'warning-corrosive' },
  chemicalGlove: { ppe: 'ppe-gloves-chemical', warning: 'warning-corrosive' },
  harness: { ppe: 'ppe-harness-fall-arrest', warning: 'warning-fall-hazard' },
};

export const PPE_ICON_MAP: Record<string, string[]> = Object.fromEntries(
  Object.entries(PPE_OPTION_ICON_KEYS).map(([optionId, keys]) => [optionId, [PPE_BY_KEY[keys.ppe]?.src, WARNING_BY_KEY[keys.warning]?.src].filter((value): value is string => Boolean(value))]),
);

export const ENERGY_ICON_MAP: Record<string, string> = {
  electric: src(energyElectric),
  steam: src(energySteam),
  mechanic: src(energyMechanical),
  pneumatic: src(energyPneumatic),
  chemical: src(energyChemical),
  hydraulic: src(energyHydraulic),
  thermal: src(energyThermal),
  foodLiquid: src(energyFoodGradeLiquid),
};

export function getPpeIconSources(item: { id: string }) {
  return PPE_ICON_MAP[item.id] ?? [];
}

export function getEnergyIconSource(item: { id: string }) {
  return ENERGY_ICON_MAP[item.id] ?? '';
}

export function getInstructionIconSource(kind: 'ppe' | 'warning', key: string) {
  return (kind === 'ppe' ? PPE_BY_KEY[key] : WARNING_BY_KEY[key])?.src ?? '';
}

export function getInstructionIconLabel(kind: 'ppe' | 'warning', key: string) {
  return (kind === 'ppe' ? PPE_BY_KEY[key] : WARNING_BY_KEY[key])?.label ?? key;
}

export function selectedSopPpeAndWarningKeys(items: Array<{ id: string; checked: boolean }>) {
  const ppe = new Set<string>();
  const warnings = new Set<string>();
  items.filter((item) => item.checked).forEach((item) => {
    const mapping = PPE_OPTION_ICON_KEYS[item.id];
    if (!mapping) return;
    ppe.add(mapping.ppe);
    warnings.add(mapping.warning);
  });
  return { ppe: [...ppe], warnings: [...warnings] };
}
