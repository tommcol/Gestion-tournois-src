import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PaperDocument } from '../utils/paperDocuments';
import { PaperPages } from './PaperPages';
import './paperPrint.css';

function PaperPreview({ paper }: { paper: PaperDocument }) {
  const viewport = useRef<HTMLDivElement>(null), [scale, setScale] = useState(.75);
  useEffect(() => { document.body.classList.add('tournament-paper-mode'); return () => document.body.classList.remove('tournament-paper-mode'); }, []);
  useEffect(() => {
    const node = viewport.current; if (!node) return;
    const update = () => setScale(Math.min(1, Math.max(.25, (node.clientWidth - 24) / (297 * 96 / 25.4))));
    update(); const observer = new ResizeObserver(update); observer.observe(node); return () => observer.disconnect();
  }, []);
  return <><div className="paper-preview-viewport" ref={viewport}><div className="paper-preview-pages" style={{ zoom: scale } as React.CSSProperties}><PaperPages paper={paper} /></div></div>{createPortal(<div className="tournament-paper-print"><PaperPages paper={paper} /></div>, document.body)}</>;
}
export default React.memo(PaperPreview);
