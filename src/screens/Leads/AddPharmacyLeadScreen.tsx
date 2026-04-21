import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Platform, ActivityIndicator,
  Modal, FlatList, TouchableWithoutFeedback, Alert,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import {
  InfoIcon, PhoneSmallIcon, Down,
} from '@/assets/images';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import DatePickerModal from '@/components/common/DatePickerModal';
import apiClient from '@/services/apiClient';

type AddPharmacyRouteProp = RouteProp<AppStackParamList, 'AddPharmacyLead'>;
type NavProp = NativeStackNavigationProp<AppStackParamList>;

const STAGE_OPTIONS = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Sent to MR', 'Converted', 'Lost'];
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const SOURCE_OPTIONS = ['Referral', 'Conference', 'Website', 'Cold Call', 'Other'];

/* ─── Generic options bottom-sheet ───────────────────────────────── */
type OptionsSheetProps = {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
  onClose: () => void;
};

const OptionsSheet = ({ visible, title, options, selected, onSelect, onClose }: OptionsSheetProps) => (
  <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={sheet.overlay} />
    </TouchableWithoutFeedback>
    <View style={sheet.container}>
      <View style={sheet.handle} />
      <Text style={sheet.title}>{title}</Text>
      <FlatList
        data={options}
        keyExtractor={item => item}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const active = item === selected;
          return (
            <TouchableOpacity
              style={sheet.option}
              activeOpacity={0.7}
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text style={[sheet.optionText, active && sheet.optionActive]}>{item}</Text>
              {active && <Text style={sheet.check}>✓</Text>}
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={sheet.sep} />}
      />
    </View>
  </Modal>
);

const sheet = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 16,
  },
  title: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 14,
  },
  optionText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textDark,
  },
  optionActive: {
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
  },
  check: { fontSize: FONTS.size.lg, color: COLORS.buttonBlue },
  sep: { height: 1, backgroundColor: COLORS.border },
});

