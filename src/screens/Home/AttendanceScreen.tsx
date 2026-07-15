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
import { InfoIcon, CheckInIcon, CheckOutIcon, VisitsIcon, CheckCircleIcon, QuickStatsCalendar, QuickStatsCompleted } from '@/assets/images';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import {
    logAttendance,
    fetchTodayStatus,
    clearAttendanceError,
    AttendanceError,
} from '@/redux/slices/attendanceSlice';
import { fetchMyProfile } from '@/redux/slices/profileSlice';
import { fetchTodayRoute } from '@/redux/slices/routeSlice';

// Use the Google Play Services fused provider on Android (falls back automatically
// when unavailable). This is dramatically faster than the legacy LocationManager,
// which is the main reason the first GPS fix was timing out.
Geolocation.setRNConfiguration({
    skipPermissionRequests: false,
    authorizationLevel: 'whenInUse',
    locationProvider: 'auto',
});

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
    const [locationFetching, setLocationFetching] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const dispatch = useDispatch<AppDispatch>();

    const {
        checkInLoading,
        checkOutLoading,
        todayLoading,
        isCheckedIn,
        currentSession,
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

    // GPS + reverse geocode.
    // Strategy: get a fast coarse fix first (accepts a recent cached location so the
    // UI fills in almost instantly), then silently refine with a precise GPS fix in
    // the background. If the coarse fix fails, retry once with a longer timeout before
    // surfacing an error — this fixes the slow first-load and "request timed out".
    const fetchLocation = useCallback(() => {
        setLocationError('');
        setLocationFetching(true);

        const applyPosition = async (position: { coords: { latitude: number; longitude: number } }) => {
            const lat = position.coords.latitude;
            const long = position.coords.longitude;
            setLocation({ lat, long });
            setLocationFetching(false);
            setLocationError('');
            const addr = await reverseGeocode(lat, long);
            // Don't wipe an already-resolved address if a later geocode call fails.
            setAddressText(prev => addr || prev || `${lat.toFixed(6)}, ${long.toFixed(6)}`);
        };

        // Stage 2 (background): refine the coarse fix with a precise GPS reading.
        const refineHighAccuracy = () => {
            Geolocation.getCurrentPosition(
                applyPosition,
                () => { /* keep the coarse fix we already showed */ },
                { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
            );
        };

        // Stage 1: fast, low-accuracy fix that accepts a recent cached location.
        Geolocation.getCurrentPosition(
            (position) => { applyPosition(position); refineHighAccuracy(); },
            () => {
                // Coarse attempt failed → retry once with a longer timeout.
                Geolocation.getCurrentPosition(
                    applyPosition,
                    (err) => {
                        console.log('🚀 ~ AttendanceScreen ~ location err:', err);
                        setLocationError(err.message);
                        setLocationFetching(false);
                    },
                    { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 },
                );
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
        );
    }, []);

    useEffect(() => {
        fetchLocation();
    }, [fetchLocation]);

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
            fetchLocation();
            refetchAll();
        }, [fetchLocation, refetchAll]),
    );

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        fetchLocation();
        await refetchAll();
        setRefreshing(false);
    }, [fetchLocation, refetchAll]);

    // Coordinates string for display; address text used in the API payload
    const coordsString = location
        ? `${location.lat.toFixed(6)}, ${location.long.toFixed(6)}`
        : 'Unknown';

    const handleCheckIn = useCallback(async () => {
        if (!location) {
            Alert.alert(
                'Location Required',
                locationError
                    ? `Unable to fetch GPS location: ${locationError}. Please enable location permissions and try again.`
                    : 'GPS location is still being fetched. Please wait a moment and try again.',
            );
            return;
        }
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
    }, [dispatch, location, locationError, addressText, coordsString, currentDate, navigation]);

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
                        ) : isCheckedIn ? (
                            <CheckCircleIcon height={25}/>
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

                {/* Location error banner */}
                {locationError ? (
                    <View style={styles.locationErrorBanner}>
                        <Text style={styles.locationErrorText}>
                            GPS unavailable: {locationError}
                        </Text>
                        <TouchableOpacity onPress={fetchLocation}>
                            <Text style={styles.locationRetryText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {/* Check-In / Check-Out */}
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            styles.halfButton,
                            (isActionLoading || isCheckedIn || !location) && styles.buttonDisabled,
                        ]}
                        onPress={handleCheckIn}
                        disabled={isActionLoading || isCheckedIn || !location}
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

                {/* Show Today's Visits */}
                <View style={styles.visitsSection}>
                    <TouchableOpacity
                        style={styles.visitsButton}
                        onPress={() => (navigation as any).navigate('Main', { screen: 'Route' })}
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
                            <QuickStatsCalendar style={styles.statIcon} />
                            <Text style={styles.statLabel}>PLANNED CALLS</Text>
                            <Text style={styles.statValue}>{plannedCalls}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <QuickStatsCompleted style={styles.statIcon} />
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
    statIcon: {
        marginBottom: 10,
    },

    // ── Location error banner ─────────────────────────────────────────────
    locationErrorBanner: {
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 12,
        backgroundColor: '#FFF3E0',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FFB74D',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    locationErrorText: {
        flex: 1,
        fontSize: FONTS.size.sm,
        fontFamily: FONTS.family.regular,
        color: '#E65100',
        marginRight: 8,
    },
    locationRetryText: {
        fontSize: FONTS.size.sm,
        fontFamily: FONTS.family.bold,
        color: COLORS.primary,
    },

});

export default AttendanceScreen;
