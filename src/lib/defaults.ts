import type {
  AppDocument,
  Equipment,
  InstructionDocument,
  InstructionPoint,
  InstructionSigner,
  LotoPoint,
  Person,
  Step,
} from './types';

export const APP_DATA_VERSION = '4.2';

export const DEFAULT_LABELS: Record<string, string> = {
  appTitle: 'LOTO SOP MANAGEMENT',
  printButton: 'PDF / Yazdır',
  downloadJson: 'Dosyayı indir',
  uploadJson: 'Dosyayı yükle',
  resetButton: 'Temizle',
  generalSection: 'Genel Bilgiler',
  equipment: 'Ekipman',
  equipmentHeader: 'Ekipman:',
  location: 'Lokasyon',
  locationHeader: 'Lokasyon:',
  jobDescription: 'İş Tanımı',
  jobDescriptionHeader: 'İş Tanımı:',
  publishDate: 'Yayınlanma Tarihi',
  publishDateHeader: 'Yayınlanma Tarihi:',
  revision: 'Revizyon No-Tarihi',
  revisionHeader: 'Revizyon No-Tarihi:',
  sopNo: 'LOTO SOP No',
  sopNoHeader: 'LOTO SOP Numarası:',
  referenceNo: 'Referans No',
  referenceNoHeader: 'Referans LOTO Talimat Numarası:',
  simpleLoto: 'Basit LOTO',
  complexLoto: 'Kompleks LOTO',
  simpleLotoText: 'Basit LOTO: En fazla bir adet departman tarafından yapılan',
  complexLotoText: 'Kompleks LOTO: Birden fazla departmanın dahil olduğu, LOTO SOP veya LOTO Talimatı bulunmayan',
  ppeTitle: 'KKD',
  energyTitle: 'Enerji',
  energyTableTitle: 'LOTO Uygulanacak Enerji Tipi',
  otherEnergyHeader: 'Diğer',
  safetySection: 'İş Güvenliği Önlemleri',
  authorizedUnitTitle: '1. LOTO Yapacak Yetkilendirilmiş Personel Birimi',
  production: 'Üretim',
  maintenance: 'Bakım',
  contractor: 'Müteahhit Firma',
  authorizedWorkersTitle: 'Yetkili Çalışanlar',
  verifier: 'Doğrulayan',
  verifierNote: 'Doğrulayan: Bu kısım yalnızca kompleks LOTO uygulamasında doldurulacaktır.',
  name: 'İsim',
  phone: 'Telefon',
  date: 'Tarih',
  time: 'Saat',
  dateTime: 'Tarih / Saat',
  department: 'Bölüm',
  departmentCompany: 'Bölüm / Şirket',
  duty: 'Görev',
  signature: 'İmza',
  equipmentPrintTitle: '2. Kullanılacak LOTO Ekipmanları',
  number: 'N°',
  equipmentNumber: 'Ekipman Numarası',
  equipmentName: 'Ekipman İsmi',
  quantityUsed: 'Kullanılan Adet',
  equipmentPhoto: 'Ekipman Fotoğrafı',
  personnelPrintTitle: '3. Çalışacak Personel Listesi:',
  pointsSection: '4. LOTO Noktaları',
  pointNoPrint: 'Kilitleme Noktası',
  equipmentTypePrint: 'LOTO Uygulanacak Ekipman Tipi',
  lotoEquipmentTypePrint: 'Kullanılan LOTO Ekipman Tipi',
  actionPrint: 'Yapılan İşlem',
  actionPrintSub: '(Kapatıldı / Açıldı)',
  authorizedPersonPrint: 'Saha Kilidini Takan Yetkilendirilmiş Personel',
  stepsPrintTitle: '5. LOTO Talimatı',
  stepsPrintTitleContinue: '5. LOTO Talimatı - devam',
  stepsColumn: 'Adımlar',
  description: 'Açıklama',
  photo: 'Fotoğraf',
  signatures: 'İmza',
  authorized: 'Yetkili',
  approver: 'Onaylayan',
  commissioningSection: '6. Devreye Alma',
  commissioningNote: '* Kilitleme adımlarını ters sırayla izleyerek izolasyon kaldırma işlemini gerçekleştirin.',
};

export const PPE_OPTIONS = [
  ['heatGlove', 'Isıya Dayanıklı Eldiven'],
  ['mechanicGlove', 'Mekanik Eldiveni'],
  ['insulatedGlove', 'İzole Eldiven'],
  ['arcSuit', 'Ark Kıyafeti'],
  ['insulatedBoot', 'İzole Çizme'],
  ['workBoot', 'İş Ayakkabısı / Çizme'],
  ['specialSuit', 'Özel Tulum (Basınca Dayanıklı)'],
  ['overall', 'Tulum'],
  ['boot', 'Çizme'],
  ['faceShield', 'Siperlik / Gözlük'],
  ['chemicalGlove', 'Kimyasal Eldiveni'],
  ['harness', 'Paraşüt Tipi Emniyet Kemeri'],
] as const;

