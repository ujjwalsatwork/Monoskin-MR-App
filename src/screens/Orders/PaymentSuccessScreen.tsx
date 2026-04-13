import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import { ShieldIcon, CardIcon } from '@/assets/images';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';

type RouteProps = RouteProp<AppStackParamList, 'PaymentSuccess'>;
type NavProp = NativeStackNavigationProp<AppStackParamList>;

const DetailRow = ({
  label,
  value,
  valueStyle,
  leftNode,
}: {
  label: string;
  value: string;
  valueStyle?: object;
  leftNode?: React.ReactNode;
}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <View style={styles.detailValueRow}>
      {leftNode}
      <Text style={[styles.detailValue, valueStyle]}>{value}</Text>
    </View>
  </View>
);

const PaymentSuccessScreen = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();
  const { orderNumber, totalAmount, paymentMethod, last4, dateTime } = route.params;

  const subtotal = parseFloat((totalAmount / 1.12).toFixed(2));
  const orderDate = dateTime.split(' - ')[0];

  return (
    <View style={styles.safeArea}>
      <Header title="Payment Successful" showBack showNotification showProfile />

      <View style={styles.container}>
        {/* Icon */}
        <View style={styles.statusCircle}>
          <Text style={styles.statusIcon}>✓</Text>
        </View>

        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.subtitle}>Your transaction has been processed securely.</Text>

        {/* Transaction Details Card */}
        <View style={styles.card}>
          {/* Card header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <CardIcon width={22} height={22} />
            </View>
            <View>
              <Text style={styles.cardHeaderLabel}>TRANSACTION DETAILS</Text>
              <Text style={styles.cardHeaderOrderId}>Order ID: #{orderNumber}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <DetailRow
            label="Amount Paid"
            value={`₹${totalAmount.toFixed(2)}`}
            valueStyle={styles.amountValue}
          />

          <View style={styles.cardDivider} />

          <DetailRow
            label="Payment Method"
            value={`${paymentMethod} ending in ${last4}`}
            leftNode={<CardIcon width={16} height={16} style={{ marginRight: 6 }} />}
          />

          <View style={styles.cardDivider} />

          <DetailRow label="Date & Time" value={dateTime} />

          {/* Encryption banner */}
          <View style={styles.encryptionBanner}>
            <ShieldIcon width={16} height={16} />
            <Text style={styles.encryptionText}>
              Payment secured with 256-bit encryption
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('OrderDetail', {
            orderNumber,
            totalAmount,
            subtotal,
            orderDate,
          })}
        >
          <Text style={styles.primaryBtnText}>View Order Details  →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Main')}
        >
          <Text style={styles.secondaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },

  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 28,
  },

  // Status circle
  statusCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#34A853',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIcon: {
    color: COLORS.white,
    fontSize: 34,
    lineHeight: 40,
    fontFamily: FONTS.family.bold,
  },

  title: {
    fontSize: FONTS.size.xxl,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },

  // Card
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(46,80,178,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderLabel: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardHeaderOrderId: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },

  cardDivider: { height: 1, backgroundColor: COLORS.border },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailLabel: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailValue: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },
  amountValue: {
    fontSize: FONTS.size.xl,
    color: COLORS.buttonBlue,
  },

  // Encryption banner
  encryptionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.buttonBlue,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  encryptionText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
    color: COLORS.white,
  },

  // Buttons
  primaryBtn: {
    width: '100%',
    backgroundColor: COLORS.buttonBlue,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.semibold,
    color: COLORS.white,
  },
  secondaryBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: COLORS.buttonBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.semibold,
    color: COLORS.buttonBlue,
  },
});

export default PaymentSuccessScreen;
