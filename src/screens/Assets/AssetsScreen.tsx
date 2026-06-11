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
} from 'react-native';
import Video from 'react-native-video';
import RNFS from '@dr.pogodin/react-native-fs';
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
const getMimeType = (fileType: string): string => {
  switch (fileType.toUpperCase()) {
    case 'PDF': return 'application/pdf';
    case 'MP4': case 'MOV': return 'video/mp4';
    case 'JPG': case 'JPEG': return 'image/jpeg';
    case 'PNG': return 'image/png';
    default: return 'application/octet-stream';
  }
};

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
}

const FeaturedVideoPlayer: React.FC<FeaturedVideoPlayerProps> = ({ video }) => {
  const videoRef = useRef<any>(null);
  const [paused, setPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isEnded, setIsEnded] = useState(false);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const videoUrl = resolveAssetUrl(video.fileUrl);
  const posterUrl = video.thumbnailUrl ? resolveAssetUrl(video.thumbnailUrl) : undefined;

  return (
    <View style={styles.featuredContainer}>
      {video.fileUrl ? (
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          paused={paused}
          poster={posterUrl}
          posterResizeMode="cover"
          onProgress={onProgress}
          onLoad={onLoad}
          onBuffer={onBuffer}
          onEnd={onEnd}
          repeat={false}
        />
      ) : (
        <ImageBackground
          source={require('@/assets/images/background/Brochure.png')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={toggleControls}
      >
        {showControls && (
          <>
            <View style={styles.featuredOverlay} />

            {!loading && (
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
          </>
        )}
      </TouchableOpacity>

      {loading && (
        <ActivityIndicator size="large" color={COLORS.white} style={styles.featuredLoader} />
      )}
    </View>
  );
};

// ─── Video List Item ───────────────────────────────────────────────────────────
interface VideoListItemProps {
  item: AssetItem;
  isDownloaded: boolean;
  isDownloading: boolean;
  isSharing: boolean;
  onDownload: (item: AssetItem) => void;
  onShare: (item: AssetItem) => void;
}

const VideoListItem: React.FC<VideoListItemProps> = ({
  item, isDownloaded, isDownloading, isSharing, onDownload, onShare,
}) => {
  const thumbUrl = item.thumbnailUrl ? resolveAssetUrl(item.thumbnailUrl) : undefined;

  return (
    <View style={styles.videoListItem}>
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
        <Text style={styles.videoListTitle} numberOfLines={1}>{item.title}</Text>
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
          disabled={isDownloading || isDownloaded}
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
    </View>
  );
};

// ─── Brochure Card ─────────────────────────────────────────────────────────────
interface AssetCardProps {
  item: AssetItem;
  onShare: (item: AssetItem) => void;
  isSharing: boolean;
}

const AssetCard: React.FC<AssetCardProps> = ({ item, onShare, isSharing }) => {
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
          <TouchableOpacity style={styles.viewButton} activeOpacity={0.8}>
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
  const videosFetched = useRef(false);

  // Per-item download tracking (supplements server's isDownloaded flag)
  const [localDownloadedIds, setLocalDownloadedIds] = useState<Set<number>>(new Set());

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

  // Fetch brochures on mount (default tab)
  useEffect(() => {
    if (!brochuresFetched.current) {
      brochuresFetched.current = true;
      loadBrochures(1);
    }
  }, [loadBrochures]);

  // Fetch videos lazily when that tab is first opened
  const handleTabSwitch = (tab: AssetTab) => {
    setActiveTab(tab);
    if (tab === 'videos' && !videosFetched.current) {
      videosFetched.current = true;
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
  const handleShare = async (item: AssetItem) => {
    const idStr = String(item.id);
    if (sharingId) return;
    setSharingId(idStr);
    try {
      const shareOptions: {
        title: string;
        message: string;
        url?: string;
        type?: string;
        failOnCancel?: boolean;
      } = {
        title: item.title,
        message: item.title,
        failOnCancel: false,
      };

      if (item.fileUrl) {
        shareOptions.url = resolveAssetUrl(item.fileUrl);
        shareOptions.type = getMimeType(item.fileType);
      } else if (item.imageUrl) {
        shareOptions.url = resolveAssetUrl(item.imageUrl);
        shareOptions.type = 'image/jpeg';
      }

      await Share.open(shareOptions);
    } catch (error) {
      if (!isUserCancelError(error)) {
        console.warn('Share error:', error);
      }
    } finally {
      setSharingId(null);
    }
  };

  // ── Download ─────────────────────────────────────────────────────────────────
  const handleDownload = async (item: AssetItem) => {
    if (!item.fileUrl) {
      Alert.alert('Not available', 'No download URL is set for this item yet.');
      return;
    }
    if (downloadingId !== null || item.isDownloaded || localDownloadedIds.has(item.id)) return;

    setDownloadingId(item.id);

    const ext = item.fileType.toLowerCase();
    const fileName = `${item.title.replace(/\s+/g, '_')}_${item.id}.${ext}`;
    const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      const success = await downloadAssetFile(item, destPath);
      if (success) {
        setLocalDownloadedIds(prev => new Set([...prev, item.id]));
        // Notify server
        markAssetDownloaded(item.id).catch(() => {});
        Alert.alert('Downloaded', `"${item.title}" saved to your device.`);
      } else {
        Alert.alert('Error', 'Download failed. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Failed to download the file.');
    } finally {
      setDownloadingId(null);
    }
  };

  const isDownloaded = (item: AssetItem) =>
    item.isDownloaded || localDownloadedIds.has(item.id);

  const featuredVideo = videos[0] ?? null;

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
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.videosContent}
          >
            {/* Featured Player */}
            {featuredVideo && <FeaturedVideoPlayer video={featuredVideo} />}

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
                isDownloaded={isDownloaded(video)}
                isDownloading={downloadingId === video.id}
                isSharing={sharingId === String(video.id)}
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
  loaderMarginV12: {
    marginVertical: 12,
  },
});

export default AssetsScreen;
