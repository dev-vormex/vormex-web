import apiClient from './client';

export interface StoreItem {
  id: string;
  slug: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category: string;
  type: string;
  xpCost: number;
  isFeatured?: boolean;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  stock?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreCategoryCount {
  category: string;
  count: number;
}

export interface StorePurchase {
  id: string;
  userId: string;
  itemId: string;
  item: StoreItem;
  xpSpent: number;
  purchasedAt: string;
}

export interface UserInventory {
  id: string;
  userId: string;
  itemType: string;
  itemSlug: string;
  isEquipped: boolean;
  acquiredAt: string;
  item?: StoreItem;
}

type StoreItemResponse = Partial<StoreItem> & {
  price?: number;
  isAvailable?: boolean;
};

type StorePurchaseResponse = Partial<StorePurchase> & {
  purchasedAt?: string;
  xpSpent?: number;
  item?: StoreItemResponse;
};

type UserInventoryResponse = Partial<UserInventory> & {
  item?: StoreItemResponse;
};

function normalizeStoreItem(item: StoreItemResponse): StoreItem {
  return {
    id: String(item.id ?? item.slug ?? ''),
    slug: String(item.slug ?? item.id ?? ''),
    name: item.name ?? 'Store Item',
    description: item.description,
    imageUrl: item.imageUrl,
    category: item.category ?? 'general',
    type: item.type ?? 'general',
    xpCost: typeof item.xpCost === 'number' ? item.xpCost : item.price ?? 0,
    isFeatured: item.isFeatured,
    metadata: item.metadata,
    isActive: item.isActive ?? item.isAvailable ?? true,
    stock: item.stock,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function normalizeStorePurchase(purchase: StorePurchaseResponse): StorePurchase | null {
  if (!purchase.id || !purchase.userId || !purchase.itemId || !purchase.item) {
    return null;
  }

  return {
    id: purchase.id,
    userId: purchase.userId,
    itemId: purchase.itemId,
    item: normalizeStoreItem(purchase.item),
    xpSpent: purchase.xpSpent ?? 0,
    purchasedAt: purchase.purchasedAt ?? new Date(0).toISOString(),
  };
}

function normalizeInventoryItem(item: UserInventoryResponse): UserInventory | null {
  if (!item.id || !item.userId || !item.itemType || !item.itemSlug) {
    return null;
  }

  return {
    id: item.id,
    userId: item.userId,
    itemType: item.itemType,
    itemSlug: item.itemSlug,
    isEquipped: Boolean(item.isEquipped),
    acquiredAt: item.acquiredAt ?? new Date(0).toISOString(),
    item: item.item ? normalizeStoreItem(item.item) : undefined,
  };
}

// Get all store items
export const getStoreItems = async (category?: string): Promise<StoreItem[]> => {
  const response = await apiClient.get('/store/items', { params: { category } });
  return Array.isArray(response) ? response.map(normalizeStoreItem) : [];
};

// Get store item by slug
export const getStoreItem = async (slug: string): Promise<StoreItem> => {
  const response = await apiClient.get(`/store/items/${slug}`);
  return normalizeStoreItem(response as StoreItemResponse);
};

// Get store categories
export const getStoreCategories = async (): Promise<StoreCategoryCount[]> => {
  const response = await apiClient.get('/store/categories');
  return Array.isArray(response) ? (response as StoreCategoryCount[]) : [];
};

// Purchase an item
export const purchaseItem = async (itemSlug: string) => {
  return apiClient.post('/store/purchase', { itemSlug });
};

// Get my inventory
export const getMyInventory = async (): Promise<UserInventory[]> => {
  const response = await apiClient.get('/store/inventory');
  return Array.isArray(response)
    ? response
        .map((item) => normalizeInventoryItem(item as UserInventoryResponse))
        .filter((item): item is UserInventory => item !== null)
    : [];
};

// Get my purchase history
export const getMyPurchases = async (): Promise<StorePurchase[]> => {
  const response = await apiClient.get('/store/history');
  return Array.isArray(response)
    ? response
        .map((purchase) => normalizeStorePurchase(purchase as StorePurchaseResponse))
        .filter((purchase): purchase is StorePurchase => purchase !== null)
    : [];
};

// Activate an item
export const activateItem = async (inventoryId: string) => {
  return apiClient.post(`/store/inventory/${inventoryId}/activate`);
};

// Get my spendable XP balance
export const getWalletXpBalance = async (): Promise<number> => {
  const response = await apiClient.get('/store/balance');
  if (typeof response === 'number') return response;
  return (
    (response as { walletXpBalance?: number; xpBalance?: number; balance?: number })?.walletXpBalance ??
    (response as { walletXpBalance?: number; xpBalance?: number; balance?: number })?.xpBalance ??
    (response as { walletXpBalance?: number; xpBalance?: number; balance?: number })?.balance ??
    0
  );
};

export const getXPBalance = getWalletXpBalance;

// Get purchase history
export const getPurchaseHistory = async (): Promise<StorePurchase[]> => {
  return getMyPurchases();
};
