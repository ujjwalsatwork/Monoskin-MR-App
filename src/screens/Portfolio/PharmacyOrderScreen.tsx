import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

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

const InfoCircleIcon = () => (
  <Svg width="52" height="52" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#DBEAFE" />
    <Path d="M12 8v4M12 16h.01" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
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
  const Icon = state.type === 'success' ? CheckCircleIcon : state.type === 'error' ? ErrorCircleIcon : InfoCircleIcon;
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

import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import {
  PillIcon,
  MapPinOutlineIcon,
  CalendarNoteIcon,
  AddCircle,
} from '@/assets/images';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import { ApiPharmacy } from '@/redux/slices/portfolioSlice';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';
import DatePickerModal from '@/components/common/DatePickerModal';

type NavProp = NativeStackNavigationProp<AppStackParamList>;
type Priority = 'Low' | 'Medium' | 'High';

type ApiProduct = {
  id: number;
  code: string;
  name: string;
  sku: string;
  category: string;
  packSize: string;
  mrp: string;
  gst: string;
  hsnCode: string;
  shelfLife: number;
  description: string;
  isActive: boolean;
};

type PharmacyProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  gst: string;
  bulkOrder: boolean;
  qty: number;
};

type CatalogueItem = {
  id: string;
  name: string;
  sku: string;
  category: string;
  packSize: string;
  price: number;
  gst: string;
  qty: number;
  selected: boolean;
};

const ModalSeparator = () => <View style={styles.modalSeparator} />;

