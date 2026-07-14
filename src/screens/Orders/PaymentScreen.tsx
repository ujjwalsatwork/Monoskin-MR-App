import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
const ALERT_ACCENT: Record<AlertType, string> = { success: '#16A34A', error: '#DC2626', info: '#2563EB' };

const AlertModal = ({ state, onDismiss }: { state: AlertState; onDismiss: () => void }) => {
  const accent = ALERT_ACCENT[state.type];
  const Icon = state.type === 'success' ? CheckCircleIcon : state.type === 'error' ? ErrorCircleIcon : InfoCircleIcon;
  const handleConfirm = () => { onDismiss(); state.onConfirm?.(); };
  const handleCancel  = () => { onDismiss(); state.onCancel?.(); };
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

// ── Pricing types ─────────────────────────────────────────────────────────────

type ApiScheme = {
  id: number;
  name: string;
  type: 'percentage' | 'buyXgetY' | 'bundle' | 'fixed';
  buyQty: number;
  getQty: number;
  discount: string;
  // BXGY schemes may carry an additional "+ X% off" / "+ ₹X off" on top of free goods.
  secondaryDiscountType: 'percentage' | 'fixed' | null;
  secondaryDiscountValue: string | null;
  maxDiscount: string | null;
  validFrom: string | null;
  validTo: string | null;
  minOrderValue: string | null;
  applicableProducts: number[] | null;
  excludedProducts: number[] | null;
  status: string;
};

type ApiPromoCode = {
  id: number;
  code: string;
  type: 'Percentage' | 'Fixed';
  discount: string;
  usageLimit: number | null;
  usedCount: number;
  schemeStackability: 'Allow' | 'Block';
  eligibleProducts: number[] | null;
  eligibleCategories: string[] | null;
  validFrom: string | null;
  validTo: string | null;
  minOrderValue: string | null;
  status: string;
};

type ApiClinicCode = {
  id: number;
  code: string;
  doctorId: number;
  discount: string;
  status: string;
};

type ApiPricingSlab = {
  id: number;
  name: string;
  discount: string;
  minOrderValue: string | null;
};

type FreeGood = { productId: number; productName: string; quantity: number };

// ── Helpers ───────────────────────────────────────────────────────────────────

const safeFloat = (val: string | number | null | undefined, fallback = 0): number => {
  const n = parseFloat(String(val ?? ''));
  return isNaN(n) ? fallback : n;
};

// Indian-grouped currency for display, e.g. 20000 → "20,000.00". Display only —
// never use for API payloads, which expect plain comma-free decimals.
const formatINR = (val: number, decimals = 2): string =>
  val.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList, OrderItemPayload } from '@/navigation/types';
import { Down } from '@/assets/images';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';

type RouteProps = RouteProp<AppStackParamList, 'Payment'>;
type NavProp    = NativeStackNavigationProp<AppStackParamList>;

// Orders qualify for free shipping above this value (display only — the app never
// charges shipping; this mirrors the web summary's shipping row).
const FREE_SHIPPING_MIN = 3000;

const ModalSeparator = () => <View style={styles.modalSeparator} />;

// ── Screen ────────────────────────────────────────────────────────────────────

