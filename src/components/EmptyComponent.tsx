// src/components/EmptyComponent/index.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { InboxIcon } from 'lucide-react-native';
import styles from '../styles/clientScreenStyles';

interface EmptyComponentProps {
  clientPhone: string | null;
}

const EmptyComponent: React.FC<EmptyComponentProps> = ({ clientPhone }) => (
  <View style={styles.emptyContainer}>
    <InboxIcon 
      size={48} 
      color="#718096"
      strokeWidth={1.5}
    />
    <Text style={styles.emptyText}>
      {clientPhone 
        ? 'Nenhum pedido encontrado para este número'
        : 'Cadastre seu telefone para ver seus pedidos'}
    </Text>
  </View>
);

export default EmptyComponent;