import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import {
  PhoneSmallIcon,
  InfoIcon,
  RightArrowIcon,
} from '@/assets/images';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'RequestUnbind'>;

const REASONS = [
  'Lost my device',
  'Device was stolen',
  'Device limit exceeded',
  'Switched to a new device',
  'Device is damaged',
  'Other',
];

const RequestUnbindScreen = ({ navigation }: Props) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSendRequest = async () => {
    if (!selectedReason) {
      Alert.alert('Required', 'Please select a reason for your request.');
      return;
    }
    setSubmitting(true);
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 1500));
      navigation.replace('UnbindSuccess', {
        deviceName: 'iPhone 14 Pro',
        deviceId: 'MR-8829-991',
        reason: selectedReason,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleContactSupport = () => {
    navigation.navigate('ContactSupport');
  };

  return (
    <View style={styles.safeArea}>
      <Header title="Request Unbind" showBack showNotification showProfile />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoIconContainer}>
            <InfoIcon />
          </View>
          <View style={styles.infoTextWrapper}>
            <Text style={styles.infoBannerTitle}>Unbind Process</Text>
            <Text style={styles.infoBannerSubtitle}>
              Your request will be sent to your Area Manager for approval. Once approved, you can bind this new device.
            </Text>
          </View>
        </View>

        {/* Current Bound Device */}
        <Text style={styles.sectionLabel}>CURRENT BOUND DEVICE</Text>
        <View style={styles.deviceCard}>
          <View style={styles.deviceIconContainer}>
            <PhoneSmallIcon />
          </View>
          <View style={styles.deviceTextWrapper}>
            <Text style={styles.deviceName}>iPhone 14 Pro</Text>
            <Text style={styles.deviceId}>ID: MR-8829-991</Text>
          </View>
        </View>

        {/* Reason for Request */}
        <Text style={styles.sectionLabel}>REASON FOR REQUEST</Text>

        {/* Dropdown */}
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setDropdownVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.dropdownText, !selectedReason && styles.dropdownPlaceholder]}>
            {selectedReason || 'Select a reason'}
          </Text>
          <Text style={styles.dropdownChevron}>›</Text>
        </TouchableOpacity>

        {/* Additional Details */}
        <TextInput
          style={styles.textArea}
          placeholder="Additional details (Optional)"
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={5}
          value={additionalDetails}
          onChangeText={setAdditionalDetails}
          textAlignVertical="top"
        />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}
          onPress={handleSendRequest}
          disabled={submitting}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Sending...' : 'Send Unbind Request'}
          </Text>
          {!submitting && <RightArrowIcon />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleContactSupport}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Contact Support</Text>
        </TouchableOpacity>
      </View>

      {/* Reason Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select a reason</Text>
            <FlatList
              data={REASONS}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    selectedReason === item && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedReason(item);
                    setDropdownVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedReason === item && styles.modalOptionTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {selectedReason === item && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#F0F2F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextWrapper: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 4,
  },
  infoBannerSubtitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  // Section label
  sectionLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  // Device Card
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  deviceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(46, 80, 178, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  deviceTextWrapper: {
    flex: 1,
  },
  deviceName: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 2,
  },
  deviceId: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },

  // Dropdown
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  dropdownText: {
    flex: 1,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textDark,
  },
  dropdownPlaceholder: {
    color: COLORS.textMuted,
  },
  dropdownChevron: {
    fontSize: 22,
    color: COLORS.textMuted,
    transform: [{ rotate: '90deg' }],
    lineHeight: 24,
  },

  // Text Area
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textDark,
    minHeight: 120,
    marginBottom: 8,
  },

  // Bottom actions
  bottomContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  primaryButton: {
    backgroundColor: COLORS.buttonBlue,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.semibold,
  },
  secondaryButton: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: COLORS.buttonBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.buttonBlue,
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.semibold,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(46, 80, 178, 0.06)',
  },
  modalOptionText: {
    flex: 1,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textDark,
  },
  modalOptionTextSelected: {
    color: COLORS.buttonBlue,
    fontFamily: FONTS.family.bold,
  },
  checkmark: {
    color: COLORS.buttonBlue,
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
  },
});

export default RequestUnbindScreen;
