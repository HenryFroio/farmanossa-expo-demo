import React, { useState, useEffect } from 'react';
import { 
 getFirestore, 
 collection, 
 doc, 
 getDoc, 
 getDocs, 
 updateDoc, 
 query, 
 where,
 onSnapshot,
 serverTimestamp,
 writeBatch,
 setDoc
} from 'firebase/firestore';

// Types
export interface Deliveryman {
 id: string;
 name: string;
 pharmacyUnitId: string;
 status: DeliveryStatus;
 orderId: string | null;
}

export interface Motorcycle {
 id: string;
 plate: string;
 pharmacyUnitId: string;
}

export interface Order {
 id: string;
 number: string;
 status: string;
 price: string;
 items: string[];
 date: string;
 deliveryMan?: string;
 licensePlate?: string;
 address?: string;
 customerName?: string;
 customerPhone?: string;
 pharmacyUnitId?: string;
}

export interface PharmacyUnit {
 id: string;
 name: string;
 endereco: string;
 cep: string;
}

export type DeliveryStatus = 'Fora de expediente' | 'Aguardando pedido' | 'Em rota de entrega' | 'Retornando a unidade';

// Inicialização do Firestore
const db = getFirestore();

// Funções de fetch
export const fetchDeliverymanData = async (deliverymanId: string): Promise<Deliveryman | null> => {
 try {
   const docRef = doc(db, 'deliveryman', deliverymanId);
   const docSnap = await getDoc(docRef);

   if (!docSnap.exists()) {
     console.error('Entregador não encontrado:', deliverymanId);
     return null;
   }

   return { id: docSnap.id, ...docSnap.data() } as Deliveryman;
 } catch (error) {
   console.error('Erro ao buscar dados do entregador:', error);
   throw error;
 }
};

export const fetchPharmacyUnit = async (unitId: string): Promise<PharmacyUnit | null> => {
 try {
   const docRef = doc(db, 'pharmacyUnit', unitId);
   const docSnap = await getDoc(docRef);

   if (!docSnap.exists()) {
     console.error('Unidade não encontrada:', unitId);
     return null;
   }

   return { id: docSnap.id, ...docSnap.data() } as PharmacyUnit;
 } catch (error) {
   console.error('Erro ao buscar dados da unidade:', error);
   throw error;
 }
};

export const fetchUnitMotorcycles = async (unitId: string): Promise<Motorcycle[]> => {
 try {
   const q = query(
     collection(db, 'motorcycle'),
     where('pharmacyUnitId', '==', unitId)
   );
   const snapshot = await getDocs(q);

   return snapshot.docs.map(doc => ({
     id: doc.id,
     ...doc.data()
   } as Motorcycle));
 } catch (error) {
   console.error('Erro ao buscar motos da unidade:', error);
   throw error;
 }
};

export const fetchAvailableOrders = async (unitId: string): Promise<Order[]> => {
 try {
   const q = query(
     collection(db, 'dummyOrder'),
     where('pharmacyUnitId', '==', unitId),
     where('status', '==', 'Em Preparo')
   );
   const snapshot = await getDocs(q);

   return snapshot.docs.map(doc => ({
     id: doc.id,
     ...doc.data()
   } as Order));
 } catch (error) {
   console.error('Erro ao buscar pedidos disponíveis:', error);
   throw error;
 }
};

// Funções de atualização
export const updateDeliverymanStatus = async (
 deliverymanId: string,
 status: DeliveryStatus,
 orderId: string | null = null
): Promise<void> => {
 try {
   const deliverymanRef = doc(db, 'deliveryman', deliverymanId);
   await updateDoc(deliverymanRef, {
     status,
     orderId,
     lastUpdated: serverTimestamp()
   });
 } catch (error) {
   console.error('Erro ao atualizar status do entregador:', error);
   throw error;
 }
};

export const updateOrderStatus = async (
 orderId: string,
 status: string,
 deliverymanId?: string,
 licensePlate?: string
): Promise<void> => {
 try {
   const updateData: any = {
     status,
     lastUpdated: serverTimestamp()
   };

   if (deliverymanId) {
     updateData.deliveryMan = deliverymanId;
   }

   if (licensePlate) {
     updateData.licensePlate = licensePlate;
   }

   const orderRef = doc(db, 'dummyOrder', orderId);
   await updateDoc(orderRef, updateData);
 } catch (error) {
   console.error('Erro ao atualizar status do pedido:', error);
   throw error;
 }
};

