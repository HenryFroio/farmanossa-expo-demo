import {
  getFirestore,
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  updateDoc,
  onSnapshot,
  writeBatch,
  Timestamp,
  documentId,
  QuerySnapshot, // Import QuerySnapshot
  DocumentData, // Import DocumentData
  QueryDocumentSnapshot, // Added import
  orderBy, // Added import
  limit, // Added import
  startAfter, // Added import
  setDoc, // Added for ponto creation
  addDoc // Added for forms creation
} from 'firebase/firestore';
import { useState, useEffect, useRef, useCallback } from 'react'; // Import useState, useEffect, useRef, useCallback
import { useAuth } from './useAuth'; // Assuming useAuth provides user info
import { InspectionFormData } from '../components/MotorcycleInspectionForm';

interface Location {
  latitude: number;
  longitude: number;
}

// Interface for ponto (time tracking) document
export interface Ponto {
  id: string;
  deliverymanId: string;
  date: string; // Format: YYYY-MM-DD
  createdAt: Timestamp;
  updatedAt: Timestamp;
  [key: string]: any; // For EntradaX, SaidaX, unitEntradaX, motorcycleEntradaX (plate) properties
}

export interface Deliveryman {
  id: string;
  name: string;
  pharmacyUnitId: string;
  status: string;
  orderId: string[];
  licensePlate: string | null;
  originalUnit: string;
}

export interface Motorcycle {
  id: string;
  plate: string;
  pharmacyUnitId: string;
  km: number;
  nextMaintenanceKm?: number;
}

export interface Order {
  id: string;
  number: string;
  status: string;
  address?: string;
  customerName?: string;
  customerPhone?: string;
  items: string[];
  price: string;
  pharmacyUnitId: string;
  deliveryPharmacyUnitId?: string; // Ensure this field exists
  deliveryMan?: string;
  licensePlate?: string;
  isDelivered: boolean;
  isInDelivery: boolean;
  isInPreparation: boolean;
  statusHistory?: { status: string; timestamp: Timestamp }[];
  priceNumber: number; // Ensure this exists if used elsewhere
  rating?: number; // Ensure this exists if used elsewhere
  reviewComment?: string; // Ensure this exists if used elsewhere
  reviewDate?: Date; // Ensure this exists if used elsewhere
  date: string | Timestamp; // Ensure this exists if used elsewhere
  deliveryManName?: string; // Ensure this exists if used elsewhere
  lastStatusUpdate?: Timestamp; // Ensure this exists if used elsewhere
  updatedAt?: Timestamp; // Ensure this exists if used elsewhere
}

interface PharmacyUnit { // Added placeholder interface
  id: string;
  name: string;
  // Add other relevant fields if known
}

interface DeliverymanData {
  deliveryman: Deliveryman | null;
  motorcycles: Motorcycle[];
  orders: Order[];
  pharmacyUnit: PharmacyUnit | null;
  loading: boolean;
  error: string | null;
}

const getOrderStatusFlags = (status: string) => ({
  isDelivered: status === 'Entregue',
  isInDelivery: status === 'A caminho',
  isInPreparation: status === 'Em Preparação'
});

