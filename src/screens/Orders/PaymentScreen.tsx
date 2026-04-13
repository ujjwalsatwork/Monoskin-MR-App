import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import { BankIcon, CardIcon, ShieldIcon, UpiIcon } from '@/assets/images';

type RouteProps = RouteProp<AppStackParamList, 'Payment'>;
type NavProp = NativeStackNavigationProp<AppStackParamList>;

type PaymentMethod = 'card' | 'upi' | 'netbanking';

const GST_RATE = 0.12;
 

const RadioButton = ({ selected }: { selected: boolean }) => (
  <View style={[styles.radio, selected && styles.radioSelected]}>
    {selected && <View style={styles.radioInner} />}
  </View>
);

const PaymentScreen = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();
  const { subtotal, orderNumber } = route.params;

  const tax = parseFloat((subtotal * GST_RATE).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));

  const [method, setMethod] = useState<PaymentMethod>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
    return digits;
  };

  const getPaymentMethodLabel = () => {
    if (method === 'card') return 'Visa';
    if (method === 'upi') return 'UPI';
    return 'Net Banking';
  };

  const getLast4 = () => {
    const digits = cardNumber.replace(/\s/g, '');
    return digits.length >= 4 ? digits.slice(-4) : '0000';
  };

  const getFormattedDateTime = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' - ' +
      now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleProceed = () => {
    navigation.navigate('PaymentSuccess', {
      orderNumber,
      totalAmount: total,
      paymentMethod: getPaymentMethodLabel(),
      last4: getLast4(),
      dateTime: getFormattedDateTime(),
    });
  };

  return (
    <View style={styles.safeArea}>
      <Header title="Payment" showBack showNotification showProfile />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Order Summary */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>ORDER SUMMARY</Text>
          <View style={styles.orderBadge}>
            <Text style={styles.orderBadgeText}>Order #{orderNumber}</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Tax (GST 12%)</Text>
            <Text style={styles.summaryValue}>₹{tax.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalKey}>Total Amount</Text>
            <Text style={styles.summaryTotalValue}>₹{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Method */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>SELECT PAYMENT METHOD</Text>

        {/* Credit / Debit Card */}
        <TouchableOpacity
          style={[styles.methodRow, method === 'card' && styles.methodRowSelected]}
          onPress={() => setMethod('card')}
          activeOpacity={0.8}
        >
          <CardIcon />
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>Credit / Debit Card</Text>
            <Text style={styles.methodSub}>Visa, Mastercard, Amex</Text>
          </View>
          <RadioButton selected={method === 'card'} />
        </TouchableOpacity>

        {method === 'card' && (
          <View style={styles.cardFields}>
            <Text style={styles.fieldLabel}>Card Number</Text>
            <View style={styles.cardNumberBox}>
              <TextInput
                style={styles.cardNumberInput}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={cardNumber}
                onChangeText={t => setCardNumber(formatCardNumber(t))}
                maxLength={19}
              />
            </View>
            <View style={styles.cardRowTwo}>
              <View style={styles.cardRowTwoField}>
                <Text style={styles.fieldLabel}>Expiry (MM/YY)</Text>
                <View style={styles.cardInputBox}>
                  <TextInput
                    style={styles.cardInput}
                    placeholder="MM / YY"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={expiry}
                    onChangeText={t => setExpiry(formatExpiry(t))}
                    maxLength={7}
                  />
                </View>
              </View>
              <View style={styles.cardRowTwoField}>
                <Text style={styles.fieldLabel}>CVV</Text>
                <View style={styles.cardInputBox}>
                  <TextInput
                    style={styles.cardInput}
                    placeholder="***"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    secureTextEntry
                    value={cvv}
                    onChangeText={t => setCvv(t.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* UPI */}
        <TouchableOpacity
          style={[styles.methodRow, method === 'upi' && styles.methodRowSelected]}
          onPress={() => setMethod('upi')}
          activeOpacity={0.8}
        >
          <UpiIcon />
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>UPI (GPay / PhonePe)</Text>
            <Text style={styles.methodSub}>Fast and secure instant transfer</Text>
          </View>
          <RadioButton selected={method === 'upi'} />
        </TouchableOpacity>

        {/* Net Banking */}
        <TouchableOpacity
          style={[styles.methodRow, method === 'netbanking' && styles.methodRowSelected]}
          onPress={() => setMethod('netbanking')}
          activeOpacity={0.8}
        >
          <BankIcon />
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>Net Banking</Text>
            <Text style={styles.methodSub}>All major banks supported</Text>
          </View>
          <RadioButton selected={method === 'netbanking'} />
        </TouchableOpacity>

        {/* SSL */}
        <View style={styles.sslRow}>
          <View style={{ marginRight: 6 }}>
            <ShieldIcon />
          </View>
          <Text style={styles.sslText}>SSL SECURED</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottom}>
        <TouchableOpacity style={styles.proceedBtn} onPress={handleProceed} activeOpacity={0.85}>
          <Text style={styles.proceedBtnText}>Proceed to Pay ₹{total.toFixed(2)}  →</Text>
        </TouchableOpacity>
        <Text style={styles.termsText}>
          By clicking "Proceed to Pay", you agree to the merchant's{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  orderBadge: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  orderBadgeText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
  },

  // Summary card
  summaryCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryKey: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textDark,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 10,
  },
  summaryTotalKey: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },
  summaryTotalValue: {
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
  },

  // Payment method rows
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 12,
  },
  methodRowSelected: {
    backgroundColor: 'rgba(46,80,178,0.04)',
    borderColor: COLORS.buttonBlue,
  },
  methodIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodInfo: { flex: 1 },
  methodName: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 2,
  },
  methodSub: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },

  // Radio
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: { borderColor: COLORS.buttonBlue },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.buttonBlue,
  },

  // Card fields
  cardFields: {
    marginTop: -4,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  fieldLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  cardNumberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    marginBottom: 12,
    gap: 8,
  },
  lockIcon: { fontSize: 15 },
  cardNumberInput: {
    flex: 1,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textDark,
    padding: 0,
    letterSpacing: 1,
  },
  cardRowTwo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  cardRowTwoField: { flex: 1 },
  cardInputBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  cardInput: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textDark,
    padding: 0,
  },

  // SSL
  sslRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  sslText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },

  // Bottom
  bottom: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  proceedBtn: {
    backgroundColor: COLORS.buttonBlue,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  proceedBtnText: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.semibold,
    color: COLORS.white,
  },
  termsText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    textDecorationLine: 'underline',
    color: COLORS.buttonBlue,
  },
});

export default PaymentScreen;
