import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const BACKDROP_COLOR = 'rgba(0,0,0,0.25)';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const BottomSheetModal = ({ visible, onClose, children }: Props) => {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted && !visible) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop - visual only, touches pass through */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents="none"
      />

      {/* Full-screen dismiss area + sheet container */}
      <View style={styles.container}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
        <Animated.View style={{ transform: [{ translateY }] }}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BACKDROP_COLOR,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
});

export default BottomSheetModal;
