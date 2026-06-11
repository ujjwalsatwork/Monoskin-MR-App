import apiClient from './apiClient';
import { ENDPOINTS } from '@/constants/endpoints';
import { store } from '@/redux/store';
import RNFS from '@dr.pogodin/react-native-fs';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type AssetTab = 'brochures' | 'videos';
export type BadgeType = 'new' | 'downloaded' | null;

export interface AssetItem {
  id: number;
  title: string;
  fileType: string;
  fileSize: number; // bytes
  fileUrl: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
  durationSec?: number;
  badge?: BadgeType;
  isDownloaded: boolean;
  createdAt: string;
}

export interface TabPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AssetsListResult {
  items: AssetItem[];
  pagination: TabPagination;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

// File URLs from the API are relative paths like /objects/uploads/<uuid>
// Resolve them against the host (strip /api from apiClient baseURL)
const ASSET_HOST = 'https://monoskin-development.ment.tech';

export const resolveAssetUrl = (path: string): string =>
  path?.startsWith('http') ? path : `${ASSET_HOST}${path}`;

export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

// ─── API calls ─────────────────────────────────────────────────────────────────

export const fetchAssets = async (
  tab: AssetTab,
  page = 1,
  limit = 20,
): Promise<AssetsListResult> => {
  const response = await apiClient.get(ENDPOINTS.assets.list, {
    params: { tab, page, limit },
  });

  const data = response.data;
  const items: AssetItem[] = data[tab] ?? [];
  const raw = data.pagination;

  const pagination: TabPagination = {
    page: raw?.page ?? page,
    limit: raw?.limit ?? limit,
    total: raw?.total ?? items.length,
    totalPages: raw?.totalPages ?? 1,
  };

  return { items, pagination };
};

export const markAssetDownloaded = async (id: number): Promise<void> => {
  await apiClient.post(ENDPOINTS.assets.markDownloaded(id));
};

export const downloadAssetFile = async (
  item: AssetItem,
  destPath: string,
): Promise<boolean> => {
  const token = store.getState().auth.token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const result = await RNFS.downloadFile({
    fromUrl: resolveAssetUrl(item.fileUrl),
    toFile: destPath,
    headers,
    progressDivider: 10,
  }).promise;

  return result.statusCode === 200;
};
