import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import {
  SearchIcon,
  PlayIcon,
  CartIcon,
  EyeIcon,
  CalendarNoteIcon,
  ClockIcon,
  CheckCircleIcon,
  StoreIcon,
  MapPinOutlineIcon,
  Down,
} from '@/assets/images';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';

type NavProp = NativeStackNavigationProp<AppStackParamList>;
type Category = 'A' | 'B' | 'C';
type PaymentStatus = 'completed' | 'overdue' | 'pending';
type Tab = 'Doctors' | 'Pharmacies';

/* ─── Doctor types & data ─────────────────────────────────────── */
type Doctor = {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  category: Category;
  priority?: string;
  followUpToday: boolean;
  weeklyTarget: number;
  amount: string;
  paymentStatus: PaymentStatus;
  lastVisit: string;
  lastVisitOverdue: boolean;
  achievement: { done: number; total: number };
};

const DOCTORS: Doctor[] = [
  {
    id: '1', name: 'Dr. Anil Sharma', specialty: 'Cardiologist', hospital: 'Heart & Vascular Center',
    category: 'A', priority: 'High Priority', followUpToday: true,
    weeklyTarget: 2, amount: '₹450.00', paymentStatus: 'completed',
    lastVisit: '3 days ago', lastVisitOverdue: false, achievement: { done: 6, total: 8 },
  },
  {
    id: '2', name: 'Dr. Anil Sharma', specialty: 'Internal Medicine', hospital: 'City General',
    category: 'B', followUpToday: true,
    weeklyTarget: 2, amount: '₹450.00', paymentStatus: 'completed',
    lastVisit: '3 days ago', lastVisitOverdue: false, achievement: { done: 6, total: 8 },
  },
  {
    id: '3', name: 'Dr. Anil Sharma', specialty: 'Internal Medicine', hospital: 'City General',
    category: 'C', followUpToday: true,
    weeklyTarget: 2, amount: '₹450.00', paymentStatus: 'overdue',
    lastVisit: 'OVERDUE', lastVisitOverdue: true, achievement: { done: 6, total: 8 },
  },
  {
    id: '4', name: 'Dr. Priya Mehta', specialty: 'Dermatologist', hospital: 'Skin Care Clinic',
    category: 'A', priority: 'High Priority', followUpToday: false,
    weeklyTarget: 3, amount: '₹600.00', paymentStatus: 'pending',
    lastVisit: '1 day ago', lastVisitOverdue: false, achievement: { done: 4, total: 8 },
  },
];

const CATEGORY_CONFIG: Record<Category, { label: string; bg: string; color: string }> = {
  A: { label: 'CATEGORY A', bg: '#FFF3E0', color: '#E65100' },
  B: { label: 'CATEGORY B', bg: '#F0F0F0', color: '#555555' },
  C: { label: 'CATEGORY C', bg: '#E8F5E9', color: '#2E7D32' },
};

/* ─── Pharmacy types & data ───────────────────────────────────── */
type Pharmacy = {
  id: string;
  name: string;
  location: string;
  iconBg: string;
  lastVisit: string;
  neverVisited?: boolean;
  salesCurrent: number;
  salesTarget: number;
  amount: string;
  paymentStatus: PaymentStatus;
};

const PHARMACIES: Pharmacy[] = [
  {
    id: 'p1',
    name: 'City Health Pharma',
    location: 'Downtown Medical Hub',
    iconBg: '#E8F5E9',
    lastVisit: '2 days ago',
    salesCurrent: 7500,
    salesTarget: 10000,
    amount: '$450.00',
    paymentStatus: 'completed',
  },
  {
    id: 'p2',
    name: 'Metro Care Meds',
    location: 'East Wing Plaza, G-2',
    iconBg: '#FFF3E0',
    lastVisit: '1 week ago',
    salesCurrent: 3200,
    salesTarget: 10000,
    amount: '$450.00',
    paymentStatus: 'completed',
  },
  {
    id: 'p3',
    name: 'Apex Rx Pharmacy',
    location: 'North Suburban Block C',
    iconBg: '#EDE7F6',
    neverVisited: true,
    lastVisit: '',
    salesCurrent: 12400,
    salesTarget: 10000,
    amount: '$450.00',
    paymentStatus: 'completed',
  },
];

