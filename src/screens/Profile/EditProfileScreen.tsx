import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import { ProfileIcon, Camera } from '@/assets/images';
import Config from 'react-native-config';
import { updateMyProfile } from '@/redux/slices/profileSlice';
import { RootState } from '@/redux/rootReducer';
import { AppDispatch } from '@/redux/store';
import ImagePickerModal from '@/components/common/ImagePickerModal';

// ── Icons ─────────────────────────────────────────────────────────────────────

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

// ── AlertModal ────────────────────────────────────────────────────────────────

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

const ALERT_HIDDEN: AlertState = { visible: false, type: 'info', title: '', message: '' };

const ALERT_ACCENT: Record<AlertType, string> = {
  success: '#16A34A',
  error: '#DC2626',
  info: '#2563EB',
};

const AlertModal = ({ state, onDismiss }: { state: AlertState; onDismiss: () => void }) => {
  const accent = ALERT_ACCENT[state.type];
  const Icon =
    state.type === 'success' ? CheckCircleIcon
    : state.type === 'error' ? ErrorCircleIcon
    : InfoCircleIcon;

  const handleConfirm = () => { onDismiss(); state.onConfirm?.(); };
  const handleCancel = () => { onDismiss(); state.onCancel?.(); };

  return (
    <Modal visible={state.visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={am.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={state.cancelText ? undefined : onDismiss}
        />
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
    message: 'Monoskin MR needs camera access to take a profile photo.',
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
    message: 'Monoskin MR needs access to your photo library to choose a profile photo.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });
  if (result === 'granted') return 'granted';
  if (result === 'never_ask_again') return 'settings';
  return 'denied';
};

// ── Screen ────────────────────────────────────────────────────────────────────

const EditProfileScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();

  const { data: profile, isUpdating } = useSelector(
    (state: RootState) => state.profile,
  );

  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [territory, setTerritory] = useState(profile?.territory ?? '');
  const [region, setRegion] = useState(profile?.region ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(profile?.profilePhoto ?? null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>(ALERT_HIDDEN);

  const showAlert = (config: Omit<AlertState, 'visible'>) =>
    setAlertState({ ...config, visible: true });

  const dismissAlert = () => setAlertState(ALERT_HIDDEN);

  const handleTakePhoto = async () => {
    const status = await ensureCameraPermission();
    if (status === 'settings') {
      showAlert({
        type: 'info',
        title: 'Camera Permission Required',
        message: 'Camera access has been denied. Please enable it in your device Settings to take a photo.',
        confirmText: 'Open Settings',
        cancelText: 'Cancel',
        onConfirm: () => Linking.openSettings(),
      });
      return;
    }
    if (status === 'denied') return;
    const res = await launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: false });
    if (!res.didCancel && !res.errorCode && res.assets?.[0]?.uri) {
      setPhotoUri(res.assets[0].uri);
    }
  };

  const handleChooseGallery = async () => {
    const status = await ensureGalleryPermission();
    if (status === 'settings') {
      showAlert({
        type: 'info',
        title: 'Gallery Permission Required',
        message: 'Photo library access has been denied. Please enable it in your device Settings.',
        confirmText: 'Open Settings',
        cancelText: 'Cancel',
        onConfirm: () => Linking.openSettings(),
      });
      return;
    }
    if (status === 'denied') return;
    const res = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 });
    if (!res.didCancel && !res.errorCode && res.assets?.[0]?.uri) {
      setPhotoUri(res.assets[0].uri);
    }
  };

  const handleSave = async () => {
    const formData = new FormData();

    if (phone.trim()) formData.append('phone', phone.trim());
    if (territory.trim()) formData.append('territory', territory.trim());
    if (region.trim()) formData.append('region', region.trim());

    if (photoUri && photoUri !== profile?.profilePhoto) {
      const filename = photoUri.split('/').pop() ?? 'photo.jpg';
      const ext = filename.split('.').pop()?.toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      formData.append('profilePhoto', { uri: photoUri, name: filename, type: mimeType } as any);
    }

    const result = await dispatch(updateMyProfile(formData));
    if (updateMyProfile.fulfilled.match(result)) {
      showAlert({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully.',
        confirmText: 'Done',
        onConfirm: () => navigation.goBack(),
      });
    } else {
      showAlert({
        type: 'error',
        title: 'Update Failed',
        message: 'Something went wrong while updating your profile. Please try again.',
      });
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Edit Profile" showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo Picker */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={() => setPickerVisible(true)} activeOpacity={0.8}>
            <View style={styles.avatarCircle}>
              {photoUri ? (
                <Image
                  source={{
                    uri: photoUri.startsWith('/')
                      ? `${Config.BASE_URL}${photoUri}`
                      : photoUri,
                  }}
                  style={styles.avatarImage}
                />
              ) : (
                <ProfileIcon width={100} height={100} />
              )}
            </View>
            <View style={styles.cameraBtn}>
              <Camera width={16} height={16} />
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>Tap to change photo</Text>
        </View>

        {/* Read-only info */}
        <View style={styles.readOnlyCard}>
          <ReadOnlyRow label="Name" value={profile?.name ?? '—'} />
          <View style={styles.divider} />
          <ReadOnlyRow label="Email" value={profile?.email ?? '—'} />
          <View style={styles.divider} />
          <ReadOnlyRow label="Employee ID" value={profile?.employeeId ?? '—'} />
          <View style={styles.divider} />
          <ReadOnlyRow label="Role" value={profile?.managerRole ?? '—'} />
          <View style={styles.divider} />
          <ReadOnlyRow label="Reporting Manager" value={profile?.reportingManager ?? '—'} />
        </View>

        <Text style={styles.sectionLabel}>EDITABLE INFO</Text>

        {/* Editable fields */}
        <View style={styles.editCard}>
          <InputRow
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit phone number"
            keyboardType="phone-pad"
            maxLength={10}
          />
          <View style={styles.divider} />
          <InputRow
            label="Territory"
            value={territory}
            onChangeText={setTerritory}
            placeholder="e.g. Maharashtra"
          />
          <View style={styles.divider} />
          <InputRow
            label="Region"
            value={region}
            onChangeText={setRegion}
            placeholder="e.g. West"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
          activeOpacity={0.8}
          onPress={handleSave}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <ImagePickerModal
        visible={pickerVisible}
        onCamera={handleTakePhoto}
        onGallery={handleChooseGallery}
        onClose={() => setPickerVisible(false)}
      />

      <AlertModal state={alertState} onDismiss={dismissAlert} />
    </View>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const ReadOnlyRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const InputRow = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
  maxLength?: number;
}) => (
  <View style={styles.inputRow}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#A0ABBB"
      keyboardType={keyboardType ?? 'default'}
      maxLength={maxLength}
    />
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContainer: { paddingBottom: 40 },

  avatarSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#4263EB',
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4263EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  photoHint: {
    marginTop: 10,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },

  sectionLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: '#111827',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },

  readOnlyCard: {
    marginHorizontal: 16,
    backgroundColor: '#F7F9FB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EDF1',
  },
  editCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EDF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  divider: { height: 1, backgroundColor: '#E8EDF1', marginLeft: 16 },

  infoRow: { paddingHorizontal: 16, paddingVertical: 12 },
  infoLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: '#6B7280',
  },

  inputRow: { paddingHorizontal: 16, paddingVertical: 12 },
  inputLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  input: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: '#111827',
    padding: 0,
  },

  saveButton: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#4263EB',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: {
    color: COLORS.white,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
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
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  actionsCenter: { justifyContent: 'center' },
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
  confirmBtnFull: { flex: 0, width: 140 },
  confirmText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
  },
});

export default EditProfileScreen;
