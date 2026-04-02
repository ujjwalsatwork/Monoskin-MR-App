import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import Header from '@/components/common/Header';
import { CheckCircleIcon, ShieldCheckIcon, ClockIcon, LocationPinIcon } from '@/assets/images';

type Props = NativeStackScreenProps<AppStackParamList, 'CheckInSuccess'>;

const CheckInSuccessScreen = ({ route, navigation }: Props) => {
  const { time, locationText, subLocationText } = route.params;

  return (
    <View style={styles.mainContainer}>
      <Header 
        title="Check-In Status" 
        showBack 
        showNotification 
        showProfile 
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
             <CheckCircleIcon />
          </View>
          
          <Text style={styles.title}>Check-In Successful</Text>
          
          <View style={styles.pillContainer}>
             <ShieldCheckIcon />
             <Text style={styles.pillText}>DEVICE VERIFIED</Text>
          </View>

          <View style={styles.card}>
             <View style={styles.cardHeader}>
                <ClockIcon />
                <Text style={styles.cardLabel}>TIME OF ARRIVAL</Text>
             </View>
             <Text style={styles.timeValue}>{time}</Text>
          </View>

          <View style={styles.card}>
             <View style={styles.cardHeader}>
                <LocationPinIcon />
                <Text style={styles.cardLabel}>GEO-LOCATION VERIFIED</Text>
             </View>
             <Text style={styles.locationValue}>{locationText}</Text>
             <Text style={styles.subLocationValue}>{subLocationText}</Text>
          </View>

          <TouchableOpacity
             style={styles.primaryButton}
             onPress={() => navigation.navigate('RouteMapScreen', {
               routeData: {
                 origin: { lat: 22.7196, lng: 75.8577 },
                 stops: [
                   { id: 1, name: 'City General Hospital',  lat: 22.7250, lng: 75.8650, status: 'target',   distanceStr: '1.2 km', timeStr: '5 min',  address: '123 Pharma Heights, Indore', phone: '+91 98765 43210' },
                   { id: 2, name: "St. Mary's Clinic",      lat: 22.7310, lng: 75.8720, status: 'upcoming', distanceStr: '3.4 km', timeStr: '12 min', address: 'Zone 4, West District',       phone: '+91 98765 43211' },
                   { id: 3, name: 'Apollo Diagnostics',     lat: 22.7180, lng: 75.8500, status: 'upcoming', distanceStr: '5.1 km', timeStr: '18 min', address: 'Zone 2, East District',       phone: '+91 98765 43212' },
                 ],
               },
             })}
          >
             <Text style={styles.primaryButtonText}>Start Field Work</Text>
          </TouchableOpacity>

          <TouchableOpacity 
             style={styles.outlineButton} 
             onPress={() => (navigation as any).navigate('Main', { screen: 'Route' })} 
          >
             <Text style={styles.outlineButtonText}>View Daily Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity 
             style={styles.outlineButton} 
             onPress={() => navigation.navigate('AttendanceHistory')}
          >
             <Text style={styles.outlineButtonText}>View Attendance History</Text>
          </TouchableOpacity>

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
  primaryButton: {
    width: '100%',
    backgroundColor: COLORS.buttonBlue,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  primaryButtonText: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: '#FFFFFF',
  },
  outlineButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.buttonBlue,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  outlineButtonText: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
  },
});

export default CheckInSuccessScreen;
