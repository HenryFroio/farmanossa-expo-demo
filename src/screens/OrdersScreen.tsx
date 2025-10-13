// src/screens/OrdersScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Order } from '../types/statsTypes';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet'; // Added BottomSheet
import OrderDetailsBottomSheet from '../components/OrderDetailsBottomSheet'; // Added OrderDetailsBottomSheet
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Added GestureHandlerRootView

// Define a type for the route params
type OrdersScreenRouteProp = RouteProp<{
  params: {
    type: 'deliveryman' | 'unit';
    ids: string[];
    initialDate: string; // ISO string
  };
}, 'params'>;

const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const OrdersScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<OrdersScreenRouteProp>();
  const { type, ids, initialDate } = route.params;

  const [currentDate, setCurrentDate] = useState(new Date(initialDate));
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null); // Added selectedOrder state
  const bottomSheetRef = useRef<BottomSheet>(null); // Added bottomSheetRef
  const [userRole, setUserRole] = useState('admin'); // Added userRole state

  const fetchOrders = useCallback(async (date: Date) => {
    setIsLoading(true);
    setError(null);
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const ordersCollection = collection(db, 'orders');
      let qBase = query(
        ordersCollection,
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('date', 'desc')
      );

      let q;
      if (ids && ids.length > 0) { // Check if ids is not empty
        if (type === 'deliveryman') {
          q = query(qBase, where('deliveryMan', 'in', ids));
        } else if (type === 'unit') {
          q = query(qBase, where('pharmacyUnitId', 'in', ids));
        } else {
          // Optional: Handle cases where type is not 'deliveryman' or 'unit'
          // or if ids are required but not provided for these types.
          // For now, we'll assume q remains qBase if type is unrecognized
          // and ids might not be applicable.
          q = qBase;
        }
      } else {
        // If ids is empty or undefined, and it's essential for the query logic for 'deliveryman' or 'unit',
        // you might want to throw an error or handle it by setting orders to empty and returning.
        // For now, let's log a warning and fetch no orders, or fetch all orders for the day if that's desired.
        console.warn("IDs array is empty. Adjust query logic as needed.");
        // Example: Fetch no orders if IDs are essential
        setOrders([]);
        setIsLoading(false);
        return;
        // Or, if you want to fetch all orders for the day regardless of ID (e.g., for an admin view without specific filters):
        // q = qBase; 
      }

      const querySnapshot = await getDocs(q);
      const fetchedOrders: Order[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Basic conversion, assuming Order type matches Firestore structure mostly
        return {
          id: doc.id,
          ...data,
          date: (data.date as Timestamp).toDate(),
          // Ensure other timestamp fields are converted if necessary
          createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
          updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : new Date(),
          lastStatusUpdate: data.lastStatusUpdate ? (data.lastStatusUpdate as Timestamp).toDate() : new Date(),
          // Handle optional fields
          reviewDate: data.reviewDate ? (data.reviewDate as Timestamp).toDate() : undefined,
          statusHistory: (data.statusHistory || []).map((item: any) => ({
            status: item.status,
            timestamp: (item.timestamp as Timestamp).toDate()
          })),
          priceNumber: parseFloat(String(data.price).replace('R$ ', '').replace(',', '.')) || 0,
        } as Order;
      });
      setOrders(fetchedOrders);
    } catch (err) {
      console.error("Error fetching orders: ", err);
      setError('Falha ao buscar pedidos. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [type, ids]);

  useEffect(() => {
    fetchOrders(currentDate);
  }, [currentDate, fetchOrders]);

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  const handleOrderPress = (order: Order) => {
    setSelectedOrder(order);
    bottomSheetRef.current?.expand();
  };

  const handleCloseBottomSheet = () => {
    setSelectedOrder(null);
    bottomSheetRef.current?.close();
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity style={styles.orderItemContainer} onPress={() => handleOrderPress(item)}>
      <View style={styles.orderItemHeader}>
        <Text style={styles.orderId}>Pedido #{item.id.substring(0, 6)}...</Text>
        <Text style={styles.orderStatus}>{item.status}</Text>
      </View>
      <Text style={styles.customerName}>{item.customerName || 'Cliente não informado'}</Text>
      {item.items && item.items.length > 0 && (
        <Text style={styles.orderItemsPreview} numberOfLines={1} ellipsizeMode="tail">
          Itens: {item.items.slice(0, 2).join(', ') + (item.items.length > 2 ? '...' : '')}
        </Text>
      )}
      <View style={styles.orderItemFooter}>
        <Text style={styles.orderTime}>{item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        <Text style={styles.orderPrice}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FF4B2B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pedidos do Dia</Text>
        </View>

        <View style={styles.dateNavigator}>
          <TouchableOpacity onPress={handlePreviousDay} style={styles.navButton}>
            <Ionicons name="chevron-back" size={28} color="#FF4B2B" />
          </TouchableOpacity>
          <Text style={styles.currentDateText}>{formatDate(currentDate)}</Text>
          <TouchableOpacity onPress={handleNextDay} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={28} color="#FF4B2B" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#FF4B2B" style={styles.loader} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : orders.length === 0 ? (
          <Text style={styles.noOrdersText}>Nenhum pedido encontrado para esta data.</Text>
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContentContainer}
          />
        )}
      </View>
      {selectedOrder && (
        <OrderDetailsBottomSheet
          order={selectedOrder}
          bottomSheetRef={bottomSheetRef}
          onClose={handleCloseBottomSheet}
          userRole={userRole}
        />
      )}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  dateNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  navButton: {
    padding: 8,
  },
  currentDateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  loader: {
    marginTop: 50,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: 'red',
  },
  noOrdersText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#6c757d',
  },
  listContentContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  orderItemContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#343a40',
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF4B2B',
    textTransform: 'capitalize',
  },
  customerName: {
    fontSize: 15,
    color: '#495057',
    marginBottom: 4,
  },
  orderItemsPreview: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  orderItemFooter: { // To align time and price in the same line
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  orderTime: {
    fontSize: 13,
    color: '#6c757d',
    // marginBottom: 4, // Removed as it's now in a footer
  },
  orderPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#28a745',
    // textAlign: 'right', // No longer needed if space-between is used
  },
});

export default OrdersScreen;
