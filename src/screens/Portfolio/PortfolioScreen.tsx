import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store';
import { fetchDoctors, fetchPharmacies, Doctor, Pharmacy } from '@/redux/slices/portfolioSlice';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import TagModal from '@/components/common/TagModal';
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
import { TargetVisitState, useStartVisit } from '@/hooks/useStartVisit';

type NavProp = NativeStackNavigationProp<AppStackParamList>;
type Category = 'A' | 'B' | 'C';
type Tab = 'Doctors' | 'Pharmacies';

type FilterState = {
  category: string[];
  lastVisited: string[];
  tags: string[];
};

const EMPTY_FILTERS: FilterState = { category: [], lastVisited: [], tags: [] };

const FILTER_FIELDS: Array<{ key: keyof FilterState; label: string; options: string[] }> = [
  { key: 'category', label: 'Category', options: ['A', 'B', 'C'] },
  {
    key: 'lastVisited',
    label: 'Last Visited',
    options: ['Today', 'This Week', 'This Month', 'Over a Month', 'Never'],
  },
  {
    key: 'tags',
    label: 'Tags',
    options: [
      'New',
      'Contacted',
      'In Discussion',
      'Converted',
      'Lost',
      'Needs Samples',
      'Follow Up Today',
      'Unavailable',
      'Reschedule',
      'Not Interested',
      'No Response',
    ],
  },
];

/* ─── Helper: parse days from lastVisit string ───────────────── */
const parseDaysAgo = (lastVisit: string): number | null => {
  if (!lastVisit || lastVisit === 'Never Visited') return null;
  if (lastVisit === 'Today') return 0;
  const m = lastVisit.match(/^(\d+)\s+day/);
  if (m) return parseInt(m[1], 10);
  return null;
};

const matchesLastVisited = (lastVisit: string, lastVisitDate: string | null | undefined, filters: string[]): boolean => {
  if (filters.length === 0) return true;
  const days = parseDaysAgo(lastVisit);
  const isNever = days === null && (!lastVisitDate);
  return filters.some(f => {
    if (f === 'Never') return isNever;
    if (f === 'Today') return days === 0;
    if (f === 'This Week') return days !== null && days >= 1 && days <= 7;
    if (f === 'This Month') return days !== null && days > 7 && days <= 30;
    if (f === 'Over a Month') return days !== null && days > 30;
    return false;
  });
};

