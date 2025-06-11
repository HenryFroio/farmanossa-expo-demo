// src/utils/statsUtils.ts

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

// Types
export type UserRole = 'admin' | 'manager' | 'deliv' | null;

export interface Customer {
  name: string;
  phoneNumber: string;
}

export interface Deliveryman {
  id: string;
  name: string;
  pharmacyUnitId: string;
  status: string;
  orderId: string | null;
}

export interface PharmacyUnit {
  id: string;
  name: string;
  endereco: string;
  cep: string;
}

export interface StatusHistoryItem {
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

export interface DeliveryRun {
  checkpoints: Array<{
    latitude: number;
    longitude: number;
    timestamp: Date;
  }>;
  deliverymanId: string;
  endTime: Date;
  motorcycleId: string;
  orderIds: string[];
  startTime: Date;
  status: string;
  totalDistance: number;
}

export interface DetailedStats {
  name: string;
  totalDeliveries: number;
  totalRevenue: number;
  averageDeliveryTime: number;
  fastestDelivery: number;
  slowestDelivery: number;
  averageRating: number;
  totalRatings: number;
  ratingDistribution: Record<number, number>;
  recentReviews: Array<{
    comment: string;
    rating: number;
    date: Date;
  }>;
  deliverymanStatus?: string | null;
  currentOrderId?: string | null;
  performanceByDay: Record<number, number>;
  topItems: [string, number][];
  topCustomers: [string, number][];
  revenueTrend: { date: string; revenue: number; }[];
  totalDistance: number;
  topDeliverymen?: { 
    name: string; 
    deliveries: number;
    averageRating: number;
  }[] | null;
  topMotorcycles: [string, number][];
  topRegions?: [string, number][];
  deliveryTimeDistribution: Record<string, number>;
  ordersByHour: Record<number, number>;
  customerSatisfaction: {
    total: number;
    satisfied: number;
    percentage: number;
  };
}

// Helper Functions
const calculateDeliveryTime = (statusHistory: StatusHistoryItem[]): number => {
  const startStatus = statusHistory.find(item => item.status === 'A caminho');
  const endStatus = statusHistory.find(item => item.status === 'Entregue');
  
  if (!startStatus || !endStatus) return 0;
  
  return (endStatus.timestamp.getTime() - startStatus.timestamp.getTime()) / (1000 * 60);
};

const getTimeRange = (minutes: number): string => {
  if (minutes <= 15) return '0-15min';
  if (minutes <= 30) return '15-30min';
  if (minutes <= 45) return '30-45min';
  if (minutes <= 60) return '45-60min';
  return '60min+';
};

const extractRegionFromAddress = (address: string): string | null => {
  try {
    // Procura pelo padrão "BRASILIA - CEP:" e pega a parte antes do "-"
    const parts = address.split(',');
    
    // Procura pela parte que contém "BRASILIA"
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (part.includes('BRASILIA')) {
        // Pega a parte anterior que deve ser a região
        if (i > 0) {
          const regionPart = parts[i - 1].trim();
          // Remove números e caracteres especiais do final, mantendo apenas o nome da região
          const cleanRegion = regionPart.replace(/\s+Nr\.?:?.*$/i, '').trim();
          return cleanRegion || null;
        }
      }
    }
    
    // Método alternativo: procura por padrões comuns de região/bairro
    const addressUpper = address.toUpperCase();
    const regionPatterns = [
      /,\s*([A-Z\s\d]+)\s*,\s*BRASILIA/,
      /,\s*([A-Z\s\d]+)\s*Nr\.?:?/,
      /CASA\s*\d+,\s*([A-Z\s\d]+)/
    ];
    
    for (const pattern of regionPatterns) {
      const match = addressUpper.match(pattern);
      if (match && match[1]) {
        const region = match[1].trim();
        // Filtra regiões muito curtas ou que são apenas números
        if (region.length > 2 && !/^\d+$/.test(region)) {
          return region;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao extrair região do endereço:', error);
    return null;
  }
};

export const calculateDetailedStats = async (
  selectedData: (Deliveryman | PharmacyUnit)[],
  type: 'deliveryman' | 'unit',
  orders: Order[],
  deliverymen: Deliveryman[],
  deliveryRuns: DeliveryRun[],
  userRole: UserRole
): Promise<DetailedStats[]> => {
  const deliveredOrders = orders.filter(order => order.isDelivered);

  const stats = await Promise.all(selectedData.map(async item => {
    const itemId = item.id;
    const itemOrders = deliveredOrders.filter(order => 
      type === 'deliveryman' ? order.deliveryMan === itemId : order.pharmacyUnitId === itemId
    );

    const isDeliveryman = userRole?.toLowerCase() === 'deliv';

    const ordersWithRating = itemOrders.filter(order => order.rating !== undefined);
    const totalRatings = ordersWithRating.length;
    const averageRating = totalRatings > 0 
      ? ordersWithRating.reduce((sum, order) => sum + (order.rating || 0), 0) / totalRatings 
      : 0;

    const ratingDistribution = ordersWithRating.reduce((acc, order) => {
      if (order.rating) {
        acc[order.rating] = (acc[order.rating] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    const recentReviews = itemOrders
      .filter(order => order.reviewComment && order.rating && order.reviewDate)
      .sort((a, b) => (b.reviewDate?.getTime() || 0) - (a.reviewDate?.getTime() || 0))
      .slice(0, 5)
      .map(order => ({
        comment: order.reviewComment || '',
        rating: order.rating || 0,
        date: order.reviewDate || new Date()
      }));

    const customerSatisfaction = {
      total: totalRatings,
      satisfied: ordersWithRating.filter(order => (order.rating || 0) >= 4).length,
      percentage: totalRatings > 0 
        ? (ordersWithRating.filter(order => (order.rating || 0) >= 4).length / totalRatings) * 100 
        : 0
    };

    const deliveryTimes = itemOrders.map(order => calculateDeliveryTime(order.statusHistory));
    const deliveryTimeDistribution = deliveryTimes.reduce((acc, time) => {
      const range = getTimeRange(time);
      acc[range] = (acc[range] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    

    const ordersByHour = itemOrders.reduce((acc, order) => {
      const hour = new Date(order.date).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    let topDeliverymen = null;
    if (type === 'unit' && !isDeliveryman) {
      const deliverymanStats = deliveredOrders
        .filter(order => order.pharmacyUnitId === itemId)
        .reduce((acc, order) => {
          if (order.deliveryMan && order.deliveryManName) {
            if (!acc[order.deliveryMan]) {
              acc[order.deliveryMan] = {
                name: order.deliveryManName,
                deliveries: 0,
                totalRating: 0,
                ratedDeliveries: 0
              };
            }
            acc[order.deliveryMan].deliveries++;
            if (order.rating) {
              acc[order.deliveryMan].totalRating += order.rating;
              acc[order.deliveryMan].ratedDeliveries++;
            }
          }
          return acc;
        }, {} as Record<string, {
          name: string;
          deliveries: number;
          totalRating: number;
          ratedDeliveries: number;
        }>);

      topDeliverymen = Object.values(deliverymanStats)
        .sort((a, b) => b.deliveries - a.deliveries)
        .slice(0, 3)
        .map(stats => ({
          name: stats.name,
          deliveries: stats.deliveries,
          averageRating: stats.ratedDeliveries > 0 
            ? stats.totalRating / stats.ratedDeliveries 
            : 0
        }));
    }

    let deliverymanStatus = null;
    let currentOrderId = null;
    if (type === 'deliveryman') {
      const deliveryman = deliverymen.find(d => d.id === itemId);
      if (deliveryman) {
        deliverymanStatus = deliveryman.status;
        currentOrderId = deliveryman.orderId;
      }
    }

    const performanceByDay = itemOrders.reduce((acc, order) => {
      const day = new Date(order.date).getDay();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const itemFrequency = itemOrders.flatMap(order => order.items).reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topItems = Object.entries(itemFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const customerFrequency = itemOrders.reduce((acc, order) => {
      acc[order.customerName] = (acc[order.customerName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topCustomers = Object.entries(customerFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const last7Days = new Array(7).fill(0).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();
    
    const revenueTrend = isDeliveryman ? [] : last7Days.map(date => {
      const dayRevenue = itemOrders
        .filter(order => order.date.toISOString().startsWith(date))
        .reduce((sum, order) => sum + order.priceNumber, 0);
      return { 
        date, 
        revenue: dayRevenue
      };
    });

    const itemDeliveryRuns = deliveryRuns.filter(run => 
      run.deliverymanId === itemId || run.orderIds.some(id => itemOrders.find(order => order.id === id))
    );

    const totalDistance = itemDeliveryRuns.reduce((sum, run) => sum + run.totalDistance, 0);

    const motorcycleUsage = itemOrders.reduce((acc, order) => {
      if (order.licensePlate) {
        acc[order.licensePlate] = (acc[order.licensePlate] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
      const topMotorcycles = Object.entries(motorcycleUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    // Calculate top regions for unit type only
    let topRegions: [string, number][] = [];
    if (type === 'unit') {
      const regionFrequency = itemOrders.reduce((acc, order) => {
        const region = extractRegionFromAddress(order.address);
        if (region) {
          acc[region] = (acc[region] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      topRegions = Object.entries(regionFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);
    }

    // Filter delivery times to include only those >= 5 minutes
    const validDeliveryTimes = deliveryTimes.filter(time => time >= 5);

    const averageDeliveryTime = validDeliveryTimes.length > 0
      ? validDeliveryTimes.reduce((sum, time) => sum + time, 0) / validDeliveryTimes.length
      : 0;
      
    const fastestDelivery = validDeliveryTimes.length > 0 
      ? Math.min(...validDeliveryTimes)
      : 0;
      
    const slowestDelivery = validDeliveryTimes.length > 0 
      ? Math.max(...validDeliveryTimes)
      : 0;    return {
      name: type === 'deliveryman' ? (item as Deliveryman).name : (item as PharmacyUnit).name,
      totalDeliveries: itemOrders.length,
      totalRevenue: isDeliveryman ? 0 : itemOrders.reduce((sum, order) => sum + order.priceNumber, 0),
      averageDeliveryTime,
      fastestDelivery,
      slowestDelivery,
      averageRating,
      totalRatings,
      ratingDistribution,
      recentReviews,
      deliverymanStatus,
      currentOrderId,
      performanceByDay,
      topItems,
      topCustomers,
      revenueTrend,
      totalDistance,
      topDeliverymen,
      topMotorcycles,
      topRegions: type === 'unit' ? topRegions : undefined,
      deliveryTimeDistribution,
      ordersByHour,
      customerSatisfaction
    };
  }));

  return stats;
};

export const calculateOverallStats = (
  detailedStats: DetailedStats[],
  userRole: UserRole
) => {
  return {
    totalDeliveries: detailedStats.reduce((sum, stat) => sum + stat.totalDeliveries, 0),
    totalRevenue: userRole === 'deliv' ? 0 : 
      detailedStats.reduce((sum, stat) => sum + stat.totalRevenue, 0),
    averageDeliveryTime: detailedStats.reduce((sum, stat) => sum + stat.averageDeliveryTime, 0) / 
      (detailedStats.length || 1),
    averageRating: detailedStats.reduce((sum, stat) => sum + stat.averageRating, 0) / 
      (detailedStats.length || 1),
    totalDistance: detailedStats.reduce((sum, stat) => sum + stat.totalDistance, 0),
    customerSatisfaction: {
      total: detailedStats.reduce((sum, stat) => sum + stat.customerSatisfaction.total, 0),
      satisfied: detailedStats.reduce((sum, stat) => sum + stat.customerSatisfaction.satisfied, 0),
      percentage: detailedStats.reduce((sum, stat) => sum + stat.customerSatisfaction.percentage, 0) /
        (detailedStats.length || 1)
    }
  };
};

export const calculateTopMotorcycles = (
  orders: Order[],
  type: 'deliveryman' | 'unit',
  ids: string[]
): Array<{ plate: string; count: number }> => {
  const motorcycleUsage = orders.reduce((acc, order) => {
    if ((type === 'deliveryman' && ids.includes(order.deliveryMan || '')) ||
        (type === 'unit' && ids.includes(order.pharmacyUnitId))) {
      if (order.licensePlate) {
        acc[order.licensePlate] = (acc[order.licensePlate] || 0) + 1;
      }
    }
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(motorcycleUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([plate, count]) => ({ plate, count }));
};

export const calculatePerformanceMetrics = (
  orders: Order[],type: 'deliveryman' | 'unit',
  id: string
  ) => {
  const relevantOrders = orders.filter(order =>
  type === 'deliveryman' ? order.deliveryMan === id : order.pharmacyUnitId === id
  );
  // Filter delivery times to include only those >= 5 minutes
  const deliveryTimes = relevantOrders
  .map(order => calculateDeliveryTime(order.statusHistory))
  .filter(time => time >= 5);
  const ratings = relevantOrders
  .filter(order => order.rating !== undefined)
  .map(order => order.rating || 0);
  return {
  averageDeliveryTime: deliveryTimes.length > 0
  ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
  : 0,
  deliveryTimeStdDev: deliveryTimes.length > 0
  ? Math.sqrt(
  deliveryTimes.reduce((sum, time) => {
  const avgTime = deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length; // Recalculate average here for accuracy
  const diff = time - avgTime;
  return sum + diff * diff;
  }, 0) / deliveryTimes.length
  )
  : 0,
  averageRating: ratings.length > 0
  ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
  : 0,
  deliveriesPerDay: relevantOrders.length > 0
  ? relevantOrders.length / (
  (new Date().getTime() - Math.min(...relevantOrders.map(o => o.date.getTime()))) /
  (1000 * 60 * 60 * 24)
  )
  : 0,
  onTimeDeliveryRate: deliveryTimes.length > 0
  ? (deliveryTimes.filter(time => time <= 45).length / deliveryTimes.length) * 100
  : 0
  };
  };
  export const calculateTrends = (
  orders: Order[],
  type: 'deliveryman' | 'unit',
  id: string,
  days: number = 30
  ) => {
  const relevantOrders = orders.filter(order =>
  type === 'deliveryman' ? order.deliveryMan === id : order.pharmacyUnitId === id
  );
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const dailyStats = new Array(days).fill(0).map((_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - index);
  const dayOrders = relevantOrders.filter(order =>
  order.date.toDateString() === date.toDateString()
  );
  const dayDeliveryTimes = dayOrders
    .map(order => calculateDeliveryTime(order.statusHistory))
    .filter(time => time >= 5); // Filter times >= 5 minutes here as well
  return {
    date: date.toISOString().split('T')[0],
    deliveries: dayOrders.length,
    revenue: dayOrders.reduce((sum, order) => sum + order.priceNumber, 0),
    averageRating: dayOrders.filter(order => order.rating !== undefined).length > 0
      ? dayOrders.reduce((sum, order) => sum + (order.rating || 0), 0) / 
        dayOrders.filter(order => order.rating !== undefined).length
      : 0,
    averageDeliveryTime: dayDeliveryTimes.length > 0
      ? dayDeliveryTimes.reduce((sum, time) => sum + time, 0) / 
        dayDeliveryTimes.length
      : 0
  };
}).reverse();
return {
deliveryTrend: dailyStats.map(stat => ({
date: stat.date,
value: stat.deliveries
})),
revenueTrend: dailyStats.map(stat => ({
date: stat.date,
value: stat.revenue
})),
ratingTrend: dailyStats.map(stat => ({
date: stat.date,
value: stat.averageRating
})),
deliveryTimeTrend: dailyStats.map(stat => ({
date: stat.date,
value: stat.averageDeliveryTime
}))
};
};
export default {
calculateDetailedStats,
calculateOverallStats,
calculateTopMotorcycles,
calculatePerformanceMetrics,
calculateTrends
};