import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import {
  BackArrowIconBlack,
  NotificationIcon,
  ProfileIcon,
  Up,
  Down,
} from '@/assets/images';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { AppStackParamList } from '@/navigation/types';

type Highlight = { label: string; included: boolean };
type Ingredient = { id: string; name: string; description: string };

const HIGHLIGHTS: Highlight[] = [
  { label: 'Water-Free',      included: false },
  { label: 'Alcohol-Free',    included: false },
  { label: 'Oil-Free',        included: true  },
  { label: 'Silicone-Free',   included: true  },
  { label: 'Vegan',           included: true  },
  { label: 'Gluten-Free',     included: true  },
  { label: 'Cruelty-Free',    included: true  },
];

const INGREDIENTS: Ingredient[] = [
  { id: 'i1', name: 'Oat Extract',    description: 'This product is crafted with quality materials to ensure durability and performance. Designed with your convenience in mind, it seamlessly fits into your everyday life.' },
  { id: 'i2', name: 'Zinc',           description: 'Zinc helps regulate sebum production and reduces inflammation for clearer skin.' },
  { id: 'i3', name: 'Allantoin',      description: 'Allantoin soothes and conditions skin, promoting cell renewal and healing.' },
  { id: 'i4', name: 'All Ingredients', description: 'Aqua, Salicylic Acid, Capryloyl Salicylic Acid, Niacinamide, Zinc PCA, Allantoin, Avena Sativa Kernel Extract, Panthenol, Sodium Hyaluronate.' },
];

const IngredientSeparator = () => <View style={styles.ingredientSeparator} />;

const ProductDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AppStackParamList, 'ProductDetail'>>();
  const { productName, productTime } = route.params;

  const [expandedIngredient, setExpandedIngredient] = useState<string | null>('i1');

  const toggleIngredient = (id: string) =>
    setExpandedIngredient(prev => (prev === id ? null : id));

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <BackArrowIconBlack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}><NotificationIcon /></TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}><ProfileIcon /></TouchableOpacity>
        </View>
      </View>
      <View style={styles.headerDivider} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroCard}>
            <View style={styles.heroCardIconBox}>
              <Text style={styles.heroCardIcon}>＋</Text>
            </View>
            <View>
              <Text style={styles.heroCardTime}>{productTime}</Text>
              <Text style={styles.heroCardWeight}>100 Gms</Text>
            </View>
          </View>
        </View>

        {/* Time + Prescription badge */}
        <View style={styles.titleRow}>
          <Text style={styles.productTime}>{productTime}</Text>
          <View style={styles.prescriptionBadge}>
            <Text style={styles.prescriptionText}>PRESCRIPTION</Text>
          </View>
        </View>

        {/* Product title */}
        <Text style={styles.productTitle}>
          {productName.toUpperCase()}
        </Text>

        {/* Description card */}
        <View style={styles.descCard}>
          <Text style={styles.descBody}>
            A daily, gentle exfoliating, acne fighting face cleanser. It combines BHA + LHA (Salicylic Acid + Capryloyl Salicylic Acid) in 2% concentration, which provides deep cleansing, pore decongestion & sebum reduction without drying out the skin.
          </Text>
          <Text style={styles.descQuote}>
            "I have seen a reduction in acne and oiliness ever since I started using this face cleanser" -Nikhil V.
          </Text>

          {['Fragrance Free', 'Essential Oil Free', 'Non-Comedogenic'].map((feat, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{feat}</Text>
            </View>
          ))}

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>₹1,250.00</Text>
          </View>
        </View>

        {/* Quick Order */}
        <TouchableOpacity
          style={styles.quickOrderBtn}
          activeOpacity={0.85}
          onPress={() => Alert.alert('Quick Order', 'Order placed successfully!')}
        >
          <Text style={styles.quickOrderText}>Quick Order  ›</Text>
        </TouchableOpacity>

        {/* Highlights */}
        <Text style={styles.sectionLabel}>HIGHLIGHTS</Text>
        <View style={styles.highlightsCard}>
          <Text style={styles.phText}>PH  <Text style={styles.phValue}>6.0 - 7.5</Text></Text>
          {HIGHLIGHTS.map((h, i) => (
            <View key={i} style={styles.highlightRow}>
              <View style={[styles.highlightIcon, h.included ? styles.highlightIconIncluded : styles.highlightIconExcluded]}>
                <Text style={[styles.highlightIconText, h.included ? styles.highlightIconTextIncluded : styles.highlightIconTextExcluded]}>
                  {h.included ? '✓' : '✕'}
                </Text>
              </View>
              <Text style={[styles.highlightLabel, !h.included && styles.highlightLabelExcluded]}>
                {h.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Ingredients */}
        <Text style={styles.sectionLabel}>INGREDIENTS</Text>
        <View style={styles.ingredientsCard}>
          {INGREDIENTS.map((item, i) => (
            <View key={item.id}>
              {i > 0 && <IngredientSeparator />}
              <TouchableOpacity
                style={styles.ingredientHeader}
                onPress={() => toggleIngredient(item.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.ingredientName}>{item.name}</Text>
                {expandedIngredient === item.id
                  ? <Up width={16} height={16} />
                  : <Down width={16} height={16} />
                }
              </TouchableOpacity>
              {expandedIngredient === item.id && (
                <Text style={styles.ingredientDesc}>{item.description}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  backButton: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: FONTS.size.xl, fontFamily: FONTS.family.bold, color: COLORS.textDark },
  headerIcons: { flexDirection: 'row', gap: 8 },
  iconButton: { padding: 4 },
  headerDivider: { height: 1, backgroundColor: COLORS.border },

  scrollContent: { paddingBottom: 16 },

  // Hero Banner
  heroBanner: {
    backgroundColor: '#1A2340',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
  },
  heroCardIconBox: {
    width: 44, height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.buttonBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCardIcon: { color: COLORS.white, fontSize: 22, lineHeight: 26 },
  heroCardTime: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.white, marginBottom: 2 },
  heroCardWeight: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: 'rgba(255,255,255,0.75)' },

  // Title row
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  productTime: { fontSize: FONTS.size.xxl, fontFamily: FONTS.family.bold, color: COLORS.textDark },
  prescriptionBadge: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  prescriptionText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.textSecondary, letterSpacing: 0.4 },

  // Product title
  productTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    lineHeight: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  // Description card
  descCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  descBody: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  descQuote: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.italic,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  featureCheck: { fontSize: FONTS.size.md, color: COLORS.buttonBlue, marginRight: 8, fontFamily: FONTS.family.bold },
  featureText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.regular, color: COLORS.textDark },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  amountLabel: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.textSecondary },
  amountValue: { fontSize: FONTS.size.xl, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },

  // Quick Order
  quickOrderBtn: {
    marginHorizontal: 16,
    backgroundColor: COLORS.buttonBlue,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  quickOrderText: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.semibold, color: COLORS.white },

  // Section label
  sectionLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    letterSpacing: 0.6,
    marginBottom: 10,
    paddingHorizontal: 16,
  },

  // Highlights
  highlightsCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  phText: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.textSecondary, marginBottom: 12 },
  phValue: { color: COLORS.buttonBlue },
  highlightRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  highlightIcon: {
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  highlightIconIncluded: { backgroundColor: 'rgba(46,80,178,0.1)' },
  highlightIconExcluded: { backgroundColor: 'rgba(211,47,47,0.1)' },
  highlightIconText: { fontSize: 11, fontFamily: FONTS.family.bold, lineHeight: 14 },
  highlightIconTextIncluded: { color: COLORS.buttonBlue },
  highlightIconTextExcluded: { color: COLORS.error },
  highlightLabel: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textDark },
  highlightLabelExcluded: { color: COLORS.textSecondary },

  // Ingredients
  ingredientsCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  ingredientSeparator: { height: 1, backgroundColor: COLORS.border },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  ingredientName: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textSecondary },
  ingredientDesc: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
});

export default ProductDetailScreen;
