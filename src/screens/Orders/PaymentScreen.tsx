import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import RazorpayCheckout from 'react-native-razorpay';

// ── Icons ─────────────────────────────────────────────────────────────────────

const CheckCircleIcon = () => (
  <Svg width="52" height="52" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#DCFCE7" />
    <Path d="M8 12l3 3 5-5" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ErrorCircleIcon = () => (
  <Svg width="52" height="52" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#FEE2E2" />
    <Path d="M15 9l-6 6M9 9l6 6" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ── AlertModal ────────────────────────────────────────────────────────────────

type AlertType = 'success' | 'error' | 'info';

interface AlertState {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const ALERT_HIDDEN: AlertState = { visible: false, type: 'info', title: '', message: '' };

const ALERT_ACCENT: Record<AlertType, string> = {
  success: '#16A34A',
  error: '#DC2626',
  info: '#2563EB',
};

const AlertModal = ({ state, onDismiss }: { state: AlertState; onDismiss: () => void }) => {
  const accent = ALERT_ACCENT[state.type];
  const Icon = state.type === 'success' ? CheckCircleIcon : ErrorCircleIcon;
  const handleConfirm = () => { onDismiss(); state.onConfirm?.(); };
  const handleCancel = () => { onDismiss(); state.onCancel?.(); };
  return (
    <Modal visible={state.visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={am.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={state.cancelText ? undefined : onDismiss} />
        <View style={am.card}>
          <Icon />
          <Text style={am.title}>{state.title}</Text>
          <Text style={am.message}>{state.message}</Text>
          <View style={[am.actions, !state.cancelText && am.actionsCenter]}>
            {!!state.cancelText && (
              <TouchableOpacity style={am.cancelBtn} activeOpacity={0.7} onPress={handleCancel}>
                <Text style={am.cancelText}>{state.cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[am.confirmBtn, { backgroundColor: accent }, !state.cancelText && am.confirmBtnFull]}
              activeOpacity={0.8}
              onPress={handleConfirm}
            >
              <Text style={am.confirmText}>{state.confirmText ?? 'OK'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
import Config from 'react-native-config';
import { useSelector } from 'react-redux';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import { BankIcon, ShieldIcon, UpiIcon } from '@/assets/images';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';
import { RootState } from '@/redux/rootReducer';

type RouteProps = RouteProp<AppStackParamList, 'Payment'>;
type NavProp = NativeStackNavigationProp<AppStackParamList>;

type PaymentMethod = 'upi' | 'netbanking';

const RadioButton = ({ selected }: { selected: boolean }) => (
  <View style={[styles.radio, selected && styles.radioSelected]}>
    {selected && <View style={styles.radioInner} />}
  </View>
);

const PaymentScreen = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();
  const { subtotal, orderNumber, orderCreateData } = route.params;

  const profile = useSelector((state: RootState) => state.profile.data);

  const tax = parseFloat(
    (orderCreateData.items ?? [])
      .reduce((sum: number, item: any) => sum + parseFloat(item.tax || '0'), 0)
      .toFixed(2)
  );
  const total = parseFloat((subtotal + tax).toFixed(2));

  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [loading, setLoading] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>(ALERT_HIDDEN);

  const showAlert = (config: Omit<AlertState, 'visible'>) =>
    setAlertState({ ...config, visible: true });
  const dismissAlert = () => setAlertState(ALERT_HIDDEN);

  const getFormattedDateTime = () => {
    const now = new Date();
    return (
      now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' - ' +
      now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    );
  };

  const createInternalOrder = async () => {
    const orderPayload = {
      doctorId: orderCreateData.doctorId,
      pharmacyId: orderCreateData.pharmacyId,
      ...(orderCreateData.warehouseId !== undefined && { warehouseId: orderCreateData.warehouseId }),
      shippingAddress: orderCreateData.shippingAddress,
      notes: orderCreateData.notes,
      reasonTag: orderCreateData.reasonTag,
      status: 'Draft',
      subtotal: subtotal.toFixed(2),
      discount: '0',
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      orderNumber,
    };
    console.log('🚀 ~ createInternalOrder ~ orderPayload:', orderPayload)

    const orderRes = await apiClient.post(ENDPOINTS.orders.create, orderPayload);
    const createdOrderId: number = orderRes.data?.id;
    const apiOrderNumber: string = orderRes.data?.orderNumber ?? orderNumber;

    if (createdOrderId && orderCreateData.items?.length > 0) {
      const itemPromises = orderCreateData.items.map((item: any) =>
        apiClient.post(ENDPOINTS.orders.addItems(createdOrderId), {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          tax: item.tax,
          total: item.total,
        })
      );
      await Promise.all(itemPromises);
    }

    return { createdOrderId, apiOrderNumber };
  };

  const handleProceed = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // Step 1: Create internal order + items
      const { createdOrderId, apiOrderNumber } = await createInternalOrder();

      // Step 2: Create Razorpay order on backend
      // const razorpayOrderRes = await apiClient.post(ENDPOINTS.payments.createOrder, {
      //   amount: Math.round(total * 100), // paise
      //   currency: 'INR',
      //   orderId: createdOrderId,
      // });

      // const { razorpayOrderId, amount } = razorpayOrderRes.data;

      // // Step 3: Open Razorpay Checkout
      // const options = {
      //   description: 'Order Payment',
      //   currency: 'INR',
      //   key: Config.RAZORPAY_KEY_ID ?? '',
      //   amount: String(amount),
      //   order_id: razorpayOrderId,
      //   name: 'Monoskin',
      //   prefill: {
      //     contact: profile?.phone ?? '',
      //     email: profile?.email ?? '',
      //     name: profile?.name ?? '',
      //   },
      //   theme: { color: '#2E50B2' },
      // };
      // console.log('🚀 ~ handleProceed ~ options:', options)

      // let paymentData: any;
      // try {
      //   paymentData = await RazorpayCheckout.open(options);
      // } catch (razorpayError: any) {
      //   console.log('🚀 ~ handleProceed ~ razorpayError:', razorpayError)
      //   // Step 5: Payment failed / dismissed
      //   const reason =
      //     razorpayError?.description ?? razorpayError?.error?.description ?? 'Payment was not completed.';
      //   Alert.alert('Payment Failed', reason, [{ text: 'Try Again' }]);
      //   return;
      // }

      // // Step 4: Verify payment with backend
      // await apiClient.post(ENDPOINTS.payments.verify, {
      //   razorpay_payment_id: paymentData.razorpay_payment_id,
      //   razorpay_order_id: paymentData.razorpay_order_id,
      //   razorpay_signature: paymentData.razorpay_signature,
      //   orderId: createdOrderId,
      // });

      // // Step 5: Generate invoice for the order
      // await apiClient.post(ENDPOINTS.orders.generateInvoice(createdOrderId));

      // // Navigate to success only after backend verification and invoice generation
      // navigation.navigate('PaymentSuccess', {
      //   orderId: createdOrderId,
      //   orderNumber: apiOrderNumber,
      //   totalAmount: total,
      //   paymentMethod: method === 'upi' ? 'UPI' : 'Net Banking',
      //   last4: '0000',
      //   dateTime: getFormattedDateTime(),
      // });
      showAlert({
        type: 'success',
        title: 'Order Placed!',
        message: 'Your order has been placed successfully.',
        confirmText: 'View Order',
        onConfirm: () => navigation.navigate('OrderDetail', {
          orderId: createdOrderId,
          orderNumber: apiOrderNumber,
        }),
      });

    } catch (err: any) {
      console.log('Payment flow error:', err);
      showAlert({ type: 'error', title: 'Something Went Wrong', message: 'Unable to place your order. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePayViaLink = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiClient.post(ENDPOINTS.payments.createLink, {
        amount: Math.round(total * 100),
        currency: 'INR',
      });
      const paymentLink: string = res.data?.paymentLink;
      if (paymentLink) {
        await Linking.openURL(paymentLink);
      }
    } catch (err) {
      showAlert({ type: 'error', title: 'Link Failed', message: 'Could not generate payment link. Please try again.' });
    } finally {
      setLoading(false);
    }
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
            <Text style={styles.summaryKey}>Tax (GST)</Text>
            <Text style={styles.summaryValue}>₹{tax.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalKey}>Total Amount</Text>
            <Text style={styles.summaryTotalValue}>₹{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* <Text style={[styles.sectionLabel, { marginTop: 20 }]}>SELECT PAYMENT METHOD</Text>

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

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={handlePayViaLink}
          activeOpacity={0.8}
          disabled={loading}
        >
          <Text style={styles.linkBtnText}>Pay via Link</Text>
        </TouchableOpacity>

        <View style={styles.sslRow}>
          <View style={{ marginRight: 6 }}>
            <ShieldIcon />
          </View>
          <Text style={styles.sslText}>SSL SECURED</Text>
        </View>

        <View style={{ height: 100 }} /> */}
      </ScrollView>

      <AlertModal state={alertState} onDismiss={dismissAlert} />

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.proceedBtn, loading && styles.proceedBtnDisabled]}
          onPress={handleProceed}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Text style={styles.proceedBtnText}>
            Place Order ₹{total.toFixed(2)}  →
          </Text>
        </TouchableOpacity>
        {/* <TouchableOpacity
          style={[styles.proceedBtn, loading && styles.proceedBtnDisabled]}
          onPress={handleProceed}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Text style={styles.proceedBtnText}>
            {loading ? 'Processing…' : `Proceed to Pay ₹${total.toFixed(2)}  →`}
          </Text>
        </TouchableOpacity> */}
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

  linkBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.buttonBlue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  linkBtnText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.semibold,
    color: COLORS.buttonBlue,
  },

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
  proceedBtnDisabled: {
    opacity: 0.6,
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

const am = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  title: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: { flexDirection: 'row', gap: 10, width: '100%' },
  actionsCenter: { justifyContent: 'center' },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D9E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: '#6B7280',
  },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnFull: { flex: 0, width: 140 },
  confirmText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
  },
});

export default PaymentScreen;
