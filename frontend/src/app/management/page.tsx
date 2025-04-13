"use client";

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import Link from 'next/link';
import { Plus, Upload, ChevronDown, Send } from 'lucide-react';
import Papa from 'papaparse';
import ItemsList from '@/components/management/ItemsList';
import AddItemModal from '@/components/management/AddItemModal';
import AddContainerModal from '@/components/management/AddContainerModal';
import StarBackground from '@/components/StarBackground';

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
  _key?: string;
}

interface Container {
  containerId: string;
  zone: string | null;
  width: number | null;
  depth: number | null;
  height: number | null;
  _key?: string;
}

interface DropdownButtonProps {
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  hoverColor: string;
  options: { label: string; onClick: () => void }[];
}

function DropdownButton({ label, icon, bgColor, hoverColor, options }: DropdownButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 ${bgColor} ${hoverColor} rounded-lg text-white transition-colors`}
      >
        {icon} {label} <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {options.map((option) => (
              <button
                key={option.label}
                onClick={() => {
                  option.onClick();
                  setIsOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                role="menuitem"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManagementPage() {
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddContainerModal, setShowAddContainerModal] = useState(false);
  const [listView, setListView] = useState<'items' | 'containers'>('items');

  // Initialize with empty arrays
  const [items, setItems] = useState<Item[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);

  const [isLoadingPlacement, setIsLoadingPlacement] = useState(false);
  const [placementStatus, setPlacementStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const itemCsvInputRef = useRef<HTMLInputElement>(null);
  const containerCsvInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
    type: 'item' | 'container'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log(`Parsed ${type} CSV:`, results.data);
        if (type === 'item') {
          processItemCsvData(results.data as any[]);
        } else {
          processContainerCsvData(results.data as any[]);
        }
        if (event.target) {
          event.target.value = '';
        }
      },
      error: (error: any) => {
        console.error(`Error parsing ${type} CSV:`, error);
        alert(`Error parsing ${type} CSV: ${error.message}`);
        if (event.target) {
          event.target.value = '';
        }
      },
    });
  };

  const processItemCsvData = (data: Record<string, string>[]) => {
    const newItems: Item[] = data.map((row, index) => ({
      _key: `csv-${Date.now()}-${index}`,
      itemId: row['item_id'] || `generated-${Date.now()}-${index}`,
      name: row['name'] || 'Unnamed Item',
      width: parseFloat(row['width_cm']) || null,
      depth: parseFloat(row['depth_cm']) || null,
      height: parseFloat(row['height_cm']) || null,
      mass: parseFloat(row['mass_kg']) || null,
      priority: parseInt(row['priority'], 10) || null,
      expiryDate: row['expiry_date'] && row['expiry_date'].toUpperCase() !== 'N/A' ? new Date(row['expiry_date']).toISOString() : null,
      usageLimit: row['usage_limit'] && row['usage_limit'].toUpperCase() !== 'N/A' ? parseInt(row['usage_limit'].replace(/\D/g, ''), 10) || null : null,
      preferredZone: row['preferred_zone'] || null,
    })).filter(item => item.name !== 'Unnamed Item');

    setItems(prevItems => [...prevItems, ...newItems]);
  };

  const processContainerCsvData = (data: Record<string, string>[]) => {
    const newContainers: Container[] = data.map((row, index) => ({
      _key: `csv-cont-${Date.now()}-${index}`,
      containerId: row['container_id'] || `generated-cont-${Date.now()}-${index}`,
      zone: row['zone'] || 'Default Zone',
      width: parseFloat(row['width_cm']) || null,
      depth: parseFloat(row['depth_cm']) || null,
      height: parseFloat(row['height_cm']) || null,
    })).filter(cont => cont.zone !== 'Default Zone');

    setContainers(prevContainers => [...prevContainers, ...newContainers]);
  };

  const handleAddItemManually = (newItem: Omit<Item, '_key'>) => {
    setItems(prevItems => [...prevItems, { ...newItem, _key: `manual-${Date.now()}` }]);
  };

  const handleAddContainerManually = (newContainer: Omit<Container, '_key'>) => {
    setContainers(prevContainers => [...prevContainers, { ...newContainer, _key: `manual-cont-${Date.now()}` }]);
  };

  const handlePlacement = async () => {
    setIsLoadingPlacement(true);
    setPlacementStatus(null);
    const batchSize = 500;
    let processedItems: Item[] = [];
    let remainingItems = [...items];

    try {
      while (remainingItems.length > 0) {
        const batch = remainingItems.slice(0, batchSize);
        remainingItems = remainingItems.slice(batchSize);

        const apiPayload = {
          items: batch.map(item => ({
            itemId: item.itemId,
            name: item.name,
            width: item.width,
            depth: item.depth,
            height: item.height,
            mass: item.mass,
            priority: item.priority,
            expiryDate: item.expiryDate,
            usageLimit: typeof item.usageLimit === 'string' ? parseInt(item.usageLimit.replace(/\D/g, ''), 10) || null : item.usageLimit,
            preferredZone: item.preferredZone,
          })).filter(item => item.itemId && item.name && item.width !== null && item.depth !== null && item.height !== null && item.mass !== null && item.priority !== null),
          containers: containers.map(cont => ({
            containerId: cont.containerId,
            zone: cont.zone,
            width: cont.width,
            depth: cont.depth,
            height: cont.height,
          })).filter(cont => cont.containerId && cont.zone && cont.width !== null && cont.depth !== null && cont.height !== null),
        };

        console.log("Sending to Placement API (Batch):", JSON.stringify(apiPayload, null, 2));

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/placement`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiPayload),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`API Error ${response.status}: ${errorData}`);
        }

        const result = await response.json();
        console.log('Placement API Success (Batch):', result);
        processedItems = [...processedItems, ...batch];
      }
      setPlacementStatus({ type: 'success', message: 'Placement calculated successfully for all batches!' });
    } catch (error: any) {
      console.error('Placement API Failed:', error);
      setPlacementStatus({ type: 'error', message: `Placement failed: ${error.message}` });
    } finally {
      setIsLoadingPlacement(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white">
      <StarBackground />

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={itemCsvInputRef}
        style={{ display: 'none' }}
        accept=".csv"
        onChange={(e) => handleFileChange(e, 'item')}
      />
      <input
        type="file"
        ref={containerCsvInputRef}
        style={{ display: 'none' }}
        accept=".csv"
        onChange={(e) => handleFileChange(e, 'container')}
      />

      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 backdrop-blur-md bg-black/30 border-b border-white/10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Storage Management</h1>
              <Link
                href="/"
                className="px-4 py-2 text-white/70 hover:text-white transition-colors"
              >
                ← Back to Map
              </Link>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-4">
              <div className="ml-auto flex gap-4 z-50 relative">
                <DropdownButton
                  label="Add Item"
                  icon={<Plus className="w-4 h-4" />}
                  bgColor="bg-green-600"
                  hoverColor="hover:bg-green-700"
                  options={[
                    { label: 'Add Manually', onClick: () => setShowAddItemModal(true) },
                    { label: 'Upload CSV', onClick: () => itemCsvInputRef.current?.click() },
                  ]}
                />
                <DropdownButton
                  label="Add Container"
                  icon={<Plus className="w-4 h-4" />}
                  bgColor="bg-blue-600"
                  hoverColor="hover:bg-blue-700"
                  options={[
                    { label: 'Add Manually', onClick: () => setShowAddContainerModal(true) },
                    { label: 'Upload CSV', onClick: () => containerCsvInputRef.current?.click() },
                  ]}
                />
                <button
                  onClick={handlePlacement}
                  disabled={isLoadingPlacement || (items.length === 0 && containers.length === 0)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingPlacement ? (
                    <>
                      <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Placement
                    </>
                  )}
                </button>
              </div>

              {placementStatus && (
                <div className={`text-sm px-3 py-1 rounded ${placementStatus.type === 'success' ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'}`}>
                  {placementStatus.message}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Main Layout (adjust grid cols if PlacementView is used) */}
          {/* <div className="grid grid-cols-2 gap-8"> */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8"> {/* Adjusted for potential right panel */}
            {/* Left Panel: Items/Containers List */}
            <div className="backdrop-blur-md bg-white/5 rounded-xl p-6 flex flex-col"> {/* Added flex flex-col */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-2">
                  <button
                    onClick={() => setListView('items')}
                    className={`px-4 py-2 rounded-lg transition-colors ${listView === 'items' ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white/70'
                      }`}
                  >
                    Items ({items.length})
                  </button>
                  <button
                    onClick={() => setListView('containers')}
                    className={`px-4 py-2 rounded-lg transition-colors ${listView === 'containers' ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white/70'
                      }`}
                  >
                    Containers ({containers.length})
                  </button>
                </div>
                {/* Optional: Add clear buttons or other actions here */}
              </div>

              {/* Pass state down to ItemsList */}
              <ItemsList
                mode={listView}
                items={items}
                containers={containers}
                // onSelect={activeTab === 'placement' ? setSelectedItem : undefined} // Keep if needed
              />
            </div>

            {/* Right Panel: Placement View or other content */}
            {/* Uncomment and adjust if you have a PlacementView */}
            {/* <div className="backdrop-blur-md bg-white/5 rounded-xl p-6">
                                                <PlacementView
                                                    mode={activeTab}
                                                    selectedItem={selectedItem}
                                                    onPlacementComplete={() => setSelectedItem(null)}
                                                    // You might want to pass the placement API result here
                                                />
                                            </div> */}
          </div>
        </main>
      </div>

      {/* Modals */}
      {showAddItemModal && <AddItemModal
        onClose={() => setShowAddItemModal(false)}
        onAdd={handleAddItemManually} // Pass the handler
      />}
      {showAddContainerModal && <AddContainerModal
        onClose={() => setShowAddContainerModal(false)}
        // onAdd={handleAddContainerManually} // Pass the handler (assuming AddContainerModal has onAdd)
      />}
    </div>
  );
}