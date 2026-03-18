import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { COLORS } from '@/constants/colors';
import { globalStyles } from '@/theme/globalStyles';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';

const DUMMY_VISITS = [
  { id: '1', doctorName: 'Dr. Sarah Smith', specialty: 'Dermatologist', time: '10:30 AM', status: 'pending' },
  { id: '2', doctorName: 'Dr. Robert Wilson', specialty: 'GP', time: '02:15 PM', status: 'pending' },
  { id: '3', doctorName: 'Dr. Emily Brown', specialty: 'Pediatrician', time: '04:00 PM', status: 'completed' },
];

const VisitListScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const renderItem = ({ item }: { item: typeof DUMMY_VISITS[0] }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('VisitDetail', { visitId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.doctorName}>{item.doctorName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? COLORS.success : COLORS.warning }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.specialty}>{item.specialty}</Text>
      <Text style={styles.time}>Time: {item.time}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={globalStyles.container}>
      <FlatList
        data={DUMMY_VISITS}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={<Text style={styles.headerTitle}>Today's Schedule</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    ...globalStyles.shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  specialty: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  time: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
});

export default VisitListScreen;
