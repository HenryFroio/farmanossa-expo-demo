import { useState, useEffect, useMemo } from 'react'; // Import useMemo
import {
  getFirestore,
  collection,
  query, // Renomeado de firebaseQuery para query
  where,
  getDocs,
  DocumentData,
  orderBy,
  limit
} from 'firebase/firestore';

// Time period enum
export enum TimePeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

// Helper to get start of current day
const getStartOfDay = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

// Helper to get start of current week (Sunday)
const getStartOfWeek = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 (Sunday) to 6
  const diff = now.getDate() - dayOfWeek;
  const start = new Date(now.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
};

// Helper to get start of current month
const getStartOfMonth = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
};

// Helper to get start date based on period
const getStartDateForPeriod = (period: TimePeriod) => {
  switch (period) {
    case TimePeriod.DAILY:
      return getStartOfDay();
    case TimePeriod.WEEKLY:
      return getStartOfWeek();
    case TimePeriod.MONTHLY:
      return getStartOfMonth();
    default:
      return getStartOfDay();
  }
};

// Helper to get period label
const getPeriodLabel = (period: TimePeriod) => {
  switch (period) {
    case TimePeriod.DAILY:
      return 'diárias';
    case TimePeriod.WEEKLY:
      return 'semanais';
    case TimePeriod.MONTHLY:
      return 'mensais';
    default:
      return 'diárias';
  }
};

// Helper to get last 3 days for search (dummy orders)
const getLastThreeDays = () => {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
  threeDaysAgo.setHours(0, 0, 0, 0);
  return threeDaysAgo;
};

interface AdminData {
  deliverymen: DocumentData[];
  pharmacyUnits: DocumentData[];
  deliveredOrders: DocumentData[];
  dummyOrders: DocumentData[];
  loading: boolean;
  error: string | null;
}

