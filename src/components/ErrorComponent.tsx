// src/components/ErrorComponent/index.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import styles from '../styles/clientScreenStyles';

interface ErrorComponentProps {
  error: string;
  onRetry: () => void;
}

const ErrorComponent: React.FC<ErrorComponentProps> = ({ error, onRetry }) => (
  <View style={styles.errorContainer}>
    <AlertCircle 
      size={48} 
      color="#e41c26"
      strokeWidth={1.5} 
    />
    <Text style={styles.errorText}>{error}</Text>
    <TouchableOpacity 
      style={styles.retryButton}
      onPress={onRetry}
      activeOpacity={0.7}
    >
      <Text style={styles.retryButtonText}>Tentar novamente</Text>
    </TouchableOpacity>
  </View>
);

export default ErrorComponent;