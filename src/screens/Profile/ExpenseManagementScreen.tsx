import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import { AxiosError } from 'axios';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import DatePickerModal from '@/components/common/DatePickerModal';
import { RootState } from '@/redux/rootReducer';
import { AppStackParamList } from '@/navigation/types';
import apiClient from '@/services/apiClient';
import Svg, { Path, Circle } from 'react-native-svg';

// ── SVG icons ─────────────────────────────────────────────────────────────────

const CalendarIcon = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
      stroke={COLORS.textSecondary}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const XCircleIcon = () => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM15 9l-6 6M9 9l6 6"
      stroke={COLORS.textSecondary}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PlusIcon = () => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5v14M5 12h14"
      stroke={COLORS.white}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </Svg>
);

const CheckCircleIcon = () => (
  <Svg width="52" height="52" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#DCFCE7" />
    <Path
      d="M8 12l3 3 5-5"
      stroke="#16A34A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ErrorCircleIcon = () => (
  <Svg width="52" height="52" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#FEE2E2" />
    <Path
      d="M15 9l-6 6M9 9l6 6"
      stroke="#DC2626"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const InfoCircleIcon = () => (
  <Svg width="52" height="52" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#DBEAFE" />
    <Path
      d="M12 8v4M12 16h.01"
      stroke="#2563EB"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

type AlertType = 'success' | 'error' | 'info';

interface AlertState {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const ALERT_HIDDEN: AlertState = {
  visible: false,
  type: 'info',
  title: '',
  message: '',
};

// ── Error extraction ──────────────────────────────────────────────────────────

const extractApiError = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (typeof data?.message === 'string' && data.message) return data.message;
    if (typeof data?.error === 'string' && data.error) return data.error;
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      return (data.errors as string[]).join('\n');
    }
    const status = error.response?.status;
    if (status === 400) return 'Invalid request. Please check your input.';
    if (status === 401) return 'Session expired. Please log in again.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 404) return 'Resource not found.';
    if (status === 409) return 'A conflict occurred. This record may already exist.';
    if (status === 422) return 'Validation failed. Please review your input.';
    if (status && status >= 500) return 'Server error. Please try again later.';
    if (!error.response) return 'No internet connection. Please check your network.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'An unexpected error occurred. Please try again.';
};

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
    message: 'Monoskin MR needs camera access to capture expense receipts.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });
  if (result === 'granted') return 'granted';
  if (result === 'never_ask_again') return 'settings';
  return 'denied';
};