export const useAdminData = (
  userRole: string | null, 
  managerUnit: string | null,
  timePeriod: TimePeriod = TimePeriod.DAILY
) => {
  const [internalData, setInternalData] = useState<AdminData>({
    deliverymen: [],
    pharmacyUnits: [],
    deliveredOrders: [],
    dummyOrders: [],
    loading: true,
    error: null
  });

  const db = getFirestore();
  useEffect(() => {
    const fetchData = async () => {
      const totalStartTime = Date.now();
      
      setInternalData(prev => ({ 
        ...prev, 
        loading: true, 
        error: null,
      }));

      try {
        const setupStartTime = Date.now();
        
        const deliverymenRef = collection(db, 'deliverymen');
        const pharmacyUnitsRef = collection(db, 'pharmacyUnits');
        const deliveredOrdersRef = collection(db, 'orders');
        
        // Construir as queries com filtros
        let deliverymenQuery = query(deliverymenRef);
        let pharmacyUnitsQuery = query(pharmacyUnitsRef);
        let deliveredOrdersQuery = query(deliveredOrdersRef, where('status', '==', 'Entregue'));
        
        const startDate = getStartDateForPeriod(timePeriod);
        const periodLabel = getPeriodLabel(timePeriod);
        
        const queryConfigStartTime = Date.now();

        if (userRole === 'manager' && managerUnit) {
          deliverymenQuery = query(deliverymenRef, where('pharmacyUnitId', '==', managerUnit));
          pharmacyUnitsQuery = query(pharmacyUnitsRef, where('__name__', '==', managerUnit));
          deliveredOrdersQuery = query(
            deliveredOrdersRef,
            where('status', '==', 'Entregue'),
            where('pharmacyUnitId', '==', managerUnit),
            where('createdAt', '>=', startDate)
          );
        } else if (userRole === 'admin') {
          // Try alternative approach: query by date range with status filter
          deliveredOrdersQuery = query(
            deliveredOrdersRef,
            where('createdAt', '>=', startDate),
            where('status', '==', 'Entregue')
          );        
        }
        
        const mainQueriesStartTime = Date.now();
        
        // Executar queries primárias em paralelo
        
        const deliverymenStart = Date.now();
        const pharmacyUnitsStart = Date.now();
        const deliveredOrdersStart = Date.now();
        
        // Test simple connectivity first
        const connectivityTest = Date.now();
        const testQuery = query(collection(db, 'orders'), limit(1));
        await getDocs(testQuery);
        
        // Alternative: Load most critical data first, then the rest
        // This gives users something to see faster
        
        const criticalStart = Date.now();
        const deliveredOrdersSnapshot = await getDocs(deliveredOrdersQuery);
        
        // Update state with partial data to show something to user
        const partialDeliveredOrdersData = deliveredOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        
        setInternalData(prev => ({
          ...prev,
          deliveredOrders: partialDeliveredOrdersData,
          loading: true // Still loading other data
        }));
        
        const remainingStart = Date.now();
        
        const [
          deliverymenSnapshot,
          pharmacyUnitsSnapshot,
        ] = await Promise.all([
          getDocs(deliverymenQuery).then(result => {
            return result;
          }),
          getDocs(pharmacyUnitsQuery).then(result => {
            return result;
          }),
        ]);


        const dummyStartTime = Date.now();
        // Buscar dummyOrders em paralelo (otimizado para busca)
        let dummyOrdersData: any[] = [];
        try {
          const dummyOrdersRefCollection = collection(db, 'orders');
          let dummyOrdersQueryFiltered: any;
          
          if (userRole === 'manager' && managerUnit) {
            // Para manager: últimos 500 pedidos da unidade (para busca)
            // Não filtra por data para permitir busca em pedidos mais antigos
            dummyOrdersQueryFiltered = query(
              dummyOrdersRefCollection, 
              where('pharmacyUnitId', '==', managerUnit),
              orderBy('createdAt', 'desc'),
              limit(1)
            );
          } else if (userRole === 'admin') {
            // Para admin: últimos 3 dias com limite de 1000 pedidos
            const lastThreeDays = getLastThreeDays();
            dummyOrdersQueryFiltered = query(
              dummyOrdersRefCollection,
              where('createdAt', '>=', lastThreeDays),
              orderBy('createdAt', 'desc'),
              limit(1)
            );
          }
          
          if (dummyOrdersQueryFiltered) {
            const dummyQueryStartTime = Date.now();
            const dummySnapshot = await getDocs(dummyOrdersQueryFiltered);
            
            const dummyProcessingStartTime = Date.now();
            dummyOrdersData = dummySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
          }
        } catch (dummyError) {
          console.error('❌ [PERF][useAdminData] Error fetching dummyOrders:', dummyError);
        }


        // Atualizar estado com todos os dados de uma vez
        const finalProcessingStartTime = Date.now();
        
        const allOrders = deliveredOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        // Não precisa filtrar novamente por status, pois a query já fez isso
        
        const deliverymenData = deliverymenSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        const pharmacyUnitsData = pharmacyUnitsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        
        
        const stateUpdateStartTime = Date.now();
        
        setInternalData({
          deliverymen: deliverymenData,
          pharmacyUnits: pharmacyUnitsData,
          deliveredOrders: allOrders, // Já filtrado pela query
          dummyOrders: dummyOrdersData,
          loading: false,
          error: null
        });
        

      } catch (error) {
        console.error('❌ [PERF][useAdminData] Error during data fetch:', error);
        const errorTime = Date.now() - totalStartTime;
        setInternalData(prev => ({
          ...prev,
          loading: false,
          error: 'Erro ao carregar dados'
        }));
      }
    };

    // Condições simplificadas para buscar dados
    if (userRole === 'admin' || (userRole === 'manager' && managerUnit)) {
      fetchData();
    } else if (userRole && userRole !== 'admin' && userRole !== 'manager') {
      // Para outros roles, define loading como false
      setInternalData(prev => ({ ...prev, loading: false }));
    }  }, [userRole, managerUnit, timePeriod]);

  // Memoize the returned data slices to stabilize references
  const deliverymen = useMemo(() => internalData.deliverymen, [internalData.deliverymen]);
  const pharmacyUnits = useMemo(() => internalData.pharmacyUnits, [internalData.pharmacyUnits]);
  const deliveredOrders = useMemo(() => internalData.deliveredOrders, [internalData.deliveredOrders]);
  const dummyOrders = useMemo(() => internalData.dummyOrders, [internalData.dummyOrders]);

  return {
    deliverymen,
    pharmacyUnits,
    deliveredOrders,
    dummyOrders,
    loading: internalData.loading,
    error: internalData.error,
  };
};