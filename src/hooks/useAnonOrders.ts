import { useState } from 'react';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  query, 
  where, 
  limit,
  getDocs,
  Timestamp,
  DocumentData 
} from 'firebase/firestore';

interface StatusHistoryItem {
  status: string;
  timestamp: Date;
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

export const useAnonOrders = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const db = getFirestore();

  const formatDeliverymanName = (fullName: string): string => {
    const names = fullName.trim().split(' ');
    return names.length > 1 ? `${names[0]} ${names[1]}` : names[0];
  };

  const fetchDeliverymanName = async (deliverymanId: string): Promise<string> => {
    try {
      const deliverymanDoc = await getDoc(doc(db, 'deliverymen', deliverymanId));

      if (deliverymanDoc.exists()) {
        const deliverymanData = deliverymanDoc.data();
        return formatDeliverymanName(deliverymanData?.name || '');
      }
      return 'Entregador não encontrado';
    } catch (error) {
      console.error('Erro ao buscar nome do entregador:', error);
      return 'Erro ao buscar entregador';
    }
  };

  const convertTimestamp = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return new Date();
  };

  const searchOrderById = async (searchId: string): Promise<Order | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const normalizedSearchId = searchId.trim().toUpperCase();
      const searchPatterns = [
        normalizedSearchId,
        `DO${normalizedSearchId}`,
        normalizedSearchId.replace('DO', '')
      ];

      const ordersRef = collection(db, 'orders');
      
      const queries = searchPatterns.map(pattern => 
        getDocs(query(ordersRef, where('__name__', '==', pattern), limit(1)))
      );

      const snapshots = await Promise.all(queries);
      
      const orderDoc = snapshots
        .find(snapshot => !snapshot.empty)
        ?.docs[0];

      if (!orderDoc) {
        setError('Pedido não encontrado');
        return null;
      }

      const data = orderDoc.data();
      
      let deliveryManName;
      if (data.deliveryMan) {
        deliveryManName = await fetchDeliverymanName(data.deliveryMan);
      }

      return {
        id: orderDoc.id,
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

    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      setError('Erro ao buscar pedido. Tente novamente.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    searchOrderById
  };
};