import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import { ENDPOINTS } from '@/constants/endpoints';
import Header from '@/components/common/Header';
import { LoginTimeIcon, LogoutTimeIcon } from '@/assets/images';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import apiClient from '@/services/apiClient';
import {
  transformAttendanceData,
  AttendanceApiRecord,
  AttendanceHistoryItem,
} from '@/utils/attendanceFormatter';

// ─── Constants ─────────────────────────────────────────────────────────────────

const FILTERS = ['All Time', 'This Week', 'October', 'September'];
const PAGE_LIMIT = 20;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'PRESENT':
      return { bg: '#E8F5E9', text: '#388E3C', dot: '#388E3C' };
    case 'LATE':
      return { bg: '#FFF3E0', text: '#F57C00', dot: '#F57C00' };
    case 'ABSENT':
      return { bg: '#FFEBEE', text: '#D32F2F', dot: '#D32F2F' };
    default:
      return { bg: '#F5F5F5', text: '#9E9E9E', dot: '#9E9E9E' };
  }
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const AttendanceCard = React.memo(({ item }: { item: AttendanceHistoryItem }) => {
  const statusStyle = getStatusStyle(item.status);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          {item.isToday && <Text style={styles.todayLabel}>TODAY</Text>}
          <Text style={styles.dateText}>{item.date}</Text>
          <Text style={styles.dayText}>{item.day}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusStyle.dot }]} />
          <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.timeRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>TIME IN</Text>
          <View style={styles.timeValueRow}>
            <LoginTimeIcon />
            <Text style={[styles.timeValue, item.status === 'ABSENT' && styles.timeValueAbsent]}>
              {item.timeIn}
            </Text>
          </View>
        </View>

        <View style={[styles.timeBlock, styles.timeBlockRight]}>
          <Text style={styles.timeLabel}>TIME OUT</Text>
          <View style={styles.timeValueRow}>
            <LogoutTimeIcon />
            <Text style={[styles.timeValue, item.status === 'ABSENT' && styles.timeValueAbsent]}>
              {item.timeOut}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const EmptyList = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyText}>No attendance records found.</Text>
  </View>
);

const FooterLoader = () => (
  <View style={styles.footerLoader}>
    <ActivityIndicator size="small" color={COLORS.buttonBlue} />
  </View>
);

// ─── Screen ────────────────────────────────────────────────────────────────────

const AttendanceHistoryScreen = () => {
  const userId = useSelector((state: RootState) => state.auth.user?.id);

  const [activeFilter, setActiveFilter] = useState('All Time');
  const [records, setRecords] = useState<AttendanceHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadingMoreRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    setPage(1);
    setHasMore(true);
    setRecords([]);

    apiClient
      .get<AttendanceApiRecord[]>(ENDPOINTS.attendance.history(userId), {
        params: { page: 1, limit: PAGE_LIMIT },
      })
      .then((response) => {
        const raw: AttendanceApiRecord[] = Array.isArray(response.data)
          ? response.data
          : [];
        if (raw.length < PAGE_LIMIT) setHasMore(false);
        setRecords(transformAttendanceData(raw));
      })
      .catch(() => {
        setHasMore(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMoreRef.current || !userId) return;

    const nextPage = page + 1;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setPage(nextPage);

    apiClient
      .get<AttendanceApiRecord[]>(ENDPOINTS.attendance.history(userId), {
        params: { page: nextPage, limit: PAGE_LIMIT },
      })
      .then((response) => {
        const raw: AttendanceApiRecord[] = Array.isArray(response.data)
          ? response.data
          : [];
        if (raw.length < PAGE_LIMIT) setHasMore(false);
        const transformed = transformAttendanceData(raw);
        setRecords((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          return [...prev, ...transformed.filter((r) => !existingIds.has(r.id))];
        });
      })
      .catch(() => {
        setHasMore(false);
      })
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [hasMore, page, userId]);

  const renderItem = useCallback(
    ({ item }: { item: AttendanceHistoryItem }) => <AttendanceCard item={item} />,
    [],
  );

  const keyExtractor = useCallback((item: AttendanceHistoryItem) => item.id, []);

  const listFooter = loadingMore ? <FooterLoader /> : null;

  if (loading) {
    return (
      <View style={styles.mainContainer}>
        <Header title="Attendance History" showBack showNotification showProfile />
        <View style={styles.fullScreenLoader}>
          <ActivityIndicator size="large" color={COLORS.buttonBlue} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <Header title="Attendance History" showBack showNotification showProfile />

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.filterPill, activeFilter === item && styles.filterPillActive]}
              onPress={() => setActiveFilter(item)}
            >
              <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={records}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={EmptyList}
        ListFooterComponent={listFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fullScreenLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  filterPillActive: {
    backgroundColor: COLORS.buttonBlue,
    borderColor: COLORS.buttonBlue,
  },
  filterText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.family.bold,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  todayLabel: {
    fontSize: 10,
    fontFamily: FONTS.family.bold,
    color: COLORS.primary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dateText: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: '#000',
    marginBottom: 2,
  },
  dayText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontFamily: FONTS.family.bold,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBlock: {
    width: '45%',
  },
  timeBlockRight: {
    alignItems: 'flex-end',
  },
  timeLabel: {
    fontSize: 10,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  timeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeValue: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: '#000',
  },
  timeValueAbsent: {
    color: '#B0B0B0',
    fontFamily: FONTS.family.regular,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default AttendanceHistoryScreen;
