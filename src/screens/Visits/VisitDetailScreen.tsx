/* eslint-disable react/no-unstable-nested-components */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Linking,
  PermissionsAndroid,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import {
  PhoneIconOutline,
  WhatsAppIcon,
  LocationPinIcon,
  MicIcon,
  CameraUploadIcon,
  RxIcon,
  LinkChainIcon,
  StoreIcon,
  PillIcon,
  Up,
  Down,
  AddCircle,
  MonoskinLogo,
} from '@/assets/images';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '@/redux/store';
import { setRouteNeedsRefresh } from '@/redux/slices/routeSlice';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import { captureRef } from 'react-native-view-shot';

// Width (in points) of the off-screen stage used to bake the watermark into
// each photo before upload. Kept modest to limit memory; the native capture
// is rendered at device pixel density, so the output stays sharp.
const WATERMARK_STAGE_WIDTH = 360;

type NavProp = NativeStackNavigationProp<AppStackParamList>;
type RoutePropType = RouteProp<AppStackParamList, 'VisitDetail'>;

const VISIT_TYPES = ['Lead Visit', 'Doctor Visit', 'Pharmacy Visit', 'Conference', 'Training'];
const OUTCOMES = ['Positive', 'Neutral', 'Negative', 'Follow-up Required', 'Not Met'];
const OBJECTION_CHIPS = ['Too Expensive', 'Already Prescribes Brand X', 'Needs Study'];

type DoctorDetails = {
  id: string;
  name: string;
  specialization: string;
  clinic: string;
  address: string;
  phone?: string;
  whatsappNumber?: string;
  tags?: string[];
  tier?: string;
  importance?: string;
  pharmacyNetwork?: Array<{ id: string; name: string; type: 'primary' | 'linked' }>;
  nearbyPharmacies?: Array<{ id: string; name: string; distance: string }>;
  preferredProducts?: Array<{ productId?: number | string; id?: number | string; name: string; quantity?: number; orders?: number }>;
  orderedItems?: Array<{ id: string; productId: number; name: string; quantity: number; orders: number }>;
  unpreferredProducts?: Array<{ id: string; name: string }>;
  interactionHistory?: Array<{ date: string; type: string; outcome: string; notes: string; source: string }>;
  lastVisitDate?: string;
  lastVisit?: string;
  avgTime?: string;
  orderHistory?: { productName: string; quantity: string; lastDate: string; price: string };
};

type PharmacyDetails = {
  id: string;
  name: string;
  type: string;
  address: string;
  phone?: string;
  whatsappNumber?: string;
  lastVisitDate?: string;
  lastVisit?: string;
  avgTime?: string;
  preferredProducts?: Array<{ productId?: number | string; id?: number | string; name: string; quantity?: number; orders?: number }>;
  orderedItems?: Array<{ id: string; productId: number; name: string; quantity: number; orders: number }>;
  unpreferredProducts?: Array<{ id: string; name: string }>;
  interactionHistory?: Array<{ date: string; type: string; outcome: string; notes: string; source: string }>;
  orderHistory?: { productName: string; quantity: string; lastDate: string; price: string };
};

type LeadDetails = {
  id: number;
  name: string;
  leadType: 'doctor' | 'pharmacy';
  designation?: string | null;
  specialization?: string | null;
  clinic?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  stage?: string | null;
  priority?: string | null;
};

type CatalogueItem = {
  id: string;
  name: string;
  category: string;
  packSize: string;
  price?: number;
  qty: number;
  selected: boolean;
  // Present only for sample-allocation items (not the flat /products catalogue).
  allocationId?: number;
  allocatedQty?: number;
  remainingQty?: number;
};

type SampleProduct = {
  productId: string;
  name: string;
  category: string;
  packSize: string;
  quantity: number;
  // Remaining allocated stock at the time the sample was added (for display).
  remainingQty?: number;
};

// An MR may give at most one unit of any given sample product per visit.
const MAX_SAMPLE_PER_VISIT = 1;

// Preferred products the MR records for a contact. Unlike samples, no quantity
// is captured — it's just the set of products this doctor/pharmacy/lead prefers.
type PreferredProduct = {
  productId: string;
  name: string;
  category?: string;
  packSize?: string;
};

type Attachment = { uri: string; type: string; name: string; capturedAt: number };

