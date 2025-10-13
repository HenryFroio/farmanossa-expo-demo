import React from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface CancelledOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  cancelReason?: string;
  address: string;
}

interface CancelledOrdersModalProps {
  visible: boolean;
  onClose: () => void;
  cancelledOrders: CancelledOrder[];
  isLoading: boolean;
  onOrderPress: (orderId: string) => void;
}

export const CancelledOrdersModal: React.FC<CancelledOrdersModalProps> = ({
  visible,
  onClose,
  cancelledOrders,
  isLoading,
  onOrderPress,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderOrder = ({ item }: { item: CancelledOrder }) => (
    <TouchableOpacity 
      style={styles.deliverymanItem}
      onPress={() => {
        onOrderPress(item.orderId);
        onClose();
      }}
    >
      <View style={styles.deliverymanInfo}>
        <MaterialIcons name="cancel" size={24} color="#FF4B2B" />
        <View style={styles.deliverymanDetails}>
          <Text style={styles.deliverymanName}>
            {item.customerName || 'Cliente não informado'}
          </Text>
          <Text style={styles.deliverymanStats}>
            Pedido #{item.orderNumber} • {formatDate(item.createdAt)}
          </Text>
          {item.cancelReason && (
            <Text style={styles.deliverymanStats}>
              Motivo: {item.cancelReason}
            </Text>
          )}
          <Text style={styles.deliverymanStats} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#666" />
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalContainer}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pedidos Cancelados</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF4B2B" />
              <Text style={styles.loadingText}>Carregando pedidos cancelados...</Text>
            </View>
          ) : cancelledOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
              <Text style={styles.emptyText}>Nenhum pedido cancelado</Text>
              <Text style={styles.emptySubtext}>
                Não há pedidos cancelados neste período
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.modalSubtitle}>
                Total: {cancelledOrders.length} {cancelledOrders.length === 1 ? 'pedido' : 'pedidos'}
              </Text>
              <FlatList
                data={cancelledOrders}
                renderItem={renderOrder}
                keyExtractor={(item) => item.orderId}
                style={styles.deliverymanList}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%', // Máximo de 90%, mas pode ser menor
    paddingBottom: 0, // Remove padding, deixa a lista ir até o final
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalSubtitle: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f5f5f5',
  },
  deliverymanList: {
    paddingHorizontal: 20,
  },
  listContent: {
    paddingTop: 0,
    paddingBottom: 100, // Espaço para o último item poder rolar acima do botão Home
  },
  deliverymanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  deliverymanInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  deliverymanDetails: {
    marginLeft: 12,
    flex: 1,
  },
  deliverymanName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deliverymanStats: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
});

