import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  BackHandler,
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
  ProfileIcon,
} from '@/assets/images';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { AppStackParamList } from '@/navigation/types';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';

type RouteProps = RouteProp<AppStackParamList, 'OrderDetail'>;

/* ── Types ── */
interface OrderDetail {
  id: number;
  orderNumber: string;
  doctorId: number | null;
  pharmacyId: number | null;
  status: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  shippingAddress: string;
  notes: string;
  reasonTag: string;
  createdAt: string;
}

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: string;
  discount: string;
  tax: string;
  total: string;
  productName?: string;
}

interface EntityDetail {
  name?: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  [key: string]: any;
}

/* ── Status chip config ── */
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  'Draft':            { bg: 'rgba(158,158,158,0.15)', text: '#757575', label: 'DRAFT' },
  'Pending Approval': { bg: 'rgba(255,152,0,0.15)',   text: '#E65100', label: 'PENDING APPROVAL' },
  'Approved':         { bg: 'rgba(33,150,243,0.15)',  text: '#1565C0', label: 'APPROVED' },
  'Processing':       { bg: 'rgba(33,150,243,0.15)',  text: '#1565C0', label: 'PROCESSING' },
  'Shipped':          { bg: 'rgba(103,58,183,0.15)',  text: '#4527A0', label: 'SHIPPED' },
  'Delivered':        { bg: 'rgba(52,168,83,0.12)',   text: '#34A853', label: '✓  DELIVERED' },
  'Cancelled':        { bg: 'rgba(229,57,53,0.12)',   text: '#C62828', label: 'CANCELLED' },
  'Rejected':         { bg: 'rgba(229,57,53,0.12)',   text: '#C62828', label: 'REJECTED' },
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status] ?? { bg: 'rgba(158,158,158,0.15)', text: '#757575', label: status.toUpperCase() };

/* ── Static timeline (to be wired later) ── */
const TIMELINE = [
  { id: 't1', label: 'Delivered',       detail: 'Today, 02:45 PM • Signature: S. Jenkins', status: 'done'      as const },
  { id: 't2', label: 'Out for Delivery', detail: 'Today, 09:12 AM • Courier: RapidLogistics', status: 'transit'  as const },
  { id: 't3', label: 'Order Confirmed',  detail: 'Oct 24, 05:30 PM',                          status: 'confirmed' as const },
];

