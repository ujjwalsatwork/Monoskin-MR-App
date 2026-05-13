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
    RefreshControl,
} from 'react-native';
import dayjs from 'dayjs';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import { ENDPOINTS } from '@/constants/endpoints';
import Header from '@/components/common/Header';
import { LoginTimeIcon, LogoutTimeIcon } from '@/assets/images';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store';
import apiClient from '@/services/apiClient';
import { fetchMyProfile } from '@/redux/slices/profileSlice';
import {
    transformAttendanceDays,
    AttendanceApiRecord,
    AttendanceDayItem,
    PairedSession,
} from '@/utils/attendanceFormatter';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 20;

// yearMonth is "YYYY-MM" for month filters, null for special filters.
// Avoids needing dayjs customParseFormat plugin at filter time.
interface FilterItem {
    label: string;
    yearMonth: string | null;
}

const buildFilters = (): FilterItem[] => {
    const filters: FilterItem[] = [
        { label: 'All Time', yearMonth: null },
        { label: 'This Week', yearMonth: null },
    ];
    const now = dayjs();
    for (let i = 0; i < 5; i++) {
        const m = now.subtract(i, 'month');
        filters.push({ label: m.format('MMMM YYYY'), yearMonth: m.format('YYYY-MM') });
    }
    return filters;
};

const FILTERS = buildFilters();

