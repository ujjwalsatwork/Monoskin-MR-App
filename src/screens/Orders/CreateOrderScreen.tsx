import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { COLORS } from '@/constants/colors';
import { globalStyles } from '@/theme/globalStyles';
import { Input, Button } from '@/components';
import { useNavigation } from '@react-navigation/native';

const CreateOrderScreen = () => {
  const navigation = useNavigation();
  const [pharmacy, setPharmacy] = useState('');
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!pharmacy || !product || !quantity) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    // Simulate API call
    await new Promise<void>(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    Alert.alert('Success', 'Order created successfully', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <ScrollView style={globalStyles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>New Order Details</Text>
        
        <Input 
          label="Pharmacy Name"
          placeholder="Enter pharmacy name"
          value={pharmacy}
          onChangeText={setPharmacy}
        />

        <Input 
          label="Product"
          placeholder="Select product"
          value={product}
          onChangeText={setProduct}
        />

        <Input 
          label="Quantity"
          placeholder="Enter quantity"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
        />

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>$0.00</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (5%):</Text>
            <Text style={styles.summaryValue}>$0.00</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>$0.00</Text>
          </View>
        </View>

        <Button 
          title="Submit Order" 
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitBtn}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  summaryBox: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    ...globalStyles.shadow,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.text,
  },
  totalRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  submitBtn: {
    marginTop: 30,
  },
});

export default CreateOrderScreen;
