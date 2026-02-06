/**
 * RuntimePreview — Embeds runtime preview in an iframe
 *
 * Communicates via postMessage.
 * Provides Play and Reload buttons.
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import type { RuntimePreviewProps } from './types.js';

export function RuntimePreview({
  project,
  activeMapId,
  onError,
}: RuntimePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  // Listen for messages from the iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'ready') {
        setStatus('ready');
      } else if (e.data?.type === 'error') {
        setStatus('error');
        onError?.(e.data.message);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onError]);

  const handlePlay = useCallback(() => {
    if (!iframeRef.current?.contentWindow || !activeMapId) return;
    setIsPlaying(true);
    setStatus('loading');
    iframeRef.current.contentWindow.postMessage(
      { type: 'loadProject', project, mapId: activeMapId },
      '*',
    );
  }, [project, activeMapId]);

  const handleReload = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;
    setStatus('loading');
    iframeRef.current.contentWindow.postMessage({ type: 'reload' }, '*');
  }, []);

  return (
    <div
      style={{
        height: 200,
        borderTop: '1px solid #313244',
        display: 'flex',
        flexDirection: 'column',
        background: '#11111b',
        flexShrink: 0,
      }}
    >
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          background: '#1e1e2e',
          borderBottom: '1px solid #313244',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: '#a6adc8', textTransform: 'uppercase' }}>
          Preview
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={handlePlay}
          disabled={!activeMapId}
          style={{
            fontSize: 10,
            padding: '2px 8px',
            background: '#a6e3a1',
            color: '#1e1e2e',
            border: 'none',
            borderRadius: 3,
            cursor: activeMapId ? 'pointer' : 'default',
            fontWeight: 600,
          }}
        >
          Play
        </button>
        <button
          onClick={handleReload}
          disabled={!isPlaying}
          style={{
            fontSize: 10,
            padding: '2px 8px',
            background: '#313244',
            color: isPlaying ? '#cdd6f4' : '#45475a',
            border: 'none',
            borderRadius: 3,
            cursor: isPlaying ? 'pointer' : 'default',
          }}
        >
          Reload
        </button>
        <span style={{ fontSize: 10, color: '#6c7086' }}>
          {status === 'loading' ? 'Loading...' : status === 'error' ? 'Error' : status === 'ready' ? 'Ready' : ''}
        </span>
      </div>

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src="/preview.html"
        style={{
          flex: 1,
          border: 'none',
          width: '100%',
        }}
        sandbox="allow-scripts allow-same-origin"
        title="Runtime Preview"
      />
    </div>
  );
}
