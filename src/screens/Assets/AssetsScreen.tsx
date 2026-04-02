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
import RNFS from 'react-native-fs';
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

// ─── Screen constants ──────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;
const IMAGE_HEIGHT = CARD_WIDTH * 0.82;
const FEATURED_HEIGHT = 220;

// ─── Types ─────────────────────────────────────────────────────────────────────
type AssetTab = 'brochures' | 'videos';
type BadgeType = 'new' | 'downloaded';

interface Asset {
  id: string;
  title: string;
  fileType: string;
  fileSize: string;
  duration?: string; // e.g. "05:20"
  badge?: BadgeType;
  tab: AssetTab;
  fileUrl?: string;
  imageUrl?: string;
  link?: string;
}

// ─── Dummy data ────────────────────────────────────────────────────────────────
// Public sample MP4 used as placeholder until backend is ready
const DUMMY_VIDEO_URL =
  'https://www.w3schools.com/html/mov_bbb.mp4';

const DUMMY_ASSETS: Asset[] = [
  // Brochures
  { id: '1', title: 'Monoskin Product Brochure', fileType: 'PDF', fileSize: '2.4 MB', badge: 'downloaded', tab: 'brochures' },
  { id: '2', title: 'Monoskin Product Brochure', fileType: 'PDF', fileSize: '1.8 MB', badge: 'new', tab: 'brochures' },
  { id: '3', title: 'Monoskin Product Brochure', fileType: 'PDF', fileSize: '2.4 MB', tab: 'brochures' },
  { id: '4', title: 'Monoskin Product Brochure', fileType: 'PDF', fileSize: '2.4 MB', tab: 'brochures' },
  { id: '5', title: 'Monoskin Product Brochure', fileType: 'PDF', fileSize: '2.4 MB', tab: 'brochures' },
  { id: '6', title: 'Monoskin Product Brochure', fileType: 'PDF', fileSize: '2.4 MB', tab: 'brochures' },
  { id: '7', title: 'Monoskin Product Brochure', fileType: 'PDF', fileSize: '2.4 MB', tab: 'brochures' },
  // Videos
  {
    id: '8', title: 'Monoskin Video-01', fileType: 'MP4', fileSize: '18MB',
    duration: '05:20', badge: 'new', tab: 'videos',
    fileUrl: DUMMY_VIDEO_URL,
  },
  {
    id: '9', title: 'Monoskin Video-02', fileType: 'MP4', fileSize: '24MB',
    duration: '08:15', badge: 'downloaded', tab: 'videos',
    fileUrl: DUMMY_VIDEO_URL,
  },
  {
    id: '10', title: 'Monoskin Video-03', fileType: 'MP4', fileSize: '12MB',
    duration: '03:45', tab: 'videos',
    fileUrl: DUMMY_VIDEO_URL,
  },
];

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
  video: Asset;
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

  // Resets the 5-sec hide timer if playing
  const resetHideTimer = useCallback(() => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (!paused && !isEnded) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
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
      // Replay
      videoRef.current?.seek(0);
      setIsEnded(false);
      setPaused(false);
      setCurrentTime(0);
    } else {
      setPaused(p => !p);
    }
    setShowControls(true); // Ensure they stay visible right when tapping
  };

  const onProgress = useCallback((data: { currentTime: number }) => {
    if (!isEnded) {
      setCurrentTime(data.currentTime);
    }
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
    setShowControls(true); // Bring controls back so they see the replay button
  }, []);

  const handleSeek = (event: any) => {
    if (duration <= 0) return;
    const { locationX } = event.nativeEvent;
    // measure bar width via layout
    const ratio = Math.min(Math.max(locationX / (SCREEN_WIDTH - HORIZONTAL_PADDING * 2), 0), 1);
    const seekTo = ratio * duration;
    videoRef.current?.seek(seekTo);
    setCurrentTime(seekTo);
    if (isEnded) setIsEnded(false);
    resetHideTimer();
  };

  return (
    <View style={styles.featuredContainer}>
      {/* Video */}
      {video.fileUrl ? (
        <Video
          ref={videoRef}
          source={{ uri: video.fileUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          paused={paused}
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

      {/* Touchable overlay capturing taps anywhere on video body to toggle controls */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={toggleControls}
      >
        {showControls && (
          <>
            {/* Dark gradient overlay for readability */}
            <View style={styles.featuredOverlay} />

            {/* Play / Pause / Replay button */}
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

            {/* Bottom info: title + progress */}
            <View style={styles.featuredBottom}>
              <Text style={styles.featuredTitle} numberOfLines={1}>
                {video.title}
              </Text>

              {/* Progress bar */}
              <TouchableOpacity
                style={styles.progressBarTrack}
                activeOpacity={1}
                onPress={handleSeek}
              >
                <View style={[styles.progressBarFill, { width: `${progress * 100}%` as any }]} />
                {/* Thumb dot */}
                <View
                  style={[
                    styles.progressThumb,
                    { left: `${progress * 100}%` as any, marginLeft: -6 },
                  ]}
                />
              </TouchableOpacity>

              {/* Timestamps */}
              <View style={styles.featuredTimestamps}>
                <Text style={styles.featuredTime}>{formatSeconds(currentTime)}</Text>
                <Text style={styles.featuredTime}>{formatSeconds(duration)}</Text>
              </View>
            </View>
          </>
        )}
      </TouchableOpacity>

      {/* Loading indicator (Always atop, unaffected by control visibility) */}
      {loading && (
        <ActivityIndicator
          size="large"
          color={COLORS.white}
          style={styles.featuredLoader}
        />
      )}
    </View>
  );
};

// ─── Video List Item ───────────────────────────────────────────────────────────
interface VideoListItemProps {
  item: Asset;
  isDownloaded: boolean;
  isDownloading: boolean;
  isSharing: boolean;
  onDownload: (item: Asset) => void;
  onShare: (item: Asset) => void;
}

const VideoListItem: React.FC<VideoListItemProps> = ({
  item, isDownloaded, isDownloading, isSharing, onDownload, onShare,
}) => (
  <View style={styles.videoListItem}>
    {/* Thumbnail */}
    <View style={styles.videoThumbContainer}>
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
    </View>

    {/* Info */}
    <View style={styles.videoListInfo}>
      <Text style={styles.videoListTitle} numberOfLines={1}>{item.title}</Text>
      <View style={styles.videoListMeta}>
        <ClockIcon width={12} height={12} stroke={COLORS.textSecondary} />
        <Text style={styles.videoListMetaText}>{item.duration ?? '--:--'}</Text>
        {/* <Text style={styles.videoListMetaSep}> 🗂 </Text> */}
        <Stack width={12} height={12} />
        <Text style={styles.videoListMetaText}>{item.fileSize}</Text>
      </View>
    </View>

    {/* Actions: download + share */}
    <View style={styles.videoListActions}>
      {/* Download */}
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

      {/* Share */}
      <TouchableOpacity
        style={[styles.videoActionBtn, isSharing && { opacity: 0.5 }]}
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

// ─── Brochure Card (unchanged grid layout) ────────────────────────────────────
interface AssetCardProps {
  item: Asset;
  onShare: (item: Asset) => void;
  isSharing: boolean;
}

const AssetCard: React.FC<AssetCardProps> = ({ item, onShare, isSharing }) => (
  <View style={styles.card}>
    <View style={styles.imageContainer}>
      <ImageBackground
        source={require('@/assets/images/background/Brochure.png')}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
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
      <Text style={styles.cardSubtitle}>{item.fileType} • {item.fileSize}</Text>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.viewButton} activeOpacity={0.8}>
          <EyeIcon stroke={COLORS.white} width={14} height={14} />
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onShare(item)}
          style={[styles.shareButton, isSharing && { opacity: 0.5 }]}
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

// ─── Main Screen ───────────────────────────────────────────────────────────────
const AssetsScreen = () => {
  const [activeTab, setActiveTab] = useState<AssetTab>('brochures');
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  const brochures = DUMMY_ASSETS.filter(a => a.tab === 'brochures');
  const videos = DUMMY_ASSETS.filter(a => a.tab === 'videos');
  const featuredVideo = videos[0];

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = async (item: Asset) => {
    if (sharingId) return;
    setSharingId(item.id);
    try {
      const shareOptions: {
        title: string;
        message: string;
        url?: string;
        type?: string;
        failOnCancel?: boolean;
      } = {
        title: item.title,
        message: item.link
          ? `${item.title}\n\nWatch here:\n${item.link}`
          : item.title,
        failOnCancel: false,
      };

      if (item.fileUrl) {
        shareOptions.url = item.fileUrl;
        shareOptions.type = getMimeType(item.fileType);
      } else if (item.imageUrl) {
        shareOptions.url = item.imageUrl;
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

  // ── Download ───────────────────────────────────────────────────────────────
  const handleDownload = async (item: Asset) => {
    if (!item.fileUrl) {
      Alert.alert('Not available', 'No download URL is set for this video yet.');
      return;
    }
    if (downloadingId || downloadedIds.has(item.id)) return;

    setDownloadingId(item.id);

    const fileName = `${item.title.replace(/\s+/g, '_')}_${item.id}.mp4`;
    const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      const result = await RNFS.downloadFile({
        fromUrl: item.fileUrl,
        toFile: destPath,
        progressDivider: 10,
      }).promise;

      if (result.statusCode === 200) {
        setDownloadedIds(prev => new Set([...prev, item.id]));
        Alert.alert('Downloaded', `"${item.title}" saved to your device.`);
      } else {
        Alert.alert('Error', 'Download failed. Please try again.');
      }
    } catch (err) {
      console.warn('Download error:', err);
      Alert.alert('Error', 'Failed to download the video.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Assets" showBack showNotification showProfile />

      {/* Tab Bar */}
      <View style={styles.tabSection}>
        <View style={styles.tabWrapper}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'brochures' && styles.activeTab]}
            onPress={() => setActiveTab('brochures')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'brochures' && styles.activeTabText]}>
              Brochures
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
            onPress={() => setActiveTab('videos')}
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
        <FlatList
          data={brochures}
          renderItem={({ item }) => (
            <AssetCard
              item={item}
              onShare={handleShare}
              isSharing={sharingId === item.id}
            />
          )}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Videos Tab ── */}
      {activeTab === 'videos' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.videosContent}
        >
          {/* Featured Player */}
          {featuredVideo && (
            <FeaturedVideoPlayer video={featuredVideo} />
          )}

          {/* Library header */}
          <View style={styles.libraryHeader}>
            <Text style={styles.libraryTitle}>Video Library</Text>
            <Text style={styles.libraryCount}>{videos.length} VIDEOS</Text>
          </View>

          {/* Video List */}
          {videos.map(video => (
            <VideoListItem
              key={video.id}
              item={video}
              isDownloaded={downloadedIds.has(video.id)}
              isDownloading={downloadingId === video.id}
              isSharing={sharingId === video.id}
              onDownload={handleDownload}
              onShare={handleShare}
            />
          ))}
        </ScrollView>
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
    backgroundColor: 'rgba(0,0,0,0.35)',
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
  videoListMetaSep: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    marginHorizontal: 2,
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
});

export default AssetsScreen;
