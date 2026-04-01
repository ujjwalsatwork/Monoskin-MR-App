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
  MapPinOutlineIcon,
  InfoIcon,
  CameraUploadIcon,
  LinkChainIcon,
  Up,
  Down,
  AddPeople,
} from '@/assets/images';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { AppStackParamList } from '@/navigation/types';

const SAMPLE_PRODUCTS = [
  { time: '08:00 AM', name: 'Antihypertensive' },
  { time: '08:00 AM', name: 'Statin Combo' },
  { time: '08:00 AM', name: 'Anti-arrhythmic' },
];

const TIME_SLOTS = ['Morning Slot', 'Afternoon Slot', 'Evening Slot'];

/* ─── CollapsibleSection ─────────────────────────────────────── */
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
      {expanded ? <Up width={18} height={18} /> : <Down width={18} height={18} />}
    </TouchableOpacity>
    {expanded && <View>{children}</View>}
  </View>
);

/* ─── Screen ─────────────────────────────────────────────────── */
const PharmacyDetailScreen = () => {
  const route = useRoute<RouteProp<AppStackParamList, 'PharmacyDetail'>>();
  const navigation = useNavigation();

  const [sampleExpanded, setSampleExpanded] = useState(true);
  const [orderExpanded, setOrderExpanded] = useState(true);
  const [visitNote, setVisitNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('11/25/2025');
  const [slotVisible, setSlotVisible] = useState(false);
  const [timeSlot, setTimeSlot] = useState('Afternoon Slot');

  const handleSubmit = () => {
    Alert.alert('Report Submitted', 'Your visit report has been submitted successfully.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <BackArrowIconBlack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pharmacy Details</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}><NotificationIcon /></TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}><ProfileIcon /></TouchableOpacity>
        </View>
      </View>
      <View style={styles.headerDivider} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Pharmacy Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            {/* Avatar with online dot */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>PH</Text>
              </View>
              <View style={styles.onlineDot} />
            </View>

            {/* Name + type + location */}
            <View style={styles.profileInfo}>
              <Text style={styles.pharmName}>
                {route.params.pharmacyName ?? 'Pharmacy Name'}
              </Text>
              <Text style={styles.pharmType}>Chemist Type</Text>
              <View style={styles.locationRow}>
                <MapPinOutlineIcon width={13} height={13} />
                <Text style={styles.locationText}> St. Mary's General Hospital</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Linked Chemist Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.linkedChemistLabel}>LINKED CHEMIST</Text>
          <Text style={styles.linkedChemistName}>Dr. Anil Sharma</Text>
          <Text style={styles.linkedChemistRole}>Chief Pharmacist • Lead Specialist</Text>
          <TouchableOpacity style={styles.updateLeadBtn} activeOpacity={0.85}>
            <LinkChainIcon width={18} height={18} />
            <Text style={styles.updateLeadText}>  UPDATE LEAD</Text>
          </TouchableOpacity>
        </View>

        {/* Link New Chemist Card */}
        <View style={styles.linkNewCard}>
          <View style={styles.linkNewIconCircle}>
            <AddPeople />
          </View>
          <Text style={styles.linkNewTitle}>Link New Chemist</Text>
          <Text style={styles.linkNewSubtitle}>MANAGE LEAD CONCEPT</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>LAST VISIT</Text>
            <Text style={styles.statValue}>14 Days ago</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
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
          {SAMPLE_PRODUCTS.map((item, i) => (
            <View
              key={i}
              style={[styles.productRow, i < SAMPLE_PRODUCTS.length - 1 && styles.productRowBorder]}
            >
              <View>
                <Text style={styles.productTime}>{item.time}</Text>
                <Text style={styles.productName}>{item.name}</Text>
              </View>
              <TouchableOpacity><InfoIcon width={20} height={20} /></TouchableOpacity>
            </View>
          ))}
        </CollapsibleSection>

        {/* Visit Notes */}
        <Text style={styles.sectionLabel}>VISIT NOTES</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Enter discussion points, objections, and next steps..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          value={visitNote}
          onChangeText={setVisitNote}
          textAlignVertical="top"
        />

        {/* Documentation */}
        <Text style={styles.sectionLabel}>DOCUMENTATION</Text>
        <TouchableOpacity style={styles.uploadCard} activeOpacity={0.8}
          onPress={() => Alert.alert('Upload', 'Camera/gallery picker would open here.')}>
          <View style={styles.uploadIconWrapper}>
            <CameraUploadIcon width={28} height={28} />
          </View>
          <View>
            <Text style={styles.uploadTitle}>Upload Prescription Photo</Text>
            <Text style={styles.uploadSub}>JPEG or PNG, Max 5MB</Text>
          </View>
        </TouchableOpacity>

        {/* Follow-up Plan */}
        <View style={styles.followUpCard}>
          <Text style={styles.followUpCardTitle}>Follow-up Plan</Text>
          <View style={styles.followUpRow}>
            {/* Date input */}
            <View style={styles.followUpDateBox}>
              <TextInput
                style={styles.followUpDateInput}
                value={followUpDate}
                onChangeText={setFollowUpDate}
              />
            </View>

            {/* Slot picker */}
            <TouchableOpacity
              style={styles.followUpSlotBox}
              activeOpacity={0.8}
              onPress={() => setSlotVisible(p => !p)}
            >
              <Text style={styles.followUpSlotText}>{timeSlot}</Text>
              <Down width={14} height={14} />
            </TouchableOpacity>
          </View>

          {/* Dropdown */}
          {slotVisible && (
            <View style={styles.slotDropdown}>
              {TIME_SLOTS.map(slot => (
                <TouchableOpacity
                  key={slot}
                  style={styles.slotOption}
                  onPress={() => { setTimeSlot(slot); setSlotVisible(false); }}
                >
                  <Text style={[styles.slotOptionText, slot === timeSlot && styles.slotOptionActive]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Order History */}
        <CollapsibleSection
          title="Order History"
          expanded={orderExpanded}
          onToggle={() => setOrderExpanded(p => !p)}
        >
          <View style={styles.orderCard}>
            {[
              { label: 'Product Name:', value: 'ACNE-TECH', bold: true, blue: true },
              { label: 'Quantity:',     value: '50 units',  bold: true, blue: false },
              { label: 'Last Date:',    value: 'January 10, 2026', bold: true, blue: false },
              { label: 'Product Price:', value: '₹1400.00', bold: true, blue: false },
            ].map((row, i) => (
              <View key={i} style={[styles.orderRow, i < 3 && styles.orderRowGap]}>
                <Text style={styles.orderLabel}>{row.label}</Text>
                <Text style={[styles.orderValue, row.blue && styles.orderValueBlue]}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </CollapsibleSection>

        <View style={styles.scrollSpacer} />
      </ScrollView>

      {/* Submit Report */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={styles.submitBtnText}>Submit Report</Text>
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

  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Profile card
  profileCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrapper: { position: 'relative' },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(46,80,178,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: { fontSize: FONTS.size.xl, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  profileInfo: { flex: 1 },
  pharmName: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  pharmType: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.buttonBlue, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },

  // Linked chemist card
  sectionCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  linkedChemistLabel: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  linkedChemistName: {
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 2,
  },
  linkedChemistRole: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  updateLeadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.buttonBlue,
    height: 52,
    borderRadius: 26,
  },
  updateLeadText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
    letterSpacing: 0.4,
  },

  // Link new chemist card
  linkNewCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: '#FAFAFA',
  },
  linkNewIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEEEEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    flexDirection: 'row',
  },
  linkNewIconText: { fontSize: 22 },
  linkNewIconPlus: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    marginLeft: -4,
    marginTop: -8,
  },
  linkNewTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 4,
  },
  linkNewSubtitle: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  statBlock: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  statLabel: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },

  // Collapsible
  collapsibleCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  collapsibleHeaderExpanded: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  collapsibleTitle: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.textDark },

  // Product rows
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  productRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  productTime: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  productName: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },

  // Section label
  sectionLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // Visit notes
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

  // Documentation upload
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    backgroundColor: '#FAFAFA',
  },
  uploadIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEEEEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadTitle: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  uploadSub: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },

  // Follow-up plan
  followUpCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  followUpCardTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 14,
  },
  followUpRow: { flexDirection: 'row', gap: 10 },
  followUpDateBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  followUpDateInput: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textDark,
    padding: 0,
  },
  followUpSlotBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  followUpSlotText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textDark,
  },
  slotDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  slotOption: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  slotOptionText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },
  slotOptionActive: { color: COLORS.buttonBlue, fontFamily: FONTS.family.bold },

  // Order History
  orderCard: { paddingHorizontal: 16, paddingVertical: 14 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderRowGap: { marginBottom: 10 },
  orderLabel: { fontSize: FONTS.size.md, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },
  orderValue: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark },
  orderValueBlue: { color: COLORS.buttonBlue },

  scrollSpacer: { height: 100 },

  // Bottom bar
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  submitBtn: {
    backgroundColor: COLORS.buttonBlue,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.semibold, color: COLORS.white },
});

export default PharmacyDetailScreen;
