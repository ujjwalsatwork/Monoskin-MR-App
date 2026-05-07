import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import Header from '@/components/common/Header';
import { CheckCircleIcon, ShieldCheckIcon, ClockIcon, LocationPinIcon } from '@/assets/images';
import { AppDispatch, RootState } from '@/redux/store';
import { fetchTodayRoute } from '@/redux/slices/routeSlice';

type Props = NativeStackScreenProps<AppStackParamList, 'CheckOutSuccess'>;

const CheckOutSuccessScreen = ({ route, navigation }: Props) => {
  const { time } = route.params;

  const dispatch = useDispatch<AppDispatch>();
  const { data, loading } = useSelector((state: RootState) => state.route.today);

  useEffect(() => {
    dispatch(fetchTodayRoute());
  }, [dispatch]);

  const stops = data?.stops ?? [];
  
  const completedDoctors = stops.filter(stop => stop.status === 'DONE' && stop.doctorId);
  const lastDoctor = completedDoctors.length > 0 ? completedDoctors[completedDoctors.length - 1] : null;

  const completedPharmacies = stops.filter(stop => stop.status === 'DONE' && stop.pharmacyId);
  const lastPharmacy = completedPharmacies.length > 0 ? completedPharmacies[completedPharmacies.length - 1] : null;

  return (
    <View style={styles.mainContainer}>
      <Header 
        title="Check-Out Status" 
        showBack 
        showNotification 
        showProfile 
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
             <CheckCircleIcon />
          </View>
          
          <Text style={styles.title}>Check-Out Successful</Text>
          
          <View style={styles.pillContainer}>
             <ShieldCheckIcon />
             <Text style={styles.pillText}>DEVICE VERIFIED</Text>
          </View>

          <View style={styles.card}>
             <View style={styles.cardHeader}>
                <ClockIcon />
                <Text style={styles.cardLabel}>TIME OF DEPARTURE</Text>
             </View>
             <Text style={styles.timeValue}>{time}</Text>
          </View>

          <View style={styles.card}>
             <View style={styles.cardHeader}>
                <LocationPinIcon />
                <Text style={styles.cardLabel}>LAST DOCTOR VISITED</Text>
             </View>
             {loading && !data ? (
               <ActivityIndicator size="small" color={COLORS.buttonBlue} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
             ) : lastDoctor ? (
               <>
                 <Text style={styles.locationValue}>{lastDoctor.name}</Text>
                 {!!lastDoctor.address && <Text style={styles.subLocationValue}>{lastDoctor.address}</Text>}
               </>
             ) : (
               <Text style={styles.subLocationValue}>No doctor visited yet</Text>
             )}
          </View>

          <View style={styles.card}>
             <View style={styles.cardHeader}>
                <LocationPinIcon />
                <Text style={styles.cardLabel}>LAST PHARMACY VISITED</Text>
             </View>
             {loading && !data ? (
               <ActivityIndicator size="small" color={COLORS.buttonBlue} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
             ) : lastPharmacy ? (
               <>
                 <Text style={styles.locationValue}>{lastPharmacy.name}</Text>
                 {!!lastPharmacy.address && <Text style={styles.subLocationValue}>{lastPharmacy.address}</Text>}
               </>
             ) : (
               <Text style={styles.subLocationValue}>No pharmacy visited yet</Text>
             )}
          </View>

          <View style={styles.actionSection}>
             <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Main')}>
                <Text style={styles.primaryButtonText}>Return to Home</Text>
             </TouchableOpacity>
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
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingTop: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: FONTS.size.xxl,
    fontFamily: FONTS.family.bold,
    color: '#000',
    marginBottom: 12,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 32,
  },
  pillText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: '#000',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  timeValue: {
    fontSize: FONTS.size.xxxl,
    fontFamily: FONTS.family.bold,
    color: '#000',
    marginTop: 4,
  },
  locationValue: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: '#000',
    marginBottom: 4,
  },
  subLocationValue: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  actionSection: {
    width: '100%',
    marginTop: 20,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: COLORS.buttonBlue,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: '#FFFFFF',
  },
});

export default CheckOutSuccessScreen;