export const useDeliveryman = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DeliverymanData>({
    deliveryman: null,
    motorcycles: [],
    orders: [], // Initialize orders as empty array
    pharmacyUnit: null,
    loading: true,
    error: null
  });
  const [preparingOrdersOrigin, setPreparingOrdersOrigin] = useState<Order[]>([]);
  const [preparingOrdersTransfer, setPreparingOrdersTransfer] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [specificOrders, setSpecificOrders] = useState<Order[]>([]);

  // State for on-demand loading of preparing orders
  const [lastOriginDoc, setLastOriginDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastTransferDoc, setLastTransferDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingPreparingOrders, setLoadingPreparingOrders] = useState(false);
  const [hasMoreOriginOrders, setHasMoreOriginOrders] = useState(true);
  const [hasMoreTransferOrders, setHasMoreTransferOrders] = useState(true);
  
  // State for secondary loading (motorcycles, pharmacy unit, etc.)
  const [isLoadingSecondaryData, setIsLoadingSecondaryData] = useState(false);

  // Ref to prevent duplicate executions
  const isInitializingRef = useRef(false);
  
  // Ref to store fetchRelatedData function
  const fetchRelatedDataRef = useRef<((unitId: string) => Promise<void>) | null>(null);

  const db = getFirestore();

  // Combine orders from different sources
  useEffect(() => {
    setData(prev => {
      const combinedOrders = [
        ...preparingOrdersOrigin,
        ...preparingOrdersTransfer,
        ...activeOrders,
        ...specificOrders
      ];
      // Remove duplicates based on ID
      const uniqueOrders = Array.from(
        new Map(combinedOrders.map(order => [order.id, order])).values()
      );

      // Filter orders based on deliveryman's current state/assignments
      const relevantOrders = uniqueOrders.filter(order => {
         // Always include orders explicitly assigned to the deliveryman
         if (prev.deliveryman?.orderId?.includes(order.id)) {
           return true;
         }
         // Include preparing orders relevant to the current unit (origin or transfer)
         if (order.status === 'Em Preparação') {
           const currentUnitId = prev.deliveryman?.pharmacyUnitId;
           if (!currentUnitId) return false; // Should not happen if deliveryman is loaded
           return order.deliveryPharmacyUnitId === currentUnitId ||
                  (order.pharmacyUnitId === currentUnitId && !order.deliveryPharmacyUnitId);
         }
         // Include orders the deliveryman is actively delivering (status 'A caminho')
         if (order.status === 'A caminho' && order.deliveryMan === prev.deliveryman?.id) {
            return true;
         }

         return false; // Exclude other orders by default
      });


      return {
        ...prev,
        orders: relevantOrders
      };
    });
  }, [preparingOrdersOrigin, preparingOrdersTransfer, activeOrders, specificOrders, data.deliveryman?.id, data.deliveryman?.orderId, data.deliveryman?.pharmacyUnitId]);


  useEffect(() => {
    console.log('[useDeliveryman] useEffect triggered');
    if (!user || !user.uid) {
      console.log('[useDeliveryman] No user or no user UID, returning.');
      setData(prev => ({ ...prev, loading: false, error: prev.error || 'Usuário não autenticado.' }));
      return;
    }

    // Prevent duplicate executions
    if (isInitializingRef.current) {
      console.log('[useDeliveryman] Already initializing, skipping duplicate execution.');
      return;
    }

    let deliverymanIdToUse: string | null = null;
    let unsubscribeDeliveryman: (() => void) | null = null;
    let unsubscribeActive: (() => void) | null = null;
    let unsubscribeSpecific: (() => void) | null = null;

    const fetchDataAndSetupListeners = async () => {
      console.log('[useDeliveryman] fetchDataAndSetupListeners started');
      isInitializingRef.current = true;
      setData(prev => ({ ...prev, loading: true, error: null }));
      try {
        // --- 1. Determine Deliveryman ID ---
        // Priorizar user.uid como o ID do entregador, pois são os mesmos.
        if (user.uid) {
          deliverymanIdToUse = user.uid;
          console.log(`[useDeliveryman] Using user.uid as deliverymanId: ${deliverymanIdToUse}`);
        } else {
          // Fallback para buscar no documento do usuário ou por e-mail (embora menos provável se user.uid já falhou)
          console.log('[useDeliveryman] user.uid is not available, attempting other methods (should not happen if initial check passed).');
          // Se user.uid não estiver disponível aqui, user.uid na próxima linha também não estará.
          // Isso indica um problema lógico se esta ramificação for alcançada apesar da verificação inicial.
          const userDocRef = doc(db, 'users', user.uid!); // Adicionado '!' assumindo que user.uid deve estar presente se user existir
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists() && userDocSnap.data().deliverymanId) {
            deliverymanIdToUse = userDocSnap.data().deliverymanId;
            console.log(`[useDeliveryman] Found deliverymanId in user doc: ${deliverymanIdToUse}`);
          } else if (user.email) {
            console.log(`[useDeliveryman] No deliverymanId in user doc, checking email: ${user.email}`);
            const emailQuery = query(collection(db, 'deliverymen'), where('email', '==', user.email.toLowerCase()));
            const emailSnapshot = await getDocs(emailQuery);
            if (!emailSnapshot.empty) {
              const deliverymanDoc = emailSnapshot.docs[0];
              deliverymanIdToUse = deliverymanDoc.id;
              console.log(`[useDeliveryman] Found deliveryman by email: ${deliverymanIdToUse}`);
            }
          }
        }

        if (!deliverymanIdToUse) {
          console.error('[useDeliveryman] Could not determine deliveryman ID.');
          throw new Error('Não foi possível identificar o entregador.');
        }
        console.log(`[useDeliveryman] Final deliverymanId to use: ${deliverymanIdToUse}`);

        // --- 2. Setup Deliveryman Listener ---
        const deliverymanDocRef = doc(db, 'deliverymen', deliverymanIdToUse);
        unsubscribeDeliveryman = onSnapshot(deliverymanDocRef,
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              const deliverymanData = { id: docSnapshot.id, ...docSnapshot.data() } as Deliveryman;
              console.log('[useDeliveryman] Deliveryman snapshot received:', deliverymanData);
              // Don't set loading to false yet - wait for secondary data
              setData(prev => ({ ...prev, deliveryman: deliverymanData }));

              // Only load secondary data if deliveryman is working (not "Fora de expediente")
              const isWorking = deliverymanData.status !== 'Fora de expediente';
              
              if (deliverymanData.pharmacyUnitId && isWorking) {
                console.log('[useDeliveryman] Deliveryman is working, loading secondary data...');
                fetchRelatedData(deliverymanData.pharmacyUnitId);
                setupActiveAndSpecificOrderListeners(deliverymanData.pharmacyUnitId, deliverymanIdToUse!, deliverymanData.orderId);
              } else if (!isWorking) {
                console.log('[useDeliveryman] Deliveryman is off duty, skipping secondary data loading.');
                console.log('[useDeliveryman] ✅ Setting loading to FALSE (off duty)');
                // When off duty, set loading to false immediately since no secondary data needed
                setData(prev => ({
                  ...prev,
                  motorcycles: [],
                  pharmacyUnit: null,
                  loading: false
                }));
                setActiveOrders([]);
                setSpecificOrders([]);
              } else {
                // Setup listeners even if no unit (edge case)
                console.log('[useDeliveryman] ✅ Setting loading to FALSE (no unit)');
                setData(prev => ({ ...prev, loading: false }));
                setupActiveAndSpecificOrderListeners(deliverymanData.pharmacyUnitId, deliverymanIdToUse!, deliverymanData.orderId);
              }

            } else {
              console.error(`[useDeliveryman] Deliveryman document does not exist for ID: ${deliverymanIdToUse}!`);
              setData(prev => ({ ...prev, error: 'Entregador não encontrado.', loading: false, deliveryman: null }));
            }
          },
          (err) => {
            console.error('[useDeliveryman] Error in deliveryman listener:', err);
            setData(prev => ({ ...prev, error: 'Erro ao ouvir dados do entregador.', loading: false }));
          }
        );

      } catch (error: any) {
        console.error('[useDeliveryman] Error in fetchDataAndSetupListeners:', error);
        setData(prev => ({ ...prev, loading: false, error: error.message || 'Erro ao carregar dados iniciais' }));
      }
    };

    const fetchRelatedData = async (unitId: string) => {
       try {
          console.log('[useDeliveryman] Starting secondary data loading...');
          setIsLoadingSecondaryData(true);
          
          // Fetch Motorcycles
          console.log(`[useDeliveryman] Fetching motorcycles for unit: ${unitId}`);
          const motorcyclesQuery = query(collection(db, 'motorcycles'), where('pharmacyUnitId', '==', unitId));
          const motorcyclesSnapshot = await getDocs(motorcyclesQuery);
          const motorcyclesData = motorcyclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Motorcycle[];
          console.log('[useDeliveryman] Motorcycles data processed:', motorcyclesData);

          // Fetch Pharmacy Unit
          console.log(`[useDeliveryman] Fetching pharmacy unit data for unit: ${unitId}`);
          const pharmacyUnitDocRef = doc(db, 'pharmacyUnits', unitId);
          const pharmacyUnitDocSnap = await getDoc(pharmacyUnitDocRef);
          let pharmacyUnitData = null;
          if (pharmacyUnitDocSnap.exists()) {
             pharmacyUnitData = { id: pharmacyUnitDocSnap.id, ...pharmacyUnitDocSnap.data() } as PharmacyUnit;
             console.log('[useDeliveryman] Pharmacy unit data processed:', pharmacyUnitData);
          } else {
             console.warn('[useDeliveryman] Pharmacy unit document does not exist!');
          }

          setData(prev => ({
             ...prev,
             motorcycles: motorcyclesData,
             pharmacyUnit: pharmacyUnitData,
             loading: false // Set loading to false only after secondary data is loaded
          }));

          console.log('[useDeliveryman] Secondary data loading completed');
          console.log('[useDeliveryman] ✅ Setting loading to FALSE (after secondary data)');

       } catch (error) {
          console.error('[useDeliveryman] Error fetching related data (motorcycles/unit):', error);
          // Set loading to false even on error
          setData(prev => ({ ...prev, loading: false }));
       } finally {
          setIsLoadingSecondaryData(false);
       }
    };
    
    // Store reference for external access
    fetchRelatedDataRef.current = fetchRelatedData;


    // Renamed and modified: only sets up listeners for active and specific orders
    const setupActiveAndSpecificOrderListeners = (unitId: string, currentDeliverymanId: string, currentOrderIds: string[]) => {
        console.log(`[useDeliveryman] Setting up ACTIVE/SPECIFIC order listeners for unit ${unitId}, deliveryman ${currentDeliverymanId}`);

        // --- Listener for Active Orders (Deliveryman Assigned) ---
        if (unsubscribeActive) unsubscribeActive();
        const activeOrdersQuery = query(
          collection(db, 'orders'),
          where('deliveryMan', '==', currentDeliverymanId),
          where('status', '==', 'A caminho')
        );
        unsubscribeActive = onSnapshot(activeOrdersQuery,
          (snapshot) => handleSnapshot(snapshot, setActiveOrders, 'Active Orders'),
          (error) => console.error('[useDeliveryman] Error in active orders listener:', error)
        );

        // --- Listener for Specific Orders (Assigned via orderId array) ---
        if (unsubscribeSpecific) unsubscribeSpecific();
        if (currentOrderIds && currentOrderIds.length > 0) {
          const specificOrdersQuery = query(
            collection(db, 'orders'),
            where(documentId(), 'in', currentOrderIds.slice(0, 10))
          );
          unsubscribeSpecific = onSnapshot(specificOrdersQuery,
            (snapshot) => handleSnapshot(snapshot, setSpecificOrders, 'Specific Orders'),
            (error) => console.error('[useDeliveryman] Error in specific orders listener:', error)
          );
        } else {
           console.log('[useDeliveryman] No specific order IDs for listener.');
           setSpecificOrders([]);
           unsubscribeSpecific = null;
        }
    };

    // Helper function to process snapshots and update state (for active/specific orders)
    const handleSnapshot = (
        snapshot: QuerySnapshot<DocumentData>,
        setter: React.Dispatch<React.SetStateAction<Order[]>>,
        logPrefix: string
    ) => {
        console.log(`[useDeliveryman] ${logPrefix} snapshot received.`);
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          ...getOrderStatusFlags(doc.data().status as string) // Ensure status is string
        })) as Order[];
        console.log(`[useDeliveryman] ${logPrefix} processed: ${orders.length} orders`);
        setter(orders);
        // Optionally set loading to false here if this is the last listener to update
        // setData(prev => ({ ...prev, loading: false }));
    };


    fetchDataAndSetupListeners();

    // Cleanup function
    return () => {
      console.log('[useDeliveryman] Cleaning up listeners...');
      isInitializingRef.current = false;
      if (unsubscribeDeliveryman) unsubscribeDeliveryman();
      if (unsubscribeActive) unsubscribeActive();
      if (unsubscribeSpecific) unsubscribeSpecific();
    };
  }, [user?.uid, user?.email]); // Dependências específicas para evitar re-renders desnecessários

  const fetchAvailablePreparingOrders = useCallback(async (options: { loadMore?: boolean; unitId: string }) => {
    if (loadingPreparingOrders) return;
    setLoadingPreparingOrders(true);
    console.log(`[useDeliveryman] fetchAvailablePreparingOrders called. loadMore: ${options.loadMore}, unitId: ${options.unitId}`);

    const ORDERS_LIMIT = 20;

    try {
      // Fetch Origin Orders
      if (options.loadMore && !hasMoreOriginOrders) {
        console.log('[useDeliveryman] No more origin orders to load.');
      } else {
        let originQuery = query(
          collection(db, 'orders'),
          where('pharmacyUnitId', '==', options.unitId),
          where('status', '==', 'Em Preparação'),
          orderBy('date', 'desc'), // Assuming 'date' field for sorting by recency
          limit(ORDERS_LIMIT)
        );

        if (options.loadMore && lastOriginDoc) {
          originQuery = query(originQuery, startAfter(lastOriginDoc));
        } else if (!options.loadMore) {
          // Reset if it's a fresh load (not loadMore)
          setPreparingOrdersOrigin([]);
          setLastOriginDoc(null);
          setHasMoreOriginOrders(true);
        }

        if (hasMoreOriginOrders || !options.loadMore) {
            const originSnapshot = await getDocs(originQuery);
            const newOriginOrders = originSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              ...getOrderStatusFlags(doc.data().status as string)
            })) as Order[];

            console.log(`[useDeliveryman] Fetched ${newOriginOrders.length} new origin orders.`);
            setPreparingOrdersOrigin(prev => options.loadMore ? [...prev, ...newOriginOrders] : newOriginOrders);
            setLastOriginDoc(originSnapshot.docs[originSnapshot.docs.length - 1] || null);
            setHasMoreOriginOrders(newOriginOrders.length === ORDERS_LIMIT);
        }
      }

      // Fetch Transfer Orders
      if (options.loadMore && !hasMoreTransferOrders) {
        console.log('[useDeliveryman] No more transfer orders to load.');
      } else {
        let transferQuery = query(
          collection(db, 'orders'),
          where('deliveryPharmacyUnitId', '==', options.unitId),
          where('status', '==', 'Em Preparação'),
          orderBy('date', 'desc'), // Assuming 'date' field for sorting by recency
          limit(ORDERS_LIMIT)
        );

        if (options.loadMore && lastTransferDoc) {
          transferQuery = query(transferQuery, startAfter(lastTransferDoc));
        } else if (!options.loadMore) {
          // Reset if it's a fresh load
          setPreparingOrdersTransfer([]);
          setLastTransferDoc(null);
          setHasMoreTransferOrders(true);
        }
        
        if (hasMoreTransferOrders || !options.loadMore) {
            const transferSnapshot = await getDocs(transferQuery);
            const newTransferOrders = transferSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              ...getOrderStatusFlags(doc.data().status as string)
            })) as Order[];

            console.log(`[useDeliveryman] Fetched ${newTransferOrders.length} new transfer orders.`);
            setPreparingOrdersTransfer(prev => options.loadMore ? [...prev, ...newTransferOrders] : newTransferOrders);
            setLastTransferDoc(transferSnapshot.docs[transferSnapshot.docs.length - 1] || null);
            setHasMoreTransferOrders(newTransferOrders.length === ORDERS_LIMIT);
        }
      }

    } catch (error) {
      console.error('[useDeliveryman] Error fetching available preparing orders:', error);
      // Optionally set an error state here
    } finally {
      setLoadingPreparingOrders(false);
    }
  }, [db, loadingPreparingOrders, lastOriginDoc, lastTransferDoc, hasMoreOriginOrders, hasMoreTransferOrders]);


  // ... (rest of the hook: updateDeliverymanUnit, restoreOriginalUnit, updateDeliverymanStatus, etc.) ...
  // Ensure these functions use data.deliveryman.id correctly
  const updateDeliverymanUnit = async (newUnitId: string) => {
    const currentDeliveryman = data.deliveryman; // Get current state
    if (!currentDeliveryman) {
       console.error("Cannot update unit: Deliveryman data not loaded.");
       return;
    }
    const deliverymanId = currentDeliveryman.id; // Use ID from state

    try {
      const deliverymanDocRef = doc(db, 'deliverymen', deliverymanId);
      
      // Only set originalUnit if it's not already set (first time changing unit)
      const updateData: any = {
        pharmacyUnitId: newUnitId
      };
      
      if (!currentDeliveryman.originalUnit) {
        updateData.originalUnit = currentDeliveryman.pharmacyUnitId;
        console.log(`[useDeliveryman] Saving original unit: ${currentDeliveryman.pharmacyUnitId}`);
      }
      
      await updateDoc(deliverymanDocRef, updateData);
      console.log(`[useDeliveryman] Updated unit for ${deliverymanId} to ${newUnitId}`);
    } catch (error) {
      console.error(`[useDeliveryman] Error updating unit for ${deliverymanId}:`, error);
      throw error; // Re-throw for the caller to handle
    }
  };

  const restoreOriginalUnit = async () => {
    const currentDeliveryman = data.deliveryman;
    if (!currentDeliveryman?.originalUnit) {
       console.warn("Cannot restore unit: No original unit set or deliveryman data not loaded.");
       return;
    }
    const deliverymanId = currentDeliveryman.id;

    try {
      const deliverymanDocRef = doc(db, 'deliverymen', deliverymanId);
      await updateDoc(deliverymanDocRef, {
        pharmacyUnitId: currentDeliveryman.originalUnit,
        originalUnit: null // Use null directly
      });
      console.log(`[useDeliveryman] Restored original unit ${currentDeliveryman.originalUnit} for ${deliverymanId}`);
    } catch (error) {
      console.error(`[useDeliveryman] Error restoring original unit for ${deliverymanId}:`, error);
      throw error;
    }
  };
  
  // Cancel unit selection (restore to original if changed but not confirmed)
  const cancelUnitSelection = async () => {
    const currentDeliveryman = data.deliveryman;
    if (!currentDeliveryman) {
       console.warn("Cannot cancel unit selection: Deliveryman data not loaded.");
       return;
    }
    
    // If there's an originalUnit set, it means unit was changed but work not started
    // Restore to original
    if (currentDeliveryman.originalUnit) {
      console.log(`[useDeliveryman] Canceling unit selection, restoring to: ${currentDeliveryman.originalUnit}`);
      await restoreOriginalUnit();
    }
  };
  
  const updateDeliverymanStatus = async (status: string, orderIds: string[]) => {
    const currentDeliveryman = data.deliveryman;
    if (!currentDeliveryman) {
       console.error("Cannot update status: Deliveryman data not loaded.");
       return;
    }
    const deliverymanId = currentDeliveryman.id;

    try {
      console.log(`[useDeliveryman] UPDATING STATUS - From: ${currentDeliveryman.status} To: ${status} with orders:`, orderIds);
      
      const deliverymanDocRef = doc(db, 'deliverymen', deliverymanId);
      await updateDoc(deliverymanDocRef, {
        status: status,
        orderId: orderIds // Ensure orderIds is always an array
      });
      console.log(`[useDeliveryman] Successfully updated status for ${deliverymanId} to ${status} with orders:`, orderIds);

      // If logging out, restore original unit if applicable
      if (status === 'Fora de expediente' && currentDeliveryman.originalUnit) {
        await restoreOriginalUnit(); // Call restore function
      }
    } catch (error) {
      console.error(`[useDeliveryman] Error updating status for ${deliverymanId}:`, error);
      throw error;
    }
  };

  const getCurrentTimestamp = () => {
    return Timestamp.fromDate(new Date());
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const currentDeliveryman = data.deliveryman;
    if (!user?.uid || !currentDeliveryman) {
       console.error("Cannot update order status: User or Deliveryman data not loaded.");
       return;
    }
    const deliverymanId = currentDeliveryman.id; // Use loaded deliveryman ID

    const currentTimestamp = getCurrentTimestamp();
    const statusFlags = getOrderStatusFlags(status);

    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef); // Get current order data first
      if (!orderDoc.exists()) {
         throw new Error(`Order ${orderId} not found.`);
      }
      const currentOrderData = orderDoc.data();

      const newStatusHistory = [
        ...(currentOrderData?.statusHistory || []),
        { status: status, timestamp: currentTimestamp }
      ];

      await updateDoc(orderRef, {
        status: status,
        deliveryMan: deliverymanId, // Use correct deliveryman ID
        deliveryManName: currentDeliveryman.name,
        licensePlate: currentDeliveryman.licensePlate,
        lastStatusUpdate: currentTimestamp,
        updatedAt: currentTimestamp,
        statusHistory: newStatusHistory,
        ...statusFlags
      });
      console.log(`[useDeliveryman] Updated status for order ${orderId} to ${status}`);
      // State update will happen via listeners, no manual update needed here
    } catch (error) {
      console.error(`[useDeliveryman] Error updating status for order ${orderId}:`, error);
      throw error;
    }
  };

  const updateMultipleOrderStatus = async (orderIds: string[], status: string) => {
    const currentDeliveryman = data.deliveryman;
    if (!user?.uid || !currentDeliveryman) {
       console.error("Cannot update multiple order statuses: User or Deliveryman data not loaded.");
       return;
    }
    const deliverymanId = currentDeliveryman.id;

    const batch = writeBatch(db);
    const currentTimestamp = getCurrentTimestamp();
    const statusFlags = getOrderStatusFlags(status);

    try {
      // Fetch all orders to get current status history
      const orderSnapshots = await Promise.all(
        orderIds.map(orderId => getDoc(doc(db, 'orders', orderId)))
      );

      orderIds.forEach((orderId, index) => {
        const orderRef = doc(db, 'orders', orderId);
        const currentOrderData = orderSnapshots[index].data();
        const newStatusHistory = [
          ...(currentOrderData?.statusHistory || []),
          { status: status, timestamp: currentTimestamp }
        ];

        batch.update(orderRef, {
          status: status,
          deliveryMan: deliverymanId, // Use correct deliveryman ID
          deliveryManName: currentDeliveryman.name,
          licensePlate: currentDeliveryman.licensePlate,
          lastStatusUpdate: currentTimestamp,
          updatedAt: currentTimestamp,
          statusHistory: newStatusHistory,
          ...statusFlags
        });
      });

      await batch.commit();
      console.log(`[useDeliveryman] Updated status for orders ${orderIds.join(', ')} to ${status}`);
      // State update will happen via listeners
    } catch (error) {
      console.error(`[useDeliveryman] Error updating status for multiple orders:`, error);
      throw error;
    }
  };

  const updateDeliverymanLicensePlate = async (licensePlate: string) => {
    const currentDeliveryman = data.deliveryman;
    if (!currentDeliveryman) {
       console.error("Cannot update license plate: Deliveryman data not loaded.");
       return;
    }
    const deliverymanId = currentDeliveryman.id;

    try {
      const deliverymanDocRef = doc(db, 'deliverymen', deliverymanId);
      await updateDoc(deliverymanDocRef, { licensePlate });
      console.log(`[useDeliveryman] Updated license plate for ${deliverymanId} to ${licensePlate}`);
    } catch (error) {
      console.error(`[useDeliveryman] Error updating license plate for ${deliverymanId}:`, error);
      throw error;
    }
  };

  const clearDeliverymanLicensePlate = async () => {
    const currentDeliveryman = data.deliveryman;
    if (!currentDeliveryman) {
       console.error("Cannot clear license plate: Deliveryman data not loaded.");
       return;
    }
    const deliverymanId = currentDeliveryman.id;

    try {
      const deliverymanDocRef = doc(db, 'deliverymen', deliverymanId);
      await updateDoc(deliverymanDocRef, { licensePlate: null });
      console.log(`[useDeliveryman] Cleared license plate for ${deliverymanId}`);
    } catch (error) {
      console.error(`[useDeliveryman] Error clearing license plate for ${deliverymanId}:`, error);
      throw error;
    }
  };

  const setDeliverymanOrders = async (orderIds: string[]) => {
    const currentDeliveryman = data.deliveryman;
    if (!currentDeliveryman) {
       console.error("Cannot set orders: Deliveryman data not loaded.");
       return;
    }
    const deliverymanId = currentDeliveryman.id;

    try {
      const deliverymanDocRef = doc(db, 'deliverymen', deliverymanId);
      // Ensure orderIds is always an array, even if empty
      await updateDoc(deliverymanDocRef, { orderId: orderIds || [] });
      console.log(`[useDeliveryman] Set orders for ${deliverymanId} to:`, orderIds);
    } catch (error) {
      console.error(`[useDeliveryman] Error setting orders for ${deliverymanId}:`, error);
      throw error;
    }
  };  // Ponto (time tracking) functions
  const createOrUpdatePonto = async (actionType: 'entrada' | 'saida', motorcycleId?: string) => {
    const currentDeliveryman = data.deliveryman;
    const currentPharmacyUnit = data.pharmacyUnit;
    if (!currentDeliveryman) {
      console.error("Cannot create/update ponto: Deliveryman data not loaded.");
      return;
    }

    const deliverymanId = currentDeliveryman.id;
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const pontoId = `${dateString}-${deliverymanId}`;
    
    try {
      const pontoRef = doc(db, 'pontos', pontoId);
      const pontoDoc = await getDoc(pontoRef);
      const currentTimestamp = Timestamp.now();

      // Get motorcycle plate if motorcycleId is provided
      let motorcyclePlate = null;
      if (motorcycleId) {
        try {
          const motorcycleRef = doc(db, 'motorcycles', motorcycleId);
          const motorcycleDoc = await getDoc(motorcycleRef);
          if (motorcycleDoc.exists()) {
            motorcyclePlate = motorcycleDoc.data().plate;
          }
        } catch (error) {
          console.error('[useDeliveryman] Error fetching motorcycle plate:', error);
        }
      }

      if (pontoDoc.exists()) {
        // Document exists, update it
        const pontoData = pontoDoc.data();
        const entryKeys = Object.keys(pontoData).filter(key => key.startsWith('Entrada'));
        const exitKeys = Object.keys(pontoData).filter(key => key.startsWith('Saida'));
        
        let nextSequence: number;
        let updateData: any = {
          updatedAt: currentTimestamp
        };        if (actionType === 'entrada') {
          nextSequence = entryKeys.length + 1;
          updateData[`Entrada${nextSequence}`] = currentTimestamp;
          // Add unit ID for entrada
          updateData[`unitEntrada${nextSequence}`] = currentDeliveryman.pharmacyUnitId;
          // Add motorcycle plate for entrada if available
          if (motorcyclePlate) {
            updateData[`motorcycleEntrada${nextSequence}`] = motorcyclePlate;
          }
        } else {
          nextSequence = exitKeys.length + 1;
          updateData[`Saida${nextSequence}`] = currentTimestamp;
        }

        await updateDoc(pontoRef, updateData);

        console.log(`[useDeliveryman] Updated ponto ${pontoId} with sequence ${nextSequence}:`, updateData);
      } else {
        // Document doesn't exist, create it
        const initialData: Partial<Ponto> = {
          deliverymanId,
          date: dateString,
          createdAt: currentTimestamp,
          updatedAt: currentTimestamp
        };        if (actionType === 'entrada') {
          initialData.Entrada1 = currentTimestamp;
          // Add unit ID for entrada
          initialData.unitEntrada1 = currentDeliveryman.pharmacyUnitId;
          // Add motorcycle plate for entrada if available
          if (motorcyclePlate) {
            initialData.motorcycleEntrada1 = motorcyclePlate;
          }
        } else {
          // Shouldn't happen normally, but handle gracefully
          initialData.Saida1 = currentTimestamp;
        }

        await setDoc(pontoRef, initialData);
        console.log(`[useDeliveryman] Created new ponto ${pontoId} with ${actionType === 'entrada' ? 'Entrada1' : 'Saida1'}: ${currentTimestamp}`);
      }
    } catch (error) {
      console.error(`[useDeliveryman] Error creating/updating ponto for ${deliverymanId}:`, error);
      throw error;
    }
  };

  const getPontoData = async (date?: string): Promise<Ponto | null> => {
    const currentDeliveryman = data.deliveryman;
    if (!currentDeliveryman) {
      console.error("Cannot get ponto data: Deliveryman data not loaded.");
      return null;
    }

    const deliverymanId = currentDeliveryman.id;
    const dateString = date || new Date().toISOString().split('T')[0];
    const pontoId = `${dateString}-${deliverymanId}`;

    try {
      const pontoRef = doc(db, 'pontos', pontoId);
      const pontoDoc = await getDoc(pontoRef);

      if (pontoDoc.exists()) {
        return { id: pontoDoc.id, ...pontoDoc.data() } as Ponto;
      } else {
        return null;
      }
    } catch (error) {
      console.error(`[useDeliveryman] Error getting ponto data for ${pontoId}:`, error);
      throw error;
    }
  };

  // Function to get motorcycle current km
  const getMotorcycleKm = useCallback(async (motorcycleId: string): Promise<number | null> => {
    try {
      console.log('[useDeliveryman] Buscando kilometragem para moto:', motorcycleId);
      const motorcycleRef = doc(db, 'motorcycles', motorcycleId);
      const motorcycleDoc = await getDoc(motorcycleRef);
      
      if (motorcycleDoc.exists()) {
        const motorcycleData = motorcycleDoc.data();
        console.log('[useDeliveryman] Dados da moto encontrados:', motorcycleData);
        const km = motorcycleData.km || 0;
        console.log('[useDeliveryman] Kilometragem extraída:', km);
        return km;
      } else {
        console.warn('[useDeliveryman] Documento da moto não encontrado:', motorcycleId);
        return null;
      }
    } catch (error) {
      console.error('[useDeliveryman] Erro ao buscar kilometragem da moto:', error);
      throw error;
    }
  }, [db]);

  // Function to get motorcycle next maintenance km
  const getMotorcycleNextMaintenanceKm = useCallback(async (motorcycleId: string): Promise<number | null> => {
    try {
      const motorcycleRef = doc(db, 'motorcycles', motorcycleId);
      const motorcycleDoc = await getDoc(motorcycleRef);
      
      if (motorcycleDoc.exists()) {
        const motorcycleData = motorcycleDoc.data();
        const nextMaintenanceKm = motorcycleData.nextMaintenanceKm || null;
        return nextMaintenanceKm;
      } else {
        return null;
      }
    } catch (error) {
      console.error('[useDeliveryman] Erro ao buscar próxima manutenção da moto:', error);
      throw error;
    }
  }, [db]);

  // Function to update motorcycle km and next maintenance km
  const updateMotorcycleData = useCallback(async (motorcycleId: string, newKm: number, nextMaintenanceKm?: number): Promise<void> => {
    try {
      const motorcycleRef = doc(db, 'motorcycles', motorcycleId);
      const updateData: any = {
        km: newKm,
        updatedAt: Timestamp.now()
      };
      
      if (nextMaintenanceKm !== undefined) {
        updateData.nextMaintenanceKm = nextMaintenanceKm;
      }
      
      await updateDoc(motorcycleRef, updateData);
      console.log('[useDeliveryman] Dados da moto atualizados com sucesso');
    } catch (error) {
      console.error('[useDeliveryman] Erro ao atualizar dados da moto:', error);
      throw error;
    }
  }, [db]);

  // Function to update motorcycle km (backward compatibility)
  const updateMotorcycleKm = useCallback(async (motorcycleId: string, newKm: number): Promise<void> => {
    return updateMotorcycleData(motorcycleId, newKm);
  }, [updateMotorcycleData]);

  // Function to save inspection form to Firestore
  const saveInspectionForm = useCallback(async (formData: InspectionFormData): Promise<string> => {
    try {
      const formsCollection = collection(db, 'forms');
      const docRef = await addDoc(formsCollection, {
        ...formData,
        createdAt: Timestamp.fromDate(formData.createdAt),
        updatedAt: Timestamp.fromDate(formData.updatedAt)
      });
      console.log('[useDeliveryman] Formulário de inspeção salvo com sucesso');
      return docRef.id; // Return the document ID
    } catch (error) {
      console.error('[useDeliveryman] Erro ao salvar formulário de inspeção:', error);
      throw error;
    }
  }, [db]);

  // Function to update inspection form with final time
  const updateInspectionFormFinalTime = useCallback(async (formId: string, finalTime: string): Promise<void> => {
    try {
      const formDoc = doc(db, 'forms', formId);
      await updateDoc(formDoc, {
        finalTime,
        updatedAt: Timestamp.now()
      });
      console.log('[useDeliveryman] Hora final do formulário atualizada com sucesso');
    } catch (error) {
      console.error('[useDeliveryman] Erro ao atualizar hora final do formulário:', error);
      throw error;
    }
  }, [db]);


  // Public function to load secondary data on demand
  const loadSecondaryData = useCallback(async (unitId?: string) => {
    const unitToLoad = unitId || data.deliveryman?.pharmacyUnitId;
    if (!unitToLoad) {
      console.warn('[useDeliveryman] Cannot load secondary data: no unit ID provided');
      return;
    }
    
    if (fetchRelatedDataRef.current) {
      console.log('[useDeliveryman] Manually loading secondary data for unit:', unitToLoad);
      await fetchRelatedDataRef.current(unitToLoad);
    } else {
      console.warn('[useDeliveryman] fetchRelatedData not available yet');
    }
  }, [data.deliveryman?.pharmacyUnitId]);


  return {
    ...data, // Spread the state data (deliveryman, motorcycles, orders, pharmacyUnit, loading, error)
    fetchAvailablePreparingOrders, // Expose the new function
    loadingPreparingOrders, // Expose loading state for preparing orders
    isLoadingSecondaryData, // Expose secondary loading state
    hasMoreOriginOrders, // Expose to know if more can be loaded
    hasMoreTransferOrders, // Expose to know if more can be loaded
    loadSecondaryData, // Expose manual loading function
    updateDeliverymanStatus,
    updateOrderStatus,
    updateDeliverymanLicensePlate,
    clearDeliverymanLicensePlate,
    setDeliverymanOrders,
    updateMultipleOrderStatus,
    updateDeliverymanUnit,
    cancelUnitSelection,
    // restoreOriginalUnit is implicitly handled by updateDeliverymanStatus('Fora de expediente')
    createOrUpdatePonto,
    getPontoData,
    getMotorcycleKm,
    getMotorcycleNextMaintenanceKm,
    updateMotorcycleKm,
    updateMotorcycleData,
    saveInspectionForm,
    updateInspectionFormFinalTime
  };
};
