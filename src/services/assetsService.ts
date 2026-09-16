import { Platform } from 'react-native';
import apiClient from './apiClient';
import { ENDPOINTS } from '@/constants/endpoints';
import { store } from '@/redux/store';
import * as RNFS from '@dr.pogodin/react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Config from 'react-native-config';
import { safeAssetFileName, safeFileExtension, safeFileSegment } from '@/utils/sanitize';

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

/** Auth headers for fetching an asset file outside axios. */
const assetAuthHeaders = (): Record<string, string> => {
  const token = store.getState().auth.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Where the in-app viewer caches an asset before rendering it. Exported so the
 * viewer and Share resolve the same path, and Share can reuse a file the MR has
 * already opened instead of fetching it again. The extension is sanitised —
 * `fileType` comes from the server.
 */
export const assetCachePath = (item: AssetItem): string =>
  `${RNFS.CachesDirectoryPath}/asset_${item.id}.${safeFileExtension(item.fileType)}`;

export interface DownloadResult {
  success: boolean;
  /** Final on-disk location of the file. */
  path: string;
}

export const downloadAssetFile = async (item: AssetItem): Promise<DownloadResult> => {
  const headers = assetAuthHeaders();
  const url = resolveAssetUrl(item.fileUrl);

  // MOB-07 — the title arrives from the server and is untrusted. It used to be
  // dropped into the path with only spaces replaced, so a title containing `../`
  // wrote the file outside the Monoskin folder. `safeAssetFileName` reduces it to
  // a single path segment that cannot contain a separator or a dot run.
  const fileName = safeAssetFileName(item.title, item.id, item.fileType);

  // Android: use the system DownloadManager so the file lands in the public
  // Downloads folder (visible in Files/Downloads, no storage permission needed),
  // organised as Download/Monoskin/<Videos|Brochures>/<file>.
  //
  // We use `storeInDownloads` (setDestinationInExternalPublicDir) rather than an
  // explicit `path` because, under scoped storage (targetSdk 29+), the app cannot
  // mkdir inside public Download itself — but DownloadManager can create the
  // nested sub-path on our behalf. The sub-path is passed via `title`.
  if (Platform.OS === 'android') {
    // The category is derived from a server-supplied fileType, so it is sanitised
    // too — DownloadManager builds the nested directory from this string.
    const subPath = `${APP_FOLDER}/${safeFileSegment(getCategoryFolder(item.fileType), 'Brochures')}/${fileName}`;
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
  //
  // MOB-04 — Documents is included in iCloud and encrypted device backups by
  // default, which is how company brochures ended up in a representative's
  // personal Apple account. The directory is marked NSURLIsExcludedFromBackupKey
  // at launch (see `excludeAppDataFromBackup` in AppDelegate.swift), which covers
  // everything written into it, so the file stays visible in the Files app and
  // shareable with doctors while no longer being swept into a backup.
  const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
  const result = await RNFS.downloadFile({
    fromUrl: url,
    toFile: destPath,
    headers,
    progressDivider: 10,
  }).promise;

  return { success: result.statusCode === 200, path: destPath };
};

// ─── Share ─────────────────────────────────────────────────────────────────────
//
// Share attaches the ORIGINAL file, not the link. Sharing the URL as a text
// message meant every share target — "Save to Files" included — received text,
// so saving a brochure produced a .txt containing the link instead of the PDF.

export interface ShareableFile {
  /** Absolute path of the copy prepared for the share sheet. */
  path: string;
  mime: string;
  /** Human-readable name the receiving app shows and saves under. */
  fileName: string;
}

/** Share copies older than this are removed the next time something is shared. */
const SHARE_COPY_MAX_AGE_MS = 60 * 60 * 1000;

const isVideoFileType = (t: string) => ['MP4', 'MOV', 'M4V'].includes((t || '').toUpperCase());

/**
 * Does the file on disk actually look like the type the server says it is?
 *
 * A failed request can leave an HTML or JSON error body at the target path. The
 * size check catches that only when the server reported a size, so the leading
 * bytes are checked too: a PDF carries `%PDF-` near the start, and MP4/MOV files
 * open with an ISO-BMFF box (`ftyp`, or `moov` / `wide` / `mdat` / `free` in older
 * QuickTime files). Other types are not sniffed.
 */
const looksLikeFileType = async (path: string, fileType: string): Promise<boolean> => {
  const t = (fileType || '').toUpperCase();
  try {
    if (t === 'PDF') {
      return (await RNFS.read(path, 1024, 0, 'ascii')).includes('%PDF-');
    }
    if (isVideoFileType(t)) {
      const box = (await RNFS.read(path, 8, 0, 'ascii')).slice(4, 8);
      return ['ftyp', 'moov', 'wide', 'mdat', 'free', 'skip', 'pnot'].includes(box);
    }
    return true;
  } catch {
    return false;
  }
};

/** Present, the size the server reported (when it reported one), and the right type. */
const isUsableCopy = async (path: string, item: AssetItem): Promise<boolean> => {
  try {
    if (!(await RNFS.exists(path))) return false;
    if (item.fileSize && Number((await RNFS.stat(path)).size) !== item.fileSize) return false;
    return await looksLikeFileType(path, item.fileType);
  } catch {
    return false;
  }
};

/** Housekeeping only: a failure here must never fail the share. */
const sweepStaleShareCopies = async (dir: string, keep: string): Promise<void> => {
  try {
    const now = Date.now();
    const entries = await RNFS.readDir(dir);
    await Promise.all(
      entries
        .filter(e => e.isFile() && e.path !== keep && e.mtime != null
          && now - e.mtime.getTime() > SHARE_COPY_MAX_AGE_MS)
        .map(e => RNFS.unlink(e.path).catch(() => {})),
    );
  } catch {
    // Ignore — the OS also reclaims the caches directory under storage pressure.
  }
};

/**
 * Produce a local copy of the asset's original file, ready to hand to the share
 * sheet under a readable name (for example `Monocure_Product_Guide_2026_12.pdf`).
 *
 * Reuses a copy already on the device before touching the network — the file the
 * viewer cached, or on iOS the copy saved by Download — which matters for an MR on
 * a weak rural signal. Every candidate, cached or freshly fetched, must pass
 * `isUsableCopy`, so an error page can never be shared in place of the brochure.
 *
 * Throws when no usable file can be produced; the caller explains that to the MR.
 */
export const prepareShareableAssetFile = async (item: AssetItem): Promise<ShareableFile> => {
  if (!item.fileUrl) {
    throw new Error('Asset has no file to share');
  }

  const fileName = safeAssetFileName(item.title, item.id, item.fileType);
  const dir = `${RNFS.CachesDirectoryPath}/share`;
  const dest = `${dir}/${fileName}`;

  await RNFS.mkdir(dir);
  await RNFS.unlink(dest).catch(() => {});

  const localCopies = [assetCachePath(item)];
  if (Platform.OS === 'ios') {
    localCopies.push(`${RNFS.DocumentDirectoryPath}/${fileName}`);
  }

  let prepared = false;
  for (const candidate of localCopies) {
    if (await isUsableCopy(candidate, item)) {
      await RNFS.copyFile(candidate, dest);
      prepared = true;
      break;
    }
  }

  if (!prepared) {
    const result = await RNFS.downloadFile({
      fromUrl: resolveAssetUrl(item.fileUrl),
      toFile: dest,
      headers: assetAuthHeaders(),
    }).promise;
    if (result.statusCode !== 200) {
      await RNFS.unlink(dest).catch(() => {});
      throw new Error(`Asset download failed with status ${result.statusCode}`);
    }
  }

  if (!(await isUsableCopy(dest, item))) {
    await RNFS.unlink(dest).catch(() => {});
    throw new Error('Prepared file is incomplete or not the expected type');
  }

  sweepStaleShareCopies(dir, dest);
  return { path: dest, mime: getMimeType(item.fileType), fileName };
};
