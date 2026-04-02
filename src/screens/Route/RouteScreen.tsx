import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import { DoctorBagIcon, PillIcon, MapPinOutlineIcon, PlayIcon, MapIcon, CheckCircleIcon, ClockIcon } from '@/assets/images';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';

// Generic dummy route routing for mock API data
const DUMMY_ROUTE_DATA = {
    origin: { lat: 22.7196, lng: 75.8577 },
    stops: [
       { id: 1, name: 'Dr. Amit Mishta', lat: 22.7200, lng: 75.8600, status: 'done' as const, distanceStr: '0 km', timeStr: '0', address: "St. Mary's Clinic, Indore", phone: '1234567890' },
       { id: 2, name: 'Dr. Anil Sharma', lat: 22.7300, lng: 75.8700, status: 'target' as const, distanceStr: '1.2 km', timeStr: '5', address: "City General Hospital, Indore", phone: '0987654321' },
       { id: 3, name: 'Dr. Rajesh Kumar', lat: 22.7400, lng: 75.8800, status: 'upcoming' as const, distanceStr: '3.4 km', timeStr: '15', address: "Apollo Health, Indore", phone: '1122334455' },
       { id: 4, name: 'Dr. Suresh Verma', lat: 22.7500, lng: 75.8900, status: 'upcoming' as const, distanceStr: '5.1 km', timeStr: '22', address: "Medanta Super Specialty, Indore", phone: '5544332211' }
    ]
};

const DAYS = [
  { day: 'MON', date: '23' },
  { day: 'TUE', date: '24' },
  { day: 'WED', date: '25' },
  { day: 'THU', date: '26' },
  { day: 'FRI', date: '27' },
];

const TIMELINE_DATA = [
  {
    id: 1,
    type: 'done',
    title: 'Dr. Amit Mishta',
    subtitle: "St. Mary's Clinic, Indore",
  },
  {
    id: 2,
    type: 'pending',
    step: 2,
    distance: '1.2 km',
    title: 'Dr. Anil Sharma',
    subtitle: 'City General Hospital, Indore',
    timeLabel: 'Planned for 10:30 AM',
  }
];

type RouteScreenNavigationProp = NativeStackNavigationProp<AppStackParamList>;

const RouteScreen = () => {
  const [selectedDate, setSelectedDate] = useState('23');
  const navigation = useNavigation<RouteScreenNavigationProp>();

  return (
    <View style={styles.mainContainer}>
      <Header title="Today's Route Plan" showBack showNotification showProfile />
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Date Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
          {DAYS.map((item, index) => {
             const isActive = selectedDate === item.date;
             return (
               <TouchableOpacity 
                 key={index} 
                 style={[styles.dateCard, isActive && styles.dateCardActive]}
                 onPress={() => setSelectedDate(item.date)}
               >
                 <Text style={[styles.dayText, isActive && styles.dayTextActive]}>{item.day}</Text>
                 <Text style={[styles.dateText, isActive && styles.dateTextActive]}>{item.date}</Text>
               </TouchableOpacity>
             );
          })}
        </ScrollView>

        {/* Summary Metric Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.metricCard}>
             <View style={styles.metricCardHeader}>
                <DoctorBagIcon />
                <Text style={styles.metricLabel}>Doctors</Text>
             </View>
             <Text style={styles.metricValue}>8</Text>
          </View>
          <View style={styles.metricCard}>
             <View style={styles.metricCardHeader}>
                <PillIcon />
                <Text style={styles.metricLabel}>Chemists</Text>
             </View>
             <Text style={styles.metricValue}>4</Text>
          </View>
        </View>

        {/* Daily Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
             <Text style={styles.progressTitle}>Daily Progress</Text>
             <Text style={styles.progressCountText}>2/12 Completed</Text>
          </View>
          <View style={styles.progressBarBG}>
             <View style={[styles.progressBarFill, { width: '16.6%' }]} />
          </View>
        </View>

        {/* Map Placeholder Card */}
        <View style={styles.mapCard}>
           {/* Purely emulating the styling format for mockup precision */}
           <View style={styles.mapTextureLayer}>
               <View style={styles.mapIconCircle}>
                  <MapIcon />
               </View>
           </View>
           <TouchableOpacity 
              style={styles.viewMapButton}
              onPress={() => navigation.navigate('RouteMapScreen', { routeData: DUMMY_ROUTE_DATA })}
           >
              <MapIcon height={14}/>
              <Text style={styles.viewMapButtonText}>View Full Route Map</Text>
           </TouchableOpacity>
        </View>

        {/* Timeline Section */}
        <Text style={styles.timelineTitle}>TIMELINE OF VISITS</Text>
        
        <View style={styles.timelineContainer}>
           <View style={styles.timelineLine} />
           
           {TIMELINE_DATA.map((item, index) => (
              <View key={index} style={styles.timelineRow}>
                 {/* Node */}
                 <View style={styles.nodeWrapper}>
                    {item.type === 'done' ? (
                       <View style={styles.doneNode}>
                          {/* Inner Checkmark simulation */}
                          <CheckCircleIcon height={28}/>
                       </View>
                    ) : (
                       <View style={styles.pendingNode}>
                          <Text style={styles.pendingNodeText}>{item.step}</Text>
                       </View>
                    )}
                 </View>

                 {/* Information Box */}
                 <View style={styles.timelineCard}>
                    <View style={styles.timelineCardHeader}>
                       <Text style={styles.timelineCardTitle}>{item.title}</Text>
                       {item.type === 'done' && (
                          <View style={styles.donePill}>
                             <Text style={styles.donePillText}>DONE</Text>
                          </View>
                       )}
                       {item.distance && (
                          <View style={styles.distancePill}>
                             <MapPinOutlineIcon />
                             <Text style={styles.distanceText}>{item.distance}</Text>
                          </View>
                       )}
                    </View>
                    <Text style={styles.timelineCardSubtitle}>{item.subtitle}</Text>
                    
                    {item.timeLabel && (
                       <View style={styles.timeLabelRow}>
                          <ClockIcon height={12} width={12}/>
                          {/* <Text style={styles.timeLabelSymbol}>🕒</Text> */}
                          <Text style={styles.timeLabelText}>{item.timeLabel}</Text>
                       </View>
                    )}

                    {item.type === 'pending' && (
                       <TouchableOpacity style={styles.startVisitButton}>
                          <PlayIcon />
                          <Text style={styles.startVisitButtonText}>Start Visit</Text>
                       </TouchableOpacity>
                    )}
                 </View>
              </View>
           ))}
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
    color: '#D1D5DB', // Light grey for contrast inside active
  },
  dateText: {
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.bold,
    color: '#000',
  },
  dateTextActive: {
    color: '#FFFFFF',
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
    backgroundColor: '#4B5563', // Mimicking the dark gray box for the map image mock
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  mapTextureLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#6B7280',
    opacity: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(37,99,235,0.2)', // translucent blue
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
  timelineContainer: {
    paddingHorizontal: 20,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 41, // Half of 42px offset + padding left
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
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: '#000',
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
  timeLabelSymbol: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 6,
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
  startVisitButtonText: {
    color: '#FFFFFF',
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    marginLeft: 8,
  },
});

export default RouteScreen;
