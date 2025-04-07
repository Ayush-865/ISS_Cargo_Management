'use client';

import React from 'react';
import Link from 'next/link';
import { Table, Settings, FileText, Trash, Plus } from 'lucide-react';

interface ZoomControlProps {
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  resetView?: () => void; // optional if you're not using it, or make it required if you need it
}

const ZoomControl: React.FC<ZoomControlProps> = ({ scale, setScale, resetView }) => {
  const zoomIn = () => setScale(prev => Math.min(prev * 1.2, 10));
  const zoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.1));

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
      {/* Zoom Controls */}
      <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-lg p-2 border border-blue-500/30">
        <button
          onClick={zoomOut}
          className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg text-white"
        >
          -
        </button>
        <div className="text-white min-w-[60px] text-center">
          {Math.round(scale * 100)}%
        </div>
        <button
          onClick={zoomIn}
          className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg text-white"
        >
          +
        </button>
      </div>
      
      {/* Navigation Controls */}
      <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-lg p-2 border border-blue-500/30">
        <Link href="/tables">
          <div className="w-8 h-8 flex items-center justify-center bg-blue-500/30 hover:bg-blue-500/50 rounded-lg text-white">
            <Table size={16} />
          </div>
        </Link>
        <Link href="/management">
          <div className="w-8 h-8 flex items-center justify-center bg-blue-500/30 hover:bg-blue-500/50 rounded-lg text-white">
            <Settings size={16} />
          </div>
        </Link>
        <Link href="/logs">
          <div className="w-8 h-8 flex items-center justify-center bg-blue-500/30 hover:bg-blue-500/50 rounded-lg text-white">
            <FileText size={16} />
          </div>
        </Link>
        <Link href="/waste">
          <div className="w-8 h-8 flex items-center justify-center bg-blue-500/30 hover:bg-blue-500/50 rounded-lg text-white">
            <Trash size={16} />
          </div>
        </Link>
        <Link href="/simulate">
          <div className="w-8 h-8 flex items-center justify-center bg-blue-500/30 hover:bg-blue-500/50 rounded-lg text-white">
            <Plus size={16} />
          </div>
        </Link>
      </div>
    </div>
  );
};

export default ZoomControl;
