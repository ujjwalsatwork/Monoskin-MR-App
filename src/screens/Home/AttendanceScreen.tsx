import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ScrollView } from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import dayjs from 'dayjs';
import Header from '@/components/common/Header';
import { InfoIcon, CheckInIcon, CheckOutIcon, CoffeeIcon, PauseIcon, VisitsIcon } from '@/assets/images';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { logAttendance } from '@/redux/slices/attendanceSlice';

const AttendanceScreen = () => {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [location, setLocation] = useState<{ lat: number; long: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [breakActive, setBreakActive] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const dispatch = useDispatch<AppDispatch>();
  const { checkInLoading, checkOutLoading } = useSelector(
    (state: RootState) => state.attendance,
  );

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(dayjs());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          long: position.coords.longitude,
        });
      },
      (error) => {
        setErrorMsg(error.message);
        Alert.alert('Location Error', error.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  const locationString = location
    ? `${location.lat.toFixed(6)}, ${location.long.toFixed(6)}`
    : 'Unknown';

  const handleCheckIn = async () => {
    const result = await dispatch(
      logAttendance({ type: 'checkIn', location: locationString }),
    );
    console.log('🚀 ~ handleCheckIn ~ result:', result)
    if (logAttendance.fulfilled.match(result)) {
      navigation.navigate('CheckInSuccess', {
        time: currentDate.format('hh:mm A'),
        locationText: '123 Pharma Heights, Indore',
        subLocationText: 'Zone 4 • West District',
      });
    } else {
      const msg = typeof result.payload === 'string'
        ? result.payload
        : 'Failed to log check-in';
      Alert.alert('Error', msg);
    }
  };

  const handleCheckOut = async () => {
    const result = await dispatch(
      logAttendance({ type: 'checkOut', location: locationString }),
    );
    console.log('🚀 ~ handleCheckOut ~ result:', result)
    if (logAttendance.fulfilled.match(result)) {
      navigation.navigate('CheckOutSuccess', {
        time: currentDate.format('hh:mm A'),
        doctorName: 'Dr. Anil Sharma',
        doctorLocation: 'Zone 4 • West District',
        pharmacyName: 'United Pharmacy',
        pharmacyLocation: 'Zone 4 • West District',
      });
    } else {
      const msg = typeof result.payload === 'string'
        ? result.payload
        : 'Failed to log check-out';
      Alert.alert('Error', msg);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <Header 
        title="Today's Attendance" 
        // showBack
        showNotification 
        showProfile 
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Time & Clock */}
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{currentDate.format('hh:mm A')}</Text>
        <Text style={styles.dateText}>{currentDate.format('dddd, DD MMMM YYYY')}</Text>
        <View style={styles.gpsPill}>
           <View style={styles.gpsDot} />
           <Text style={styles.gpsText}>GPS ACTIVE</Text>
        </View>
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
         <View style={styles.infoIconWrapper}>
            <InfoIcon />
         </View>
         <View>
            <Text style={styles.statusLabel}>CURRENT STATE</Text>
            <Text style={styles.statusValue}>Status: Not Checked-In</Text>
         </View>
      </View>

      {/* Map Card */}
      <View style={styles.mapCard}>
         <View style={styles.mapContainer}>
             {location ? (
                 <MapView
                    provider={PROVIDER_DEFAULT}
                    style={styles.map}
                    initialRegion={{
                      latitude: location.lat,
                      longitude: location.long,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    }}
                 >
                    <Marker coordinate={{ latitude: location.lat, longitude: location.long }} />
                 </MapView>
             ) : (
                <View style={styles.mapPlaceholder}>
                   <Text style={{color: '#999'}}>{errorMsg || 'Locating...'}</Text>
                </View>
             )}
         </View>
         <View style={styles.locationInfoContainer}>
            <Text style={styles.locLabel}>COORDINATES</Text>
            <Text style={styles.locValue}>Lat: {location ? location.lat.toFixed(4) : '--'}° N, Long: {location ? location.long.toFixed(4) : '--'}° E</Text>
            
            <Text style={[styles.locLabel, { marginTop: 12 }]}>CURRENT ADDRESS</Text>
            <Text style={styles.locValue}>123 Pharma Heights, Indore, 452000</Text>
         </View>
      </View>

      {/* Check-In / Check-Out — side by side */}
      <View style={styles.actionButtonsContainer}>
         <TouchableOpacity
            style={[styles.primaryButton, styles.halfButton, checkInLoading && styles.buttonDisabled]}
            onPress={handleCheckIn}
            disabled={checkInLoading || checkOutLoading}
            activeOpacity={0.8}
         >
            <CheckInIcon />
            <Text style={styles.primaryButtonText}>
               {checkInLoading ? 'Logging...' : 'Check-In'}
            </Text>
         </TouchableOpacity>
         <TouchableOpacity
            style={[styles.outlineButton, styles.halfButton, checkOutLoading && styles.buttonDisabled]}
            onPress={handleCheckOut}
            disabled={checkInLoading || checkOutLoading}
            activeOpacity={0.8}
         >
            <CheckOutIcon />
            <Text style={styles.outlineButtonText}>
               {checkOutLoading ? 'Logging...' : 'Check-Out'}
            </Text>
         </TouchableOpacity>
      </View>

      {/* Break Timer */}
      <View style={styles.breakCard}>
         <View style={styles.breakLeft}>
            <View style={styles.breakIconContainer}>
               <CoffeeIcon />
            </View>
            <View>
               <Text style={styles.breakTitle}>Break Timer</Text>
               <Text style={styles.breakSubtitle}>Log lunch breaks or{'\n'}transport gaps</Text>
            </View>
         </View>
         <TouchableOpacity
            style={styles.breakButton}
            onPress={() => setBreakActive(prev => !prev)}
            activeOpacity={0.8}
         >
            <PauseIcon />
            <Text style={styles.breakButtonText}>{breakActive ? 'END\nBREAK' : 'START\nBREAK'}</Text>
         </TouchableOpacity>
      </View>

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
         <Text style={styles.visitsSubText}>12 visits planned today</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsSection}>
         <Text style={styles.statsTitle}>QUICK STATS</Text>
         <View style={styles.statsRow}>
            <View style={styles.statCard}>
               <Text style={styles.statLabel}>PLANNED CALLS</Text>
               <Text style={styles.statValue}>12</Text>
            </View>
            <View style={styles.statCard}>
               <Text style={styles.statLabel}>COMPLETED</Text>
               <Text style={styles.statValue}>0</Text>
            </View>
         </View>
      </View>
      </ScrollView>
    </View>
  );
};

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
    backgroundColor: '#FFF3E0', // Light orange
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    overflow: 'hidden',
    marginBottom: 24,
  },
  mapContainer: {
    height: 180,
    width: '100%',
    backgroundColor: '#F5F5F5',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfoContainer: {
    padding: 16,
    backgroundColor: '#FFF',
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
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    marginLeft: 6,
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
  },
  outlineButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    marginLeft: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Break Timer
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

  // Show Today's Visits
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
});

export default AttendanceScreen;
