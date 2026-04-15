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

type NavProp = NativeStackNavigationProp<AppStackParamList>;
type RoutePropType = RouteProp<AppStackParamList, 'CreateOrder'>;

type Priority = 'Low' | 'Medium' | 'High';

type Product = {
  id: string;
  time: string;
  name: string;
  category: string;
  badge: 'Best Seller' | 'Limited Stock' | null;
  price: number;
  offer: string;
  foc: boolean;
  qty: number;
};

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', time: '08:00 AM', name: 'Antibiotic', category: 'Strip of 10', badge: 'Best Seller',   price: 45, offer: '10 + 2 Offer', foc: true,  qty: 12 },
  { id: '2', time: '08:00 AM', name: 'Antibiotic', category: 'Strip of 10', badge: 'Limited Stock', price: 45, offer: '10 + 2 Offer', foc: true,  qty: 12 },
];

type CatalogueItem = {
  id: string;
  time: string;
  description: string;
  qty: number;
  selected: boolean;
};

const CATALOGUE: CatalogueItem[] = [
  { id: 'c1', time: '08:00 AM', description: 'Reduces Sebum & Prevents Breakout Without Drying Skin', qty: 12, selected: true  },
  { id: 'c2', time: '08:00 AM', description: 'Reduces Sebum & Prevents Breakout Without Drying Skin', qty: 12, selected: false },
  { id: 'c3', time: '08:00 AM', description: 'Advanced Moisturising Formula for Sensitive Skin',       qty: 6,  selected: false },
  { id: 'c4', time: '08:00 AM', description: 'Broad Spectrum SPF 50 Sunscreen Gel',                   qty: 10, selected: false },
];

const LAST_ORDERED = [
  { time: '08:00 AM', name: 'Antihypertensive' },
  { time: '08:00 AM', name: 'Statin Combo' },
  { time: '08:00 AM', name: 'Anti-arrhythmic' },
  { time: '08:00 AM', name: 'Anti-arrhythmic' },
  { time: '08:00 AM', name: 'Anti-arrhythmic' },
];

