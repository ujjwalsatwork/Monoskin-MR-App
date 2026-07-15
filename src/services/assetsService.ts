import { Platform } from 'react-native';
import apiClient from './apiClient';
import { ENDPOINTS } from '@/constants/endpoints';
import { store } from '@/redux/store';
import * as RNFS from '@dr.pogodin/react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Config from 'react-native-config';

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
// Resolve them against the host (Config.BASE_URL, without the /api suffix)
export const resolveAssetUrl = (path: string): string =>
  path?.startsWith('http') ? path : `${Config.BASE_URL}${path}`;

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

const getMimeType = (fileType: string): string => {
  switch (fileType.toUpperCase()) {
    case 'PDF': return 'application/pdf';
    case 'MP4': case 'MOV': return 'video/mp4';
    case 'JPG': case 'JPEG': return 'image/jpeg';
    case 'PNG': return 'image/png';
    default: return 'application/octet-stream';
  }
};

// Downloads are organised under Download/<APP_FOLDER>/<category>/
const APP_FOLDER = 'Monoskin';
const getCategoryFolder = (fileType: string): string =>
  ['MP4', 'MOV', 'M4V', 'WEBM'].includes(fileType.toUpperCase()) ? 'Videos' : 'Brochures';

export interface DownloadResult {
  success: boolean;
  /** Final on-disk location of the file. */
  path: string;
}

export const downloadAssetFile = async (item: AssetItem): Promise<DownloadResult> => {
  const token = store.getState().auth.token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = resolveAssetUrl(item.fileUrl);
  const ext = (item.fileType || 'bin').toLowerCase();
  const fileName = `${item.title.replace(/\s+/g, '_')}_${item.id}.${ext}`;

  // Android: use the system DownloadManager so the file lands in the public
  // Downloads folder (visible in Files/Downloads, no storage permission needed),
  // organised as Download/Monoskin/<Videos|Brochures>/<file>.
  //
  // We use `storeInDownloads` (setDestinationInExternalPublicDir) rather than an
  // explicit `path` because, under scoped storage (targetSdk 29+), the app cannot
  // mkdir inside public Download itself — but DownloadManager can create the
  // nested sub-path on our behalf. The sub-path is passed via `title`.
  if (Platform.OS === 'android') {
    const subPath = `${APP_FOLDER}/${getCategoryFolder(item.fileType)}/${fileName}`;
    await ReactNativeBlobUtil.config({
      addAndroidDownloads: {
        useDownloadManager: true,
        storeInDownloads: true,
        notification: true,
        title: subPath,
        mime: getMimeType(item.fileType),
        description: item.title,
        mediaScannable: true,
      },
    }).fetch('GET', url, headers);
    return { success: true, path: `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${subPath}` };
  }

  // iOS: save into the app's Documents folder (exposed via Files app).
  const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
  const result = await RNFS.downloadFile({
    fromUrl: url,
    toFile: destPath,
    headers,
    progressDivider: 10,
  }).promise;

  return { success: result.statusCode === 200, path: destPath };
};
