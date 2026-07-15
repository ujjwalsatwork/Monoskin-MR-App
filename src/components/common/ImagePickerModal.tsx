import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import BottomSheetModal from './BottomSheetModal';

type Props = {
  visible: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onClose: () => void;
};

const ImagePickerModal = ({ visible, onCamera, onGallery, onClose }: Props) => {
  const pendingAction = useRef<(() => void) | null>(null);

  const selectCamera = () => { pendingAction.current = onCamera; onClose(); };
  const selectGallery = () => { pendingAction.current = onGallery; onClose(); };
  const handleDismissed = () => {
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} onDismissed={handleDismissed}>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Profile Photo</Text>

        <TouchableOpacity style={styles.option} activeOpacity={0.7} onPress={selectCamera}>
          <Text style={styles.optionText}>Take Photo</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.option} activeOpacity={0.7} onPress={selectGallery}>
          <Text style={styles.optionText}>Choose from Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.option, styles.cancelOption]} activeOpacity={0.7} onPress={onClose}>
          <Text style={styles.cancelOptionText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
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

export default ImagePickerModal;
