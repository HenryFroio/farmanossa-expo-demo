import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import styles from '../styles/clientScreenStyles';

const LoadingComponent: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#e41c26" />
    <Text style={styles.loadingText}>Carregando seus pedidos...</Text>
  </View>
);

export default LoadingComponent;