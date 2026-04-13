import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Platform,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import AssignModal, { ASSIGN_OPTIONS } from '@/components/common/AssignModal';
import {
  ProfileIcon, CameraUploadIcon, InfoIcon,
  PhoneSmallIcon, Down,
  Camera,
} from '@/assets/images';
import { useRoute, RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '@/navigation/types';

type ChemistType = 'inhouse' | 'external' | null;
type AddPharmacyRouteProp = RouteProp<AppStackParamList, 'AddPharmacyLead'>;

/* ─── Screen ─────────────────────────────────────────────────────── */
const AddPharmacyLeadScreen = () => {
  const route = useRoute<AddPharmacyRouteProp>();
  const { editMode, leadData } = route.params || {};
  const [form, setForm] = useState({
    pharmacyName: leadData?.name || '',
    ownerName: '',
    email: leadData?.email || '',
    phone: leadData?.phone || '',
    linkedChemist: '',
    additionalInfo: '',
  });
  const [chemistType, setChemistType] = useState<ChemistType>(null);
  const [assignTo, setAssignTo] = useState(ASSIGN_OPTIONS[0]);
  const [showAssign, setShowAssign] = useState(false);

  const set = (key: keyof typeof form) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  return (
    <View style={styles.container}>
      <Header title={editMode ? "Edit Pharmacy Lead" : "Add New Lead"} showBack showNotification showProfile />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo upload */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <ProfileIcon width={72} height={72} />
            </View>
            <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.8}>
              <Camera />
            </TouchableOpacity>
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.uploadText}>Add Pharmacy Logo</Text>
          </TouchableOpacity>
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <InfoIcon width={16} height={16} />
          <Text style={styles.sectionTitle}>PHARMACY DETAILS</Text>
        </View>

        {/* Fields */}
        <Field label="Pharmacy Name">
          <TextInput
            style={styles.input}
            placeholder="Enter pharmacy name"
            placeholderTextColor={COLORS.textMuted}
            value={form.pharmacyName}
            onChangeText={set('pharmacyName')}
          />
        </Field>

        <Field label="Owner's Name">
          <TextInput
            style={styles.input}
            placeholder="Enter owner's name"
            placeholderTextColor={COLORS.textMuted}
            value={form.ownerName}
            onChangeText={set('ownerName')}
          />
        </Field>

        <Field label="Pharmacy Email">
          <TextInput
            style={styles.input}
            placeholder="pharmacy@email.com"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={set('email')}
          />
        </Field>

        <Field label="Phone Number">
          <View style={styles.phoneRow}>
            <PhoneSmallIcon width={16} height={16} />
            <TextInput
              style={[styles.input, styles.phoneInput]}
              placeholder="+91 8877665544"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={set('phone')}
            />
          </View>
        </Field>

        <Field label="Linked Chemist">
          <TextInput
            style={styles.input}
            placeholder="Enter Chemist"
            placeholderTextColor={COLORS.textMuted}
            value={form.linkedChemist}
            onChangeText={set('linkedChemist')}
          />
        </Field>

        {/* Chemist Type — radio */}
        <Field label="Chemist Type">
          <RadioOption
            label="In-house / Micro-pharmacy"
            selected={chemistType === 'inhouse'}
            onPress={() => setChemistType('inhouse')}
          />
          <View style={{ height: 10 }} />
          <RadioOption
            label="External / Third-party"
            selected={chemistType === 'external'}
            onPress={() => setChemistType('external')}
          />
        </Field>

        <Field label="Additional Info">
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Add details about the pharmacy..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            textAlignVertical="top"
            value={form.additionalInfo}
            onChangeText={set('additionalInfo')}
          />
        </Field>

        <Field label="Assign to">
          <TouchableOpacity
            style={styles.dropdown}
            activeOpacity={0.8}
            onPress={() => setShowAssign(true)}
          >
            <Text style={styles.dropdownText}>{assignTo}</Text>
            <Down width={16} height={16} stroke={COLORS.textSecondary} />
          </TouchableOpacity>
        </Field>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>{editMode ? 'Update Lead' : 'Save Lead'}</Text>
        </TouchableOpacity>
      </View>

      <AssignModal
        visible={showAssign}
        selected={assignTo}
        onSelect={setAssignTo}
        onClose={() => setShowAssign(false)}
      />
    </View>
  );
};

/* ─── Radio Option ───────────────────────────────────────────────── */
const RadioOption = ({
  label, selected, onPress,
}: { label: string; selected: boolean; onPress: () => void }) => (
  <TouchableOpacity
    style={[styles.radioRow, selected && styles.radioRowActive]}
    activeOpacity={0.8}
    onPress={onPress}
  >
    <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
      {selected && <View style={styles.radioInner} />}
    </View>
    <Text style={[styles.radioLabel, selected && styles.radioLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

/* ─── Field wrapper ──────────────────────────────────────────────── */
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.label}>{label}</Text>
    {children}
  </View>
);

/* ─── Styles ─────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  avatarSection: { alignItems: 'center', paddingVertical: 20 },
  avatarWrapper: { position: 'relative', marginBottom: 10 },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: COLORS.buttonBlue,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.buttonBlue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  uploadText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.semibold,
    color: COLORS.buttonBlue,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
    letterSpacing: 0.5,
  },

  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textDark,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    paddingHorizontal: 16,
    gap: 8,
  },
  phoneInput: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: 0,
    borderRadius: 0,
  },
  notesInput: {
    height: 110,
    borderRadius: 16,
    paddingTop: Platform.OS === 'ios' ? 14 : 10,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
  },
  dropdownText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },

  // Radio
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    gap: 12,
  },
  radioRowActive: { borderColor: COLORS.buttonBlue },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: { borderColor: COLORS.buttonBlue },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.buttonBlue,
  },
  radioLabel: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  radioLabelActive: {
    color: COLORS.textDark,
    fontFamily: FONTS.family.medium,
  },

  footer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    paddingTop: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.buttonBlue,
    borderRadius: 28,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
  },
});

export default AddPharmacyLeadScreen;
