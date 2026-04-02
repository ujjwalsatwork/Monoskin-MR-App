import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
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

type NavProp = NativeStackNavigationProp<AppStackParamList>;
type Priority = 'Low' | 'Medium' | 'High';

type PharmacyProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  bulkOrder: boolean;
  qty: number;
};

const INITIAL_PRODUCTS: PharmacyProduct[] = [
  { id: '1', name: 'Amoxicillin 500mg', category: 'Antibiotic • Strip of 10',    price: 45,  bulkOrder: true,  qty: 12 },
  { id: '2', name: 'Paracetamol 650mg', category: 'Analgesic • Bulk Box (500)',   price: 210, bulkOrder: true,  qty: 12 },
];

type CatalogueItem = {
  id: string;
  name: string;
  category: string;
  qty: number;
  selected: boolean;
};

const CATALOGUE: CatalogueItem[] = [
  { id: 'c1', name: 'Cetirizine 10mg',     category: 'Antihistamine • Strip of 10', qty: 10, selected: false },
  { id: 'c2', name: 'Metformin 500mg',     category: 'Antidiabetic • Strip of 15',  qty: 6,  selected: false },
  { id: 'c3', name: 'Atorvastatin 10mg',   category: 'Statin • Strip of 10',        qty: 8,  selected: false },
  { id: 'c4', name: 'Omeprazole 20mg',     category: 'Antacid • Strip of 14',       qty: 12, selected: false },
];

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
  const { pharmacyName } = route.params;

  const [products, setProducts] = useState<PharmacyProduct[]>(INITIAL_PRODUCTS);
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('10 / 25 / 2025');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [addItemsVisible, setAddItemsVisible] = useState(false);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>(CATALOGUE);

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
    const newItems: PharmacyProduct[] = catalogue
      .filter(c => c.selected && !products.find(p => p.id === c.id))
      .map(c => ({
        id: c.id,
        name: c.name,
        category: c.category,
        price: 45,
        bulkOrder: false,
        qty: c.qty,
      }));
    if (newItems.length) setProducts(prev => [...prev, ...newItems]);
    setAddItemsVisible(false);
  };

  const totalItems = products.reduce((s, p) => s + p.qty, 0);
  const orderValue = products.reduce((s, p) => s + p.price * p.qty, 0);

  const handlePlaceOrder = () => {
    Alert.alert('Order Placed', 'Your pharmacy order has been placed successfully.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={styles.safeArea}>
      <Header title="Create Order" showBack showNotification showProfile />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* PHARMACY label */}
        <Text style={styles.sectionLabel}>PHARMACY</Text>

        {/* Pharmacy card */}
        <View style={styles.pharmacyCard}>
          <View style={styles.pharmAvatarWrapper}>
            <View style={styles.pharmAvatar}>
              <Text style={styles.pharmAvatarText}>PH</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.pharmInfo}>
            <Text style={styles.pharmName}>{pharmacyName}</Text>
            <Text style={styles.pharmSpecialty}>Cardiologist • MD, FACC</Text>
            <View style={styles.pharmLocationRow}>
              <MapPinOutlineIcon width={13} height={13} />
              <Text style={styles.pharmLocation}> City General Hospital, Wing B-402</Text>
            </View>
          </View>
        </View>

        {/* Product Summary header */}
        <View style={styles.productSummaryHeader}>
          <Text style={styles.productSummaryTitle}>Product Summary</Text>
          <TouchableOpacity
            style={styles.addItemsBtn}
            onPress={() => setAddItemsVisible(true)}
            activeOpacity={0.8}
          >
            <AddCircle width={18} height={18} />
            <Text style={styles.addItemsText}> Add Items</Text>
          </TouchableOpacity>
        </View>

        {/* Product cards */}
        {products.map(item => (
          <ProductCard
            key={item.id}
            item={item}
            onToggleBulk={toggleBulk}
            onUpdateQty={updateQty}
          />
        ))}

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
                  <Text style={styles.modalItemCategory}>{item.category}</Text>
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

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarTop}>
          <Text style={styles.bottomBarItems}>{totalItems} ITEMS</Text>
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
    color: COLORS.textSecondary, marginBottom: 4,
  },
  bottomBarValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomBarValueLabel: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.textSecondary },
  bottomBarValue: { fontSize: FONTS.size.xl, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },
  placeOrderBtn: {
    backgroundColor: COLORS.buttonBlue, height: 56,
    borderRadius: 28, justifyContent: 'center', alignItems: 'center',
  },
  placeOrderBtnText: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.semibold, color: COLORS.white },
});

export default PharmacyOrderScreen;
