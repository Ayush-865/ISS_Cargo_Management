'use client'

import { useState } from 'react';

interface Container {
  containerId: string;
  zone: string | null;
  width: number | null;
  depth: number | null;
  height: number | null;
}

interface AddContainerModalProps {
  onClose: () => void;
  onSubmit: (container: Omit<Container, '_key'>) => void;
}

const ZONES = [
  'Crew Quarters',
  'Storage Bay',
  'Medical Bay',
  'Science Lab',
  'Air Lock',
  'Control Room',
  'Engine Room',
  'Cargo Hold'
];

export default function AddContainerModal({ onClose, onSubmit }: AddContainerModalProps) {
  const [formData, setFormData] = useState<Omit<Container, '_key'>>({
    containerId: `cont${Date.now().toString(36)}`,
    zone: 'Crew Quarters',
    width: 400,
    depth: 400,
    height: 400
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-6">Add New Container</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm block mb-1">Container ID</label>
            <input
              type="text"
              value={formData.containerId}
              onChange={(e) => setFormData(prev => ({ ...prev, containerId: e.target.value }))}
              className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
              required
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm block mb-1">Zone</label>
            <select
              value={formData.zone || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, zone: e.target.value || null }))}
              className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
              required
            >
              <option value="">Select Zone</option>
              {ZONES.map(zone => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-gray-300 text-sm block mb-1">Width (cm)</label>
              <input
                type="number"
                value={formData.width || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, width: e.target.value ? Number(e.target.value) : null }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                required
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">Depth (cm)</label>
              <input
                type="number"
                value={formData.depth || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, depth: e.target.value ? Number(e.target.value) : null }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                required
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">Height (cm)</label>
              <input
                type="number"
                value={formData.height || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value ? Number(e.target.value) : null }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                required
              />
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
            >
              Add Container
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
