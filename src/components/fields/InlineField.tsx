'use client';

import { useLayoutEffect, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { imageFileToDataUrl } from '@/lib/files';
import { useEditorStore } from '@/store/editor-store';
import { tr } from '@/lib/labels';

export function InlineText({ value, onChange, placeholder = 'Tıklayın ve yazın', className = '', multiline = false, ariaLabel }: {
  value: string; onChange: (value: string) => void; placeholder?: string; className?: string; multiline?: boolean; ariaLabel?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lang = useEditorStore((state) => state.document.uiLang);
  const translatedPlaceholder = tr(placeholder, lang);

  const fitTextarea = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.overflowY = 'hidden';

    // Native content-based sizing for current Chromium/Edge versions.
    const supportsFieldSizing = typeof CSS !== 'undefined'
      && typeof CSS.supports === 'function'
      && CSS.supports('field-sizing', 'content');

    if (supportsFieldSizing) {
      element.style.height = 'auto';
      return;
    }

    // Fallback: reset the previous height before measuring current content.
    element.style.height = '0px';
    void element.offsetHeight;
    const computedMinHeight = Number.parseFloat(window.getComputedStyle(element).minHeight) || 0;
    element.style.height = `${Math.max(element.scrollHeight, computedMinHeight)}px`;
  };

  useLayoutEffect(() => {
    if (multiline) fitTextarea(textareaRef.current);
  }, [multiline, value]);

  if (multiline) {
    return <textarea
      ref={textareaRef}
      rows={1}
      aria-label={ariaLabel ?? translatedPlaceholder}
      className={`inline-field inline-textarea ${className}`}
      value={value}
      placeholder={translatedPlaceholder}
      onInput={(event) => fitTextarea(event.currentTarget)}
      onChange={(event) => onChange(event.target.value)}
    />;
  }
  return <input aria-label={ariaLabel ?? translatedPlaceholder} className={`inline-field ${className}`} value={value} placeholder={translatedPlaceholder} onChange={(event) => onChange(event.target.value)} />;
}

export function InlineSelect({ value, onChange, options, className = '' }: {
  value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; className?: string;
}) {
  const lang = useEditorStore((state) => state.document.uiLang);
  return (
    <select className={`inline-field inline-select ${className}`} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option.value} value={option.value}>{tr(option.label, lang)}</option>)}
    </select>
  );
}

export function InlineCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  const lang = useEditorStore((state) => state.document.uiLang);
  return <label className={`inline-check ${checked ? 'checked' : ''}`}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="print-tick" aria-hidden="true">{checked ? '✓' : ''}</span><b>{tr(label, lang)}</b></label>;
}

export function InlineImage({ src, onChange, placeholder = 'Fotoğraf ekle', className = '', onDimensions, showActions = true }: {
  src: string; onChange: (src: string) => void; placeholder?: string; className?: string; onDimensions?: (width: number, height: number) => void; showActions?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const lang = useEditorStore((state) => state.document.uiLang);
  const translatedPlaceholder = tr(placeholder, lang);
  const choose = () => inputRef.current?.click();
  const change = async (file?: File) => {
    if (!file) return;
    try { onChange(await imageFileToDataUrl(file, lang)); }
    catch (error) { window.alert(error instanceof Error ? error.message : tr('Görsel yüklenemedi.', lang)); }
  };
  return (
    <div className={`inline-image ${className}`}>
      <input ref={inputRef} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { void change(event.target.files?.[0]); event.currentTarget.value = ''; }} />
      {src ? <img src={src} alt={translatedPlaceholder} onLoad={(event) => { const image = event.currentTarget; if (image.naturalWidth > 0 && image.naturalHeight > 0) onDimensions?.(image.naturalWidth, image.naturalHeight); }} /> : <button type="button" className="image-placeholder" onClick={choose}><ImagePlus size={18} /> {translatedPlaceholder}</button>}
      {src && showActions && <div className="image-hover-actions"><button type="button" title={tr('Fotoğrafı değiştir', lang)} aria-label={tr('Fotoğrafı değiştir', lang)} onClick={choose}><ImagePlus size={15} /> {tr('Değiştir', lang)}</button><button type="button" title={tr('Fotoğrafı sil', lang)} aria-label={tr('Fotoğrafı sil', lang)} onClick={() => onChange('')}><X size={15} /> {tr('Sil', lang)}</button></div>}
    </div>
  );
}
