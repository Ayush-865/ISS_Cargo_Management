'use client'

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ContainerItemViewer3D from '@/components/ContainerItemViewer3D';
import { Package, Box, ArrowLeft, Archive } from 'lucide-react';

interface Container {
  id: string;
  name: string;
  type: string;
  zoneId: string;
  width: number;
  depth: number;
  height: number;
  capacity: number;
  start_width: number;
  start_depth: number;
  start_height: number;
  end_width: number;
  end_depth: number;
  end_height: number;
  currentWeight: number;
  maxWeight: number;
}

interface Item {
  id: string;
  name: string;
  priority: number;
  category: string;
  quantity: number;
  position_start_width: number;
  position_start_depth: number;
  position_start_height: number;
  position_end_width: number;
  position_end_depth: number;
  position_end_height: number;
  mass: number;
  usageCount: number;
  usageLimit: number;
  expirationDate: string | null;
  containerId: string;
  preferredZone: string;
}

interface ApiResponse {
  containers: Container[];
  items: Item[];
}

export default function ContainerPage() {
  const params = useParams();
  const [items, setItems] = useState<Item[]>([]);
  const [container, setContainer] = useState<Container | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/frontend/placements`)
      .then(response => response.json())
      .then((data: ApiResponse) => {
        const containerItems = data.items.filter(i => i.containerId === params.id);
        setItems(containerItems);
        
        const foundContainer = data.containers.find(c => c.id === params.id);
        setContainer(foundContainer || null);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching placement data:', error);
        setLoading(false);
      });
  }, [params?.id]);

  if (!params?.id) return null;

  return (
    <div className="w-full h-full min-h-screen bg-gray-800 text-gray-100">
      {/* Main content with scroll */}
      <div className="h-screen overflow-y-auto">
        <div className="container mx-auto p-8">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-gray-800 border-b border-gray-700 p-4 rounded-lg shadow-xl mb-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-md bg-indigo-500 flex items-center justify-center">
                  <Archive size={18} className="text-white" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  {container?.name || 'Container Details'}
                </h1>
              </div>
              <div className="flex items-center">
                <div className="text-md px-3 mr-3 py-1 rounded-md bg-gray-700 text-gray-300">
                  {items.length} items
                </div>
                {container && (
                  <Link 
                    href={`/zone/${container.zoneId}`}
                    className="px-4 py-2 mr-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white transition-colors duration-200"
                  >
                    ← Back to Zone
                  </Link>
                )}
                <Link 
                  href="/"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white transition-colors duration-200"
                >
                  <ArrowLeft size={16} className="inline mr-1" /> Back to Map
                </Link>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
              {items.map(item => (
                <div key={item.id} className="bg-gray-700 rounded-lg overflow-hidden border border-gray-600">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-white">{item.name}</h2>
                      <span className={`px-3 py-1 text-sm rounded-full ${
                        getPriorityColor(item.priority)
                      }`}>
                        Priority {item.priority}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-300">Category</p>
                          <p className="font-medium text-white">{item.category}</p>
                        </div>
                        <div>
                          <p className="text-gray-300">Quantity</p>
                          <p className="font-medium text-white">{item.quantity} units</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-gray-300">Position</p>
                        <div className="text-sm bg-gray-800 p-2 rounded">
                          <p>Start: ({item.position_start_width}, {item.position_start_depth}, {item.position_start_height})</p>
                          <p>End: ({item.position_end_width}, {item.position_end_depth}, {item.position_end_height})</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-300">Mass</p>
                          <p className="font-medium text-white">{item.mass} kg</p>
                        </div>
                        <div>
                          <p className="text-gray-300">Usage</p>
                          <p className="font-medium text-white">{item.usageCount}/{item.usageLimit}</p>
                        </div>
                      </div>

                      {item.expirationDate && (
                        <div className="pt-2">
                          <p className="text-gray-300">Expiration Date</p>
                          <p className={`font-medium ${
                            isNearExpiry(item.expirationDate) ? 'text-red-400' : 'text-white'
                          }`}>
                            {new Date(item.expirationDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3D Items Viewer */}
          {!loading && items.length > 0 && container && (
            <div className="mt-12">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <div className="w-8 h-8 rounded-md bg-indigo-500 flex items-center justify-center mr-2">
                  <Box size={18} className="text-white" />
                </div>
                3D Container Visualization
              </h2>
              <div className="bg-gray-700 border border-gray-600 rounded-xl p-1">
                <ContainerItemViewer3D 
                  items={items} 
                  container={container}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getPriorityColor(priority: 1 | 2 | 3 | 4 | 5 | number) {
  const colors = {
    1: 'bg-red-600 text-white',
    2: 'bg-orange-500 text-white',
    3: 'bg-yellow-500 text-yellow-900',
    4: 'bg-blue-500 text-white',
    5: 'bg-green-500 text-white'
  };
  return colors[priority as keyof typeof colors] || 'bg-gray-500 text-white';
}

interface ExpiryCheck {
  (date: string): boolean;
}

const isNearExpiry: ExpiryCheck = (date) => {
  const expiryDate = new Date(date);
  const today = new Date();
  const daysUntilExpiry = (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntilExpiry < 30;
}