const formatDateTime = (raw: string): string => {
  const d = new Date(raw);
  if (isNaN(d.getTime())) { return raw; }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${dd}-${mm}-${yyyy}, ${hours}:${minutes} ${ampm}`;
};

const ModalSeparator = () => <View style={styles.modalSeparator} />;

// ── Permission helpers ────────────────────────────────────────────────────────

const requestAndroidPermission = async (
  permission: (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS],
  rationale: PermissionsAndroid.Rationale,
): Promise<'granted' | 'denied' | 'never_ask_again'> => {
  const current = await PermissionsAndroid.check(permission);
  if (current) return 'granted';
  const result = await PermissionsAndroid.request(permission, rationale);
  if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'never_ask_again';
  return 'denied';
};

const ensureCameraPermission = async (): Promise<'granted' | 'denied' | 'settings'> => {
  if (Platform.OS !== 'android') return 'granted';
  const result = await requestAndroidPermission(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Camera Permission',
    message: 'Monoskin MR needs camera access to capture a photo for this visit.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });
  if (result === 'granted') return 'granted';
  if (result === 'never_ask_again') return 'settings';
  return 'denied';
};

const ensureGalleryPermission = async (): Promise<'granted' | 'denied' | 'settings'> => {
  if (Platform.OS !== 'android') return 'granted';
  // Android 13+ (API 33+): launchImageLibrary uses the system photo picker, which needs no
  // media permission. Only legacy devices (API <= 32) require READ_EXTERNAL_STORAGE.
  if (Number(Platform.Version) >= 33) return 'granted';
  const result = await requestAndroidPermission(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE, {
    title: 'Gallery Permission',
    message: 'Monoskin MR needs access to your photo library to attach photos to this visit.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });
  if (result === 'granted') return 'granted';
  if (result === 'never_ask_again') return 'settings';
  return 'denied';
};

const VisitDetailScreen = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  console.log('🚀 ~ VisitDetailScreen ~ route:', route)
  const dispatch = useDispatch<AppDispatch>();
  const { doctorId, pharmacyId, leadId, routeStopId } = route.params;
  const profile = useSelector((state: any) => state.profile.data);
  const authUser = useSelector((state: any) => state.auth.user);
  const mrId = profile?.id ?? authUser?.id;

  const defaultVisitType = leadId
    ? 'Lead Visit'
    : pharmacyId
    ? 'Pharmacy Visit'
    : 'Doctor Visit';

  // When the screen is opened from a route stop, portfolio card or lead card,
  // the visit type is implied by the entity (doctor / pharmacy / lead) and must
  // not be changed by the user.
  const visitTypeLocked = !!(doctorId || pharmacyId || leadId);

  const [doctorData, setDoctorData] = useState<DoctorDetails | null>(null);
  const [pharmacyData, setPharmacyData] = useState<PharmacyDetails | null>(null);
  const [leadData, setLeadData] = useState<LeadDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    onOk?: () => void;
  }>({ visible: false, type: 'success', title: '', message: '' });

  const showFeedback = (
    type: 'success' | 'error',
    title: string,
    message: string,
    onOk?: () => void,
  ) => setFeedbackModal({ visible: true, type, title, message, onOk });

  const [sampleProducts, setSampleProducts] = useState<SampleProduct[]>([]);
  const [preferredProducts, setPreferredProducts] = useState<PreferredProduct[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  // Sample picker is driven by the MR's per-product allocations, kept separate
  // from `catalogue` (the flat /products list used by the preferred picker).
  const [sampleCatalogue, setSampleCatalogue] = useState<CatalogueItem[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [addSampleVisible, setAddSampleVisible] = useState(false);
  const [addPreferredVisible, setAddPreferredVisible] = useState(false);

  const [visitNote, setVisitNote] = useState('');
  const [clinicConsultationTime, setClinicConsultationTime] = useState('');
  const [mrInteractionTime, setMrInteractionTime] = useState('');
  const [doctorArrivalTime, setDoctorArrivalTime] = useState('');

  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<'clinic' | 'mr' | 'arrival' | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  // Each time field is captured as a range (start → end), e.g. "10:30 AM - 10:50 AM".
  const [pickerStep, setPickerStep] = useState<'start' | 'end'>('start');
  const [pickerStartTime, setPickerStartTime] = useState('');
  const [objections, setObjections] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  // Photos wait in this queue to have the watermark baked in (one at a time).
  const [captureQueue, setCaptureQueue] = useState<Attachment[]>([]);
  const [capturing, setCapturing] = useState<Attachment | null>(null);
  const [captureDims, setCaptureDims] = useState<{ w: number; h: number } | null>(null);
  const shotRef = useRef<View>(null);
  const [visitType, setVisitType] = useState(defaultVisitType);
  const [outcome, setOutcome] = useState('Follow-up Required');
  const [followUpDate, setFollowUpDate] = useState(''); // stored as ISO yyyy-mm-dd
  const [followUpPickerVisible, setFollowUpPickerVisible] = useState(false);
  const [followUpPickerDate, setFollowUpPickerDate] = useState(new Date());
  // Revisit date for the "Not Met" outcome (stored as ISO yyyy-mm-dd). Must be
  // today or later — the backend auto-schedules a Route Planner meeting on it.
  const [revisitOn, setRevisitOn] = useState('');
  const [revisitPickerVisible, setRevisitPickerVisible] = useState(false);
  const [revisitPickerDate, setRevisitPickerDate] = useState(new Date());
  const screenEntryTime = useRef(Date.now());
  const [location, setLocation] = useState<{
    latitude: string;
    longitude: string;
    address: string;
  } | null>(null);
  const [locationFetching, setLocationFetching] = useState(true);
  const [locationError, setLocationError] = useState('');


  const [sampleExpanded, setSampleExpanded] = useState(true);
  const [prefExpanded, setPrefExpanded] = useState(false);
  const [orderedProductsExpanded, setOrderedProductsExpanded] = useState(false);
  const [orderExpanded, setOrderExpanded] = useState(true);

  useEffect(() => {
    if (doctorId) {
      fetchDoctorDetails();
    } else if (pharmacyId) {
      fetchPharmacyDetails();
    } else if (leadId) {
      fetchLeadDetails();
    } else {
      setLoading(false);
    }
    setLocationFetching(true);
    setLocationError('');
    Geolocation.getCurrentPosition(
      async pos => {
        const lat = String(pos.coords.latitude);
        const lng = String(pos.coords.longitude);
        let address = `${lat},${lng}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'Monoskin/1.0 (test@email.com)', } },
          );
          const json = await res.json();
          if (json?.display_name) { address = json.display_name; }
        } catch (err) {
          console.log('🚀 ~ VisitDetailScreen ~ Geocoding error:', err);
        }
        setLocation({ latitude: lat, longitude: lng, address });
        setLocationFetching(false);
      },
      (err) => {
        setLocationError(err.message);
        setLocationFetching(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, pharmacyId, leadId]);

  const fetchDoctorDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(ENDPOINTS.portfolio.doctorDetail(doctorId!));
      setDoctorData(res.data);
      seedPreferredProducts(res.data?.preferredProducts);
    } catch(fetchErr) {
      console.log('🚀 ~ fetchDoctorDetails ~ error:', fetchErr);
      setError('Failed to load doctor details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPharmacyDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(ENDPOINTS.portfolio.pharmacyDetail(pharmacyId!));
      setPharmacyData(res.data);
      seedPreferredProducts(res.data?.preferredProducts);
    } catch(fetchErr) {
      console.log('🚀 ~ fetchPharmacyDetails ~ error:', fetchErr);
      setError('Failed to load pharmacy details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(ENDPOINTS.portfolio.leadDetail(leadId!));
      setLeadData(res.data);
      seedPreferredProducts(res.data?.preferredProducts);
    } catch(fetchErr) {
      console.log('🚀 ~ fetchLeadDetails ~ error:', fetchErr);
      setError('Failed to load lead details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogue = async (): Promise<CatalogueItem[]> => {
    if (catalogue.length > 0) { return catalogue; }
    try {
      setCatalogueLoading(true);
      const res = await apiClient.get(ENDPOINTS.products.list);
      const items: CatalogueItem[] = (res.data || []).map((p: any) => ({
        id: String(p.id),
        name: p.name,
        category: p.category,
        packSize: p.packSize,
        price: parseFloat(p.mrp) || 0,
        qty: 1,
        selected: false,
      }));
      setCatalogue(items);
      return items;
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load products.';
      showFeedback('error', 'Error', message);
      return [];
    } finally {
      setCatalogueLoading(false);
    }
  };

  // Sample picker source: the products the admin has allocated to this MR, with
  // remaining stock. `force` bypasses the cache to re-sync after a submit/422.
  const fetchSampleAllocations = async (force = false): Promise<CatalogueItem[]> => {
    if (!force && sampleCatalogue.length > 0) { return sampleCatalogue; }
    try {
      setCatalogueLoading(true);
      const res = await apiClient.get(ENDPOINTS.sampleAllocations.list);
      const items: CatalogueItem[] = (res.data?.data || []).map((a: any) => ({
        id: String(a.productId),
        allocationId: a.allocationId,
        name: a.name,
        category: a.category,
        packSize: a.packSize,
        allocatedQty: a.allocatedQty,
        remainingQty: a.remainingQty ?? 0,
        qty: 0,
        selected: false,
      }));
      setSampleCatalogue(items);
      return items;
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load allocated samples.';
      showFeedback('error', 'Error', message);
      return [];
    } finally {
      setCatalogueLoading(false);
    }
  };

  // Pre-fill the editable preferred list from whatever is already on the
  // contact's record so the MR edits an existing set rather than starting blank.
  const seedPreferredProducts = (
    list?: Array<{ productId?: number | string; id?: number | string; name: string }>,
  ) => {
    if (list && list.length > 0) {
      setPreferredProducts(
        list.map(p => ({ productId: String(p.productId ?? p.id ?? ''), name: p.name })),
      );
    }
  };

  const openAddPreferred = async () => {
    const baseItems = await fetchCatalogue();
    const source = baseItems.length > 0 ? baseItems : catalogue;
    setCatalogue(source.map(item => ({
      ...item,
      selected: preferredProducts.some(p => p.productId === item.id),
      qty: 0,
    })));
    setAddPreferredVisible(true);
  };

  const handleSavePreferred = () => {
    const newPreferred: PreferredProduct[] = catalogue
      .filter(c => c.selected)
      .map(c => ({
        productId: c.id,
        name: c.name,
        category: c.category,
        packSize: c.packSize,
      }));
    setPreferredProducts(newPreferred);
    setCatalogue(prev => prev.map(c => ({ ...c, selected: false, qty: 0 })));
    setAddPreferredVisible(false);
  };

  // Selection toggle for the preferred-products picker (no quantity).
  const toggleCatalogueItem = (id: string) => {
    setCatalogue(prev => prev.map(item => {
      if (item.id !== id) return item;
      const selected = !item.selected;
      return { ...item, selected, qty: selected ? Math.max(1, item.qty) : 0 };
    }));
  };

  // Cap a sample line at one unit per visit and never above remaining stock.
  const sampleQtyCap = (item: CatalogueItem) =>
    Math.min(MAX_SAMPLE_PER_VISIT, item.remainingQty ?? 0);

  const openAddSample = async () => {
    // Always re-sync on open so the remaining quantities are current.
    const baseItems = await fetchSampleAllocations(true);
    const source = baseItems.length > 0 ? baseItems : sampleCatalogue;
    setSampleCatalogue(source.map(item => {
      const existing = sampleProducts.find(p => p.productId === item.id);
      const qty = existing ? Math.min(existing.quantity, sampleQtyCap(item)) : 0;
      return { ...item, selected: qty > 0, qty };
    }));
    setAddSampleVisible(true);
  };

  const toggleSampleItem = (id: string) => {
    setSampleCatalogue(prev => prev.map(item => {
      if (item.id !== id) return item;
      if ((item.remainingQty ?? 0) <= 0) return item; // out of stock — locked
      const selected = !item.selected;
      return { ...item, selected, qty: selected ? sampleQtyCap(item) : 0 };
    }));
  };

  const updateSampleQty = (id: string, delta: number) => {
    setSampleCatalogue(prev => prev.map(item => {
      if (item.id !== id) return item;
      const qty = Math.max(0, Math.min(sampleQtyCap(item), item.qty + delta));
      return { ...item, qty, selected: qty > 0 };
    }));
  };

  const handleSaveSamples = () => {
    const selected = sampleCatalogue.filter(c => c.selected && c.qty > 0);
    const newSamples: SampleProduct[] = selected.map(c => ({
      productId: c.id,
      name: c.name,
      category: c.category,
      packSize: c.packSize,
      quantity: c.qty,
      remainingQty: c.remainingQty,
    }));
    setSampleProducts(newSamples);
    setSampleCatalogue(prev => prev.map(c => ({ ...c, selected: false, qty: 0 })));
    setAddSampleVisible(false);
  };

  const formatTime = (date: Date): string => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const applyTime = (field: typeof activeTimeField, value: string) => {
    if (field === 'clinic') { setClinicConsultationTime(value); }
    else if (field === 'mr') { setMrInteractionTime(value); }
    else if (field === 'arrival') { setDoctorArrivalTime(value); }
  };

  // Parses a "10:30 AM" fragment into a Date (today) for seeding the spinner.
  const parseTimeToDate = (timeStr: string): Date | null => {
    const match = timeStr?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) { return null; }
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (match[3].toUpperCase() === 'PM' && h !== 12) { h += 12; }
    if (match[3].toUpperCase() === 'AM' && h === 12) { h = 0; }
    const date = new Date();
    date.setHours(h, m, 0, 0);
    return date;
  };

  const resetTimePicker = () => {
    setTimePickerVisible(false);
    setActiveTimeField(null);
    setPickerStep('start');
    setPickerStartTime('');
  };

  const openTimePicker = (field: 'clinic' | 'mr' | 'arrival') => {
    const currentValue =
      field === 'clinic' ? clinicConsultationTime
      : field === 'mr' ? mrInteractionTime
      : doctorArrivalTime;
    // Seed the spinner with the existing start time if a range was set before.
    const startPart = currentValue ? currentValue.split(' - ')[0] : '';
    setPickerDate(parseTimeToDate(startPart) ?? new Date());
    setActiveTimeField(field);
    setPickerStep('start');
    setPickerStartTime('');
    setTimePickerVisible(true);
  };

  const timeToMinutes = (date: Date) => date.getHours() * 60 + date.getMinutes();

  // Ensures the end time is strictly after the start time. Returns false (and
  // alerts) when it isn't, so the caller can abort the commit.
  const isEndAfterStart = (endDate: Date): boolean => {
    const startDate = parseTimeToDate(pickerStartTime);
    if (startDate && timeToMinutes(endDate) <= timeToMinutes(startDate)) {
      Alert.alert('Invalid Time', 'End time must be after the start time.');
      return false;
    }
    return true;
  };

  // iOS "Done": confirm the start time, then advance to picking the end time;
  // on the second confirm, commit the full "start - end" range.
  const confirmTimePicker = () => {
    const formatted = formatTime(pickerDate);
    if (pickerStep === 'start') {
      setPickerStartTime(formatted);
      setPickerStep('end');
      return;
    }
    if (!isEndAfterStart(pickerDate)) { return; }
    applyTime(activeTimeField, `${pickerStartTime} - ${formatted}`);
    resetTimePicker();
  };

  // Follow-up date helpers ─ value is stored as ISO (yyyy-mm-dd) for the API,
  // and shown to the user as DD/MM/YYYY.
  const toISODate = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDateDisplay = (iso: string): string => {
    if (!iso) { return ''; }
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const openFollowUpDatePicker = () => {
    if (followUpDate) {
      const [y, m, d] = followUpDate.split('-').map(Number);
      setFollowUpPickerDate(new Date(y, m - 1, d));
    } else {
      setFollowUpPickerDate(new Date());
    }
    setFollowUpPickerVisible(true);
  };

  // "Not Met" revisit cannot be backdated — earliest selectable day is today
  // (past dates are rejected).
  const minRevisitDate = (): Date => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const openRevisitDatePicker = () => {
    if (revisitOn) {
      const [y, m, d] = revisitOn.split('-').map(Number);
      setRevisitPickerDate(new Date(y, m - 1, d));
    } else {
      setRevisitPickerDate(minRevisitDate());
    }
    setRevisitPickerVisible(true);
  };

  const toggleObjection = (chip: string) => {
    setObjections(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip],
    );
  };

  const openCamera = async () => {
    const status = await ensureCameraPermission();
    if (status === 'settings') {
      Alert.alert(
        'Camera Permission Required',
        'Camera access has been denied. Please enable it in your device Settings to take a photo.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    if (status === 'denied') return;
    launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: false }, res => {
      if (!res.didCancel && !res.errorCode && res.assets?.[0]) {
        const a = res.assets[0];
        setCaptureQueue(prev => [...prev, {
          uri: a.uri!,
          type: a.type || 'image/jpeg',
          name: a.fileName || `photo_${Date.now()}.jpg`,
          capturedAt: Date.now(),
        }]);
      }
    });
  };

  const openGallery = async () => {
    const status = await ensureGalleryPermission();
    if (status === 'settings') {
      Alert.alert(
        'Gallery Permission Required',
        'Photo library access has been denied. Please enable it in your device Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    if (status === 'denied') return;
    launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 5 }, res => {
      if (!res.didCancel && !res.errorCode && res.assets) {
        const newAtts: Attachment[] = res.assets.map(a => ({
          uri: a.uri!,
          type: a.type || 'image/jpeg',
          name: a.fileName || `photo_${Date.now()}.jpg`,
          capturedAt: Date.now(),
        }));
        setCaptureQueue(prev => [...prev, ...newAtts]);
      }
    });
  };

  const handleImageUpload = () => {
    Alert.alert('Upload Photo', 'Choose source', [
      { text: 'Camera', onPress: openCamera },
      { text: 'Gallery', onPress: openGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Pull the next queued photo onto the off-screen watermark stage.
  useEffect(() => {
    if (capturing || captureQueue.length === 0) { return; }
    setCapturing(captureQueue[0]);
    setCaptureDims(null);
    setCaptureQueue(prev => prev.slice(1));
  }, [capturing, captureQueue]);

  // Once the staged photo has loaded (so we know its aspect ratio), bake the
  // watermark in by capturing the stage, then add the result to attachments.
  useEffect(() => {
    if (!capturing || !captureDims) { return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const staged = capturing;
      try {
        const uri = await captureRef(shotRef, { format: 'jpg', quality: 0.9 });
        if (cancelled) { return; }
        const finalUri = Platform.OS === 'android' && !uri.startsWith('file://') ? `file://${uri}` : uri;
        setAttachments(prev => [...prev, {
          uri: finalUri,
          type: 'image/jpeg',
          name: staged.name.replace(/\.\w+$/, '') + '_wm.jpg',
          capturedAt: staged.capturedAt,
        }]);
      } catch (err) {
        console.log('🚀 ~ watermark capture failed:', err);
        // Fall back to the original photo so the upload still works.
        if (!cancelled) { setAttachments(prev => [...prev, staged]); }
      } finally {
        if (!cancelled) { setCapturing(null); setCaptureDims(null); }
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [capturing, captureDims]);

  const handleSubmit = async () => {
    if (!location) {
      showFeedback(
        'error',
        'Location Required',
        locationError
          ? `Unable to fetch GPS location: ${locationError}. Please enable location permissions and try again.`
          : 'GPS location is still being fetched. Please wait a moment and try again.',
      );
      return;
    }
    if (!visitType) { showFeedback('error', 'Validation', 'Please select a visit type.'); return; }
    if (!outcome) { showFeedback('error', 'Validation', 'Please select an outcome.'); return; }
    if (outcome === 'Not Met') {
      if (!revisitOn) {
        showFeedback('error', 'Validation', 'Please select a revisit date for the "Not Met" outcome.');
        return;
      }
      // Guard against a stale/past selection — today or later is valid.
      const [y, m, d] = revisitOn.split('-').map(Number);
      if (new Date(y, m - 1, d).getTime() < minRevisitDate().getTime()) {
        showFeedback('error', 'Validation', 'The revisit date cannot be in the past.');
        return;
      }
    }
    if (outcome === 'Follow-up Required' && !followUpDate) {
      showFeedback('error', 'Validation', 'Please select a follow-up date for the "Follow-up Required" outcome.');
      return;
    }
    if (!mrId) { showFeedback('error', 'Error', 'User session not found. Please login again.'); return; }

    const formData = new FormData();
    
    formData.append('mrId', String(mrId));
    if (doctorId) formData.append('doctorId', String(doctorId));
    if (pharmacyId) formData.append('pharmacyId', String(pharmacyId));
    if (leadId) formData.append('leadId', String(leadId));
    if (routeStopId) formData.append('routeStopId', String(routeStopId));
    
    formData.append('visitType', visitType);
    formData.append('outcome', outcome);
    
    if (visitNote) formData.append('notes', visitNote);
    if (clinicConsultationTime) formData.append('clinicConsultationTime', clinicConsultationTime);
    if (mrInteractionTime) formData.append('mrInteractionTime', mrInteractionTime);
    if (doctorArrivalTime) formData.append('doctorArrivalTime', doctorArrivalTime);
    
    const calculatedDuration = Math.floor((Date.now() - screenEntryTime.current) / 1000);
    formData.append('duration', String(calculatedDuration));

    if (location?.address) formData.append('location', location.address);
    if (location?.latitude) formData.append('latitude', String(location.latitude));
    if (location?.longitude) formData.append('longitude', String(location.longitude));

    if (outcome === 'Follow-up Required' && followUpDate) {
      // followUpDate is stored as the local calendar day (yyyy-mm-dd). The API
      // expects a full ISO 8601 datetime string, so anchor it at UTC midnight —
      // this preserves the picked day without any timezone shift.
      formData.append('followUpDate', `${followUpDate}T00:00:00.000Z`);
    }

    // "Not Met" → send the revisit date so the backend can auto-schedule
    // a Route Planner meeting for this doctor on that day.
    if (outcome === 'Not Met' && revisitOn) {
      formData.append('revisitOn', `${revisitOn}T00:00:00.000Z`);
    }

    if (objections.length > 0) {
      formData.append('objections', JSON.stringify(objections));
    }

    if (sampleProducts.length > 0) {
      const formattedSamples = sampleProducts.map(s => ({
        productId: Number(s.productId),
        name: s.name,
        quantity: s.quantity,
      }));
      formData.append('sampleProducts', JSON.stringify(formattedSamples));
    }

    if (preferredProducts.length > 0) {
      const formattedPreferred = preferredProducts.map(p => {
        const id = Number(p.productId);
        return {
          productId: Number.isFinite(id) ? id : null,
          name: p.name,
        };
      });
      formData.append('preferredProducts', JSON.stringify(formattedPreferred));
    }

    attachments.forEach((att) => {
      formData.append('attachments', {
        uri: att.uri,
        type: att.type,
        name: att.name,
      } as any);
    });

    try {
      setSubmitting(true);
      console.log('🚀 ~ handleSubmit ~ formData:', formData);
      await apiClient.post(ENDPOINTS.mrVisits.create, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      dispatch(setRouteNeedsRefresh(true));
      showFeedback('success', 'Success', 'Visit report submitted successfully.', () => navigation.goBack());
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      // Backend rejects (422) when a sample line exceeds the MR's remaining stock.
      if (status === 422 && Array.isArray(data?.errors)) {
        const lines = data.errors.map((e: any) => {
          const prod = sampleProducts.find(p => String(p.productId) === String(e.productId));
          const label = prod?.name ?? `Product ${e.productId}`;
          return `• ${label}: requested ${e.requested}, only ${e.remaining} left`;
        });
        // Re-sync allocations so the picker shows the corrected remaining stock.
        fetchSampleAllocations(true);
        showFeedback(
          'error',
          data?.message ?? 'Insufficient sample stock',
          `${lines.join('\n')}\n\nPlease adjust the samples and submit again.`,
        );
      } else {
        showFeedback('error', 'Error', 'Failed to submit visit report. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const SectionLabel = ({ title, right }: { title: string; right?: React.ReactNode }) => (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {right}
    </View>
  );

  const CollapsibleSection = ({
    title, expanded, onToggle, children, rightNode,
  }: {
    title: string; expanded: boolean; onToggle: () => void;
    children: React.ReactNode; rightNode?: React.ReactNode;
  }) => (
    <View style={styles.collapsibleCard}>
      <TouchableOpacity
        style={[styles.collapsibleHeader, expanded && styles.collapsibleHeaderExpanded]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <Text style={styles.collapsibleTitle}>{title}</Text>
        <View style={styles.collapsibleRight}>
          {rightNode}
          {expanded ? <Up width={16} height={16} /> : <Down width={16} height={16} />}
        </View>
      </TouchableOpacity>
      {expanded && <View style={styles.collapsibleContent}>{children}</View>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <Header title="Visit Details" showBack showNotification showProfile />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.buttonBlue} />
          <Text style={styles.centerStateText}>Loading visit details...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.safeArea}>
        <Header title="Visit Details" showBack showNotification showProfile />
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={leadId ? fetchLeadDetails : pharmacyId ? fetchPharmacyDetails : fetchDoctorDetails}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const entityName = doctorData?.name ?? pharmacyData?.name ?? leadData?.name;
  const initials = entityName
    ?.split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('') ?? (pharmacyId ? 'PH' : leadId ? 'LD' : 'DR');

  return (
    <View style={styles.safeArea}>
      <Header title="Visit Details" showBack showNotification showProfile />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!submitting}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >

        {/* Profile Card */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorAvatarWrapper}>
            <View style={styles.doctorAvatar}>
              <Text style={styles.doctorAvatarText}>{initials}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{entityName ?? '—'}</Text>
            {/* <Text style={styles.doctorSpecialty}>
              {doctorData?.specialization ?? pharmacyData?.type ?? '—'}
            </Text> */}
            <View style={styles.doctorLocationRow}>
              <LocationPinIcon width={13} height={13} style={{ marginTop: 3 }}  />
              <Text style={styles.doctorHospital}>
                {doctorData?.clinic ?? doctorData?.address ?? pharmacyData?.address ?? leadData?.clinic ?? leadData?.address ?? '—'}
              </Text>
            </View>
            {(doctorData?.tier || doctorData?.importance) && (
              <View style={styles.tagRow}>
                {doctorData?.tier && (
                  <View style={styles.tierBadge}>
                    <Text style={styles.tierBadgeText}>Tier {doctorData.tier}</Text>
                  </View>
                )}
                {doctorData?.importance && (
                  <View style={styles.importanceBadge}>
                    <Text style={styles.importanceBadgeText}>{doctorData.importance}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <View style={styles.doctorActions}>
            <TouchableOpacity
              style={[styles.contactBtn, {backgroundColor: "transparent", borderWidth: 1, borderColor: COLORS.black}]}
              onPress={() => {
                const phone = doctorData?.phone ?? pharmacyData?.phone ?? leadData?.phone;
                if (phone) { Linking.openURL(`tel:${phone}`); }
              }}
            >
              <PhoneIconOutline width={18} height={18} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => {
                const whatsapp = doctorData?.whatsappNumber ?? pharmacyData?.whatsappNumber ?? leadData?.whatsappNumber;
                if (whatsapp) { Linking.openURL(`whatsapp://send?phone=${whatsapp}`); }
              }}
            >
              <WhatsAppIcon width={18} height={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{leadData ? 'STAGE' : 'LAST VISIT'}</Text>
            <Text style={styles.statValue}>
              {leadData
                ? leadData.stage ?? '—'
                : (doctorData?.lastVisitDate || pharmacyData?.lastVisitDate)
                ? formatDateTime(doctorData?.lastVisitDate ?? pharmacyData?.lastVisitDate!)
                : doctorData?.lastVisit ?? pharmacyData?.lastVisit ?? '—'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{leadData ? 'PRIORITY' : 'AVG TIME'}</Text>
            <Text style={styles.statValue}>
              {leadData
                ? leadData.priority ?? '—'
                : doctorData?.avgTime ?? pharmacyData?.avgTime ?? '—'}
            </Text>
          </View>
        </View>

        {/* Visit Type */}
        <SectionLabel title="VISIT TYPE" />
        <View style={styles.chipsRow}>
          {VISIT_TYPES.map(type => {
            const isSelected = visitType === type;
            const isDisabled = visitTypeLocked && !isSelected;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.chip,
                  isSelected && styles.chipActive,
                  isDisabled && styles.chipDisabled,
                ]}
                onPress={() => { if (!visitTypeLocked) setVisitType(type); }}
                disabled={isDisabled}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{type}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Outcome */}
        <SectionLabel title="OUTCOME" />
        <View style={styles.chipsRow}>
          {OUTCOMES.map(o => (
            <TouchableOpacity
              key={o}
              style={[styles.chip, outcome === o && styles.chipActive]}
              onPress={() => setOutcome(o)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, outcome === o && styles.chipTextActive]}>{o}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Revisit date — required when outcome is "Not Met" */}
        {outcome === 'Not Met' && (
          <>
            <Text style={styles.timeFieldLabel}>Revisit On *</Text>
            <TouchableOpacity
              style={styles.timeFieldInput}
              activeOpacity={0.7}
              onPress={openRevisitDatePicker}
            >
              <Text style={revisitOn ? styles.timeFieldValue : styles.timeFieldPlaceholder}>
                {revisitOn ? formatDateDisplay(revisitOn) : 'Select a future revisit date'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.revisitHint}>
              A Route Planner meeting will be auto-scheduled for this date.
            </Text>
          </>
        )}

        {/* Follow-up date — required when outcome is "Follow-up Required".
            Shown right below the outcome so the MR can pick it instantly. The
            visit gets rescheduled to this date (handled by the backend). */}
        {outcome === 'Follow-up Required' && (
          <>
            <Text style={styles.timeFieldLabel}>Follow-up Date *</Text>
            <TouchableOpacity
              style={styles.timeFieldInput}
              activeOpacity={0.7}
              onPress={openFollowUpDatePicker}
            >
              <Text style={followUpDate ? styles.timeFieldValue : styles.timeFieldPlaceholder}>
                {followUpDate ? formatDateDisplay(followUpDate) : 'Select a follow-up date'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.revisitHint}>
              The visit will be rescheduled to this date.
            </Text>
          </>
        )}

        {/* {location && (
          <Text style={styles.gpsIndicator}>Location captured</Text>
        )} */}

        {/* Sample Products */}
        <CollapsibleSection
          title="Sample Products"
          expanded={sampleExpanded}
          onToggle={() => setSampleExpanded(p => !p)}
          rightNode={
            <TouchableOpacity onPress={openAddSample} style={styles.addSampleBtn} activeOpacity={0.8}>
              <AddCircle width={16} height={16} />
              <Text style={styles.addSampleText}>  Add</Text>
            </TouchableOpacity>
          }
        >
          {sampleProducts.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No samples added yet. Tap "+ Add" to select products.</Text>
            </View>
          ) : (
            sampleProducts.map((product, i) => (
              <TouchableOpacity
                key={product.productId}
                style={[styles.productRow, i < sampleProducts.length - 1 && styles.productRowBorder]}
                onPress={openAddSample}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productSubText}>{product.category} • {product.packSize}</Text>
                  {product.remainingQty != null && (
                    <Text style={styles.productSubText}>Available: {product.remainingQty}</Text>
                  )}
                </View>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyBadgeText}>x{product.quantity}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </CollapsibleSection>

        {/* Pharmacy Network – only when API provides it */}
        {doctorData?.pharmacyNetwork && doctorData.pharmacyNetwork.length > 0 && (
          <>
            <SectionLabel
              title="PHARMACY NETWORK"
              right={
                <View style={styles.activeNodesBadge}>
                  <Text style={styles.activeNodesText}>
                    {doctorData.pharmacyNetwork.length} ACTIVE NODES
                  </Text>
                </View>
              }
            />
            {doctorData.pharmacyNetwork.map((ph, i) => (
              <View key={ph.id} style={[styles.pharmacyCard, i > 0 && { marginTop: 10 }]}>
                <View style={styles.pharmacyRow}>
                  <View style={styles.pharmacyIconBox}>
                    {ph.type === 'primary'
                      ? <RxIcon width={22} height={22} />
                      : <LinkChainIcon width={22} height={22} />}
                  </View>
                  <View style={styles.pharmacyTextBlock}>
                    <Text style={styles.pharmacyName}>{ph.name}</Text>
                    <Text style={styles.pharmacyType}>
                      {ph.type === 'primary' ? 'PRIMARY PHARMACY' : 'LINKED PHARMACY'}
                    </Text>
                  </View>
                  {ph.type === 'primary'
                    ? <View style={styles.primaryBadge}><Text style={styles.primaryBadgeText}>PRIMARY</Text></View>
                    : <Text style={styles.linkedText}>LINKED</Text>}
                </View>
              </View>
            ))}
            <View style={{ marginBottom: 16 }} />
          </>
        )}

        {/* Nearby – only when API provides it */}
        {doctorData?.nearbyPharmacies && doctorData.nearbyPharmacies.length > 0 && (
          <>
            <SectionLabel title="NEARBY / ASSOCIATED" />
            <View style={styles.nearbyGrid}>
              {doctorData.nearbyPharmacies.map((place, i) => (
                <View key={i} style={styles.nearbyCard}>
                  <View style={styles.nearbyIconBox}>
                    <StoreIcon width={20} height={20} />
                  </View>
                  <Text style={styles.nearbyName}>{place.name}</Text>
                  <Text style={styles.nearbyDist}>{place.distance}</Text>
                </View>
              ))}
            </View>
          </>
        )}

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
          {/* <TouchableOpacity
            style={[styles.micButton, { opacity: 0.35 }]}
            onPress={handleMicPress}
            activeOpacity={0.7}
          >
            <MicIcon width={20} height={20} />
          </TouchableOpacity> */}
        </View>

        <Text style={styles.timeFieldLabel}>Patient Time</Text>
        <TouchableOpacity
          style={styles.timeFieldInput}
          activeOpacity={0.7}
          onPress={() => openTimePicker('clinic')}
        >
          <Text style={clinicConsultationTime ? styles.timeFieldValue : styles.timeFieldPlaceholder}>
            {clinicConsultationTime || 'Select time range (e.g. 10:30 AM - 10:50 AM)'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.timeFieldLabel}>MR Interaction Time</Text>
        <TouchableOpacity
          style={styles.timeFieldInput}
          activeOpacity={0.7}
          onPress={() => openTimePicker('mr')}
        >
          <Text style={mrInteractionTime ? styles.timeFieldValue : styles.timeFieldPlaceholder}>
            {mrInteractionTime || 'Select time range (e.g. 10:45 AM - 11:00 AM)'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.timeFieldLabel}>Doctor Arrival Time</Text>
        <TouchableOpacity
          style={styles.timeFieldInput}
          activeOpacity={0.7}
          onPress={() => openTimePicker('arrival')}
        >
          <Text style={doctorArrivalTime ? styles.timeFieldValue : styles.timeFieldPlaceholder}>
            {doctorArrivalTime || 'Select time range (e.g. 11:00 AM - 11:15 AM)'}
          </Text>
        </TouchableOpacity>

        {/* Objection Handling */}
        <SectionLabel title="OBJECTION HANDLING" />
        <View style={styles.chipsRow}>
          {OBJECTION_CHIPS.map(chip => {
            const active = objections.includes(chip);
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
        {attachments.length > 0 && (
          <View style={styles.attachmentsRow}>
            {attachments.map((att, i) => (
              <TouchableOpacity
                key={i}
                style={styles.attachmentThumb}
                activeOpacity={0.85}
                onPress={() => setViewerIndex(i)}
              >
                <Image source={{ uri: att.uri }} style={styles.attachmentThumbImage} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.attachmentRemoveBtn}
                  activeOpacity={0.8}
                  onPress={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.attachmentRemoveText}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {(capturing || captureQueue.length > 0) && (
          <View style={styles.watermarkingRow}>
            <ActivityIndicator size="small" color={COLORS.buttonBlue} />
            <Text style={styles.watermarkingText}>Adding watermark…</Text>
          </View>
        )}
        <TouchableOpacity style={styles.uploadCard} activeOpacity={0.8} onPress={handleImageUpload}>
          <CameraUploadIcon width={32} height={32} />
          <Text style={styles.uploadTitle}>
            {attachments.length > 0 ? 'Upload More Documents' : 'Upload Documents'}
          </Text>
          <Text style={styles.uploadSubtitle}>JPEG or PNG, Max 5MB</Text>
        </TouchableOpacity>

        {/* Preferred Products – editable: MR selects products (no quantity) */}
        <CollapsibleSection
          title="Preferred Products"
          expanded={prefExpanded}
          onToggle={() => setPrefExpanded(p => !p)}
          rightNode={
            <TouchableOpacity onPress={openAddPreferred} style={styles.addSampleBtn} activeOpacity={0.8}>
              <AddCircle width={16} height={16} />
              <Text style={styles.addSampleText}>  Add</Text>
            </TouchableOpacity>
          }
        >
          {preferredProducts.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No preferred products added yet. Tap "+ Add" to select products.</Text>
            </View>
          ) : (
            preferredProducts.map((product, i) => (
              <TouchableOpacity
                key={product.productId}
                style={[styles.productRow, i < preferredProducts.length - 1 && styles.productRowBorder]}
                onPress={openAddPreferred}
                activeOpacity={0.7}
              >
                <View style={styles.productIconRow}>
                  <PillIcon width={16} height={16} />
                  <Text style={styles.productName}>  {product.name}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </CollapsibleSection>

        {/* Ordered Products – read-only list of the contact's products on record */}
        <CollapsibleSection
          title="Ordered Products"
          expanded={orderedProductsExpanded}
          onToggle={() => setOrderedProductsExpanded(p => !p)}
        >
          {(() => {
            const prods = doctorData?.orderedItems ?? pharmacyData?.orderedItems;
            return prods && prods.length > 0 ? (
              prods.map((prod, i) => (
                <View
                  key={String(prod.id ?? prod.productId ?? i)}
                  style={[styles.productRow, i < prods.length - 1 && styles.productRowBorder]}
                >
                  <View style={styles.productIconRow}>
                    <PillIcon width={16} height={16} />
                    <Text style={styles.productName}>  {prod.name}</Text>
                  </View>
                  <Text style={styles.productMeta}>
                    {prod.quantity} units · {prod.orders} {prod.orders === 1 ? 'order' : 'orders'}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No ordered products on record.</Text>
              </View>
            );
          })()}
        </CollapsibleSection>

        {/* Interaction History */}
        {(() => {
          const history = doctorData?.interactionHistory ?? pharmacyData?.interactionHistory;
          return history && history.length > 0 ? (
            <>
              <SectionLabel title="INTERACTION HISTORY" />
              <View style={styles.timelineContainer}>
                {history.map((item, i) => (
                  <View key={i} style={styles.timelineRow}>
                    <View style={styles.timelineDotWrapper}>
                      <View style={styles.timelineDot} />
                      {i < history.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineDate}>{formatDateTime(item.date)}</Text>
                      {(item.type || item.outcome) && (
                        <Text style={styles.timelineSubText}>
                          {[item.type, item.outcome].filter(Boolean).join(' · ')}
                        </Text>
                      )}
                      {item.notes ? (
                        <Text style={styles.timelineNotes} numberOfLines={2}>{item.notes}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null;
        })()}

        {/* Order History */}
        {(doctorData?.orderHistory ?? pharmacyData?.orderHistory) && (
          <CollapsibleSection
            title="Order History"
            expanded={orderExpanded}
            onToggle={() => setOrderExpanded(p => !p)}
          >
            <View style={styles.orderCard}>
              {[
                { label: 'Product Name:', value: (doctorData?.orderHistory ?? pharmacyData?.orderHistory)!.productName },
                { label: 'Quantity:', value: (doctorData?.orderHistory ?? pharmacyData?.orderHistory)!.quantity },
                { label: 'Last Date:', value: (doctorData?.orderHistory ?? pharmacyData?.orderHistory)!.lastDate },
                { label: 'Product Price:', value: (doctorData?.orderHistory ?? pharmacyData?.orderHistory)!.price },
              ].map(({ label, value }, i) => (
                <View key={i} style={styles.orderRow}>
                  <Text style={styles.orderLabel}>{label}</Text>
                  <Text style={styles.orderValue}>{value}</Text>
                </View>
              ))}
            </View>
          </CollapsibleSection>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Submit Report */}
      <View style={styles.submitContainer}>
        {locationError ? (
          <View style={styles.gpsErrorBanner}>
            <Text style={styles.gpsErrorText}>GPS unavailable: {locationError}</Text>
          </View>
        ) : !location ? (
          <View style={styles.gpsErrorBanner}>
            <Text style={styles.gpsErrorText}>Fetching GPS location…</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={[styles.submitButton, (submitting || !location) && styles.submitButtonDisabled]}
          activeOpacity={0.85}
          onPress={() => setConfirmVisible(true)}
          disabled={submitting || !location}
        >
          {submitting
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.submitButtonText}>Submit Report</Text>}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>

      {/* Feedback Modal (Success / Error) */}
      <Modal
        visible={feedbackModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[styles.feedbackIconCircle, feedbackModal.type === 'success' ? styles.feedbackIconSuccess : styles.feedbackIconError]}>
              <Text style={styles.feedbackIconText}>{feedbackModal.type === 'success' ? '✓' : '!'}</Text>
            </View>
            <Text style={[styles.feedbackTitle, feedbackModal.type === 'success' ? styles.feedbackTitleSuccess : styles.feedbackTitleError]}>
              {feedbackModal.title}
            </Text>
            <Text style={styles.feedbackMessage}>{feedbackModal.message}</Text>
            <TouchableOpacity
              style={[styles.feedbackOkBtn, feedbackModal.type === 'success' ? styles.feedbackOkSuccess : styles.feedbackOkError]}
              activeOpacity={0.85}
              onPress={() => {
                const cb = feedbackModal.onOk;
                setFeedbackModal(prev => ({ ...prev, visible: false }));
                cb?.();
              }}
            >
              <Text style={styles.confirmYesText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirm Submit Modal */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmHeading}>Are you sure want to submit this report?</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                activeOpacity={0.8}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmYesBtn}
                activeOpacity={0.85}
                onPress={() => { setConfirmVisible(false); handleSubmit(); }}
              >
                <Text style={styles.confirmYesText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* iOS — bottom sheet with spinner wheel */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={timePickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setTimePickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.timePickerOverlay}
            activeOpacity={1}
            onPress={resetTimePicker}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.timePickerSheet}>
                <View style={styles.timePickerHandle} />
                <View style={styles.timePickerIOSHeader}>
                  <TouchableOpacity onPress={resetTimePicker}>
                    <Text style={styles.timePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.timePickerTitle}>
                    {pickerStep === 'start' ? 'Select Start Time' : 'Select End Time'}
                  </Text>
                  <TouchableOpacity onPress={confirmTimePicker}>
                    <Text style={styles.timePickerDoneText}>
                      {pickerStep === 'start' ? 'Next' : 'Done'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={pickerDate}
                  mode="time"
                  display="spinner"
                  themeVariant="light"
                  onValueChange={(_e, date) => setPickerDate(date)}
                  style={styles.timePickerSpinner}
                />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Android — native time picker dialog (OS dialog has its own Cancel/OK) */}
      {Platform.OS === 'android' && timePickerVisible && (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          display="default"
          onValueChange={(_e, date) => {
            if (!date) { return; }
            const formatted = formatTime(date);
            if (pickerStep === 'start') {
              // Capture start, then reopen the dialog to pick the end time.
              setPickerStartTime(formatted);
              setPickerStep('end');
              setPickerDate(date);
              setTimePickerVisible(false);
              setTimeout(() => setTimePickerVisible(true), 0);
              return;
            }
            if (!isEndAfterStart(date)) {
              // Keep the start; reopen the dialog so the user re-picks the end.
              setTimePickerVisible(false);
              setTimeout(() => setTimePickerVisible(true), 0);
              return;
            }
            applyTime(activeTimeField, `${pickerStartTime} - ${formatted}`);
            resetTimePicker();
          }}
          onDismiss={resetTimePicker}
        />
      )}

      {/* Follow-up date picker — iOS bottom sheet */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={followUpPickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setFollowUpPickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.timePickerOverlay}
            activeOpacity={1}
            onPress={() => setFollowUpPickerVisible(false)}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.timePickerSheet}>
                <View style={styles.timePickerHandle} />
                <View style={styles.timePickerIOSHeader}>
                  <TouchableOpacity onPress={() => setFollowUpPickerVisible(false)}>
                    <Text style={styles.timePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.timePickerTitle}>Select Follow-up Date</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setFollowUpDate(toISODate(followUpPickerDate));
                      setFollowUpPickerVisible(false);
                    }}
                  >
                    <Text style={styles.timePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={followUpPickerDate}
                  mode="date"
                  display="spinner"
                  themeVariant="light"
                  minimumDate={new Date()}
                  onValueChange={(_e, date) => { if (date) { setFollowUpPickerDate(date); } }}
                  style={styles.timePickerSpinner}
                />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Follow-up date picker — Android native dialog */}
      {Platform.OS === 'android' && followUpPickerVisible && (
        <DateTimePicker
          value={followUpPickerDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onValueChange={(_e, date) => {
            setFollowUpPickerVisible(false);
            if (date) {
              setFollowUpDate(toISODate(date));
            }
          }}
          onDismiss={() => setFollowUpPickerVisible(false)}
        />
      )}

      {/* Revisit date picker — iOS bottom sheet (future dates only) */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={revisitPickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setRevisitPickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.timePickerOverlay}
            activeOpacity={1}
            onPress={() => setRevisitPickerVisible(false)}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.timePickerSheet}>
                <View style={styles.timePickerHandle} />
                <View style={styles.timePickerIOSHeader}>
                  <TouchableOpacity onPress={() => setRevisitPickerVisible(false)}>
                    <Text style={styles.timePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.timePickerTitle}>Select Revisit Date</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setRevisitOn(toISODate(revisitPickerDate));
                      setRevisitPickerVisible(false);
                    }}
                  >
                    <Text style={styles.timePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={revisitPickerDate}
                  mode="date"
                  display="spinner"
                  themeVariant="light"
                  minimumDate={minRevisitDate()}
                  onValueChange={(_e, date) => { if (date) { setRevisitPickerDate(date); } }}
                  style={styles.timePickerSpinner}
                />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Revisit date picker — Android native dialog (today onwards) */}
      {Platform.OS === 'android' && revisitPickerVisible && (
        <DateTimePicker
          value={revisitPickerDate}
          mode="date"
          display="default"
          minimumDate={minRevisitDate()}
          onValueChange={(_e, date) => {
            setRevisitPickerVisible(false);
            if (date) {
              setRevisitOn(toISODate(date));
            }
          }}
          onDismiss={() => setRevisitPickerVisible(false)}
        />
      )}

      {/* Off-screen stage that bakes the watermark into the photo before upload */}
      {capturing && (
        <View
          ref={shotRef}
          collapsable={false}
          style={[
            styles.captureStage,
            captureDims
              ? { height: WATERMARK_STAGE_WIDTH * captureDims.h / captureDims.w }
              : null,
          ]}
        >
          <Image
            source={{ uri: capturing.uri }}
            style={styles.captureImage}
            resizeMode="cover"
            onLoad={e => {
              const { width, height } = e.nativeEvent.source;
              if (width && height) { setCaptureDims({ w: width, h: height }); }
            }}
          />
          <View style={styles.watermarkBar}>
            <View style={styles.watermarkLogo}>
              <MonoskinLogo width={100} height={21} />
            </View>
            <Text style={styles.watermarkTimestamp}>
              {formatDateTime(new Date(capturing.capturedAt).toISOString())}
            </Text>
          </View>
        </View>
      )}

      {/* Image Viewer Modal — photo already carries the baked-in watermark */}
      <Modal
        visible={viewerIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerIndex(null)}
      >
        <View style={styles.viewerOverlay}>
          <TouchableOpacity
            style={styles.viewerBackdrop}
            activeOpacity={1}
            onPress={() => setViewerIndex(null)}
          />
          {viewerIndex !== null && attachments[viewerIndex] && (
            <View style={styles.viewerContent}>
              <View style={styles.viewerImageWrapper}>
                <Image
                  source={{ uri: attachments[viewerIndex].uri }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.viewerCounter}>
                {viewerIndex + 1} / {attachments.length}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.viewerCloseBtn}
            activeOpacity={0.8}
            onPress={() => setViewerIndex(null)}
          >
            <Text style={styles.viewerCloseText}>×</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Fullscreen Submitting Loader */}
      {submitting && (
        <View style={styles.fullscreenLoader} pointerEvents="box-only">
          <View style={styles.fullscreenLoaderBox}>
            <ActivityIndicator size="large" color={COLORS.buttonBlue} />
            <Text style={styles.fullscreenLoaderText}>Submitting Visit...</Text>
          </View>
        </View>
      )}

      {/* Product Selection Modal */}
      <Modal
        visible={addSampleVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddSampleVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddSampleVisible(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select Sample Products</Text>
          {catalogueLoading && (
            <ActivityIndicator size="small" color={COLORS.buttonBlue} style={styles.catalogueLoader} />
          )}
          <FlatList
            data={sampleCatalogue}
            keyExtractor={item => item.id}
            style={styles.modalList}
            ListEmptyComponent={
              catalogueLoading ? null : (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>
                    No sample stock allocated to you yet.
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => {
              const remaining = item.remainingQty ?? 0;
              const outOfStock = remaining <= 0;
              const atMax = item.qty >= Math.min(MAX_SAMPLE_PER_VISIT, remaining);
              return (
                <View style={[styles.modalItem, outOfStock && styles.modalItemDisabled]}>
                  <TouchableOpacity
                    style={[styles.checkbox, item.selected && styles.checkboxSelected]}
                    onPress={() => toggleSampleItem(item.id)}
                    disabled={outOfStock}
                    activeOpacity={0.8}
                  >
                    {item.selected && <Text style={styles.checkboxTick}>✓</Text>}
                  </TouchableOpacity>
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemTime}>{item.name}</Text>
                    <Text style={styles.modalItemDesc}>{item.category} • {item.packSize}</Text>
                    <Text style={[styles.modalItemAvail, outOfStock && styles.modalItemAvailEmpty]}>
                      {outOfStock ? 'Out of stock' : `Available: ${remaining}`}
                    </Text>
                  </View>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => updateSampleQty(item.id, -1)}
                      disabled={outOfStock || item.qty <= 0}
                    >
                      <Text style={[styles.stepperBtnText, (outOfStock || item.qty <= 0) && styles.stepperBtnTextDisabled]}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{item.qty}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => updateSampleQty(item.id, 1)}
                      disabled={outOfStock || atMax}
                    >
                      <Text style={[styles.stepperBtnText, (outOfStock || atMax) && styles.stepperBtnTextDisabled]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ItemSeparatorComponent={ModalSeparator}
          />
          <View style={styles.modalFooter}>
            {(() => {
              const canSave = sampleCatalogue.some(c => c.selected && c.qty > 0);
              return (
                <TouchableOpacity
                  style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                  onPress={handleSaveSamples}
                  disabled={!canSave}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveBtnText}>Save Samples</Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Preferred Product Selection Modal – selection only, no quantity */}
      <Modal
        visible={addPreferredVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddPreferredVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddPreferredVisible(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select Preferred Products</Text>
          {catalogueLoading && (
            <ActivityIndicator size="small" color={COLORS.buttonBlue} style={styles.catalogueLoader} />
          )}
          <FlatList
            data={catalogue}
            keyExtractor={item => item.id}
            style={styles.modalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => toggleCatalogueItem(item.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, item.selected && styles.checkboxSelected]}>
                  {item.selected && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                <View style={styles.modalItemInfo}>
                  <Text style={styles.modalItemTime}>{item.name}</Text>
                  <Text style={styles.modalItemDesc}>{item.category} • {item.packSize}</Text>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={ModalSeparator}
          />
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSavePreferred}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>Save Preferred</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  centerStateText: { marginTop: 12, fontSize: FONTS.size.md, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },
  errorText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.error, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: COLORS.buttonBlue, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryBtnText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.white },

  // Doctor Card
  doctorCard: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: COLORS.border, borderRadius: 14, padding: 14, marginBottom: 14,
  },
  doctorAvatarWrapper: { position: 'relative', marginRight: 14 },
  doctorAvatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(46,80,178,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  doctorAvatarText: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2, width: 12, height: 12,
    borderRadius: 6, backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.white,
  },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  doctorSpecialty: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.buttonBlue, marginBottom: 4 },
  doctorLocationRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  doctorHospital: { flex: 1, marginLeft: 6, fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  tierBadge: { backgroundColor: 'rgba(46,80,178,0.1)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  tierBadgeText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },
  importanceBadge: { backgroundColor: 'rgba(56,142,60,0.1)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  importanceBadgeText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.success },
  doctorActions: { gap: 8 },
  contactBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.buttonBlue,
    justifyContent: 'center', alignItems: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, marginBottom: 16, overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statLabel: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.textSecondary, letterSpacing: 0.4, marginBottom: 4 },
  statValue: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 10 },

  // Section label
  sectionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 6 },
  sectionLabel: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.textDark, letterSpacing: 0.5 },

  // Chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: COLORS.buttonBlue, borderColor: COLORS.buttonBlue },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: COLORS.textDark },
  chipTextActive: { color: COLORS.white },

  gpsIndicator: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.regular, color: COLORS.success, marginBottom: 16 },

  // Collapsible
  collapsibleCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  collapsibleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  collapsibleHeaderExpanded: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  collapsibleRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  collapsibleContent: {},
  collapsibleTitle: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textSecondary },

  // Add Sample
  addSampleBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  addSampleText: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },

  // Product rows
  productRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  productRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  productIconRow: { flexDirection: 'row', alignItems: 'center' },
  productName: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },
  productMeta: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.regular, color: COLORS.textMuted },
  productSubText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.regular, color: COLORS.textMuted, marginTop: 2 },
  qtyBadge: { backgroundColor: 'rgba(46,80,178,0.1)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  qtyBadgeText: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },
  emptyRow: { paddingHorizontal: 16, paddingVertical: 14 },
  emptyText: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textMuted },

  // Pharmacy Network
  activeNodesBadge: { backgroundColor: 'rgba(46,80,178,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  activeNodesText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },
  pharmacyCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 4 },
  pharmacyRow: { flexDirection: 'row', alignItems: 'center' },
  pharmacyIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(46,80,178,0.08)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  pharmacyTextBlock: { flex: 1 },
  pharmacyName: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 2 },
  pharmacyType: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.textSecondary, letterSpacing: 0.4 },
  primaryBadge: { backgroundColor: COLORS.buttonBlue, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  primaryBadgeText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.white },
  linkedText: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.success },

  // Nearby
  nearbyGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  nearbyCard: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12 },
  nearbyIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(46,80,178,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  nearbyName: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 4 },
  nearbyDist: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },

  // Visit Notes
  notesInputWrapper: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, minHeight: 60,
  },
  notesInput: {
    flex: 1, fontSize: FONTS.size.md, fontFamily: FONTS.family.regular,
    color: COLORS.textDark, padding: 0, maxHeight: 100,
  },
  micButton: { padding: 4, marginLeft: 8, justifyContent: 'center', alignItems: 'center' },

  // Listening indicator
  notesInputWrapperActive: { borderColor: COLORS.buttonBlue, borderWidth: 1.5 },
  micActiveWrapper: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  micPulseRing: {
    position: 'absolute', width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(211,47,47,0.2)',
  },
  micActiveDot: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#D32F2F',
  },
  listeningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(211,47,47,0.07)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, marginTop: -8, marginBottom: 12,
  },
  listeningDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D32F2F' },
  listeningBannerText: {
    fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: '#D32F2F',
  },

  // Time fields in Visit Notes
  timeFieldLabel: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: COLORS.textSecondary, marginBottom: 6, marginTop: 2 },
  timeFieldInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    marginBottom: 14, justifyContent: 'center',
  },
  timeFieldValue: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textDark },
  timeFieldPlaceholder: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textMuted },
  revisitHint: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.regular, color: COLORS.textSecondary, marginTop: -8, marginBottom: 14 },

  // Time Picker Modal (iOS sheet)
  timePickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  timePickerSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  timePickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D0D0D0', alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  timePickerIOSHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  timePickerTitle: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark },
  timePickerCancelText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textSecondary },
  timePickerDoneText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue },
  timePickerSpinner: { width: '100%' },

  // Documentation
  attachmentsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  attachmentThumb: {
    width: 80, height: 80, borderRadius: 10, backgroundColor: '#F0F2F8', overflow: 'hidden',
  },
  attachmentThumbImage: { width: '100%', height: '100%' },
  attachmentRemoveBtn: {
    position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center',
  },
  attachmentRemoveText: { color: COLORS.white, fontSize: 14, lineHeight: 16, fontFamily: FONTS.family.bold },
  watermarkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  watermarkingText: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: COLORS.textSecondary },

  // Off-screen watermark capture stage
  captureStage: {
    position: 'absolute', left: -10000, top: 0,
    width: WATERMARK_STAGE_WIDTH, height: WATERMARK_STAGE_WIDTH,
    backgroundColor: '#000', overflow: 'hidden',
  },
  captureImage: { width: '100%', height: '100%' },

  // Image Viewer Modal
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  viewerBackdrop: { ...StyleSheet.absoluteFillObject },
  viewerContent: { width: '90%', alignItems: 'center' },
  viewerImageWrapper: {
    width: '100%', aspectRatio: 3 / 4, borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#000', justifyContent: 'center',
  },
  viewerImage: { width: '100%', height: '100%' },
  watermarkBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#000',
  },
  watermarkLogo: {},
  watermarkTimestamp: {
    fontSize: FONTS.size.xs, fontFamily: FONTS.family.bold, color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  viewerCounter: { marginTop: 14, fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: COLORS.white },
  viewerCloseBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 24, right: 20,
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  viewerCloseText: { color: COLORS.white, fontSize: 26, lineHeight: 28, fontFamily: FONTS.family.regular },
  uploadCard: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: '#F8F9FB',
    alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20, marginBottom: 8,
  },
  uploadTitle: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginTop: 10, marginBottom: 4 },
  uploadSubtitle: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },

  // Timeline
  timelineContainer: { marginBottom: 16 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  timelineDotWrapper: { alignItems: 'center', width: 20, marginRight: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.buttonBlue, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.buttonBlue, minHeight: 24, opacity: 0.3, marginTop: 2 },
  timelineContent: { flex: 1, paddingBottom: 14 },
  timelineDate: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textDark, lineHeight: 20 },
  timelineSubText: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary, marginTop: 2 },
  timelineNotes: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textMuted, marginTop: 2 },

  // Order History
  orderCard: { margin: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, gap: 10 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  orderLabel: { fontSize: FONTS.size.md, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },
  orderValue: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark },

  bottomSpacer: { height: 16 },

  // GPS status banner
  gpsErrorBanner: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  gpsErrorText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: '#E65100',
    textAlign: 'center',
  },

  // Submit
  submitContainer: {
    paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1,
    borderTopColor: COLORS.border, backgroundColor: COLORS.white,
  },
  submitButton: {
    backgroundColor: COLORS.buttonBlue, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.semibold, color: COLORS.white },

  // Product Modal
  catalogueLoader: { marginVertical: 32 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  modalSheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '75%', paddingTop: 12,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D0D0D0', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: FONTS.size.xl, fontFamily: FONTS.family.bold, color: COLORS.textDark, textAlign: 'center', marginBottom: 16 },
  modalList: { flexGrow: 0 },
  modalSeparator: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: COLORS.buttonBlue, borderColor: COLORS.buttonBlue },
  checkboxTick: { fontSize: 13, color: COLORS.white, fontFamily: FONTS.family.bold, lineHeight: 16 },
  modalItemInfo: { flex: 1 },
  modalItemTime: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 3 },
  modalItemDesc: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.regular, color: COLORS.textSecondary, lineHeight: 18 },
  modalItemPrice: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.buttonBlue, marginTop: 2 },
  modalItemAvail: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bold, color: COLORS.success, marginTop: 2 },
  modalItemAvailEmpty: { color: COLORS.error },
  modalItemDisabled: { opacity: 0.45 },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 28, overflow: 'hidden',
  },
  stepperBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  stepperBtnText: { fontSize: FONTS.size.xl, fontFamily: FONTS.family.regular, color: COLORS.textDark, lineHeight: 22 },
  stepperBtnTextDisabled: { color: COLORS.border },
  stepperValue: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, minWidth: 28, textAlign: 'center' },
  modalFooter: { paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  saveBtn: { backgroundColor: COLORS.buttonBlue, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.white },

  // Fullscreen Loader
  fullscreenLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  fullscreenLoaderBox: {
    backgroundColor: COLORS.white, borderRadius: 16, paddingHorizontal: 40, paddingVertical: 32,
    alignItems: 'center', gap: 16, minWidth: 180,
  },
  fullscreenLoaderText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textDark },

  // Feedback Modal
  feedbackIconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 14 },
  feedbackIconSuccess: { backgroundColor: 'rgba(56,142,60,0.12)' },
  feedbackIconError: { backgroundColor: 'rgba(211,47,47,0.1)' },
  feedbackIconText: { fontSize: 26, fontFamily: FONTS.family.bold },
  feedbackTitle: { fontSize: FONTS.size.xl, fontFamily: FONTS.family.bold, textAlign: 'center', marginBottom: 8 },
  feedbackTitleSuccess: { color: COLORS.success },
  feedbackTitleError: { color: '#D32F2F' },
  feedbackMessage: { fontSize: FONTS.size.md, fontFamily: FONTS.family.regular, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  feedbackOkBtn: { height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  feedbackOkSuccess: { backgroundColor: COLORS.success },
  feedbackOkError: { backgroundColor: '#D32F2F' },

  // Confirm Submit Modal
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  confirmBox: { width: '100%', backgroundColor: COLORS.white, borderRadius: 18, padding: 24 },
  confirmHeading: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.bold, color: COLORS.textDark, textAlign: 'center', marginBottom: 24, lineHeight: 26 },
  confirmActions: { flexDirection: 'row', gap: 12 },
  confirmCancelBtn: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  confirmCancelText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.semibold, color: COLORS.textDark },
  confirmYesBtn: { flex: 1, height: 48, borderRadius: 24, backgroundColor: COLORS.buttonBlue, justifyContent: 'center', alignItems: 'center' },
  confirmYesText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.semibold, color: COLORS.white },
});

export default VisitDetailScreen;
