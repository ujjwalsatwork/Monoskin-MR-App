import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const BACKDROP_COLOR = 'rgba(0,0,0,0.25)';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  onDismissed?: () => void;
};

const BottomSheetModal = ({ visible, onClose, children, onDismissed }: Props) => {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // `mounted`      – whether this component renders at all (controls tree presence)
  // `nativeVisible`– the `visible` prop fed to the RN Modal (controls the native VC)
  //
  // These must be separate on iOS so that after the JS animation ends we can
  // set nativeVisible=false (triggering native dismissal) while keeping the
  // Modal node in the tree long enough for onDismiss to fire. Only once the
  // native layer confirms the VC is gone do we call the callback and set
  // mounted=false to remove the node.
  const [mounted, setMounted] = useState(false);
  const [nativeVisible, setNativeVisible] = useState(false);

  // Callback to fire once the native layer has fully removed the modal VC.
  const pendingCb = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setNativeVisible(true);
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
      ]).start(() => {
        pendingCb.current = onDismissed ?? null;

        if (Platform.OS === 'ios') {
          // Setting nativeVisible=false tells the RN Modal to hide itself,
          // which starts the native VC dismissal. onDismiss fires below once
          // the VC is completely gone — safe to present camera/gallery at that point.
          setNativeVisible(false);
        } else {
          // Android: image-picker uses an Intent (separate Activity), not a child
          // VC, so there is no parent–child dismissal race. Call the callback
          // first, then remove from tree.
          const cb = pendingCb.current;
          pendingCb.current = null;
          setNativeVisible(false);
          setMounted(false);
          cb?.();
        }
      });
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal
      visible={nativeVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      // iOS only – fires after the native UIViewController is fully gone.
      // This is the earliest safe moment to present another VC (camera / gallery).
      onDismiss={() => {
        const cb = pendingCb.current;
        pendingCb.current = null;
        setMounted(false);
        cb?.();
      }}
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
