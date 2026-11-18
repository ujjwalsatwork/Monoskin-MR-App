import React from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, FlatList,
} from 'react-native';
import BottomSheetModal from '../BottomSheetModal';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import { CheckCircleIcon } from '@/assets/images';

export const ASSIGN_OPTIONS = [
  'Assign to Me (Current User)',
  'Rajesh Kumar',
  'Priya Mehta',
  'Suresh Nair',
];

type Props = {
  visible: boolean;
  selected: string;
  onSelect: (val: string) => void;
  onClose: () => void;
};

const AssignModal = ({ visible, selected, onSelect, onClose }: Props) => (
  <BottomSheetModal visible={visible} onClose={onClose}>
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <Text style={styles.title}>Assign To</Text>

      <FlatList
        data={ASSIGN_OPTIONS}
        keyExtractor={item => item}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const active = item === selected;
          return (
            <TouchableOpacity
              style={styles.option}
              activeOpacity={0.7}
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {item}
              </Text>
              {active && <CheckCircleIcon width={18} height={18} />}
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  </BottomSheetModal>
);

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  optionText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textDark,
  },
  optionTextActive: {
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
  },
  sep: { height: 1, backgroundColor: COLORS.border },
});

export default AssignModal;
