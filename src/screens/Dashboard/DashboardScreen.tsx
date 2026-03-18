import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '@/constants/colors';
import { globalStyles } from '@/theme/globalStyles';

const SummaryCard = ({ title, count, color }: { title: string; count: string; color: string }) => (
  <View style={[styles.card, { borderLeftColor: color }]}>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={[styles.cardCount, { color }]}>{count}</Text>
  </View>
);

const DashboardScreen = () => {
  return (
    <ScrollView style={globalStyles.container}>
      <View style={styles.content}>
        <Text style={styles.welcomeText}>Hello, John!</Text>
        <Text style={styles.dateText}>Tuesday, March 17, 2026</Text>

        <View style={styles.statsContainer}>
          <SummaryCard title="Total Visits" count="12" color={COLORS.primary} />
          <SummaryCard title="Pending Orders" count="5" color={COLORS.secondary} />
          <SummaryCard title="Monthly Sales" count="$4,250" color={COLORS.accent} />
          <SummaryCard title="Target Achieved" count="65%" color={COLORS.success} />
        </View>

        <Text style={styles.sectionTitle}>Upcoming Visits</Text>
        <TouchableOpacity style={styles.visitItem}>
          <Text style={styles.visitDoctor}>Dr. Sarah Smith</Text>
          <Text style={styles.visitTime}>10:30 AM - General Hospital</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.visitItem}>
          <Text style={styles.visitDoctor}>Dr. Robert Wilson</Text>
          <Text style={styles.visitTime}>02:15 PM - City Clinic</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    width: '48%',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 15,
    ...globalStyles.shadow,
  },
  cardTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  cardCount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginVertical: 15,
  },
  visitItem: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    ...globalStyles.shadow,
  },
  visitDoctor: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  visitTime: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});

export default DashboardScreen;
