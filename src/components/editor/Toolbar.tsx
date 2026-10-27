'use client';

import { ArrowRightLeft, Eye, FileDown, FileText, FolderOpen, Printer, Redo2, RotateCcw, Save, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import { useRef, useState } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { downloadJson, readJsonFile } from '@/lib/files';
import { tr } from '@/lib/labels';
import { selectedSopPpeAndWarningKeys } from '@/lib/default-icons';

export function Toolbar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [wordBusy, setWordBusy] = useState(false);
  const document = useEditorStore((state) => state.document);
  const lang = document.uiLang;
  const mode = useEditorStore((state) => state.mode);
  const saveState = useEditorStore((state) => state.saveState);
  const past = useEditorStore((state) => state.past);
  const future = useEditorStore((state) => state.future);
  const setMode = useEditorStore((state) => state.setMode);
  const setActiveDocument = useEditorStore((state) => state.setActiveDocument);
  const replaceDocument = useEditorStore((state) => state.replaceDocument);
  const mutate = useEditorStore((state) => state.mutate);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const setZoom = useEditorStore((state) => state.setZoom);
  const resetCurrent = useEditorStore((state) => state.resetCurrent);

  const transferSopToInstruction = () => {
    const targetMeta = document.instruction.meta;
    const targetHasData = Object.values(targetMeta).some((value) => String(value).trim())
      || document.instruction.ppeIcons.length > 0
      || document.instruction.hazardIcons.length > 0;
    if (targetHasData && !window.confirm(tr('Talimat üst bilgisi ve KKD/tehlike simgeleri SOP verileriyle güncellensin mi?', lang))) return;

    const selected = selectedSopPpeAndWarningKeys(document.ppe);
    mutate((d) => {
      d.instruction.meta = { ...d.meta };
      d.instruction.ppeIcons = [...selected.ppe];
      d.instruction.hazardIcons = [...selected.warnings];
    });
    setActiveDocument('instruction');
  };

  const exportFile = () => {
    try {
      const payload = downloadJson(document);
      replaceDocument(payload, false);
    } catch (error) {
      window.alert(`${tr('Yedek indirilemedi', lang)}: ${error instanceof Error ? error.message : error}`);
    }
  };
  const exportWordFile = async () => {
    if (wordBusy) return;
    setWordBusy(true);
    try {
      const { downloadWord } = await import('@/lib/word-export');
      await downloadWord(document);
    } catch (error) {
      window.alert(`${tr('Word oluşturulamadı', lang)}: ${error instanceof Error ? error.message : error}`);
    } finally {
      setWordBusy(false);
    }
  };

  const loadFile = async (file?: File) => {
    if (!file) return;
    try {
      const loaded = await readJsonFile(file);
      loaded.project.sourceFileName = file.name;
      replaceDocument(loaded, true);
    } catch (error) {
      window.alert(`${tr('Yedek yüklenemedi', lang)}: ${error instanceof Error ? error.message : error}`);
    }
  };

  return (
    <header className="app-toolbar no-print">
      <div className="brand-block"><img src="./lesaffre-logo.jpg" alt="Lesaffre" /><div><strong>LOTO SOP MANAGEMENT</strong><span>{tr('React Doküman Editörü V4', lang)}</span></div></div>
      <div className="document-switcher">
        <button className={document.activeDocument === 'sop' ? 'active' : ''} onClick={() => setActiveDocument('sop')}>LOTO SOP</button>
        <button className={document.activeDocument === 'instruction' ? 'active' : ''} onClick={() => setActiveDocument('instruction')}>{tr('Kilitleme / Etiketleme Talimatı', lang)}</button>
      </div>
      <div className="toolbar-actions">
        <select className="language-select" value={document.uiLang} onChange={(event) => mutate((d) => { d.uiLang = event.target.value as 'tr' | 'en' | 'fr'; }, false)} aria-label={tr('Dil', lang)}><option value="tr">TR</option><option value="en">EN</option><option value="fr">FR</option></select>
        <span className={`save-state ${saveState}`}>{saveState === 'saved' ? `${tr('Kaydedildi', lang)} ✓` : saveState === 'saving' ? tr('Kaydediliyor…', lang) : tr('Değişiklik var', lang)}</span>
        {document.activeDocument === 'sop' ? <button className="transfer-to-instruction" onClick={transferSopToInstruction} title={tr('SOP üst bilgisi ile seçili KKD ve tehlikeleri talimata kopyala', lang)}><ArrowRightLeft size={17} /> {tr('SOP → Talimat Aktar', lang)}</button> : null}
        <button disabled={!past.length} title={tr('Geri al · Ctrl+Z', lang)} onClick={undo}><Undo2 size={17} /></button>
        <button disabled={!future.length} title={tr('Yinele · Ctrl+Y', lang)} onClick={redo}><Redo2 size={17} /></button>
        <div className="zoom-control"><button title={tr('Uzaklaştır', lang)} onClick={() => setZoom(document.editor.zoom - 0.08)}><ZoomOut size={16} /></button><span>{Math.round(document.editor.zoom * 100)}%</span><button title={tr('Yakınlaştır', lang)} onClick={() => setZoom(document.editor.zoom + 0.08)}><ZoomIn size={16} /></button></div>
        <button className={mode === 'preview' ? 'active' : ''} onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}><Eye size={17} /> {mode === 'edit' ? tr('Önizleme', lang) : tr('Düzenle', lang)}</button>
        <div className="backup-actions" aria-label={tr('Yedekleme işlemleri', lang)}>
          <button onClick={exportFile}><FileDown size={17} /> {tr('Yedek İndir', lang)}</button>
          <input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={(event) => { void loadFile(event.target.files?.[0]); event.currentTarget.value = ''; }} />
          <button onClick={() => inputRef.current?.click()}><FolderOpen size={17} /> {tr('Yedeği Yükle', lang)}</button>
        </div>
        <button disabled={wordBusy} onClick={() => { void exportWordFile(); }}><FileText size={17} /> {wordBusy ? tr('Word hazırlanıyor…', lang) : tr('Word İndir', lang)}</button>
        <button className="primary" onClick={() => window.print()}><Printer size={17} /> {tr('PDF / Yazdır', lang)}</button>
        <button className="danger-ghost" title={tr('Seçili dokümanı temizle', lang)} onClick={() => { if (window.confirm(tr('Seçili dokümandaki bilgiler temizlensin mi?', lang))) resetCurrent(); }}><RotateCcw size={17} /></button>
        <button className="icon-only" title={tr('Taslak otomatik kaydedilir', lang)}><Save size={17} /></button>
      </div>
    </header>
  );
}