export const ENERGY_OPTIONS = [
  ['electric', 'Elektrik'],
  ['steam', 'Buhar'],
  ['mechanic', 'Mekanik'],
  ['pneumatic', 'Pnömatik'],
  ['chemical', 'Kimyasal'],
  ['hydraulic', 'Hidrolik'],
  ['thermal', 'Termal Sıcaklık > 50 C'],
  ['foodLiquid', 'Gıda Sınıfı Sıvı (Proses Suyu, Maya, Melas)'],
] as const;

export const DEFAULT_SAFETY = [
  'Fırın içerisindeki ve haznedeki ürünün boşaltılmış olduğundan emin ol ve her iki noktayı gözle kontrol et.',
  'Kapalı alan çalışma izin formunu ve ilgili izin kısımlarını doldur ve onaylat.',
  'Çevre ısıtma buhar vanasını kapat.',
  'Mekanik iş eldiveni giydikten sonra birinci bölme ön ısıtma buhar vanasını kapat.',
  'Mekanik iş eldiveni giydikten sonra birinci - ikinci - üçüncü - dördüncü bölmelerin buhar vanalarını kapat.',
  'Elektrik bakım personeli tanımlı elektrik enerji kaynaklarını kapatır. Bu enerji kesimi sırasında yalıtkan paspas üzerinde çalış.',
  'Çizme, tulum, eldiven, gözlük kişisel koruyucu donanımlarını giy ve fırının hortum ve su kullanarak kaba temizliğini yap.',
];

export const INSTRUCTION_LOCKING_STEPS = "1. Belirtilen KKD'leri kullanmadan çalışmaya başlamayın. 2. Alanı kontrol edin ve etkilenecek tüm personeli bilgilendirin. 3. Hattı uygun bir şekilde kapatın. 4. Tüm enerji kaynaklarını kesin. 5. EKED aparatlarını, kilitlerini ve etiketlerini takın ve uygulayın. 6. Hatta ve ekipmanda muhafaza edilen artık veya kalıntı enerjiyi boşaltın. 7. Tüm enerji noktalarının enerjisinin tamamen kesildiğini doğrulayın.";
export const INSTRUCTION_REMOVAL_STEPS = '1. Tüm aletlerin çıkarıldığından emin olun. 2. Tüm personelin güvenli bir yerde olduğundan emin olun. 3. Tüm elektrik prizlerinin KAPALI konumda olduğundan emin olun. 4. Kilitleme cihazlarını çıkarın ve makineyi çalıştırın. 5. Tüm personele temizlik, bakım veya numune alma işleminin tamamlandığını bildirin.';

export const blankPerson = (): Person => ({ name: '', phone: '', date: '', time: '', department: '', duty: '', signature: '' });
export const blankEquipment = (no = 1): Equipment => ({ no, equipmentNo: '', name: '', qty: '', photo: '', originalPhoto: '', photoXPercent: 0, photoYPercent: 0, photoWidthPercent: 100, photoHeightPercent: 100 });
export const blankPoint = (no = 1): LotoPoint => ({ no, pointNo: '', equipmentType: '', lockType: '', action: 'Kapatıldı', authorizedPerson: '' });
export const blankStep = (no = 1): Step => ({ no, description: '', photo: '', originalPhoto: '', photoXPercent: 0, photoYPercent: 0, photoWidthPercent: 100, photoHeightPercent: 100, authorized: '', approver: '', verifier: '' });
export const blankInstructionPoint = (): InstructionPoint => ({ id: cryptoId('ip'), energySource: '', energyTagCode: '', energyTagNumber: '', responsible: '', method: '', lockEquipment: '', lockEquipmentPhotos: [], controlMethod: '' });
export const blankInstructionSigner = (): InstructionSigner => ({ name: '', duty: '' });

export function cryptoId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export const blankInstruction = (): InstructionDocument => ({
  meta: { equipment: '', location: '', jobDescription: '', publishDate: '', revision: '', sopNo: '', referenceNo: '' },
  ppeSummary: '',
  hazardSummary: '',
  ppeIcons: [],
  hazardIcons: [],
  pointCount: '3',
  photos: [],
  photoLayout: { heightMm: 20, workspaceHeightMm: 30 },
  points: [blankInstructionPoint(), blankInstructionPoint(), blankInstructionPoint()],
  preparedBy: blankInstructionSigner(),
  verifiedBy: blankInstructionSigner(),
  approvedBy: blankInstructionSigner(),
});

