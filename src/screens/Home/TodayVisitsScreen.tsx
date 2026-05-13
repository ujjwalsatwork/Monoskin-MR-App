import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import { MapPinOutlineIcon } from '@/assets/images';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import { AppDispatch, RootState } from '@/redux/store';
import { fetchTodayRoute, RouteStop, setRouteNeedsRefresh } from '@/redux/slices/routeSlice';

type StopStatus = 'in_progress' | 'upcoming' | 'completed';

const STATUS_CONFIG: Record<StopStatus, { label: string; bg: string; color: string }> = {
  in_progress: { label: 'IN PROGRESS', bg: 'rgba(46, 80, 178, 0.12)', color: COLORS.buttonBlue },
  upcoming:    { label: 'UPCOMING',    bg: '#F0F0F0',                  color: '#666666' },
  completed:   { label: 'COMPLETED',   bg: 'rgba(56, 142, 60, 0.12)', color: COLORS.success },
};

const mapStatus = (s: RouteStop['status']): StopStatus => {
  if (s === 'DONE') return 'completed';
  if (s === 'TARGET') return 'in_progress';
  return 'upcoming';
};

const TodayVisitsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const dispatch = useDispatch<AppDispatch>();

  const { data, loading, error } = useSelector((state: RootState) => state.route.today);
  const needsRefresh = useSelector((state: RootState) => state.route.needsRefresh);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchTodayRoute());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      if (needsRefresh) {
        dispatch(setRouteNeedsRefresh(false));
        dispatch(fetchTodayRoute());
      }
    }, [needsRefresh, dispatch]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchTodayRoute());
    setRefreshing(false);
  }, [dispatch]);

  const stops = data?.stops ?? [];
  const completed = data?.summary.completed ?? 0;
  const total = data?.summary.total ?? 0;

  const handleStopPress = (stop: RouteStop) => {
    navigation.navigate('VisitDetail', {
      doctorId: stop.doctorId ? String(stop.doctorId) : undefined,
      pharmacyId: stop.pharmacyId ? String(stop.pharmacyId) : undefined,
      routeStopId: stop.id,
    });
  };

  const renderStop = ({ item }: { item: RouteStop }) => {
    const uiStatus = mapStatus(item.status);
    const config = STATUS_CONFIG[uiStatus];
    return (
      <TouchableOpacity
        style={styles.visitCard}
        onPress={() => handleStopPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.visitCardTop}>
          <Text
            style={[
              styles.visitTime,
              uiStatus === 'in_progress' && styles.visitTimeActive,
            ]}
          >
            {item.plannedTime || ''}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>
        <Text style={styles.visitName} numberOfLines={1}>{item.name}</Text>
        {!!item.address && (
          <View style={styles.visitAddressRow}>
            <MapPinOutlineIcon />
            <Text style={styles.visitAddress} numberOfLines={1}> {item.address}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <Header title="Today's Visits" showBack showNotification showProfile />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.buttonBlue} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.safeArea}>
        <Header title="Today's Visits" showBack showNotification showProfile />
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => dispatch(fetchTodayRoute())}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <Header title="Today's Visits" showBack showNotification showProfile />

      <FlatList
        data={stops}
        keyExtractor={item => String(item.id)}
        renderItem={renderStop}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.buttonBlue]}
            tintColor={COLORS.buttonBlue}
          />
        }
        ListHeaderComponent={
          <View style={styles.progressCard}>
            <View style={styles.progressLeft}>
              <Text style={styles.progressMeta}>Daily Progress</Text>
              <Text style={styles.progressCount}>{total} Planned{'\n'}Calls</Text>
            </View>
            <View style={styles.progressRight}>
              <Text style={styles.completedCount}>{completed}</Text>
              <Text style={styles.completedLabel}>Completed</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.centerState}>
              <Text style={styles.emptyText}>No visits planned for today</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingVertical: 48,
  },
  errorText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: COLORS.buttonBlue,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 12,
  },
  progressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 4,
  },
  progressLeft: { flex: 1 },
  progressMeta: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  progressCount: {
    fontSize: FONTS.size.xxl,
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
    lineHeight: 30,
  },
  progressRight: { alignItems: 'flex-end' },
  completedCount: {
    fontSize: FONTS.size.xxl,
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
  },
  completedLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  visitCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
  },
  visitCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  visitTime: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
  },
  visitTimeActive: {
    color: COLORS.buttonBlue,
    fontFamily: FONTS.family.bold,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    letterSpacing: 0.4,
  },
  visitName: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 8,
  },
  visitAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visitAddress: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    flex: 1,
  },
});

export default TodayVisitsScreen;
