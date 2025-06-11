// src/components/OrderSelectionModal.tsx
import React from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getFirestore, collection, doc, getDoc } from 'firebase/firestore';
import { Order } from '../types/statsTypes'; // Import Order from statsTypes

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OrderSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  orderIds: string[];
  onSelectOrder: (order: Order) => void;
}

export const OrderSelectionModal: React.FC<OrderSelectionModalProps> = ({
  visible,
  onClose,
  orderIds,
  onSelectOrder,
}) => {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Valores de animação
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;
  const modalTranslateY = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    if (visible) {
      // Animar entrada
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(modalTranslateY, {
          toValue: 0,
          damping: 20,
          mass: 1,
          stiffness: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animar saída
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(modalTranslateY, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  React.useEffect(() => {
    const fetchOrders = async () => {
      if (!visible || orderIds.length === 0) return;
      
      setLoading(true);
      try {
        const db = getFirestore();
        const ordersCollection = collection(db, 'orders');
        
        const ordersData = await Promise.all(
          orderIds.map(async (orderId) => {
            const docRef = doc(ordersCollection, orderId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              return { id: docSnap.id, ...docSnap.data() } as Order;
            }
            return null;
          })
        );

        setOrders(ordersData.filter((order): order is Order => order !== null));
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [visible, orderIds]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    // Calculate dateString beforehand
    let dateString = 'Data inválida';
    if (item.date) {
      if (typeof (item.date as any)?.seconds === 'number') {
        // Handle Firestore Timestamp
        dateString = new Date((item.date as any).seconds * 1000).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (item.date instanceof Date) {
        // Handle JavaScript Date object
        dateString = item.date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }

    return (
      <TouchableOpacity
        style={styles.orderItem}
        onPress={() => {
          onSelectOrder(item);
          handleClose();
        }}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>Pedido #{item.number}</Text>
          <MaterialIcons name="chevron-right" size={24} color="#666" />
        </View>

        <View style={styles.orderInfo}>
          <MaterialIcons name="access-time" size={16} color="#666" style={styles.icon} />
          {/* Render the pre-calculated dateString */}
          <Text style={styles.orderText}>{dateString}</Text>
        </View>

        <View style={styles.orderInfo}>
          <MaterialIcons name="place" size={16} color="#666" style={styles.icon} />
          {/* Ensure address is also handled safely */}
          <Text style={styles.orderText} numberOfLines={1}>
            {item.address ?? 'Endereço não disponível'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View 
        style={[
          styles.modalContainer,
          {
            opacity: overlayOpacity,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: modalTranslateY }],
              }
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              <View>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Selecione um Pedido</Text>
                  <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <MaterialIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                {loading ? (
                  <ActivityIndicator size="large" color="#FF4B2B" style={styles.loader} />
                ) : (
                  <FlatList
                    data={orders}
                    renderItem={renderOrderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  orderItem: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  orderText: {
    fontSize: 14,
    color: '#4A5568',
    flex: 1,
  },
  separator: {
    height: 12,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OrderSelectionModal;