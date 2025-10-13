import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface DeliverymanStat {
  id: string;
  name: string;
  deliveries: number;
  averageRating: number;
}

interface AllDeliverymenModalProps {
  visible: boolean;
  onClose: () => void;
  deliverymenStats: DeliverymanStat[];
  onNavigateToDeliveryman?: (deliverymanId: string) => void;
}

export const AllDeliverymenModal: React.FC<AllDeliverymenModalProps> = ({
  visible,
  onClose,
  deliverymenStats,
  onNavigateToDeliveryman,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleDeliverymanPress = (deliverymanId: string) => {
    setLoadingId(deliverymanId);
    onNavigateToDeliveryman?.(deliverymanId);
    // Delay para mostrar o loading brevemente antes de fechar
    setTimeout(() => {
      setLoadingId(null);
      onClose();
    }, 300);
  };

  const renderDeliverymanItem = ({ item, index }: { item: DeliverymanStat; index: number }) => (
    <TouchableOpacity 
      style={styles.deliverymanItem}
      onPress={() => handleDeliverymanPress(item.id)}
      activeOpacity={0.7}
      disabled={loadingId !== null}
    >
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>#{index + 1}</Text>
      </View>
      
      <View style={styles.deliverymanInfo}>
        <View style={styles.nameContainer}>
          <MaterialIcons name="person" size={20} color="#FF4B2B" />
          <Text style={styles.deliverymanName}>
            {item.name.split(' ').slice(0, 2).join(' ')}
          </Text>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialIcons name="local-shipping" size={16} color="#666" />
            <Text style={styles.statText}>
              {item.deliveries} {item.deliveries > 1 ? 'entregas' : 'entrega'}
            </Text>
          </View>
          
          {item.averageRating > 0 && (
            <View style={styles.statItem}>
              <MaterialIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.statText}>
                {item.averageRating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {loadingId === item.id ? (
        <ActivityIndicator size="small" color="#FF4B2B" />
      ) : (
        <MaterialIcons name="chevron-right" size={20} color="#ccc" />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {
        setLoadingId(null);
        onClose();
      }}
    >
      <TouchableOpacity 
        style={styles.modalContainer}
        activeOpacity={1}
        onPress={() => {
          setLoadingId(null);
          onClose();
        }}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.modalContent}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Todos os Entregadores</Text>
            <TouchableOpacity 
              onPress={() => {
                setLoadingId(null);
                onClose();
              }} 
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.subtitle}>
            <Text style={styles.subtitleText}>
              Ordenados por número de entregas • Toque para ver detalhes
            </Text>
            <Text style={styles.totalText}>
              Total: {deliverymenStats.length} entregadores
            </Text>
          </View>

          <FlatList
            data={deliverymenStats}
            renderItem={renderDeliverymanItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Overlay escuro
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  subtitle: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  totalText: {
    fontSize: 12,
    color: '#999',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100, // Espaço para o último item poder rolar acima do botão Home
  },
  deliverymanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  rankContainer: {
    backgroundColor: '#FF4B2B',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deliverymanInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliverymanName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
});

export default AllDeliverymenModal;
