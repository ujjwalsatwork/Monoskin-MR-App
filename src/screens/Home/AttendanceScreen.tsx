import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker } from 'react-native-maps';
import dayjs from 'dayjs';
import Header from '@/components/common/Header';
import { InfoIcon, CheckInIcon, CheckOutIcon, CoffeeIcon, PauseIcon, VisitsIcon, PlayBlue } from '@/assets/images';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import {
    logAttendance,
    fetchTodayStatus,
    clearAttendanceError,
    startBreak,
    endBreak,
    AttendanceError,
} from '@/redux/slices/attendanceSlice';
import { fetchMyProfile } from '@/redux/slices/profileSlice';
import { fetchTodayRoute } from '@/redux/slices/routeSlice';
import { formatBreakDuration, formatDurationSeconds, formatElapsedSeconds } from '@/utils/attendanceFormatter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const friendlyError = (err: AttendanceError, action: 'check-in' | 'check-out'): string => {
    if (err.status === 409) {
        return action === 'check-in'
            ? 'You already have an active check-in session. Please check out first.'
            : 'No active session found. Please check in first.';
    }
    if (err.status === 401) return 'Session expired. Please log in again.';
    return err.message || `Failed to ${action}. Please try again.`;
};

// Handles ISO datetime ("2026-04-23T09:15:00Z"), "HH:mm:ss", or "HH:mm"
const parseSessionTime = (value: string | null | undefined): string => {
    if (!value) return '';
    let d = dayjs(value);
    if (!d.isValid()) d = dayjs(`2000-01-01 ${value}`);
    return d.isValid() ? d.format('hh:mm A') : '';
};