const applyFilter = (records: AttendanceDayItem[], filter: FilterItem): AttendanceDayItem[] => {
    if (filter.label === 'All Time') return records;
    if (filter.label === 'This Week') {
        const start = dayjs().startOf('week');
        const end = dayjs().endOf('week');
        return records.filter((r) => {
            const d = dayjs(r.id);
            return !d.isBefore(start) && !d.isAfter(end);
        });
    }
    // Month filter: r.id is "YYYY-MM-DD", so startsWith("YYYY-MM") is exact
    return records.filter((r) => r.id.startsWith(filter.yearMonth!));
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

const SessionTimeline = ({ sessions }: { sessions: PairedSession[] }) => {
    if (sessions.length <= 1) return null;
    return (
        <View style={styles.timeline}>
            {sessions.map((session, index) => (
                <View key={index} style={styles.timelineRow}>
                    <View style={styles.timelineIndicator}>
                        <View style={[styles.timelineDot, session.isActive && styles.timelineDotActive]} />
                        {index < sessions.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineContent}>
                        <Text style={styles.timelineSessionLabel}>Session {index + 1}</Text>
                        <View style={styles.timelineTimeRow}>
                            <View style={styles.timelineTimeBlock}>
                                <LoginTimeIcon />
                                <Text style={styles.timelineTime}>{session.checkIn ?? '--:-- --'}</Text>
                            </View>
                            <Text style={styles.timelineArrow}>→</Text>
                            <View style={styles.timelineTimeBlock}>
                                <LogoutTimeIcon />
                                <Text style={[styles.timelineTime, session.isActive && styles.timelineTimeActive]}>
                                    {session.checkOut ?? (session.isActive ? 'Active' : '--:-- --')}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );
};

const AttendanceCard = React.memo(({ item }: { item: AttendanceDayItem }) => {
    const statusStyle = getStatusStyle(item.status);
    const hasMultipleSessions = item.sessions.length > 1;

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    {item.isToday && <Text style={styles.todayLabel}>TODAY</Text>}
                    <Text style={styles.dateText}>{item.date}</Text>
                    <Text style={styles.dayText}>{item.day}</Text>
                    {hasMultipleSessions && (
                        <Text style={styles.sessionCountLabel}>
                            {item.sessions.length} sessions
                        </Text>
                    )}
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusStyle.dot }]} />
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {item.status}
                    </Text>
                </View>
            </View>

            <View style={styles.divider} />

            {hasMultipleSessions ? (
                <SessionTimeline sessions={item.sessions} />
            ) : (
                <View style={styles.timeRow}>
                    <View style={styles.timeBlock}>
                        <Text style={styles.timeLabel}>TIME IN</Text>
                        <View style={styles.timeValueRow}>
                            <LoginTimeIcon />
                            <Text
                                style={[
                                    styles.timeValue,
                                    item.status === 'ABSENT' && styles.timeValueAbsent,
                                ]}
                            >
                                {item.firstCheckIn}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.timeBlock, styles.timeBlockRight]}>
                        <Text style={styles.timeLabel}>TIME OUT</Text>
                        <View style={styles.timeValueRow}>
                            <LogoutTimeIcon />
                            <Text
                                style={[
                                    styles.timeValue,
                                    item.status === 'ABSENT' && styles.timeValueAbsent,
                                ]}
                            >
                                {item.lastCheckOut}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
});

const EmptyList = () => (
    <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No attendance available.</Text>
    </View>
);

const FooterLoader = () => (
    <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.buttonBlue} />
    </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const AttendanceHistoryScreen = () => {
    const dispatch = useDispatch<AppDispatch>();
    const mrId = useSelector((state: RootState) => state.profile.data?.id);
    const profileLoading = useSelector((state: RootState) => state.profile.isLoading);

    const [activeFilter, setActiveFilter] = useState<FilterItem>(FILTERS[0]);
    const [records, setRecords] = useState<AttendanceDayItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Refs prevent stale-closure races: isFetchingRef covers both initial load
    // and load-more so onEndReached can never fire a second concurrent request.
    const isFetchingRef = useRef(false);
    const hasMoreRef = useRef(true);
    const pageRef = useRef(1);
    // Gate that opens only on a real scroll gesture (drag or momentum).
    // Prevents onEndReached from firing on layout-triggered threshold crosses
    // (e.g. footer loader appearing) and iOS momentum re-fires.
    const allowLoadMoreRef = useRef(false);

    // Ensure profile (and thus the correct mrId) is loaded
    useEffect(() => {
        if (!mrId && !profileLoading) {
            dispatch(fetchMyProfile());
        }
    }, [dispatch, mrId, profileLoading]);

    const doFetch = useCallback(
        async (pageNum: number, replace: boolean) => {
            if (!mrId || isFetchingRef.current) return;
            if (!replace && !hasMoreRef.current) return;

            isFetchingRef.current = true;
            if (replace) setLoading(true);
            else setLoadingMore(true);

            try {
                const { data } = await apiClient.get<AttendanceApiRecord[]>(
                    ENDPOINTS.attendance.history(mrId),
                    { params: { page: pageNum, limit: PAGE_LIMIT } },
                );
                const raw = Array.isArray(data) ? data : [];
                if (raw.length < PAGE_LIMIT) {
                    hasMoreRef.current = false;
                }
                const transformed = transformAttendanceDays(raw);
                if (replace) {
                    setRecords(transformed);
                } else {
                    setRecords((prev) => {
                        const existingIds = new Set(prev.map((r) => r.id));
                        return [...prev, ...transformed.filter((r) => !existingIds.has(r.id))];
                    });
                }
                pageRef.current = pageNum;
            } catch {
                hasMoreRef.current = false;
            } finally {
                isFetchingRef.current = false;
                if (replace) setLoading(false);
                else setLoadingMore(false);
            }
        },
        [mrId],
    );

    // Initial load — re-runs only when mrId becomes available (profile loaded)
    useEffect(() => {
        if (!mrId) return;
        hasMoreRef.current = true;
        pageRef.current = 1;
        setRecords([]);
        doFetch(1, true);
    }, [mrId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleLoadMore = useCallback(() => {
        if (!allowLoadMoreRef.current || !hasMoreRef.current || isFetchingRef.current) return;
        allowLoadMoreRef.current = false;
        doFetch(pageRef.current + 1, false);
    }, [doFetch]);

    const handleRefresh = useCallback(async () => {
        if (isFetchingRef.current) return;
        setRefreshing(true);
        hasMoreRef.current = true;
        pageRef.current = 1;
        setRecords([]);
        await doFetch(1, true);
        setRefreshing(false);
    }, [doFetch]);

    const handleFilterPress = useCallback((filter: FilterItem) => {
        setActiveFilter(filter);
    }, []);

    const renderItem = useCallback(
        ({ item }: { item: AttendanceDayItem }) => <AttendanceCard item={item} />,
        [],
    );

    const keyExtractor = useCallback((item: AttendanceDayItem) => item.id, []);

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
                            key={item.label}
                            style={[
                                styles.filterPill,
                                activeFilter.label === item.label && styles.filterPillActive,
                            ]}
                            onPress={() => handleFilterPress(item)}
                        >
                            <Text
                                style={[
                                    styles.filterText,
                                    activeFilter.label === item.label && styles.filterTextActive,
                                ]}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={applyFilter(records, activeFilter)}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ListEmptyComponent={EmptyList}
                ListFooterComponent={listFooter}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.1}
                onScrollBeginDrag={() => { allowLoadMoreRef.current = true; }}
                onMomentumScrollBegin={() => { allowLoadMoreRef.current = true; }}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                initialNumToRender={10}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[COLORS.buttonBlue]}
                        tintColor={COLORS.buttonBlue}
                    />
                }
            />
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    sessionCountLabel: {
        fontSize: 10,
        fontFamily: FONTS.family.bold,
        color: COLORS.buttonBlue,
        marginTop: 4,
        letterSpacing: 0.3,
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
    // Single-session time row
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
    // Multi-session timeline
    timeline: {
        paddingTop: 4,
    },
    timelineRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    timelineIndicator: {
        width: 20,
        alignItems: 'center',
        marginRight: 12,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.buttonBlue,
        marginTop: 4,
    },
    timelineDotActive: {
        backgroundColor: COLORS.success,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#E0E0E0',
        marginTop: 4,
        marginBottom: -4,
        alignSelf: 'center',
    },
    timelineContent: {
        flex: 1,
        paddingBottom: 8,
    },
    timelineSessionLabel: {
        fontSize: 10,
        fontFamily: FONTS.family.bold,
        color: COLORS.textSecondary,
        letterSpacing: 0.4,
        marginBottom: 6,
    },
    timelineTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timelineTimeBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timelineArrow: {
        fontSize: FONTS.size.sm,
        color: COLORS.textSecondary,
    },
    timelineTime: {
        fontSize: FONTS.size.md,
        fontFamily: FONTS.family.bold,
        color: '#000',
    },
    timelineTimeActive: {
        color: COLORS.success,
        fontFamily: FONTS.family.medium,
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
