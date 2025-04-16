'use client'

import { useState } from 'react';

interface Item {
  itemId: string;
  name: string;
  width: number | null;
  depth: number | null;
  height: number | null;
  mass: number | null;
  priority: number | null;
  expiryDate: string | null;
  usageLimit: string | number | null;
  preferredZone: string | null;
}

interface AddItemModalProps {
  onClose: () => void;
  onSubmit: (item: Omit<Item, '_key'>) => void;
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

export default function AddItemModal({ onClose, onSubmit }: AddItemModalProps) {
  const [formData, setFormData] = useState<Omit<Item, '_key'>>({
    itemId: `item_${Date.now()}`,
    name: '',
    width: 100,
    depth: 100,
    height: 100,
    mass: 1,
    priority: 50,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usageLimit: 100,
    preferredZone: null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-6">Add New Item</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300 text-sm block mb-1">Item ID</label>
              <input
                type="text"
                value={formData.itemId}
                onChange={(e) => setFormData(prev => ({ ...prev, itemId: e.target.value }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                required
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                required
              />
            </div>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300 text-sm block mb-1">Mass (kg)</label>
              <input
                type="number"
                step="0.1"
                value={formData.mass || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, mass: e.target.value ? Number(e.target.value) : null }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                required
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">Priority (1-100)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.priority || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value ? Number(e.target.value) : null }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300 text-sm block mb-1">Expiry Date</label>
              <input
                type="date"
                value={formData.expiryDate?.split('T')[0] || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">Usage Limit</label>
              <input
                type="number"
                min="1"
                value={formData.usageLimit || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, usageLimit: e.target.value ? Number(e.target.value) : null }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-300 text-sm block mb-1">Preferred Zone</label>
            <select
              value={formData.preferredZone || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, preferredZone: e.target.value || null }))}
              className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
            >
              <option value="">No Preference</option>
              {ZONES.map(zone => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
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
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
