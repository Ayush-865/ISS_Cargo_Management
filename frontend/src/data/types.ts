// /data/types.ts



export enum ItemStatus {
    ACTIVE = 'active',
    WASTE_EXPIRED = 'expired',
    WASTE_DEPLETED = 'depleted',
    DISPOSED = 'disposed',
  }
  

export interface Container {
    containerId: string; // Corresponds to containerId
    zone: string; // Corresponds to zone
    width: number;
    depth: number;
    height: number;
    item_count: number;
    expired_item_count: number;
}

export interface Item {
    itemId: string; // Corresponds to itemId
    name: string;
    containerId: string | null;
    quantity: number; // Always 1 in this implementation
    mass: number;
    expiryDate: string | null; // ISO date string
    width: number;
    depth: number;
    height: number;
    priority: number;
    usageLimit: number | null;
    currentUses: number;
    preferredZone: string | null;
    currentZone: string | null;
    status: ItemStatus;
    expired: boolean;
    depleted: boolean;
}

// Base pagination response structure
interface PaginatedResponse<T> {
    total: number;
    page: number;
    size: number;
    items: T[];
}

export type PaginatedContainerResponse = PaginatedResponse<Container>;
export type PaginatedItemResponse = PaginatedResponse<Item>;