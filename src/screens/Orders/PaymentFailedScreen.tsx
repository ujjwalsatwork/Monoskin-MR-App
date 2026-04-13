import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import { CardIcon, ReplayIcon } from '@/assets/images';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';

type RouteProps = RouteProp<AppStackParamList, 'PaymentFailed'>;
type NavProp = NativeStackNavigationProp<AppStackParamList>;

const RowSeparator = () => <View style={styles.rowDivider} />;

const PaymentFailedScreen = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();
  const {
    orderNumber,
    totalAmount,
    transactionId,
    reason,
    date,
    paymentMethod,
    last4,
  } = route.params;

  return (
    <View style={styles.safeArea}>
      <Header title="Payment Failed" showBack showNotification showProfile />

      <View style={styles.container}>
        {/* Icon */}
        <View style={styles.statusCircle}>
          <Text style={styles.statusIcon}>✕</Text>
        </View>

        <Text style={styles.title}>Payment Failed!</Text>
        <Text style={styles.subtitle}>
          We couldn't process your transaction. Please check{'\n'}your account details and try again.
        </Text>

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

          {/* Status + Amount row */}
          <View style={styles.statusAmountRow}>
            <View>
              <Text style={styles.colLabel}>STATUS</Text>
              <View style={styles.unsuccessfulRow}>
                <Text style={styles.unsuccessfulIcon}>⊗</Text>
                <Text style={styles.unsuccessfulText}>Unsuccessful</Text>
              </View>
            </View>
            <View style={styles.amountCol}>
              <Text style={styles.colLabel}>AMOUNT</Text>
              <Text style={styles.amountValue}>₹{totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          <RowSeparator />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction ID</Text>
            <Text style={styles.detailValue}>{transactionId}</Text>
          </View>

          <RowSeparator />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reason</Text>
            <Text style={[styles.detailValue, styles.reasonValue]}>{reason}</Text>
          </View>

          <RowSeparator />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{date}</Text>
          </View>

          <RowSeparator />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <View style={styles.methodValueRow}>
              <View style={styles.methodValueIcon}>
                <CardIcon width={14} height={14} />
              </View>
              <Text style={styles.detailValue}>
                {paymentMethod} **** {last4}
              </Text>
            </View>
          </View>
        </View>

        {/* Try Again */}
        <TouchableOpacity
          style={styles.tryAgainBtn}
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
        >
          <ReplayIcon width={18} height={18} />
          <Text style={styles.tryAgainBtnText}>  Try Again</Text>
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
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIcon: {
    color: COLORS.white,
    fontSize: 32,
    lineHeight: 38,
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

  // Status + Amount two-column row
  statusAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  colLabel: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  unsuccessfulRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unsuccessfulIcon: {
    fontSize: FONTS.size.md,
    color: COLORS.error,
  },
  unsuccessfulText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.error,
  },
  amountCol: { alignItems: 'flex-end' },
  amountValue: {
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
  },

  // Generic detail rows
  rowDivider: { height: 1, backgroundColor: COLORS.border },
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
  detailValue: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },
  reasonValue: { color: COLORS.error },
  methodValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  methodValueIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: COLORS.buttonBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Try Again button
  tryAgainBtn: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: COLORS.buttonBlue,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tryAgainBtnText: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.semibold,
    color: COLORS.white,
  },
});

export default PaymentFailedScreen;
