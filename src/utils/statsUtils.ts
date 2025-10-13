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
  totalDistanceKm: number; // ← NOVO: Total de KMs rodados (da tabela delivery_runs)
  totalCancelledOrders: number; // ← NOVO: Total de pedidos cancelados
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
  performanceByMonth?: Record<number, number>; // Day of month (1-31)
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
    
    // MÉTODO 1: Padrão específico para "| | REGIÃO |" (mais comum nos logs)
    const emptyPipePattern = /\|\s*\|\s*([A-Z\s\d\-\.]+?)\s*\|/gi;
    const emptyPipeMatch = address.match(emptyPipePattern);
    
    if (emptyPipeMatch && emptyPipeMatch.length > 0) {
      for (const match of emptyPipeMatch) {
        const regionMatch = match.match(/\|\s*\|\s*([A-Z\s\d\-\.]+?)\s*\|/i);
        if (regionMatch && regionMatch[1]) {
          const region = regionMatch[1].trim();
          
          // Filtra regiões que são válidas
          if (region.length > 2 && 
              !/^\d+$/.test(region) && 
              !region.toLowerCase().includes('nr') &&
              !region.toLowerCase().includes('cep') &&
              region !== 'DF' &&
              !region.toLowerCase().includes('casa') &&
              !region.toLowerCase().includes('lote') &&
              !region.toLowerCase().includes('cod.') &&
              !region.toLowerCase().includes('cond.') &&
              region.trim() !== '') {
            return region;
          } else {
          }
        }
      }
    }
    
    // MÉTODO 2: Procura por TODOS os padrões "| REGIÃO |" no endereço (original melhorado)
    const pipePattern = /\|\s*([A-Z\s\d\-\.]+?)\s*\|/gi;
    const allMatches = Array.from(address.matchAll(pipePattern));
    
    if (allMatches && allMatches.length > 0) {
      // Procura primeiro por regiões que não são números ou códigos
      for (const match of allMatches) {
        if (match[1]) {
          const region = match[1].trim();
          
          // Filtros mais rigorosos para evitar falsos positivos
          if (region.length > 2 && 
              !/^\d+$/.test(region) && 
              !region.toLowerCase().includes('nr') &&
              !region.toLowerCase().includes('cep') &&
              region !== 'DF' &&
              !region.toLowerCase().includes('casa') &&
              !region.toLowerCase().includes('lote') &&
              !region.toLowerCase().includes('cod.') &&
              !region.toLowerCase().includes('cond.') &&
              !/^[A-Z]\s*$/.test(region) && // Evita letras isoladas
              region.trim() !== '') {
            return region;
          } else {
          }
        }
      }
    } else {
    }
    
    // MÉTODO 3: Procura pelo padrão "BRASILIA - CEP:" e pega a parte antes do "-"
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
          if (cleanRegion && cleanRegion.length > 2) {
            return cleanRegion;
          }
        }
      }
    }
    
    // MÉTODO 4: Procura por padrões mais específicos baseados nos exemplos do log
    const addressUpper = address.toUpperCase();
    
    // Padrões específicos para os casos do log
    const specificPatterns = [
      // Para casos como "| NR.: 0 |, ENTRE LAGOS, BRASILIA"
      /\|\s*NR\.?:?\s*\d*\s*\|\s*,?\s*([A-Z\s\d\-]+?)\s*,\s*BRASILIA/gi,
      // Para casos como "| NR.: 16 |, NOVO HORIZONTE, BRASILIA"
      /\|\s*NR\.?:?\s*\d+\s*\|\s*,?\s*([A-Z\s\d\-]+?)\s*,\s*BRASILIA/gi,
      // Para casos como "ENTRE LAGOS | NR.: 5 | ENTRE LAGOS, PARANOA, BRASILIA"
      /([A-Z\s\d\-]+?)\s*\|\s*NR\.?:?\s*\d+\s*\|\s*[A-Z\s\d\-]+?,\s*([A-Z\s\d\-]+?)\s*,\s*BRASILIA/gi,
      // Para casos com "COND ENTRE LAGOS Q 1 CONJ N CASA 34 | NR.: 0 |, ENTRE LAGOS"
      /COND\s*([A-Z\s\d\-]+?)\s*Q\s*\d+.*?\|\s*NR\.?:?\s*\d*\s*\|\s*,?\s*([A-Z\s\d\-]+)/gi,
    ];
    
    for (const pattern of specificPatterns) {
      const matches = Array.from(addressUpper.matchAll(pattern));
      for (const match of matches) {
        // Tenta pegar qualquer grupo capturado que seja uma região válida
        for (let i = 1; i < match.length; i++) {
          if (match[i]) {
            const region = match[i].trim();
            // Valida se é uma região válida
            if (region.length > 2 && 
                !/^\d+$/.test(region) && 
                !region.includes('CASA') &&
                !region.includes('LOTE') &&
                !region.includes('CONJ') &&
                !region.includes('QD') &&
                !region.includes('ETAPA') &&
                region !== 'DF') {
              return region;
            }
          }
        }
      }
    }

    // MÉTODO 5: Padrões alternativos mais abrangentes
    const regionPatterns = [
      /,\s*([A-Z\s\d]+)\s*,\s*BRASILIA/,
      /,\s*([A-Z\s\d]+)\s*Nr\.?:?/,
      /CASA\s*\d+,\s*([A-Z\s\d]+)/,
      // Novos padrões mais abrangentes
      /,\s*([A-Z\s\d\-]+)\s*,\s*DF/,
      /,\s*([A-Z\s\d\-]+)\s*-\s*BRASILIA/,
      /,\s*([A-Z\s\d\-]+)\s*,\s*CEP/,
      /([A-Z\s\d\-]+)\s*,\s*BRASÍLIA/,
      /([A-Z\s\d\-]+)\s*,\s*BSB/,
      // Padrão para capturar bairro antes de DF
      /,\s*([A-Z\s\d\-]+)\s*,\s*DF\s*,/,
      // Padrão mais genérico para áreas residenciais
      /QN\s*\d+|QS\s*\d+|QR\s*\d+|QI\s*\d+/i,
      // Padrão para cidades satélites
      /(ÁGUAS CLARAS|TAGUATINGA|CEILÂNDIA|GAMA|PLANALTINA|SOBRADINHO|BRAZLÂNDIA|RIACHO FUNDO|SAMAMBAIA|SANTA MARIA|SÃO SEBASTIÃO|RECANTO DAS EMAS|CRUZEIRO|LAGO SUL|LAGO NORTE|JARDIM BOTÂNICO|VICENTE PIRES|PARK WAY|CANDANGOLÂNDIA|NÚCLEO BANDEIRANTE|GUARÁ|ESTRUTURAL|ITAPOÃ|VARJÃO|FERCAL|SIA|SCIA|OCTOGONAL|PARANOA|PARANOÁ)/i
    ];
    
    for (const pattern of regionPatterns) {
      const match = addressUpper.match(pattern);
      if (match && match[1]) {
        const region = match[1].trim();
        // Filtra regiões muito curtas ou que são apenas números
        if (region.length > 2 && !/^\d+$/.test(region)) {
          return region;
        }
      } else if (match && match[0] && pattern.toString().includes('QN|QS|QR|QI')) {
        // Para padrões de quadras (QN, QS, etc), retorna o match completo
        const region = match[0].trim();
        return region;
      } else if (match && match[0] && pattern.toString().includes('ÁGUAS CLARAS')) {
        // Para cidades satélites
        const region = match[0].trim();
        return region;
      }
    }
    
    // MÉTODO 6: Fallback mais inteligente baseado nos padrões observados
    
    // Fallback 1: Procura por texto que aparece após pipes e antes de cidade
    const fallbackPattern1 = /\|\s*[^|]*?\|\s*[^|]*?\|\s*([A-Z\s\d\-]+?)\s*\|\s*BRASILIA/gi;
    const fallbackMatch1 = addressUpper.match(fallbackPattern1);
    if (fallbackMatch1) {
      const match = fallbackMatch1[0].match(/\|\s*[^|]*?\|\s*[^|]*?\|\s*([A-Z\s\d\-]+?)\s*\|\s*BRASILIA/i);
      if (match && match[1]) {
        const region = match[1].trim();
        if (region.length > 2 && 
            !/^\d+$/.test(region) && 
            !region.includes('CEP') && 
            !region.includes('COD.') &&
            !region.includes('COND.')) {
          return region;
        }
      }
    }
    
    // Fallback 2: Procura por conjuntos, quadras ou etapas que podem indicar região
    const fallbackPatterns = [
      // Captura texto após CONJ, CONJUNTO
      /CONJ(?:UNTO)?\s+([A-Z\s\d\-]+?)(?=\s*,|\s*\||CASA|LOTE|\s*$)/gi,
      // Captura texto entre vírgulas que contenha pelo menos 3 caracteres
      /,\s*([A-Z\s\d\-]{3,}?)(?=\s*,|\s*-|\s*CEP|\s*DF|\s*BRASILIA)/gi,
      // Captura texto após número da casa/apartamento
      /\d+\s*[,-]\s*([A-Z\s\d\-]{3,}?)(?=\s*,|\s*-|\s*CEP|\s*DF|\s*BRASILIA)/gi,
      // Captura nomes de bairros conhecidos no meio do endereço
      /(ENTRE\s+LAGOS?|LA\s+FONT|NOVO\s+HORIZONTE|SOBRADINHO|PARANOA|PARANOÁ)(?!\s*\|)/gi
    ];
    
    for (const pattern of fallbackPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(addressUpper)) !== null) {
        if (match[1] || match[0]) {
          const region = (match[1] || match[0]).trim();
          // Filtra regiões que são válidas
          if (region.length > 2 && 
              !/^\d+$/.test(region) && 
              !region.includes('CEP') && 
              !region.includes('BRASILIA') && 
              !region.includes('DF') &&
              !region.includes('APARTAMENTO') &&
              !region.includes('BLOCO') &&
              !region.includes('CASA') &&
              !region.includes('LOTE') &&
              !region.includes('ETAPA') &&
              !region.includes('QD ') &&
              !region.includes('NR.') &&
              !region.includes('COD.') &&
              !region.includes('COND.')) {
            return region;
          }
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
  userRole: UserRole,
  ratingsOrders?: Order[] // Novo parâmetro opcional para pedidos com ratings
): Promise<DetailedStats[]> => {
  const totalStartTime = Date.now();
  
  
  const filterStartTime = Date.now();
  // Note: orders already come filtered as delivered from the query
  const deliveredOrders = orders;

  const itemsProcessingStartTime = Date.now();
  
  const stats = await Promise.all(selectedData.map(async (item, index) => {
    const itemStartTime = Date.now();
    
    const itemId = item.id;
    
    const itemOrdersStartTime = Date.now();
    const itemOrders = deliveredOrders.filter(order => 
      type === 'deliveryman' ? order.deliveryMan === itemId : order.pharmacyUnitId === itemId
    );

    const isDeliveryman = userRole?.toLowerCase() === 'deliv';

    const ratingsStartTime = Date.now();
    
    // Usar ratingsOrders se disponível, senão usar itemOrders filtrados
    const ordersWithRating = ratingsOrders ? 
      ratingsOrders.filter(order => 
        type === 'deliveryman' ? order.deliveryMan === itemId : order.pharmacyUnitId === itemId
      ) : 
      itemOrders.filter(order => order.rating !== undefined && order.rating !== null);
    
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

    const recentReviews = ordersWithRating
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

    const deliveryTimesStartTime = Date.now();
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

    const deliverymenStatsStartTime = Date.now();
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
        .map(stats => ({
          name: stats.name,
          deliveries: stats.deliveries,
          averageRating: stats.ratedDeliveries > 0 
            ? stats.totalRating / stats.ratedDeliveries 
            : 0
        }));
    }

    const statusStartTime = Date.now();
    let deliverymanStatus = null;
    let currentOrderId = null;
    if (type === 'deliveryman') {
      const deliveryman = deliverymen.find(d => d.id === itemId);
      if (deliveryman) {
        deliverymanStatus = deliveryman.status;
        currentOrderId = deliveryman.orderId;
      }
    }

    const performanceStartTime = Date.now();
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
      .sort(([, a], [, b]) => b - a);

    const customerFrequency = itemOrders.reduce((acc, order) => {
      acc[order.customerName] = (acc[order.customerName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topCustomers = Object.entries(customerFrequency)
      .sort(([, a], [, b]) => b - a);

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

    const motorcycleStartTime = Date.now();
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
      .sort(([, a], [, b]) => b - a);

    // Calculate top regions for unit type only
    const regionsStartTime = Date.now();
    let topRegions: [string, number][] = [];
    if (type === 'unit') {
      
      const regionFrequency = itemOrders.reduce((acc, order, index) => {
        const region = extractRegionFromAddress(order.address);
        if (region) {
          acc[region] = (acc[region] || 0) + 1;
        } else {
        }
        return acc;
      }, {} as Record<string, number>);
      
      
      topRegions = Object.entries(regionFrequency)
        .sort(([, a], [, b]) => b - a);
    }

    // Filter delivery times to include only those >= 5 minutes
    const finalTimingStartTime = Date.now();
    const validDeliveryTimes = deliveryTimes.filter(time => time >= 5);

    const averageDeliveryTime = validDeliveryTimes.length > 0
      ? validDeliveryTimes.reduce((sum, time) => sum + time, 0) / validDeliveryTimes.length
      : 0;
      
    const fastestDelivery = validDeliveryTimes.length > 0 
      ? Math.min(...validDeliveryTimes)
      : 0;
      
    const slowestDelivery = validDeliveryTimes.length > 0 
      ? Math.max(...validDeliveryTimes)
      : 0;


    return {
      name: type === 'deliveryman' ? (item as Deliveryman).name : (item as PharmacyUnit).name,
      totalDeliveries: itemOrders.length,
      totalRevenue: isDeliveryman ? 0 : itemOrders.reduce((sum, order) => sum + order.priceNumber, 0),
      totalDistanceKm: 0, // ← Será populado pelo BigQuery
      totalCancelledOrders: 0, // ← Será populado pelo BigQuery
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
  const startTime = Date.now();
  
  
  const result = {
    totalDeliveries: detailedStats.reduce((sum, stat) => sum + stat.totalDeliveries, 0),
    totalRevenue: userRole === 'deliv' ? 0 : 
      detailedStats.reduce((sum, stat) => sum + stat.totalRevenue, 0),
    totalDistanceKm: detailedStats.reduce((sum, stat) => sum + stat.totalDistanceKm, 0),
    totalCancelledOrders: detailedStats.reduce((sum, stat) => sum + stat.totalCancelledOrders, 0),
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
  
  
  return result;
};

export const calculateTopMotorcycles = (
  orders: Order[],
  type: 'deliveryman' | 'unit',
  ids: string[]
): Array<{ plate: string; count: number }> => {
  const startTime = Date.now();
  
  
  const motorcycleUsage = orders.reduce((acc, order) => {
    if ((type === 'deliveryman' && ids.includes(order.deliveryMan || '')) ||
        (type === 'unit' && ids.includes(order.pharmacyUnitId))) {
      if (order.licensePlate) {
        acc[order.licensePlate] = (acc[order.licensePlate] || 0) + 1;
      }
    }
    return acc;
  }, {} as Record<string, number>);

  const result = Object.entries(motorcycleUsage)
    .sort(([, a], [, b]) => b - a)
    .map(([plate, count]) => ({ plate, count }));
    
  
  return result;
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

export const getAllDeliverymenStats = (
  orders: Order[],
  unitId: string
): Array<{ name: string; deliveries: number; averageRating: number; id: string }> => {
  const startTime = Date.now();
  
  const filterStartTime = Date.now();
  // Note: orders already come filtered as delivered from the query, just filter by unit
  const deliveredOrders = orders.filter(order => order.pharmacyUnitId === unitId);

  const statsStartTime = Date.now();
  const deliverymanStats = deliveredOrders.reduce((acc, order) => {
    if (order.deliveryMan && order.deliveryManName) {
      if (!acc[order.deliveryMan]) {
        acc[order.deliveryMan] = {
          id: order.deliveryMan,
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
    id: string;
    name: string;
    deliveries: number;
    totalRating: number;
    ratedDeliveries: number;
  }>);

  const result = Object.values(deliverymanStats)
    .sort((a, b) => b.deliveries - a.deliveries)
    .map(stats => ({
      id: stats.id,
      name: stats.name,
      deliveries: stats.deliveries,
      averageRating: stats.ratedDeliveries > 0 
        ? stats.totalRating / stats.ratedDeliveries 
        : 0
    }));

  
  return result;
};

export default {
calculateDetailedStats,
calculateOverallStats,
calculateTopMotorcycles,
calculatePerformanceMetrics,
calculateTrends,
getAllDeliverymenStats
};