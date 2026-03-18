import React from 'react';
import { View, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { COLORS } from '@/constants/colors';

interface LoaderProps {
  visible?: boolean;
  overlay?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ visible = true, overlay = true }) => {
  if (!visible) return null;

  const content = (
    <View style={[styles.container, overlay ? styles.overlay : null]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  if (overlay) {
    return (
      <Modal transparent visible={visible} animationType="fade">
        {content}
      </Modal>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});

export default Loader;