/* ─── Doctor Card (outside render) ───────────────────────────── */
const DoctorCard = ({
  item,
  onStartVisit,
  onCreateOrder,
  onViewDetail,
}: {
  item: Doctor;
  onStartVisit: () => void;
  onCreateOrder: () => void;
  onViewDetail: () => void;
}) => {
  const catConfig = CATEGORY_CONFIG[item.category];
  const progressPercent = item.achievement.done / item.achievement.total;

  return (
    <View style={styles.card}>
      {/* Card top row */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.doctorName}>{item.name}</Text>
          <Text style={styles.doctorSub}>
            {item.specialty}
            <Text style={styles.dotSeparator}> • </Text>
            {item.hospital}
          </Text>
        </View>
        <View style={styles.cardTopRight}>
          <CalendarNoteIcon />
          <View style={[styles.categoryBadge, { backgroundColor: catConfig.bg }]}>
            <Text style={[styles.categoryText, { color: catConfig.color }]}>{catConfig.label}</Text>
          </View>
          {item.priority && <Text style={styles.priorityText}>{item.priority}</Text>}
        </View>
      </View>

      {/* Follow-up + Tag row */}
      <View style={styles.tagRow}>
        {item.followUpToday && (
          <View style={styles.followUpPill}>
            <Text style={styles.followUpText}>FOLLOW UP TODAY</Text>
          </View>
        )}
        <TouchableOpacity style={styles.addTagButton}>
          <Text style={styles.addTagText}>+ TAG</Text>
        </TouchableOpacity>
      </View>

      {/* Visit + Payment row */}
      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          <View style={styles.infoLine}>
            <CheckCircleIcon width={14} height={14} />
            <Text style={styles.infoText}>  Weekly Target: {item.weeklyTarget} Visits</Text>
          </View>
          <View style={styles.infoLine}>
            <ClockIcon width={14} height={14} />
            <Text style={styles.infoText}>  Last Visit: </Text>
            <Text style={[styles.infoText, item.lastVisitOverdue && styles.overdueText]}>
              {item.lastVisit}
            </Text>
          </View>
        </View>
        <View style={styles.infoRight}>
          <Text style={styles.amountText}>{item.amount}</Text>
          <Text style={[
            styles.paymentStatusText,
            item.paymentStatus === 'overdue' && styles.overdueText,
            item.paymentStatus === 'completed' && styles.completedText,
          ]}>
            {item.paymentStatus === 'completed' ? 'Payment Completed'
              : item.paymentStatus === 'overdue' ? 'Payment Overdue'
              : 'Payment Pending'}
          </Text>
        </View>
      </View>

      {/* Monthly Achievement */}
      <View style={styles.achievementSection}>
        <View style={styles.achievementHeader}>
          <Text style={styles.achievementLabel}>MONTHLY ACHIEVEMENT</Text>
          <Text style={styles.achievementValue}>
            {item.achievement.done}/{item.achievement.total} Visits
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent * 100}%` }]} />
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnFilled]}
          activeOpacity={0.8}
          onPress={onStartVisit}
        >
          <PlayIcon width={16} height={16} />
          <Text style={styles.actionBtnFilledText}>Start Visit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnFilled]}
          activeOpacity={0.8}
          onPress={onCreateOrder}
        >
          <CartIcon width={16} height={16} />
          <Text style={styles.actionBtnFilledText}>Create Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtnCircle}
          activeOpacity={0.8}
          onPress={onViewDetail}
        >
          <EyeIcon width={20} height={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ─── Pharmacy Card (outside render) ─────────────────────────── */
const PharmacyCard = ({
  item,
  onStartVisit,
  onCreateOrder,
  onViewDetail,
}: {
  item: Pharmacy;
  onStartVisit: () => void;
  onCreateOrder: () => void;
  onViewDetail: () => void;
}) => {
  const progressPercent = Math.min(item.salesCurrent / item.salesTarget, 1);
  const salesStr = item.salesCurrent >= 1000
    ? `$${(item.salesCurrent / 1000).toFixed(1).replace('.0', '')}k`
    : `$${item.salesCurrent}`;
  const targetStr = item.salesTarget >= 1000
    ? `$${item.salesTarget / 1000}k`
    : `$${item.salesTarget}`;

  return (
    <View style={styles.card}>
      {/* Top info row */}
      <View style={styles.pharmTopRow}>
        <View style={[styles.pharmIconCircle, { backgroundColor: item.iconBg }]}>
          <StoreIcon width={24} height={24} />
        </View>
        <View style={styles.pharmInfo}>
          <Text style={styles.pharmName}>{item.name}</Text>
          <View style={styles.pharmLocationRow}>
            <MapPinOutlineIcon width={13} height={13} />
            <Text style={styles.pharmLocation}> {item.location}</Text>
          </View>
        </View>
        <Text style={styles.pharmLastVisit}>
          {item.neverVisited ? 'Never Visited' : `Last visit: ${item.lastVisit}`}
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.pharmDivider} />

      {/* Sales target row */}
      <View style={styles.pharmSalesRow}>
        <View>
          <Text style={styles.salesTargetLabel}>SALES TARGET</Text>
          <Text style={styles.salesTargetValue}>
            {salesStr}
            <Text style={styles.salesTargetMax}>  / {targetStr}</Text>
          </Text>
        </View>
        <View style={styles.pharmPaymentBlock}>
          <Text style={styles.pharmAmount}>{item.amount}</Text>
          <Text style={[
            styles.pharmPaymentStatus,
            item.paymentStatus === 'completed' && styles.completedText,
            item.paymentStatus === 'overdue' && styles.overdueText,
          ]}>
            {item.paymentStatus === 'completed' ? 'Payment Completed'
              : item.paymentStatus === 'overdue' ? 'Payment Overdue'
              : 'Payment Pending'}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, styles.pharmProgressTrack]}>
        <View style={[styles.progressFill, { width: `${progressPercent * 100}%` }]} />
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnFilled]}
          activeOpacity={0.8}
          onPress={onStartVisit}
        >
          <PlayIcon width={16} height={16} />
          <Text style={styles.actionBtnFilledText}>Start Visit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnFilled]}
          activeOpacity={0.8}
          onPress={onCreateOrder}
        >
          <CartIcon width={16} height={16} />
          <Text style={styles.actionBtnFilledText}>Create Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtnCircle}
          activeOpacity={0.8}
          onPress={onViewDetail}
        >
          <EyeIcon width={20} height={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ─── Screen ──────────────────────────────────────────────────── */
const PortfolioScreen = () => {
  const navigation = useNavigation<NavProp>();
  const [activeTab, setActiveTab] = useState<Tab>('Doctors');
  const [searchText, setSearchText] = useState('');

  const filteredDoctors = DOCTORS.filter(d =>
    d.name.toLowerCase().includes(searchText.toLowerCase()) ||
    d.specialty.toLowerCase().includes(searchText.toLowerCase()) ||
    d.hospital.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredPharmacies = PHARMACIES.filter(p =>
    p.name.toLowerCase().includes(searchText.toLowerCase()) ||
    p.location.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderDoctor = ({ item }: { item: Doctor }) => (
    <DoctorCard
      item={item}
      onStartVisit={() => navigation.navigate('RouteMapScreen', {
        routeData: {
          origin: { lat: 22.7196, lng: 75.8577 },
          stops: [
            { id: 1, name: item.name, lat: 22.7250, lng: 75.8650, status: 'target', distanceStr: '1.2 km', timeStr: '5 min', address: `${item.specialty} • ${item.hospital}`, phone: '+91 98765 43210' },
          ],
        },
      })}
      onCreateOrder={() => navigation.navigate('CreateOrder')}
      onViewDetail={() => navigation.navigate('VisitDetail', { visitId: item.id })}
    />
  );

  const renderPharmacy = ({ item }: { item: Pharmacy }) => (
    <PharmacyCard
      item={item}
      onStartVisit={() => navigation.navigate('RouteMapScreen', {
        routeData: {
          origin: { lat: 22.7196, lng: 75.8577 },
          stops: [
            { id: 1, name: item.name, lat: 22.7260, lng: 75.8660, status: 'target', distanceStr: '0.8 km', timeStr: '3 min', address: item.location, phone: '+91 98765 43210' },
          ],
        },
      })}
      onCreateOrder={() => navigation.navigate('PharmacyOrder', { pharmacyId: item.id, pharmacyName: item.name })}
      onViewDetail={() => navigation.navigate('PharmacyDetail', { pharmacyId: item.id, pharmacyName: item.name })}
    />
  );

  return (
    <View style={styles.safeArea}>
      <Header title="My Portfolio" showBack showNotification showProfile />

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'Doctors' ? 'Search doctors or clinics' : 'Search by name or area'}
            placeholderTextColor={COLORS.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Doctors / Pharmacies toggle */}
      <View style={styles.toggleContainer}>
        {(['Doctors', 'Pharmacies'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.toggleBtn, activeTab === tab && styles.toggleBtnActive]}
            onPress={() => { setActiveTab(tab); setSearchText(''); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, activeTab === tab && styles.toggleTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter row */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterChipOutline}>
          <Text style={styles.filterChipOutlineText}>All Units</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChipFilled}>
          <Text style={styles.filterChipFilledText}>Filter</Text>
          {/* <Text style={styles.chevron}> ›</Text> */}
          <Down style={styles.chevron} stroke={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChipFilled}>
          <Text style={styles.filterChipFilledText}>Sort By</Text>
          {/* <Text style={styles.chevron}> ›</Text> */}
          <Down style={styles.chevron} stroke={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* List */}
      {activeTab === 'Doctors' ? (
        <FlatList
          data={filteredDoctors}
          keyExtractor={item => item.id}
          renderItem={renderDoctor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredPharmacies}
          keyExtractor={item => item.id}
          renderItem={renderPharmacy}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },


  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textDark,
    padding: 0,
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#EEEEEE',
    borderRadius: 28,
    padding: 4,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.buttonBlue,
  },
  toggleText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.semibold,
    color: COLORS.textSecondary,
  },
  toggleTextActive: {
    color: COLORS.white,
  },

  // Filter row
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filterChipOutline: {
    borderWidth: 1.5,
    borderColor: COLORS.buttonBlue,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipOutlineText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.semibold,
    color: COLORS.buttonBlue,
  },
  filterChipFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.buttonBlue,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipFilledText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.semibold,
    color: COLORS.white,
  },
  chevron: {
    color: COLORS.white,
    fontSize: 16,
    marginLeft: 6,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 14,
  },

  // Shared card wrapper
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
  },

  // Doctor Card
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitleBlock: { flex: 1, marginRight: 8 },
  doctorName: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 4,
  },
  doctorSub: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.buttonBlue,
    lineHeight: 20,
  },
  dotSeparator: { color: COLORS.buttonBlue },
  cardTopRight: { alignItems: 'flex-end', gap: 4 },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    letterSpacing: 0.3,
  },
  priorityText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  followUpPill: {
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  followUpText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: '#555555',
    letterSpacing: 0.3,
  },
  addTagButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addTagText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.semibold,
    color: COLORS.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  infoLeft: { flex: 1, gap: 4 },
  infoLine: { flexDirection: 'row', alignItems: 'center' },
  infoText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  infoRight: { alignItems: 'flex-end' },
  amountText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },
  paymentStatusText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  overdueText: { color: COLORS.error },
  completedText: { color: COLORS.success },
  achievementSection: {
    backgroundColor: '#F8F9FB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  achievementLabel: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.4,
  },
  achievementValue: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
  },

  // Shared progress bar
  progressTrack: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: COLORS.buttonBlue,
    borderRadius: 3,
  },

  // Shared action buttons
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    gap: 6,
  },
  actionBtnFilled: {
    backgroundColor: COLORS.buttonBlue,
    flex: 1,
    justifyContent: 'center',
  },
  actionBtnFilledText: {
    color: COLORS.white,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.semibold,
  },
  actionBtnCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: COLORS.buttonBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Pharmacy Card
  pharmTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  pharmIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pharmInfo: { flex: 1 },
  pharmName: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 4,
  },
  pharmLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pharmLocation: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  pharmLastVisit: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    textAlign: 'right',
    flexShrink: 0,
  },
  pharmDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  pharmSalesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  salesTargetLabel: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  salesTargetValue: {
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },
  salesTargetMax: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  pharmPaymentBlock: { alignItems: 'flex-end' },
  pharmAmount: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 2,
  },
  pharmPaymentStatus: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
  },
  pharmProgressTrack: { marginBottom: 0 },
});

export default PortfolioScreen;
