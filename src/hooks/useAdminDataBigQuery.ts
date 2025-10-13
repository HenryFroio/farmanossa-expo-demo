/**
 * useAdminDataBigQuery
 * 
 * Substitui useAdminData (60s Firestore) com BigQuery APIs (<1s)
 * Mantém mesma interface para compatibilidade com componentes existentes
 * 
 * Performance: 60s → <1s (98.3% improvement)
 * Cost: Firestore reads → BigQuery queries ($0.75/month estimated)
 */

import { useState, useEffect, useMemo } from 'react';
import { DocumentData, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import { fetchWithCache } from '../utils/bigQueryCache';

// Time period enum (mantém compatibilidade)
export enum TimePeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

interface AdminData {
  deliverymen: DocumentData[];
  pharmacyUnits: DocumentData[];
  deliveredOrders: DocumentData[];
  dummyOrders: DocumentData[];
  loading: boolean;
  error: string | null;
}

// BigQuery API base URL
const BIGQUERY_API_URL = 'https://us-central1-farmanossadelivery-76182.cloudfunctions.net/bigqueryApi';

// Helper: Convert TimePeriod to API period param
const getPeriodParam = (period: TimePeriod): string => {
  switch (period) {
    case TimePeriod.DAILY:
      return 'today';
    case TimePeriod.WEEKLY:
      return 'week';
    case TimePeriod.MONTHLY:
      return 'month';
    default:
      return 'today';
  }
};

/**
 * Fetch admin dashboard data from BigQuery API with cache
 */
const fetchAdminDashboard = async (
  period: string,
  unitId?: string,
  deliverymanId?: string,
  idToken?: string
): Promise<any> => {
  const params = new URLSearchParams({ period });
  if (unitId && unitId !== 'undefined') params.append('unitId', unitId);
  if (deliverymanId && deliverymanId !== 'undefined') params.append('deliverymanId', deliverymanId);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  // Build cache key without undefined values
  const cacheParams: Record<string, any> = { period };
  if (unitId && unitId !== 'undefined') cacheParams.unitId = unitId;
  if (deliverymanId && deliverymanId !== 'undefined') cacheParams.deliverymanId = deliverymanId;

  // Use fetchWithCache for automatic caching
  return fetchWithCache(
    'admin-dashboard',
    cacheParams,
    async () => {
      const response = await fetch(`${BIGQUERY_API_URL}/admin-dashboard?${params}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    }
  );
};

/**
 * Fetch deliverymen from Firestore
 */
const fetchDeliverymen = async (unitId?: string): Promise<DocumentData[]> => {
  try {
    const deliverymenRef = collection(db, 'deliverymen');
    let deliverymenQuery = query(deliverymenRef);
    
    if (unitId) {
      deliverymenQuery = query(deliverymenRef, where('pharmacyUnitId', '==', unitId));
    }
    
    const snapshot = await getDocs(deliverymenQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching deliverymen:', error);
    return [];
  }
};

/**
 * Fetch pharmacy units from Firestore
 */
const fetchPharmacyUnits = async (unitId?: string): Promise<DocumentData[]> => {
  try {
    const pharmacyUnitsRef = collection(db, 'pharmacyUnits');
    let pharmacyUnitsQuery = query(pharmacyUnitsRef);
    
    if (unitId) {
      pharmacyUnitsQuery = query(pharmacyUnitsRef, where('__name__', '==', unitId));
    }
    
    const snapshot = await getDocs(pharmacyUnitsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching pharmacy units:', error);
    return [];
  }
};

/**
 * Transform BigQuery response to structured stats for AdminScreen
 * Substitui processamento client-side por dados pré-agregados do BigQuery
 */
const transformBigQueryStats = (bigQueryData: any) => {
  if (!bigQueryData.stats) return null;

  const ordersByDeliveryman = (bigQueryData.ordersByDeliveryman || []).reduce((acc: any, row: any) => {
    acc[row.delivery_man] = {
      count: row.order_count || 0,
      revenue: row.total_revenue || 0,
      avgValue: row.avg_order_value || 0,
      avgDeliveryTime: row.avg_delivery_time || 0,
      avgRating: row.avg_rating || 0,
      name: row.delivery_man_name || row.delivery_man, // Nome do BigQuery JOIN
    };
    return acc;
  }, {});

  const ordersByUnit = (bigQueryData.ordersByUnit || []).reduce((acc: any, row: any) => {
    acc[row.pharmacy_unit_id] = {
      count: row.order_count || 0,
      revenue: row.total_revenue || 0,
      avgValue: row.avg_order_value || 0,
      avgDeliveryTime: row.avg_delivery_time || 0,
      avgRating: row.avg_rating || 0,
      name: row.unit_name || row.pharmacy_unit_id, // Nome do BigQuery JOIN
    };
    return acc;
  }, {});

  const motorcycleUsage = (bigQueryData.motorcycleUsage || []).reduce((acc: any, row: any) => {
    acc[row.license_plate] = {
      count: row.delivery_count || 0,
      uniqueDeliverymen: row.unique_deliverymen || 0,
    };
    return acc;
  }, {});

  console.log('🏍️ Motos da unidade:', Object.keys(motorcycleUsage).map(plate => ({
    placa: plate,
    entregas: motorcycleUsage[plate].count,
    entregadores: motorcycleUsage[plate].uniqueDeliverymen
  })));

  return {
    // Métricas principais (usadas por vários componentes)
    totalOrders: bigQueryData.stats.total_orders || 0,
    deliveredOrders: bigQueryData.stats.delivered_orders || 0,
    canceledOrders: bigQueryData.stats.canceled_orders || 0,
    preparingOrders: bigQueryData.stats.preparing_orders || 0,
    inDeliveryOrders: bigQueryData.stats.in_delivery_orders || 0,
    pendingOrders: bigQueryData.stats.pending_orders || 0,
    
    // Receita
    totalRevenue: bigQueryData.stats.total_revenue || 0,
    avgOrderValue: bigQueryData.stats.avg_order_value || 0,
    deliveredRevenue: bigQueryData.stats.delivered_revenue || 0,
    
    // Avaliações
    avgRating: bigQueryData.stats.avg_rating || 0,
    totalRatings: bigQueryData.stats.total_ratings || 0,
    positiveRatings: bigQueryData.stats.positive_ratings || 0,
    satisfactionRate: bigQueryData.stats.satisfaction_rate || 0,
    
    // Performance de entrega
    avgDeliveryTimeMinutes: bigQueryData.stats.avg_delivery_time_minutes || 0,
    fastestDeliveryMinutes: bigQueryData.stats.fastest_delivery_minutes || 0,
    slowestDeliveryMinutes: bigQueryData.stats.slowest_delivery_minutes || 0,
    
    // Staff e clientes
    activeDeliverymen: bigQueryData.stats.active_deliverymen || 0,
    activeUnits: bigQueryData.stats.active_units || 0,
    uniqueCustomers: bigQueryData.stats.unique_customers || 0,
    
    // Items
    totalItems: bigQueryData.stats.total_items || 0,
    avgItemsPerOrder: bigQueryData.stats.avg_items_per_order || 0,
    
    // Dados agregados para charts/rankings
    topRegions: bigQueryData.topRegions || [],
    hourlyDistribution: bigQueryData.hourlyDistribution || [],
    dailyDistribution: bigQueryData.dailyDistribution || [],
    
    // Agregações por entregador (substitui reduce no AdminScreen)
    ordersByDeliveryman,
    
    // Agregações por unidade (substitui reduce no AdminScreen)
    ordersByUnit,
    
    // Uso de motos (substitui reduce no AdminScreen)
    motorcycleUsage,
    
    // Timestamps
    firstOrderTime: bigQueryData.stats.first_order_time,
    lastOrderTime: bigQueryData.stats.last_order_time,
    queryTime: bigQueryData.queryTime,
  };
};

/**
 * Hook principal - substitui useAdminData
 */
export const useAdminDataBigQuery = (
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
    error: null,
  });

  const [dashboardStats, setDashboardStats] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const startTime = Date.now();

      setInternalData(prev => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        const idToken = currentUser ? await currentUser.getIdToken() : undefined;

        const period = getPeriodParam(timePeriod);
        
        // Determinar filtros baseados no role (não passar undefined)
        let unitFilter: string | undefined;
        let deliverymanFilter: string | undefined;

        if (userRole === 'manager' && managerUnit) {
          unitFilter = managerUnit;
        }
        // Admin não tem filtro de unidade específica

        // Fetch dashboard data from BigQuery API
        const dashboardData = await fetchAdminDashboard(
          period,
          unitFilter, // undefined para admin, unitId para manager
          deliverymanFilter, // sempre undefined neste contexto
          idToken
        );

        // Transform BigQuery stats to structured format
        const transformedStats = transformBigQueryStats(dashboardData);
        setDashboardStats(transformedStats);

        // BIGQUERY: Deliverymen e pharmacy units agora vêm do BigQuery (não mais do Firestore!)
        // Isso economiza ~925ms de tempo de carregamento
        // Note: Apenas deliverymen ATIVOS estão no BigQuery (inactive são removidos automaticamente)
        const deliverymen = (dashboardData.deliverymen || []).map((dm: any) => ({
          id: dm.delivery_man_id,
          name: dm.name,
          pharmacyUnitId: dm.pharmacy_unit_id,
        }));
        const pharmacyUnits = (dashboardData.pharmacyUnits || []).map((unit: any) => ({
          id: unit.unit_id,
          name: unit.name,
        }));

        setInternalData({
          deliverymen,
          pharmacyUnits,
          deliveredOrders: [], // Array vazio - dados vêm de bigQueryStats
          dummyOrders: [], // BigQuery não precisa de dummy orders
          loading: false,
          error: null,
        });

      } catch (error) {
        setInternalData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Erro ao carregar dados do BigQuery',
        }));
      }
    };

    if (userRole === 'admin' || (userRole === 'manager' && managerUnit)) {
      fetchData();
    } else if (userRole && userRole !== 'admin' && userRole !== 'manager') {
      setInternalData(prev => ({ ...prev, loading: false }));
    }
  }, [userRole, managerUnit, timePeriod]);

  // Memoize returned data for performance
  const deliverymen = useMemo(() => internalData.deliverymen, [internalData.deliverymen]);
  const pharmacyUnits = useMemo(() => internalData.pharmacyUnits, [internalData.pharmacyUnits]);
  const deliveredOrders = useMemo(() => internalData.deliveredOrders, [internalData.deliveredOrders]);
  const dummyOrders = useMemo(() => internalData.dummyOrders, [internalData.dummyOrders]);
  const bigQueryStats = useMemo(() => dashboardStats, [dashboardStats]);

  return {
    deliverymen,
    pharmacyUnits,
    deliveredOrders, // Array vazio - mantido para compatibilidade, mas não usado
    dummyOrders, // Array vazio - BigQuery não precisa
    loading: internalData.loading,
    error: internalData.error,
    // BigQuery stats - dados pré-agregados do servidor
    bigQueryStats,
  };
};
