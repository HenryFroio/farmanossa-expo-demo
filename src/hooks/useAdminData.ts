import { useState, useEffect, useMemo } from 'react'; // Import useMemo
import {
  getFirestore,
  collection,
  query, // Renomeado de firebaseQuery para query
  where,
  getDocs,
  DocumentData
} from 'firebase/firestore';

// Helper to get start of current week (Sunday)
const getStartOfWeek = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 (Sunday) to 6
  const diff = now.getDate() - dayOfWeek;
  const start = new Date(now.setDate(diff));
  start.setHours(0,0,0,0);
  return start;
};

interface AdminData {
  deliverymen: DocumentData[];
  pharmacyUnits: DocumentData[];
  deliveredOrders: DocumentData[];
  dummyOrders: DocumentData[];
  loading: boolean;
  error: string | null;
}

export const useAdminData = (userRole: string | null, managerUnit: string | null) => {
  const [internalData, setInternalData] = useState<AdminData>({
    deliverymen: [],
    pharmacyUnits: [],
    deliveredOrders: [],
    dummyOrders: [],
    loading: true,
    error: null
  });
  // console.log(`[useAdminData] Hook initialized. Role: ${userRole}, Unit: ${managerUnit}, Loading: ${internalData.loading}`);

  const db = getFirestore();

  useEffect(() => {
    // console.log(`[useAdminData] useEffect triggered. Role: ${userRole}, Unit: ${managerUnit}, CurrentLoading: ${internalData.loading}`);
    
    const fetchData = async () => {
      // console.log("[useAdminData] fetchData START");
      const startTime = Date.now();
      
      setInternalData(prev => ({ 
        ...prev, 
        loading: true, 
        error: null,
      }));
      // console.log("[useAdminData] State reset for primary data loading (loading: true, error: null).");

      try {
        const deliverymenRef = collection(db, 'deliverymen');
        const pharmacyUnitsRef = collection(db, 'pharmacyUnits');
        const deliveredOrdersRef = collection(db, 'orders');
        // console.log("[useAdminData] Base collection refs created.");
        
        // Construir as queries com filtros
        let deliverymenQuery = query(deliverymenRef); // Corrigido: firebaseQuery -> query
        let pharmacyUnitsQuery = query(pharmacyUnitsRef); // Corrigido: firebaseQuery -> query
        let deliveredOrdersQuery = query(deliveredOrdersRef, where('status', '==', 'Entregue'));
        
        const startOfWeek = getStartOfWeek();

        if (userRole === 'manager' && managerUnit) {
          // console.log(`[useAdminData] Applying manager filters. Unit: ${managerUnit}`);
          deliverymenQuery = query(deliverymenRef, where('pharmacyUnitId', '==', managerUnit)); // Corrigido: firebaseQuery -> query
          pharmacyUnitsQuery = query(pharmacyUnitsRef, where('__name__', '==', managerUnit)); // Corrigido: firebaseQuery -> query
          deliveredOrdersQuery = query( // Corrigido: firebaseQuery -> query
            deliveredOrdersRef,
            where('status', '==', 'Entregue'),
            where('pharmacyUnitId', '==', managerUnit)
          );
          // console.log("[useAdminData] Manager queries updated.");
        } else if (userRole === 'admin') {
          // console.log("[useAdminData] Admin role, fetching all relevant data.");
          // As queries iniciais já buscam todos os dados para admin (exceto filtro de status em orders)
          // fetch only this week's orders and filter delivered in memory
          deliveredOrdersQuery = query(
            deliveredOrdersRef,
            where('createdAt', '>=', startOfWeek)
          );
        } else {
          // console.log(`[useAdminData] Role is not manager or admin (${userRole}), or managerUnit is missing. Fetching general data or no data based on role logic.`);
          // Para outros papéis ou gerente sem unidade, as queries padrão são usadas.
          // Se for necessário um comportamento diferente, adicionar lógica aqui.
        }

        // Executar queries primárias em paralelo
        // console.log("[useAdminData] Fetching primary data (deliverymen, units, deliveredOrders) START");
        const primaryDataFetchStartTime = Date.now();
        const [
          deliverymenSnapshot,
          pharmacyUnitsSnapshot,
          deliveredOrdersSnapshot,
        ] = await Promise.all([
          getDocs(deliverymenQuery),
          getDocs(pharmacyUnitsQuery),
          getDocs(deliveredOrdersQuery),
        ]);
        // console.log(`[useAdminData] Fetching primary data END. Duration: ${Date.now() - primaryDataFetchStartTime}ms`);
        // console.log(`[useAdminData]   - Deliverymen: ${deliverymenSnapshot.size} docs`);
        // console.log(`[useAdminData]   - PharmacyUnits: ${pharmacyUnitsSnapshot.size} docs`);
        // console.log(`[useAdminData]   - DeliveredOrders: ${deliveredOrdersSnapshot.size} docs`);

        // Atualizar estado com dados primários e definir loading como false
        setInternalData(prev => {
          const allOrders = deliveredOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
          // filter only delivered status
          const deliveredThisWeek = allOrders.filter(order => order.status === 'Entregue');
          return {
            ...prev,
            deliverymen: deliverymenSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })),
            pharmacyUnits: pharmacyUnitsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })),
            deliveredOrders: deliveredThisWeek,
            loading: false, // Primary data loading finished
            error: null
          };
        });
        // console.log("[useAdminData] Primary data set to state, loading set to false.");

        // Buscar dummyOrders (todos os pedidos para a unidade do gerente ou todos para admin) em segundo plano
        // console.log("[useAdminData] Fetching dummyOrders (for search) START");
        const dummyOrdersFetchStartTime = Date.now();
        try {
          const dummyOrdersRefCollection = collection(db, 'orders');
          let dummyOrdersQueryFiltered: any;
          
          if (userRole === 'manager' && managerUnit) {
            // console.log(`[useAdminData] Applying manager filter for dummyOrders. Unit: ${managerUnit}`);
            dummyOrdersQueryFiltered = query(dummyOrdersRefCollection, where('pharmacyUnitId', '==', managerUnit)); // Corrigido: firebaseQuery -> query
          } else if (userRole === 'admin') {
            // console.log("[useAdminData] Admin role, fetching all dummyOrders.");
            // only this week's orders for search
            dummyOrdersQueryFiltered = query(
              dummyOrdersRefCollection,
              where('createdAt', '>=', startOfWeek)
            );
          }
          
          if (dummyOrdersQueryFiltered) {
            const dummySnapshot = await getDocs(dummyOrdersQueryFiltered);
            setInternalData(prev => ({
              ...prev,
              dummyOrders: dummySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }))
            }));
            // console.log("[useAdminData] dummyOrders set to state.");
          } else {
            // console.log("[useAdminData] dummyOrders query was not constructed, skipping fetch.");
          }
        } catch (dummyError) {
          // console.error('[useAdminData] Erro ao buscar dummyOrders:', dummyError);
          setInternalData(prev => ({ ...prev, error: prev.error || 'Erro ao carregar dados de busca' }));
          // console.log(`[useAdminData] Fetching dummyOrders END (ERROR). Duration: ${Date.now() - dummyOrdersFetchStartTime}ms`);
        }

      } catch (error) {
        // console.error('[useAdminData] Erro ao buscar dados primários:', error);
        setInternalData(prev => ({
          ...prev,
          loading: false,
          error: 'Erro ao carregar dados principais'
        }));
      }
      // console.log(`[useAdminData] fetchData END. Total Duration: ${Date.now() - startTime}ms`);
    };

    // Condições para buscar dados:
    // 1. Se for admin, busca sempre.
    // 2. Se for manager, busca apenas se managerUnit estiver definido.
    if (userRole === 'admin') {
      // console.log(`[useAdminData] Admin role detected. Calling fetchData. Unit: ${managerUnit}`);
      fetchData();
    } else if (userRole === 'manager') {
      if (managerUnit) {
        // console.log(`[useAdminData] Manager role with unit (${managerUnit}) detected. Calling fetchData.`);
        fetchData();
      } else {
        // console.log("[useAdminData] Manager role detected, but managerUnit is not yet available. Waiting for unit. Setting loading to true and clearing data.");
        setInternalData({
          deliverymen: [],
          pharmacyUnits: [],
          deliveredOrders: [],
          dummyOrders: [],
          loading: true,
          error: null
        });
      }
    } else {
      // console.log(`[useAdminData] No suitable role ('${userRole}') or role not yet defined. Clearing data and setting loading to false.`);
      setInternalData({
        deliverymen: [],
        pharmacyUnits: [],
        deliveredOrders: [],
        dummyOrders: [],
        loading: false,
        error: null
      });
    }
  }, [userRole, managerUnit]); // db is stable, fetchData should be wrapped in useCallback if added as dependency, or its own deps listed if complex.

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