import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Platform, ActivityIndicator,
  Modal, FlatList, TouchableWithoutFeedback, KeyboardAvoidingView,
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

const CheckboxIcon = ({ checked, faded }: { checked: boolean; faded?: boolean }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" opacity={faded ? 0.4 : 1}>
    <Path
      d="M3 7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7z"
      fill={checked ? '#2D3B8A' : 'transparent'}
      stroke={checked ? '#2D3B8A' : '#B0B6C3'}
      strokeWidth="1.6"
    />
    {checked && (
      <Path d="M8 12l3 3 5-6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    )}
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
import StateCitySelector from '@/components/common/StateCitySelector';
import { useDispatch, useSelector } from 'react-redux';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';
import { AppDispatch } from '@/redux/store';
import {
  classifyApiError,
  extractServerMessage,
  isRetriable,
  messageForKind,
} from '@/services/apiError';
import { buildLeadDraft, makeLeadCode } from '@/services/leadDraftStorage';
import {
  discardLeadDraft,
  saveLeadDraft,
  selectDraftOwnerId,
  selectLeadDrafts,
} from '@/redux/slices/leadDraftSlice';

/**
 * How long the MR waits before the button admits the network is struggling.
 * Well inside the 30s request timeout, so a weak-signal submit reads as "working
 * on it" rather than a frozen screen.
 */
const SLOW_NETWORK_HINT_MS = 6000;

type AddDoctorRouteProp = RouteProp<AppStackParamList, 'AddDoctorLead'>;
type NavProp = NativeStackNavigationProp<AppStackParamList>;

const STAGE_OPTIONS = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Sent to MR', 'Converted', 'Lost'];
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const SOURCE_OPTIONS = ['Referral', 'Conference', 'Website', 'Cold Call', 'Other'];
// Doctor leads use the "Doctor" prefix set (see backend naming-convention update).
const PREFIX_OPTIONS = ['Dr.', 'Prof.', 'Prof. Dr.'];

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


export type AssignedPharmacy = {
  id: number;
  name: string;
};

// Linked pharmacy's pharmacist uses the "General" prefix set.
const PHARMACY_PREFIX_OPTIONS = ['Mr.', 'Mrs.', 'Ms.'];

// Capitalise the first letter only (mirrors the CRM, which stores "Wdadw").
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export type CustomPharmacy = {
  prefix: string;     // pharmacist prefix
  firstName: string;  // pharmacist first name
  lastName: string;   // pharmacist last name
  name: string;       // pharmacy (business) name
  gst: string;
  license: string;
  phone: string;
  state: string;
  city: string;
};

const EMPTY_CUSTOM_PHARMACY: CustomPharmacy = {
  prefix: 'Mr.', firstName: '', lastName: '', name: '', gst: '',
  license: '', phone: '', state: '', city: '',
};

type MultiSelectSheetProps = {
  visible: boolean;
  title: string;
  options: AssignedPharmacy[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onAddCustom: () => void;
  onClose: () => void;
};

const MultiSelectSheet = ({ visible, title, options, selectedIds, onToggle, onAddCustom, onClose }: MultiSelectSheetProps) => (
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
        data={[...options, { id: -1, name: '+ Add Other Pharmacy' }]}
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

const CustomPharmacyModal = ({ visible, initialData, onClose, onSave }: { visible: boolean, initialData?: CustomPharmacy | null, onClose: () => void, onSave: (p: CustomPharmacy) => void }) => {
  const [data, setData] = useState<CustomPharmacy>(EMPTY_CUSTOM_PHARMACY);
  const [showPrefix, setShowPrefix] = useState(false);
  // Bumped on every open so StateCitySelector remounts and re-reads its value.
  const [openSeq, setOpenSeq] = useState(0);
  // Validation alert shown inside this modal so the form (and its values) stays.
  const [localAlert, setLocalAlert] = useState<AlertState>(ALERT_HIDDEN);
  const showError = (msg: string) => setLocalAlert({ visible: true, type: 'error', title: 'Validation Error', message: msg });
  const isEditing = !!initialData;
  // Sync the form whenever the modal opens (pre-fill for edit, reset for add).
  useEffect(() => {
    if (visible) {
      setData({ ...EMPTY_CUSTOM_PHARMACY, ...(initialData || {}) });
      setOpenSeq(s => s + 1);
    }
  }, [visible, initialData]);
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[sheet.overlay, { justifyContent: 'flex-end' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[sheet.container, { paddingBottom: Platform.OS === 'ios' ? 40 : 20, maxHeight: '90%' }]}>
          <View style={sheet.handle} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
             <Text style={sheet.title}>{isEditing ? 'Edit Custom Pharmacy' : 'Add Custom Pharmacy'}</Text>
             <TouchableOpacity onPress={onClose}><Text style={{ color: COLORS.textMuted }}>Cancel</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
            <Field label="Prefix">
              <TouchableOpacity style={styles.dropdown} activeOpacity={0.8} onPress={() => setShowPrefix(true)}>
                <Text style={[styles.dropdownText, data.prefix && styles.dropdownSelected]}>{data.prefix || 'Select Prefix'}</Text>
                <Down width={16} height={16} stroke={COLORS.textSecondary} />
              </TouchableOpacity>
            </Field>
            <Field label="Pharmacist First Name *"><TextInput style={styles.input} value={data.firstName} onChangeText={t => setData({...data, firstName: t})} placeholder="First name" /></Field>
            <Field label="Pharmacist Last Name"><TextInput style={styles.input} value={data.lastName} onChangeText={t => setData({...data, lastName: t})} placeholder="Last name" /></Field>
            <Field label="Pharmacy Name *"><TextInput style={styles.input} value={data.name} onChangeText={t => setData({...data, name: t})} placeholder="Pharmacy Name" /></Field>
            <Field label="Phone No. *"><TextInput style={styles.input} keyboardType="numeric" maxLength={10} value={data.phone} onChangeText={t => setData({...data, phone: t.replace(/[^0-9]/g, '').slice(0, 10)})} placeholder="10 digit Phone Number" /></Field>
            <Field label="GST *"><TextInput style={styles.input} value={data.gst} onChangeText={t => setData({...data, gst: t})} placeholder="GST Number" /></Field>
            <Field label="License *"><TextInput style={styles.input} value={data.license} onChangeText={t => setData({...data, license: t})} placeholder="License Number" /></Field>
            <StateCitySelector
              key={openSeq}
              stateValue={data.state}
              cityValue={data.city}
              onStateChange={val => setData(d => ({ ...d, state: val }))}
              onCityChange={val => setData(d => ({ ...d, city: val }))}
              stateLabel="State *"
              cityLabel="City *"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={() => {
              if (!data.firstName.trim()) { showError('Pharmacist first name is required.'); return; }
              if (!data.name.trim()) { showError('Pharmacy Name is required.'); return; }
              if (data.phone.length !== 10) { showError('A valid 10-digit Phone Number is required.'); return; }
              if (!data.gst.trim()) { showError('GST Number is required.'); return; }
              if (!data.license.trim()) { showError('License Number is required.'); return; }
              if (!data.state.trim()) { showError('State is required.'); return; }
              if (!data.city.trim()) { showError('City is required.'); return; }
              onSave(data);
              setData(EMPTY_CUSTOM_PHARMACY);
            }}>
              <Text style={styles.saveBtnText}>{isEditing ? 'Save' : 'Add'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <OptionsSheet
        visible={showPrefix}
        title="Select Prefix"
        options={PHARMACY_PREFIX_OPTIONS}
        selected={data.prefix}
        onSelect={val => setData(d => ({ ...d, prefix: val }))}
        onClose={() => setShowPrefix(false)}
      />
      <AlertModal state={localAlert} onDismiss={() => setLocalAlert(ALERT_HIDDEN)} />
    </Modal>
  );
};

/* ─── Screen ─────────────────────────────────────────────────────── */
const AddLeadScreen = () => {
  const route = useRoute<AddDoctorRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { editMode, leadData, draftId } = route.params || {};
  const dispatch = useDispatch<AppDispatch>();
  const ownerId = useSelector(selectDraftOwnerId);
  const allDrafts = useSelector(selectLeadDrafts);

  // The unsent draft this screen was opened from, if any. Reopening one must reuse
  // its stored payload AND its `code`, so resubmitting resolves to the lead the
  // server may already hold rather than creating a second.
  const openedDraft = draftId ? allDrafts.find(d => d.draftId === draftId) ?? null : null;
  const draftPayload = (openedDraft?.payload ?? null) as Record<string, any> | null;

  /**
   * THE idempotency key, minted once for the life of this form.
   *
   * It used to be generated inside handleSave, so every retry carried a different
   * code and the server had no way to tell a retry from a new lead — that is how a
   * timed-out submit on a weak link became two leads. A ref (not state) because it
   * must survive re-renders without ever being recomputed.
   */
  const leadCodeRef = useRef<string>(openedDraft?.code ?? makeLeadCode());

  // Adopt the draft's own code if the draft resolves after the first render (the
  // drafts slice hydrates asynchronously). Without this the form could submit a
  // reopened draft under a NEW code, which is exactly the duplicate this whole
  // mechanism exists to prevent. Never overwrites a code once a submit is under
  // way, and never runs for a brand-new form.
  useEffect(() => {
    if (openedDraft && leadCodeRef.current !== openedDraft.code) {
      leadCodeRef.current = openedDraft.code;
    }
  }, [openedDraft]);

  // A reopened draft refills the form from its stored payload; `leadData` still
  // drives the edit-an-existing-lead case. Draft wins when both are somehow present.
  const seed: any = draftPayload ?? leadData ?? {};
  const [form, setForm] = useState({
    // Name is now split into prefix + first + last (backend composes the full
    // `name`). Fall back to the legacy single `name` for older records.
    prefix: seed?.prefix || 'Dr.',
    firstName: seed?.firstName || seed?.name || '',
    lastName: seed?.lastName || '',
    designation: seed?.designation || '',
    specialization: seed?.specialization || '',
    clinic: seed?.clinic || seed?.company || '',
    licenseNumber: seed?.licenseNumber || '',
    city: seed?.city || '',
    state: seed?.state || '',
    area: seed?.area || '',
    pincode: seed?.pincode || '',
    address: seed?.address || '',
    googleMapsUrl: seed?.googleMapsUrl || '',
    phone: seed?.phone || '',
    whatsappNumber: seed?.whatsappNumber || '',
    email: seed?.email || '',
    receptionistPhone: seed?.receptionistPhone || '',
    nearbyChemistName: seed?.nearbyChemistName || '',
    nearbyChemistPhone: seed?.nearbyChemistPhone || '',
    stage: seed?.stage || 'New',
    priority: seed?.priority || 'Medium',
    source: seed?.source || '',
    notes: seed?.notes || '',
    // Social & web links — optional, sent to the backend as-is.
    socialInstagram: seed?.socialInstagram || '',
    socialFacebook: seed?.socialFacebook || '',
    website: seed?.website || '',
    socialLinkedIn: seed?.socialLinkedIn || '',
  });

  const [followUpDate, setFollowUpDate] = useState<Date | null>(
    seed?.nextFollowUp ? new Date(seed.nextFollowUp) : null
  );

  const [showStage, setShowStage] = useState(false);
  const [showPriority, setShowPriority] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  // Flipped once the request has been outstanding long enough that silence would
  // read as a hang. Reset in the same `finally` that clears `saving`.
  const [slowNetwork, setSlowNetwork] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A submit can outlive the screen (the MR backgrounds the app mid-request), so
  // never touch state after unmount.
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
    if (slowTimer.current) { clearTimeout(slowTimer.current); }
  }, []);
  const [alertState, setAlertState] = useState<AlertState>(ALERT_HIDDEN);

  const showAlert = (title: string, message: string, type: AlertType = 'error') =>
    setAlertState({ visible: true, type, title, message });
  const dismissAlert = () => setAlertState(ALERT_HIDDEN);

  const [assignedPharmacies, setAssignedPharmacies] = useState<AssignedPharmacy[]>([]);
  const [selectedPharmacyIds, setSelectedPharmacyIds] = useState<number[]>([]);
  const [customPharmacies, setCustomPharmacies] = useState<CustomPharmacy[]>([]);
  
  const [showPharmaciesSheet, setShowPharmaciesSheet] = useState(false);
  const [showCustomPharmacyModal, setShowCustomPharmacyModal] = useState(false);
  // Index of the custom pharmacy currently being edited (null = adding new).
  const [editingCustomIndex, setEditingCustomIndex] = useState<number | null>(null);

  useEffect(() => {
    // Fetch assigned pharmacies
    const fetchPharmacies = async () => {
      try {
        const res = await apiClient.get<AssignedPharmacy[]>(ENDPOINTS.portfolio.pharmacies);
        setAssignedPharmacies(res.data || []);
      } catch (err) {
        console.log('Error fetching assigned pharmacies', err);
      }
    };
    fetchPharmacies();
    
    // Restore the linked-pharmacy selection when editing an existing lead OR when
    // reopening an unsent draft — a draft that lost its links on reopen would
    // silently submit less than the MR originally entered.
    const linked = (editMode ? leadData?.linkedPharmacy : null) ?? draftPayload?.linkedPharmacy;
    if (Array.isArray(linked)) {
       const preSelectedIds = linked.filter((p: any) => p.pharmacyId).map((p: any) => p.pharmacyId);
       setSelectedPharmacyIds(preSelectedIds);
       const preCustom: CustomPharmacy[] = linked.filter((p: any) => !p.pharmacyId).map((p: any) => ({
         prefix: p.prefix || 'Mr.',
         firstName: p.firstName || '',
         lastName: p.lastName || '',
         name: p.name || '',
         gst: p.gst || p.gstin || '',
         license: p.license || p.licenseNumber || '',
         phone: p.phone || '',
         state: p.state || '',
         city: p.city || '',
       }));
       setCustomPharmacies(preCustom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, leadData]);


  const set = (key: keyof typeof form) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const [sameAsPhone, setSameAsPhone] = useState(false);

  const setPhoneNumber = (key: 'phone' | 'whatsappNumber' | 'receptionistPhone' | 'nearbyChemistPhone') => (val: string) => {
    // Allow only numeric digits and limit to 10 characters
    const numericVal = val.replace(/[^0-9]/g, '').slice(0, 10);
    setForm(prev => ({
      ...prev,
      [key]: numericVal,
      ...(key === 'phone' && sameAsPhone ? { whatsappNumber: numericVal } : {}),
    }));
  };

  const toggleSameAsPhone = () => {
    if (!form.phone) return;
    setSameAsPhone(prev => {
      const next = !prev;
      if (next) setForm(f => ({ ...f, whatsappNumber: f.phone }));
      return next;
    });
  };

  const setPincode = (val: string) =>
    setForm(prev => ({ ...prev, pincode: val.replace(/[^0-9]/g, '').slice(0, 6) }));

  const [showPrefix, setShowPrefix] = useState(false);

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleSave = async () => {
    if (!form.prefix.trim()) {
      showAlert('Validation Error', 'Prefix is required.');
      return;
    }
    if (!form.firstName.trim()) {
      showAlert('Validation Error', 'First name is required.');
      return;
    }
    if (!form.designation.trim()) {
      showAlert('Validation Error', 'Designation is required.');
      return;
    }
    if (!form.city.trim()) {
      showAlert('Validation Error', 'City is required.');
      return;
    }
    if (!form.pincode.trim()) {
      showAlert('Validation Error', 'Pincode is required.');
      return;
    }
    if (!form.source.trim()) {
      showAlert('Validation Error', 'Source is required.');
      return;
    }

    // Convert date to YYYY-MM-DD format in local timezone
    const formatDateToISO = (date: Date | null): string | undefined => {
      if (!date) return undefined;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const payload: Record<string, unknown> = {
      ...form,
      leadType: 'doctor',
      nextFollowUp: formatDateToISO(followUpDate),
      linkedPharmacy: [
        ...selectedPharmacyIds.map(id => ({ pharmacyId: id })),
        ...customPharmacies.map(p => ({
          name: p.name,
          prefix: p.prefix,
          firstName: cap(p.firstName.trim()),
          lastName: cap(p.lastName.trim()),
          phone: p.phone,
          gstin: p.gst,
          licenseNumber: p.license,
          city: p.city,
          state: p.state,
        })),
      ],
    };
    // Stable across every retry of THIS form — the server keys its replay guard on
    // it, which is what stops a timed-out submit from becoming a second lead.
    if (!(editMode && leadData?.id)) {
      payload.code = leadCodeRef.current;
    }

    setSaving(true);
    setSlowNetwork(false);
    slowTimer.current = setTimeout(() => {
      if (mounted.current) { setSlowNetwork(true); }
    }, SLOW_NETWORK_HINT_MS);

    try {
      if (editMode && leadData?.id) {
        await apiClient.patch(`/leads/${leadData.id}`, payload);
      } else {
        // 201 = created, 200 = the server already had this `code` from an earlier
        // attempt whose response never reached us. Both mean the lead is filed.
        await apiClient.post('/leads', payload);
      }

      // The submission landed, so any local copy of it is now redundant.
      if (openedDraft) { dispatch(discardLeadDraft(openedDraft.draftId)); }
      navigation.goBack();
    } catch (err: any) {
      const kind = classifyApiError(err);
      const serverMessage = extractServerMessage(err);

      // Editing an existing lead is not queued: a PATCH has no idempotency key, and
      // replaying one blindly could overwrite a newer change made elsewhere.
      const canQueue = !editMode && isRetriable(kind) && ownerId != null;

      if (canQueue) {
        const displayName = [form.prefix, form.firstName, form.lastName]
          .filter(Boolean).join(' ').trim() || 'Untitled lead';
        const draft = openedDraft
          ? { ...openedDraft, payload, displayName, status: 'pending' as const, lastErrorKind: kind }
          : buildLeadDraft({
              mrId: ownerId as number,
              leadType: 'doctor',
              code: leadCodeRef.current,
              payload,
              displayName,
            });
        await dispatch(saveLeadDraft(draft));
        // Informational, not an error: the work IS safe. A red error dialog here
        // teaches MRs to panic and resubmit, which is the habit that created
        // duplicates in the first place. Dismissing returns to the Leads list,
        // where the draft is now visible as a row.
        setAlertState({
          visible: true,
          type: 'info',
          title: 'Saved to drafts',
          message: messageForKind(kind, { queued: true, serverMessage, noun: 'lead' }),
          confirmText: 'OK',
          onConfirm: () => navigation.goBack(),
        });
      } else {
        showAlert(
          isRetriable(kind) ? 'Could not submit' : 'Error',
          messageForKind(kind, { queued: false, serverMessage, noun: 'lead' }),
        );
      }
    } finally {
      if (slowTimer.current) { clearTimeout(slowTimer.current); slowTimer.current = null; }
      if (mounted.current) {
        setSaving(false);
        setSlowNetwork(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={editMode ? 'Edit Doctor Lead' : 'Add New Lead'}
        showBack
        showNotification
        showProfile
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <InfoIcon width={16} height={16} />
          <Text style={styles.sectionTitle}>NEW PROSPECT INFORMATION</Text>
        </View>

        {/* Prefix dropdown */}
        <Field label="Prefix *">
          <TouchableOpacity
            style={styles.dropdown}
            activeOpacity={0.8}
            onPress={() => setShowPrefix(true)}
          >
            <Text style={[styles.dropdownText, form.prefix && styles.dropdownSelected]}>
              {form.prefix || 'Select Prefix'}
            </Text>
            <Down width={16} height={16} stroke={COLORS.textSecondary} />
          </TouchableOpacity>
        </Field>

        {/* First + Last name row */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="First name"
              placeholderTextColor={COLORS.textMuted}
              value={form.firstName}
              onChangeText={set('firstName')}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Last name"
              placeholderTextColor={COLORS.textMuted}
              value={form.lastName}
              onChangeText={set('lastName')}
            />
          </View>
        </View>

        {/* Designation + Specialization row */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Designation *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dermatologist"
              placeholderTextColor={COLORS.textMuted}
              value={form.designation}
              onChangeText={set('designation')}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Specialization</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Skin Care"
              placeholderTextColor={COLORS.textMuted}
              value={form.specialization}
              onChangeText={set('specialization')}
            />
          </View>
        </View>

        {/* Clinic Name */}
        <Field label="Clinic Name">
          <TextInput
            style={styles.input}
            placeholder="Clinic / Hospital"
            placeholderTextColor={COLORS.textMuted}
            value={form.clinic}
            onChangeText={set('clinic')}
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

        {/* State → City dependent dropdowns */}
        <StateCitySelector
          stateValue={form.state}
          cityValue={form.city}
          onStateChange={set('state')}
          onCityChange={set('city')}
          stateLabel="State"
          cityLabel="City *"
        />

        {/* Area / Locality */}
        <Field label="Area / Locality">
          <TextInput
            style={styles.input}
            placeholder="e.g. Vijay Nagar, Palasia"
            placeholderTextColor={COLORS.textMuted}
            value={form.area}
            onChangeText={set('area')}
          />
        </Field>

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

        {/* Pincode */}
        <Field label="Pincode *">
          <TextInput
            style={styles.input}
            placeholder="6-digit pincode"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            maxLength={6}
            value={form.pincode}
            onChangeText={setPincode}
          />
        </Field>

        {/* Google Maps Link */}
        <Field label="Google Maps Link">
          <TextInput
            style={styles.input}
            placeholder="Paste the Google Maps URL"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            keyboardType="url"
            value={form.googleMapsUrl}
            onChangeText={set('googleMapsUrl')}
          />
          <Text style={styles.helperText}>
            Carried to the Doctor/Pharmacy location map on conversion.
          </Text>
        </Field>

        {/* Phone + WhatsApp row */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Phone</Text>
            <View style={styles.phoneRow}>
              <PhoneSmallIcon width={16} height={16} />
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholder="+91 9876543210"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={form.phone}
                onChangeText={setPhoneNumber('phone')}
              />
            </View>
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>WhatsApp Number</Text>
            <TextInput
              style={styles.input}
              placeholder="WhatsApp number"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              value={form.whatsappNumber}
              onChangeText={(val) => { setSameAsPhone(false); setPhoneNumber('whatsappNumber')(val); }}
            />
          </View>
        </View>

        {/* WhatsApp same as phone toggle */}
        <TouchableOpacity
          style={styles.sameAsPhoneRow}
          activeOpacity={form.phone ? 0.7 : 1}
          onPress={toggleSameAsPhone}
          disabled={!form.phone}
        >
          <CheckboxIcon checked={sameAsPhone} faded={!form.phone} />
          <Text style={[styles.sameAsPhoneText, !form.phone && styles.sameAsPhoneTextDisabled]}>
            WhatsApp number same as phone
          </Text>
        </TouchableOpacity>

        {/* Email */}
        <Field label="Email Address">
          <TextInput
            style={styles.input}
            placeholder="xyz@example.com"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={set('email')}
          />
        </Field>

        {/* Receptionist / Other Number */}
        <Field label="Receptionist / Other Number">
          <TextInput
            style={styles.input}
            placeholder="Receptionist phone number"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            maxLength={10}
            value={form.receptionistPhone}
            onChangeText={setPhoneNumber('receptionistPhone')}
          />
        </Field>

        {/* Chemist name + phone row */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Chemist / Micropharmacy Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Nearby chemist name"
              placeholderTextColor={COLORS.textMuted}
              value={form.nearbyChemistName}
              onChangeText={set('nearbyChemistName')}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Chemist / Micropharmacy Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Chemist phone"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              value={form.nearbyChemistPhone}
              onChangeText={setPhoneNumber('nearbyChemistPhone')}
            />
          </View>
        </View>

        
        {/* Linked Pharmacies dropdown */}
        <Field label="Linked Pharmacies">
          <TouchableOpacity
            style={styles.dropdown}
            activeOpacity={0.8}
            onPress={() => setShowPharmaciesSheet(true)}
          >
            <Text style={[styles.dropdownText, (selectedPharmacyIds.length > 0 || customPharmacies.length > 0) && styles.dropdownSelected]}>
              {(selectedPharmacyIds.length + customPharmacies.length) > 0 ? `${selectedPharmacyIds.length + customPharmacies.length} Selected` : 'Select or Add Pharmacy'}
            </Text>
            <Down width={16} height={16} stroke={COLORS.textSecondary} />
          </TouchableOpacity>
        </Field>
        
        {/* Selected Pharmacies Chips */}
        {(selectedPharmacyIds.length > 0 || customPharmacies.length > 0) && (
           <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {selectedPharmacyIds.map(id => {
                 const name = assignedPharmacies.find(p => p.id === id)?.name || `Pharmacy #${id}`;
                 return (
                   <View key={`ex-${id}`} style={styles.chip}>
                     <TouchableOpacity activeOpacity={0.7} onPress={() => setShowPharmaciesSheet(true)}>
                       <Text style={styles.chipText}>{name}</Text>
                     </TouchableOpacity>
                     <TouchableOpacity onPress={() => setSelectedPharmacyIds(prev => prev.filter(pid => pid !== id))}>
                       <Text style={styles.chipClose}>✕</Text>
                     </TouchableOpacity>
                   </View>
                 );
              })}
              {customPharmacies.map((p, idx) => (
                 <View key={`c-${idx}`} style={styles.chip}>
                   <TouchableOpacity activeOpacity={0.7} onPress={() => { setEditingCustomIndex(idx); setShowCustomPharmacyModal(true); }}>
                     <Text style={styles.chipText}>{p.name} (Custom)</Text>
                   </TouchableOpacity>
                   <TouchableOpacity onPress={() => setCustomPharmacies(prev => prev.filter((_, i) => i !== idx))}>
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
        <Field label="Source *">
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

        {/* Social & Web Links */}
        <View style={styles.socialDivider} />
        <Text style={styles.socialTitle}>Social & Web Links</Text>
        <Text style={styles.socialSubtitle}>
          Optional. Paste a full URL or just a handle (e.g. @drsmith).
        </Text>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Instagram</Text>
            <TextInput
              style={styles.input}
              placeholder="@handle or full URL"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              value={form.socialInstagram}
              onChangeText={set('socialInstagram')}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Facebook</Text>
            <TextInput
              style={styles.input}
              placeholder="Page name or full URL"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              value={form.socialFacebook}
              onChangeText={set('socialFacebook')}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Website</Text>
            <TextInput
              style={styles.input}
              placeholder="example.com or https://example.com"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              keyboardType="url"
              value={form.website}
              onChangeText={set('website')}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>LinkedIn</Text>
            <TextInput
              style={styles.input}
              placeholder="@handle or full URL"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              value={form.socialLinkedIn}
              onChangeText={set('socialLinkedIn')}
            />
          </View>
        </View>

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
            <View style={styles.savingRow}>
              <ActivityIndicator color={COLORS.white} />
              {slowNetwork && (
                <Text style={styles.savingHint}>Still submitting — weak signal</Text>
              )}
            </View>
          ) : (
            <Text style={styles.saveBtnText}>
              {editMode ? 'Update Lead' : 'Save Lead'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>


      {/* Dropdown sheets */}
      <MultiSelectSheet
        visible={showPharmaciesSheet}
        title="Select Assigned Pharmacy"
        options={assignedPharmacies}
        selectedIds={selectedPharmacyIds}
        onToggle={(id) => {
          setSelectedPharmacyIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
        }}
        onAddCustom={() => { setEditingCustomIndex(null); setShowCustomPharmacyModal(true); }}
        onClose={() => setShowPharmaciesSheet(false)}
      />
      <CustomPharmacyModal
        visible={showCustomPharmacyModal}
        initialData={editingCustomIndex !== null ? customPharmacies[editingCustomIndex] : null}
        onClose={() => { setShowCustomPharmacyModal(false); setEditingCustomIndex(null); }}
        onSave={(p) => {
          setCustomPharmacies(prev =>
            editingCustomIndex !== null
              ? prev.map((c, i) => (i === editingCustomIndex ? p : c))
              : [...prev, p]
          );
          setShowCustomPharmacyModal(false);
          setEditingCustomIndex(null);
        }}
      />

      <AlertModal state={alertState} onDismiss={dismissAlert} />

      <OptionsSheet
        visible={showPrefix}
        title="Select Prefix"
        options={PREFIX_OPTIONS}
        selected={form.prefix}
        onSelect={val => set('prefix')(val)}
        onClose={() => setShowPrefix(false)}
      />
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

  helperText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textMuted,
    marginTop: 6,
  },

  sameAsPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -6,
    marginBottom: 16,
  },
  sameAsPhoneText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
  },
  sameAsPhoneTextDisabled: {
    color: COLORS.textMuted,
  },

  spacer: { height: 24 },

  socialDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  socialTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 4,
  },
  socialSubtitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textMuted,
    marginBottom: 16,
  },

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
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  savingHint: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
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

export default AddLeadScreen;
