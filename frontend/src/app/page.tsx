'use client'

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import ISS from "@/components/ISS";
import ZoomControl from "@/components/ZoomControl"; 
import { StarryBackground } from '@/components/StarryBackground';
import Link from 'next/link';
import { Plus, ZoomIn, ZoomOut, Table, Settings, FileText, Trash } from 'lucide-react';

export default function HomePage() {
  const [translateX, setTranslateX] = useState<number>(0);
  const [translateY, setTranslateY] = useState<number>(0);
  const [scale, setScale] = useState<number>(0.7);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0, 
    title: "",
    totalContainers: 0,
    totalItems: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  interface Item {
    id: string;
    containerId: string;
    [key: string]: any;
  }
  
  const [containers, setContainers] = useState<any[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/data/containers.csv')
        .then(response => response.text())
        .then(csv => {
          const data = Papa.parse(csv, { header: true }).data;
          setContainers(data);
        }),
      fetch('/data/items.csv')
        .then(response => response.text())
        .then(csv => {
          const data = Papa.parse(csv, { header: true }).data as Item[];
          setItems(data);
        })
    ]).finally(() => setIsLoading(false));
  }, []);

  const resetView = () => {
    setTranslateX(0);
    setTranslateY(0);
    setScale(0.7);
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev * 0.8, 0.3));
  };

  const formatZoomPercentage = () => {
    return `${Math.round(scale * 100)}%`;
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-[#01041f] flex items-center justify-center">
        <div className="text-white/90 text-lg animate-pulse font-space">
          Initializing System...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <div className="relative h-screen bg-[#01041f]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#01041f] via-[#041835] to-[#082b33]" />
          <StarryBackground />
        </div>
        <div className="relative z-10">
          <div className="pt-6 pb-4 text-center">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r 
              from-blue-400 to-cyan-300 font-space tracking-wider">
              SPACE INVENTORY MANAGEMENT SYSTEM
            </h1>
            <p className="text-blue-400/70 mt-2 text-sm font-space tracking-widest">
              ISS CARGO TRACKING AND MANAGEMENT
            </p>
            <div className="absolute top-6 right-6 flex items-center gap-2 bg-black/20 
              backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-white/70 text-sm font-space">SYSTEM ONLINE</span>
            </div>
          </div>

          {!isLoading && (
            <>
              <ISS
                translateX={translateX}
                setTranslateX={setTranslateX}
                translateY={translateY}
                setTranslateY={setTranslateY}
                scale={scale}
                setScale={setScale}
                tooltip={tooltip}
                setTooltip={setTooltip}
                containers={containers}
                items={items}
              />
              <ZoomControl scale={scale} setScale={setScale} resetView={resetView} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