const PaymentScreen = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();
  const { subtotal, orderNumber, orderCreateData } = route.params;
  const doctorId = orderCreateData.doctorId;

  // ── Pricing data state ──────────────────────────────────────────────────────
  const [schemes,     setSchemes]     = useState<ApiScheme[]>([]);
  const [promoCodes,  setPromoCodes]  = useState<ApiPromoCode[]>([]);
  const [clinicCodes, setClinicCodes] = useState<ApiClinicCode[]>([]);
  const [pricingSlab, setPricingSlab] = useState<ApiPricingSlab | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);

  // ── User selections ─────────────────────────────────────────────────────────
  const [selectedScheme,    setSelectedScheme]    = useState<ApiScheme | null>(null);
  const [appliedPromo,      setAppliedPromo]      = useState<ApiPromoCode | null>(null);
  const [appliedClinicCode, setAppliedClinicCode] = useState<ApiClinicCode | null>(null);
  const [codeInput,   setCodeInput]   = useState('');
  const [codeError,   setCodeError]   = useState('');
  const [schemePickerVisible, setSchemePickerVisible] = useState(false);

  // ── Other state ─────────────────────────────────────────────────────────────
  const [loading,    setLoading]    = useState(false);
  const [alertState, setAlertState] = useState<AlertState>(ALERT_HIDDEN);

  const showAlert  = (config: Omit<AlertState, 'visible'>) => setAlertState({ ...config, visible: true });
  const dismissAlert = () => setAlertState(prev => ({ ...ALERT_HIDDEN, type: prev.type }));

  // ── Fetch pricing data on mount ─────────────────────────────────────────────
  useEffect(() => {
    const fetchPricing = async () => {
      setPricingLoading(true);
      try {
        const [schemesRes, promoRes] = await Promise.all([
          apiClient.get<ApiScheme[]>(`${ENDPOINTS.schemes.list}?status=Active`),
          apiClient.get<ApiPromoCode[]>(ENDPOINTS.promoCodes.list),
        ]);
        setSchemes(schemesRes.data ?? []);
        setPromoCodes(promoRes.data ?? []);

        if (doctorId) {
          try {
            const clinicRes = await apiClient.get<ApiClinicCode[]>(
              `${ENDPOINTS.clinicCodes.list}?doctorId=${doctorId}`
            );
            setClinicCodes((clinicRes.data ?? []).filter(c => c.status === 'Active' && c.doctorId === doctorId));
          } catch { /* doctor may have no clinic codes */ }
        }
      } catch { /* continue without discount data */ }
      finally { setPricingLoading(false); }
    };
    fetchPricing();
  }, []);

  // Whether the cart satisfies a buy-X-get-Y scheme's buyQty requirement
  const meetsQtyRequirement = (s: ApiScheme): boolean => {
    if (s.type !== 'buyXgetY' || !s.buyQty) return true;
    return orderCreateData.items.some(item => {
      const pid = item.productId;
      if (s.excludedProducts?.includes(pid)) return false;
      if (s.applicableProducts?.length && !s.applicableProducts.includes(pid)) return false;
      return item.quantity >= s.buyQty;
    });
  };

  // Re-validate applied code / scheme every 60 s
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      if (appliedPromo?.validTo && new Date(appliedPromo.validTo) < now) {
        setAppliedPromo(null);
        setCodeInput('');
        showAlert({ type: 'info', title: 'Promo Expired', message: `Code "${appliedPromo.code}" expired and was removed.` });
      }
      if (selectedScheme?.validTo && new Date(selectedScheme.validTo) < now) {
        setSelectedScheme(null);
        showAlert({ type: 'info', title: 'Scheme Expired', message: `"${selectedScheme.name}" expired and was removed.` });
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [appliedPromo, selectedScheme]);

  // Clear selected scheme if it becomes ineligible (qty check is re-evaluated each render)
  useEffect(() => {
    if (!selectedScheme) return;
    const stillEligible =
      selectedScheme.status === 'Active' &&
      (!selectedScheme.validTo || new Date(selectedScheme.validTo) >= new Date()) &&
      (!selectedScheme.minOrderValue || subtotal >= safeFloat(selectedScheme.minOrderValue)) &&
      meetsQtyRequirement(selectedScheme);
    if (!stillEligible) setSelectedScheme(null);
  }, [selectedScheme, subtotal]);

  // ── Web-aligned pricing (client-confirmed architecture) ─────────────────────
  // Two independent effects: (1) buyXgetY free goods scale proportionally, and
  // (2) percentage discounts hit the ex-GST base of the PAID units only, with GST
  // recomputed AFTER the discount. Flat ₹ discounts are deducted at order level
  // AFTER tax (they never reduce GST). unitPrice is the GST-INCLUSIVE MRP, so the
  // ex-GST rate = unitPrice ÷ (1 + GST%).
  const slabPct   = safeFloat(pricingSlab?.discount);
  // buyXgetY schemes only grant free goods — their own `discount` value is ignored.
  const schemePct = selectedScheme && ['percentage', 'bundle'].includes(selectedScheme.type)
    ? safeFloat(selectedScheme.discount) : 0;
  const schemeFlat = selectedScheme?.type === 'fixed' ? safeFloat(selectedScheme.discount) : 0;
  const clinicPct  = safeFloat(appliedClinicCode?.discount);
  const promoPct   = appliedPromo?.type === 'Percentage' ? safeFloat(appliedPromo.discount) : 0;
  const promoFlat  = appliedPromo?.type === 'Fixed'      ? safeFloat(appliedPromo.discount) : 0;

  // buyXgetY secondary discount ("+ X% off" / "+ ₹X off"): a percentage joins the
  // combined rate; a fixed amount is a flat ₹, both capped at maxDiscount when set.
  const schemeSecondaryType  = selectedScheme?.type === 'buyXgetY' ? selectedScheme.secondaryDiscountType : null;
  const schemeSecondaryValue = safeFloat(selectedScheme?.secondaryDiscountValue);
  const schemeMaxDiscount    = selectedScheme?.maxDiscount != null ? safeFloat(selectedScheme.maxDiscount) : null;
  const schemeSecondaryPct   = schemeSecondaryType === 'percentage' ? schemeSecondaryValue : 0;
  const schemeSecondaryFlat  = schemeSecondaryType === 'fixed' && schemeSecondaryValue > 0
    ? (schemeMaxDiscount != null ? Math.min(schemeSecondaryValue, schemeMaxDiscount) : schemeSecondaryValue)
    : 0;

  // Combined percentage rate applied per line, capped at 100%.
  const totalPct = Math.min(100, slabPct + schemePct + schemeSecondaryPct + clinicPct + promoPct);

  // Per-line breakdown on the ex-GST base of the PAID units (free units are not billed).
  const computeLine = (item: OrderItemPayload) => {
    const gstRate   = safeFloat(item.gst) / 100;
    const exGstRate = safeFloat(item.unitPrice) / (1 + gstRate);   // strip GST from MRP
    const baseExGst = exGstRate * item.quantity;
    const discBase  = baseExGst * (1 - totalPct / 100);            // % off, ex-GST
    return {
      baseExGst,
      lineDisc:  baseExGst - discBase,        // percentage discount (ex-GST)
      lineTax:   discBase * gstRate,          // GST recomputed after the discount
      lineTotal: discBase + discBase * gstRate,
    };
  };

  const lineBreakdowns = orderCreateData.items.map(computeLine);
  const subtotalExGst  = lineBreakdowns.reduce((s, l) => s + l.baseExGst, 0);  // ex-GST, pre-discount
  const pctDiscountAmt = lineBreakdowns.reduce((s, l) => s + l.lineDisc, 0);
  const computedTax    = lineBreakdowns.reduce((s, l) => s + l.lineTax, 0);
  const taxedSubtotal  = subtotalExGst - pctDiscountAmt + computedTax;

  // Flat ₹ discounts: deducted at order level, after tax (capped so total ≥ 0).
  const flatDisc    = Math.min(taxedSubtotal, schemeFlat + promoFlat + schemeSecondaryFlat);
  const discountAmt = pctDiscountAmt + flatDisc;
  const total       = taxedSubtotal - flatDisc;

  // Whether the selected scheme attaches to a given product line (respects
  // applicable / excluded product lists).
  const schemeAppliesTo = (pid: number): boolean => {
    if (!selectedScheme) return false;
    if (selectedScheme.excludedProducts?.includes(pid)) return false;
    return !selectedScheme.applicableProducts?.length
      || selectedScheme.applicableProducts.includes(pid);
  };

  // buyXgetY free goods — proportional per-unit scaling with an activation gate.
  const freeGoods: FreeGood[] = (selectedScheme?.type === 'buyXgetY')
    ? orderCreateData.items.reduce<FreeGood[]>((acc, item: OrderItemPayload) => {
        const pid = item.productId;
        const excluded = selectedScheme.excludedProducts?.includes(pid) ?? false;
        const applicable = !excluded && (
          !selectedScheme.applicableProducts?.length ||
          (selectedScheme.applicableProducts?.includes(pid) ?? false)
        );
        if (!applicable) return acc;
        // Activation gate: below activationMin (defaults to buyQty) → no free goods.
        const activationMin = selectedScheme.buyQty;
        // Proportional scaling: free = floor(qty × getQty ÷ buyQty), not whole blocks.
        const freeQty = item.quantity >= activationMin
          ? Math.floor((item.quantity * selectedScheme.getQty) / selectedScheme.buyQty)
          : 0;
        if (freeQty > 0) {
          acc.push({ productId: pid, productName: item.productName ?? `Product #${pid}`, quantity: freeQty });
        }
        return acc;
      }, [])
    : [];

  // Eligible schemes for current order
  const eligibleSchemes = schemes.filter(s => {
    if (s.status !== 'Active') return false;
    const now = new Date();
    if (s.validFrom && new Date(s.validFrom) > now) return false;
    if (s.validTo   && new Date(s.validTo)   < now) return false;
    if (s.minOrderValue && subtotal < safeFloat(s.minOrderValue)) return false;
    if (s.applicableProducts?.length) {
      const cartIds = orderCreateData.items.map(i => i.productId);
      if (!cartIds.some(id => s.applicableProducts!.includes(id))) return false;
    }
    // BXGY: cart must have at least one qualifying product with qty >= buyQty
    if (!meetsQtyRequirement(s)) return false;
    return true;
  });

  const ineligibleSchemes = schemes.filter(s => {
    if (s.status !== 'Active') return false;
    const now = new Date();
    if (s.validFrom && new Date(s.validFrom) > now) return false;
    if (s.validTo   && new Date(s.validTo)   < now) return false;
    return !eligibleSchemes.find(e => e.id === s.id);
  });

  // ── Code apply (promo + clinic) ─────────────────────────────────────────────
  const applyCode = () => {
    const raw = codeInput.trim().toUpperCase();
    if (!raw) return;

    // Try promo codes first
    const promo = promoCodes.find(pc => pc.code.toUpperCase() === raw);
    if (promo) {
      if (promo.status !== 'Active') { setCodeError('This promo code is not active'); return; }
      const now = new Date();
      if (promo.validFrom && new Date(promo.validFrom) > now) { setCodeError('Code is not yet active'); return; }
      if (promo.validTo   && new Date(promo.validTo)   < now) { setCodeError('Code has expired'); return; }
      if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) { setCodeError('Usage limit reached'); return; }
      if (promo.minOrderValue && subtotal < safeFloat(promo.minOrderValue)) {
        setCodeError(`Min. order ₹${formatINR(safeFloat(promo.minOrderValue))} required`); return;
      }
      if (promo.eligibleProducts?.length) {
        const cartIds = orderCreateData.items.map(i => i.productId);
        if (!cartIds.some(id => promo.eligibleProducts!.includes(id))) {
          setCodeError('Code not applicable to cart items'); return;
        }
      }
      if (selectedScheme && promo.schemeStackability === 'Block') {
        setCodeError('This code cannot be combined with the selected scheme'); return;
      }
      setAppliedPromo(promo);
      setAppliedClinicCode(null);
      setCodeError('');
      return;
    }

    // Try clinic codes
    const clinic = clinicCodes.find(cc => cc.code.toUpperCase() === raw);
    if (clinic) {
      if (clinic.doctorId !== doctorId) {
        setCodeError('This clinic code is not valid for this doctor');
        return;
      }
      if (clinic.status !== 'Active') {
        setCodeError('This clinic code is not active');
        return;
      }
      setAppliedClinicCode(clinic);
      setAppliedPromo(null);
      setCodeError('');
      return;
    }

    setCodeError('Code not found. Check spelling and try again.');
  };

  const removeCode = () => {
    setAppliedPromo(null);
    setAppliedClinicCode(null);
    setCodeInput('');
    setCodeError('');
  };

  const schemeLabel = (s: ApiScheme) => {
    if (s.type === 'buyXgetY') {
      let label = `${s.name} — Buy ${s.buyQty} Get ${s.getQty}`;
      const secVal = safeFloat(s.secondaryDiscountValue);
      if (s.secondaryDiscountType === 'percentage' && secVal > 0) label += ` + ${secVal}% off`;
      else if (s.secondaryDiscountType === 'fixed' && secVal > 0) label += ` + ₹${secVal} off`;
      return label;
    }
    if (s.type === 'percentage') return `${s.name} — ${s.discount}% off`;
    if (s.type === 'fixed') return `${s.name} — ₹${s.discount} off`;
    return s.name;
  };

  // ── Create order API call ───────────────────────────────────────────────────
  const createOrder = async () => {
    const orderPayload = {
      doctorId:       orderCreateData.doctorId,
      pharmacyId:     orderCreateData.pharmacyId,
      ...(orderCreateData.warehouseId !== undefined && { warehouseId: orderCreateData.warehouseId }),
      shippingAddress: orderCreateData.shippingAddress,
      notes:           orderCreateData.notes,
      reasonTag:       orderCreateData.reasonTag,
      status:          'Draft',
      subtotal:        subtotalExGst.toFixed(2),
      discount:        discountAmt.toFixed(2),
      tax:             computedTax.toFixed(2),
      total:           total.toFixed(2),
      orderNumber,
      ...(selectedScheme     && { appliedSchemeId: selectedScheme.id }),
      ...(appliedPromo       && { promoCodeId:     appliedPromo.id }),
      ...(appliedClinicCode  && { clinicCodeId:    appliedClinicCode.id }),
    };

    const orderRes = await apiClient.post(ENDPOINTS.orders.create, orderPayload);
    const createdOrderId: number = orderRes.data?.id;
    const apiOrderNumber: string = orderRes.data?.orderNumber ?? orderNumber;

    if (createdOrderId) {
      // One row per product. Scheme free goods ride on the SAME line via `freeQty`
      // (never a separate 0-priced item), and per-line discount/tax stay 0 — the real
      // discount & GST live at order level. Mirrors the web add-items payload.
      for (const item of orderCreateData.items) {
        const free      = freeGoods.find(fg => fg.productId === item.productId);
        const lineGross = safeFloat(item.unitPrice) * item.quantity;   // MRP × billed qty
        await apiClient.post(ENDPOINTS.orders.addItems(createdOrderId), {
          orderId:   createdOrderId,
          productId: item.productId,
          quantity:  item.quantity,
          freeQty:   free?.quantity ?? 0,
          unitPrice: item.unitPrice,
          discount:  '0',
          tax:       '0',
          total:     lineGross.toFixed(2),
        });
      }
    }

    return { createdOrderId, apiOrderNumber };
  };

  const handlePlaceOrder = async () => {
    if (loading) return;

    // Re-validate promo/clinic before posting
    if (appliedPromo) {
      const now = new Date();
      if (appliedPromo.validTo && new Date(appliedPromo.validTo) < now) {
        showAlert({ type: 'error', title: 'Promo Expired', message: `Code "${appliedPromo.code}" has expired. Please remove it and try again.` });
        return;
      }
    }

    setLoading(true);
    try {
      const { createdOrderId, apiOrderNumber } = await createOrder();
      showAlert({
        type: 'success',
        title: 'Order Placed!',
        message: `Order ${apiOrderNumber} has been placed successfully.${total > 0 ? `\n\nTotal: ₹${formatINR(total)}` : ''}`,
        confirmText: 'View Order',
        onConfirm: () => navigation.navigate('OrderDetail', { orderId: createdOrderId, orderNumber: apiOrderNumber }),
      });
    } catch (err: any) {
      console.log('Order creation error:', err);
      showAlert({ type: 'error', title: 'Order Failed', message: err?.response?.data?.message ?? 'Unable to place your order. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.safeArea}>
      <Header title="Review & Order" showBack showNotification showProfile />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Apply Discounts ── */}
        <Text style={styles.sectionLabel}>APPLY DISCOUNTS</Text>

        <View style={styles.discountCard}>
          {pricingLoading ? (
            <View style={styles.pricingLoader}>
              <ActivityIndicator size="small" color={COLORS.buttonBlue} />
              <Text style={styles.pricingLoaderText}>Loading offers…</Text>
            </View>
          ) : (
            <>
              {/* Pricing slab auto-applied badge */}
              {pricingSlab && safeFloat(pricingSlab.discount) > 0 && (
                <View style={styles.slabRow}>
                  <View style={styles.autoTag}><Text style={styles.autoTagText}>AUTO</Text></View>
                  <Text style={styles.slabName}>{pricingSlab.name}</Text>
                  <Text style={styles.discountGreen}>-{pricingSlab.discount}%</Text>
                </View>
              )}

              {/* Scheme dropdown */}
              <Text style={styles.fieldLabel}>Scheme</Text>
              <TouchableOpacity
                style={[styles.dropdownBtn, selectedScheme && styles.dropdownBtnActive]}
                onPress={() => setSchemePickerVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownText, !selectedScheme && styles.dropdownPlaceholder]}>
                  {selectedScheme ? schemeLabel(selectedScheme) : 'No scheme'}
                </Text>
                <Down width={16} height={16} />
              </TouchableOpacity>
              {schemes.length > 0 && (
                <Text style={styles.schemeHint}>
                  Only one scheme applies per order. Pick the tier that matches this customer's investment level — schemes are no longer stacked.
                </Text>
              )}

              {/* Applied scheme confirmation card */}
              {selectedScheme && (
                <View style={styles.appliedSchemeCard}>
                  <Text style={styles.appliedSchemeTitle}>
                    Scheme applied: {selectedScheme.name}
                    {schemeSecondaryPct > 0
                      ? ` (+ ${schemeSecondaryValue}% off)`
                      : schemeSecondaryFlat > 0
                        ? ` (+ ₹${schemeSecondaryValue} off)`
                        : schemePct > 0
                          ? ` (+ ${selectedScheme.discount}% off)`
                          : ''}
                  </Text>
                  {freeGoods.map((fg, i) => (
                    <Text key={i} style={styles.appliedSchemeDetail}>
                      • {fg.productName}: Buy {selectedScheme.buyQty} Get {selectedScheme.getQty} → +{fg.quantity} free
                    </Text>
                  ))}
                </View>
              )}

              {/* Promo / clinic code input */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Promo Code / Clinic Code</Text>
              {(appliedPromo || appliedClinicCode) ? (
                <View style={styles.appliedCodeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appliedCodeText}>
                      {appliedPromo?.code ?? appliedClinicCode?.code}
                    </Text>
                    <Text style={styles.appliedCodeSub}>
                      {appliedPromo
                        ? (appliedPromo.type === 'Percentage'
                            ? `${appliedPromo.discount}% off applied`
                            : `₹${formatINR(safeFloat(appliedPromo.discount))} off applied`)
                        : `${appliedClinicCode?.discount}% clinic discount applied`}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.removeBtn} onPress={removeCode} activeOpacity={0.7}>
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.codeInputRow}>
                    <TextInput
                      style={styles.codeInput}
                      placeholder="Enter promo or clinic code"
                      placeholderTextColor={COLORS.textMuted}
                      value={codeInput}
                      onChangeText={t => { setCodeInput(t.toUpperCase()); setCodeError(''); }}
                      autoCapitalize="characters"
                      returnKeyType="done"
                      onSubmitEditing={applyCode}
                    />
                    <TouchableOpacity
                      style={[styles.applyBtn, !codeInput.trim() && styles.applyBtnDisabled]}
                      onPress={applyCode}
                      disabled={!codeInput.trim()}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.applyBtnText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                  {!!codeError && <Text style={styles.codeErrorText}>{codeError}</Text>}
                </>
              )}
            </>
          )}
        </View>

        {/* ── Order Summary ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>ORDER SUMMARY</Text>
          <View style={styles.orderBadge}>
            <Text style={styles.orderBadgeText}>#{orderNumber}</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          {/* Line items — mirrors the web summary: MRP × qty, free-goods & scheme notes */}
          {orderCreateData.items.map((item, i) => {
            const free     = freeGoods.find(fg => fg.productId === item.productId);
            const onScheme = !!selectedScheme && schemeAppliesTo(item.productId);
            return (
              <View key={i} style={styles.lineItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineItemName}>{item.productName ?? `Product #${item.productId}`}</Text>
                  <Text style={styles.lineItemSub}>
                    ₹{formatINR(safeFloat(item.unitPrice))} × {item.quantity}
                    {free && (
                      <Text style={styles.lineItemFree}>
                        {`   +${free.quantity} free · Buy ${selectedScheme?.buyQty} get ${selectedScheme?.getQty} free`}
                      </Text>
                    )}
                  </Text>
                  {onScheme && (
                    <Text style={styles.lineItemScheme}>Scheme: {selectedScheme?.name}</Text>
                  )}
                </View>
              </View>
            );
          })}

          <View style={styles.summaryDivider} />

          {/* Subtotal (ex-GST taxable value, GST stripped from the MRP) */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{formatINR(subtotalExGst)}</Text>
          </View>

          {/* Discount — single combined line, as on web */}
          {discountAmt > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryDiscountKey}>Discount</Text>
              <Text style={styles.summaryDiscountVal}>-₹{formatINR(discountAmt)}</Text>
            </View>
          )}

          {/* Tax (GST) — recomputed on the discounted ex-GST base */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Tax (GST)</Text>
            <Text style={styles.summaryValue}>₹{formatINR(computedTax)}</Text>
          </View>

          {/* Shipping — free only when the order value clears the threshold,
              otherwise charges are decided later (TBD). */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Shipping</Text>
            {subtotal >= FREE_SHIPPING_MIN ? (
              <Text style={styles.shippingFree}>Free</Text>
            ) : (
              <Text style={styles.shippingTBD}>TBD</Text>
            )}
          </View>
          <Text style={subtotal >= FREE_SHIPPING_MIN ? styles.shippingNote : styles.shippingNoteMuted}>
            {subtotal >= FREE_SHIPPING_MIN
              ? `Free shipping — order above ₹${formatINR(FREE_SHIPPING_MIN, 0)}.`
              : `Add ₹${formatINR(FREE_SHIPPING_MIN - subtotal, 0)} more for free shipping. Charges will be confirmed later.`}
          </Text>

          <View style={styles.summaryDivider} />

          {/* Total */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalKey}>Total</Text>
            <Text style={styles.summaryTotalValue}>₹{formatINR(total)}</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Scheme Picker Modal */}
      <Modal
        visible={schemePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSchemePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSchemePickerVisible(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select Scheme</Text>

          <FlatList
            data={[null, ...eligibleSchemes, ...ineligibleSchemes]}
            keyExtractor={(_, i) => String(i)}
            style={styles.modalList}
            ItemSeparatorComponent={ModalSeparator}
            renderItem={({ item }) => {
              const isNull     = item === null;
              const scheme     = item as ApiScheme | null;
              const isSelected = isNull ? !selectedScheme : selectedScheme?.id === scheme?.id;
              const isInelig   = !isNull && !eligibleSchemes.find(e => e.id === scheme?.id);
              const ineligReason = !isNull && isInelig
                ? (scheme!.minOrderValue && subtotal < safeFloat(scheme!.minOrderValue)
                    ? `Add ₹${formatINR(safeFloat(scheme!.minOrderValue) - subtotal, 0)} more qualifying units to the cart`
                    : 'Not applicable to current cart')
                : '';

              return (
                <TouchableOpacity
                  style={[styles.schemeItem, isSelected && styles.schemeItemSelected]}
                  onPress={() => {
                    if (isInelig) return;
                    setSelectedScheme(isNull ? null : scheme);
                    if (!isNull && appliedPromo?.schemeStackability === 'Block') {
                      setAppliedPromo(null);
                      setCodeInput('');
                      setCodeError('Code removed — not stackable with schemes');
                    }
                    setSchemePickerVisible(false);
                  }}
                  activeOpacity={isInelig ? 1 : 0.7}
                >
                  <View style={styles.schemeItemLeft}>
                    {isSelected && <Text style={styles.schemeCheck}>✓ </Text>}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.schemeItemName, isInelig && styles.schemeItemNameDim]}>
                        {isNull ? 'No scheme' : schemeLabel(scheme!)}
                        {scheme?.minOrderValue ? ` (Min ₹${scheme.minOrderValue})` : ''}
                      </Text>
                      {!!ineligReason && (
                        <Text style={styles.schemeIneligReason}>{ineligReason}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      <AlertModal state={alertState} onDismiss={dismissAlert} />

      {/* Bottom CTA */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.proceedBtn, loading && styles.proceedBtnDisabled]}
          onPress={handlePlaceOrder}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Text style={styles.proceedBtnText}>
            {loading ? 'Placing Order…' : `Place Order  ₹${formatINR(total)}  →`}
          </Text>
        </TouchableOpacity>
        <Text style={styles.termsText}>
          Discounts are validated at checkout. Server re-checks stock and credit.
        </Text>
      </View>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  sectionLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 20,
  },
  orderBadge: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  orderBadgeText: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: COLORS.textSecondary },

  // Discount card
  discountCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 4,
  },
  pricingLoader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  pricingLoaderText: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },

  slabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46,80,178,0.06)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  autoTag: { backgroundColor: COLORS.buttonBlue, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  autoTagText: { fontSize: 9, fontFamily: FONTS.family.bold, color: COLORS.white, letterSpacing: 0.5 },
  slabName: { flex: 1, fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: COLORS.textDark },

  fieldLabel: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownBtnActive: { borderColor: COLORS.buttonBlue, backgroundColor: 'rgba(46,80,178,0.03)' },
  dropdownText: { flex: 1, fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: COLORS.textDark, marginRight: 8 },
  dropdownPlaceholder: { color: COLORS.textMuted, fontFamily: FONTS.family.regular },
  schemeHint: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.regular,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  appliedSchemeCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  appliedSchemeTitle: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: '#166534', marginBottom: 4 },
  appliedSchemeDetail: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.regular, color: '#166534' },

  codeInputRow: { flexDirection: 'row', gap: 8 },
  codeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textDark,
  },
  applyBtn: {
    backgroundColor: COLORS.buttonBlue,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnDisabled: { opacity: 0.4 },
  applyBtnText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.white },
  codeErrorText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.medium, color: COLORS.error, marginTop: 6 },

  appliedCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  appliedCodeText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: '#166534', marginBottom: 2 },
  appliedCodeSub: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.regular, color: '#166534' },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  removeBtnText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.error },

  // Summary card
  summaryCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  lineItemName: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.textDark },
  lineItemSub: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.regular, color: COLORS.textSecondary, marginTop: 2 },
  lineItemFree: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.medium, color: '#16A34A' },
  lineItemScheme: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.medium, color: '#16A34A', marginTop: 2 },
  lineItemTotal: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.textDark },
  summaryDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryKey: { fontSize: FONTS.size.md, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },
  summaryValue: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textDark },
  shippingFree: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: '#16A34A' },
  shippingTBD: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: '#E65100' },
  shippingNote: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.regular, color: '#16A34A', marginTop: -2, marginBottom: 8 },
  shippingNoteMuted: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.regular, color: COLORS.textSecondary, marginTop: -2, marginBottom: 8 },
  summaryDiscountKey: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: '#16A34A', flex: 1, marginRight: 8 },
  summaryDiscountVal: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: '#16A34A' },
  discountGreen: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: '#16A34A' },
  totalDiscountRow: { backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginHorizontal: -4 },
  totalDiscountKey: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: '#16A34A' },
  totalDiscountVal: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: '#16A34A' },
  summaryTotalKey: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.textDark },
  summaryTotalValue: { fontSize: FONTS.size.xl, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },

  // Scheme picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#D0D0D0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalList: { flexGrow: 0 },
  modalSeparator: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
  schemeItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  schemeItemSelected: { backgroundColor: 'rgba(46,80,178,0.05)' },
  schemeItemLeft: { flexDirection: 'row', alignItems: 'flex-start' },
  schemeCheck: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },
  schemeItemName: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textDark, flexWrap: 'wrap' },
  schemeItemNameDim: { color: COLORS.textMuted },
  schemeIneligReason: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.regular, color: COLORS.textMuted, marginTop: 2 },

  // Bottom CTA
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
    marginBottom: 10,
  },
  proceedBtnDisabled: { opacity: 0.6 },
  proceedBtnText: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.semibold, color: COLORS.white },
  termsText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
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
  cancelText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: '#6B7280' },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnFull: { flex: 0, width: 140 },
  confirmText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.white },
});

export default PaymentScreen;
