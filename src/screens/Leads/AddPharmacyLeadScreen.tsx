import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Platform, ActivityIndicator,
  Modal, FlatList, TouchableWithoutFeedback,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

// ── Icons & AlertModal ────────────────────────────────────────────────────────

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

type AlertType = 'success' | 'error' | 'info';

interface AlertState {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void;
}

const ALERT_HIDDEN: AlertState = { visible: false, type: 'info', title: '', message: '' };

const ALERT_ACCENT: Record<AlertType, string> = {
  success: '#16A34A',
  error: '#DC2626',
  info: '#2563EB',
};

const AlertModal = ({ state, onDismiss }: { state: AlertState; onDismiss: () => void }) => {
  const accent = ALERT_ACCENT[state.type];
  const Icon = state.type === 'success' ? CheckCircleIcon : ErrorCircleIcon;
  const handleConfirm = () => { onDismiss(); state.onConfirm?.(); };
  return (
    <Modal visible={state.visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={am.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onDismiss} />
        <View style={am.card}>
          <Icon />
          <Text style={am.title}>{state.title}</Text>
          <Text style={am.message}>{state.message}</Text>
          <View style={am.actionsCenter}>
            <TouchableOpacity style={[am.confirmBtn, { backgroundColor: accent }, am.confirmBtnFull]} activeOpacity={0.8} onPress={handleConfirm}>
              <Text style={am.confirmText}>{state.confirmText ?? 'OK'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
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
import { ENDPOINTS } from '@/constants/endpoints';

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
  <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
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


export type AssignedDoctor = {
  id: number;
  name: string;
};

export type CustomDoctor = {
  name: string;
  postalAddress: string;
  phone: string;
  billingDetails: string;
  deliveryDetails: string;
};

type MultiSelectDoctorSheetProps = {
  visible: boolean;
  title: string;
  options: AssignedDoctor[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onAddCustom: () => void;
  onClose: () => void;
};

const MultiSelectDoctorSheet = ({ visible, title, options, selectedIds, onToggle, onAddCustom, onClose }: MultiSelectDoctorSheetProps) => (
  <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={sheet.overlay} />
    </TouchableWithoutFeedback>
    <View style={sheet.container}>
      <View style={sheet.handle} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={sheet.title}>{title}</Text>
        <TouchableOpacity onPress={onClose}><Text style={{ color: COLORS.buttonBlue, fontFamily: FONTS.family.bold }}>Done</Text></TouchableOpacity>
      </View>
      <FlatList
        data={[...options, { id: -1, name: '+ Add Other Doctor' }]}
        keyExtractor={item => item.id.toString()}
        style={{ maxHeight: 300 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          if (item.id === -1) {
            return (
              <TouchableOpacity style={sheet.option} activeOpacity={0.7} onPress={() => { onClose(); onAddCustom(); }}>
                <Text style={[sheet.optionText, { color: COLORS.buttonBlue, fontFamily: FONTS.family.bold }]}>{item.name}</Text>
              </TouchableOpacity>
            );
          }
          const active = selectedIds.includes(item.id);
          return (
            <TouchableOpacity style={sheet.option} activeOpacity={0.7} onPress={() => onToggle(item.id)}>
              <Text style={[sheet.optionText, active && sheet.optionActive]}>{item.name}</Text>
              {active && <Text style={sheet.check}>✓</Text>}
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={sheet.sep} />}
      />
    </View>
  </Modal>
);

const CustomDoctorModal = ({ visible, onClose, onSave, onError }: { visible: boolean, onClose: () => void, onSave: (p: CustomDoctor) => void, onError: (msg: string) => void }) => {
  const [data, setData] = useState<CustomDoctor>({ name: '', postalAddress: '', phone: '', billingDetails: '', deliveryDetails: '' });
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={[sheet.overlay, { justifyContent: 'flex-end' }]}>
        <View style={[sheet.container, { paddingBottom: Platform.OS === 'ios' ? 40 : 20, maxHeight: '90%' }]}>
          <View style={sheet.handle} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
             <Text style={sheet.title}>Add Custom Doctor</Text>
             <TouchableOpacity onPress={onClose}><Text style={{ color: COLORS.textMuted }}>Cancel</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Field label="Doctor Name *"><TextInput style={styles.input} value={data.name} onChangeText={t => setData({...data, name: t})} placeholder="Dr. Name" /></Field>
            <Field label="Postal Address *"><TextInput style={styles.input} value={data.postalAddress} onChangeText={t => setData({...data, postalAddress: t})} placeholder="Address" /></Field>
            <Field label="Phone No. *"><TextInput style={styles.input} keyboardType="numeric" maxLength={10} value={data.phone} onChangeText={t => setData({...data, phone: t.replace(/[^0-9]/g, '').slice(0, 10)})} placeholder="10 digit Phone Number" /></Field>
            <Field label="Billing Details *"><TextInput style={[styles.input, styles.notesInput]} multiline value={data.billingDetails} onChangeText={t => setData({...data, billingDetails: t})} placeholder="Billing details..." /></Field>
            <Field label="Delivery Details *"><TextInput style={[styles.input, styles.notesInput]} multiline value={data.deliveryDetails} onChangeText={t => setData({...data, deliveryDetails: t})} placeholder="Delivery details..." /></Field>
            <TouchableOpacity style={styles.saveBtn} onPress={() => {
              if (!data.name.trim()) { onError('Doctor Name is required.'); return; }
              if (!data.postalAddress.trim()) { onError('Postal Address is required.'); return; }
              if (data.phone.length !== 10) { onError('A valid 10-digit Phone Number is required.'); return; }
              if (!data.billingDetails.trim()) { onError('Billing Details are required.'); return; }
              if (!data.deliveryDetails.trim()) { onError('Delivery Details are required.'); return; }
              onSave(data);
              setData({ name: '', postalAddress: '', phone: '', billingDetails: '', deliveryDetails: '' });
            }}>
              <Text style={styles.saveBtnText}>Add</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/* ─── Screen ─────────────────────────────────────────────────────── */
const AddPharmacyLeadScreen = () => {
  const route = useRoute<AddPharmacyRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { editMode, leadData } = route.params || {};

  const [form, setForm] = useState({
    name: leadData?.name || '',
    licenseNumber: leadData?.licenseNumber || '',
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
  const [alertState, setAlertState] = useState<AlertState>(ALERT_HIDDEN);

  const showAlert = (title: string, message: string, type: AlertType = 'error') =>
    setAlertState({ visible: true, type, title, message });
  const dismissAlert = () => setAlertState(ALERT_HIDDEN);

  const [assignedDoctors, setAssignedDoctors] = useState<AssignedDoctor[]>([]);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<number[]>([]);
  const [customDoctors, setCustomDoctors] = useState<CustomDoctor[]>([]);
  
  const [showDoctorsSheet, setShowDoctorsSheet] = useState(false);
  const [showCustomDoctorModal, setShowCustomDoctorModal] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await apiClient.get<AssignedDoctor[]>(ENDPOINTS.portfolio.doctors);
        setAssignedDoctors(res.data || []);
      } catch (err) {
        console.log('Error fetching assigned doctors', err);
      }
    };
    fetchDoctors();
    
    if (editMode && leadData?.linkedDoctor) {
       const preSelectedIds = leadData.linkedDoctor.filter((p: any) => p.doctorId).map((p: any) => p.doctorId);
       setSelectedDoctorIds(preSelectedIds);
       const preCustom = leadData.linkedDoctor.filter((p: any) => !p.doctorId);
       setCustomDoctors(preCustom);
    }
  }, [editMode, leadData]);


  const set = (key: keyof typeof form) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showAlert('Validation Error', 'Pharmacy name is required.');
      return;
    }
    if (!form.city.trim()) {
      showAlert('Validation Error', 'City is required.');
      return;
    }

    setSaving(true);
    try {
      const timestamp = Date.now().toString().slice(-6);
      
      const payload: Record<string, unknown> = {
        ...form,
        leadType: 'pharmacy',
        nextFollowUp: followUpDate ? followUpDate.toISOString().split('T')[0] : undefined,
        linkedDoctor: [
          ...selectedDoctorIds.map(id => ({ doctorId: id })),
          ...customDoctors
        ]
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
      showAlert('Error', message);
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

        {/* License Number */}
        <Field label="License Number">
          <TextInput
            style={styles.input}
            placeholder="License number"
            placeholderTextColor={COLORS.textMuted}
            value={form.licenseNumber}
            onChangeText={set('licenseNumber')}
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

        
        {/* Linked Doctors dropdown */}
        <Field label="Linked Doctors">
          <TouchableOpacity
            style={styles.dropdown}
            activeOpacity={0.8}
            onPress={() => setShowDoctorsSheet(true)}
          >
            <Text style={[styles.dropdownText, (selectedDoctorIds.length > 0 || customDoctors.length > 0) && styles.dropdownSelected]}>
              {(selectedDoctorIds.length + customDoctors.length) > 0 ? `${selectedDoctorIds.length + customDoctors.length} Selected` : 'Select or Add Doctor'}
            </Text>
            <Down width={16} height={16} stroke={COLORS.textSecondary} />
          </TouchableOpacity>
        </Field>
        
        {/* Selected Doctors Chips */}
        {(selectedDoctorIds.length > 0 || customDoctors.length > 0) && (
           <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {selectedDoctorIds.map(id => {
                 const name = assignedDoctors.find(p => p.id === id)?.name || `Doctor #${id}`;
                 return (
                   <View key={`ex-${id}`} style={styles.chip}>
                     <Text style={styles.chipText}>{name}</Text>
                     <TouchableOpacity onPress={() => setSelectedDoctorIds(prev => prev.filter(pid => pid !== id))}>
                       <Text style={styles.chipClose}>✕</Text>
                     </TouchableOpacity>
                   </View>
                 );
              })}
              {customDoctors.map((p, idx) => (
                 <View key={`c-${idx}`} style={styles.chip}>
                   <Text style={styles.chipText}>{p.name} (Custom)</Text>
                   <TouchableOpacity onPress={() => setCustomDoctors(prev => prev.filter((_, i) => i !== idx))}>
                     <Text style={styles.chipClose}>✕</Text>
                   </TouchableOpacity>
                 </View>
              ))}
           </View>
        )}

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
      <MultiSelectDoctorSheet
        visible={showDoctorsSheet}
        title="Select Assigned Doctor"
        options={assignedDoctors}
        selectedIds={selectedDoctorIds}
        onToggle={(id) => {
          setSelectedDoctorIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
        }}
        onAddCustom={() => setShowCustomDoctorModal(true)}
        onClose={() => setShowDoctorsSheet(false)}
      />
      <CustomDoctorModal
        visible={showCustomDoctorModal}
        onClose={() => setShowCustomDoctorModal(false)}
        onSave={(p) => {
          setCustomDoctors(prev => [...prev, p]);
          setShowCustomDoctorModal(false);
        }}
        onError={(msg) => { setShowCustomDoctorModal(false); showAlert('Validation Error', msg); }}
      />

      <AlertModal state={alertState} onDismiss={dismissAlert} />

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

  chip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#D0D7F5'
  },
  chipText: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: COLORS.buttonBlue, marginRight: 6 },
  chipClose: { fontSize: FONTS.size.sm, color: COLORS.buttonBlue, fontWeight: 'bold' },


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
  actionsCenter: { width: '100%', alignItems: 'center' },
  confirmBtn: {
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnFull: { width: 140 },
  confirmText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
  },
});

export default AddPharmacyLeadScreen;
