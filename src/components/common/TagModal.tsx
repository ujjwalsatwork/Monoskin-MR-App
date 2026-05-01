import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/redux/store';
import { updateDoctorTags, fetchDoctors } from '@/redux/slices/portfolioSlice';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';

const TAG_OPTIONS = [
  'Needs Samples',
  'Follow Up Today',
  'Unavailable',
  'Reschedule',
  'Not Interested',
  'No Response',
];

type Props = {
  visible: boolean;
  doctorId: string;
  initialTags: string[];
  onClose: () => void;
};

const TagModal = ({ visible, doctorId, initialTags, onClose }: Props) => {
  const dispatch = useDispatch<AppDispatch>();
  const [selected, setSelected] = useState<string[]>(initialTags);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelected(initialTags);
    }
  }, [visible]); // intentionally exclude initialTags to avoid re-render mid-open

  const toggle = (tag: string) => {
    setSelected(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dispatch(updateDoctorTags({ id: doctorId, tags: selected })).unwrap();
      dispatch(fetchDoctors());
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to update tags. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Select Tags</Text>
        <View style={styles.optionsGrid}>
          {TAG_OPTIONS.map(tag => {
            const active = selected.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => toggle(tag)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  option: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  optionActive: {
    backgroundColor: COLORS.buttonBlue,
    borderColor: COLORS.buttonBlue,
  },
  optionText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
  },
  optionTextActive: {
    color: COLORS.white,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.semibold,
    color: COLORS.textSecondary,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.buttonBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.semibold,
    color: COLORS.white,
  },
});

export default TagModal;
