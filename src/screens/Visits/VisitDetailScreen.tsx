/* eslint-disable react/no-unstable-nested-components */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import {
  BackArrowIconBlack,
  NotificationIcon,
  ProfileIcon,
  PhoneIconOutline,
  WhatsAppIcon,
  LocationPinIcon,
  InfoIcon,
  MicIcon,
  CameraUploadIcon,
  RxIcon,
  LinkChainIcon,
  StoreIcon,
  PillIcon,
  Up,
  Down,
} from '@/assets/images';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { AppStackParamList } from '@/navigation/types';

const OBJECTION_CHIPS = ['Too Expensive', 'Already Prescribes Brand X', 'Needs Study'];

const INTERACTION_DATES = [
  'Oct 12, 2023',
  'Sep 28, 2023',
  'Aug 10, 2023',
  'July 12, 2023',
  'Jun 20, 2023',
];

const VisitDetailScreen = () => {
  const route = useRoute<RouteProp<AppStackParamList, 'VisitDetail'>>();
  const navigation = useNavigation();

  const [sampleExpanded, setSampleExpanded] = useState(true);
  const [prefExpanded, setPrefExpanded] = useState(false);
  const [unprefExpanded, setUnprefExpanded] = useState(false);
  const [orderExpanded, setOrderExpanded] = useState(true);
  const [selectedObjections, setSelectedObjections] = useState<string[]>(['Already Prescribes Brand X']);
  const [visitNote, setVisitNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('11/25/2025');
  const [timeSlot, setTimeSlot] = useState('Afternoon Slot');

  const toggleObjection = (chip: string) => {
    setSelectedObjections(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    );
  };

  const SectionLabel = ({ title, right }: { title: string; right?: React.ReactNode }) => (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {right}
    </View>
  );

  const CollapsibleSection = ({
    title,
    expanded,
    onToggle,
    children,
  }: {
    title: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => (
    <View style={styles.collapsibleCard}>
      <TouchableOpacity
        style={[styles.collapsibleHeader, expanded && styles.collapsibleHeaderExpanded]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <Text style={styles.collapsibleTitle}>{title}</Text>
        {expanded ? <Up width={16} height={16} /> : <Down width={16} height={16} />}
      </TouchableOpacity>
      {expanded && <View style={styles.collapsibleContent}>{children}</View>}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <BackArrowIconBlack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Details</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}><NotificationIcon /></TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}><ProfileIcon /></TouchableOpacity>
        </View>
      </View>
      <View style={styles.headerDivider} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Doctor Profile Card */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorAvatarWrapper}>
            <View style={styles.doctorAvatar}>
              <Text style={styles.doctorAvatarText}>AS</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>Dr. Anil Sharma</Text>
            <Text style={styles.doctorSpecialty}>Cardiologist</Text>
            <View style={styles.doctorLocationRow}>
              <LocationPinIcon width={13} height={13} />
              <Text style={styles.doctorHospital}>  St. Mary's General Hospital</Text>
            </View>
          </View>
          <View style={styles.doctorActions}>
            <TouchableOpacity style={styles.contactBtn} onPress={() => Alert.alert('Call', 'Calling doctor...')}>
              <PhoneIconOutline width={18} height={18} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactBtn} onPress={() => Alert.alert('WhatsApp', 'Opening WhatsApp...')}>
              <WhatsAppIcon width={18} height={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>LAST VISIT</Text>
            <Text style={styles.statValue}>14 Days ago</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>AVG TIME</Text>
            <Text style={styles.statValue}>8.5 Mins</Text>
          </View>
        </View>

        {/* Sample Products */}
        <CollapsibleSection
          title="Sample Products"
          expanded={sampleExpanded}
          onToggle={() => setSampleExpanded(p => !p)}
        >
          {['Antihypertensive', 'Statin Combo', 'Anti-arrhythmic'].map((product, i) => (
            <View key={i} style={[styles.productRow, i < 2 && styles.productRowBorder]}>
              <View>
                <Text style={styles.productTime}>08:00 AM</Text>
                <Text style={styles.productName}>{product}</Text>
              </View>
              <TouchableOpacity>
                <InfoIcon width={20} height={20} />
              </TouchableOpacity>
            </View>
          ))}
        </CollapsibleSection>

        {/* Pharmacy Network */}
        <SectionLabel
          title="PHARMACY NETWORK"
          right={
            <View style={styles.activeNodesBadge}>
              <Text style={styles.activeNodesText}>3 ACTIVE NODES</Text>
            </View>
          }
        />
        <View style={styles.pharmacyCard}>
          <View style={styles.pharmacyRow}>
            <View style={styles.pharmacyIconBox}>
              <RxIcon width={22} height={22} />
            </View>
            <View style={styles.pharmacyTextBlock}>
              <Text style={styles.pharmacyName}>City Central Pharma</Text>
              <Text style={styles.pharmacyType}>PRIMARY PHARMACY</Text>
            </View>
            <View style={styles.primaryBadge}>
              <Text style={styles.primaryBadgeText}>PRIMARY</Text>
            </View>
          </View>
        </View>
        <View style={[styles.pharmacyCard, { marginTop: 10 }]}>
          <View style={styles.pharmacyRow}>
            <View style={styles.pharmacyIconBox}>
              <LinkChainIcon width={22} height={22} />
            </View>
            <View style={styles.pharmacyTextBlock}>
              <Text style={styles.pharmacyName}>Wellness Meds</Text>
              <Text style={styles.pharmacyType}>LINKED PHARMACY</Text>
            </View>
            <Text style={styles.linkedText}>LINKED</Text>
          </View>
        </View>

        {/* Nearby / Associated */}
        <SectionLabel title="NEARBY / ASSOCIATED" />
        <View style={styles.nearbyGrid}>
          {[
            { name: 'Hospital Gate Pharmacy', dist: '0.2 km away' },
            { name: 'LifeCare Drugs', dist: '1.5 km away' },
          ].map((place, i) => (
            <View key={i} style={styles.nearbyCard}>
              <View style={styles.nearbyIconBox}>
                <StoreIcon width={20} height={20} />
              </View>
              <Text style={styles.nearbyName}>{place.name}</Text>
              <Text style={styles.nearbyDist}>{place.dist}</Text>
            </View>
          ))}
        </View>

        {/* Visit Notes */}
        <SectionLabel title="VISIT NOTES" />
        <View style={styles.notesInputWrapper}>
          <TextInput
            style={styles.notesInput}
            placeholder="Enter discussion points, objections, and next steps..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            value={visitNote}
            onChangeText={setVisitNote}
            textAlignVertical="top"
          />
          <TouchableOpacity style={styles.micButton}>
            <MicIcon width={20} height={20} />
          </TouchableOpacity>
        </View>

        {/* Objection Handling */}
        <SectionLabel title="OBJECTION HANDLING" />
        <View style={styles.chipsRow}>
          {OBJECTION_CHIPS.map(chip => {
            const active = selectedObjections.includes(chip);
            return (
              <TouchableOpacity
                key={chip}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleObjection(chip)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Documentation */}
        <SectionLabel title="DOCUMENTATION" />
        <TouchableOpacity style={styles.uploadCard} activeOpacity={0.8}>
          <CameraUploadIcon width={32} height={32} />
          <Text style={styles.uploadTitle}>Upload Prescription Photo</Text>
          <Text style={styles.uploadSubtitle}>JPEG or PNG, Max 5MB</Text>
        </TouchableOpacity>

        {/* Preferred / Unpreferred Products */}
        <CollapsibleSection
          title="Preferred Products"
          expanded={prefExpanded}
          onToggle={() => setPrefExpanded(p => !p)}
        >
          <View style={styles.productRow}>
            <View style={styles.productIconRow}>
              <PillIcon width={16} height={16} />
              <Text style={styles.productName}>  Monoskin Cream 30g</Text>
            </View>
          </View>
        </CollapsibleSection>

        <CollapsibleSection
          title="Unpreferred Products"
          expanded={unprefExpanded}
          onToggle={() => setUnprefExpanded(p => !p)}
        >
          <View style={styles.productRow}>
            <View style={styles.productIconRow}>
              <PillIcon width={16} height={16} />
              <Text style={styles.productName}>  Generic Substitute X</Text>
            </View>
          </View>
        </CollapsibleSection>

        {/* Interaction History */}
        <SectionLabel title="INTERACTION HISTORY" />
        <View style={styles.timelineContainer}>
          {INTERACTION_DATES.map((date, i) => (
            <View key={i} style={styles.timelineRow}>
              <View style={styles.timelineDotWrapper}>
                <View style={styles.timelineDot} />
                {i < INTERACTION_DATES.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <Text style={styles.timelineDate}>{date}</Text>
            </View>
          ))}
        </View>

        {/* Follow-up Plan */}
        <View style={styles.followUpCard}>
          <Text style={styles.followUpTitle}>Follow-up Plan</Text>
          <View style={styles.followUpRow}>
            <View style={styles.followUpDateBox}>
              <TextInput
                style={styles.followUpDateInput}
                value={followUpDate}
                onChangeText={setFollowUpDate}
              />
            </View>
            <TouchableOpacity style={styles.followUpSlotBox}>
              <Text style={styles.followUpSlotText}>{timeSlot}</Text>
              <Text style={styles.followUpChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order History */}
        <CollapsibleSection
          title="Order History"
          expanded={orderExpanded}
          onToggle={() => setOrderExpanded(p => !p)}
        >
          <View style={styles.orderCard}>
            {[
              { label: 'Product Name:',  value: 'ACNE-TECH' },
              { label: 'Quantity:',      value: '50 units' },
              { label: 'Last Date:',     value: 'January 10, 2026' },
              { label: 'Product Price:', value: '₹1400.00' },
            ].map(({ label, value }, i) => (
              <View key={i} style={styles.orderRow}>
                <Text style={styles.orderLabel}>{label}</Text>
                <Text style={styles.orderValue}>{value}</Text>
              </View>
            ))}
          </View>
        </CollapsibleSection>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Submit Report */}
      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={styles.submitButton}
          activeOpacity={0.85}
          onPress={() => Alert.alert('Report Submitted', 'Your visit report has been submitted successfully.')}
        >
          <Text style={styles.submitButtonText}>Submit Report</Text>
        </TouchableOpacity>
      </View>
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

  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  // Doctor Card
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  doctorAvatarWrapper: { position: 'relative', marginRight: 14 },
  doctorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(46,80,178,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorAvatarText: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },
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
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  doctorSpecialty: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.buttonBlue, marginBottom: 4 },
  doctorLocationRow: { flexDirection: 'row', alignItems: 'center' },
  doctorHospital: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },
  doctorActions: { gap: 8 },
  contactBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.buttonBlue,
    justifyContent: 'center', alignItems: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statLabel: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.textSecondary, letterSpacing: 0.4, marginBottom: 4 },
  statValue: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 10 },

  // Collapsible card (unified border wrapper)
  collapsibleCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  collapsibleHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  collapsibleContent: {
    // content lives inside the card, no extra border needed
  },
  collapsibleTitle: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textSecondary },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  productRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  productIconRow: { flexDirection: 'row', alignItems: 'center' },
  productTime: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  productName: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },

  // Section label
  sectionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 6 },
  sectionLabel: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.textDark, letterSpacing: 0.5 },
  activeNodesBadge: { backgroundColor: 'rgba(46,80,178,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  activeNodesText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },

  // Pharmacy
  pharmacyCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 4,
  },
  pharmacyRow: { flexDirection: 'row', alignItems: 'center' },
  pharmacyIconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(46,80,178,0.08)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  pharmacyTextBlock: { flex: 1 },
  pharmacyName: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  pharmacyType: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.textSecondary, letterSpacing: 0.4 },
  primaryBadge: { backgroundColor: COLORS.buttonBlue, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  primaryBadgeText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.white },
  linkedText: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.success },

  // Nearby grid
  nearbyGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  nearbyCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
  },
  nearbyIconBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(46,80,178,0.08)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  nearbyName: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 4 },
  nearbyDist: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },

  // Visit Notes
  notesInputWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    minHeight: 60,
  },
  notesInput: {
    flex: 1,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textDark,
    padding: 0,
    maxHeight: 100,
  },
  micButton: { padding: 4, marginLeft: 8 },

  // Objection chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: COLORS.buttonBlue, borderColor: COLORS.buttonBlue },
  chipText: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: COLORS.textDark },
  chipTextActive: { color: COLORS.white },

  // Upload
  uploadCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: '#F8F9FB',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  uploadTitle: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginTop: 10, marginBottom: 4 },
  uploadSubtitle: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },

  // Timeline
  timelineContainer: { marginBottom: 16 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  timelineDotWrapper: { alignItems: 'center', width: 20, marginRight: 10 },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.buttonBlue, marginTop: 4,
  },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.buttonBlue, minHeight: 24, opacity: 0.3, marginTop: 2 },
  timelineDate: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textDark, paddingVertical: 0, lineHeight: 20, paddingBottom: 14 },

  // Follow-up Plan
  followUpCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  followUpTitle: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 12 },
  followUpRow: { flexDirection: 'row', gap: 10 },
  followUpDateBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  followUpDateInput: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textDark, padding: 0 },
  followUpSlotBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  followUpSlotText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textDark },
  followUpChevron: { fontSize: 18, color: COLORS.textMuted, transform: [{ rotate: '90deg' }] },

  // Order History
  orderHistoryCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
    gap: 10,
  },
  orderCard: {
    margin: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  orderLabel: { fontSize: FONTS.size.md, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },
  orderValue: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark },

  bottomSpacer: { height: 16 },

  // Submit
  submitContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  submitButton: {
    backgroundColor: COLORS.buttonBlue,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.semibold, color: COLORS.white },
});

export default VisitDetailScreen;
