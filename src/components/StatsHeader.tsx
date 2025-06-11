import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import styles from '../styles/statsScreenStyles';

interface SelectedDataItem {
  name: string;
  id: string;
}

interface StatsHeaderProps {
  type: 'deliveryman' | 'unit';
  selectedData: SelectedDataItem[];
}

export const StatsHeader: React.FC<StatsHeaderProps> = ({ type, selectedData }) => (
  <>
    <View style={styles.header}>
      <MaterialIcons 
        name={type === 'deliveryman' ? 'person' : 'business'} 
        size={40} 
        color="#FF4B2B"
      />
      <Text style={styles.title}>
        {type === 'deliveryman' ? 'Estatísticas do(s) Entregador(es)' : 'Estatísticas da(s) Unidade(s)'}
      </Text>
    </View>
    <View style={styles.nameContainer}>
      {selectedData.map((item, index) => (
        <Text key={index} style={styles.name}>
          {item.name} - {item.id}
        </Text>
      ))}
    </View>
  </>
);

export default StatsHeader;