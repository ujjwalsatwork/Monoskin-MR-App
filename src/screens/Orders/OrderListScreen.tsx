import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { COLORS } from '@/constants/colors';
import { globalStyles } from '@/theme/globalStyles';
import { Button } from '@/components';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';

const DUMMY_ORDERS = [
  { id: 'ORD-001', date: '2026-03-16', total: '$1,200', status: 'delivered' },
  { id: 'ORD-002', date: '2026-03-17', total: '$850', status: 'processing' },
];

const OrderListScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const renderItem = ({ item }: { item: typeof DUMMY_ORDERS[0] }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>{item.id}</Text>
        <Text style={[styles.statusText, { color: item.status === 'delivered' ? COLORS.success : COLORS.secondary }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.label}>Date:</Text>
        <Text style={styles.value}>{item.date}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Total amount:</Text>
        <Text style={styles.value}>{item.total}</Text>
      </View>
    </View>
  );

  return (
    <View style={globalStyles.container}>
      <FlatList
        data={DUMMY_ORDERS}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListFooterComponent={
          <Button 
            title="Create New Order" 
            onPress={() => navigation.navigate('CreateOrder')} 
            style={styles.createBtn}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 20,
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
    marginBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  createBtn: {
    marginTop: 10,
  },
});

export default OrderListScreen;
