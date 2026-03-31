import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import { LoginTimeIcon, LogoutTimeIcon } from '@/assets/images';

const FILTERS = ['All Time', 'This Week', 'October', 'September'];

const HISTORY_DATA = [
  {
    id: 1,
    date: 'Oct 24, 2023',
    day: 'Tuesday',
    isToday: true,
    status: 'PRESENT',
    timeIn: '09:00 AM',
    timeOut: '06:05 PM',
  },
  {
    id: 2,
    date: 'Oct 23, 2023',
    day: 'Monday',
    isToday: false,
    status: 'LATE',
    timeIn: '09:45 AM',
    timeOut: '06:15 PM',
  },
  {
    id: 3,
    date: 'Oct 22, 2023',
    day: 'Sunday',
    isToday: false,
    status: 'ABSENT',
    timeIn: '--:-- --',
    timeOut: '--:-- --',
  },
  {
    id: 4,
    date: 'Oct 21, 2023',
    day: 'Saturday',
    isToday: false,
    status: 'PRESENT',
    timeIn: '08:55 AM',
    timeOut: '05:30 PM',
  },
];

const AttendanceHistoryScreen = () => {
  const [activeFilter, setActiveFilter] = useState('All Time');

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

  return (
    <View style={styles.mainContainer}>
      <Header 
        title="Attendance History" 
        showBack 
        showNotification 
        showProfile 
      />

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((item, index) => (
            <TouchableOpacity 
              key={index} 
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

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {HISTORY_DATA.map((item) => {
          const statusStyle = getStatusStyle(item.status);
          
          return (
            <View key={item.id} style={styles.card}>
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
                    <Text style={[styles.timeValue, item.status === 'ABSENT' && styles.timeValueAbsent]}>{item.timeIn}</Text>
                  </View>
                </View>

                <View style={[styles.timeBlock, { alignItems: 'flex-end' }]}>
                  <Text style={styles.timeLabel}>TIME OUT</Text>
                  <View style={styles.timeValueRow}>
                    <LogoutTimeIcon />
                    <Text style={[styles.timeValue, item.status === 'ABSENT' && styles.timeValueAbsent]}>{item.timeOut}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
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
});

export default AttendanceHistoryScreen;
