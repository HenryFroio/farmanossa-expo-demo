/**
 * useStatsDataBigQuery
 * 
 * Substitui useStatsData (processamento O(n²) local) com BigQuery APIs
 * Mantém interface similar para compatibilidade
 * 
 * Performance: calculateDetailedStats O(n²) → BigQuery pre-aggregated (<1s)
 * Cost: Client-side processing → Server-side BigQuery queries
 */

import { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { Alert } from 'react-native';
import { UserRole } from '../utils/statsUtils';
import { fetchWithCache } from '../utils/bigQueryCache';

// BigQuery API base URL
const BIGQUERY_API_URL = 'https://us-central1-farmanossadelivery-76182.cloudfunctions.net/bigqueryApi';

interface BigQueryStatsData {
  selectedData: any[];
  detailedStats: any[];
  overallStats: any;
  topMotorcycles: any[];
  recentOrders: any[];
  allDeliverymenStats: any[];
  isLoading: boolean;
  hasError: boolean;
  dataVersion: number; // Track data freshness for UI sync
}

/**
 * Fetch deliveryman stats from BigQuery API with cache
 */
const fetchDeliverymanStats = async (
  deliverymanId: string,
  period: string = 'month',
  idToken?: string
): Promise<any> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  // Use fetchWithCache for automatic caching
  return fetchWithCache(
    `deliveryman/${deliverymanId}`,
    { period },
    async () => {
      const response = await fetch(
        `${BIGQUERY_API_URL}/deliveryman/${encodeURIComponent(deliverymanId)}?period=${period}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      return response.json();
    }
  );
};

/**
 * Fetch unit stats from BigQuery API with cache
 */
const fetchUnitStats = async (
  unitId: string,
  period: string = 'week',
  idToken?: string
): Promise<any> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  // Use fetchWithCache for automatic caching
  return fetchWithCache(
    `unit/${unitId}`,
    { period },
    async () => {
      const response = await fetch(
        `${BIGQUERY_API_URL}/unit/${encodeURIComponent(unitId)}?period=${period}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      return response.json();
    }
  );
};

/**
 * Transform BigQuery deliveryman response to legacy detailedStats format
 */
const transformDeliverymanToBQ = (bigQueryData: any): any => {
  if (!bigQueryData.stats) return null;

  const stats = bigQueryData.stats;

  // Transform hourly distribution to ordersByHour (com conversão UTC → Brasília)
  const ordersByHour: { [key: number]: number } = {};
  if (bigQueryData.hourlyDistribution) {
    bigQueryData.hourlyDistribution.forEach((item: any) => {
      // Converter UTC para Brasília (UTC-3)
      const utcHour = item.hour;
      const brasiliaHour = (utcHour - 3 + 24) % 24;
      ordersByHour[brasiliaHour] = item.count;
    });
  }

  // Transform performanceByDay
  const performanceByDay: { [key: number]: number } = {};
  if (bigQueryData.performanceByDay) {
    bigQueryData.performanceByDay.forEach((item: any) => {
      performanceByDay[item.day] = item.count;
    });
  }

  // Transform performanceByMonth
  const performanceByMonth: { [key: number]: number } = {};
  if (bigQueryData.performanceByMonth) {
    bigQueryData.performanceByMonth.forEach((item: any) => {
      performanceByMonth[item.day] = item.count;
    });
  }

  // Transform topRegions
  const topRegions: [string, number][] = (bigQueryData.topRegions || []).map((item: any) => 
    [item.region, item.count]
  );

  // Transform topMotorcycles
  const topMotorcycles: [string, number][] = (bigQueryData.topMotorcycles || []).map((item: any) => 
    [item.license_plate, item.count]
  );

  // Transform topItems
  const topItems: [string, number][] = (bigQueryData.topItems || []).map((item: any) => 
    [item.item, item.count]
  );

  // Transform topCustomers
  const topCustomers: [string, number][] = (bigQueryData.topCustomers || []).map((item: any) => 
    [`${item.name} (${item.phone})`, item.count]
  );

  // Transform revenueTrend (same format as unit)
  const revenueTrend = (bigQueryData.revenueTrend || []).map((item: any) => ({
    date: item.date,
    revenue: item.revenue || 0,
  }));

  return {
    name: stats.delivery_man || 'Unknown',
    totalDeliveries: stats.total_deliveries || 0,
    totalRevenue: stats.total_earnings || 0, // 15% commission
    totalDistanceKm: stats.total_distance_meters || 0, // ← In meters, will be converted to km in UI
    totalCancelledOrders: stats.canceled_deliveries || 0, // ← NEW: From orders WHERE status='Cancelado'
    averageDeliveryTime: stats.avg_delivery_time || 0,
    fastestDelivery: stats.fastest_delivery || 0,
    slowestDelivery: stats.slowest_delivery || 0,
    averageRating: stats.avg_rating || 0,
    totalRatings: stats.total_ratings || 0,
    ratingDistribution: {},
    recentReviews: [],
    deliverymanStatus: null,
    currentOrderId: null,
    performanceByDay,
    performanceByMonth,
    topItems,
    topCustomers,
    revenueTrend, // ← Agora usando bigQueryData.revenueTrend (igual ao unit)
    totalDistance: 0, // TODO: Add if needed
    topDeliverymen: null, // Not applicable for deliveryman (only for units)
    topMotorcycles,
    topRegions,
    deliveryTimeDistribution: {
      '0-15min': stats.deliveries_0_15_min || 0,
      '15-30min': stats.deliveries_15_30_min || 0,
      '30-45min': stats.deliveries_30_45_min || 0,
      '45-60min': stats.deliveries_over_45_min || 0,
      '60min+': stats.deliveries_over_45_min || 0, // Approximate
    },
    ordersByHour,
    customerSatisfaction: {
      total: stats.total_ratings || 0,
      satisfied: stats.positive_ratings || 0,
      percentage: stats.satisfaction_rate || 0,
    },
  };
};

/**
 * Transform BigQuery unit response to legacy detailedStats format
 */
const transformUnitStats = (bigQueryData: any): any => {
  if (!bigQueryData.stats) {
    console.warn('⚠️ [transformUnitStats] No stats in response');
    return null;
  }

  const stats = bigQueryData.stats;
  
  const totalOrders = stats.total_orders || 0;
  const deliveryRate = stats.delivery_rate || 0;
  const satisfied = Math.round(totalOrders * deliveryRate / 100);
  
  // Transform performanceByDay from array to object
  const performanceByDay: { [key: number]: number } = {};
  if (bigQueryData.performanceByDay) {
    bigQueryData.performanceByDay.forEach((item: any) => {
      performanceByDay[item.day] = item.count;
    });
  }
  
  // Transform performanceByMonth (day of month) from array to object
  const performanceByMonth: { [key: number]: number } = {};
  if (bigQueryData.performanceByMonth) {
    bigQueryData.performanceByMonth.forEach((item: any) => {
      performanceByMonth[item.day] = item.count;
    });
  }
  
  // Transform hourly distribution to ordersByHour
  // BigQuery retorna em UTC, converter para Brasília (UTC-3)
  const ordersByHour: { [key: number]: number } = {};
  if (bigQueryData.hourlyDistribution) {
    bigQueryData.hourlyDistribution.forEach((item: any) => {
      // Converter UTC para Brasília (UTC-3)
      const utcHour = item.hour;
      const brasiliaHour = (utcHour - 3 + 24) % 24; // Subtrai 3 horas e garante 0-23
      ordersByHour[brasiliaHour] = item.count;
    });
  }
  
  // Transform topRegions to array of tuples
  const topRegions: [string, number][] = (bigQueryData.topRegions || []).map((item: any) => 
    [item.region, item.count]
  );
  
  // Transform topMotorcycles to array of tuples
  const topMotorcycles: [string, number][] = (bigQueryData.topMotorcycles || []).map((item: any) => 
    [item.license_plate, item.count]
  );
  
  // Transform topItems to array of tuples
  const topItems: [string, number][] = (bigQueryData.topItems || []).map((item: any) => 
    [item.item, item.count]
  );
  
  // Transform topCustomers to array of tuples
  const topCustomers: [string, number][] = (bigQueryData.topCustomers || []).map((item: any) => 
    [`${item.name} (${item.phone})`, item.count]
  );
  
  // Transform topDeliverymen
  const topDeliverymen = (bigQueryData.topDeliverymen || []).map((item: any) => ({
    name: item.name,
    deliveries: item.deliveries,
    averageRating: item.averageRating || 0,
  }));
  
  // Transform revenueTrend
  const revenueTrend = (bigQueryData.revenueTrend || []).map((item: any) => ({
    date: item.date,
    revenue: item.revenue || 0,
  }));
  
  const result = {
    name: stats.pharmacy_unit_id || 'Unknown',
    totalDeliveries: totalOrders,
    totalRevenue: stats.total_revenue || 0,
    totalDistanceKm: stats.total_distance_meters || 0, // ← In meters, will be converted to km in UI
    totalCancelledOrders: stats.canceled_orders || 0, // ← NEW: From orders WHERE status='Cancelado'
    averageDeliveryTime: stats.avg_delivery_time || 0,
    fastestDelivery: stats.fastest_delivery || 0,
    slowestDelivery: stats.slowest_delivery || 0,
    averageRating: stats.avg_rating || 0,
    totalRatings: totalOrders, // Use total orders as proxy
    ratingDistribution: {},
    recentReviews: [],
    deliverymanStatus: null,
    currentOrderId: null,
    performanceByDay,
    performanceByMonth,
    topItems,
    topCustomers,
    revenueTrend,
    totalDistance: 0, // TODO: Add distance calculation to BigQuery
    topDeliverymen,
    topMotorcycles,
    topRegions,
    deliveryTimeDistribution: {},
    ordersByHour,
    customerSatisfaction: {
      total: totalOrders,
      satisfied: satisfied,
      percentage: deliveryRate,
    },
  };
  
  return result;
};

/**
 * Hook principal - substitui useStatsData
 * 
 * @param type 'deliveryman' ou 'unit'
 * @param ids Array de IDs para buscar
 * @param userRole Role do usuário
 * @param userId ID do usuário atual
 * @param userUnitId ID da unidade do usuário (para managers)
 * @param navigation Navegação para goBack em caso de erro
 * @param dateFilter Filtro de data (opcional)
 */
export const useStatsDataBigQuery = (
  type: 'deliveryman' | 'unit',
  ids: string[],
  userRole: UserRole,
  userId: string | null,
  userUnitId: string | null,
  navigation: any,
  dateFilter?: { startDate: Date; endDate: Date }
) => {
  const [data, setData] = useState<BigQueryStatsData>({
    selectedData: [],
    detailedStats: [],
    overallStats: {
      totalDeliveries: 0,
      totalRevenue: 0,
      averageDeliveryTime: 0,
      averageRating: 0,
      totalDistance: 0,
      customerSatisfaction: {
        total: 0,
        satisfied: 0,
        percentage: 0,
      },
    },
    topMotorcycles: [],
    recentOrders: [],
    allDeliverymenStats: [],
    isLoading: true,
    hasError: false,
    dataVersion: 0, // Initialize version counter
  });
  
  const isFetching = useRef(false);
  const lastFetchKey = useRef<string>('');

  useEffect(() => {
    const fetchData = async () => {
      // Prevent duplicate calls with same parameters
      const fetchKey = `${type}-${ids.join(',')}-${userRole}`;
      if (isFetching.current && lastFetchKey.current === fetchKey) {
        return;
      }
      
      const startTime = Date.now();

      try {
        // Aguardar userRole estar disponível (pode estar carregando)
        if (userRole === null || userRole === undefined) {
          // Marcar como "não está fetchando" para evitar duplicatas
          isFetching.current = false;
          lastFetchKey.current = '';
          // ✅ SÓ atualizar estado se não estiver loading (evita re-renders desnecessários)
          if (!data.isLoading) {
            setData(prev => ({ ...prev, isLoading: true, hasError: false }));
          }
          return;
        }

        if (!ids.length) {
          // Não fazer nada se não houver IDs
          isFetching.current = false;
          lastFetchKey.current = '';
          // ✅ SÓ atualizar estado se ainda estiver loading (evita re-renders desnecessários)
          if (data.isLoading) {
            setData(prev => ({ ...prev, isLoading: false, hasError: false }));
          }
          return;
        }
        
        // Mark as fetching
        isFetching.current = true;
        lastFetchKey.current = fetchKey;

        const auth = getAuth();
        const currentUser = auth.currentUser;
        const idToken = currentUser ? await currentUser.getIdToken() : undefined;

        // Determinar período baseado no dateFilter (mesma lógica do StatsDetailsTab)
        let period = 'month';
        if (dateFilter) {
          const diffDays = Math.ceil(
            (dateFilter.endDate.getTime() - dateFilter.startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          const isFirstDayOfMonth = dateFilter.startDate.getDate() === 1;
          
          if (diffDays <= 1) period = 'today';
          else if (diffDays > 7 || isFirstDayOfMonth) period = 'month';
          else period = 'week';
        }

        // Fetch stats for each ID in parallel
        const apiStartTime = Date.now();
        const statsPromises = ids.map(id =>
          type === 'deliveryman'
            ? fetchDeliverymanStats(id, period, idToken)
            : fetchUnitStats(id, period, idToken)
        );

        const statsResponses = await Promise.all(statsPromises);
        const apiEndTime = Date.now();

        // Transform to legacy format
        const detailedStats = statsResponses.map(response =>
          type === 'deliveryman'
            ? transformDeliverymanToBQ(response)
            : transformUnitStats(response)
        ).filter(Boolean);

        // Calculate overall stats (evitar divisão por zero e -Infinity)
        const validStats = detailedStats.filter(stat => 
          stat && 
          typeof stat.totalDeliveries === 'number' && 
          !isNaN(stat.totalDeliveries)
        );
        
        const statsCount = validStats.length || 1; // Evitar divisão por zero
        
        // Helper para garantir números válidos (sem Infinity, NaN, etc)
        const safeNumber = (value: number, fallback: number = 0): number => {
          if (typeof value !== 'number' || !isFinite(value) || isNaN(value)) {
            return fallback;
          }
          return value;
        };
        
        const overallStats = {
          totalDeliveries: safeNumber(validStats.reduce((sum, stat) => sum + (stat.totalDeliveries || 0), 0)),
          totalRevenue: safeNumber(validStats.reduce((sum, stat) => sum + (stat.totalRevenue || 0), 0)),
          averageDeliveryTime: safeNumber(validStats.reduce((sum, stat) => sum + (stat.averageDeliveryTime || 0), 0) / statsCount),
          averageRating: safeNumber(validStats.reduce((sum, stat) => sum + (stat.averageRating || 0), 0) / statsCount),
          totalDistance: safeNumber(validStats.reduce((sum, stat) => sum + (stat.totalDistance || 0), 0)),
          customerSatisfaction: {
            total: safeNumber(validStats.reduce((sum, stat) => sum + (stat.customerSatisfaction?.total || 0), 0)),
            satisfied: safeNumber(validStats.reduce((sum, stat) => sum + (stat.customerSatisfaction?.satisfied || 0), 0)),
            percentage: safeNumber(validStats.reduce((sum, stat) => sum + (stat.customerSatisfaction?.percentage || 0), 0) / statsCount),
          },
        };

        const totalTime = Date.now() - startTime;
        // Create selectedData with proper format for components
        const selectedData = statsResponses.map((r, i) => ({
          id: ids[i],
          name: r.stats?.pharmacy_unit_id || r.stats?.delivery_man || ids[i],
          status: 'Disponível', // TODO: Get real-time status if needed
          orderId: [], // TODO: Get current orders if needed
          ...r.stats
        }));

        setData({
          selectedData,
          detailedStats,
          overallStats,
          topMotorcycles: [],
          recentOrders: [],
          allDeliverymenStats: [],
          isLoading: false,
          hasError: false,
          dataVersion: Date.now(), // New data version timestamp
        });
        
        isFetching.current = false;

      } catch (error) {
        console.error('❌ [useStatsDataBigQuery] Error:', error);
        
        setData(prev => ({ ...prev, isLoading: false, hasError: true }));
        isFetching.current = false;
        
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar dados do BigQuery';
        Alert.alert('Erro', errorMessage);
        navigation.goBack();
      }
    };

    fetchData();
  }, [type, ids, userRole, userId, userUnitId, navigation, dateFilter]);

  return data;
};