// Hook personalizado atualizado
export const useDeliverymanRealtime = (deliverymanId: string) => {
 const [deliveryman, setDeliveryman] = useState<Deliveryman | null>(null);
 const [activeOrders, setActiveOrders] = useState<Order[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<Error | null>(null);

 useEffect(() => {
   console.log('useDeliverymanRealtime iniciado com ID:', deliverymanId);
   if (!deliverymanId) {
     console.log('ID do entregador não fornecido');
     setLoading(false);
     return;
   }

   setLoading(true);

   const deliverymanRef = doc(db, 'deliveryman', deliverymanId);
   const unsubscribeDeliveryman = onSnapshot(
     deliverymanRef,
     async (docSnap) => {
       console.log('Snapshot do entregador recebido:', docSnap.exists());
       if (docSnap.exists()) {
         const data = { id: docSnap.id, ...docSnap.data() } as Deliveryman;
         console.log('Dados do entregador:', data);
         setDeliveryman(data);

         if (data.orderId) {
           const q = query(
             collection(db, 'dummyOrder'),
             where('deliveryMan', '==', deliverymanId),
             where('status', 'in', ['Em rota', 'Em entrega'])
           );
           try {
             const snapshot = await getDocs(q);
             const orders = snapshot.docs.map(doc => ({
               id: doc.id,
               ...doc.data()
             } as Order));
             console.log('Pedidos ativos encontrados:', orders.length);
             setActiveOrders(orders);
           } catch (err) {
             console.error('Erro ao buscar pedidos ativos:', err);
             setError(err as Error);
           }
         } else {
           setActiveOrders([]);
         }
       } else {
         console.log('Documento do entregador não existe');
         setDeliveryman(null);
         setActiveOrders([]);
       }
       setLoading(false);
     },
     (err) => {
       console.error('Erro no listener do entregador:', err);
       setError(err as Error);
       setLoading(false);
     }
   );

   return () => {
     console.log('Limpando listener do entregador');
     unsubscribeDeliveryman();
   };
 }, [deliverymanId]);

 return {
   deliveryman,
   activeOrders,
   loading,
   error,
 };
};

// Função para finalizar entrega
export const finishDelivery = async (
 orderId: string,
 deliverymanId: string,
 remainingOrders: number
): Promise<void> => {
 try {
   const batch = writeBatch(db);

   const orderRef = doc(db, 'dummyOrder', orderId);
   batch.update(orderRef, {
     status: 'Entregue',
     deliveryEndTime: serverTimestamp()
   });

   const deliverymanRef = doc(db, 'deliveryman', deliverymanId);
   batch.update(deliverymanRef, {
     status: remainingOrders === 0 ? 'Retornando a unidade' : 'Em rota de entrega',
     orderId: remainingOrders === 0 ? null : orderId
   });

   await batch.commit();
 } catch (error) {
   console.error('Erro ao finalizar entrega:', error);
   throw error;
 }
};

// Função para iniciar expediente
export const startShift = async (
 deliverymanId: string,
 motorcyclePlate: string
): Promise<void> => {
 try {
   await updateDeliverymanStatus(deliverymanId, 'Aguardando pedido');
 } catch (error) {
   console.error('Erro ao iniciar expediente:', error);
   throw error;
 }
};

// Função para finalizar expediente
export const endShift = async (
 deliverymanId: string,
 totalDistance: number
): Promise<void> => {
 try {
   const batch = writeBatch(db);

   const deliverymanRef = doc(db, 'deliveryman', deliverymanId);
   batch.update(deliverymanRef, {
     status: 'Fora de expediente',
     orderId: null,
     lastShiftEndTime: serverTimestamp()
   });

   const shiftRef = doc(collection(db, 'deliverymanShifts'));
   batch.set(shiftRef, {
     deliverymanId,
     endTime: serverTimestamp(),
     totalDistance,
     createdAt: serverTimestamp()
   });

   await batch.commit();
 } catch (error) {
   console.error('Erro ao finalizar expediente:', error);
   throw error;
 }
};

export default {
 fetchDeliverymanData,
 fetchPharmacyUnit,
 fetchUnitMotorcycles,
 fetchAvailableOrders,
 updateDeliverymanStatus,
 updateOrderStatus,
 useDeliverymanRealtime,
 finishDelivery,
 startShift,
 endShift
};