const INDORE_REGION = {
  latitude: 22.7196,
  longitude: 75.8577,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

/* ── Sub-components ── */
const Divider = () => <View style={styles.divider} />;

const TimelineDot = ({ status }: { status: 'done' | 'transit' | 'confirmed' }) => {
  if (status === 'done') {
    return (
      <View style={[styles.dot, styles.dotDone]}>
        <Text style={styles.dotCheck}>✓</Text>
      </View>
    );
  }
  if (status === 'transit') return <View style={[styles.dot, styles.dotTransit]} />;
  return <View style={[styles.dot, styles.dotConfirmed]} />;
};

/* ── Screen ── */
const OrderDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProps>();
  const { orderId, orderNumber } = route.params;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [entity, setEntity] = useState<EntityDetail | null>(null);
  const [entityType, setEntityType] = useState<'doctor' | 'pharmacy' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onHardwareBack = () => {
      navigation.navigate('Main', { screen: 'Portfolio' });
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [navigation]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [orderRes, itemsRes] = await Promise.all([
          apiClient.get(ENDPOINTS.orders.detail(orderId)),
          apiClient.get(ENDPOINTS.orders.items(orderId)),
        ]);

        const orderData: OrderDetail = orderRes.data;
        setOrder(orderData);

        const rawItems: OrderItem[] = itemsRes.data ?? [];
        const itemsWithNames = await Promise.all(
          rawItems.map(async (item) => {
            try {
              const prodRes = await apiClient.get(ENDPOINTS.products.detail(item.productId));
              return { ...item, productName: prodRes.data?.name ?? `Product #${item.productId}` };
            } catch {
              return { ...item, productName: `Product #${item.productId}` };
            }
          })
        );
        setItems(itemsWithNames);

        if (orderData.doctorId) {
          const res = await apiClient.get(ENDPOINTS.portfolio.doctorDetail(String(orderData.doctorId)));
          setEntity(res.data);
          setEntityType('doctor');
        } else if (orderData.pharmacyId) {
          const res = await apiClient.get(ENDPOINTS.portfolio.pharmacyDetail(String(orderData.pharmacyId)));
          setEntity(res.data);
          setEntityType('pharmacy');
        }
      } catch (err) {
        console.log('OrderDetailScreen fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [orderId]);

  const displayOrderNumber = order?.orderNumber ?? orderNumber;
  const statusCfg = getStatusConfig(order?.status ?? '');

  const placedDate = order?.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <View style={styles.safeArea}>
      <Header
        title="Order Details"
        showBack
        showNotification
        showProfile
        onBack={() => navigation.navigate('Main', { screen: 'Portfolio' })}
      />

      {/* Order ID + date + status chip */}
      <View style={styles.orderMeta}>
        <View>
          <Text style={styles.orderMetaId}>Order #{displayOrderNumber}</Text>
          <Text style={styles.orderMetaDate}>Placed on {placedDate}</Text>
        </View>
        {order && (
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.buttonBlue} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* ── Order Items ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardTitleIcon}>
                <PillIcon width={18} height={18} />
              </View>
              <Text style={styles.cardTitle}>Order Items</Text>
              <Text style={styles.cardTitleRight}>{items.length} Item{items.length !== 1 ? 's' : ''}</Text>
            </View>
            <Divider />
            {items.length === 0 ? (
              <Text style={styles.emptyText}>No items found</Text>
            ) : (
              items.map((item, i) => (
                <View key={item.id}>
                  <View style={styles.orderItemRow}>
                    <View style={styles.productThumb}>
                      <PillIcon width={28} height={28} />
                    </View>
                    <View style={styles.orderItemInfo}>
                      <Text style={styles.orderItemName}>{item.productName ?? `Product #${item.productId}`}</Text>
                      <Text style={styles.orderItemQty}>Qty: {item.quantity} units  •  ₹{parseFloat(item.unitPrice).toFixed(2)}/unit</Text>
                      {parseFloat(item.discount) > 0 && (
                        <Text style={styles.orderItemDiscount}>Discount: ₹{parseFloat(item.discount).toFixed(2)}</Text>
                      )}
                    </View>
                    <Text style={styles.orderItemPrice}>₹{parseFloat(item.total).toFixed(2)}</Text>
                  </View>
                  {i < items.length - 1 && <Divider />}
                </View>
              ))
            )}
          </View>

          {/* ── Doctor / Pharmacy Details (conditional) ── */}
          {entity && (
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <View style={styles.cardTitleIcon}>
                  {entityType === 'pharmacy'
                    ? <StoreIcon width={18} height={18} />
                    : <ProfileIcon width={18} height={18} />
                  }
                </View>
                <Text style={styles.cardTitle}>
                  {entityType === 'pharmacy' ? 'Pharmacy Details' : 'Doctor Details'}
                </Text>
              </View>
              <Divider />
              <View style={styles.entityBody}>
                {entity.name && <Text style={styles.entityName}>{entity.name}</Text>}
                {entity.contactPerson && <Text style={styles.entityDetail}>{entity.contactPerson}</Text>}
                {entity.phone && <Text style={styles.entityDetail}>{entity.phone}</Text>}
                {entity.address && <Text style={styles.entityDetail}>{entity.address}</Text>}
              </View>
            </View>
          )}

          {/* ── Delivery Address ── */}
          {order?.shippingAddress ? (
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <View style={styles.cardTitleIcon}>
                  <LocationPinIcon width={18} height={18} />
                </View>
                <Text style={styles.cardTitle}>Delivery Address</Text>
              </View>
              <Divider />
              <Text style={styles.addressText}>{order.shippingAddress}</Text>
            </View>
          ) : null}

          {/* ── Order Status Timeline (static for now) ── */}
          {/* <View style={styles.card}>
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
                  <View style={styles.timelineLeft}>
                    <TimelineDot status={step.status} />
                    {i < TIMELINE.length - 1 && <View style={styles.timelineConnector} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>{step.label}</Text>
                    <Text style={styles.timelineDetail}>{step.detail}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View> */}

          {/* ── Price Breakdown ── */}
          {order && (
            <View style={styles.card}>
              <View style={styles.priceRow}>
                <Text style={styles.priceKey}>Subtotal</Text>
                <Text style={styles.priceValue}>₹{parseFloat(order.subtotal).toFixed(2)}</Text>
              </View>
              {parseFloat(order.discount) > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceKey}>Discount</Text>
                  <Text style={[styles.priceValue, styles.discountText]}>-₹{parseFloat(order.discount).toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.priceRow}>
                <Text style={styles.priceKey}>Tax (GST)</Text>
                <Text style={styles.priceValue}>₹{parseFloat(order.tax).toFixed(2)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceKey}>Shipping Fee</Text>
                <Text style={[styles.priceValue, styles.freeText]}>Free</Text>
              </View>
              <Divider />
              <View style={styles.priceRow}>
                <Text style={styles.totalKey}>Total Amount</Text>
                <Text style={styles.totalValue}>₹{parseFloat(order.total).toFixed(2)}</Text>
              </View>
            </View>
          )}

          {/* ── Location Tracking View ── */}
          {/* <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardTitleIcon}>
                <LocationPinIcon width={18} height={18} />
              </View>
              <Text style={styles.cardTitle}>Location Tracking View</Text>
            </View>
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
          </View> */}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      {/* ── Bottom Bar ── */}
      {/* <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.85}>
          <ReplayIcon width={18} height={18} />
          <Text style={styles.downloadBtnText}>  Download Invoice</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} activeOpacity={0.85}>
          <ShareIcon width={20} height={20} />
        </TouchableOpacity>
      </View> */}
      
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6FA' },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

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
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    letterSpacing: 0.4,
  },

  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

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

  emptyText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    paddingHorizontal: 14,
    paddingVertical: 14,
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
  orderItemName: {
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
  orderItemDiscount: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: '#34A853',
    marginTop: 2,
  },
  orderItemPrice: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },

  // Entity (doctor / pharmacy)
  entityBody: { paddingHorizontal: 14, paddingVertical: 14 },
  entityName: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 4,
  },
  entityDetail: {
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
  timelineRow: { flexDirection: 'row', gap: 14 },
  timelineLeft: { alignItems: 'center', width: 22 },
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
  discountText: { color: '#34A853' },
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
  mapContainer: { height: 180, overflow: 'hidden' },
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
  bottomSpacer: { height: 100 },
});

export default OrderDetailScreen;