const ensureGalleryPermission = async (): Promise<'granted' | 'denied' | 'settings'> => {
  if (Platform.OS !== 'android') return 'granted';
  const permission =
    Number(Platform.Version) >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const result = await requestAndroidPermission(permission, {
    title: 'Photo Library Permission',
    message: 'Monoskin MR needs access to your photos to upload expense receipts.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });
  if (result === 'granted') return 'granted';
  if (result === 'never_ask_again') return 'settings';
  return 'denied';
};

// ── Date helpers ──────────────────────────────────────────────────────────────

const formatDisplayDate = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const formatApiDate = (d: Date): string => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// ── AlertModal component ──────────────────────────────────────────────────────

const ALERT_ACCENT: Record<AlertType, string> = {
  success: '#16A34A',
  error: '#DC2626',
  info: '#2563EB',
};

interface AlertModalProps {
  state: AlertState;
  onDismiss: () => void;
}

const AlertModal = ({ state, onDismiss }: AlertModalProps) => {
  const accent = ALERT_ACCENT[state.type];
  const Icon =
    state.type === 'success'
      ? CheckCircleIcon
      : state.type === 'error'
      ? ErrorCircleIcon
      : InfoCircleIcon;

  const handleConfirm = () => {
    onDismiss();
    state.onConfirm?.();
  };

  const handleCancel = () => {
    onDismiss();
    state.onCancel?.();
  };

  return (
    <Modal
      visible={state.visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={am.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={state.cancelText ? undefined : onDismiss} />
        <View style={am.card}>
          <Icon />

          <Text style={am.title}>{state.title}</Text>
          <Text style={am.message}>{state.message}</Text>

          <View style={[am.actions, !state.cancelText && am.actionsCenter]}>
            {!!state.cancelText && (
              <TouchableOpacity style={am.cancelBtn} activeOpacity={0.7} onPress={handleCancel}>
                <Text style={am.cancelText}>{state.cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[am.confirmBtn, { backgroundColor: accent }, !state.cancelText && am.confirmBtnFull]}
              activeOpacity={0.8}
              onPress={handleConfirm}
            >
              <Text style={am.confirmText}>{state.confirmText ?? 'OK'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── ReceiptPickerSheet component ──────────────────────────────────────────────

interface ReceiptPickerSheetProps {
  visible: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onClose: () => void;
}

const ReceiptPickerSheet = ({ visible, onCamera, onGallery, onClose }: ReceiptPickerSheetProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={rp.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      <View style={rp.sheet}>
        <View style={rp.handle} />
        <Text style={rp.title}>Add Receipt</Text>

        <TouchableOpacity style={rp.option} activeOpacity={0.7} onPress={() => { onClose(); onCamera(); }}>
          <Text style={rp.optionText}>Take Photo</Text>
        </TouchableOpacity>

        <View style={rp.divider} />

        <TouchableOpacity style={rp.option} activeOpacity={0.7} onPress={() => { onClose(); onGallery(); }}>
          <Text style={rp.optionText}>Choose from Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[rp.option, rp.cancelOption]} activeOpacity={0.7} onPress={onClose}>
          <Text style={rp.cancelOptionText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ── Main component ────────────────────────────────────────────────────────────

const ExpenseManagementScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: profile } = useSelector((state: RootState) => state.profile);

  const today = new Date();

  const [expenseDate, setExpenseDate] = useState<Date>(today);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReceiptPicker, setShowReceiptPicker] = useState(false);
  const [travel, setTravel] = useState('');
  const [food, setFood] = useState('');
  const [hospitality, setHospitality] = useState('');
  const [description, setDescription] = useState('');
  const [receipts, setReceipts] = useState<Asset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>(ALERT_HIDDEN);
  const [approvedMonthlyTotal, setApprovedMonthlyTotal] = useState<number | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    const fetchSummary = async () => {
      setIsSummaryLoading(true);
      try {
        const { data } = await apiClient.get<{ id: number; expenseDate: string; totalAmount: string; status: string }[]>(
          `/mrs/${profile.id}/expenses`,
        );
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const total = data
          .filter(e => {
            if (e.status !== 'Approved') return false;
            const d = new Date(e.expenseDate);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          })
          .reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
        setApprovedMonthlyTotal(total);
      } catch {
        setApprovedMonthlyTotal(null);
      } finally {
        setIsSummaryLoading(false);
      }
    };
    fetchSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const total =
    (parseFloat(travel) || 0) +
    (parseFloat(food) || 0) +
    (parseFloat(hospitality) || 0);

  const showAlert = (config: Omit<AlertState, 'visible'>) =>
    setAlertState({ ...config, visible: true });

  const dismissAlert = () => setAlertState(ALERT_HIDDEN);

  // ── Receipt selection ──────────────────────────────────────────────────────

  const capturePhoto = async () => {
    const status = await ensureCameraPermission();
    if (status === 'settings') {
      showAlert({
        type: 'info',
        title: 'Camera Permission Required',
        message: 'Camera access has been denied. Please enable it in your device Settings to capture receipt photos.',
        confirmText: 'Open Settings',
        cancelText: 'Cancel',
        onConfirm: () => Linking.openSettings(),
      });
      return;
    }
    if (status === 'denied') return;

    const result = await launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: false, includeBase64: true });
    if (!result.didCancel && !result.errorCode && result.assets?.[0]) {
      setReceipts(prev => [...prev, result.assets![0]]);
    }
  };

  const pickFromGallery = async () => {
    const status = await ensureGalleryPermission();
    if (status === 'settings') {
      showAlert({
        type: 'info',
        title: 'Gallery Permission Required',
        message: 'Photo library access has been denied. Please enable it in your device Settings to upload receipts.',
        confirmText: 'Open Settings',
        cancelText: 'Cancel',
        onConfirm: () => Linking.openSettings(),
      });
      return;
    }
    if (status === 'denied') return;

    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 10, includeBase64: true });
    if (!result.didCancel && !result.errorCode && result.assets?.length) {
      setReceipts(prev => [...prev, ...result.assets!]);
    }
  };

  const removeReceipt = (index: number) => {
    setReceipts(prev => prev.filter((_, i) => i !== index));
  };

  // ── Upload receipt ─────────────────────────────────────────────────────────

  const uploadReceipt = async (asset: Asset): Promise<string> => {
    if (!asset.base64) throw new Error('Receipt image data unavailable');

    const contentType = asset.type ?? 'image/jpeg';

    const { data } = await apiClient.post('/uploads/request-url', {
      name: asset.fileName ?? 'receipt.jpg',
      type: contentType,
      size: asset.fileSize ?? 0,
    });

    // Decode base64 → Uint8Array.
    // React Native's Blob constructor rejects ArrayBuffer/ArrayBufferView, but
    // XMLHttpRequest.send() handles Uint8Array — it base64-encodes it for the
    // bridge and the native layer sends the real binary bytes to GCS.
    const binary = atob(asset.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', data.uploadURL);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Receipt upload failed with status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Receipt upload network error'));
      xhr.send(bytes);
    });

    return data.uploadURL.split('?')[0];
  };

  // ── Save expense ───────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!profile?.id) {
      showAlert({
        type: 'error',
        title: 'Profile Unavailable',
        message: 'Your profile could not be loaded. Please go back and try again.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const receiptUrls: string[] = [];
      for (const asset of receipts) {
        const url = await uploadReceipt(asset);
        receiptUrls.push(url);
      }

      await apiClient.post(`/mrs/${profile.id}/expenses`, {
        expenseDate: formatApiDate(expenseDate),
        travelAmount: travel || '0',
        foodAmount: food || '0',
        hospitalityAmount: hospitality || '0',
        ...(description.trim() ? { description: description.trim() } : {}),
        receiptUrls,
      });

      showAlert({
        type: 'success',
        title: 'Expense Recorded',
        message: 'Your expense has been submitted successfully and is pending review.',
        confirmText: 'Done',
        onConfirm: () => navigation.goBack(),
      });
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Submission Failed',
        message: extractApiError(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const headerTitle = profile?.name
    ? `Record Expense — ${profile.name}`
    : 'Record Expense';

  return (
    <View style={styles.container}>
      <Header title={headerTitle} showBack />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Monthly Expense Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Monthly Expense Summary</Text>
            <Text style={styles.summarySubLabel}>
              {today.toLocaleString('default', { month: 'long', year: 'numeric' })} — Approved
            </Text>
            {isSummaryLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 8 }} />
            ) : approvedMonthlyTotal !== null ? (
              <Text style={styles.summaryAmount}>₹{approvedMonthlyTotal.toFixed(2)}</Text>
            ) : (
              <Text style={styles.summaryAmount}>—</Text>
            )}
          </View>

          {/* Date */}
          <Text style={styles.fieldLabel}>Date</Text>
          <TouchableOpacity
            style={styles.dateRow}
            activeOpacity={0.7}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>{formatDisplayDate(expenseDate)}</Text>
            <CalendarIcon />
          </TouchableOpacity>

          {/* Amount fields */}
          <View style={styles.amountsRow}>
            <View style={styles.amountCol}>
              <Text style={styles.fieldLabel}>Travel (₹)</Text>
              <TextInput
                style={styles.amountInput}
                value={travel}
                onChangeText={setTravel}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.amountCol}>
              <Text style={styles.fieldLabel}>Food (₹)</Text>
              <TextInput
                style={styles.amountInput}
                value={food}
                onChangeText={setFood}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.amountCol}>
              <Text style={styles.fieldLabel}>Hospitality (₹)</Text>
              <TextInput
                style={styles.amountInput}
                value={hospitality}
                onChangeText={setHospitality}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>

          {/* Description */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Description (optional)</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            placeholder="Notes here"
            placeholderTextColor={COLORS.textMuted}
          />

          {/* Receipts */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
            Receipts ({receipts.length})
          </Text>
          <View style={styles.receiptsRow}>
            <TouchableOpacity
              style={styles.uploadReceiptBtn}
              activeOpacity={0.8}
              onPress={() => setShowReceiptPicker(true)}
            >
              <PlusIcon />
              <Text style={styles.uploadReceiptText}>Upload Receipt</Text>
            </TouchableOpacity>

            {receipts.map((_, i) => (
              <View key={i} style={styles.receiptChip}>
                <Text style={styles.receiptChipText}>Receipt {i + 1}</Text>
                <TouchableOpacity
                  onPress={() => removeReceipt(i)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <XCircleIcon />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, total === 0 && styles.saveBtnDisabled]}
              activeOpacity={0.8}
              onPress={handleSave}
              disabled={isSubmitting || total === 0}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.saveBtnText}>Save Expense</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={showDatePicker}
        selectedDate={expenseDate}
        maxDate={today}
        onSelect={date => {
          setExpenseDate(date);
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
      />

      <ReceiptPickerSheet
        visible={showReceiptPicker}
        onCamera={capturePhoto}
        onGallery={pickFromGallery}
        onClose={() => setShowReceiptPicker(false)}
      />

      <AlertModal state={alertState} onDismiss={dismissAlert} />
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
    color: '#374151',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D9E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: COLORS.white,
  },
  dateText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: '#111827',
  },
  amountsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  amountCol: {
    flex: 1,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#D1D9E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: '#111827',
    backgroundColor: COLORS.white,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E8EDF1',
  },
  totalLabel: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  totalValue: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: '#111827',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#D1D9E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 60,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: '#111827',
    minHeight: 100,
    backgroundColor: COLORS.white,
  },
  receiptsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  uploadReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  uploadReceiptText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
  },
  receiptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D1D9E0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  receiptChipText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: '#374151',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D9E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: '#374151',
  },
  saveBtn: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
  },
  summaryCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: '#15803D',
    marginBottom: 2,
  },
  summarySubLabel: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.regular,
    color: '#6B7280',
    marginBottom: 6,
  },
  summaryAmount: {
    fontSize: 22,
    fontFamily: FONTS.family.bold,
    color: '#111827',
  },
});

// AlertModal styles
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
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  actionsCenter: {
    justifyContent: 'center',
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D9E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: '#6B7280',
  },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnFull: {
    flex: 0,
    width: 140,
  },
  confirmText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
  },
});

// ReceiptPickerSheet styles
const rp = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D9E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  option: {
    paddingVertical: 16,
  },
  optionText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  cancelOption: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelOptionText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: '#DC2626',
    textAlign: 'center',
  },
});

export default ExpenseManagementScreen;
