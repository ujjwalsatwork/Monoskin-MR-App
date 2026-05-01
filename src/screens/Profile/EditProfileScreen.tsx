import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import { ProfileIcon, Camera } from '@/assets/images';
import Config from 'react-native-config';
import { updateMyProfile, clearUpdateError } from '@/redux/slices/profileSlice';
import { RootState } from '@/redux/rootReducer';
import { AppDispatch } from '@/redux/store';

const EditProfileScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();

  const { data: profile, isUpdating, updateError } = useSelector(
    (state: RootState) => state.profile,
  );

  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [territory, setTerritory] = useState(profile?.territory ?? '');
  const [region, setRegion] = useState(profile?.region ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(profile?.profilePhoto ?? null);

  const handlePickImage = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: () =>
          launchCamera(
            { mediaType: 'photo', quality: 0.8, saveToPhotos: false },
            (res) => {
              if (!res.didCancel && !res.errorCode && res.assets?.[0]?.uri) {
                setPhotoUri(res.assets[0].uri);
              }
            },
          ),
      },
      {
        text: 'Choose from Gallery',
        onPress: () =>
          launchImageLibrary(
            { mediaType: 'photo', quality: 0.8, selectionLimit: 1 },
            (res) => {
              if (!res.didCancel && !res.errorCode && res.assets?.[0]?.uri) {
                setPhotoUri(res.assets[0].uri);
              }
            },
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
      formData.append('profilePhoto', {
        uri: photoUri,
        name: filename,
        type: mimeType,
      } as any);
    }
    console.log('🚀 ~ handleSave ~ formData:', formData)

    const result = await dispatch(updateMyProfile(formData));
    if (updateMyProfile.fulfilled.match(result)) {
      Alert.alert('Success', 'Profile updated successfully.');
      navigation.goBack();
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
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
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
          <ReadOnlyRow
            label="Reporting Manager"
            value={profile?.reportingManager ?? '—'}
          />
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

        {updateError ? (
          <Text style={styles.errorText}>{updateError}</Text>
        ) : null}

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
    </View>
  );
};

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

  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    color: '#6B7280',
  },

  inputRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
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

  errorText: {
    color: '#E44B4B',
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
  },
});

export default EditProfileScreen;
