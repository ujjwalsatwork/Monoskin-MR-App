/* eslint-disable react/no-unstable-nested-components */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
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

type NavProp = NativeStackNavigationProp<AppStackParamList>;
type RoutePropType = RouteProp<AppStackParamList, 'VisitDetail'>;

const VISIT_TYPES = ['Lead Visit', 'Doctor Visit', 'Pharmacy Visit', 'Conference', 'Training'];
const OUTCOMES = ['Positive', 'Neutral', 'Negative', 'Follow-up Required'];
const OBJECTION_CHIPS = ['Too Expensive', 'Already Prescribes Brand X', 'Needs Study'];
const TIME_SLOTS = ['Morning Slot', 'Afternoon Slot', 'Evening Slot'];

type DoctorDetails = {
  id: string;
  name: string;
  specialization: string;
  clinic: string;
  address: string;
  phone?: string;
  tags?: string[];
  tier?: string;
  importance?: string;
  pharmacyNetwork?: Array<{ id: string; name: string; type: 'primary' | 'linked' }>;
  nearbyPharmacies?: Array<{ id: string; name: string; distance: string }>;
  preferredProducts?: Array<{ id: string; name: string }>;
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
  lastVisitDate?: string;
  lastVisit?: string;
  avgTime?: string;
  preferredProducts?: Array<{ id: string; name: string }>;
  unpreferredProducts?: Array<{ id: string; name: string }>;
  interactionHistory?: Array<{ date: string; type: string; outcome: string; notes: string; source: string }>;
  orderHistory?: { productName: string; quantity: string; lastDate: string; price: string };
};

type CatalogueItem = {
  id: string;
  name: string;
  category: string;
  packSize: string;
  price: number;
  qty: number;
  selected: boolean;
};

type SampleProduct = {
  productId: string;
  name: string;
  category: string;
  packSize: string;
  quantity: number;
};

type Attachment = { uri: string; type: string; name: string };

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

