import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '@/constants/colors';
import { globalStyles } from '@/theme/globalStyles';
import { RouteProp, useRoute } from '@react-navigation/native';
import { AppStackParamList } from '@/navigation/types';
import { Button } from '@/components';

const VisitDetailScreen = () => {
  const route = useRoute<RouteProp<AppStackParamList, 'VisitDetail'>>();
  const { visitId } = route.params;

  return (
    <ScrollView style={globalStyles.container}>
      <View style={styles.content}>
        <View style={styles.headerBox}>
          <Text style={styles.doctorName}>Dr. Sarah Smith</Text>
          <Text style={styles.specialty}>Dermatologist | ID: {visitId}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visit Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Time:</Text>
            <Text style={styles.infoValue}>10:30 AM</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={[styles.infoValue, { color: COLORS.warning }]}>Pending</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>General Hospital, Wing B, Room 402</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>
            Discussing new samples of Monoskin Cream and checking inventory levels for the next quarter.
          </Text>
        </View>

        <Button title="Complete Visit" onPress={() => {}} style={styles.actionBtn} />
        <Button title="Reschedule" variant="outline" onPress={() => {}} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
  },
  headerBox: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    ...globalStyles.shadow,
  },
  doctorName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  specialty: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  section: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    ...globalStyles.shadow,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 5,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 80,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  actionBtn: {
    marginTop: 10,
  },
});

export default VisitDetailScreen;