export function nowStamp() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function createDefaultDocument(): AppDocument {
  const now = nowStamp();
  return {
    schemaVersion: APP_DATA_VERSION,
    project: { fileVersion: APP_DATA_VERSION, fileRevision: 0, createdAt: now, lastModified: now, sourceFileName: '' },
    uiLang: 'tr',
    activeDocument: 'sop',
    labels: { ...DEFAULT_LABELS },
    instruction: blankInstruction(),
    meta: { equipment: '', location: '', jobDescription: '', publishDate: '', revision: '', sopNo: '', referenceNo: '' },
    lotoType: { simple: false, complex: false },
    coverPhoto: '',
    coverPhotoOriginal: '',
    coverPhotoScale: 100,
    coverPhotoXmm: 0,
    coverPhotoYmm: 0,
    coverPhotoWidthMm: 92,
    coverPhotoHeightMm: 38,
    ppe: PPE_OPTIONS.map(([id, label], index) => ({ id, label, checked: [1, 5, 7, 8, 9, 10].includes(index) })),
    energies: ENERGY_OPTIONS.map(([id, label], index) => ({ id, label, checked: [0, 1, 3, 7].includes(index) })),
    otherEnergy: '',
    safety: [...DEFAULT_SAFETY],
    units: { production: false, maintenance: false, contractor: false },
    workers: [blankPerson()],
    verifier: blankPerson(),
    equipments: [
      { ...blankEquipment(1), name: 'Saha Kilidi', qty: '14' },
      { ...blankEquipment(2), name: 'Sürgülü Ayarlanabilir Vana Kilidi', qty: '6' },
      { ...blankEquipment(3), name: 'Küresel Vana Kilidi', qty: '1' },
      { ...blankEquipment(4), name: 'Buton Kilidi', qty: '4' },
      { ...blankEquipment(5), name: 'LOTO kutusu', qty: '1' },
    ],
    personnel: [blankPerson(), blankPerson(), blankPerson(), blankPerson()],
    points: [
      { ...blankPoint(1), pointNo: 'V1-V2-V3-V4-V5-V6', equipmentType: 'Simit Vana', lockType: 'Simit Vana Kilidi' },
      { ...blankPoint(2), pointNo: 'V7-V8-V9-V10', equipmentType: 'Küresel Vana', lockType: 'Küresel Vana Kilidi' },
      { ...blankPoint(3), pointNo: 'E1', equipmentType: 'Acil Durdurma Butonu', lockType: 'Şeffaf Buton Kilidi' },
      { ...blankPoint(4), pointNo: 'E2', equipmentType: 'Silikajel Durdurma Butonu', lockType: 'Şeffaf Buton Kilidi' },
    ],
    steps: [
      { ...blankStep(1), description: 'V1 - Çevre ısıtma buhar vanasını simit vana kilidi ile kapalı konumda kilitle ve etiketle.' },
      { ...blankStep(2), description: 'V2 - Birinci bölme ön ısıtma buhar vanasını kapat simit vana kilidi ile kapalı konumda kilitle ve etiketle.' },
      { ...blankStep(3), description: 'V3-V4-V5-V6 bölmelerin buhar vanalarını simit vana kilidi ile kapalı konumda kilitle ve etiketle.' },
      { ...blankStep(4), description: 'V7-V8-V9-V10 otomatik buhar vanalarının hava vanalarını kapat, küresel vana kilidi ile kilitle ve etiketle.' },
      { ...blankStep(5), description: 'Drenaj hatlarını açık hale getir.' },
      { ...blankStep(6), description: 'Kapatılan vanaların kontrolünü yaparak artık enerji olmadığını doğrula.' },
    ],
    commissioning: [blankPerson(), blankPerson()],
    editor: {
      zoom: 0.92,
      sopSectionOrder: ['sop-general', 'sop-safety', 'sop-equipment', 'sop-personnel-points', 'sop-steps'],
      instructionSectionOrder: ['instruction-meta', 'instruction-work-scope', 'instruction-summary', 'instruction-locking', 'instruction-photos', 'instruction-points', 'instruction-removal', 'instruction-signers'],
    },
  };
}


/**
 * Clears user-entered SOP data without reinstating the example entries in the
 * initial demonstration document. Kept separate from createDefaultDocument()
 * so first-time examples and legacy imported-document fallbacks are unchanged.
 */
export function createEmptySopDocument(): AppDocument {
  const empty = createDefaultDocument();
  empty.ppe = empty.ppe.map((option) => ({ ...option, checked: false }));
  empty.energies = empty.energies.map((option) => ({ ...option, checked: false }));
  empty.safety = [];
  empty.equipments = [blankEquipment()];
  empty.points = [blankPoint()];
  empty.steps = [blankStep()];
  empty.workers = [blankPerson()];
  empty.personnel = [blankPerson()];
  empty.commissioning = [blankPerson()];
  return empty;
}