/* ─── Product Card ───────────────────────────────────────────── */
const ProductCard = ({
  item,
  onToggleBulk,
  onUpdateQty,
}: {
  item: PharmacyProduct;
  onToggleBulk: (id: string) => void;
  onUpdateQty: (id: string, delta: number) => void;
}) => (
  <View style={styles.productCard}>
    {/* Top row */}
    <View style={styles.productTopRow}>
      <View style={styles.productIconCircle}>
        <PillIcon width={20} height={20} />
      </View>
      <View style={styles.productMeta}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
      </View>
      <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
    </View>

    {/* Bottom row */}
    <View style={styles.productBottomRow}>
      <View style={styles.bulkRow}>
        <Text style={styles.bulkLabel}>Bulk Order</Text>
        <Switch
          value={item.bulkOrder}
          onValueChange={() => onToggleBulk(item.id)}
          trackColor={{ false: '#E0E0E0', true: COLORS.buttonBlue }}
          thumbColor={COLORS.white}
          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
        />
      </View>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepperBtn} onPress={() => onUpdateQty(item.id, -1)}>
          <Text style={styles.stepperBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{item.qty}</Text>
        <TouchableOpacity style={styles.stepperBtn} onPress={() => onUpdateQty(item.id, 1)}>
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

/* ─── Screen ─────────────────────────────────────────────────── */
const PharmacyOrderScreen = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<AppStackParamList, 'PharmacyOrder'>>();
  const { pharmacyId, pharmacyName } = route.params;

  const [pharmacy, setPharmacy] = useState<ApiPharmacy | null>(null);
  const [pharmacyLoading, setPharmacyLoading] = useState(true);

  useEffect(() => {
    const fetchPharmacy = async () => {
      try {
        const res = await apiClient.get<ApiPharmacy>(ENDPOINTS.portfolio.pharmacyDetail(pharmacyId));
        setPharmacy(res.data);
      } catch {
        // keep null — UI will show fallback
      } finally {
        setPharmacyLoading(false);
      }
    };
    fetchPharmacy();
  }, [pharmacyId]);

  const [products, setProducts] = useState<PharmacyProduct[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [priority, setPriority] = useState<Priority>('Medium');
  const [addItemsVisible, setAddItemsVisible] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>(ALERT_HIDDEN);

  const showAlert = (config: Omit<AlertState, 'visible'>) =>
    setAlertState({ ...config, visible: true });
  const dismissAlert = () => setAlertState(ALERT_HIDDEN);

  const fetchCatalogue = async (): Promise<CatalogueItem[]> => {
    if (catalogue.length > 0) return catalogue;
    setCatalogueLoading(true);
    try {
      const res = await apiClient.get<ApiProduct[]>(ENDPOINTS.products.available);
      const items: CatalogueItem[] = res.data.map(p => ({
        id: String(p.id),
        name: p.name,
        sku: p.sku,
        category: p.category,
        packSize: p.packSize,
        price: parseFloat(p.mrp),
        gst: p.gst,
        qty: 1,
        selected: false,
      }));
      setCatalogue(items);
      return items;
    } catch {
      return [];
    } finally {
      setCatalogueLoading(false);
    }
  };

  const openAddItems = async () => {
    const baseItems = await fetchCatalogue();
    const source = baseItems.length > 0 ? baseItems : catalogue;
    setCatalogue(source.map(item => {
      const existing = products.find(p => p.id === item.id);
      return existing
        ? { ...item, selected: true, qty: existing.qty }
        : { ...item, selected: false, qty: 1 };
    }));
    setAddItemsVisible(true);
  };

  const updateQty = (id: string, delta: number) => {
    setProducts(prev =>
      prev.map(p => p.id === id ? { ...p, qty: Math.max(0, p.qty + delta) } : p)
    );
  };

  const toggleBulk = (id: string) => {
    setProducts(prev =>
      prev.map(p => p.id === id ? { ...p, bulkOrder: !p.bulkOrder } : p)
    );
  };

  const toggleCatalogueItem = (id: string) =>
    setCatalogue(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));

  const updateCatalogueQty = (id: string, delta: number) =>
    setCatalogue(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c));

  const handleSaveItems = () => {
    const selectedItems: PharmacyProduct[] = catalogue
      .filter(c => c.selected && c.qty > 0)
      .map(c => ({
        id: c.id,
        name: c.name,
        category: `${c.category} • ${c.packSize}`,
        price: c.price,
        gst: c.gst,
        bulkOrder: products.find(p => p.id === c.id)?.bulkOrder ?? false,
        qty: c.qty,
      }));
    setProducts(selectedItems);
    setAddItemsVisible(false);
  };

  const totalItems = products.reduce((s, p) => s + p.qty, 0);
  const orderValue = products.reduce((s, p) => s + p.price * p.qty, 0);
  const baseTax = products.reduce((s, p) => {
    const base = p.price * p.qty;
    const gstRate = (parseFloat(p.gst) || 0) / 100;
    return s + base * gstRate;
  }, 0);
  const baseTotal = orderValue + baseTax;

  // Credit limit calculations
  const creditLimit = pharmacy?.creditLimit ? parseFloat(pharmacy.creditLimit) : 0;
  const outstanding = pharmacy?.outstanding ? parseFloat(pharmacy.outstanding) : 0;
  const remainingCredit = creditLimit - outstanding - baseTotal;

  const handlePlaceOrder = () => {
    if (products.length === 0) {
      showAlert({ type: 'error', title: 'No Products', message: 'Please add at least one product to create an order.' });
      return;
    }

    if (orderValue <= 0) {
      showAlert({ type: 'error', title: 'Invalid Amount', message: 'Order amount must be greater than ₹0. Please add products with valid prices.' });
      return;
    }

    if (baseTotal + outstanding > creditLimit && creditLimit > 0) {
      showAlert({
        type: 'info',
        title: 'Credit Limit Exceeded',
        message: `This order exceeds the pharmacy's available credit limit.\n\nCredit Limit: ₹${creditLimit.toFixed(2)}\nOutstanding: ₹${outstanding.toFixed(2)}\nEst. Total: ₹${baseTotal.toFixed(2)}`,
        confirmText: 'Create Order',
        cancelText: 'Cancel',
        onConfirm: () => proceedWithOrder(),
      });
      return;
    }

    proceedWithOrder();
  };

  const proceedWithOrder = () => {
    const orderNumber = Math.floor(10000 + Math.random() * 90000).toString();
    const items = products.filter(p => p.qty > 0).map(p => {
      const base = p.price * p.qty;
      const gstRate = parseFloat(p.gst || '12') / 100;
      const itemTax = parseFloat((base * gstRate).toFixed(2));
      const itemTotal = parseFloat((base + itemTax).toFixed(2));
      return {
        productId: parseInt(p.id, 10),
        productName: p.name,
        quantity: p.qty,
        unitPrice: p.price.toFixed(2),
        discount: '0',
        tax: itemTax.toFixed(2),
        total: itemTotal.toFixed(2),
      };
    });
    navigation.navigate('Payment', {
      subtotal: orderValue,
      orderNumber,
      orderCreateData: {
        pharmacyId: parseInt(pharmacyId, 10),
        shippingAddress,
        notes,
        reasonTag: 'Pharmacy Order',
        items,
      },
    });
  };

  return (
    <View style={styles.safeArea}>
      <Header title="Create Order" showBack showNotification showProfile />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* PHARMACY label */}
        <Text style={styles.sectionLabel}>PHARMACY</Text>

        {/* Pharmacy card */}
        {pharmacyLoading ? (
          <View style={styles.pharmLoader}>
            <ActivityIndicator size="small" color={COLORS.buttonBlue} />
          </View>
        ) : (
          <>
            <View style={styles.pharmacyCard}>
              <View style={styles.pharmAvatarWrapper}>
                <View style={styles.pharmAvatar}>
                  <Text style={styles.pharmAvatarText}>
                    {(pharmacy?.name ?? pharmacyName).slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.pharmInfo}>
                <Text style={styles.pharmName}>{pharmacy?.name ?? pharmacyName}</Text>
                {pharmacy?.importance ? (
                  <Text style={styles.pharmSpecialty}>{pharmacy.importance} Importance</Text>
                ) : null}
                <View style={styles.pharmLocationRow}>
                  <MapPinOutlineIcon width={13} height={13} />
                  <Text style={styles.pharmLocation}>
                    {' '}{pharmacy?.address ?? (`${pharmacy?.city ?? ''}, ${pharmacy?.state ?? ''}`.trim() || '—')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Credit Limit & Outstanding */}
            <View style={styles.pharmStatsRow}>
              <View style={[styles.pharmStatBox, styles.pharmStatBoxActive]}>
                <Text style={styles.pharmStatLabel}>CREDIT LIMIT</Text>
                <Text style={styles.pharmStatValue} numberOfLines={1}>
                  ₹{creditLimit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={[styles.pharmStatBox, styles.pharmStatBoxActive]}>
                <Text style={styles.pharmStatLabel}>OUTSTANDING</Text>
                <Text style={[styles.pharmStatValue, outstanding > 0 && styles.outstandingRed]} numberOfLines={1}>
                  ₹{outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Product Summary header */}
        <View style={styles.productSummaryHeader}>
          <Text style={styles.productSummaryTitle}>Product Summary</Text>
          <TouchableOpacity
            style={styles.addItemsBtn}
            onPress={openAddItems}
            activeOpacity={0.8}
          >
            <AddCircle width={18} height={18} />
            <Text style={styles.addItemsText}> Add Items</Text>
          </TouchableOpacity>
        </View>

        {/* Product cards */}
        {products.length === 0 ? (
          <Text style={styles.emptyProducts}>No products added yet.</Text>
        ) : (
          products.map(item => (
            <ProductCard
              key={item.id}
              item={item}
              onToggleBulk={toggleBulk}
              onUpdateQty={updateQty}
            />
          ))
        )}

        {/* Shipping Address */}
        <Text style={styles.sectionLabel}>SHIPPING ADDRESS</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Enter delivery address or any specific instructions for the delivery personnel..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          value={shippingAddress}
          onChangeText={setShippingAddress}
          textAlignVertical="top"
        />

        {/* Notes */}
        <Text style={styles.sectionLabel}>NOTES / SPECIAL INSTRUCTIONS</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Enter delivery instructions or specific requirements..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
        />

        {/* Expected Delivery */}
        <View style={styles.deliverySection}>
          <Text style={styles.sectionLabel}>EXPECTED DELIVERY</Text>
          <TouchableOpacity
            style={styles.dateInputRow}
            onPress={() => setCalendarVisible(true)}
            activeOpacity={0.8}
          >
            <CalendarNoteIcon width={18} height={18} />
            <Text style={[styles.dateInput, !deliveryDate && styles.datePlaceholder]}>
              {deliveryDate
                ? deliveryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'Select delivery date'}
            </Text>
          </TouchableOpacity>
        </View>

        <DatePickerModal
          visible={calendarVisible}
          selectedDate={deliveryDate}
          minDate={new Date()}
          onSelect={d => { setDeliveryDate(d); setCalendarVisible(false); }}
          onClose={() => setCalendarVisible(false)}
        />

        {/* Order Priority */}
        <Text style={styles.sectionLabel}>ORDER PRIORITY</Text>
        <View style={styles.prioritySelector}>
          {(['Low', 'Medium', 'High'] as Priority[]).map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.priorityOption, priority === opt && styles.priorityOptionActive]}
              onPress={() => setPriority(opt)}
              activeOpacity={0.8}
            >
              <Text style={[styles.priorityOptionText, priority === opt && styles.priorityOptionTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.scrollSpacer} />
      </ScrollView>

      {/* Add Items Modal */}
      <Modal
        visible={addItemsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddItemsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddItemsVisible(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select Items</Text>
          {catalogueLoading ? (
            <ActivityIndicator size="small" color={COLORS.buttonBlue} style={styles.modalLoader} />
          ) : null}
          <FlatList
            data={catalogue}
            keyExtractor={item => item.id}
            style={styles.modalList}
            renderItem={({ item }) => (
              <View style={styles.modalItem}>
                <TouchableOpacity
                  style={[styles.checkbox, item.selected && styles.checkboxSelected]}
                  onPress={() => toggleCatalogueItem(item.id)}
                  activeOpacity={0.8}
                >
                  {item.selected && <Text style={styles.checkboxTick}>✓</Text>}
                </TouchableOpacity>
                <View style={styles.modalItemInfo}>
                  <Text style={styles.modalItemName}>{item.name}</Text>
                  <Text style={styles.modalItemCategory}>{item.category} • {item.packSize}</Text>
                  <Text style={styles.modalItemPrice}>₹{item.price.toFixed(2)}</Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepperBtn} onPress={() => updateCatalogueQty(item.id, -1)}>
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{item.qty}</Text>
                  <TouchableOpacity style={styles.stepperBtn} onPress={() => updateCatalogueQty(item.id, 1)}>
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ItemSeparatorComponent={ModalSeparator}
          />
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveItems} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AlertModal state={alertState} onDismiss={dismissAlert} />

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarTop}>
          <Text style={styles.bottomBarItems}>{totalItems} ITEMS</Text>
          <View style={styles.bottomBarValueRow}>
            <Text style={styles.bottomBarValueLabel}>SUBTOTAL</Text>
            <Text style={styles.bottomBarValueSmall}>₹{orderValue.toFixed(2)}</Text>
          </View>
          <View style={styles.bottomBarValueRow}>
            <Text style={styles.bottomBarValueLabel}>TAX (GST)</Text>
            <Text style={styles.bottomBarValueSmall}>₹{baseTax.toFixed(2)}</Text>
          </View>
          <View style={[styles.bottomBarValueRow, styles.bottomBarTotalRow]}>
            <Text style={styles.bottomBarTotalLabel}>EST. TOTAL</Text>
            <Text style={styles.bottomBarValue}>₹{baseTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.bottomBarValueRow}>
            <Text style={styles.bottomBarValueLabel}>REMAINING CREDIT</Text>
            <Text style={[styles.bottomBarValueSmall, remainingCredit < 0 ? styles.remainingCreditNegative : styles.remainingCreditPositive]}>
              ₹{remainingCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.placeOrderBtn} onPress={handlePlaceOrder} activeOpacity={0.85}>
          <Text style={styles.placeOrderBtnText}>Review & Place Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  pharmLoader: { height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },


  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Section label
  sectionLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  // Pharmacy card
  pharmacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  pharmAvatarWrapper: { position: 'relative' },
  pharmAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(46,80,178,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pharmAvatarText: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  pharmInfo: { flex: 1 },
  pharmName: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  pharmSpecialty: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: COLORS.textSecondary, marginBottom: 4 },
  pharmLocationRow: { flexDirection: 'row', alignItems: 'center' },
  pharmLocation: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },

  // Pharmacy stats
  pharmStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pharmStatBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
  },
  pharmStatBoxActive: { borderColor: COLORS.buttonBlue, borderWidth: 1.5 },
  pharmStatLabel: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.textSecondary, letterSpacing: 0.4, marginBottom: 4 },
  pharmStatValue: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  pharmStatTime: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  outstandingRed: { color: COLORS.error },
  remainingCreditPositive: { color: COLORS.success },
  remainingCreditNegative: { color: COLORS.error },

  // Product Summary header
  productSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productSummaryTitle: { fontSize: FONTS.size.xl, fontFamily: FONTS.family.bold, color: COLORS.textDark },
  addItemsBtn: { flexDirection: 'row', alignItems: 'center' },
  addItemsText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },

  // Product card
  productCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  productTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  productIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(46,80,178,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productMeta: { flex: 1 },
  productName: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  productCategory: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },
  productPrice: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark },

  // Bulk + stepper
  productBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bulkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bulkLabel: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.textSecondary },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    overflow: 'hidden',
  },
  stepperBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  stepperBtnText: { fontSize: FONTS.size.xl, fontFamily: FONTS.family.regular, color: COLORS.textDark, lineHeight: 22 },
  stepperValue: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, minWidth: 28, textAlign: 'center' },

  // Notes
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textDark,
    minHeight: 90,
    marginBottom: 20,
  },

  // Delivery
  deliverySection: { marginBottom: 16 },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    gap: 10,
  },
  dateInput: {
    flex: 1,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textDark,
    padding: 0,
  },
  datePlaceholder: {
    color: COLORS.textMuted,
    fontFamily: FONTS.family.regular,
  },

  // Priority
  prioritySelector: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 8,
  },
  priorityOption: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  priorityOptionActive: { backgroundColor: COLORS.buttonBlue },
  priorityOptionText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.semibold, color: COLORS.textSecondary },
  priorityOptionTextActive: { color: COLORS.white },

  scrollSpacer: { height: 120 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: '75%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#D0D0D0',
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: {
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalLoader: { marginVertical: 32 },
  modalList: { flexGrow: 0 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  modalSeparator: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 1.5, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: COLORS.buttonBlue, borderColor: COLORS.buttonBlue },
  checkboxTick: { color: COLORS.white, fontSize: 13, fontFamily: FONTS.family.bold, lineHeight: 16 },
  modalItemInfo: { flex: 1 },
  modalItemName: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  modalItemCategory: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },
  modalItemPrice: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue, marginTop: 2 },
  emptyProducts: {
    textAlign: 'center',
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textMuted,
    paddingVertical: 20,
  },
  modalFooter: {
    paddingHorizontal: 16, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.buttonBlue, height: 56,
    borderRadius: 28, justifyContent: 'center', alignItems: 'center',
  },
  saveBtnText: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.semibold, color: COLORS.white },

  // Bottom bar
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  bottomBarTop: { marginBottom: 12 },
  bottomBarItems: {
    fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary, marginBottom: 6,
  },
  bottomBarValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  bottomBarTotalRow: { marginTop: 4, marginBottom: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  bottomBarValueLabel: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.textSecondary, letterSpacing: 0.4 },
  bottomBarValueSmall: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: COLORS.textDark },
  bottomBarTotalLabel: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.textDark },
  bottomBarValue: { fontSize: FONTS.size.xl, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },
  remainingCreditNegative: { color: COLORS.error },
  placeOrderBtn: {
    backgroundColor: COLORS.buttonBlue, height: 56,
    borderRadius: 28, justifyContent: 'center', alignItems: 'center',
  },
  placeOrderBtnText: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.semibold, color: COLORS.white },
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

export default PharmacyOrderScreen;
