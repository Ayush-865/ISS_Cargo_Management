'use client'

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Package, Map } from 'lucide-react';

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
  category: string;
  containerId: string;
  mass: number;
  quantity: number;
  // Other fields not used in this component
}

interface ApiResponse {
  containers: Container[];
  items: Item[];
}

export default function ZonePage() {
  const params = useParams();
  const [containers, setContainers] = useState<Container[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;

    // Fetch data from API
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/frontend/placements`)
      .then(response => response.json())
      .then((data: ApiResponse) => {
        const zoneContainers = data.containers.filter(c => c.zoneId === params.id);
        setContainers(zoneContainers);
        setItems(data.items);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching placement data:', error);
        setLoading(false);
      });
  }, [params?.id]);

  // Get count of items in a container
  const getItemCount = (containerId: string) => {
    return items.filter(item => item.containerId === containerId).length;
  };

  if (!params?.id) return null;

  // Format zone name for display
  const formatZoneName = (zoneId: string) => {
    return zoneId.replace(/_/g, ' ');
  };

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
                  <Map size={18} className="text-white" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Zone: {formatZoneName(Array.isArray(params.id) ? params.id[0] : params.id)}
                </h1>
              </div>
              <div className="flex items-center">
                <div className="text-md px-3 mr-3 py-1 rounded-md bg-gray-700 text-gray-300">
                  {containers.length} containers
                </div>
                <Link 
                  href="/"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white transition-colors duration-200"
                >
                  ← Back to Map
                </Link>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            /* Container Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {containers.map(container => (
                <Link 
                  key={container.id}
                  href={`/container/${container.id}`}
                  className="bg-gray-700 hover:bg-gray-600 rounded-lg overflow-hidden transition-all duration-300 border border-gray-600"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-white">{container.name}</h2>
                      <span className="px-3 py-1 text-sm bg-indigo-500 text-white rounded-full">
                        {container.type}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-300">Dimensions</p>
                          <p className="font-medium text-white">
                            {container.width}w × {container.depth}d × {container.height}h
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-300">Items</p>
                          <p className="font-medium text-white">{getItemCount(container.id)} items</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-gray-300 mb-1">Location Coordinates</p>
                        <div className="text-sm bg-gray-800 p-2 rounded">
                          <p className="text-white">Start: ({container.start_width}, {container.start_depth}, {container.start_height})</p>
                          <p className="text-white">End: ({container.end_width}, {container.end_depth}, {container.end_height})</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <div>
                          <p className="text-gray-300">Weight</p>
                          <p className="font-medium text-white">
                            {container.currentWeight}/{container.maxWeight} kg
                          </p>
                        </div>
                        <div className="flex items-center text-indigo-400 hover:text-indigo-300">
                          <Package size={18} className="mr-1" />
                          View Details
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
