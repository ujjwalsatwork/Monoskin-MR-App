import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { COLORS } from '@/constants/colors';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}

const Button: React.FC<ButtonProps> = ({
  title,
  loading,
  variant = 'primary',
  style,
  disabled,
  ...props
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondary;
      case 'outline':
        return styles.outline;
      default:
        return styles.primary;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.outlineText;
      default:
        return styles.text;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, getVariantStyle(), style, (disabled || loading) && styles.disabled]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? COLORS.primary : COLORS.white} />
      ) : (
        <Text style={[styles.text, getTextStyle()]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  outlineText: {
    color: COLORS.primary,
  },
  disabled: {
    opacity: 0.6,
  },
});

export default Button;
