import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MapView from 'react-native-maps';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import {
  PillIcon,
  LocationPinIcon,
  ShareIcon,
  ReplayIcon,
  StoreIcon,
  ClockIcon,
} from '@/assets/images';
import { RouteProp, useRoute } from '@react-navigation/native';
import { AppStackParamList } from '@/navigation/types';

type RouteProps = RouteProp<AppStackParamList, 'OrderDetail'>;

/* ── Static mock data ── */
const ORDER_ITEMS = [
  { id: '1', time: '08:00 AM', qty: 100, price: 625 },
  { id: '2', time: '08:00 AM', qty: 100, price: 625 },
];

const TIMELINE = [
  {
    id: 't1',
    label: 'Delivered',
    detail: 'Today, 02:45 PM • Signature: S. Jenkins',
    status: 'done' as const,
  },
  {
    id: 't2',
    label: 'Out for Delivery',
    detail: 'Today, 09:12 AM • Courier: RapidLogistics',
    status: 'transit' as const,
  },
  {
    id: 't3',
    label: 'Order Confirmed',
    detail: 'Oct 24, 05:30 PM',
    status: 'confirmed' as const,
  },
];

const INDORE_REGION = {
  latitude: 22.7196,
  longitude: 75.8577,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

/* ── Sub-components ── */
const SectionHeader = ({ label }: { label: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionLabel}>{label}</Text>
  </View>
);

const Divider = () => <View style={styles.divider} />;

const TimelineDot = ({ status }: { status: 'done' | 'transit' | 'confirmed' }) => {
  if (status === 'done') {
    return (
      <View style={[styles.dot, styles.dotDone]}>
        <Text style={styles.dotCheck}>✓</Text>
      </View>
    );
  }
  if (status === 'transit') {
    return <View style={[styles.dot, styles.dotTransit]} />;
  }
  return <View style={[styles.dot, styles.dotConfirmed]} />;
};

/* ── Screen ── */
const OrderDetailScreen = () => {
  const route = useRoute<RouteProps>();
  const { orderNumber, totalAmount, subtotal, orderDate } = route.params;

  const tax = parseFloat((subtotal * 0.12).toFixed(2));

  return (
    <View style={styles.safeArea}>
      <Header title="Order Details" showBack showNotification showProfile />

      {/* Order ID + date + status chip */}
      <View style={styles.orderMeta}>
        <View>
          <Text style={styles.orderMetaId}>Order #{orderNumber}</Text>
          <Text style={styles.orderMetaDate}>Placed on {orderDate}</Text>
        </View>
        <View style={styles.deliveredBadge}>
          <Text style={styles.deliveredBadgeText}>✓  DELIVERED</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Order Items ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardTitleIcon}>
              <PillIcon width={18} height={18} />
            </View>
            <Text style={styles.cardTitle}>Order Items</Text>
            <Text style={styles.cardTitleRight}>{ORDER_ITEMS.length} Items</Text>
          </View>
          <Divider />
          {ORDER_ITEMS.map((item, i) => (
            <View key={item.id}>
              <View style={styles.orderItemRow}>
                {/* Product thumbnail */}
                <View style={styles.productThumb}>
                  <PillIcon width={28} height={28} />
                </View>
                <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemTime}>{item.time}</Text>
                  <Text style={styles.orderItemQty}>Quantity: {item.qty} units</Text>
                </View>
                <Text style={styles.orderItemPrice}>₹{item.price.toFixed(2)}</Text>
              </View>
              {i < ORDER_ITEMS.length - 1 && <Divider />}
            </View>
          ))}
        </View>

        {/* ── Pharmacy Details ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardTitleIcon}>
              <StoreIcon width={18} height={18} />
            </View>
            <Text style={styles.cardTitle}>Pharmacy Details</Text>
          </View>
          <Divider />
          <View style={styles.pharmacyBody}>
            <Text style={styles.pharmacyName}>City Health Pharmacy</Text>
            <Text style={styles.pharmacyDetail}>Dr. Sarah Jenkins</Text>
            <Text style={styles.pharmacyDetail}>+91 9876643210</Text>
          </View>
        </View>

        {/* ── Delivery Address ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardTitleIcon}>
              <LocationPinIcon width={18} height={18} />
            </View>
            <Text style={styles.cardTitle}>Delivery Address</Text>
          </View>
          <Divider />
          <Text style={styles.addressText}>
            1248 Medical Center Blvd Suite 200, Downtown Plaza{'\n'}Indore, 462001
          </Text>
        </View>

        {/* ── Order Status Timeline ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardTitleIcon}>
              <ClockIcon width={18} height={18} />
            </View>
            <Text style={styles.cardTitle}>Order Status Timeline</Text>
          </View>
          <Divider />
          <View style={styles.timeline}>
            {TIMELINE.map((step, i) => (
              <View key={step.id} style={styles.timelineRow}>
                {/* Dot + vertical connector */}
                <View style={styles.timelineLeft}>
                  <TimelineDot status={step.status} />
                  {i < TIMELINE.length - 1 && <View style={styles.timelineConnector} />}
                </View>
                {/* Text */}
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>{step.label}</Text>
                  <Text style={styles.timelineDetail}>{step.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Price Breakdown ── */}
        <View style={styles.card}>
          <View style={styles.priceRow}>
            <Text style={styles.priceKey}>Subtotal</Text>
            <Text style={styles.priceValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceKey}>Tax (GST 12%)</Text>
            <Text style={styles.priceValue}>₹{tax.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceKey}>Shipping Fee</Text>
            <Text style={[styles.priceValue, styles.freeText]}>Free</Text>
          </View>
          <Divider />
          <View style={styles.priceRow}>
            <Text style={styles.totalKey}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* ── Location Tracking View ── */}
        <View style={styles.card}>
          <SectionHeader label="Location Tracking View" />
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={INDORE_REGION}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Bottom Bar ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.85}>
          <ReplayIcon width={18} height={18} />
          <Text style={styles.downloadBtnText}>  Download Invoice</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} activeOpacity={0.85}>
          <ShareIcon width={20} height={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6FA' },

  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 12,
  },
  orderMetaId: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 3,
  },
  orderMetaDate: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  deliveredBadge: {
    backgroundColor: 'rgba(52,168,83,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deliveredBadgeText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: '#34A853',
    letterSpacing: 0.4,
  },

  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  // Cards
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  cardTitleIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(46,80,178,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },
  cardTitleRight: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
  },

  divider: { height: 1, backgroundColor: COLORS.border },

  // Section header (for map)
  sectionHeader: { paddingHorizontal: 14, paddingVertical: 13 },
  sectionLabel: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },

  // Order items
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  productThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: 'rgba(46,80,178,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderItemInfo: { flex: 1 },
  orderItemTime: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 3,
  },
  orderItemQty: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  orderItemPrice: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },

  // Pharmacy
  pharmacyBody: { paddingHorizontal: 14, paddingVertical: 14 },
  pharmacyName: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 4,
  },
  pharmacyDetail: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },

  // Address
  addressText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  // Timeline
  timeline: { paddingHorizontal: 14, paddingVertical: 14 },
  timelineRow: {
    flexDirection: 'row',
    gap: 14,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 22,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotDone: { backgroundColor: '#34A853' },
  dotTransit: {
    borderWidth: 2,
    borderColor: '#BDBDBD',
    backgroundColor: COLORS.white,
  },
  dotConfirmed: { backgroundColor: COLORS.buttonBlue },
  dotCheck: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.family.bold,
    lineHeight: 14,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginVertical: 3,
    minHeight: 18,
  },
  timelineContent: { flex: 1, paddingBottom: 18 },
  timelineLabel: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 3,
  },
  timelineDetail: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // Price breakdown
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  priceKey: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textDark,
  },
  freeText: { color: '#34A853', fontFamily: FONTS.family.bold },
  totalKey: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },
  totalValue: {
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
  },

  // Map
  mapContainer: {
    height: 180,
    overflow: 'hidden',
  },
  map: { flex: 1 },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    alignItems: 'center',
  },
  downloadBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.buttonBlue,
    height: 52,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadBtnText: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.semibold,
    color: COLORS.white,
  },
  shareBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OrderDetailScreen;
