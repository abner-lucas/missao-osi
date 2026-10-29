'use client';

import React, { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'centro' | 'lateral';
  size?: 'md' | 'lg' | 'xl';
  closeLabel?: string;
  bodyClassName?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Accessible modal: labelled dialog, focus moved in and trapped, Esc closes, focus returns on close.
export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'centro',
  size = 'lg',
  closeLabel = 'Fechar',
  bodyClassName = '',
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  // Parents usually pass an inline onClose; keep it out of the effect deps so typing doesn't re-run focus logic.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>('[data-autofocus]') || panel;
    first?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  const width = size === 'md' ? 'max-w-xl' : size === 'xl' ? 'max-w-4xl' : 'max-w-3xl';
  const lateral = variant === 'lateral';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-50 flex bg-grafite/45 ${lateral ? 'justify-end' : 'items-end sm:items-center justify-center sm:p-4'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={`bg-folha text-grafite flex flex-col shadow-[0_24px_60px_-20px_rgb(27_36_48/0.45)] outline-none ${
              lateral
                ? 'w-full max-w-2xl h-full'
                : `w-full ${width} max-h-[92vh] rounded-t-2xl sm:rounded-2xl`
            }`}
            initial={lateral ? { x: '100%' } : { y: 24, opacity: 0 }}
            animate={lateral ? { x: 0 } : { y: 0, opacity: 1 }}
            exit={lateral ? { x: '100%' } : { y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            <header className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-linha">
              <div className="min-w-0">
                <h2 id={titleId} className="text-2xl font-extrabold text-grafite">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="text-grafite-2 mt-1">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-discreto !min-h-11 !w-11 !p-0 shrink-0"
                aria-label={closeLabel}
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </header>
            <div className={`flex-1 overflow-y-auto px-5 sm:px-6 py-5 ${bodyClassName}`}>{children}</div>
            {footer && <footer className="px-5 sm:px-6 py-4 border-t border-linha">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