const VisitDetailScreen = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const dispatch = useDispatch<AppDispatch>();
  const { doctorId, pharmacyId, routeStopId } = route.params;
  const profile = useSelector((state: any) => state.profile.data);
  const authUser = useSelector((state: any) => state.auth.user);
  const mrId = profile?.id ?? authUser?.id;

  const [doctorData, setDoctorData] = useState<DoctorDetails | null>(null);
  const [pharmacyData, setPharmacyData] = useState<PharmacyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [sampleProducts, setSampleProducts] = useState<SampleProduct[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [addSampleVisible, setAddSampleVisible] = useState(false);

  const [visitNote, setVisitNote] = useState('');
  const [clinicConsultationTime, setClinicConsultationTime] = useState('');
  const [mrInteractionTime, setMrInteractionTime] = useState('');
  const [doctorArrivalTime, setDoctorArrivalTime] = useState('');
  const [objections, setObjections] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [visitType, setVisitType] = useState('Lead Visit');
  const [outcome, setOutcome] = useState('Follow-up Required');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpSlot, setFollowUpSlot] = useState('Afternoon Slot');
  const [slotVisible, setSlotVisible] = useState(false);
  const [duration, setDuration] = useState('');
  const [location, setLocation] = useState<{
    latitude: string;
    longitude: string;
    address: string;
  } | null>(null);

  const [sampleExpanded, setSampleExpanded] = useState(true);
  const [prefExpanded, setPrefExpanded] = useState(false);
  const [unprefExpanded, setUnprefExpanded] = useState(false);
  const [orderExpanded, setOrderExpanded] = useState(true);

  useEffect(() => {
    if (doctorId) {
      fetchDoctorDetails();
    } else if (pharmacyId) {
      fetchPharmacyDetails();
    } else {
      setLoading(false);
    }
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
      },
      () => {},
      { enableHighAccuracy: false, timeout: 10000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, pharmacyId]);

  const fetchDoctorDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(ENDPOINTS.portfolio.doctorDetail(doctorId!));
      setDoctorData(res.data);
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
    } catch(fetchErr) {
      console.log('🚀 ~ fetchPharmacyDetails ~ error:', fetchErr);
      setError('Failed to load pharmacy details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogue = async () => {
    if (catalogue.length > 0) { return; }
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
    } catch {
      Alert.alert('Error', 'Failed to load products.');
    } finally {
      setCatalogueLoading(false);
    }
  };

  const openAddSample = async () => {
    setAddSampleVisible(true);
    await fetchCatalogue();
  };

  const toggleCatalogueItem = (id: string) => {
    setCatalogue(prev => prev.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item,
    ));
  };

  const updateCatalogueQty = (id: string, delta: number) => {
    setCatalogue(prev => prev.map(item =>
      item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item,
    ));
  };

  const handleSaveSamples = () => {
    const selected = catalogue.filter(c => c.selected);
    const newSamples: SampleProduct[] = selected.map(c => ({
      productId: c.id,
      name: c.name,
      category: c.category,
      packSize: c.packSize,
      quantity: c.qty,
    }));
    setSampleProducts(prev => {
      const existingIds = new Set(prev.map(p => p.productId));
      return [...prev, ...newSamples.filter(s => !existingIds.has(s.productId))];
    });
    setCatalogue(prev => prev.map(c => ({ ...c, selected: false, qty: 1 })));
    setAddSampleVisible(false);
  };

  const toggleObjection = (chip: string) => {
    setObjections(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip],
    );
  };

  const handleImageUpload = () => {
    Alert.alert('Upload Photo', 'Choose source', [
      {
        text: 'Camera',
        onPress: () =>
          launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: false }, res => {
            if (!res.didCancel && res.assets?.[0]) {
              const a = res.assets[0];
              setAttachments(prev => [...prev, {
                uri: a.uri!,
                type: a.type || 'image/jpeg',
                name: a.fileName || `photo_${Date.now()}.jpg`,
              }]);
            }
          }),
      },
      {
        text: 'Gallery',
        onPress: () =>
          launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 5 }, res => {
            if (!res.didCancel && res.assets) {
              const newAtts: Attachment[] = res.assets.map(a => ({
                uri: a.uri!,
                type: a.type || 'image/jpeg',
                name: a.fileName || `photo_${Date.now()}.jpg`,
              }));
              setAttachments(prev => [...prev, ...newAtts]);
            }
          }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (!visitType) { Alert.alert('Validation', 'Please select a visit type.'); return; }
    if (!outcome) { Alert.alert('Validation', 'Please select an outcome.'); return; }
    if (!mrId) { Alert.alert('Error', 'User session not found. Please login again.'); return; }

    const formData = new FormData();
    
    formData.append('mrId', String(mrId));
    if (doctorId) formData.append('doctorId', String(doctorId));
    if (pharmacyId) formData.append('pharmacyId', String(pharmacyId));
    if (routeStopId) formData.append('routeStopId', String(routeStopId));
    
    formData.append('visitType', visitType);
    formData.append('outcome', outcome);
    
    if (visitNote) formData.append('notes', visitNote);
    if (clinicConsultationTime) formData.append('clinicConsultationTime', clinicConsultationTime);
    if (mrInteractionTime) formData.append('mrInteractionTime', mrInteractionTime);
    if (doctorArrivalTime) formData.append('doctorArrivalTime', doctorArrivalTime);
    if (duration) formData.append('duration', String(parseInt(duration, 10)));
    if (location?.address) formData.append('location', location.address);
    if (location?.latitude) formData.append('latitude', String(location.latitude));
    if (location?.longitude) formData.append('longitude', String(location.longitude));

    if (outcome === 'Follow-up Required' && followUpDate) {
      formData.append('followUpDate', followUpDate);
      formData.append('followUpSlot', followUpSlot);
    }

    if (objections.length > 0) {
      formData.append('objections', JSON.stringify(objections));
    }

    if (sampleProducts.length > 0) {
      const formattedSamples = sampleProducts.map(s => ({
        productId: Number(s.productId),
        quantity: s.quantity
      }));
      formData.append('sampleProducts', JSON.stringify(formattedSamples));
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
      Alert.alert('Success', 'Visit report submitted successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to submit visit report. Please try again.');
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
            onPress={pharmacyId ? fetchPharmacyDetails : fetchDoctorDetails}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const entityName = doctorData?.name ?? pharmacyData?.name;
  const initials = entityName
    ?.split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('') ?? (pharmacyId ? 'PH' : 'DR');

  return (
    <View style={styles.safeArea}>
      <Header title="Visit Details" showBack showNotification showProfile />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

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
                {doctorData?.clinic ?? doctorData?.address ?? pharmacyData?.address ?? '—'}
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
                const phone = doctorData?.phone ?? pharmacyData?.phone;
                if (phone) { Alert.alert('Call', `Calling ${phone}`); }
              }}
            >
              <PhoneIconOutline width={18} height={18} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Alert.alert('WhatsApp', 'Opening WhatsApp...')}
            >
              <WhatsAppIcon width={18} height={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>LAST VISIT</Text>
            <Text style={styles.statValue}>
              {(doctorData?.lastVisitDate || pharmacyData?.lastVisitDate)
                ? formatDateTime(doctorData?.lastVisitDate ?? pharmacyData?.lastVisitDate!)
                : doctorData?.lastVisit ?? pharmacyData?.lastVisit ?? '—'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>AVG TIME</Text>
            <Text style={styles.statValue}>
              {doctorData?.avgTime ?? pharmacyData?.avgTime ?? '—'}
            </Text>
          </View>
        </View>

        {/* Visit Type */}
        <SectionLabel title="VISIT TYPE" />
        <View style={styles.chipsRow}>
          {VISIT_TYPES.map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, visitType === type && styles.chipActive]}
              onPress={() => setVisitType(type)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, visitType === type && styles.chipTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
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

        {/* Duration */}
        <SectionLabel title="DURATION (MINUTES)" />
        <TextInput
          style={styles.durationInput}
          value={duration}
          onChangeText={setDuration}
          placeholder="e.g. 30"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
        />
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
              <View
                key={product.productId}
                style={[styles.productRow, i < sampleProducts.length - 1 && styles.productRowBorder]}
              >
                <View>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productSubText}>{product.category} • {product.packSize}</Text>
                </View>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyBadgeText}>x{product.quantity}</Text>
                </View>
              </View>
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
          <TouchableOpacity style={styles.micButton}>
            <MicIcon width={20} height={20} />
          </TouchableOpacity>
        </View>

        <Text style={styles.timeFieldLabel}>Clinic Consultation Time</Text>
        <TextInput
          style={styles.timeFieldInput}
          value={clinicConsultationTime}
          onChangeText={setClinicConsultationTime}
          placeholder="e.g. 10:30 AM"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.timeFieldLabel}>MR Interaction Time</Text>
        <TextInput
          style={styles.timeFieldInput}
          value={mrInteractionTime}
          onChangeText={setMrInteractionTime}
          placeholder="e.g. 10:45 AM"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.timeFieldLabel}>Doctor Arrival Time</Text>
        <TextInput
          style={styles.timeFieldInput}
          value={doctorArrivalTime}
          onChangeText={setDoctorArrivalTime}
          placeholder="e.g. 11:00 AM"
          placeholderTextColor={COLORS.textMuted}
        />

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
              <View key={i} style={styles.attachmentThumb}>
                <Text style={styles.attachmentThumbText} numberOfLines={2}>{att.name}</Text>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity style={styles.uploadCard} activeOpacity={0.8} onPress={handleImageUpload}>
          <CameraUploadIcon width={32} height={32} />
          <Text style={styles.uploadTitle}>
            {attachments.length > 0 ? 'Add More Photos' : 'Upload Prescription Photo'}
          </Text>
          <Text style={styles.uploadSubtitle}>JPEG or PNG, Max 5MB</Text>
        </TouchableOpacity>

        {/* Preferred Products */}
        <CollapsibleSection
          title="Preferred Products"
          expanded={prefExpanded}
          onToggle={() => setPrefExpanded(p => !p)}
        >
          {(() => {
            const prods = doctorData?.preferredProducts ?? pharmacyData?.preferredProducts;
            return prods && prods.length > 0 ? (
              prods.map((prod, i) => (
                <View
                  key={prod.id}
                  style={[styles.productRow, i < prods.length - 1 && styles.productRowBorder]}
                >
                  <View style={styles.productIconRow}>
                    <PillIcon width={16} height={16} />
                    <Text style={styles.productName}>  {prod.name}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No preferred products on record.</Text>
              </View>
            );
          })()}
        </CollapsibleSection>

        {/* Unpreferred Products */}
        <CollapsibleSection
          title="Unpreferred Products"
          expanded={unprefExpanded}
          onToggle={() => setUnprefExpanded(p => !p)}
        >
          {(() => {
            const prods = doctorData?.unpreferredProducts ?? pharmacyData?.unpreferredProducts;
            return prods && prods.length > 0 ? (
              prods.map((prod, i) => (
                <View
                  key={prod.id}
                  style={[styles.productRow, i < prods.length - 1 && styles.productRowBorder]}
                >
                  <View style={styles.productIconRow}>
                    <PillIcon width={16} height={16} />
                    <Text style={styles.productName}>  {prod.name}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No unpreferred products on record.</Text>
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

        {/* Follow-up Plan – only when outcome is Follow-up Required */}
        {outcome === 'Follow-up Required' && (
          <View style={styles.followUpCard}>
            <Text style={styles.followUpTitle}>Follow-up Plan</Text>
            <View style={styles.followUpRow}>
              <View style={styles.followUpDateBox}>
                <TextInput
                  style={styles.followUpDateInput}
                  value={followUpDate}
                  onChangeText={setFollowUpDate}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <TouchableOpacity
                style={styles.followUpSlotBox}
                activeOpacity={0.8}
                onPress={() => setSlotVisible(p => !p)}
              >
                <Text style={styles.followUpSlotText}>{followUpSlot}</Text>
                <Down width={14} height={14} />
              </TouchableOpacity>
            </View>
            {slotVisible && (
              <View style={styles.slotDropdown}>
                {TIME_SLOTS.map(slot => (
                  <TouchableOpacity
                    key={slot}
                    style={styles.slotOption}
                    onPress={() => { setFollowUpSlot(slot); setSlotVisible(false); }}
                  >
                    <Text style={[styles.slotOptionText, slot === followUpSlot && styles.slotOptionActive]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

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
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.submitButtonText}>Submit Report</Text>}
        </TouchableOpacity>
      </View>

      {/* Product Selection Modal */}
      <Modal
        visible={addSampleVisible}
        transparent
        animationType="slide"
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
            data={catalogue}
            keyExtractor={item => item.id}
            style={styles.modalList}
            renderItem={({ item }) => (
              <View style={styles.modalItem}>
                <TouchableOpacity
                  style={[styles.checkbox, item.selected && styles.checkboxSelected]}
                  onPress={() => toggleCatalogueItem(item.id)}
                  activeOpacity={0.8}
                >
                  {item.selected && <Text style={styles.checkboxTick}>✓</Text>}
                </TouchableOpacity>
                <View style={styles.modalItemInfo}>
                  <Text style={styles.modalItemTime}>{item.name}</Text>
                  <Text style={styles.modalItemDesc}>{item.category} • {item.packSize}</Text>
                  <Text style={styles.modalItemPrice}>₹{item.price.toFixed(2)}</Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => updateCatalogueQty(item.id, -1)}
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{item.qty}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => updateCatalogueQty(item.id, 1)}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ItemSeparatorComponent={ModalSeparator}
          />
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSamples} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Save Samples</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
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
  chipText: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: COLORS.textDark },
  chipTextActive: { color: COLORS.white },

  // Duration
  durationInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textDark,
    marginBottom: 8,
  },
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
    alignItems: 'flex-end', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, minHeight: 60,
  },
  notesInput: {
    flex: 1, fontSize: FONTS.size.md, fontFamily: FONTS.family.regular,
    color: COLORS.textDark, padding: 0, maxHeight: 100,
  },
  micButton: { padding: 4, marginLeft: 8 },

  // Time fields in Visit Notes
  timeFieldLabel: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.medium, color: COLORS.textSecondary, marginBottom: 6, marginTop: 2 },
  timeFieldInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textDark,
    marginBottom: 14,
  },

  // Documentation
  attachmentsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  attachmentThumb: {
    width: 80, height: 80, borderRadius: 10, backgroundColor: '#F0F2F8',
    justifyContent: 'center', alignItems: 'center', padding: 6,
  },
  attachmentThumbText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.regular, color: COLORS.textSecondary, textAlign: 'center' },
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

  // Follow-up Plan
  followUpCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 16, marginBottom: 8 },
  followUpTitle: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, marginBottom: 12 },
  followUpRow: { flexDirection: 'row', gap: 10 },
  followUpDateBox: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  followUpDateInput: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textDark, padding: 0 },
  followUpSlotBox: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  followUpSlotText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.medium, color: COLORS.textDark },
  slotDropdown: { marginTop: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden' },
  slotOption: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  slotOptionText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },
  slotOptionActive: { color: COLORS.buttonBlue, fontFamily: FONTS.family.bold },

  // Order History
  orderCard: { margin: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, gap: 10 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  orderLabel: { fontSize: FONTS.size.md, fontFamily: FONTS.family.regular, color: COLORS.textSecondary },
  orderValue: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark },

  bottomSpacer: { height: 16 },

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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
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
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 28, overflow: 'hidden',
  },
  stepperBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  stepperBtnText: { fontSize: FONTS.size.xl, fontFamily: FONTS.family.regular, color: COLORS.textDark, lineHeight: 22 },
  stepperValue: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.textDark, minWidth: 28, textAlign: 'center' },
  modalFooter: { paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  saveBtn: { backgroundColor: COLORS.buttonBlue, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bold, color: COLORS.white },
});

export default VisitDetailScreen;
