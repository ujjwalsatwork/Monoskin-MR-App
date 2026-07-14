import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import {
  BackArrowIconBlack,
  PhoneIconOutline,
  EmailIcon,
  CalendarNoteIcon,
  ReplayIcon,
  Down,
} from '@/assets/images';
import apiClient from '@/services/apiClient';

type NavProp = NativeStackNavigationProp<AppStackParamList>;
type RoutePropType = RouteProp<AppStackParamList, 'LeadDetails'>;

type Lead = {
  id: number;
  code: string;
  leadType: 'doctor' | 'pharmacy';
  name: string;
  designation?: string | null;
  specialization?: string | null;
  clinic?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  receptionistPhone?: string | null;
  nearbyChemistName?: string | null;
  nearbyChemistPhone?: string | null;
  stage: string;
  priority: string;
  source?: string | null;
  assignedMRId?: number | null;
  nextFollowUp?: string | null;
  notes?: string | null;
  
  linkedPharmacy?: {
     id?: number;
     pharmacyId?: number;
     name?: string;
     gst?: string;
     postalAddress?: string;
     phone?: string;
     billingDetails?: string;
     deliveryDetails?: string;
  }[];
  linkedDoctor?: {
     id?: number;
     doctorId?: number;
     name?: string;
     postalAddress?: string;
     phone?: string;
     billingDetails?: string;
     deliveryDetails?: string;
  }[];

  createdAt: string;
};

// Mirrors the Stage field in the Add/Edit lead form.
const STAGE_OPTIONS = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Sent to MR', 'Converted', 'Lost'];

const STAGE_COLORS: Record<string, { bg: string; color: string }> = {
  New:           { bg: '#E8EEF9', color: COLORS.buttonBlue },
  Contacted:     { bg: '#E8EEF9', color: COLORS.buttonBlue },
  Qualified:     { bg: '#FFF3E0', color: '#E65100' },
  Proposal:      { bg: '#E8F5E9', color: '#2E7D32' },
  Negotiation:   { bg: '#FDE8FF', color: '#7B1FA2' },
  'Sent to MR':  { bg: '#E3F2FD', color: '#1565C0' },
  Converted:     { bg: '#E8F5E9', color: '#2E7D32' },
  Lost:          { bg: '#FDECEA', color: '#C62828' },
};

const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  High:   { bg: '#FDECEA', color: '#C62828' },
  Medium: { bg: '#FFF3E0', color: '#E65100' },
  Low:    { bg: '#F0F0F0', color: '#666666' },
};

/* ─── Icons ───────────────────────────────────────────────────────── */
const WarningIcon = () => (
  <Svg width="52" height="52" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#FEF3C7" />
    <Path d="M12 8v4" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
    <Circle cx="12" cy="16" r="1" fill="#D97706" />
  </Svg>
);