const ModalSeparator = () => <View style={styles.modalSeparator} />;

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
          <Text style={styles.productTime}>{item.time}</Text>
          {item.badge && (
            <View style={[styles.badge, item.badge === 'Best Seller' ? styles.badgeBestSeller : styles.badgeLimitedStock]}>
              <Text style={[styles.badgeText, item.badge === 'Best Seller' ? styles.badgeBestSellerText : styles.badgeLimitedStockText]}>
                {item.badge}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.productCategory}>{item.name} • {item.category}</Text>
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
      } catch {
        // keep null — UI will show fallback
      } finally {
        setDoctorLoading(false);
      }
    };
    fetchDoctor();
  }, [doctorId]);

  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [inventoryExpanded, setInventoryExpanded] = useState(true);
  const [lastOrderedExpanded, setLastOrderedExpanded] = useState(false);
  const [priority, setPriority] = useState<Priority>('Medium');
  const [deliveryDate, setDeliveryDate] = useState('10 / 25 / 2025');
  const [notes, setNotes] = useState('');
  const [addItemsVisible, setAddItemsVisible] = useState(false);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>(CATALOGUE);

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
  const focCount  = products.filter(p => p.foc).length;
  const savings   = products.filter(p => p.foc).reduce((s, p) => s + p.price, 0);
  const orderValue = products.reduce((s, p) => s + p.price * p.qty, 0);

  const toggleCatalogueItem = (id: string) =>
    setCatalogue(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));

  const updateCatalogueQty = (id: string, delta: number) =>
    setCatalogue(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c));

  const handleSaveItems = () => {
    const newItems: Product[] = catalogue
      .filter(c => c.selected && !products.find(p => p.id === c.id))
      .map(c => ({
        id: c.id,
        time: c.time,
        name: c.description.split(' ').slice(0, 2).join(' '),
        category: 'Strip of 10',
        badge: null,
        price: 45,
        offer: '10 + 2 Offer',
        foc: false,
        qty: c.qty,
      }));
    if (newItems.length) setProducts(prev => [...prev, ...newItems]);
    setAddItemsVisible(false);
  };

  const handlePlaceOrder = () => {
    const orderNumber = Math.floor(10000 + Math.random() * 90000).toString();
    navigation.navigate('Payment', { subtotal: orderValue, orderNumber });
  };


  return (
    <View style={styles.safeArea}>
      <Header title="Create Order" showBack showNotification showProfile />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Doctor Selection */}
        <Text style={styles.sectionLabel}>DOCTOR SELECTION</Text>

        {/* Search */}
        <View style={styles.searchBox}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Product by name or SKU..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

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
              onPress={() => setAddItemsVisible(true)}
            >
              <AddCircle />
              <Text style={styles.addItemsBtnText}>  Add Items</Text>
            </TouchableOpacity>
          </View>

          {products.map(item => (
            <ProductCard
              key={item.id}
              item={item}
              onToggleFoc={toggleFoc}
              onUpdateQty={updateQty}
              onLongPress={() => navigation.navigate('ProductDetail', {
                productId: item.id,
                productName: `${item.name} • ${item.category}`,
                productTime: item.time,
              })}
            />
          ))}

          <Text style={styles.longPressHint}>Long-press items to view composition and detailed pricing</Text>
        </CollapsibleSection>

        {/* Expected Delivery */}
        <View style={styles.deliverySection}>
          <Text style={styles.sectionLabel}>EXPECTED DELIVERY</Text>
          <View style={styles.dateInputRow}>
            <CalendarNoteIcon width={18} height={18} />
            <TextInput
              style={styles.dateInput}
              value={deliveryDate}
              onChangeText={setDeliveryDate}
            />
          </View>
        </View>

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

        {/* Last Ordered Products */}
        <CollapsibleSection
          title="Last Ordered Products"
          expanded={lastOrderedExpanded}
          onToggle={() => setLastOrderedExpanded(p => !p)}
        >
          {LAST_ORDERED.map((item, i) => (
            <View key={i} style={[styles.lastOrderedRow, i < LAST_ORDERED.length - 1 && styles.lastOrderedRowBorder]}>
              <View>
                <Text style={styles.lastOrderedTime}>{item.time}</Text>
                <Text style={styles.lastOrderedName}>{item.name}</Text>
              </View>
              <TouchableOpacity><InfoIcon width={20} height={20} /></TouchableOpacity>
            </View>
          ))}
        </CollapsibleSection>

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
          {/* Handle */}
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select Items</Text>

          <FlatList
            data={catalogue}
            keyExtractor={item => item.id}
            style={styles.modalList}
            renderItem={({ item }) => (
              <View style={styles.modalItem}>
                {/* Checkbox */}
                <TouchableOpacity
                  style={[styles.checkbox, item.selected && styles.checkboxSelected]}
                  onPress={() => toggleCatalogueItem(item.id)}
                  activeOpacity={0.8}
                >
                  {item.selected && <Text style={styles.checkboxTick}>✓</Text>}
                </TouchableOpacity>

                {/* Info */}
                <View style={styles.modalItemInfo}>
                  <Text style={styles.modalItemTime}>{item.time}</Text>
                  <Text style={styles.modalItemDesc}>{item.description}</Text>
                </View>

                {/* Stepper */}
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

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarTop}>
          <Text style={styles.bottomBarItems}>
            {totalItems} ITEMS ({focCount} FOC)
            <Text style={styles.bottomBarSavings}>  ·  SAVINGS: ₹{savings.toFixed(2)}</Text>
          </Text>
          <View style={styles.bottomBarValueRow}>
            <Text style={styles.bottomBarValueLabel}>EST. ORDER VALUE</Text>
            <Text style={styles.bottomBarValue}>₹{orderValue.toFixed(2)}</Text>
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
  doctorStatsRow: { flexDirection: 'row', gap: 10 },
  doctorStatBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
  },
  doctorStatBoxActive: { borderColor: COLORS.buttonBlue, borderWidth: 1.5 },
  doctorStatLabel: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.textSecondary, letterSpacing: 0.4, marginBottom: 4 },
  doctorStatTime: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  doctorStatSub: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },

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
    marginBottom: 4,
  },
  bottomBarSavings: { color: COLORS.success },
  bottomBarValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomBarValueLabel: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.textSecondary },
  bottomBarValue: { fontSize: FONTS.size.xl, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },
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
    backgroundColor: 'rgba(0,0,0,0.4)',
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

export default CreateOrderScreen;
