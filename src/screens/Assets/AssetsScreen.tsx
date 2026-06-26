import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  ActivityIndicator,
  ScrollView,
  Alert,
  RefreshControl,
  Modal,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import Video from 'react-native-video';
import Pdf from 'react-native-pdf';
import Svg, { Path } from 'react-native-svg';
import * as RNFS from '@dr.pogodin/react-native-fs';
import Share from 'react-native-share';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import {
  CheckCircleIcon,
  EyeIcon,
  ShareIcon,
  PlayIcon,
  PauseIconWhite,
  ClockIcon,
  ReplayIcon,
  Stack,
} from '@/assets/images';
import {
  AssetItem,
  AssetTab,
  TabPagination,
  fetchAssets,
  markAssetDownloaded,
  downloadAssetFile,
  resolveAssetUrl,
  formatFileSize,
} from '@/services/assetsService';

// ─── Screen constants ──────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;
const IMAGE_HEIGHT = CARD_WIDTH * 0.82;
const FEATURED_HEIGHT = 220;
const PAGE_LIMIT = 20;

// ─── Helpers ───────────────────────────────────────────────────────────────────
const isImageType = (t: string) => ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].includes(t.toUpperCase());
const isVideoType = (t: string) => ['MP4', 'MOV', 'M4V', 'WEBM'].includes(t.toUpperCase());
const isPdfType = (t: string) => t.toUpperCase() === 'PDF';

// The asset object endpoint does not support HTTP range requests, which iOS
// AVPlayer requires for progressive streaming (otherwise: error -11850
// "server is not correctly configured"). So we download videos to local cache
// and play from the file path. Results are cached and reused across selections.
interface LocalVideoState {
  uri: string | null;
  loading: boolean;
  error: boolean;
}

// Videos (no range support) and PDFs (react-native-pdf is unreliable streaming
// remote URLs on Android) are downloaded to local cache and rendered from disk.
const needsLocalCopy = (t: string) => isVideoType(t) || isPdfType(t);