const SuccessIcon = () => (
  <Svg width="52" height="52" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#DCFCE7" />
    <Path d="M8 12l3 3 5-5" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ErrorIcon = () => (
  <Svg width="52" height="52" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#FEE2E2" />
    <Path d="M15 9l-6 6M9 9l6 6" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const InfoBlueIcon = () => (
  <Svg width="52" height="52" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#E0EDFF" />
    <Path d="M12 11v5" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
    <Circle cx="12" cy="8" r="1" fill="#2563EB" />
  </Svg>
);

/* ─── Stage-selection bottom sheet (mirrors the edit form) ────────── */
const StageSheet = ({ visible, current, onSelect, onClose }: {
  visible: boolean;
  current: string;
  onSelect: (stage: string) => void;
  onClose: () => void;
}) => (
  <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={sheet.overlay} />
    </TouchableWithoutFeedback>
    <View style={sheet.container}>
      <View style={sheet.handle} />
      <Text style={sheet.title}>Update Stage</Text>
      {STAGE_OPTIONS.map(item => {
        const active = item === current;
        return (
          <TouchableOpacity key={item} style={sheet.option} activeOpacity={0.7} onPress={() => onSelect(item)}>
            <Text style={[sheet.optionText, active && sheet.optionActive]}>{item}</Text>
            {active && <Text style={sheet.check}>✓</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  </Modal>
);

/* ─── Stage-change confirmation / result dialog (dynamic per stage) ─ */
type StageDialog =
  | { type: 'confirm'; stage: string }
  | { type: 'success'; stage: string }
  | { type: 'error'; message: string }
  | null;

const StageDialogModal = ({
  dialog, typeLabel, converting, onCancel, onConfirm,
}: {
  dialog: StageDialog;
  typeLabel: string;
  converting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  if (!dialog) return null;
  const isConfirm = dialog.type === 'confirm';
  const stage = dialog.type === 'error' ? '' : dialog.stage;
  const isConvert = stage === 'Converted';
  const isLost = stage === 'Lost';

  const Icon =
    dialog.type === 'success' ? SuccessIcon :
    dialog.type === 'error' ? ErrorIcon :
    isConvert || isLost ? WarningIcon : InfoBlueIcon;

  let title = '';
  let message = '';
  let confirmLabel = 'Update';
  if (dialog.type === 'success') {
    title = isConvert ? 'Converted' : 'Stage Updated';
    message = isConvert
      ? `This lead has been converted to a ${typeLabel} record.`
      : `Lead stage updated to ${stage}.`;
  } else if (dialog.type === 'error') {
    title = 'Update Failed';
    message = dialog.message;
  } else if (isConvert) {
    title = `Convert to ${typeLabel}?`;
    message = `This will create a ${typeLabel} record and move the lead to Converted. This action cannot be undone.`;
    confirmLabel = 'Convert';
  } else if (isLost) {
    title = 'Mark as Lost?';
    message = 'This will mark the lead as Lost.';
    confirmLabel = 'Mark Lost';
  } else {
    title = `Move to ${stage}?`;
    message = `This will update the lead's stage to ${stage}.`;
    confirmLabel = 'Update';
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={dlg.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={converting ? undefined : onCancel} />
        <View style={dlg.card}>
          <Icon />
          <Text style={dlg.title}>{title}</Text>
          <Text style={dlg.message}>{message}</Text>
          {isConfirm ? (
            <View style={dlg.actionsRow}>
              <TouchableOpacity style={[dlg.btn, dlg.cancelBtn]} activeOpacity={0.8} onPress={onCancel} disabled={converting}>
                <Text style={dlg.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[dlg.btn, dlg.confirmBtn]} activeOpacity={0.8} onPress={onConfirm} disabled={converting}>
                {converting ? <ActivityIndicator color={COLORS.white} /> : <Text style={dlg.confirmText}>{confirmLabel}</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[dlg.btn, dlg.confirmBtn, { width: 140 }]} activeOpacity={0.8} onPress={onCancel}>
              <Text style={dlg.confirmText}>OK</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const LeadDetailsScreen = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { leadId, category } = route.params;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [dialog, setDialog] = useState<StageDialog>(null);
  const [converting, setConverting] = useState(false);
  const [showStageSheet, setShowStageSheet] = useState(false);

  const fetchLead = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const res = await apiClient.get<Lead>(`/leads/${leadId}`);
      setLead(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [leadId]);

  useFocusEffect(useCallback(() => {
    fetchLead();
  }, [fetchLead]));

  // Stage changes invoke the SAME backend flow as the web CRM. In particular,
  // moving the lead to the "Converted" stage auto-creates the Doctor/Pharmacy
  // master record — identical to the edit form's Stage field.
  const handleStageChange = async (stage: string) => {
    setConverting(true);
    try {
      await apiClient.patch(`/leads/${leadId}`, { stage });
      await fetchLead(true);
      setDialog({ type: 'success', stage });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Something went wrong. Please try again.';
      setDialog({ type: 'error', message });
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.buttonBlue} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !lead) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <BackArrowIconBlack />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Lead not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stageStyle = STAGE_COLORS[lead.stage] ?? { bg: '#E8EEF9', color: COLORS.buttonBlue };
  const priorityStyle = PRIORITY_COLORS[lead.priority] ?? { bg: '#F0F0F0', color: '#666666' };
  const designation = lead.designation || lead.specialization || '';

  const typeLabel = lead.leadType === 'doctor' ? 'Doctor' : 'Pharmacy';
  const isConverted = lead.stage === 'Converted';

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <BackArrowIconBlack />
        </TouchableOpacity>
        <View style={styles.headerProfileContainer}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>
              {lead.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{lead.name}</Text>
            <View style={[styles.badgeContainer, { backgroundColor: stageStyle.bg }]}>
              <Text style={[styles.badgeText, { color: stageStyle.color }]}>{lead.stage}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (lead.leadType === 'pharmacy') {
              navigation.navigate('AddPharmacyLead', { editMode: true, leadData: lead });
            } else {
              navigation.navigate('AddDoctorLead', { editMode: true, leadData: lead });
            }
          }}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchLead(true)}
            colors={[COLORS.buttonBlue]}
            tintColor={COLORS.buttonBlue}
          />
        }
      >
        {/* Action Buttons */}
        {/* <View style={styles.actionsContainer}>
          {[
            {
              icon: <PhoneIconOutline stroke={COLORS.white} height={18} width={18} />,
              label: 'CALL',
              onPress: () => lead.phone && Linking.openURL(`tel:${lead.phone}`),
            },
            {
              icon: <EmailIcon stroke={COLORS.white} height={18} width={18} />,
              label: 'EMAIL',
              onPress: () => lead.email && Linking.openURL(`mailto:${lead.email}`),
            },
            {
              icon: <CalendarNoteIcon stroke={COLORS.white} height={18} width={18} />,
              label: 'NOTE',
              onPress: () => {},
            },
            {
              icon: <ReplayIcon height={18} width={18} />,
              label: 'STATUS',
              onPress: () => {},
            },
          ].map((action, index) => (
            <TouchableOpacity key={index} style={styles.actionButton} onPress={action.onPress}>
              <View style={styles.iconWrapper}>
                <View style={styles.iconCircle}>{action.icon}</View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View> */}

        {/* Convert CTA + full stage control, surfaced above Contact Info */}
        <View style={styles.spacing}/>
        {isConverted ? (
          <View style={styles.convertedBanner}>
            <SuccessIcon />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.convertedBannerTitle}>Converted to {typeLabel}</Text>
              <Text style={styles.convertedBannerSub}>A {typeLabel} record has been created for this lead.</Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.updateStageLabel}>Update Stage</Text>
            <TouchableOpacity
              style={[styles.stageDropdown, converting && { opacity: 0.6 }]}
              activeOpacity={0.8}
              onPress={() => setShowStageSheet(true)}
              disabled={converting}
            >
              <View style={[styles.smallBadge, { backgroundColor: stageStyle.bg }]}>
                <Text style={[styles.smallBadgeText, { color: stageStyle.color }]}>{lead.stage}</Text>
              </View>
              {converting ? (
                <ActivityIndicator size="small" color={COLORS.buttonBlue} />
              ) : (
                <Down width={16} height={16} stroke={COLORS.textSecondary} />
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Contact Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>CONTACT INFO</Text>
          {lead.phone ? (
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => Linking.openURL(`tel:${lead.phone!}`)}
            >
              <PhoneIconOutline stroke={COLORS.primary} width={20} height={20} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={[styles.infoValue, styles.linkText]}>{lead.phone}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
          {lead.whatsappNumber ? (
            <View style={styles.infoRow}>
              <PhoneIconOutline stroke="#25D366" width={20} height={20} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>WhatsApp</Text>
                <Text style={styles.infoValue}>{lead.whatsappNumber}</Text>
              </View>
            </View>
          ) : null}
          {lead.email ? (
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => Linking.openURL(`mailto:${lead.email!}`)}
            >
              <EmailIcon stroke={COLORS.primary} width={20} height={20} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={[styles.infoValue, styles.linkText]}>{lead.email}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
          {lead.receptionistPhone ? (
            <View style={styles.infoRow}>
              <PhoneIconOutline stroke={COLORS.textSecondary} width={20} height={20} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Receptionist</Text>
                <Text style={styles.infoValue}>{lead.receptionistPhone}</Text>
              </View>
            </View>
          ) : null}
          {!lead.phone && !lead.email && !lead.whatsappNumber && !lead.receptionistPhone && (
            <Text style={styles.noDataText}>No contact info available.</Text>
          )}
        </View>

        {/* Company / Clinic Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>CLINIC DETAILS</Text>
          {lead.clinic ? (
            <View style={styles.companyRow}>
              <Text style={styles.infoLabel}>Clinic:</Text>
              <Text style={styles.companyValue}>{lead.clinic}</Text>
            </View>
          ) : null}
          {designation ? (
            <View style={styles.companyRow}>
              <Text style={styles.infoLabel}>Designation:</Text>
              <Text style={styles.companyValue}>{designation}</Text>
            </View>
          ) : null}
          {lead.city || lead.state ? (
            <View style={styles.companyRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.companyValue}>
                {[lead.city, lead.state].filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}
          {lead.address ? (
            <View style={styles.companyRow}>
              <Text style={styles.infoLabel}>Address:</Text>
              <Text style={[styles.companyValue, { flex: 1 }]}>{lead.address}</Text>
            </View>
          ) : null}
          {lead.nearbyChemistName || lead.nearbyChemistPhone ? (
            <View style={styles.companyRow}>
              <Text style={styles.infoLabel}>Chemist:</Text>
              <Text style={styles.companyValue}>
                {[lead.nearbyChemistName, lead.nearbyChemistPhone].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ) : null}
        </View>

        
        {/* Linked Entities */}
        {((lead.linkedPharmacy?.length || 0) > 0 || (lead.linkedDoctor?.length || 0) > 0) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {lead.leadType === 'doctor' ? 'LINKED PHARMACIES' : 'LINKED DOCTORS'}
            </Text>
            {(lead.linkedPharmacy || []).map((p, idx) => (
               <View key={`lp-${idx}`} style={[styles.companyRow, { alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 8, marginBottom: 8 }]}>
                 <View style={{ flex: 1 }}>
                   <Text style={[styles.infoValue, { fontFamily: FONTS.family.bold, color: COLORS.textDark }]}>{p.name || `Pharmacy #${p.pharmacyId}`}</Text>
                   {p.phone && <Text style={styles.infoLabel}>Phone: {p.phone}</Text>}
                   {p.postalAddress && <Text style={styles.infoLabel}>Address: {p.postalAddress}</Text>}
                   {p.gst && <Text style={styles.infoLabel}>GST: {p.gst}</Text>}
                 </View>
               </View>
            ))}
            {(lead.linkedDoctor || []).map((d, idx) => (
               <View key={`ld-${idx}`} style={[styles.companyRow, { alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 8, marginBottom: 8 }]}>
                 <View style={{ flex: 1 }}>
                   <Text style={[styles.infoValue, { fontFamily: FONTS.family.bold, color: COLORS.textDark }]}>{d.name || `Doctor #${d.doctorId}`}</Text>
                   {d.phone && <Text style={styles.infoLabel}>Phone: {d.phone}</Text>}
                   {d.postalAddress && <Text style={styles.infoLabel}>Address: {d.postalAddress}</Text>}
                 </View>
               </View>
            ))}
          </View>
        )}

        {/* Lead Info */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>LEAD INFO</Text>
          <View style={styles.companyRow}>
            <Text style={styles.infoLabel}>Stage:</Text>
            <View style={[styles.smallBadge, { backgroundColor: stageStyle.bg }]}>
              <Text style={[styles.smallBadgeText, { color: stageStyle.color }]}>{lead.stage}</Text>
            </View>
          </View>
          <View style={styles.companyRow}>
            <Text style={styles.infoLabel}>Priority:</Text>
            <View style={[styles.smallBadge, { backgroundColor: priorityStyle.bg }]}>
              <Text style={[styles.smallBadgeText, { color: priorityStyle.color }]}>{lead.priority}</Text>
            </View>
          </View>
          {lead.source ? (
            <View style={styles.companyRow}>
              <Text style={styles.infoLabel}>Source:</Text>
              <Text style={styles.companyValue}>{lead.source}</Text>
            </View>
          ) : null}
          {lead.nextFollowUp ? (
            <View style={styles.companyRow}>
              <Text style={styles.infoLabel}>Follow-up:</Text>
              <Text style={styles.companyValue}>{formatDate(lead.nextFollowUp)}</Text>
            </View>
          ) : null}
          <View style={styles.companyRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.companyValue}>{formatDate(lead.createdAt)}</Text>
          </View>
          {lead.notes ? (
            <View style={[styles.companyRow, { alignItems: 'flex-start' }]}>
              <Text style={styles.infoLabel}>Notes:</Text>
              <Text style={[styles.companyValue, { flex: 1 }]}>{lead.notes}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <StageSheet
        visible={showStageSheet}
        current={lead.stage}
        onSelect={(stage) => {
          setShowStageSheet(false);
          if (stage === lead.stage) return;
          setDialog({ type: 'confirm', stage });
        }}
        onClose={() => setShowStageSheet(false)}
      />

      <StageDialogModal
        dialog={dialog}
        typeLabel={typeLabel}
        converting={converting}
        onCancel={() => { if (!converting) setDialog(null); }}
        onConfirm={() => { if (dialog?.type === 'confirm') handleStageChange(dialog.stage); }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  spacing: {
    height: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textMuted,
  },
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: COLORS.buttonBlue,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.medium,
  },
  editButtonText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.primary,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    padding: 6,
  },
  iconWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  actionLabel: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: '#000',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
  },
  linkText: {
    color: COLORS.buttonBlue,
  },
  companyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  companyValue: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    textAlign: 'right',
    flexShrink: 1,
  },
  smallBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  smallBadgeText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
  },
  noDataText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textMuted,
  },
  updateStageLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  stageDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  convertedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  convertedBannerTitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: '#166534',
  },
  convertedBannerSub: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: '#15803D',
    marginTop: 2,
  },
});

const dlg = StyleSheet.create({
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
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  cancelText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: '#374151',
  },
  confirmBtn: {
    backgroundColor: COLORS.buttonBlue,
  },
  confirmText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
  },
});

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
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
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
});

export default LeadDetailsScreen;
