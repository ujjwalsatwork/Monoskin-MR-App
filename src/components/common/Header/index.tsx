import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '@/constants/colors';
import { useNavigation } from '@react-navigation/native';

interface HeaderProps {
  title: string;
  showBack?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, showBack = false }) => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {showBack && (
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  backText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default Header;
