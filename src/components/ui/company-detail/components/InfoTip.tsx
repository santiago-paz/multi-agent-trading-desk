'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FONT } from '@/lib/theme/win98';

export const InfoTip: React.FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (show && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2 });
    }
  }, [show]);

  return (
    <span
      ref={ref}
      style={{ display: 'inline-block', marginLeft: '4px', cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{
        ...FONT,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 14,
        height: 14,
        borderRadius: '50%',
        border: '1px solid #808080',
        background: '#ffffcc',
        fontSize: '9px',
        fontWeight: 'bold',
        color: '#000',
        lineHeight: 1,
      }}>
        ?
      </span>
      {show && createPortal(
        <div style={{
          ...FONT,
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          transform: 'translateX(-50%)',
          background: '#ffffcc',
          border: '1px solid #000',
          padding: '3px 6px',
          whiteSpace: 'normal',
          width: 220,
          zIndex: 99999,
          lineHeight: '1.3',
          boxShadow: '2px 2px 0 rgba(0,0,0,0.15)',
          pointerEvents: 'none',
        }}>
          {text}
        </div>,
        document.body,
      )}
    </span>
  );
};
