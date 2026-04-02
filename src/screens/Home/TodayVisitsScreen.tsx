import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import {
  MapPinOutlineIcon,
} from '@/assets/images';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';

type Visit = {
  id: string;
  time: string;
  name: string;
  address: string;
  status: 'in_progress' | 'upcoming' | 'completed';
};

const VISITS: Visit[] = [
  { id: '1', time: '09:00 AM', name: 'City General Hospital',  address: '123 Pharma Heights, Indore, 452000', status: 'in_progress' },
  { id: '2', time: '10:15 AM', name: "St. Mary's Clinic",      address: 'Zone 4 • West District',             status: 'upcoming' },
  { id: '3', time: '11:30 AM', name: 'Apollo Diagnostics',     address: 'Zone 2 • East District',             status: 'upcoming' },
  { id: '4', time: '12:45 PM', name: 'Sunrise Medical Center', address: 'Zone 1 • North District',            status: 'upcoming' },
  { id: '5', time: '02:00 PM', name: 'MedPlus Pharmacy',       address: 'Zone 3 • South District',            status: 'upcoming' },
  { id: '6', time: '03:15 PM', name: 'LifeCare Hospital',      address: 'Zone 5 • Central',                   status: 'upcoming' },
];

const PLANNED_TOTAL = 12;
const COMPLETED = 0;

const STATUS_CONFIG = {
  in_progress: { label: 'IN PROGRESS', bg: 'rgba(46, 80, 178, 0.12)', color: COLORS.buttonBlue },
  upcoming:    { label: 'UPCOMING',    bg: '#F0F0F0',                  color: '#666666' },
  completed:   { label: 'COMPLETED',   bg: 'rgba(56, 142, 60, 0.12)', color: COLORS.success },
};

const TodayVisitsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const renderVisit = ({ item }: { item: Visit }) => {
    const config = STATUS_CONFIG[item.status];
    return (
      <TouchableOpacity
        style={styles.visitCard}
        onPress={() => navigation.navigate('VisitDetail', { visitId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.visitCardTop}>
          <Text style={[styles.visitTime, item.status === 'in_progress' && styles.visitTimeActive]}>
            {item.time}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
        <Text style={styles.visitName}>{item.name}</Text>
        <View style={styles.visitAddressRow}>
          <MapPinOutlineIcon />
          <Text style={styles.visitAddress}> {item.address}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const remaining = PLANNED_TOTAL - VISITS.length;

  return (
    <View style={styles.safeArea}>
      <Header title="Today's Visits" showBack showNotification showProfile />

      <FlatList
        data={VISITS}
        keyExtractor={item => item.id}
        renderItem={renderVisit}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          /* Daily Progress Card */
          <View style={styles.progressCard}>
            <View style={styles.progressLeft}>
              <Text style={styles.progressMeta}>Daily Progress</Text>
              <Text style={styles.progressCount}>{PLANNED_TOTAL} Planned{'\n'}Calls</Text>
            </View>
            <View style={styles.progressRight}>
              <Text style={styles.completedCount}>{COMPLETED}</Text>
              <Text style={styles.completedLabel}>Completed</Text>
            </View>
          </View>
        }
        ListFooterComponent={
          remaining > 0 ? (
            <Text style={styles.moreVisits}>+ {remaining} more visits scheduled</Text>
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },


  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 12,
  },

  // Progress card
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

  // Visit card
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

  // Footer
  moreVisits: {
    textAlign: 'center',
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    marginTop: 8,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.buttonBlue,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabText: {
    color: COLORS.white,
    fontSize: 30,
    fontFamily: FONTS.family.regular,
    lineHeight: 34,
    marginTop: -2,
  },
});

export default TodayVisitsScreen;
