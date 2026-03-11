'use client';

import React, { useState } from 'react';

const FALLBACK_EMOJI = '📄';

interface DesktopIconProps {
  label: string;
  /** URL to an image (e.g. Win98SE icon from CDN) */
  iconSrc?: string;
  /** Fallback when iconSrc is not used or image fails to load: emoji or React node */
  icon?: React.ReactNode;
  onClick: () => void;
}

export const DesktopIcon: React.FC<DesktopIconProps> = ({ label, iconSrc, icon, onClick }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const useImage = iconSrc && !imgFailed;

  return (
    <button
      type="button"
      onClick={onClick}
      className="desktop-icon flex flex-col items-center justify-start gap-0.5 w-16 p-1 bg-transparent border-none cursor-pointer text-left focus:outline-none focus-visible:outline-2 focus-visible:outline-dotted focus-visible:outline-white focus-visible:outline-offset-1 rounded-none min-h-0"
      style={{ minHeight: 52 }}
    >
      <div className="w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden flex-shrink-0">
        {useImage ? (
          <img
            src={iconSrc}
            alt=""
            className="w-8 h-8 object-contain block"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="text-2xl leading-none block">{icon ?? FALLBACK_EMOJI}</span>
        )}
      </div>
      <span className="text-[11px] text-white text-center leading-tight font-normal break-words max-w-full px-0.5 block" style={{ textShadow: '0 0 1px #000, 1px 1px 1px #000' }}>
        {label}
      </span>
    </button>
  );
};
