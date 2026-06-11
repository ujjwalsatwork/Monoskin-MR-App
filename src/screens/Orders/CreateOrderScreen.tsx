import React, { useState, useEffect, useCallback } from 'react';
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
  SearchIcon,
  PillIcon,
  InfoIcon,
  CalendarNoteIcon,
  Up,
  Down,
  AddCircle,
  OfferTag,
} from '@/assets/images';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import { ApiDoctor } from '@/redux/slices/portfolioSlice';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';
import DatePickerModal from '@/components/common/DatePickerModal';

type NavProp = NativeStackNavigationProp<AppStackParamList>;
type RoutePropType = RouteProp<AppStackParamList, 'CreateOrder'>;

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
  availableQty: number;
  warehouseId: number;
  warehouseName: string;
};

type Product = {
  id: string;
  name: string;
  category: string;
  badge: 'Best Seller' | 'Limited Stock' | null;
  price: number;
  offer: string;
  foc: boolean;
  qty: number;
  gst: string;
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

const CatalogueRow = React.memo(({
  item,
  onToggle,
  onQtyUpdate,
}: {
  item: CatalogueItem;
  onToggle: (id: string) => void;
  onQtyUpdate: (id: string, delta: number) => void;
}) => (
  <View style={styles.modalItem}>
    <TouchableOpacity
      style={[styles.checkbox, item.selected && styles.checkboxSelected]}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.8}
    >
      {item.selected && <Text style={styles.checkboxTick}>✓</Text>}
    </TouchableOpacity>
    <View style={styles.modalItemInfo}>
      <Text style={styles.modalItemTime}>{item.name}</Text>
      <Text style={styles.modalItemDesc}>{item.category} • {item.packSize}</Text>
      <Text style={styles.modalItemPrice}>₹{item.price.toFixed(2)}</Text>
    </View>
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepperBtn} onPress={() => onQtyUpdate(item.id, -1)}>
        <Text style={styles.stepperBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{item.qty}</Text>
      <TouchableOpacity style={styles.stepperBtn} onPress={() => onQtyUpdate(item.id, 1)}>
        <Text style={styles.stepperBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  </View>
));

/* ── CollapsibleSection ── */
const CollapsibleSection = ({
  title, expanded, onToggle, children, rightNode,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  rightNode?: React.ReactNode;
}) => (
  <View style={styles.collapsibleCard}>
    <TouchableOpacity
      style={[styles.collapsibleHeader, expanded && styles.collapsibleHeaderExpanded]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <Text style={styles.collapsibleTitle}>{title}</Text>
      <View style={styles.collapsibleRight}>
        {rightNode}
        {expanded ? <Up width={16} height={16} /> : <Down width={16} height={16} />}
      </View>
    </TouchableOpacity>
    {expanded && <View>{children}</View>}
  </View>
);

/* ── ProductCard ── */
const ProductCard = ({
  item,
  onToggleFoc,
  onUpdateQty,
  onLongPress,
}: {
  item: Product;
  onToggleFoc: (id: string) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onLongPress: () => void;
}) => (
  <TouchableOpacity
    style={styles.productCard}
    activeOpacity={1}
    delayLongPress={400}
    onLongPress={onLongPress}
  >
    <View style={styles.productTopRow}>
      <View style={styles.productIconCircle}>
        <PillIcon width={20} height={20} />
      </View>
      <View style={styles.productMeta}>
        <View style={styles.productNameRow}>
          <Text style={styles.productTime}>{item.name}</Text>
          {item.badge && (
            <View style={[styles.badge, item.badge === 'Best Seller' ? styles.badgeBestSeller : styles.badgeLimitedStock]}>
              <Text style={[styles.badgeText, item.badge === 'Best Seller' ? styles.badgeBestSellerText : styles.badgeLimitedStockText]}>
                {item.badge}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.productCategory}>{item.category}</Text>
      </View>
      <View style={styles.productPriceBlock}>
        <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
        <View style={styles.offerBadge}>
          <View style={styles.offerIcon}><OfferTag /></View>
          <Text style={styles.offerText}>{item.offer}</Text>
        </View>
      </View>
    </View>
    <View style={styles.productBottomRow}>
      <View style={styles.focRow}>
        <Text style={styles.focLabel}>FOC</Text>
        <Switch
          value={item.foc}
          onValueChange={() => onToggleFoc(item.id)}
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
  </TouchableOpacity>
);

const CreateOrderScreen = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { doctorId } = route.params;

  const [doctor, setDoctor] = useState<ApiDoctor | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(true);

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const res = await apiClient.get<ApiDoctor>(ENDPOINTS.portfolio.doctorDetail(doctorId));
        setDoctor(res.data);
        console.log('🚀 ~ fetchDoctor ~ res.data:', res.data)
      } catch {
        // keep null — UI will show fallback
      } finally {
        setDoctorLoading(false);
      }
    };
    fetchDoctor();
  }, [doctorId]);

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

  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [inventoryExpanded, setInventoryExpanded] = useState(true);
  const [lastOrderedExpanded, setLastOrderedExpanded] = useState(false);
  const [priority, setPriority] = useState<Priority>('Medium');
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [addItemsVisible, setAddItemsVisible] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>(ALERT_HIDDEN);

  const showAlert = (config: Omit<AlertState, 'visible'>) =>
    setAlertState({ ...config, visible: true });
  const dismissAlert = () => setAlertState(prev => ({ ...ALERT_HIDDEN, type: prev.type }));

  const updateQty = (id: string, delta: number) => {
    setProducts(prev =>
      prev.map(p => p.id === id ? { ...p, qty: Math.max(0, p.qty + delta) } : p)
    );
  };

  const toggleFoc = (id: string) => {
    setProducts(prev =>
      prev.map(p => p.id === id ? { ...p, foc: !p.foc } : p)
    );
  };

  const totalItems = products.reduce((s, p) => s + p.qty, 0);
  const focCount   = products.filter(p => p.foc).length;
  const orderValue = products.reduce((s, p) => s + p.price * p.qty, 0);

  // Base tax (no discounts — discounts are applied in PaymentScreen)
  const baseTax = products.reduce((s, p) => {
    const base = p.price * p.qty;
    const gstRate = (parseFloat(p.gst) || 0) / 100;
    return s + base * gstRate;
  }, 0);
  const baseTotal = orderValue + baseTax;

  const creditLimit = doctor?.creditLimit ? parseFloat(doctor.creditLimit) : 0;
  const outstanding = doctor?.outstanding ? parseFloat(doctor.outstanding) : 0;
  const remainingCredit = creditLimit - outstanding - baseTotal;

  const toggleCatalogueItem = useCallback((id: string) =>
    setCatalogue(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c)), []);

  const updateCatalogueQty = useCallback((id: string, delta: number) =>
    setCatalogue(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c)), []);

  const handleSaveItems = () => {
    const selectedItems: Product[] = catalogue
      .filter(c => c.selected && c.qty > 0)
      .map(c => ({
        id: c.id,
        name: c.name,
        category: `${c.category} • ${c.packSize}`,
        badge: null,
        price: c.price,
        gst: c.gst,
        offer: '',
        foc: products.find(p => p.id === c.id)?.foc ?? false,
        qty: c.qty,
      }));
    setProducts(selectedItems);
    setAddItemsVisible(false);
  };

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
        message: `This order exceeds the doctor's available credit.\n\nCredit Limit: ₹${creditLimit.toFixed(2)}\nOutstanding: ₹${outstanding.toFixed(2)}\nEst. Total: ₹${baseTotal.toFixed(2)}\n\nOrder will be submitted for approval.`,
        confirmText: 'Proceed Anyway',
        cancelText: 'Cancel',
        onConfirm: () => proceedWithOrder(),
      });
      return;
    }
    proceedWithOrder();
  };

  const proceedWithOrder = () => {
    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
    const items = products.filter(p => p.qty > 0).map(p => {
      const base = p.price * p.qty;
      const gstRate = (parseFloat(p.gst) || 0) / 100;
      const itemTax = parseFloat((base * gstRate).toFixed(2));
      const itemTotal = parseFloat((base + itemTax).toFixed(2));
      return {
        productId: parseInt(p.id, 10),
        productName: p.name,
        quantity: p.qty,
        unitPrice: p.price.toFixed(2),
        gst: p.gst,
        discount: '0.00',
        tax: itemTax.toFixed(2),
        total: itemTotal.toFixed(2),
        isFreeGood: false,
      };
    });
    navigation.navigate('Payment', {
      subtotal: orderValue,
      orderNumber,
      orderCreateData: {
        doctorId: parseInt(doctorId, 10),
        shippingAddress,
        notes,
        reasonTag: 'Doctor Request',
        items,
      },
    });
  };


  return (
    <View style={styles.safeArea}>
      <Header title="Create Order" showBack showNotification showProfile />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Doctor Selection */}
        {/* <Text style={styles.sectionLabel}>DOCTOR SELECTION</Text>

        <View style={styles.searchBox}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Product by name or SKU..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View> */}

        {/* Doctor Card */}
        {doctorLoading ? (
          <View style={styles.doctorLoader}>
            <ActivityIndicator size="small" color={COLORS.buttonBlue} />
          </View>
        ) : (
          <View style={styles.doctorCard}>
            <View style={styles.doctorTop}>
              <View style={styles.doctorAvatarWrapper}>
                <View style={styles.doctorAvatar}>
                  <Text style={styles.doctorAvatarText}>
                    {doctor?.name
                      ? doctor.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                      : '--'}
                  </Text>
                </View>
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{doctor?.name ?? '—'}</Text>
                <Text style={styles.doctorSpecialty}>{doctor?.specialization ?? '—'}</Text>
                <Text style={styles.doctorHospital}>{doctor?.clinic ?? '—'}</Text>
              </View>
              {doctor?.importance ? (
                <View style={styles.priorityVisitBadge}>
                  <Text style={styles.priorityVisitText}>{doctor.importance.toUpperCase()} PRIORITY</Text>
                </View>
              ) : null}
            </View>

            {/* Credit Limit & Outstanding */}
            <View style={styles.doctorStatsRow}>
              <View style={[styles.doctorStatBox, styles.doctorStatBoxActive]}>
                <Text style={styles.doctorStatLabel}>CREDIT LIMIT</Text>
                <Text style={styles.doctorStatValue} numberOfLines={1}>
                  ₹{creditLimit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={[styles.doctorStatBox, styles.doctorStatBoxActive]}>
                <Text style={styles.doctorStatLabel}>OUTSTANDING</Text>
                <Text style={[styles.doctorStatValue, outstanding > 0 && styles.outstandingRed]} numberOfLines={1}>
                  ₹{outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.doctorStatsRow}>
              <View style={[styles.doctorStatBox, styles.doctorStatBoxActive]}>
                <Text style={styles.doctorStatLabel}>LAST SALE DATE</Text>
                <Text style={styles.doctorStatTime} numberOfLines={1}>
                  {doctor?.lastSalesDate
                    ? new Date(doctor.lastSalesDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                    : '—'}
                </Text>
                <Text style={styles.doctorStatSub}>₹{doctor?.totalSalesValue ?? '0.00'}</Text>
              </View>
              <View style={styles.doctorStatBox}>
                <Text style={styles.doctorStatLabel}>NEARBY CHEMIST</Text>
                <Text style={styles.doctorStatTime} numberOfLines={1}>{doctor?.nearbyChemistName || '—'}</Text>
                <Text style={styles.doctorStatSub} numberOfLines={1}>{doctor?.nearbyChemistPhone || '—'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Available Inventory */}
        <CollapsibleSection
          title="Available Inventory"
          expanded={inventoryExpanded}
          onToggle={() => setInventoryExpanded(p => !p)}
        >
          {/* Add Items */}
          <View style={styles.addItemsRow}>
            <TouchableOpacity
              style={styles.addItemsBtn}
              onPress={openAddItems}
            >
              <AddCircle />
              <Text style={styles.addItemsBtnText}>  Add Items</Text>
            </TouchableOpacity>
          </View>

          {products.length === 0 ? (
            <Text style={styles.emptyProducts}>No products added yet.</Text>
          ) : (
            products.map(item => (
              <ProductCard
                key={item.id}
                item={item}
                onToggleFoc={toggleFoc}
                onUpdateQty={updateQty}
                onLongPress={() => navigation.navigate('ProductDetail', {
                  productId: item.id,
                  productName: item.name,
                  productTime: item.category,
                })}
              />
            ))
          )}

          <Text style={styles.longPressHint}>Long-press items to view composition and detailed pricing</Text>
        </CollapsibleSection>

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

        {/* Last Ordered Products */}
        {/* <CollapsibleSection
          title="Last Ordered Products"
          expanded={lastOrderedExpanded}
          onToggle={() => setLastOrderedExpanded(p => !p)}
        >
          {products.length === 0 ? (
            <Text style={styles.lastOrderedEmpty}>No products added yet.</Text>
          ) : (
            products.map((item, i) => (
              <View key={item.id} style={[styles.lastOrderedRow, i < products.length - 1 && styles.lastOrderedRowBorder]}>
                <View>
                  <Text style={styles.lastOrderedTime}>{item.name}</Text>
                  <Text style={styles.lastOrderedName}>{item.category}</Text>
                </View>
                <TouchableOpacity><InfoIcon width={20} height={20} /></TouchableOpacity>
              </View>
            ))
          )}
        </CollapsibleSection> */}

        {/* Notes */}
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
        {/* Order Priority */}
        <View style={styles.prioritySection}>
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
        </View>

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

        <View style={styles.scrollSpacer} />
      </ScrollView>

      {/* Add Items Modal */}
      <Modal
        visible={addItemsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddItemsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddItemsVisible(false)}
        />
        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select Items</Text>

          {catalogueLoading ? (
            <ActivityIndicator size="small" color={COLORS.buttonBlue} style={{ marginVertical: 32 }} />
          ) : null}
          <FlatList
            data={catalogue}
            keyExtractor={item => item.id}
            style={styles.modalList}
            renderItem={({ item }) => (
              <CatalogueRow
                item={item}
                onToggle={toggleCatalogueItem}
                onQtyUpdate={updateCatalogueQty}
              />
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
          <Text style={styles.bottomBarItems}>
            {totalItems} ITEMS ({focCount} FOC)
          </Text>
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
  doctorLoader: { height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },


  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Section label
  sectionLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    gap: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textDark,
    padding: 0,
  },

  // Doctor Card
  doctorCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  doctorTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  doctorAvatarWrapper: { position: 'relative', marginRight: 12 },
  doctorAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(46,80,178,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  doctorAvatarText: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2, borderColor: COLORS.white,
  },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  doctorSpecialty: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: COLORS.textSecondary, marginBottom: 2 },
  doctorHospital: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },
  priorityVisitBadge: {
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priorityVisitText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: '#555' },

  // Doctor stats
  doctorStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  doctorStatBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
  },
  doctorStatBoxActive: { borderColor: COLORS.buttonBlue, borderWidth: 1.5 },
  doctorStatLabel: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.textSecondary, letterSpacing: 0.4, marginBottom: 4 },
  doctorStatValue: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  doctorStatTime: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  doctorStatSub: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },
  outstandingRed: { color: COLORS.error },

  // Collapsible
  collapsibleCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  collapsibleHeaderExpanded: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  collapsibleTitle: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textSecondary },
  collapsibleRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Add Items
  addItemsRow: { alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  addItemsBtn: { flexDirection: 'row', alignItems: 'center' },
  addItemsBtnText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },

  // Product Card
  productCard: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  productTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  productIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(46,80,178,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  productMeta: { flex: 1 },
  productNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  productTime: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark },
  productCategory: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },
  productPriceBlock: { alignItems: 'flex-end', gap: 6 },
  productPrice: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark },

  // Badges
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeBestSeller: { backgroundColor: 'rgba(46,80,178,0.1)' },
  badgeLimitedStock: { backgroundColor: 'rgba(229,57,53,0.1)' },
  badgeText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold },
  badgeBestSellerText: { color: COLORS.buttonBlue },
  badgeLimitedStockText: { color: COLORS.error },
  offerBadge: {
    backgroundColor: 'rgba(103,58,183,0.1)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
  },
  offerIcon: { marginRight: 4, marginTop: 1},
  offerText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: '#673AB7' },

  // FOC + Stepper
  productBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  focRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  focLabel: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.textSecondary },
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

  // Hint
  emptyProducts: {
    textAlign: 'center',
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textMuted,
    paddingVertical: 20,
  },
  longPressHint: {
    textAlign: 'center',
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.regular,
    color: COLORS.textMuted,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  // Delivery date
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
  prioritySection: { marginBottom: 16 },
  prioritySelector: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    overflow: 'hidden',
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  priorityOptionActive: { backgroundColor: COLORS.buttonBlue },
  priorityOptionText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.semibold, color: COLORS.textSecondary },
  priorityOptionTextActive: { color: COLORS.white },

  // Last Ordered
  lastOrderedEmpty: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  lastOrderedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lastOrderedRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  lastOrderedTime: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  lastOrderedName: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },

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
    marginBottom: 8,
  },

  // Bottom Bar
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
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  bottomBarValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  bottomBarTotalRow: { marginTop: 4, marginBottom: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  bottomBarValueLabel: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.textSecondary, letterSpacing: 0.4 },
  bottomBarValueSmall: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: COLORS.textDark },
  bottomBarTotalLabel: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.textDark },
  bottomBarValue: { fontSize: FONTS.size.xl, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },
  remainingCreditNegative: { color: COLORS.error },
  remainingCreditPositive: { color: COLORS.success },
  placeOrderBtn: {
    backgroundColor: COLORS.buttonBlue,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeOrderBtnText: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.semibold, color: COLORS.white },

  // Add Items Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: '75%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D0D0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalList: {
    flexGrow: 0,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  modalSeparator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.buttonBlue,
    borderColor: COLORS.buttonBlue,
  },
  checkboxTick: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: FONTS.family.bold,
    lineHeight: 16,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemTime: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 3,
  },
  modalItemDesc: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  modalItemPrice: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
    marginTop: 2,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.buttonBlue,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.semibold,
    color: COLORS.white,
  },
  scrollSpacer: { height: 120 },
});

const am = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
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

export default CreateOrderScreen;