const useLocalFile = (
  item: AssetItem | null,
  authHeaders: Record<string, string>,
): LocalVideoState => {
  const [state, setState] = useState<LocalVideoState>({ uri: null, loading: false, error: false });

  useEffect(() => {
    if (!item || !item.fileUrl || !needsLocalCopy(item.fileType)) {
      setState({ uri: null, loading: false, error: false });
      return;
    }

    let cancelled = false;
    setState({ uri: null, loading: true, error: false });

    (async () => {
      try {
        const ext = (item.fileType || 'bin').toLowerCase();
        const path = `${RNFS.CachesDirectoryPath}/asset_${item.id}.${ext}`;

        // Reuse the cached file only if it's fully downloaded. A partial file
        // from an interrupted download makes ExoPlayer read past EOF
        // (ERROR_CODE_IO_READ_POSITION_OUT_OF_RANGE), so re-fetch on mismatch.
        const isComplete = async () => {
          if (!(await RNFS.exists(path))) return false;
          if (!item.fileSize) return true; // no expected size to verify against
          const stat = await RNFS.stat(path);
          return Number(stat.size) === item.fileSize;
        };

        if (!(await isComplete())) {
          await RNFS.unlink(path).catch(() => {}); // clear any partial file
          const res = await RNFS.downloadFile({
            fromUrl: resolveAssetUrl(item.fileUrl),
            toFile: path,
            headers: authHeaders,
          }).promise;
          if (res.statusCode !== 200) throw new Error(`status ${res.statusCode}`);
          // Guard against a truncated/short write
          if (item.fileSize) {
            const stat = await RNFS.stat(path);
            if (Number(stat.size) !== item.fileSize) {
              throw new Error(`size mismatch: got ${stat.size}, expected ${item.fileSize}`);
            }
          }
        }
        if (!cancelled) setState({ uri: `file://${path}`, loading: false, error: false });
      } catch (e) {
        console.warn('File prepare error:', e);
        if (!cancelled) setState({ uri: null, loading: false, error: true });
      }
    })();

    return () => { cancelled = true; };
    // authHeaders intentionally omitted: token is stable for the session and a
    // new object identity each render would otherwise re-trigger the download.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  return state;
};

const FullscreenIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const isUserCancelError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const e = error as Record<string, unknown>;
  if (e.dismissedAction === true) return true;
  const msg = String(e.message ?? '');
  return msg.includes('User did not share') || msg.includes('cancelled') || msg.includes('canceled');
};

const formatSeconds = (secs: number): string => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// ─── Featured Video Player ─────────────────────────────────────────────────────
interface FeaturedVideoPlayerProps {
  video: AssetItem;
  authHeaders: Record<string, string>;
  autoPlay?: boolean;
}

const FeaturedVideoPlayer: React.FC<FeaturedVideoPlayerProps> = ({ video, authHeaders, autoPlay = false }) => {
  const videoRef = useRef<any>(null);
  const [paused, setPaused] = useState(!autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isEnded, setIsEnded] = useState(false);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The video is downloaded to local cache first (server lacks range support)
  const { uri: localUri, loading: preparing, error: prepError } = useLocalFile(video, authHeaders);

  const [fullscreen, setFullscreen] = useState(false);

  const progress = duration > 0 ? currentTime / duration : 0;

  const resetHideTimer = useCallback(() => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (!paused && !isEnded) {
      hideControlsTimer.current = setTimeout(() => setShowControls(false), 2000);
    }
  }, [paused, isEnded]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [resetHideTimer]);

  const toggleControls = () => {
    setShowControls(prev => !prev);
    resetHideTimer();
  };

  const handlePlayPause = () => {
    if (isEnded) {
      videoRef.current?.seek(0);
      setIsEnded(false);
      setPaused(false);
      setCurrentTime(0);
    } else {
      setPaused(p => !p);
    }
    setShowControls(true);
  };

  const onProgress = useCallback((data: { currentTime: number }) => {
    if (!isEnded) setCurrentTime(data.currentTime);
  }, [isEnded]);

  const onLoad = useCallback((data: { duration: number }) => {
    setDuration(data.duration);
    setLoading(false);
  }, []);

  const onBuffer = useCallback(({ isBuffering }: { isBuffering: boolean }) => {
    setLoading(isBuffering);
  }, []);

  const onEnd = useCallback(() => {
    setIsEnded(true);
    setPaused(true);
    setShowControls(true);
  }, []);

  const handleSeek = (event: any) => {
    if (duration <= 0) return;
    const { locationX } = event.nativeEvent;
    const ratio = Math.min(Math.max(locationX / (SCREEN_WIDTH - HORIZONTAL_PADDING * 2), 0), 1);
    const seekTo = ratio * duration;
    videoRef.current?.seek(seekTo);
    setCurrentTime(seekTo);
    if (isEnded) setIsEnded(false);
    resetHideTimer();
  };

  const posterUrl = video.thumbnailUrl ? resolveAssetUrl(video.thumbnailUrl) : undefined;
  const busy = preparing || loading;

  return (
    <View style={styles.featuredContainer}>
      {localUri ? (
        <Video
          ref={videoRef}
          source={{ uri: localUri }}
          style={StyleSheet.absoluteFill}
          resizeMode={fullscreen ? 'contain' : 'cover'}
          paused={paused}
          poster={posterUrl}
          posterResizeMode="cover"
          fullscreen={fullscreen}
          fullscreenAutorotate
          fullscreenOrientation="all"
          // iOS native fullscreen brings its own controls; toggling `controls`
          // alongside fullscreen presentation crashes there, so Android-only.
          controls={Platform.OS === 'android' && fullscreen}
          onProgress={onProgress}
          onLoad={onLoad}
          onBuffer={onBuffer}
          onEnd={onEnd}
          onFullscreenPlayerWillPresent={() => setPaused(false)}
          onFullscreenPlayerDidDismiss={() => { setFullscreen(false); setPaused(false); }}
          onError={(e: any) => { setLoading(false); console.warn('Video error:', e); }}
          repeat={false}
        />
      ) : posterUrl ? (
        <ImageBackground source={{ uri: posterUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <ImageBackground
          source={require('@/assets/images/background/Brochure.png')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      {prepError && (
        <View style={[StyleSheet.absoluteFill, styles.featuredErrorOverlay]}>
          <Text style={styles.featuredErrorText}>Couldn't load this video.</Text>
        </View>
      )}

      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={toggleControls}
      >
        {showControls && (
          <>
            <View style={styles.featuredOverlay} />

            {!busy && (
              <TouchableOpacity
                style={styles.featuredPlayBtn}
                onPress={handlePlayPause}
                activeOpacity={0.85}
              >
                {isEnded ? (
                  <ReplayIcon width={22} height={22} />
                ) : paused ? (
                  <PlayIcon width={22} height={22} />
                ) : (
                  <PauseIconWhite width={22} height={22} />
                )}
              </TouchableOpacity>
            )}

            <View style={styles.featuredBottom}>
              <Text style={styles.featuredTitle} numberOfLines={1}>
                {video.title}
              </Text>

              <TouchableOpacity
                style={styles.progressBarTrack}
                activeOpacity={1}
                onPress={handleSeek}
              >
                <View style={[styles.progressBarFill, { width: `${progress * 100}%` as any }]} />
                <View
                  style={[
                    styles.progressThumb,
                    { left: `${progress * 100}%` as any, marginLeft: -6 },
                  ]}
                />
              </TouchableOpacity>

              <View style={styles.featuredTimestamps}>
                <Text style={styles.featuredTime}>{formatSeconds(currentTime)}</Text>
                <Text style={styles.featuredTime}>{formatSeconds(duration)}</Text>
              </View>
            </View>

            {localUri && (
              <TouchableOpacity
                style={styles.featuredFullscreenBtn}
                onPress={() => setFullscreen(true)}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <FullscreenIcon size={18} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </>
        )}
      </TouchableOpacity>

      {busy && !prepError && (
        <ActivityIndicator size="large" color={COLORS.white} style={styles.featuredLoader} />
      )}
    </View>
  );
};

// ─── Video List Item ───────────────────────────────────────────────────────────
interface VideoListItemProps {
  item: AssetItem;
  isActive: boolean;
  isDownloaded: boolean;
  isDownloading: boolean;
  isSharing: boolean;
  onPlay: (item: AssetItem) => void;
  onDownload: (item: AssetItem) => void;
  onShare: (item: AssetItem) => void;
}

const VideoListItem: React.FC<VideoListItemProps> = ({
  item, isActive, isDownloaded, isDownloading, isSharing, onPlay, onDownload, onShare,
}) => {
  const thumbUrl = item.thumbnailUrl ? resolveAssetUrl(item.thumbnailUrl) : undefined;

  return (
    <TouchableOpacity
      style={[styles.videoListItem, isActive && styles.videoListItemActive]}
      onPress={() => onPlay(item)}
      activeOpacity={0.85}
    >
      <View style={styles.videoThumbContainer}>
        {thumbUrl ? (
          <ImageBackground
            source={{ uri: thumbUrl }}
            style={styles.videoThumb}
            resizeMode="cover"
          >
            <View style={styles.videoThumbOverlay} />
            <View style={styles.videoThumbPlayCircle}>
              <PlayIcon width={14} height={14} fill={COLORS.white} />
            </View>
          </ImageBackground>
        ) : (
          <ImageBackground
            source={require('@/assets/images/background/Brochure.png')}
            style={styles.videoThumb}
            resizeMode="cover"
          >
            <View style={styles.videoThumbOverlay} />
            <View style={styles.videoThumbPlayCircle}>
              <PlayIcon width={14} height={14} fill={COLORS.white} />
            </View>
          </ImageBackground>
        )}
      </View>

      <View style={styles.videoListInfo}>
        <Text style={[styles.videoListTitle, isActive && styles.videoListTitleActive]} numberOfLines={1}>{item.title}</Text>
        <View style={styles.videoListMeta}>
          <ClockIcon width={12} height={12} stroke={COLORS.textSecondary} />
          <Text style={styles.videoListMetaText}>{item.duration ?? '--:--'}</Text>
          <Stack width={12} height={12} />
          <Text style={styles.videoListMetaText}>{formatFileSize(item.fileSize)}</Text>
        </View>
      </View>

      <View style={styles.videoListActions}>
        <TouchableOpacity
          style={styles.videoActionBtn}
          onPress={() => onDownload(item)}
          disabled={isDownloading}
          activeOpacity={0.75}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : isDownloaded ? (
            <CheckCircleIcon width={22} height={22} stroke={COLORS.primary} />
          ) : (
            <View style={styles.downloadIconWrapper}>
              <Text style={styles.downloadArrow}>↓</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.videoActionBtn, isSharing && styles.disabledOpacity]}
          onPress={() => onShare(item)}
          disabled={isSharing}
          activeOpacity={0.75}
        >
          {isSharing
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <ShareIcon width={22} height={22} />}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Brochure Card ─────────────────────────────────────────────────────────────
interface AssetCardProps {
  item: AssetItem;
  onShare: (item: AssetItem) => void;
  onView: (item: AssetItem) => void;
  isSharing: boolean;
}

const AssetCard: React.FC<AssetCardProps> = ({ item, onShare, onView, isSharing }) => {
  const thumbUrl = item.imageUrl ? resolveAssetUrl(item.imageUrl) : undefined;

  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        {thumbUrl ? (
          <ImageBackground
            source={{ uri: thumbUrl }}
            style={styles.fullSize}
            resizeMode="cover"
          />
        ) : (
          <ImageBackground
            source={require('@/assets/images/background/Brochure.png')}
            style={styles.fullSize}
            resizeMode="cover"
          />
        )}
        {item.badge === 'downloaded' && (
          <View style={styles.downloadedBadge}>
            <CheckCircleIcon height={20} />
          </View>
        )}
        {item.badge === 'new' && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardSubtitle}>{item.fileType} • {formatFileSize(item.fileSize)}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.viewButton} activeOpacity={0.8} onPress={() => onView(item)}>
            <EyeIcon stroke={COLORS.white} width={14} height={14} />
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onShare(item)}
            style={[styles.shareButton, isSharing && styles.disabledOpacity]}
            activeOpacity={0.8}
            disabled={isSharing}
          >
            {isSharing
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <ShareIcon />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ─── Empty / Error States ──────────────────────────────────────────────────────
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

// ─── Asset Preview Modal ─────────────────────────────────────────────────────────
interface AssetPreviewModalProps {
  item: AssetItem | null;
  authHeaders: Record<string, string>;
  onClose: () => void;
}

const AssetPreviewModal: React.FC<AssetPreviewModalProps> = ({ item, authHeaders, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Videos and PDFs are rendered from a local cached file (see useLocalFile)
  const localFile = useLocalFile(item, authHeaders);

  // Reset state whenever a new item opens
  useEffect(() => {
    if (item) {
      setLoading(true);
      setError(false);
    }
  }, [item]);

  // Surface the local-file download outcome to the modal's loading/error UI
  useEffect(() => {
    if (item && needsLocalCopy(item.fileType) && localFile.error) {
      setError(true);
      setLoading(false);
    }
  }, [item, localFile.error]);

  if (!item) return null;

  const uri = resolveAssetUrl(item.fileUrl);
  const type = item.fileType;

  const renderBody = () => {
    if (!item.fileUrl) {
      return <Text style={styles.previewMessage}>No file available to preview.</Text>;
    }
    if (isImageType(type)) {
      return (
        <Image
          source={{ uri, headers: authHeaders }}
          style={styles.previewImage}
          resizeMode="contain"
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />
      );
    }
    if (isVideoType(type)) {
      // While downloading to cache, render nothing — the modal spinner shows
      if (!localFile.uri) return null;
      return (
        <Video
          source={{ uri: localFile.uri }}
          style={styles.previewVideo}
          resizeMode="contain"
          controls
          paused={false}
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />
      );
    }
    if (isPdfType(type)) {
      // Render from the local cached file (remote streaming is flaky on Android)
      if (!localFile.uri) return null;
      return (
        <Pdf
          source={{ uri: localFile.uri }}
          style={styles.previewPdf}
          trustAllCerts={false}
          onLoadComplete={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />
      );
    }
    return <Text style={styles.previewMessage}>This file type can't be previewed.</Text>;
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.previewContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle} numberOfLines={1}>{item.title}</Text>
          <TouchableOpacity style={styles.previewCloseBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.previewCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.previewBody}>
          {renderBody()}
          {loading && !error && (
            <ActivityIndicator
              size="large"
              color={COLORS.white}
              style={styles.previewLoader}
            />
          )}
          {error && (
            <Text style={styles.previewMessage}>Couldn't load this file. Please try again.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
const AssetsScreen = () => {
  const [activeTab, setActiveTab] = useState<AssetTab>('brochures');
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Brochures state
  const [brochures, setBrochures] = useState<AssetItem[]>([]);
  const [brochurePagination, setBrochurePagination] = useState<TabPagination | null>(null);
  const [brochuresLoading, setBrochuresLoading] = useState(false);
  const [brochuresLoadingMore, setBrochuresLoadingMore] = useState(false);
  const [brochuresError, setBrochuresError] = useState<string | null>(null);
  const brochuresFetched = useRef(false);

  // Videos state
  const [videos, setVideos] = useState<AssetItem[]>([]);
  const [videoPagination, setVideoPagination] = useState<TabPagination | null>(null);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosLoadingMore, setVideosLoadingMore] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);

  // Per-item download tracking (supplements server's isDownloaded flag)
  const [localDownloadedIds, setLocalDownloadedIds] = useState<Set<number>>(new Set());

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  // In-app preview
  const [previewItem, setPreviewItem] = useState<AssetItem | null>(null);
  const token = useSelector((state: any) => state.auth.token);
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  // Selected video to play in the featured player (null → default to first video)
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const videosScrollRef = useRef<ScrollView>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const loadBrochures = useCallback(async (page = 1) => {
    const isFirst = page === 1;
    isFirst ? setBrochuresLoading(true) : setBrochuresLoadingMore(true);
    setBrochuresError(null);
    try {
      const result = await fetchAssets('brochures', page, PAGE_LIMIT);
      setBrochures(prev => isFirst ? result.items : [...prev, ...result.items]);
      setBrochurePagination(result.pagination);
    } catch {
      setBrochuresError('Failed to load brochures. Tap to retry.');
    } finally {
      isFirst ? setBrochuresLoading(false) : setBrochuresLoadingMore(false);
    }
  }, []);

  const loadVideos = useCallback(async (page = 1) => {
    const isFirst = page === 1;
    isFirst ? setVideosLoading(true) : setVideosLoadingMore(true);
    setVideosError(null);
    try {
      const result = await fetchAssets('videos', page, PAGE_LIMIT);
      setVideos(prev => isFirst ? result.items : [...prev, ...result.items]);
      setVideoPagination(result.pagination);
    } catch {
      setVideosError('Failed to load videos. Tap to retry.');
    } finally {
      isFirst ? setVideosLoading(false) : setVideosLoadingMore(false);
    }
  }, []);

  // ── Pull to refresh ──────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'brochures') {
        await loadBrochures(1);
      } else {
        await loadVideos(1);
      }
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, loadBrochures, loadVideos]);

  // Fetch brochures on mount (default tab)
  useEffect(() => {
    if (!brochuresFetched.current) {
      brochuresFetched.current = true;
      loadBrochures(1);
    }
  }, [loadBrochures]);

  // Refetch the selected tab's first page every time the tab changes
  const handleTabSwitch = (tab: AssetTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (tab === 'brochures') {
      loadBrochures(1);
    } else {
      loadVideos(1);
    }
  };

  // ── Load More ────────────────────────────────────────────────────────────────
  const handleLoadMoreBrochures = () => {
    if (brochuresLoadingMore || !brochurePagination) return;
    if (brochurePagination.page >= brochurePagination.totalPages) return;
    loadBrochures(brochurePagination.page + 1);
  };

  const handleLoadMoreVideos = () => {
    if (videosLoadingMore || !videoPagination) return;
    if (videoPagination.page >= videoPagination.totalPages) return;
    loadVideos(videoPagination.page + 1);
  };

  // ── Share ────────────────────────────────────────────────────────────────────
  // Shares the document link (URL) as text rather than attaching the file.
  const handleShare = async (item: AssetItem) => {
    const idStr = String(item.id);
    if (sharingId) return;

    const rawUrl = item.fileUrl || item.imageUrl;
    if (!rawUrl) {
      Alert.alert('Not available', 'No link is available to share for this item yet.');
      return;
    }

    const link = resolveAssetUrl(rawUrl);
    setSharingId(idStr);
    try {
      await Share.open({
        title: item.title,
        message: `${item.title}\n${link}`,
        url: link,
        failOnCancel: false,
      });
    } catch (error) {
      if (!isUserCancelError(error)) {
        console.warn('Share error:', error);
      }
    } finally {
      setSharingId(null);
    }
  };

  // ── Download ─────────────────────────────────────────────────────────────────
  const performDownload = async (item: AssetItem) => {
    setDownloadingId(item.id);

    try {
      const { success, path } = await downloadAssetFile(item);
      if (success) {
        setLocalDownloadedIds(prev => new Set([...prev, item.id]));
        // Notify server
        markAssetDownloaded(item.id).catch(() => {});
        // On Android, show the user-facing folder path (Internal storage › Download › …)
        const friendly = path
          .replace('/storage/emulated/0/', 'Internal storage/')
          .replace('/Download/', '/Downloads/');
        const location = Platform.OS === 'ios'
          ? 'Open the Files app › On My iPhone › Monoskin SalesForce to find it.'
          : `Saved to:\n${friendly}`;
        Alert.alert('Downloaded', `"${item.title}" was saved.\n\n${location}`);
      } else {
        Alert.alert('Error', 'Download failed. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Failed to download the file.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownload = (item: AssetItem) => {
    if (!item.fileUrl) {
      Alert.alert('Not available', 'No download URL is set for this item yet.');
      return;
    }
    if (downloadingId !== null) return;

    // Already downloaded: confirm before downloading again
    if (isDownloaded(item)) {
      Alert.alert(
        'Already downloaded',
        `"${item.title}" is already saved on your device. Download it again?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Download again', onPress: () => performDownload(item) },
        ],
      );
      return;
    }

    performDownload(item);
  };

  const isDownloaded = (item: AssetItem) =>
    item.isDownloaded || localDownloadedIds.has(item.id);

  const featuredVideo =
    videos.find(v => v.id === selectedVideoId) ?? videos[0] ?? null;

  // Tapping a list item plays it in the featured player and scrolls it into view
  const handlePlayVideo = (item: AssetItem) => {
    setSelectedVideoId(item.id);
    videosScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Brochures footer (load more / loading) ───────────────────────────────────
  const renderBrochureFooter = () => {
    if (brochuresLoadingMore) {
      return <ActivityIndicator size="small" color={COLORS.primary} style={styles.loaderMarginV16} />;
    }
    if (brochurePagination && brochurePagination.page < brochurePagination.totalPages) {
      return (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMoreBrochures}>
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <Header title="Assets" showBack showNotification showProfile />

      {/* Tab Bar */}
      <View style={styles.tabSection}>
        <View style={styles.tabWrapper}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'brochures' && styles.activeTab]}
            onPress={() => handleTabSwitch('brochures')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'brochures' && styles.activeTabText]}>
              Brochures
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
            onPress={() => handleTabSwitch('videos')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
              Videos
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Brochures Tab ── */}
      {activeTab === 'brochures' && (
        brochuresLoading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : brochuresError ? (
          <TouchableOpacity style={styles.emptyContainer} onPress={() => loadBrochures(1)}>
            <Text style={styles.errorText}>{brochuresError}</Text>
          </TouchableOpacity>
        ) : (
          <FlatList
            data={brochures}
            renderItem={({ item }) => (
              <AssetCard
                item={item}
                onShare={handleShare}
                onView={setPreviewItem}
                isSharing={sharingId === String(item.id)}
              />
            )}
            keyExtractor={item => String(item.id)}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMoreBrochures}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderBrochureFooter}
            ListEmptyComponent={<EmptyState message="No brochures available." />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
          />
        )
      )}

      {/* ── Videos Tab ── */}
      {activeTab === 'videos' && (
        videosLoading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : videosError ? (
          <TouchableOpacity style={styles.emptyContainer} onPress={() => loadVideos(1)}>
            <Text style={styles.errorText}>{videosError}</Text>
          </TouchableOpacity>
        ) : (
          <ScrollView
            ref={videosScrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.videosContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
          >
            {/* Featured Player */}
            {featuredVideo && (
              <FeaturedVideoPlayer
                key={featuredVideo.id}
                video={featuredVideo}
                authHeaders={authHeaders}
                autoPlay={selectedVideoId !== null}
              />
            )}

            {/* Library header */}
            {videos.length > 0 && (
              <View style={styles.libraryHeader}>
                <Text style={styles.libraryTitle}>Video Library</Text>
                <Text style={styles.libraryCount}>{videoPagination?.total ?? videos.length} VIDEOS</Text>
              </View>
            )}

            {videos.length === 0 && <EmptyState message="No videos available." />}

            {/* Video List */}
            {videos.map(video => (
              <VideoListItem
                key={video.id}
                item={video}
                isActive={featuredVideo?.id === video.id}
                isDownloaded={isDownloaded(video)}
                isDownloading={downloadingId === video.id}
                isSharing={sharingId === String(video.id)}
                onPlay={handlePlayVideo}
                onDownload={handleDownload}
                onShare={handleShare}
              />
            ))}

            {/* Load more videos */}
            {videosLoadingMore && (
              <ActivityIndicator size="small" color={COLORS.primary} style={styles.loaderMarginV12} />
            )}
            {!videosLoadingMore && videoPagination && videoPagination.page < videoPagination.totalPages && (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMoreVideos}>
                <Text style={styles.loadMoreText}>Load More</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )
      )}

      {/* In-app file preview */}
      <AssetPreviewModal
        item={previewItem}
        authHeaders={authHeaders}
        onClose={() => setPreviewItem(null)}
      />
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // ── Tab bar ──────────────────────────────────────────────────────────────
  tabSection: {
    backgroundColor: COLORS.white,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tabWrapper: {
    flexDirection: 'row',
    backgroundColor: '#EFEFEF',
    borderRadius: 50,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 50,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontFamily: FONTS.family.medium,
    fontSize: FONTS.size.md,
    color: COLORS.textSecondary,
  },
  activeTabText: {
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
  },

  // ── Loader / error / empty ────────────────────────────────────────────────
  centerLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: FONTS.family.medium,
    fontSize: FONTS.size.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: FONTS.family.medium,
    fontSize: FONTS.size.md,
    color: '#D32F2F',
    textAlign: 'center',
  },
  loadMoreBtn: {
    alignSelf: 'center',
    marginVertical: 16,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  loadMoreText: {
    fontFamily: FONTS.family.bold,
    fontSize: FONTS.size.sm,
    color: COLORS.primary,
  },

  // ── Brochures grid ───────────────────────────────────────────────────────
  listContent: {
    padding: HORIZONTAL_PADDING,
    paddingTop: 14,
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  imageContainer: {
    width: '100%',
    height: IMAGE_HEIGHT,
  },
  downloadedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#34AD5F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    color: COLORS.white,
    fontFamily: FONTS.family.bold,
    fontSize: FONTS.size.xs,
    letterSpacing: 0.4,
  },
  cardContent: { padding: 10 },
  cardTitle: {
    fontFamily: FONTS.family.bold,
    fontSize: FONTS.size.sm,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 3,
  },
  cardSubtitle: {
    fontFamily: FONTS.family.regular,
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    borderRadius: 50,
    marginRight: 8,
  },
  viewButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.family.bold,
    fontSize: FONTS.size.xs,
    marginLeft: 5,
  },
  shareButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Featured video player ───────────────────────────────────────────────
  featuredContainer: {
    width: SCREEN_WIDTH - HORIZONTAL_PADDING * 2,
    height: FEATURED_HEIGHT,
    marginHorizontal: HORIZONTAL_PADDING,
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  featuredLoader: {
    ...StyleSheet.absoluteFillObject,
    alignSelf: 'center',
  },
  featuredErrorOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  featuredFullscreenBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredErrorText: {
    fontFamily: FONTS.family.medium,
    fontSize: FONTS.size.sm,
    color: COLORS.white,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  featuredPlayBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    marginLeft: -26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  featuredBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 8,
  },
  featuredTitle: {
    fontFamily: FONTS.family.bold,
    fontSize: FONTS.size.md,
    color: COLORS.white,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2,
    marginBottom: 6,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  featuredTimestamps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featuredTime: {
    fontFamily: FONTS.family.medium,
    fontSize: FONTS.size.xs,
    color: 'rgba(255,255,255,0.85)',
  },

  // ── Video library ───────────────────────────────────────────────────────
  videosContent: {
    paddingBottom: 30,
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 20,
    paddingBottom: 12,
  },
  libraryTitle: {
    fontFamily: FONTS.family.bold,
    fontSize: FONTS.size.lg,
    color: COLORS.text,
  },
  libraryCount: {
    fontFamily: FONTS.family.bold,
    fontSize: FONTS.size.sm,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },

  // ── Video list item ─────────────────────────────────────────────────────
  videoListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: HORIZONTAL_PADDING,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  videoListItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FBF5FF',
  },
  videoListTitleActive: {
    color: COLORS.primary,
  },
  videoThumbContainer: {
    width: 70,
    height: 70,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
  },
  videoThumb: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  videoThumbPlayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoListInfo: {
    flex: 1,
  },
  videoListTitle: {
    fontFamily: FONTS.family.bold,
    fontSize: FONTS.size.md,
    color: COLORS.text,
    marginBottom: 6,
  },
  videoListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoListMetaText: {
    fontFamily: FONTS.family.regular,
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    marginLeft: 4,
    marginRight: 10,
  },
  videoListActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  videoActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadArrow: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    lineHeight: 22,
  },
  fullSize: {
    width: '100%',
    height: '100%',
  },
  disabledOpacity: {
    opacity: 0.5,
  },
  loaderMarginV16: {
    marginVertical: 16,
  },

  // ── Preview modal ───────────────────────────────────────────────────────
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 14,
    paddingTop: 50,
    backgroundColor: '#000',
  },
  previewTitle: {
    flex: 1,
    fontFamily: FONTS.family.bold,
    fontSize: FONTS.size.md,
    color: COLORS.white,
    marginRight: 12,
  },
  previewCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCloseText: {
    color: COLORS.white,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '600',
  },
  previewBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  previewPdf: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
  },
  previewLoader: {
    position: 'absolute',
  },
  previewMessage: {
    fontFamily: FONTS.family.medium,
    fontSize: FONTS.size.md,
    color: COLORS.white,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  loaderMarginV12: {
    marginVertical: 12,
  },
});

export default AssetsScreen;