/* ─── Screen ─────────────────────────────────────────────────────── */
const AddPharmacyLeadScreen = () => {
  const route = useRoute<AddPharmacyRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { editMode, leadData } = route.params || {};

  const [form, setForm] = useState({
    name: leadData?.name || '',
    city: leadData?.city || '',
    state: leadData?.state || '',
    address: leadData?.address || '',
    phone: leadData?.phone || '',
    email: leadData?.email || '',
    stage: leadData?.stage || 'New',
    priority: leadData?.priority || 'Medium',
    source: leadData?.source || '',
    notes: leadData?.notes || '',
  });

  const [followUpDate, setFollowUpDate] = useState<Date | null>(
    leadData?.nextFollowUp ? new Date(leadData.nextFollowUp) : null
  );

  const [showStage, setShowStage] = useState(false);
  const [showPriority, setShowPriority] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation Error', 'Pharmacy name is required.');
      return;
    }
    if (!form.city.trim()) {
      Alert.alert('Validation Error', 'City is required.');
      return;
    }

    setSaving(true);
    try {
      const timestamp = Date.now().toString().slice(-6);
      const payload: Record<string, unknown> = {
        ...form,
        leadType: 'pharmacy',
        nextFollowUp: followUpDate ? followUpDate.toISOString().split('T')[0] : undefined,
      };

      if (editMode && leadData?.id) {
        await apiClient.patch(`/leads/${leadData.id}`, payload);
      } else {
        payload.code = `LED${timestamp}`;
        await apiClient.post('/leads', payload);
      }

      navigation.goBack();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Something went wrong. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={editMode ? 'Edit Pharmacy Lead' : 'Add New Lead'}
        showBack
        showNotification
        showProfile
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <InfoIcon width={16} height={16} />
          <Text style={styles.sectionTitle}>PHARMACY INFORMATION</Text>
        </View>

        {/* Pharmacy Name * */}
        <Field label="Pharmacy Name *">
          <TextInput
            style={styles.input}
            placeholder="Pharmacy name"
            placeholderTextColor={COLORS.textMuted}
            value={form.name}
            onChangeText={set('name')}
          />
        </Field>

        {/* City * + State row */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              placeholder="City"
              placeholderTextColor={COLORS.textMuted}
              value={form.city}
              onChangeText={set('city')}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              placeholder="State"
              placeholderTextColor={COLORS.textMuted}
              value={form.state}
              onChangeText={set('state')}
            />
          </View>
        </View>

        {/* Address */}
        <Field label="Address">
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Full address"
            placeholderTextColor={COLORS.textMuted}
            multiline
            textAlignVertical="top"
            value={form.address}
            onChangeText={set('address')}
          />
        </Field>

        {/* Phone */}
        <Field label="Phone">
          <View style={styles.phoneRow}>
            <PhoneSmallIcon width={16} height={16} />
            <TextInput
              style={[styles.input, styles.phoneInput]}
              placeholder="+91 9876543210"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={set('phone')}
            />
          </View>
        </Field>

        {/* Email */}
        <Field label="Email Address">
          <TextInput
            style={styles.input}
            placeholder="pharmacy@example.com"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={set('email')}
          />
        </Field>

        {/* Stage * dropdown */}
        <Field label="Stage *">
          <TouchableOpacity
            style={styles.dropdown}
            activeOpacity={0.8}
            onPress={() => setShowStage(true)}
          >
            <Text style={[styles.dropdownText, form.stage && styles.dropdownSelected]}>
              {form.stage || 'Select Stage'}
            </Text>
            <Down width={16} height={16} stroke={COLORS.textSecondary} />
          </TouchableOpacity>
        </Field>

        {/* Priority * dropdown */}
        <Field label="Priority *">
          <TouchableOpacity
            style={styles.dropdown}
            activeOpacity={0.8}
            onPress={() => setShowPriority(true)}
          >
            <Text style={[styles.dropdownText, form.priority && styles.dropdownSelected]}>
              {form.priority || 'Select Priority'}
            </Text>
            <Down width={16} height={16} stroke={COLORS.textSecondary} />
          </TouchableOpacity>
        </Field>

        {/* Source dropdown */}
        <Field label="Source">
          <TouchableOpacity
            style={styles.dropdown}
            activeOpacity={0.8}
            onPress={() => setShowSource(true)}
          >
            <Text style={[styles.dropdownText, form.source && styles.dropdownSelected]}>
              {form.source || 'Select Source'}
            </Text>
            <Down width={16} height={16} stroke={COLORS.textSecondary} />
          </TouchableOpacity>
        </Field>

        {/* Next Follow-up date picker */}
        <Field label="Next Follow-up">
          <TouchableOpacity
            style={styles.dropdown}
            activeOpacity={0.8}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.dropdownText, followUpDate && styles.dropdownSelected]}>
              {followUpDate ? formatDate(followUpDate) : 'dd/mm/yyyy'}
            </Text>
            <Down width={16} height={16} stroke={COLORS.textSecondary} />
          </TouchableOpacity>
        </Field>

        {/* Notes */}
        <Field label="Notes">
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Additional notes about this lead..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            textAlignVertical="top"
            value={form.notes}
            onChangeText={set('notes')}
          />
        </Field>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveBtnText}>
              {editMode ? 'Update Lead' : 'Save Lead'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Dropdown sheets */}
      <OptionsSheet
        visible={showStage}
        title="Select Stage"
        options={STAGE_OPTIONS}
        selected={form.stage}
        onSelect={val => set('stage')(val)}
        onClose={() => setShowStage(false)}
      />
      <OptionsSheet
        visible={showPriority}
        title="Select Priority"
        options={PRIORITY_OPTIONS}
        selected={form.priority}
        onSelect={val => set('priority')(val)}
        onClose={() => setShowPriority(false)}
      />
      <OptionsSheet
        visible={showSource}
        title="Select Source"
        options={SOURCE_OPTIONS}
        selected={form.source}
        onSelect={val => set('source')(val)}
        onClose={() => setShowSource(false)}
      />

      {/* Date picker */}
      <DatePickerModal
        visible={showDatePicker}
        selectedDate={followUpDate}
        minDate={new Date()}
        onSelect={date => { setFollowUpDate(date); setShowDatePicker(false); }}
        onClose={() => setShowDatePicker(false)}
      />
    </View>
  );
};

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

  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfField: { flex: 1 },

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
    height: 90,
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
    color: COLORS.textMuted,
  },
  dropdownSelected: {
    color: COLORS.textDark,
  },

  spacer: { height: 24 },

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
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
  },
});

export default AddPharmacyLeadScreen;
