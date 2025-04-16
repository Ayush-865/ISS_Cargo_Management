'use client';

// Updated ItemsList component to match our new implementation

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

type ItemType = Item | Container;

interface ItemsListProps {
  items: ItemType[];
  type: 'items' | 'containers';
  onDelete?: (key: string) => void;
  onSelect?: (item: ItemType) => void;
}

export default function ItemsList({ items, type, onDelete, onSelect }: ItemsListProps) {
  const isEmpty = items.length === 0;

  const renderEmptyState = () => (
    <div className="flex items-center justify-center h-[200px] text-center text-gray-400">
        {type === 'items'
            ? "No items added yet. Please add items manually or upload a CSV file."
            : "No containers added yet. Please add containers manually or upload a CSV file."
        }
    </div>
  );

  const renderTable = () => (
     <div className="overflow-x-auto overflow-y-auto max-h-[450px] custom-scrollbar border border-gray-700 rounded-lg">
        <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700 sticky top-0">
                {type === 'items' ? (
                    <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Dimensions (H×W×D cm)</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Mass (kg)</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Priority</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Expiry</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Usage</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Zone Pref.</th>
                        {onDelete && (
                          <th scope="col" className="relative px-4 py-3 w-16"><span className="sr-only">Actions</span></th>
                        )}
                    </tr>
                ) : (
                    <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Container ID</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Zone</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Dimensions (H×W×D cm)</th>
                        {onDelete && (
                          <th scope="col" className="relative px-4 py-3 w-16"><span className="sr-only">Actions</span></th>
                        )}
                    </tr>
                )}
            </thead>
            <tbody className="bg-gray-600 divide-y divide-gray-700">
                {type === 'items' 
                  ? items.map((item) => {
                      const typedItem = item as Item;
                      return (
                        <tr key={typedItem._key || typedItem.itemId} className={`hover:bg-gray-550 ${onSelect ? 'cursor-pointer' : ''}`} onClick={() => onSelect?.(item)}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedItem.itemId}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-medium">{typedItem.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                              {typedItem.height ?? '?' }×{typedItem.width ?? '?' }×{typedItem.depth ?? '?'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedItem.mass ?? 'N/A'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedItem.priority ?? 'N/A'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                               {typedItem.expiryDate ? new Date(typedItem.expiryDate).toLocaleDateString() : 'N/A'}
                          </td>
                           <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                              {typedItem.usageLimit ? `${typedItem.usageLimit}${typeof typedItem.usageLimit === 'number' ? ' uses' : ''}` : 'N/A'}
                          </td>
                           <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedItem.preferredZone ?? 'Any'}</td>
                           {onDelete && (
                             <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   onDelete(typedItem._key || "");
                                 }}
                                 className="text-red-400 hover:text-red-300"
                               >
                                 Delete
                               </button>
                             </td>
                           )}
                        </tr>
                      );
                    })
                  : items.map((container) => {
                      const typedContainer = container as Container;
                      return (
                        <tr key={typedContainer._key || typedContainer.containerId} className={`hover:bg-gray-550 ${onSelect ? 'cursor-pointer' : ''}`} onClick={() => onSelect?.(container)}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedContainer.containerId}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-medium">{typedContainer.zone ?? 'N/A'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                              {typedContainer.height ?? '?' }×{typedContainer.width ?? '?' }×{typedContainer.depth ?? '?'}
                          </td>
                          {onDelete && (
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(typedContainer._key || "");
                                }}
                                className="text-red-400 hover:text-red-300"
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                }
            </tbody>
        </table>
    </div>
  );

  return (
    <div className="flex flex-col flex-grow min-h-0">
      {isEmpty ? renderEmptyState() : renderTable()}
    </div>
  );
}