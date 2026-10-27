'use client';

import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/**
 * Keeps photo actions outside zoomed A4 pages, table cells and image frames.
 * All positioning is calculated in viewport pixels from the actual trigger;
 * small/thin photos can no longer crop the menu or its click targets.
 */
export function PhotoActionMenu({
  triggerRef,
  onDismiss,
  children,
}: {
  triggerRef: RefObject<HTMLButtonElement | null>;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, ready: false });

  useLayoutEffect(() => {
    const update = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const anchor = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const padding = 8;
      const gap = 6;
      const width = menuRect.width;
      const height = menuRect.height;
      const availableBelow = window.innerHeight - anchor.bottom - gap;
      const availableAbove = anchor.top - gap;
      const placeAbove = availableBelow < height && availableAbove > availableBelow;

      const left = Math.max(padding, Math.min(anchor.right - width, window.innerWidth - width - padding));
      const proposedTop = placeAbove ? anchor.top - height - gap : anchor.bottom + gap;
      const top = Math.max(padding, Math.min(proposedTop, window.innerHeight - height - padding));
      setPosition((previous) => previous.ready && previous.left === left && previous.top === top
        ? previous
        : { left, top, ready: true });
    };

    update();
    // Once the document moves, dismiss the popup instead of letting it travel
    // with the viewport or becoming detached from the photo that opened it.
    // The menu can still scroll internally on very small screens.
    const dismissOnDocumentScroll = (event: Event) => {
      const source = event.target;
      if (source instanceof Node && menuRef.current?.contains(source)) return;
      onDismiss();
    };
    window.addEventListener('scroll', dismissOnDocumentScroll, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', dismissOnDocumentScroll, true);
      window.removeEventListener('resize', update);
    };
  }, [triggerRef, onDismiss]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={menuRef}
      className="photo-action-menu photo-action-menu--portal no-print"
      data-photo-action-menu-portal="true"
      role="menu"
      style={{ left: position.left, top: position.top, visibility: position.ready ? 'visible' : 'hidden' }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
