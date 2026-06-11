import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import { RouteProp, useRoute } from '@react-navigation/native';
import { AppStackParamList } from '@/navigation/types';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';

type ApiProductDetail = {
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

const ProductDetailScreen = () => {
  const route = useRoute<RouteProp<AppStackParamList, 'ProductDetail'>>();
  const { productId, productName, productTime } = route.params;

  const [product, setProduct] = useState<ApiProductDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await apiClient.get<ApiProductDetail>(
          ENDPOINTS.products.detail(parseInt(productId, 10))
        );
        setProduct(res.data);
      } catch {
        // keep null — fallback to route params
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const displayName = product?.name ?? productName;
  const category = product?.category ?? productTime;
  const mrp = product ? parseFloat(product.mrp) : 0;
  const gstRate = product ? parseFloat(product.gst) : 0;
  const taxAmount = mrp * (gstRate / 100);
  const mrpInclTax = mrp + taxAmount;

  const specs = product
    ? [
        { label: 'SKU', value: product.sku },
        { label: 'Product Code', value: product.code },
        { label: 'HSN Code', value: product.hsnCode },
        { label: 'Pack Size', value: product.packSize },
        { label: 'Category', value: product.category },
      ]
    : [];

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <Header title="Product Details" showBack showNotification showProfile />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.buttonBlue} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <Header title="Product Details" showBack showNotification showProfile />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroCard}>
            <View style={styles.heroCardIconBox}>
              <Text style={styles.heroCardIcon}>＋</Text>
            </View>
            <View style={styles.heroCardMeta}>
              <Text style={styles.heroCardName} numberOfLines={2}>{displayName}</Text>
              <Text style={styles.heroCardSub}>{product?.packSize ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.productCategory}>{category}</Text>
          {product?.sku ? (
            <View style={styles.skuBadge}>
              <Text style={styles.skuBadgeText}>SKU: {product.sku}</Text>
            </View>
          ) : null}
        </View>

        {/* Product name */}
        <Text style={styles.productTitle}>{displayName.toUpperCase()}</Text>

        {/* Pricing card */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingRow}>
            <View style={styles.pricingBlock}>
              <Text style={styles.pricingLabel}>MRP (excl. tax)</Text>
              <Text style={styles.pricingValue}>
                ₹{mrp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.pricingDivider} />
            <View style={styles.pricingBlock}>
              <Text style={styles.pricingLabel}>GST</Text>
              <Text style={styles.pricingValue}>{product?.gst ?? '0'}%</Text>
            </View>
            <View style={styles.pricingDivider} />
            <View style={styles.pricingBlock}>
              <Text style={styles.pricingLabel}>MRP (incl. tax)</Text>
              <Text style={[styles.pricingValue, styles.pricingValueBlue]}>
                ₹{mrpInclTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        {/* Stock Card */}
        <View style={styles.stockCard}>
          <View style={styles.stockRow}>
            <View style={styles.stockBlock}>
              <Text style={styles.stockLabel}>AVAILABLE STOCK</Text>
              <Text style={[
                styles.stockValue,
                (product?.availableQty ?? 0) < 10 && styles.stockValueLow,
              ]}>
                {product?.availableQty ?? '—'}
              </Text>
              {(product?.availableQty ?? 0) < 10 && (
                <Text style={styles.stockWarning}>Low Stock</Text>
              )}
            </View>
            <View style={styles.stockDivider} />
            <View style={styles.stockBlock}>
              <Text style={styles.stockLabel}>WAREHOUSE</Text>
              <Text style={styles.stockValue} numberOfLines={2}>
                {product?.warehouseName ?? '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Product Specifications */}
        {specs.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>PRODUCT SPECIFICATIONS</Text>
            <View style={styles.specsCard}>
              {specs.map((spec, i) => (
                <View key={i} style={[styles.specRow, i < specs.length - 1 && styles.specRowBorder]}>
                  <Text style={styles.specLabel}>{spec.label}</Text>
                  <Text style={styles.specValue}>{spec.value || '—'}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 16 },

  // Hero Banner
  heroBanner: {
    backgroundColor: '#1A2340',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    width: '100%',
  },
  heroCardIconBox: {
    width: 44, height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.buttonBlue,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  heroCardIcon: { color: COLORS.white, fontSize: 22, lineHeight: 26 },
  heroCardMeta: { flex: 1 },
  heroCardName: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.white, marginBottom: 2 },
  heroCardSub: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: 'rgba(255,255,255,0.75)' },

  // Title row
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  productCategory: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.textDark, flex: 1, marginRight: 8 },
  skuBadge: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
  },
  skuBadgeText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.textSecondary },

  // Product title
  productTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    lineHeight: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  // Pricing card
  pricingCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  pricingRow: { flexDirection: 'row', alignItems: 'stretch' },
  pricingBlock: { flex: 1, padding: 14, alignItems: 'center' },
  pricingDivider: { width: 1, backgroundColor: COLORS.border },
  pricingLabel: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.4,
    marginBottom: 6,
    textAlign: 'center',
  },
  pricingValue: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, textAlign: 'center' },
  pricingValueBlue: { color: COLORS.buttonBlue },

  // Stock card
  stockCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  stockRow: { flexDirection: 'row', alignItems: 'stretch' },
  stockBlock: { flex: 1, padding: 14, alignItems: 'center' },
  stockDivider: { width: 1, backgroundColor: COLORS.border },
  stockLabel: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.4,
    marginBottom: 6,
    textAlign: 'center',
  },
  stockValue: { fontSize: FONTS.size.xl, fontFamily: FONTS.family.bold, color: COLORS.textDark, textAlign: 'center' },
  stockValueLow: { color: '#DC2626' },
  stockWarning: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: '#DC2626', marginTop: 4 },

  // Section label
  sectionLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    letterSpacing: 0.6,
    marginBottom: 10,
    paddingHorizontal: 16,
  },

  // Specs card
  specsCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  specRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  specLabel: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: COLORS.textSecondary },
  specValue: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.textDark, maxWidth: '55%', textAlign: 'right' },
});

export default ProductDetailScreen;
