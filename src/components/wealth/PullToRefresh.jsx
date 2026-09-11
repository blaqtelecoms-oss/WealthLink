import React, { useState, useRef } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, threshold = 70, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pulling = useRef(false);

  const onTouchStart = (e) => {
    if (refreshing) return;
    if (window.scrollY > 0) { startY.current = null; return; }
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e) => {
    if (startY.current == null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY <= 0) {
      pulling.current = true;
      setPull(Math.min(delta * 0.5, threshold * 1.6));
      if (e.cancelable) e.preventDefault();
    }
  };

  const onTouchEnd = async () => {
    if (!pulling.current) { startY.current = null; return; }
    pulling.current = false;
    startY.current = null;
    if (pull >= threshold) {
      setRefreshing(true);
      setPull(threshold);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  const height = refreshing ? threshold : pull;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ position: 'relative', touchAction: 'pan-y' }}
    >
      <div
        style={{
          height,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: pulling.current ? 'none' : 'height .2s ease',
        }}
      >
        {refreshing ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#d4af37]" />
        ) : pull > 0 ? (
          <RefreshCw
            className="h-5 w-5 text-[#d4af37]"
            style={{ transform: `rotate(${pull * 4}deg)`, opacity: Math.min(pull / threshold, 1) }}
          />
        ) : null}
      </div>
      {children}
    </div>
  );
}