import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import {
  DoctorBagIcon,
  PillIcon,
  MapPinOutlineIcon,
  PlayIcon,
  MapIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@/assets/images';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import { AppDispatch, RootState } from '@/redux/store';
import {
  fetchRoute,
  setSelectedDate,
  clearRouteError,
  setRouteNeedsRefresh,
  RouteStop,
} from '@/redux/slices/routeSlice';

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const getWeekDays = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return DAY_LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { label, date: d };
  });
};

const formatDateForApi = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

type RouteScreenNavigationProp = NativeStackNavigationProp<AppStackParamList>;

const RouteScreen = () => {
  const navigation = useNavigation<RouteScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();

  const [selectedDate, setLocalSelectedDate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const { data: routeData, loading, error, needsRefresh } = useSelector(
    (state: RootState) => state.route,
  );
  const weekDays = getWeekDays();

  const loadRoute = useCallback(
    (date: Date) => {
      dispatch(fetchRoute({ date: formatDateForApi(date) }));
    },
    [dispatch],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchRoute({ date: formatDateForApi(selectedDate) }));
    setRefreshing(false);
  }, [dispatch, selectedDate]);

  useEffect(() => {
    loadRoute(selectedDate);
  }, [selectedDate, loadRoute]);

  useEffect(() => {
    return navigation.addListener('focus', () => {
      if (needsRefresh) {
        loadRoute(selectedDate);
        dispatch(setRouteNeedsRefresh(false));
      }
    });
  }, [navigation, needsRefresh, selectedDate, loadRoute, dispatch]);

  const handleDateSelect = (date: Date) => {
    setLocalSelectedDate(date);
    dispatch(setSelectedDate(formatDateForApi(date)));
    dispatch(clearRouteError());
  };

  const handleStartVisit = (stop: RouteStop) => {
    navigation.navigate('VisitDetail', {
      doctorId: stop.doctorId ? String(stop.doctorId) : undefined,
      pharmacyId: stop.pharmacyId ? String(stop.pharmacyId) : undefined,
      routeStopId: stop.id,
    });
  };

  const handleViewMap = () => {
    console.log('🚀 ~ handleViewMap ~ routeData:', routeData)
    if (!routeData) return;
    navigation.navigate('RouteMapScreen', {
      routeData: {
        readOnly: routeData.readOnly,
        origin: routeData.origin,
        stops: routeData.stops,
      },
    });
  };

  const progress =
    routeData && routeData.summary.total > 0
      ? routeData.summary.completed / routeData.summary.total
      : 0;

  const allDone =
    routeData != null &&
    routeData.stops.length > 0 &&
    routeData.stops.every(s => s.status === 'DONE');

  const buildStepMap = (stops: RouteStop[]): Record<number, number> => {
    const map: Record<number, number> = {};
    let counter = 0;
    stops.forEach(s => {
      if (s.status !== 'DONE') {
        counter += 1;
        map[s.id] = counter;
      }
    });
    return map;
  };

  const getReadOnlyBannerText = (): string => {
    if (!routeData) return '';
    const today = formatDateForApi(new Date());
    return routeData.date < today ? 'Past date — view only' : 'Future date — view only';
  };

  return (
    <View style={styles.mainContainer}>
      <Header title="Today's Route Plan" showBack showNotification showProfile />
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Date Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateScroll}
        >
          {weekDays.map((item, index) => {
            const isActive = isSameDay(selectedDate, item.date);
            return (
              <TouchableOpacity
                key={index}
                style={[styles.dateCard, isActive && styles.dateCardActive]}
                onPress={() => handleDateSelect(item.date)}
              >
                <Text style={[styles.dayText, isActive && styles.dayTextActive]}>
                  {item.label}
                </Text>
                <Text style={[styles.dateText, isActive && styles.dateTextActive]}>
                  {item.date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading && (
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color={COLORS.buttonBlue} />
          </View>
        )}

        {!loading && error && (
          <View style={styles.centeredContainer}>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadRoute(selectedDate)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && (!routeData || routeData.stops.length === 0) && (
          <View style={styles.centeredContainer}>
            <Text style={styles.emptyText}>No route planned for this date</Text>
          </View>
        )}

        {!loading && routeData && routeData.stops.length > 0 && (
          <>
            {/* Read-only banner */}
            {routeData.readOnly && (
              <View style={styles.readOnlyBanner}>
                <Text style={styles.readOnlyBannerText}>
                  {getReadOnlyBannerText()}
                </Text>
              </View>
            )}

            {/* Summary Cards */}
            <View style={styles.summaryRow}>
              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <DoctorBagIcon />
                  <Text style={styles.metricLabel}>Doctors</Text>
                </View>
                <Text style={styles.metricValue}>{routeData.summary.totalDoctors}</Text>
              </View>
              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <PillIcon />
                  <Text style={styles.metricLabel}>Chemists</Text>
                </View>
                <Text style={styles.metricValue}>{routeData.summary.totalChemists}</Text>
              </View>
            </View>

            {/* Daily Progress */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Daily Progress</Text>
                <Text style={styles.progressCountText}>
                  {routeData.summary.completed}/{routeData.summary.total} Completed
                </Text>
              </View>
              <View style={styles.progressBarBG}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.round(progress * 100)}%` },
                  ]}
                />
              </View>
            </View>

            {/* Map Card */}
            <View style={styles.mapCard}>
              <View style={styles.mapTextureLayer}>
                <View style={styles.mapIconCircle}>
                  <MapIcon />
                </View>
              </View>
              <TouchableOpacity style={styles.viewMapButton} onPress={handleViewMap}>
                <MapIcon height={14} />
                <Text style={styles.viewMapButtonText}>View Full Route Map</Text>
              </TouchableOpacity>
            </View>

            {/* Timeline Section */}
            <Text style={styles.timelineTitle}>TIMELINE OF VISITS</Text>

            {allDone ? (
              <View style={styles.completedBanner}>
                <CheckCircleIcon height={24} />
                <Text style={styles.completedBannerText}>All visits completed</Text>
              </View>
            ) : null}

            {routeData.stops.length === 0 ? (
              <View style={styles.centeredContainer}>
                <Text style={styles.emptyText}>No stops on this route</Text>
              </View>
            ) : (
              (() => {
                const stepMap = buildStepMap(routeData.stops);
                return (
                  <View style={styles.timelineContainer}>
                    <View style={styles.timelineLine} />
                    {routeData.stops.map(stop => (
                      <View key={stop.id} style={styles.timelineRow}>
                        <View style={styles.nodeWrapper}>
                          {stop.status === 'DONE' ? (
                            <View style={styles.doneNode}>
                              <CheckCircleIcon height={28} />
                            </View>
                          ) : (
                            <View
                              style={[
                                styles.pendingNode,
                                stop.status === 'UPCOMING' && styles.upcomingNode,
                              ]}
                            >
                              <Text style={styles.pendingNodeText}>
                                {stepMap[stop.id]}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.timelineCard}>
                          <View style={styles.timelineCardHeader}>
                            <Text style={styles.timelineCardTitle} numberOfLines={1}>
                              {stop.name}
                            </Text>
                            {stop.status === 'DONE' && (
                              <View style={styles.donePill}>
                                <Text style={styles.donePillText}>DONE</Text>
                              </View>
                            )}
                            {stop.status !== 'DONE' && !!stop.distanceStr && (
                              <View style={styles.distancePill}>
                                <MapPinOutlineIcon />
                                <Text style={styles.distanceText}>
                                  {stop.distanceStr}
                                </Text>
                              </View>
                            )}
                          </View>

                          {!!stop.address && (
                            <Text style={styles.timelineCardSubtitle}>
                              {stop.address}
                            </Text>
                          )}

                          {stop.status !== 'DONE' && !!stop.plannedTime && (
                            <View style={styles.timeLabelRow}>
                              <ClockIcon height={12} width={12} />
                              <Text style={styles.timeLabelText}>
                                Planned for {stop.plannedTime}
                              </Text>
                            </View>
                          )}

                          {stop.status === 'TARGET' &&
                            stop.isActionAllowed &&
                            !routeData.readOnly && (
                              <TouchableOpacity
                                style={styles.startVisitButton}
                                onPress={() => handleStartVisit(stop)}
                              >
                                <PlayIcon />
                                <Text style={styles.startVisitButtonText}>
                                  Start Visit
                                </Text>
                              </TouchableOpacity>
                            )}
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })()
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  dateScroll: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  dateCard: {
    width: 64,
    height: 80,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateCardActive: {
    backgroundColor: COLORS.buttonBlue,
    borderColor: COLORS.buttonBlue,
  },
  dayText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: '#9E9E9E',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayTextActive: {
    color: '#D1D5DB',
  },
  dateText: {
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.bold,
    color: '#000',
  },
  dateTextActive: {
    color: '#FFFFFF',
  },
  centeredContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS.buttonBlue,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
  },
  readOnlyBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  readOnlyBannerText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
    color: '#92400E',
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 28,
    fontFamily: FONTS.family.bold,
    color: '#000',
  },
  progressCard: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: '#000',
  },
  progressCountText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
  },
  progressBarBG: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.buttonBlue,
    borderRadius: 4,
  },
  mapCard: {
    height: 200,
    marginHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  mapTextureLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#6B7280',
    opacity: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(37,99,235,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.5)',
  },
  viewMapButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewMapButtonText: {
    color: '#FFF',
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    marginLeft: 4,
  },
  timelineTitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: '#000',
    marginLeft: 20,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  completedBannerText: {
    color: '#10B981',
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
  },
  timelineContainer: {
    paddingHorizontal: 20,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 41,
    top: 24,
    bottom: 0,
    width: 1,
    backgroundColor: '#D1D5DB',
    zIndex: -1,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  nodeWrapper: {
    width: 42,
    alignItems: 'center',
    marginRight: 12,
  },
  doneNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    marginTop: 4,
  },
  pendingNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.buttonBlue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    marginTop: 4,
  },
  upcomingNode: {
    backgroundColor: '#9CA3AF',
  },
  pendingNodeText: {
    color: '#FFFFFF',
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineCardTitle: {
    flex: 1,
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: '#000',
    marginRight: 8,
  },
  donePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  donePillText: {
    color: '#10B981',
    fontSize: 10,
    fontFamily: FONTS.family.bold,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    color: COLORS.buttonBlue,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    marginLeft: 4,
  },
  timelineCardSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    marginBottom: 6,
  },
  timeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeLabelText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
    marginLeft: 6,
  },
  startVisitButton: {
    backgroundColor: COLORS.buttonBlue,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 24,
  },
  startVisitButtonDisabled: {
    opacity: 0.6,
  },
  startVisitButtonText: {
    color: '#FFFFFF',
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    marginLeft: 8,
  },
});

export default RouteScreen;
