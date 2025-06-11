import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import styles from '../styles/statsScreenStyles';

type TabType = 'overview' | 'details';

interface StatsTabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const StatsTabs: React.FC<StatsTabsProps> = ({ activeTab, setActiveTab }) => (
  <View style={styles.tabContainer}>
    <TouchableOpacity
      style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
      onPress={() => setActiveTab('overview')}
    >
      <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
        Visão Geral
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.tab, activeTab === 'details' && styles.activeTab]}
      onPress={() => setActiveTab('details')}
    >
      <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
        Detalhes
      </Text>
    </TouchableOpacity>
  </View>
);

export default StatsTabs;