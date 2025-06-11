import { useState, useCallback, useEffect } from 'react';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  DocumentData,
  Timestamp 
} from 'firebase/firestore';

interface StatusHistoryItem {
  status: string;
  timestamp: Date;
}

interface Deliveryman {
  id: string;
  name: string;
  pharmacyUnitId: string;
  status: string;
  orderId: string | null;
}

export interface Order {
  id: string;
  number: string;
  status: string;
  price: string;
  priceNumber: number;
  reviewRequested?: boolean;
  rating?: number;
  reviewComment?: string;
  reviewDate?: Date;
  items: string[];
  itemCount: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  lastStatusUpdate: Date;
  address: string;
  customerName: string;
  customerPhone: string;
  pharmacyUnitId: string;
  deliveryMan?: string;
  deliveryManName?: string;
  licensePlate?: string;
  location: any | null;
  isDelivered: boolean;
  isInDelivery: boolean;
  isInPreparation: boolean;
  isPending: boolean;
  statusHistory: StatusHistoryItem[];
}

interface UseClientOrdersReturn {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  fetchOrders: (phone: string) => Promise<void>;
  searchOrderById: (orderId: string) => Promise<Order | null>;
  activeOrders: Order[];
  deliveredOrders: Order[];
}

const db = getFirestore();

const convertTimestamp = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  return new Date();
};

const formatDeliverymanName = (fullName: string): string => {
  const names = fullName.trim().split(' ');
  return names.length > 1 ? `${names[0]} ${names[1]}` : names[0];
};

export const useClientOrders = (initialPhone: string | null = null) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliverymenCache, setDeliverymenCache] = useState<Record<string, string>>({});

  const formatPhone = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length !== 11) return phone;
    return `(${numbers.slice(0,2)}) ${numbers.slice(2,7)}-${numbers.slice(7)}`;
  };

  const fetchDeliverymanName = async (deliverymanId: string): Promise<string> => {
    if (deliverymenCache[deliverymanId]) {
      return deliverymenCache[deliverymanId];
    }

    try {
      const deliverymanDoc = await getDoc(doc(db, 'deliverymen', deliverymanId));

      if (deliverymanDoc.exists()) {
        const deliverymanData = deliverymanDoc.data() as Deliveryman;
        const formattedName = formatDeliverymanName(deliverymanData.name);
        
        setDeliverymenCache(prev => ({
          ...prev,
          [deliverymanId]: formattedName
        }));

        return formattedName;
      }
      return 'Entregador não encontrado';
    } catch (error) {
      console.error('Erro ao buscar nome do entregador:', error);
      return 'Erro ao buscar entregador';
    }
  };

  const convertFirestoreDocToOrder = async (doc: DocumentData): Promise<Order> => {
    const data = doc.data();
    const deliveryManName = data.deliveryMan 
      ? await fetchDeliverymanName(data.deliveryMan)
      : undefined;

    return {
      id: doc.id,
      number: data.number || '',
      status: data.status || 'Pendente',
      price: data.price || 'R$ 0,00',
      priceNumber: data.priceNumber || 0,
      items: data.items || [],
      itemCount: data.itemCount || 0,
      date: convertTimestamp(data.date),
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
      lastStatusUpdate: convertTimestamp(data.lastStatusUpdate),
      address: data.address || '',
      customerName: data.customerName || '',
      customerPhone: data.customerPhone || '',
      pharmacyUnitId: data.pharmacyUnitId || '',
      deliveryMan: data.deliveryMan || null,
      deliveryManName,
      licensePlate: data.licensePlate || null,
      location: data.location,
      isDelivered: data.isDelivered || false,
      isInDelivery: data.isInDelivery || false,
      isInPreparation: data.isInPreparation || false,
      isPending: data.isPending || false,
      reviewRequested: data.reviewRequested ?? false,
      rating: data.rating,
      reviewComment: data.reviewComment,
      reviewDate: data.reviewDate ? convertTimestamp(data.reviewDate) : undefined,
      statusHistory: (data.statusHistory || []).map((historyItem: any) => ({
        status: historyItem.status,
        timestamp: convertTimestamp(historyItem.timestamp)
      }))
    };
  };

  const fetchOrders = useCallback(async (phone: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const formattedPhone = formatPhone(phone);
      console.log('Buscando pedidos para o telefone:', formattedPhone);

      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('customerPhone', '==', formattedPhone));
      
      const querySnapshot = await getDocs(q);
      
      const fetchedOrders = await Promise.all(
        querySnapshot.docs.map(convertFirestoreDocToOrder)
      );

      setOrders(fetchedOrders);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      setError('Não foi possível carregar seus pedidos. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialPhone) return;

    const formattedPhone = formatPhone(initialPhone);
    console.log('Configurando listener para telefone:', formattedPhone);
    
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('customerPhone', '==', formattedPhone));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const newOrders = await Promise.all(
        snapshot.docs.map(convertFirestoreDocToOrder)
      );
      
      setOrders(newOrders.sort((a, b) => b.date.getTime() - a.date.getTime()));
    });

    return () => unsubscribe();
  }, [initialPhone]);

  useEffect(() => {
    if (initialPhone) {
      fetchOrders(initialPhone);
    }
  }, [initialPhone, fetchOrders]);

  const searchOrderById = useCallback(async (orderId: string): Promise<Order | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        console.log('Pedido não encontrado:', orderId);
        return null;
      }

      const order = await convertFirestoreDocToOrder(orderDoc);
      return order;

    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      setError('Não foi possível encontrar o pedido. Tente novamente mais tarde.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getActiveOrders = useCallback(() => {
    return orders.filter(order => !order.isDelivered);
  }, [orders]);

  const getDeliveredOrders = useCallback(() => {
    return orders.filter(order => order.isDelivered);
  }, [orders]);

  return {
    orders,
    isLoading,
    error,
    fetchOrders,
    searchOrderById,
    activeOrders: getActiveOrders(),
    deliveredOrders: getDeliveredOrders()
  };
};