/* ─── Filter Modal ────────────────────────────────────────────── */
const FilterModal = ({
  visible,
  onClose,
  onApply,
  initialFilters,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
}) => {
  const [pending, setPending] = useState<FilterState>(initialFilters);

  useEffect(() => {
    if (visible) setPending(initialFilters);
  }, [visible, initialFilters]);

  const toggle = (key: keyof FilterState, value: string) => {
    setPending(prev => {
      const curr = prev[key];
      return {
        ...prev,
        [key]: curr.includes(value) ? curr.filter(v => v !== value) : [...curr, value],
      };
    });
  };

  const totalSelected = pending.category.length + pending.lastVisited.length + pending.tags.length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={filterModalStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={filterModalStyles.sheet}>
        <View style={filterModalStyles.handle} />
        <View style={filterModalStyles.header}>
          <Text style={filterModalStyles.title}>Filter</Text>
          <TouchableOpacity onPress={() => setPending(EMPTY_FILTERS)}>
            <Text style={filterModalStyles.resetText}>Reset All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {FILTER_FIELDS.map(field => (
            <View key={field.key} style={filterModalStyles.section}>
              <Text style={filterModalStyles.sectionLabel}>{field.label}</Text>
              <View style={filterModalStyles.chipRow}>
                {field.options.map(opt => {
                  const selected = pending[field.key].includes(opt);
                  const label = field.key === 'category' ? `Category ${opt}` : opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[filterModalStyles.chip, selected && filterModalStyles.chipSelected]}
                      onPress={() => toggle(field.key, opt)}
                      activeOpacity={0.7}
                    >
                      <Text style={[filterModalStyles.chipText, selected && filterModalStyles.chipTextSelected]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={filterModalStyles.applyBtn}
          onPress={() => { onApply(pending); onClose(); }}
          activeOpacity={0.85}
        >
          <Text style={filterModalStyles.applyBtnText}>
            Apply Filters{totalSelected > 0 ? ` (${totalSelected})` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const CATEGORY_CONFIG: Record<Category, { label: string; bg: string; color: string }> = {
  A: { label: 'CATEGORY A', bg: '#FFF3E0', color: '#E65100' },
  B: { label: 'CATEGORY B', bg: '#F0F0F0', color: '#555555' },
  C: { label: 'CATEGORY C', bg: '#E8F5E9', color: '#2E7D32' },
};

/* ─── Doctor Card (outside render) ───────────────────────────── */
const DoctorCard = ({
  item,
  onStartVisit,
  onCreateOrder,
  onViewDetail,
  onTagPress,
  visitState = 'idle',
}: {
  item: Doctor;
  onStartVisit: () => void;
  onCreateOrder: () => void;
  onViewDetail: () => void;
  onTagPress: () => void;
  visitState?: TargetVisitState;
}) => {
  const catConfig = CATEGORY_CONFIG[item.category];
  const progressPercent = item.achievement.total > 0 ? item.achievement.done / item.achievement.total : 0;
  const hasTags = item.tags && item.tags.length > 0;
  console.log('🚀 ~ DoctorCard ~ item.tags:', item)

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
        <View style={styles.tagLeft}>
          {/* {item.followUpToday && (
            <View style={styles.followUpPill}>
              <Text style={styles.followUpText}>FOLLOW UP TODAY</Text>
            </View>
          )} */}
          {hasTags && item.tags.map(tag => (
            <TouchableOpacity
              key={tag}
              style={styles.tagPill}
              onPress={onTagPress}
              activeOpacity={0.7}
            >
              <Text style={styles.tagPillText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.addTagButton} onPress={onTagPress} activeOpacity={0.7}>
          <Text style={styles.addTagText}>+ TAG</Text>
        </TouchableOpacity>
      </View>

      {/* Visit + Payment row */}
      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          <View style={styles.infoLine}>
            <CheckCircleIcon width={14} height={14} />
            <Text style={styles.infoText}>  Total Visits: {item.visitCount}</Text>
          </View>
          <View style={styles.infoLine}>
            <ClockIcon width={14} height={14} />
            <Text style={styles.infoText}>  Last Visit: </Text>
            <Text style={[styles.infoText, item.lastVisitOverdue && styles.overdueText]}>
              {item.lastVisit}
            </Text>
          </View>
        </View>
        {/* <View style={styles.infoRight}>
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
        </View> */}
      </View>

      {/* Monthly Achievement */}
      {/* <View style={styles.achievementSection}>
        <View style={styles.achievementHeader}>
          <Text style={styles.achievementLabel}>MONTHLY ACHIEVEMENT</Text>
          <Text style={styles.achievementValue}>
            {item.achievement.done}/{item.achievement.total} Visits
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent * 100}%` }]} />
        </View>
      </View> */}

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.actionBtnFilled,
            visitState === 'active-elsewhere' && styles.actionBtnDimmed,
          ]}
          activeOpacity={0.8}
          onPress={onStartVisit}
        >
          <PlayIcon width={16} height={16} />
          <Text style={styles.actionBtnFilledText}>
            {visitState === 'active-here' ? 'Resume Visit' : 'Start Visit'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnFilled]}
          activeOpacity={0.8}
          onPress={onCreateOrder}
        >
          <CartIcon width={16} height={16} />
          <Text style={styles.actionBtnFilledText}>Create Order</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity
          style={styles.actionBtnCircle}
          activeOpacity={0.8}
          onPress={onViewDetail}
        >
          <EyeIcon width={20} height={20} />
        </TouchableOpacity> */}
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
  onTagPress,
  visitState = 'idle',
}: {
  item: Pharmacy;
  onStartVisit: () => void;
  onCreateOrder: () => void;
  onViewDetail: () => void;
  onTagPress: () => void;
  visitState?: TargetVisitState;
}) => {
  const progressPercent = Math.min(item.salesCurrent / item.salesTarget, 1);
  const hasTags = item.tags && item.tags.length > 0;
  const salesStr = item.salesCurrent >= 1000
    ? `₹${(item.salesCurrent / 1000).toFixed(1).replace('.0', '')}k`
    : `₹${item.salesCurrent}`;
  const targetStr = item.salesTarget >= 1000
    ? `₹${item.salesTarget / 1000}k`
    : `₹${item.salesTarget}`;

  return (
    <View style={styles.card}>
      {/* Top info row */}
      <View style={styles.pharmTopRow}>
        {/* <View style={[styles.pharmIconCircle, { backgroundColor: item.iconBg }]}>
          <StoreIcon width={24} height={24} />
        </View> */}
        <View style={styles.pharmInfo}>
          <Text style={styles.pharmName}>{item.name}</Text>
          <View style={styles.pharmLocationRow}>
            <MapPinOutlineIcon width={13} height={13} style={{ marginTop: 3 }} />
            <Text style={styles.pharmLocation}>{item.location}</Text>
          </View>
        </View>
      </View>

      {/* Follow-up + Tag row */}
      <View style={styles.tagRow}>
        <View style={styles.tagLeft}>
          {hasTags && item.tags.map(tag => (
            <TouchableOpacity
              key={tag}
              style={styles.tagPill}
              onPress={onTagPress}
              activeOpacity={0.7}
            >
              <Text style={styles.tagPillText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.addTagButton} onPress={onTagPress} activeOpacity={0.7}>
          <Text style={styles.addTagText}>+ TAG</Text>
        </TouchableOpacity>
      </View>

      {/* Visit + Last Visit row */}
      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          <View style={styles.infoLine}>
            <CheckCircleIcon width={14} height={14} />
            <Text style={styles.infoText}>  Total Visits: {item.visitCount}</Text>
          </View>
          <View style={styles.infoLine}>
            <ClockIcon width={14} height={14} />
            <Text style={styles.infoText}>  Last Visit: </Text>
            <Text style={styles.infoText}>
              {item.lastVisitDate === null ? 'Never Visited' : item.lastVisit}
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      {/* <View style={styles.pharmDivider} /> */}

      {/* Sales target row */}
      {/* <View style={styles.pharmSalesRow}>
        <View>
          <Text style={styles.salesTargetLabel}>ENGAGEMENT SCORE</Text>
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
      </View> */}

      {/* Progress bar */}
      {/* <View style={[styles.progressTrack, styles.pharmProgressTrack]}>
        <View style={[styles.progressFill, { width: `${progressPercent * 100}%` }]} />
      </View> */}

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.actionBtnFilled,
            visitState === 'active-elsewhere' && styles.actionBtnDimmed,
          ]}
          activeOpacity={0.8}
          onPress={onStartVisit}
        >
          <PlayIcon width={16} height={16} />
          <Text style={styles.actionBtnFilledText}>
            {visitState === 'active-here' ? 'Resume Visit' : 'Start Visit'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnFilled]}
          activeOpacity={0.8}
          onPress={onCreateOrder}
        >
          <CartIcon width={16} height={16} />
          <Text style={styles.actionBtnFilledText}>Create Order</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity
          style={styles.actionBtnCircle}
          activeOpacity={0.8}
          onPress={onViewDetail}
        >
          <EyeIcon width={20} height={20} />
        </TouchableOpacity> */}
      </View>
    </View>
  );
};

/* ─── Empty List Component ────────────────────────────────────── */
const EmptyList = ({ tab }: { tab: Tab }) => (
  <View style={emptyStyles.container}>
    <Text style={emptyStyles.title}>
      {tab === 'Doctors' ? 'No Doctors Found' : 'No Pharmacies Found'}
    </Text>
    <Text style={emptyStyles.subtitle}>
      {tab === 'Doctors'
        ? 'Try adjusting your search or pull down to refresh'
        : 'Try adjusting your search or pull down to refresh'}
    </Text>
  </View>
);

/* ─── Screen ──────────────────────────────────────────────────── */
const PortfolioScreen = () => {
  const navigation = useNavigation<NavProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { start: startVisit, getTargetState } = useStartVisit();

  const [activeTab, setActiveTab] = useState<Tab>('Doctors');
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [tagModalDoctor, setTagModalDoctor] = useState<Doctor | null>(null);
  const [tagModalPharmacy, setTagModalPharmacy] = useState<Pharmacy | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);

  const hasActiveFilters =
    appliedFilters.category.length > 0 ||
    appliedFilters.lastVisited.length > 0 ||
    appliedFilters.tags.length > 0;

  const totalApplied =
    appliedFilters.category.length + appliedFilters.lastVisited.length + appliedFilters.tags.length;

  const { doctors, doctorsLoading, pharmacies, pharmaciesLoading } = useSelector(
    (state: RootState) => state.portfolio,
  );

  useEffect(() => {
    dispatch(fetchDoctors());
  }, [dispatch]);

  useEffect(() => {
    if (activeTab === 'Pharmacies' && pharmacies.length === 0) {
      dispatch(fetchPharmacies());
    }
  }, [activeTab, dispatch, pharmacies.length]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'Doctors') {
      await dispatch(fetchDoctors());
    } else {
      await dispatch(fetchPharmacies());
    }
    setRefreshing(false);
  }, [activeTab, dispatch]);

  const query = searchText.toLowerCase();

  const filteredDoctors = doctors.filter(d => {
    const matchesSearch = [d?.name, d?.specialty, d?.hospital, d?.address, d?.city, d?.state]
      .some(field => field?.toLowerCase().includes(query));
    if (!matchesSearch) return false;
    if (appliedFilters.category.length > 0 && !appliedFilters.category.includes(d.category)) return false;
    if (!matchesLastVisited(d.lastVisit, undefined, appliedFilters.lastVisited)) return false;
    if (appliedFilters.tags.length > 0 && !appliedFilters.tags.some(t => d.tags?.includes(t))) return false;
    return true;
  });

  const filteredPharmacies = pharmacies.filter(p => {
    const matchesSearch = [p?.name, p?.location]
      .some(field => field?.toLowerCase().includes(query));
    if (!matchesSearch) return false;
    if (!matchesLastVisited(p.lastVisit, p.lastVisitDate, appliedFilters.lastVisited)) return false;
    if (appliedFilters.tags.length > 0 && !appliedFilters.tags.some(t => p.tags?.includes(t))) return false;
    return true;
  });

  const renderDoctor = ({ item }: { item: Doctor }) => (
    <DoctorCard
      item={item}
      visitState={getTargetState('DOCTOR', item.id)}
      onStartVisit={() =>
        startVisit({
          visitType: 'DOCTOR',
          targetId: item.id,
          name: item.name,
          subtitle: item.specialty ?? item.hospital,
          category: 'Doctors',
        })
      }
      onCreateOrder={() => navigation.navigate('CreateOrder', { doctorId: item.id })}
      onViewDetail={() => navigation.navigate('VisitDetail', { visitId: item.id, doctorId: item.id })}
      onTagPress={() => setTagModalDoctor(item)}
    />
  );

  const renderPharmacy = ({ item }: { item: Pharmacy }) => (
    <PharmacyCard
      item={item}
      visitState={getTargetState('PHARMACY', item.id)}
      onStartVisit={() =>
        startVisit({
          visitType: 'PHARMACY',
          targetId: item.id,
          name: item.name,
          subtitle: item.location,
          category: 'Pharmacies',
        })
      }
      onCreateOrder={() => navigation.navigate('PharmacyOrder', { pharmacyId: item.id, pharmacyName: item.name })}
      onViewDetail={() => navigation.navigate('PharmacyDetail', { pharmacyId: item.id, pharmacyName: item.name })}
      onTagPress={() => setTagModalPharmacy(item)}
    />
  );

  return (
    <View style={styles.safeArea}>
      <Header title="My Portfolio" showBack showNotification showProfile />

      {tagModalDoctor && (
        <TagModal
          visible={!!tagModalDoctor}
          type="doctor"
          id={tagModalDoctor.id}
          initialTags={tagModalDoctor.tags}
          onClose={() => setTagModalDoctor(null)}
        />
      )}

      {tagModalPharmacy && (
        <TagModal
          visible={!!tagModalPharmacy}
          type="pharmacy"
          id={tagModalPharmacy.id}
          initialTags={tagModalPharmacy.tags}
          onClose={() => setTagModalPharmacy(null)}
        />
      )}

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

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={setAppliedFilters}
        initialFilters={appliedFilters}
      />

      {/* Filter row */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChipOutline, !hasActiveFilters && styles.filterChipOutlineActive]}
          onPress={() => setAppliedFilters(EMPTY_FILTERS)}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterChipOutlineText, !hasActiveFilters && styles.filterChipOutlineTextActive]}>
            All Units
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChipFilled, hasActiveFilters && styles.filterChipFilledActive]}
          onPress={() => setFilterModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.filterChipFilledText}>
            {hasActiveFilters ? `Filter (${totalApplied})` : 'Filter'}
          </Text>
          <Down style={styles.chevron} stroke={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* List */}
      {activeTab === 'Doctors' ? (
        doctorsLoading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.buttonBlue} />
          </View>
        ) : (
          <FlatList
            data={filteredDoctors}
            keyExtractor={item => item.id}
            renderItem={renderDoctor}
            contentContainerStyle={[styles.listContent, filteredDoctors.length === 0 && styles.listContentEmpty]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<EmptyList tab="Doctors" />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.buttonBlue]}
                tintColor={COLORS.buttonBlue}
              />
            }
          />
        )
      ) : (
        pharmaciesLoading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.buttonBlue} />
          </View>
        ) : (
          <FlatList
            data={filteredPharmacies}
            keyExtractor={item => item.id}
            renderItem={renderPharmacy}
            contentContainerStyle={[styles.listContent, filteredPharmacies.length === 0 && styles.listContentEmpty]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<EmptyList tab="Pharmacies" />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.buttonBlue]}
                tintColor={COLORS.buttonBlue}
              />
            }
          />
        )
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
  filterChipOutlineActive: {
    backgroundColor: COLORS.buttonBlue,
    borderColor: COLORS.buttonBlue,
  },
  filterChipOutlineTextActive: {
    color: COLORS.white,
  },
  filterChipFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.buttonBlue,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipFilledActive: {
    backgroundColor: '#003DA5',
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
  listContentEmpty: {
    flexGrow: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  tagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
    gap: 6,
    marginRight: 8,
  },
  tagPill: {
    backgroundColor: '#E8F0FF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagPillText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.semibold,
    color: COLORS.buttonBlue,
    letterSpacing: 0.2,
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
  // Dimmed but still tappable: the tap explains why it's locked and offers a
  // route back to the running visit, which a dead disabled button cannot.
  actionBtnDimmed: {
    opacity: 0.45,
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
    alignItems: 'flex-start',
    marginTop: 4,
  },
  pharmLocation: {
    flex: 1,
    marginLeft: 4,
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

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  title: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

const filterModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },
  resetText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.semibold,
    color: COLORS.buttonBlue,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: COLORS.white,
  },
  chipSelected: {
    borderColor: COLORS.buttonBlue,
    backgroundColor: '#EAF0FF',
  },
  chipText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.semibold,
    color: COLORS.textSecondary,
  },
  chipTextSelected: {
    color: COLORS.buttonBlue,
  },
  applyBtn: {
    backgroundColor: COLORS.buttonBlue,
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  applyBtnText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
  },
});

export default PortfolioScreen;