const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'Monoskin/1.0 (test@email.com)', } },
        );
        const json = await res.json();
        const a = json.address ?? {};
        const parts = [
            a.road ?? a.pedestrian ?? a.footway,
            a.suburb ?? a.neighbourhood ?? a.quarter,
            a.city ?? a.town ?? a.village ?? a.county,
        ].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : (json.display_name as string ?? '');
    } catch {
        return '';
    }
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const AttendanceScreen = () => {
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [location, setLocation] = useState<{ lat: number; long: number } | null>(null);
    const [addressText, setAddressText] = useState('');
    const [locationError, setLocationError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [breakElapsed, setBreakElapsed] = useState(0);

    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const dispatch = useDispatch<AppDispatch>();

    const {
        checkInLoading,
        checkOutLoading,
        todayLoading,
        breakLoading,
        isCheckedIn,
        currentSession,
        activeBreak,
        breaks,
        effectiveWorkMinutes,
    } = useSelector((state: RootState) => state.attendance);

    const profileLoaded = useSelector((state: RootState) => !!state.profile.data);

    const { data: routeData } = useSelector((state: RootState) => state.route.today);
    const plannedCalls = routeData?.summary.total ?? 0;
    const completedCalls = routeData?.summary.completed ?? 0;

    const isActionLoading = checkInLoading || checkOutLoading;

    // Ensure profile is loaded so logAttendance can read mrId
    useEffect(() => {
        if (!profileLoaded) {
            dispatch(fetchMyProfile());
        }
    }, [dispatch, profileLoaded]);

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentDate(dayjs()), 60000);
        return () => clearInterval(timer);
    }, []);

    // GPS + reverse geocode
    useEffect(() => {
        Geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const long = position.coords.longitude;
                setLocation({ lat, long });
                const addr = await reverseGeocode(lat, long);
                setAddressText(addr || `${lat.toFixed(6)}, ${long.toFixed(6)}`);
            },
            (err) => {
                console.log('🚀 ~ AttendanceScreen ~ err:', err)
                setLocationError(err.message);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
        );
    }, []);

    const refetchAll = useCallback(async () => {
        await Promise.all([
            dispatch(fetchTodayStatus()),
            dispatch(fetchTodayRoute()),
        ]);
    }, [dispatch]);

    // Fetch today's attendance state
    useEffect(() => {
        refetchAll();
    }, [refetchAll]);

    useFocusEffect(
        useCallback(() => {
            refetchAll();
        }, [refetchAll]),
    );

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetchAll();
        setRefreshing(false);
    }, [refetchAll]);

    // Coordinates string for display; address text used in the API payload
    const coordsString = location
        ? `${location.lat.toFixed(6)}, ${location.long.toFixed(6)}`
        : 'Unknown';

    const handleCheckIn = useCallback(async () => {
        dispatch(clearAttendanceError());
        const result = await dispatch(
            logAttendance({
                action: 'check-in',
                location: addressText || coordsString,
            }),
        );
        if (logAttendance.fulfilled.match(result)) {
            navigation.navigate('CheckInSuccess', {
                time: currentDate.format('hh:mm A'),
                locationText: addressText || coordsString,
                subLocationText: 'GPS Location',
            });
        } else {
            const payload = result.payload as AttendanceError | undefined;
            Alert.alert(
                'Check-In Failed',
                friendlyError(payload ?? { message: 'Unknown error' }, 'check-in'),
            );
        }
    }, [dispatch, addressText, coordsString, currentDate, navigation]);

    const handleCheckOut = useCallback(async () => {
        dispatch(clearAttendanceError());
        const result = await dispatch(
            logAttendance({
                action: 'check-out',
                location: addressText || coordsString,
            }),
        );
        if (logAttendance.fulfilled.match(result)) {
            navigation.navigate('CheckOutSuccess', {
                time: currentDate.format('hh:mm A'),
                doctorName: 'Dr. Anil Sharma',
                doctorLocation: 'Zone 4 • West District',
                pharmacyName: 'United Pharmacy',
                pharmacyLocation: 'Zone 4 • West District',
            });
        } else {
            const payload = result.payload as AttendanceError | undefined;
            Alert.alert(
                'Check-Out Failed',
                friendlyError(payload ?? { message: 'Unknown error' }, 'check-out'),
            );
        }
    }, [dispatch, addressText, coordsString, currentDate, navigation]);

    // ─── Break timer ──────────────────────────────────────────────────────────

    useEffect(() => {
        if (!activeBreak) {
            setBreakElapsed(0);
            return;
        }
        const start = dayjs(activeBreak.breakStart);
        const tick = () => setBreakElapsed(dayjs().diff(start, 'second'));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [activeBreak]);

    const handleStartBreak = useCallback(async () => {
        if (!currentSession) return;
        const result = await dispatch(startBreak({ attendanceId: currentSession.id }));
        if (startBreak.rejected.match(result)) {
            Alert.alert('Break Failed', result.payload?.message ?? 'Failed to start break');
        }
    }, [dispatch, currentSession]);

    const handleEndBreak = useCallback(async () => {
        if (!activeBreak) return;
        const result = await dispatch(endBreak({ breakId: activeBreak.id }));
        if (endBreak.rejected.match(result)) {
            Alert.alert('Break Failed', result.payload?.message ?? 'Failed to end break');
        }
    }, [dispatch, activeBreak]);

    // Compute from timestamps for second-level precision (backend `duration` is rounded minutes)
    const totalBreakSeconds = breaks.reduce((sum, b) => {
        if (!b.breakEnd) return sum;
        return sum + dayjs(b.breakEnd).diff(dayjs(b.breakStart), 'second');
    }, 0);

    // ─── Status card ─────────────────────────────────────────────────────────

    const checkedInTime = parseSessionTime(currentSession?.checkIn);
    const statusLabel = todayLoading
        ? 'Loading...'
        : isCheckedIn
        ? `Checked-In${checkedInTime ? ` at ${checkedInTime}` : ''}`
        : 'Not Checked-In';

    const statusBg = isCheckedIn ? '#E8F5E9' : '#FFF3E0';

    return (
        <View style={styles.mainContainer}>
            <Header
                title="Today's Attendance"
                showNotification
                showProfile
            />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.buttonBlue]} tintColor={COLORS.buttonBlue} />
                }
            >
                {/* Time & Clock */}
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{currentDate.format('hh:mm A')}</Text>
                    <Text style={styles.dateText}>{currentDate.format('dddd, DD MMMM YYYY')}</Text>
                    <View style={styles.gpsPill}>
                        <View style={[styles.gpsDot, !location && styles.gpsDotInactive]} />
                        <Text style={styles.gpsText}>{location ? 'GPS ACTIVE' : 'LOCATING...'}</Text>
                    </View>
                </View>

                {/* Status Card */}
                <View style={[styles.statusCard, { backgroundColor: statusBg }]}>
                    <View style={styles.infoIconWrapper}>
                        {todayLoading ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <InfoIcon />
                        )}
                    </View>
                    <View style={styles.statusTextContainer}>
                        <Text style={styles.statusLabel}>CURRENT STATE</Text>
                        <Text style={styles.statusValue}>{statusLabel}</Text>
                    </View>
                </View>

                {/* Map Card */}
                <View style={styles.mapCard}>
                    <View style={styles.mapContainer}>
                        {location ? (
                            <MapView
                                style={styles.map}
                                showsUserLocation={true}
                                region={{
                                    latitude: location.lat,
                                    longitude: location.long,
                                    latitudeDelta: 0.005,
                                    longitudeDelta: 0.005,
                                }}
                            >
                                <Marker
                                    coordinate={{ latitude: location.lat, longitude: location.long }}
                                />
                            </MapView>
                        ) : (
                            <View style={styles.mapPlaceholder}>
                                <Text style={styles.mapPlaceholderText}>
                                    {locationError || 'Locating...'}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.locationInfoContainer}>
                        <Text style={styles.locLabel}>COORDINATES</Text>
                        <Text style={styles.locValue}>
                            Lat: {location ? location.lat.toFixed(4) : '--'}° N,{' '}
                            Long: {location ? location.long.toFixed(4) : '--'}° E
                        </Text>
                        <Text style={[styles.locLabel, { marginTop: 12 }]}>CURRENT ADDRESS</Text>
                        <Text style={styles.locValue}>
                            {addressText || (location ? 'Resolving address…' : '--')}
                        </Text>
                    </View>
                </View>

                {/* Check-In / Check-Out */}
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            styles.halfButton,
                            (isActionLoading || isCheckedIn) && styles.buttonDisabled,
                        ]}
                        onPress={handleCheckIn}
                        disabled={isActionLoading || isCheckedIn}
                        activeOpacity={0.8}
                    >
                        {checkInLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <CheckInIcon />
                        )}
                        <Text style={styles.primaryButtonText}>
                            {checkInLoading ? 'Logging...' : 'Check-In'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.outlineButton,
                            styles.halfButton,
                            (isActionLoading || !isCheckedIn) && styles.buttonDisabled,
                        ]}
                        onPress={handleCheckOut}
                        disabled={isActionLoading || !isCheckedIn}
                        activeOpacity={0.8}
                    >
                        {checkOutLoading ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <CheckOutIcon />
                        )}
                        <Text style={styles.outlineButtonText}>
                            {checkOutLoading ? 'Logging...' : 'Check-Out'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.outlineButton, styles.viewHistoryButton]}
                    onPress={() => navigation.navigate('AttendanceHistory')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.outlineButtonText}>View Attendance History</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.outlineButton, styles.viewHistoryButton, styles.leaveRequestButton]}
                    onPress={() => navigation.navigate('SubmitLeave')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.leaveRequestButtonText}>Submit Leave Request</Text>
                </TouchableOpacity>

                <View style={{ height: 12 }} />

                {/* Break Timer */}
                <View style={styles.breakCard}>
                    <View style={styles.breakLeft}>
                        <View style={styles.breakIconContainer}>
                            <CoffeeIcon />
                        </View>
                        <View>
                            <Text style={styles.breakTitle}>Break Timer</Text>
                            {activeBreak ? (
                                <Text style={styles.breakTimer}>
                                    {formatElapsedSeconds(breakElapsed)}
                                </Text>
                            ) : (
                                <Text style={styles.breakSubtitle}>
                                    Log lunch breaks or{'\n'}transport gaps
                                </Text>
                            )}
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.breakButton,
                            (!isCheckedIn || breakLoading) && styles.buttonDisabled,
                        ]}
                        onPress={activeBreak ? handleEndBreak : handleStartBreak}
                        disabled={!isCheckedIn || breakLoading}
                        activeOpacity={0.8}
                    >
                        {breakLoading ? (
                            <ActivityIndicator size="small" color={COLORS.buttonBlue} />
                        ) : activeBreak ? (
                            <PlayBlue />
                        ) : (
                            <PauseIcon />
                        )}
                        <Text style={styles.breakButtonText}>
                            {activeBreak ? 'END\nBREAK' : 'START\nBREAK'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Break Summary */}
                {(breaks.length > 0 || activeBreak !== null || effectiveWorkMinutes > 0) && (
                    <View style={styles.breakSummaryCard}>
                        <View style={styles.breakSummaryRow}>
                            <View style={styles.breakSummaryStat}>
                                <Text style={styles.breakSummaryLabel}>BREAKS TODAY</Text>
                                <Text style={styles.breakSummaryValue}>
                                    {breaks.length + (activeBreak ? 1 : 0)}
                                </Text>
                            </View>
                            <View style={styles.breakSummaryStat}>
                                <Text style={styles.breakSummaryLabel}>TOTAL BREAK</Text>
                                <Text style={styles.breakSummaryValue}>
                                    {formatDurationSeconds(totalBreakSeconds)}
                                </Text>
                            </View>
                            {/* <View style={styles.breakSummaryStat}>
                                <Text style={styles.breakSummaryLabel}>EFFECTIVE WORK</Text>
                                <Text style={styles.breakSummaryValue}>
                                    {effectiveWorkMinutes > 0
                                        ? formatBreakDuration(effectiveWorkMinutes)
                                        : '--'}
                                </Text>
                            </View> */}
                        </View>
                    </View>
                )}

                {/* Show Today's Visits */}
                <View style={styles.visitsSection}>
                    <TouchableOpacity
                        style={styles.visitsButton}
                        onPress={() => navigation.navigate('TodayVisits')}
                        activeOpacity={0.85}
                    >
                        <VisitsIcon />
                        <Text style={styles.visitsButtonText}>Show Today's Visit</Text>
                    </TouchableOpacity>
                    <Text style={styles.visitsSubText}>{plannedCalls} visits planned today</Text>
                </View>

                {/* Quick Stats */}
                <View style={styles.statsSection}>
                    <Text style={styles.statsTitle}>QUICK STATS</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>PLANNED CALLS</Text>
                            <Text style={styles.statValue}>{plannedCalls}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>COMPLETED</Text>
                            <Text style={styles.statValue}>{completedCalls}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        paddingBottom: 24,
    },
    timeContainer: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    timeText: {
        fontSize: FONTS.size.xxxl,
        fontFamily: FONTS.family.bold,
        color: '#000',
        marginBottom: 4,
    },
    dateText: {
        fontSize: FONTS.size.md,
        fontFamily: FONTS.family.regular,
        color: COLORS.textSecondary,
        marginBottom: 16,
    },
    gpsPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 20,
    },
    gpsDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.success,
        marginRight: 6,
    },
    gpsDotInactive: {
        backgroundColor: '#9E9E9E',
    },
    gpsText: {
        fontSize: 11,
        fontFamily: FONTS.family.bold,
        color: '#000',
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        marginBottom: 20,
    },
    infoIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    statusTextContainer: {
        flex: 1,
    },
    statusLabel: {
        fontSize: 11,
        fontFamily: FONTS.family.bold,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    statusValue: {
        fontSize: 15,
        fontFamily: FONTS.family.bold,
        color: '#000',
    },
    mapCard: {
        marginHorizontal: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        marginBottom: 24,
        backgroundColor: '#FFF',
        overflow: 'hidden',

    },
    mapContainer: {
        height: 180,
        width: '100%',
        backgroundColor: '#F5F5F5',
    },
    map: {
        flex: 1,
        borderTopLeftRadius: 11,
        borderTopRightRadius: 11,
    },
    mapPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapPlaceholderText: {
        color: '#999',
    },
    locationInfoContainer: {
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 11,
        borderBottomRightRadius: 11,
    },
    locLabel: {
        fontSize: FONTS.size.xs,
        fontFamily: FONTS.family.bold,
        color: COLORS.textSecondary,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    locValue: {
        fontSize: FONTS.size.md,
        fontFamily: FONTS.family.bold,
        color: '#000',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 12,
    },
    halfButton: {
        flex: 1,
        marginBottom: 0,
    },
    viewHistoryButton: {
        marginHorizontal: 20,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: FONTS.size.lg,
        fontFamily: FONTS.family.bold,
    },
    outlineButton: {
        backgroundColor: '#FFF',
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        flexDirection: 'row',
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    outlineButtonText: {
        color: COLORS.primary,
        fontSize: FONTS.size.lg,
        fontFamily: FONTS.family.bold,
    },
    buttonDisabled: {
        opacity: 0.45,
    },
    breakCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 14,
        padding: 16,
        marginBottom: 20,
    },
    breakLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    breakIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(46, 80, 178, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    breakTitle: {
        fontSize: FONTS.size.md,
        fontFamily: FONTS.family.bold,
        color: COLORS.buttonBlue,
        marginBottom: 2,
    },
    breakSubtitle: {
        fontSize: FONTS.size.sm,
        fontFamily: FONTS.family.regular,
        color: COLORS.textSecondary,
        lineHeight: 16,
    },
    breakButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
    },
    breakButtonText: {
        fontSize: FONTS.size.xs,
        fontFamily: FONTS.family.bold,
        color: COLORS.buttonBlue,
        textAlign: 'center',
        lineHeight: 14,
    },
    visitsSection: {
        paddingHorizontal: 20,
        marginBottom: 24,
        alignItems: 'center',
    },
    visitsButton: {
        backgroundColor: COLORS.buttonBlue,
        height: 52,
        borderRadius: 26,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        gap: 8,
        marginBottom: 8,
    },
    visitsButtonText: {
        color: '#FFF',
        fontSize: FONTS.size.lg,
        fontFamily: FONTS.family.bold,
    },
    visitsSubText: {
        fontSize: FONTS.size.sm,
        fontFamily: FONTS.family.regular,
        color: COLORS.textSecondary,
    },
    statsSection: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    statsTitle: {
        fontSize: FONTS.size.sm,
        fontFamily: FONTS.family.bold,
        color: '#000',
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statCard: {
        width: '48%',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 16,
    },
    statLabel: {
        fontSize: FONTS.size.xs,
        fontFamily: FONTS.family.bold,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontFamily: FONTS.family.bold,
        color: '#000',
    },

    // ── Leave Request Button ───────────────────────────────────────────────
    leaveRequestButton: {
        marginTop: 12,
        borderColor: COLORS.buttonBlue,
    },
    leaveRequestButtonText: {
        color: COLORS.buttonBlue,
        fontSize: FONTS.size.lg,
        fontFamily: FONTS.family.bold,
    },

    // ── Break timer live display ───────────────────────────────────────────
    breakTimer: {
        fontSize: FONTS.size.md,
        fontFamily: FONTS.family.bold,
        color: COLORS.buttonBlue,
        marginTop: 2,
    },

    // ── Break summary card ────────────────────────────────────────────────
    breakSummaryCard: {
        marginHorizontal: 20,
        marginTop: -8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 14,
        backgroundColor: '#F8F9FF',
    },
    breakSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    breakSummaryStat: {
        alignItems: 'center',
        flex: 1,
    },
    breakSummaryLabel: {
        fontSize: FONTS.size.xs,
        fontFamily: FONTS.family.bold,
        color: COLORS.textSecondary,
        marginBottom: 4,
        textAlign: 'center',
    },
    breakSummaryValue: {
        fontSize: FONTS.size.md,
        fontFamily: FONTS.family.bold,
        color: '#000',
        textAlign: 'center',
    },

});

export default AttendanceScreen;
