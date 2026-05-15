import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import {
  BackArrowIconBlack,
  DoctorBagIcon,
  Stack as StackIcon,
  Up as UpArrowIcon,
  InfoIcon,
  CalendarNoteIcon,
} from '@/assets/images';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
  type NotificationFilterType,
} from '@/services/notificationsService';

// ─── Types ─────────────────────────────────────────────────────────────────────

type UIFilterType = 'All' | 'Visits' | 'Orders' | 'Targets';

const UI_TO_API: Record<UIFilterType, NotificationFilterType> = {
  All: 'ALL',
  Visits: 'VISIT',
  Orders: 'ORDER',
  Targets: 'TARGET',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getIconForType(type: Notification['type']) {
  switch (type) {
    case 'VISIT':
      return <DoctorBagIcon stroke={COLORS.primary} width={18} height={18} />;
    case 'ORDER':
      return <StackIcon stroke={COLORS.primary} width={18} height={18} fill={COLORS.primary} />;
    case 'TARGET':
      return <UpArrowIcon stroke={COLORS.primary} width={18} height={18} />;
    default:
      return <InfoIcon stroke={COLORS.primary} width={18} height={18} />;
  }
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}M AGO`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}H AGO`;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const itemDay = new Date(date); itemDay.setHours(0, 0, 0, 0);

  if (itemDay.getTime() === today.getTime()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (itemDay.getTime() === yesterday.getTime()) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDayBucket(iso: string): string {
  const date = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const itemDay = new Date(date); itemDay.setHours(0, 0, 0, 0);

  if (itemDay.getTime() === today.getTime()) return 'TODAY';
  if (itemDay.getTime() === yesterday.getTime()) return 'YESTERDAY';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

// ─── Grouped list item types ────────────────────────────────────────────────────

type ListItem =
  | { kind: 'header'; label: string }
  | { kind: 'notification'; data: Notification };

function buildListItems(notifications: Notification[]): ListItem[] {
  const items: ListItem[] = [];
  let lastBucket = '';
  for (const n of notifications) {
    const bucket = getDayBucket(n.timestamp);
    if (bucket !== lastBucket) {
      items.push({ kind: 'header', label: bucket });
      lastBucket = bucket;
    }
    items.push({ kind: 'notification', data: n });
  }
  return items;
}

// ─── Screen ─────────────────────────────────────────────────────────────────────

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<UIFilterType>('All');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters: UIFilterType[] = ['All', 'Visits', 'Orders', 'Targets'];

  const loadNotifications = useCallback(
    async (filter: UIFilterType, pageNum: number, append = false) => {
      try {
        setError(null);
        const result = await fetchNotifications(UI_TO_API[filter], pageNum);
        setUnreadCount(result.unreadCount);
        setTotalPages(result.pagination.totalPages);
        setNotifications(prev =>
          append ? [...prev, ...result.notifications] : result.notifications,
        );
      } catch {
        setError('Failed to load notifications. Pull down to retry.');
      }
    },
    [],
  );

  // Initial load & filter change
  useEffect(() => {
    setPage(1);
    setLoading(true);
    loadNotifications(activeFilter, 1, false).finally(() => setLoading(false));
  }, [activeFilter, loadNotifications]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await loadNotifications(activeFilter, 1, false);
    setRefreshing(false);
  }, [activeFilter, loadNotifications]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    await loadNotifications(activeFilter, nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  }, [loadingMore, page, totalPages, activeFilter, loadNotifications]);

  const handleMarkRead = useCallback(async (id: number) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await markNotificationRead(id);
    } catch {
      // Roll back on failure
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: false } : n)),
      );
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      // Refetch to restore accurate state on failure
      await loadNotifications(activeFilter, 1, false);
      setPage(1);
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, unreadCount, activeFilter, loadNotifications]);

  const listItems = buildListItems(notifications);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <BackArrowIconBlack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllRead}
            disabled={markingAll}
          >
            <Text style={styles.markAllText}>
              {markingAll ? 'Marking…' : 'Mark all read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                activeOpacity={0.8}
                style={[
                  styles.filterChip,
                  isActive ? styles.filterChipActive : styles.filterChipInactive,
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive ? styles.filterTextActive : styles.filterTextInactive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.listContainer,
            notifications.length === 0 && styles.emptyListContainer,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isNearBottom =
              layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;
            if (isNearBottom) handleLoadMore();
          }}
          scrollEventThrottle={400}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <CalendarNoteIcon stroke={COLORS.textSecondary} width={48} height={48} />
              <Text style={styles.emptyText}>No notifications</Text>
            </View>
          ) : (
            listItems.map((item) => {
              if (item.kind === 'header') {
                return (
                  <Text key={`header-${item.label}`} style={styles.sectionHeader}>
                    {item.label}
                  </Text>
                );
              }

              const n = item.data;
              return (
                <TouchableOpacity
                  key={n.id}
                  activeOpacity={n.isRead ? 1 : 0.7}
                  onPress={() => {
                    if (!n.isRead) handleMarkRead(n.id);
                  }}
                >
                  <View
                    style={[
                      styles.notificationCard,
                      !n.isRead ? styles.unreadCard : styles.readCard,
                    ]}
                  >
                    {!n.isRead && <View style={styles.unreadBorder} />}
                    <View style={styles.iconCircle}>{getIconForType(n.type)}</View>
                    <View style={styles.contentContainer}>
                      <Text style={styles.itemTitle}>{n.title}</Text>
                      <Text style={styles.itemDesc}>{n.description}</Text>
                      <Text
                        style={[
                          styles.itemTime,
                          !n.isRead ? styles.unreadTime : styles.readTime,
                        ]}
                      >
                        {formatTime(n.timestamp)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {loadingMore && (
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
              style={styles.loadMoreSpinner}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginLeft: 12,
    flex: 1,
  },
  markAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
    color: COLORS.primary,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  filterChipInactive: {
    borderColor: '#E8EDF1',
    backgroundColor: '#344EAD',
  },
  filterText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  filterTextInactive: {
    color: COLORS.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  retryText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.primary,
  },
  listContainer: {
    paddingBottom: 30,
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  sectionHeader: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  unreadCard: {
    backgroundColor: '#F7F9FB',
  },
  readCard: {
    backgroundColor: COLORS.white,
  },
  unreadBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.primary,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginRight: 16,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: '#000',
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  itemTime: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    textTransform: 'uppercase',
  },
  unreadTime: {
    color: COLORS.primary,
  },
  readTime: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.regular,
    textTransform: 'none',
  },
  loadMoreSpinner: {
    marginVertical: 16,
  },
});

export default NotificationsScreen;
