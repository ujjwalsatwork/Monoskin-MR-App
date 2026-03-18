import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { COLORS } from '@/constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error ? styles.inputError : null]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={COLORS.textSecondary}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  inputContainer: {
    height: 50,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
});

export default Input;
