import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, Modal, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BarChart, LineChart } from 'react-native-chart-kit';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import BottomSheet from '@gorhom/bottom-sheet';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DateFilterPicker, DateFilterType } from './DateFilterPicker';
import { AllDeliverymenModal } from './AllDeliverymenModal';
import { CancelledOrdersModal } from './CancelledOrdersModal';
import MetricSkeleton from './MetricSkeleton';
import styles from '../styles/statsScreenStyles';
import { DetailedStats } from '../utils/statsUtils';
import { Order } from '../types/statsTypes';
import { fetchWithCache } from '../utils/bigQueryCache';

interface StatsDetailsTabProps {
  detailedStats: DetailedStats[];
  type: 'unit' | 'deliveryman';
  userRole?: string;
  allDeliverymenStats?: Array<{ name: string; deliveries: number; averageRating: number; id: string }>;
  onNavigateToDeliveryman?: (deliverymanId: string) => void;
  onDateFilterChange?: (start: Date, end: Date) => void;
  currentDateFilter?: {
    startDate: Date;
    endDate: Date;
  };
  bottomSheetRef?: React.RefObject<BottomSheet>;
  setSelectedOrder?: (order: Order) => void;
  ids?: string[];
}

type ExportPeriod = 'daily' | 'weekly' | 'monthly';

// Helper para garantir números válidos (sem Infinity, NaN, etc)
const safeNumber = (value: number, fallback: number = 0): number => {
  if (typeof value !== 'number' || !isFinite(value) || isNaN(value)) {
    return fallback;
  }
  return value;
};

// Helper para determinar o período baseado no dateFilter
const getPeriodType = (dateFilter?: { startDate: Date; endDate: Date }): 'today' | 'week' | 'month' => {
  if (!dateFilter) return 'week';
  
  const diffDays = Math.ceil(
    (dateFilter.endDate.getTime() - dateFilter.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Verificar se é o primeiro dia do mês (indicador de período mensal)
  const isFirstDayOfMonth = dateFilter.startDate.getDate() === 1;
  
  if (diffDays <= 1) return 'today';
  if (diffDays > 7 || isFirstDayOfMonth) return 'month'; // Se > 7 dias OU começar no dia 1, é mês
  return 'week';
};

export const StatsDetailsTab: React.FC<StatsDetailsTabProps> = ({
  detailedStats,
  type,
  userRole,
  allDeliverymenStats = [],
  onNavigateToDeliveryman,
  onDateFilterChange,
  currentDateFilter,
  bottomSheetRef,
  setSelectedOrder,
  ids = []
}) => {
  const [selectedFilter, setSelectedFilter] = useState<DateFilterType>('daily');
  const [isExporting, setIsExporting] = useState(false);
  const [combinedStats, setCombinedStats] = useState<DetailedStats | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCancelledOrdersModalVisible, setIsCancelledOrdersModalVisible] = useState(false);
  const [cancelledOrders, setCancelledOrders] = useState<any[]>([]);
  const [isLoadingCancelledOrders, setIsLoadingCancelledOrders] = useState(false);
  const [isWaitingForData, setIsWaitingForData] = useState(false); // Track user action
  const prevStatsRef = useRef<DetailedStats | null>(null);
  const isInitialLoadRef = useRef(true);
  const latestDataHashRef = useRef<string>(''); // Track data identity
  const processingDataHashRef = useRef<string>(''); // Track what we're processing

  const defaultDateFilter = {
    startDate: new Date(),
    endDate: new Date()
  };

  // Generate hash from detailed stats to track changes
  const generateDataHash = (stats: any[] | null): string => {
    if (!stats || stats.length === 0) return '';
    return stats.map(s => `${s.totalDeliveries}-${s.totalRevenue}`).join('|');
  };

  // Compute if data is being processed (loading state)
  const isProcessing = useMemo(() => {
    // If user triggered a change but new data hasn't arrived yet
    if (isWaitingForData) return true;
    
    const currentHash = generateDataHash(detailedStats);
    const hasData = detailedStats && detailedStats.length > 0;
    const isProcessed = combinedStats !== null;
    const hashesMatch = currentHash === latestDataHashRef.current;
    
    // Loading if we have data but it hasn't been processed yet
    return hasData && (!isProcessed || !hashesMatch);
  }, [detailedStats, combinedStats, isWaitingForData]);

  useEffect(() => {
    const combineStartTime = Date.now();
    
    // Generate hash for incoming data
    const incomingHash = generateDataHash(detailedStats);
    
    if (detailedStats && detailedStats.length > 0 && incomingHash !== processingDataHashRef.current) {
      processingDataHashRef.current = incomingHash;
      const combined = detailedStats.reduce((acc, curr) => {
        // Helper local para calcular fastest delivery de forma segura
        const calculateFastest = () => {
          const accFastest = safeNumber(acc.fastestDelivery || 0);
          const currFastest = safeNumber(curr.fastestDelivery || 0);
          
          // Se ambos são 0, retorna 0
          if (accFastest === 0 && currFastest === 0) return 0;
          // Se acc é 0, retorna curr
          if (accFastest === 0) return currFastest;
          // Se curr é 0, retorna acc
          if (currFastest === 0) return accFastest;
          // Retorna o menor válido
          return Math.min(accFastest, currFastest);
        };
        
        return {
          name: 'Estatísticas Combinadas',
          totalDeliveries: safeNumber((acc.totalDeliveries || 0) + curr.totalDeliveries),
          totalRevenue: safeNumber((acc.totalRevenue || 0) + curr.totalRevenue),
          totalDistanceKm: safeNumber((acc.totalDistanceKm || 0) + curr.totalDistanceKm), // ← NEW
          totalCancelledOrders: safeNumber((acc.totalCancelledOrders || 0) + curr.totalCancelledOrders), // ← NEW
          averageDeliveryTime: safeNumber((acc.averageDeliveryTime || 0) + curr.averageDeliveryTime / detailedStats.length),
          fastestDelivery: calculateFastest(),
          slowestDelivery: safeNumber(Math.max(acc.slowestDelivery || 0, curr.slowestDelivery || 0)),
          averageRating: 0,
          totalRatings: safeNumber((acc.totalRatings || 0) + curr.totalRatings),
          ratingDistribution: {},
          recentReviews: [],
          performanceByDay: Object.entries(curr.performanceByDay).reduce((dayAcc, [day, count]) => ({
            ...dayAcc,
            [parseInt(day)]: safeNumber((dayAcc[parseInt(day)] || 0) + count)
          }), acc.performanceByDay || {}),
          topItems: mergeAndSortArrays(acc.topItems || [], curr.topItems || []),
          topCustomers: mergeAndSortArrays(acc.topCustomers || [], curr.topCustomers || []),
          revenueTrend: acc.revenueTrend ? acc.revenueTrend.map((item: any, index: number) => ({
            date: item.date,
            revenue: safeNumber(item.revenue + (curr.revenueTrend[index]?.revenue || 0))
          })) : (curr.revenueTrend || []).map((item: any) => ({
            date: item.date,
            revenue: safeNumber(item.revenue || 0)
          })),
          totalDistance: safeNumber((acc.totalDistance || 0) + curr.totalDistance),
          topDeliverymen: mergeAndSortDeliverymen(acc.topDeliverymen || [], curr.topDeliverymen || []),
          topMotorcycles: mergeAndSortArrays(acc.topMotorcycles || [], curr.topMotorcycles || []),
          topRegions: type === 'unit' ? mergeAndSortArrays(acc.topRegions || [], curr.topRegions || []) : undefined,
          deliveryTimeDistribution: {},
          ordersByHour: Object.entries(curr.ordersByHour || {}).reduce((hourAcc, [hour, count]) => ({
            ...hourAcc,
            [parseInt(hour)]: safeNumber((hourAcc[parseInt(hour)] || 0) + (count as number))
          }), acc.ordersByHour || {}),
          performanceByMonth: Object.entries(curr.performanceByMonth || {}).reduce((monthAcc, [day, count]) => ({
            ...monthAcc,
            [parseInt(day)]: safeNumber((monthAcc[parseInt(day)] || 0) + (count as number))
          }), acc.performanceByMonth || {}),
          customerSatisfaction: {
            total: 0,
            satisfied: 0,
            percentage: 0
          }
        };
      }, {} as DetailedStats);

      const combineEndTime = Date.now();

      // Verificar se os dados realmente mudaram
      const hasDataChanged = !prevStatsRef.current || 
        prevStatsRef.current.totalDeliveries !== combined.totalDeliveries ||
        prevStatsRef.current.totalRevenue !== combined.totalRevenue;

      if (hasDataChanged || isInitialLoadRef.current) {
        setCombinedStats(combined);
        prevStatsRef.current = combined;
        isInitialLoadRef.current = false;
        
        // Mark data as processed
        latestDataHashRef.current = incomingHash;
        
        // Turn off waiting state when new data arrives
        setIsWaitingForData(false);
      }
    }
  }, [detailedStats, type]);

  // Função para buscar pedidos cancelados com cache
  const fetchCancelledOrders = async (unitId: string, period: string) => {
    setIsLoadingCancelledOrders(true);
    try {
      const data = await fetchWithCache(
        `unit/${unitId}/cancelled-orders`,
        { period },
        async () => {
          const response = await fetch(
            `https://us-central1-farmanossadelivery-76182.cloudfunctions.net/bigqueryApi/unit/${unitId}/cancelled-orders?period=${period}`
          );
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          return response.json();
        }
      );
      setCancelledOrders(data.orders || []);
    } catch (error) {
      console.error('Erro ao buscar pedidos cancelados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os pedidos cancelados');
    } finally {
      setIsLoadingCancelledOrders(false);
    }
  };

  // Função para abrir detalhes de um pedido cancelado
  const handleOrderPress = async (orderId: string) => {
    if (!bottomSheetRef || !setSelectedOrder) return;

    try {
      // Buscar dados completos do pedido no Firestore
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        
        // Converter timestamp para Date
        const createdDate = orderData.created_at?.toDate?.() || new Date();
        const updatedDate = orderData.updated_at?.toDate?.() || createdDate;
        
        const order: Order = {
          id: orderSnap.id,
          number: orderData.number || orderSnap.id,
          status: orderData.status || 'Cancelado',
          date: createdDate,
          createdAt: createdDate,
          updatedAt: updatedDate,
          lastStatusUpdate: updatedDate,
          price: orderData.total?.toString() || '0',
          priceNumber: orderData.total || 0,
          items: orderData.items || [],
          itemCount: orderData.items?.length || 0,
          deliveryManName: orderData.delivery_man_name,
          licensePlate: orderData.license_plate,
          deliveryMan: orderData.delivery_man,
          rating: orderData.rating,
          reviewComment: orderData.review_comment,
          address: orderData.address || '',
          customerName: orderData.customer_name || '',
          customerPhone: orderData.customer_phone || '',
          pharmacyUnitId: orderData.pharmacy_unit_id || '',
          location: orderData.location || null,
          isDelivered: orderData.status === 'Entregue',
          isInDelivery: orderData.status === 'A caminho',
          isInPreparation: orderData.status === 'Em Preparação',
          isPending: orderData.status === 'Pendente',
          statusHistory: orderData.status_history || []
        };
        
        setSelectedOrder(order);
        bottomSheetRef.current?.snapToIndex(0);
      } else {
        Alert.alert('Erro', 'Pedido não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do pedido:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do pedido');
    }
  };

  const mergeAndSortArrays = (arr1: [string, number][], arr2: [string, number][], limit?: number): [string, number][] => {
    const merged = new Map<string, number>();
    
    [...arr1, ...arr2].forEach(([key, value]) => {
      merged.set(key, (merged.get(key) || 0) + value);
    });

    const sorted = Array.from(merged.entries())
      .sort(([, a], [, b]) => b - a);
    
    return limit ? sorted.slice(0, limit) : sorted;
  };

  const mergeAndSortDeliverymen = (
    arr1: Array<{ name: string; deliveries: number; averageRating: number }>,
    arr2: Array<{ name: string; deliveries: number; averageRating: number }>,
    limit?: number
  ) => {
    const merged = new Map<string, { deliveries: number; ratings: number; count: number }>();
    
    [...arr1, ...arr2].forEach(({ name, deliveries, averageRating }) => {
      const current = merged.get(name) || { deliveries: 0, ratings: 0, count: 0 };
      merged.set(name, {
        deliveries: current.deliveries + deliveries,
        ratings: current.ratings + (averageRating * deliveries),
        count: current.count + deliveries
      });
    });

    const sorted = Array.from(merged.entries())
      .map(([name, { deliveries, ratings, count }]) => ({
        name,
        deliveries,
        averageRating: ratings / count
      }))
      .sort((a, b) => b.deliveries - a.deliveries);
    
    return limit ? sorted.slice(0, limit) : sorted;
  };

  // Helper: Filtra labels para legibilidade mantendo todos os dados
  const filterLabelsForReadability = (labels: string[], data: number[]) => {
    const count = labels.length;
    
    // Se tem poucos itens, mostrar todos
    if (count <= 7) {
      return { labels, data };
    }
    
    // Para muitos itens, criar labels vazios nos índices que não queremos mostrar
    const filteredLabels = labels.map((label, i) => {
      // SEMPRE mostrar primeiro e último
      if (i === 0 || i === count - 1) return label;
      
      if (count <= 12) {
        // 8-12 itens: mostrar a cada 2 (0, 2, 4, 6, 8, 10, último)
        return i % 2 === 0 ? label : '';
      } else if (count <= 20) {
        // 13-20 itens: mostrar a cada 3 (0, 3, 6, 9, 12, 15, 18, último)
        return i % 3 === 0 ? label : '';
      } else if (count <= 31) {
        // 21-31 itens (mês): mostrar a cada 5 (0, 5, 10, 15, 20, 25, 30, último)
        return i % 5 === 0 ? label : '';
      } else {
        // 32+ itens: mostrar a cada 6
        return i % 6 === 0 ? label : '';
      }
    });
    
    return { labels: filteredLabels, data };
  };

  // Gera dados do chart de desempenho baseado no período
  const getPerformanceChartData = () => {
    if (!combinedStats) return { labels: [], data: [], title: '' };
    
    const period = getPeriodType(currentDateFilter);
    const now = new Date();
    
    // Calcular hora de Brasília (UTC-3)
    const brasiliaOffset = -3;
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brasiliaTime = new Date(utcTime + (brasiliaOffset * 3600000));
    
    
    switch (period) {
      case 'today':
        // Por hora - Horário de funcionamento: 7h-1h (7-23h + 0h-1h)
        const workingHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1];
        const currentHour = brasiliaTime.getHours();
        
                    
        // Filtrar apenas até a hora atual
        const availableHours = workingHours.filter(h => {
          // Se a hora é 0 ou 1 (madrugada), só mostrar se já passou da meia-noite
          if (h === 0 || h === 1) return currentHour >= 0 && currentHour < 7;
          return h <= currentHour;
        });
        
            
        const hourLabels = availableHours.map(h => `${h}h`);
        const hourData = availableHours.map(hour => 
          safeNumber(combinedStats.ordersByHour?.[hour] || 0, 0)
        );
        
                    
        const filteredHourly = filterLabelsForReadability(hourLabels, hourData);
        
        return {
          labels: filteredHourly.labels,
          data: filteredHourly.data,
          title: 'Desempenho por Hora do Dia (7h-1h)',
          fullLabels: hourLabels
        };
        
      case 'week':
        // Por dia da semana (Dom-Sáb)
        const currentDayOfWeek = brasiliaTime.getDay(); // 0 = Domingo, 6 = Sábado
        const availableDays = [0, 1, 2, 3, 4, 5, 6].filter(day => day <= currentDayOfWeek);
        const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const availableWeekDays = availableDays.map(day => weekDays[day]);
        
        const weekData = availableDays.map(day => 
          safeNumber(combinedStats.performanceByDay?.[day] || 0, 0)
        );
        
        return {
          labels: availableWeekDays,
          data: weekData,
          title: 'Desempenho por Dia da Semana'
        };
        
      case 'month':
        // Por dia do mês (1-31) - mostrar apenas até o dia atual
        const currentDayOfMonth = brasiliaTime.getDate(); // 1-31
        const daysInMonth = currentDayOfMonth;
        
                
        const monthLabels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
        const monthData = Array.from({ length: daysInMonth }, (_, day) => {
          const dayNum = day + 1;
          const value = safeNumber(combinedStats.performanceByMonth?.[dayNum] || 0, 0);
                return value;
        });
        
        // Filtrar labels para legibilidade mantendo todos os dados
        const filteredMonthly = filterLabelsForReadability(monthLabels, monthData);
        
        return {
          labels: filteredMonthly.labels,
          data: filteredMonthly.data,
          title: 'Desempenho por Dia do Mês',
          fullLabels: monthLabels
        };
        
      default:
        return {
          labels: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
          data: [0, 1, 2, 3, 4, 5, 6].map(day => 
            safeNumber(combinedStats.performanceByDay?.[day] || 0, 0)
          ),
          title: 'Desempenho por Dia da Semana'
        };
    }
  };

  const getRevenueTrendChartData = () => {
    if (!combinedStats) return { labels: [], data: [], title: '' };
    
    const period = getPeriodType(currentDateFilter);
    const now = new Date();
    
    // Calcular hora de Brasília (UTC-3)
    const brasiliaOffset = -3;
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brasiliaTime = new Date(utcTime + (brasiliaOffset * 3600000));
    
    switch (period) {
      case 'today':
        // Por hora - Horário de funcionamento: 7h-1h (7-23h + 0h-1h)
        const workingHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1];
        const currentHour = brasiliaTime.getHours();
        
        // Filtrar apenas até a hora atual
        const availableHours = workingHours.filter(h => {
          // Se a hora é 0 ou 1 (madrugada), só mostrar se já passou da meia-noite
          if (h === 0 || h === 1) return currentHour >= 0 && currentHour < 7;
          return h <= currentHour;
        });
        
        const hourLabels = availableHours.map(h => `${h}h`);
        
        // Calcular receita por hora (se temos ordersByHour, podemos estimar)
        // Usando média de receita por pedido
        const avgRevenuePerOrder = combinedStats.totalDeliveries > 0 
          ? combinedStats.totalRevenue / combinedStats.totalDeliveries 
          : 0;
        
        const hourRevenueData = availableHours.map(hour => {
          const ordersInHour = safeNumber(combinedStats.ordersByHour?.[hour] || 0, 0);
          return safeNumber(ordersInHour * avgRevenuePerOrder, 0);
        });
        
                        
        const filteredRevHourly = filterLabelsForReadability(hourLabels, hourRevenueData);
        
        return {
          labels: filteredRevHourly.labels,
          data: filteredRevHourly.data,
          title: 'Tendência de Receita por Hora (7h-1h)',
          fullLabels: hourLabels
        };
        
      case 'week':
        // Por dia da semana (Dom-Sáb)
        const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const currentDayOfWeek = brasiliaTime.getDay(); // 0 = Domingo, 6 = Sábado
        
        // Filtrar apenas até o dia atual da semana
        const availableDays = [0, 1, 2, 3, 4, 5, 6].filter(day => day <= currentDayOfWeek);
        const availableWeekDays = availableDays.map(day => weekDays[day]);
        
        // Se temos revenueTrend dos últimos 7 dias, usar ele
        if (combinedStats.revenueTrend && combinedStats.revenueTrend.length > 0) {
          const weekRevenueData = availableDays.map(day => {
            const trendItem = combinedStats.revenueTrend[day];
            return safeNumber(trendItem?.revenue || 0, 0);
          });
          
          return {
            labels: availableWeekDays,
            data: weekRevenueData,
            title: 'Tendência de Receita - Semana Atual'
          };
        }
        
        // Fallback: estimar por performanceByDay
        const avgRevenuePerOrderWeek = combinedStats.totalDeliveries > 0 
          ? combinedStats.totalRevenue / combinedStats.totalDeliveries 
          : 0;
        
        const weekRevenueData = availableDays.map(day => {
          const ordersInDay = safeNumber(combinedStats.performanceByDay?.[day] || 0, 0);
          return safeNumber(ordersInDay * avgRevenuePerOrderWeek, 0);
        });
        
        return {
          labels: availableWeekDays,
          data: weekRevenueData,
          title: 'Tendência de Receita - Semana Atual'
        };
        
      case 'month':
        // Por dia do mês (1-31) - mostrar apenas até o dia atual
        const currentDayOfMonth = brasiliaTime.getDate(); // 1-31
        const daysInMonth = currentDayOfMonth; // Limitar ao dia atual
        const monthLabels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
        
        // Se temos revenueTrend do mês, usar ele
        if (combinedStats.revenueTrend && combinedStats.revenueTrend.length > 0) {
          // revenueTrend vem com datas, mapear para dias do mês
          const revenueByDay: { [key: number]: number } = {};
          combinedStats.revenueTrend.forEach((item: any) => {
            const day = parseInt(item.date.split('-')[2], 10);
            // Só adicionar se for até o dia atual
            if (day <= currentDayOfMonth) {
              revenueByDay[day] = safeNumber(item.revenue, 0);
            }
          });
          
          const monthRevenueData = Array.from({ length: daysInMonth }, (_, i) => 
            safeNumber(revenueByDay[i + 1] || 0, 0)
          );
          
          // Filtrar labels para legibilidade mantendo todos os dados
          const filteredRevMonthly1 = filterLabelsForReadability(monthLabels, monthRevenueData);
          
          return {
            labels: filteredRevMonthly1.labels,
            data: filteredRevMonthly1.data,
            title: 'Tendência de Receita - Mês Atual',
            fullLabels: monthLabels
          };
        }
        
        // Fallback: estimar por performanceByMonth
        const avgRevenuePerOrderMonth = combinedStats.totalDeliveries > 0 
          ? combinedStats.totalRevenue / combinedStats.totalDeliveries 
          : 0;
        
        const monthRevenueData = Array.from({ length: daysInMonth }, (_, day) => {
          const ordersInDay = safeNumber(combinedStats.performanceByMonth?.[day + 1] || 0, 0);
          return safeNumber(ordersInDay * avgRevenuePerOrderMonth, 0);
        });
        
        // Filtrar labels para legibilidade mantendo todos os dados
        const filteredRevMonthly2 = filterLabelsForReadability(monthLabels, monthRevenueData);
        
        return {
          labels: filteredRevMonthly2.labels,
          data: filteredRevMonthly2.data,
          title: 'Tendência de Receita - Mês Atual',
          fullLabels: monthLabels
        };
        
      default:
        // Fallback: usar revenueTrend original (últimos 7 dias)
        if (combinedStats.revenueTrend && combinedStats.revenueTrend.length > 0) {
          return {
            labels: combinedStats.revenueTrend.map(d => d.date.split('-')[2]),
            data: combinedStats.revenueTrend.map(d => safeNumber(d.revenue, 0)),
            title: 'Tendência de Receita (Últimos 7 dias)'
          };
        }
        
        return {
          labels: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
          data: [0, 0, 0, 0, 0, 0, 0],
          title: 'Tendência de Receita'
        };
    }
  };

  const handleFilterChange = (filter: DateFilterType) => {
    setSelectedFilter(filter);
    setIsWaitingForData(true); // ← Start loading immediately
    
    // Calcular as datas corretas baseado no filtro selecionado
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (filter) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = now;
    }

    // Atualizar o filtro de data no componente pai
    onDateFilterChange?.(startDate, endDate);
  };

  const handleDateChange = (start: Date, end: Date) => {
    setIsWaitingForData(true); // ← Start loading immediately
    onDateFilterChange?.(start, end);
    // O loading será removido quando os novos dados chegarem
  };

  // Função para gerar mensagem contextual baseada no período
  const getLoadingMessage = (filter: DateFilterType) => {
    switch (filter) {
      case 'weekly':
        return 'Carregando estatísticas...\nPode demorar um pouco mais...';
      case 'monthly':
        return 'Carregando estatísticas...\nPode demorar cerca de um minuto ou mais...';
      default:
        return 'Carregando estatísticas...';
    }
  };

  // Função para obter dados para o período específico
  const getDataForPeriod = (period: ExportPeriod) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = currentDateFilter?.startDate || now;
        endDate = currentDateFilter?.endDate || now;
    }

    return { startDate, endDate };
  };

  // Helper para gerar dados de desempenho conforme período (igual aos gráficos)
  const getPerformanceDataForPeriod = (period: 'today' | 'week' | 'month', stats: DetailedStats) => {
    if (!stats) {
        return { title: '', items: [] };
    }
    
    
    // Usar horário de Brasília - CORRIGIDO
    const now = new Date();
    // Converter para string ISO e criar nova data em Brasília
    const brasiliaOffset = -3; // UTC-3
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brasiliaTime = new Date(utcTime + (brasiliaOffset * 3600000));
    
    
    switch (period) {
      case 'today':
        // Por hora - Horário de funcionamento: 7h-1h (7-23h + 0h-1h)
        const workingHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1];
        const currentHour = brasiliaTime.getHours();
        const availableHours = workingHours.filter(h => (h === 0 || h === 1) ? currentHour >= 0 && currentHour < 7 : h <= currentHour);
        
            
        return {
          title: 'DESEMPENHO POR HORA DO DIA (7h-1h)',
          items: availableHours.map(hour => ({
            label: `${hour}h`,
            value: safeNumber(stats.ordersByHour?.[hour] || 0, 0)
          }))
        };
        
      case 'week':
        // Por dia da semana
        const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const currentDayOfWeek = brasiliaTime.getDay();
        const availableDays = [0, 1, 2, 3, 4, 5, 6].filter(day => day <= currentDayOfWeek);
        
        return {
          title: 'DESEMPENHO POR DIA DA SEMANA',
          items: availableDays.map(day => ({
            label: weekDays[day],
            value: safeNumber(stats.performanceByDay?.[day] || 0, 0)
          }))
        };
        
      case 'month':
        // Por dia do mês (1-31)
        const currentDayOfMonth = brasiliaTime.getDate();
        const daysInMonth = currentDayOfMonth;
        
        return {
          title: 'DESEMPENHO POR DIA DO MÊS',
          items: Array.from({ length: daysInMonth }, (_, day) => ({
            label: `Dia ${day + 1}`,
            value: safeNumber(stats.performanceByMonth?.[day + 1] || 0, 0)
          }))
        };
        
      default:
        return {
          title: 'DESEMPENHO POR DIA DA SEMANA',
          items: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((dia, index) => ({
            label: dia,
            value: safeNumber(stats.performanceByDay?.[index] || 0, 0)
          }))
        };
    }
  };

  // Helper para gerar dados de receita conforme período
  const getRevenueDataForPeriod = (period: 'today' | 'week' | 'month', stats: DetailedStats) => {
    if (!stats) return { title: '', items: [] };
    
    // Usar horário de Brasília - CORRIGIDO
    const now = new Date();
    const brasiliaOffset = -3; // UTC-3
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brasiliaTime = new Date(utcTime + (brasiliaOffset * 3600000));
    
    const avgRevenuePerOrder = stats.totalDeliveries > 0 
      ? stats.totalRevenue / stats.totalDeliveries 
      : 0;
    
    switch (period) {
      case 'today':
        // Por hora - Horário de funcionamento: 7h-1h (7-23h + 0h-1h)
        const workingHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1];
        const currentHour = brasiliaTime.getHours();
        const availableHours = workingHours.filter(h => (h === 0 || h === 1) ? currentHour >= 0 && currentHour < 7 : h <= currentHour);
        
        return {
          title: 'TENDÊNCIA DE RECEITA POR HORA (7h-1h)',
          items: availableHours.map(hour => {
            const ordersInHour = safeNumber(stats.ordersByHour?.[hour] || 0, 0);
            return {
              label: `${hour}h`,
              value: safeNumber(ordersInHour * avgRevenuePerOrder, 0)
            };
          })
        };
        
      case 'week':
        // Por dia da semana
        const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const currentDayOfWeek = brasiliaTime.getDay();
        const availableDays = [0, 1, 2, 3, 4, 5, 6].filter(day => day <= currentDayOfWeek);
        
        return {
          title: 'TENDÊNCIA DE RECEITA - SEMANA ATUAL',
          items: availableDays.map(day => {
            const ordersInDay = safeNumber(stats.performanceByDay?.[day] || 0, 0);
            return {
              label: weekDays[day],
              value: safeNumber(ordersInDay * avgRevenuePerOrder, 0)
            };
          })
        };
        
      case 'month':
        // Por dia do mês
        const currentDayOfMonth = brasiliaTime.getDate();
        const daysInMonth = currentDayOfMonth;
        
        return {
          title: 'TENDÊNCIA DE RECEITA - MÊS ATUAL',
          items: Array.from({ length: daysInMonth }, (_, day) => {
            const ordersInDay = safeNumber(stats.performanceByMonth?.[day + 1] || 0, 0);
            return {
              label: `Dia ${day + 1}`,
              value: safeNumber(ordersInDay * avgRevenuePerOrder, 0)
            };
          })
        };
        
      default:
        return {
          title: 'TENDÊNCIA DE RECEITA (ÚLTIMOS 7 DIAS)',
          items: stats.revenueTrend?.map(item => ({
            label: new Date(item.date).toLocaleDateString('pt-BR'),
            value: safeNumber(item.revenue, 0)
          })) || []
        };
    }
  };

  // Função para gerar relatório detalhado similar ao script monthly report
  const generateDetailedHTML = (stats: DetailedStats, periodLabel: string, currentPeriod: 'today' | 'week' | 'month', allData?: { 
    allDeliverymen?: Array<{ name: string; deliveries: number; averageRating: number; id: string }>;
    allItems?: [string, number][];
    allCustomers?: [string, number][];
    allMotorcycles?: [string, number][];
    allRegions?: [string, number][];
  }) => {
    // Gerar dados de desempenho e receita conforme o período ANTES de criar o HTML
    const perfData = getPerformanceDataForPeriod(currentPeriod, stats);
    const revData = getRevenueDataForPeriod(currentPeriod, stats);
    
    
    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #FF4B2B;
              padding-bottom: 20px;
            }
            .section { 
              margin-bottom: 25px; 
              background: #f9f9f9;
              padding: 15px;
              border-radius: 8px;
            }
            .section-title { 
              color: #FF4B2B; 
              font-size: 18px; 
              margin-bottom: 15px; 
              font-weight: bold;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .subsection-title {
              color: #333;
              font-size: 16px;
              margin: 15px 0 10px 0;
              font-weight: bold;
            }
            .stat-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 10px; 
              padding: 8px;
              background: white;
              border-radius: 4px;
            }
            .stat-item { 
              text-align: center; 
              flex: 1;
            }
            .stat-value {
              font-size: 18px;
              font-weight: bold;
              color: #FF4B2B;
            }
            .list-item { 
              margin: 8px 0; 
              padding: 5px 10px;
              background: white;
              border-left: 3px solid #FF4B2B;
            }
            .summary-box {
              background: #e8f5e8;
              padding: 15px;
              border-radius: 8px;
              margin: 15px 0;
            }
            .total-highlight {
              font-size: 20px;
              font-weight: bold;
              color: #FF4B2B;
              text-align: center;
              margin: 20px 0;
              padding: 15px;
              background: #fff;
              border: 2px solid #FF4B2B;
              border-radius: 8px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>RELATÓRIO DETALHADO DE ${type === 'unit' ? 'UNIDADE' : 'ENTREGADOR'}</h1>
            <h2>${periodLabel}</h2>
            <p>Data de Geração: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
          </div>

          <div class="section">
            <h2 class="section-title">RESUMO SIMPLIFICADO DE ENTREGAS</h2>
            
            <div class="subsection-title">--- RESUMO GERAL ---</div>
            <div class="summary-box">
              <div class="stat-row">
                <span>Total de Entregas:</span>
                <span class="stat-value">${stats.totalDeliveries}</span>
              </div>
              ${userRole !== 'deliv' ? `
              <div class="stat-row">
                <span>Receita Total:</span>
                <span class="stat-value">R$ ${stats.totalRevenue.toFixed(2)}</span>
              </div>
              ` : ''}
              <div class="stat-row">
                <span>Tempo Médio de Entrega:</span>
                <span class="stat-value">${stats.averageDeliveryTime.toFixed(0)} min</span>
              </div>
              <div class="stat-row">
                <span>Entrega Mais Rápida:</span>
                <span class="stat-value">${stats.fastestDelivery.toFixed(0)} min</span>
              </div>
              <div class="stat-row">
                <span>Entrega Mais Lenta:</span>
                <span class="stat-value">${stats.slowestDelivery.toFixed(0)} min</span>
              </div>
              <div class="stat-row">
                <span>Distância Total Percorrida:</span>
                <span class="stat-value">${(safeNumber(stats.totalDistanceKm || 0, 0) / 1000).toFixed(1)} km</span>
              </div>
            </div>

            ${stats.topDeliverymen && stats.topDeliverymen.length > 0 ? `
            <div class="subsection-title">--- TOP 3 ENTREGADORES ---</div>
            ${stats.topDeliverymen.map(d => 
              `<div class="list-item">${d.name}: ${d.deliveries} entregas (Avaliação: ${d.averageRating.toFixed(1)})</div>`
            ).join('')}
            ` : ''}

            <div class="subsection-title">--- TOP 5 ITENS MAIS VENDIDOS ---</div>
            ${stats.topItems.slice(0, 5).map(([item, count]) => 
              `<div class="list-item">${item}: ${count} ${count > 1 ? 'vendas' : 'venda'}</div>`
            ).join('')}

            <div class="subsection-title">--- TOP 5 CLIENTES MAIS FREQUENTES ---</div>
            ${stats.topCustomers.slice(0, 5).map(([customer, count]) => 
              `<div class="list-item">${customer}: ${count} ${count > 1 ? 'compras' : 'compra'}</div>`
            ).join('')}

            <div class="subsection-title">--- TOP 5 MOTOS MAIS UTILIZADAS ---</div>
            ${stats.topMotorcycles.slice(0, 5).map(([plate, count]) => 
              `<div class="list-item">${plate}: ${count} ${count > 1 ? 'entregas' : 'entrega'}</div>`
            ).join('')}

            ${type === 'unit' && stats.topRegions && stats.topRegions.length > 0 ? `
            <div class="subsection-title">--- TOP 10 REGIÕES MAIS ATENDIDAS ---</div>
            ${stats.topRegions.slice(0, 10).map(([region, count]) => 
              `<div class="list-item">${region}: ${count} ${count > 1 ? 'entregas' : 'entrega'}</div>`
            ).join('')}
            ` : ''}

            <div class="total-highlight">
              TOTAL GERAL DE ENTREGAS NO PERÍODO: ${stats.totalDeliveries}
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">ANÁLISE DETALHADA COMPLETA</h2>
            
            ${allData?.allDeliverymen && allData.allDeliverymen.length > 0 ? `
            <div class="subsection-title">TODOS OS ENTREGADORES (${allData.allDeliverymen.length} entregadores)</div>
            ${allData.allDeliverymen
              .sort((a, b) => b.deliveries - a.deliveries)
              .map(d => 
                `<div class="list-item">${d.name}: ${d.deliveries} entregas (Avaliação: ${d.averageRating.toFixed(1)})</div>`
              ).join('')}
            ` : ''}

            <div class="subsection-title">TODAS AS MOTOS UTILIZADAS (${allData?.allMotorcycles?.length || stats.topMotorcycles.length} motos)</div>
            ${(allData?.allMotorcycles || stats.topMotorcycles)
              .sort((a, b) => b[1] - a[1])
              .map(([plate, count]) => 
                `<div class="list-item">${plate}: ${count} ${count > 1 ? 'entregas' : 'entrega'}</div>`
              ).join('')}

            ${type === 'unit' && (allData?.allRegions || (stats.topRegions && stats.topRegions.length > 0)) ? `
            <div class="subsection-title">TODAS AS REGIÕES ATENDIDAS (${allData?.allRegions?.length || stats.topRegions?.length || 0} regiões)</div>
            ${(allData?.allRegions || stats.topRegions || [])
              .sort((a, b) => b[1] - a[1])
              .map(([region, count]) => 
                `<div class="list-item">${region}: ${count} ${count > 1 ? 'entregas' : 'entrega'}</div>`
              ).join('')}
            ` : ''}
          </div>

          <div class="section">
            <h2 class="section-title">${perfData.title}</h2>
            ${perfData.items.map(item => 
              `<div class="list-item">${item.label}: ${item.value} ${item.value !== 1 ? 'entregas' : 'entrega'}</div>`
            ).join('')}
          </div>

          ${userRole !== 'deliv' ? `
          <div class="section">
            <h2 class="section-title">${revData.title}</h2>
            ${revData.items.map(item => 
              `<div class="list-item">${item.label}: R$ ${item.value.toFixed(2)}</div>`
            ).join('')}
          </div>
          ` : ''}

          <div class="section">
            <h2 class="section-title">OBSERVAÇÕES FINAIS</h2>
            <p>Este relatório foi gerado automaticamente pelo sistema FarmaNossa GO.</p>
            <p>Período analisado: ${periodLabel}</p>
            <p>Dados consolidados de ${type === 'unit' ? 'unidade farmacêutica' : 'entregador'}.</p>
            <p><strong>Relatório Completo:</strong> Todos os entregadores, itens, clientes e regiões estão incluídos neste relatório.</p>
          </div>
        </body>
      </html>
    `;
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const currentPeriod = getPeriodType(currentDateFilter);
  
      if (!combinedStats) {
        throw new Error('Não há dados para exportar');
      }

      // Usar período atual do dateFilter
      const { startDate, endDate } = currentDateFilter || { 
        startDate: new Date(), 
        endDate: new Date() 
      };

  
      // Buscar APENAS dados adicionais (além dos TOP 5/10 já carregados na UI)
      // Stats principais e TOP items já estão em combinedStats
        
      const endpoint = type === 'unit' 
        ? `unit/${ids[0]}/export-additional`
        : `deliveryman/${ids[0]}/export-additional`;
      
      const params = new URLSearchParams({
        period: currentPeriod,
        start: startDate.toISOString(),
        end: endDate.toISOString()
      });

      const response = await fetch(
        `https://us-central1-farmanossadelivery-76182.cloudfunctions.net/bigqueryApi/${endpoint}?${params}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch export data: ${response.status}`);
      }

      const exportData = await response.json();
  
      // Montar dados para exportação: 
      // - Reutilizar allDeliverymenStats se já está carregado (economiza query)
      // - Mesclar TOP items da UI com dados adicionais do BigQuery
      const allData = {
        allDeliverymen: type === 'unit' && allDeliverymenStats.length > 0
          ? allDeliverymenStats // ✅ REUTILIZAR dados já carregados
          : [],
        
        // ✅ MESCLAR: TOP 5 da UI + dados adicionais do BigQuery (APENAS motorcycles e regions)
        // topMotorcycles já vem como array [plate, count]
        allMotorcycles: [
          ...(combinedStats.topMotorcycles || []).slice(0, 5),
          ...(exportData.additional_motorcycles || []).map((m: any) => [m.license_plate, m.delivery_count])
        ],
        
        allRegions: type === 'unit' 
          ? [
              ...(combinedStats.topRegions || []).slice(0, 10),
              ...(exportData.additional_regions || []).map((r: any) => [r.region, r.delivery_count])
            ]
          : undefined,
        
        // Totais pré-calculados do BigQuery (apenas os que usamos)
        totalDeliverymen: exportData.total_deliverymen || allDeliverymenStats.length,
        totalDeliveriesByAll: exportData.total_deliveries_by_all || 
          allDeliverymenStats.reduce((sum: number, d: any) => sum + d.deliveries, 0),
        totalMotorcycles: exportData.total_motorcycles || 0,
        totalDeliveriesByMotorcycles: exportData.total_deliveries_by_motorcycles || 0,
        totalRegions: exportData.total_regions || 0,
        totalDeliveriesByRegions: exportData.total_deliveries_by_regions || 0
      };

        const periodLabel = 
        currentPeriod === 'today' ? `DIA ${startDate.toLocaleDateString('pt-BR')}` :
        currentPeriod === 'week' ? `SEMANA DE ${startDate.toLocaleDateString('pt-BR')} até ${endDate.toLocaleDateString('pt-BR')}` :
        `MÊS ${String(startDate.getMonth() + 1).padStart(2, '0')}/${startDate.getFullYear()}`;
      
      // 📊 LOG: Dados completos sendo exportados para o PDF
                      
      const html = generateDetailedHTML(combinedStats, periodLabel, currentPeriod, allData);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });

      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (!permissions.granted) {
          Alert.alert(
            'Permissão Necessária',
            'Precisamos de acesso ao armazenamento para salvar o PDF.',
            [{ text: 'OK' }]
          );
          return;
        }

        try {
          const fileName = `Relatorio_${currentPeriod}_${new Date().toISOString().split('T')[0]}.pdf`;
          
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const dirUri = permissions.directoryUri;
          await FileSystem.StorageAccessFramework.createFileAsync(
            dirUri,
            fileName,
            'application/pdf'
          ).then(async (fileUri) => {
            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            Alert.alert(
              'Sucesso',
              'PDF salvo com sucesso!',
              [{ text: 'OK' }]
            );
          });

        } catch (error) {
          console.error('Error saving file:', error);
          Alert.alert(
            'Erro',
            'Não foi possível salvar o PDF. Por favor, tente novamente.',
            [{ text: 'OK' }]
          );
        }
      } else {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: 'Salvar PDF'
        });
      }    } catch (error) {
      console.error('Error in PDF export:', error);
      Alert.alert(
        'Erro',
        'Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const currentPeriod = getPeriodType(currentDateFilter);
  
      if (!combinedStats) {
        throw new Error('Não há dados para exportar');
      }

      // Usar período atual do dateFilter
      const { startDate, endDate } = currentDateFilter || { 
        startDate: new Date(), 
        endDate: new Date() 
      };
      
      const periodLabel = 
        currentPeriod === 'today' ? `DIA ${startDate.toLocaleDateString('pt-BR')}` :
        currentPeriod === 'week' ? `SEMANA DE ${startDate.toLocaleDateString('pt-BR')} até ${endDate.toLocaleDateString('pt-BR')}` :
        `MÊS ${String(startDate.getMonth() + 1).padStart(2, '0')}/${startDate.getFullYear()}`;

        
      // Buscar APENAS dados adicionais (além dos TOP 5/10 já carregados na UI)
        
      const endpoint = type === 'unit' 
        ? `unit/${ids[0]}/export-additional`
        : `deliveryman/${ids[0]}/export-additional`;
      
      const params = new URLSearchParams({
        period: currentPeriod,
        start: startDate.toISOString(),
        end: endDate.toISOString()
      });

      const response = await fetch(
        `https://us-central1-farmanossadelivery-76182.cloudfunctions.net/bigqueryApi/${endpoint}?${params}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch export data: ${response.status}`);
      }

      const exportData = await response.json();
  
      // Mesclar TOP items da UI com dados adicionais do BigQuery (APENAS motorcycles e regions)
      const allDeliverymen = type === 'unit' && allDeliverymenStats.length > 0
        ? allDeliverymenStats // ✅ REUTILIZAR dados já carregados
        : [];
      
      // ✅ MESCLAR: TOP 5 da UI + dados adicionais do BigQuery (apenas motorcycles e regions)
      // topMotorcycles já vem como array [plate, count]
      const allMotorcycles = [
        ...(combinedStats.topMotorcycles || []).slice(0, 5),
        ...(exportData.additional_motorcycles || []).map((m: any) => [m.license_plate, m.delivery_count])
      ];
      
      const allRegions = type === 'unit' 
        ? [
            ...(combinedStats.topRegions || []).slice(0, 10),
            ...(exportData.additional_regions || []).map((r: any) => [r.region, r.delivery_count])
          ]
        : [];
      
      // Planilha 1: Resumo Executivo
      const resumoData = [
        [`RELATÓRIO DETALHADO DE ${type === 'unit' ? 'UNIDADE' : 'ENTREGADOR'} - ${periodLabel}`],
        [`Data de Geração: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`],
        [''],
        ['=== RESUMO SIMPLIFICADO DE ENTREGAS ==='],
        [''],
        ['RESUMO GERAL'],
        ['Métrica', 'Valor'],
        ['Total de Entregas', combinedStats.totalDeliveries],
        ['Receita Total', userRole !== 'deliv' ? `R$ ${combinedStats.totalRevenue.toFixed(2)}` : 'N/A'],
        ['Tempo Médio de Entrega (min)', combinedStats.averageDeliveryTime.toFixed(0)],
        ['Entrega Mais Rápida (min)', combinedStats.fastestDelivery.toFixed(0)],
        ['Entrega Mais Lenta (min)', combinedStats.slowestDelivery.toFixed(0)],
        ['Distância Total (km)', (safeNumber(combinedStats.totalDistanceKm || 0, 0) / 1000).toFixed(1)],
        [''],
        [`TOTAL GERAL DE ENTREGAS NO PERÍODO: ${combinedStats.totalDeliveries}`],
      ];

      // Planilha 2: Entregadores (TODOS os entregadores disponíveis do BigQuery)
      let entregadoresData: any[] = [['TODOS OS ENTREGADORES DO PERÍODO'], ['Nome', 'Entregas', 'Avaliação Média']];
      if (type === 'unit' && allDeliverymen && allDeliverymen.length > 0) {
        entregadoresData.push(...allDeliverymen
          .sort((a: any, b: any) => b.deliveries - a.deliveries)
          .map((deliveryman: any) => [
            deliveryman.name,
            deliveryman.deliveries,
            deliveryman.averageRating.toFixed(1)
          ]));
        entregadoresData.push(['']); // Linha vazia
        entregadoresData.push([`Total de Entregadores: ${exportData.total_deliverymen || allDeliverymen.length}`]);
        entregadoresData.push([`Total de Entregas (soma): ${exportData.total_deliveries_by_all || 0}`]);
      } else {
        entregadoresData = [['Dados de entregadores não disponíveis para este tipo de relatório']];
      }

      // Planilha 3: Análise Detalhada - Motos (TODAS as motos do BigQuery)
      const motosData = [
        ['TODAS AS MOTOS UTILIZADAS'],
        ['Placa', 'Entregas Realizadas'],
        ...allMotorcycles
          .sort((a: any, b: any) => b[1] - a[1])
          .map(([plate, count]: any) => [plate, count]),
        [''], // Linha vazia
        [`Total de Motos Utilizadas: ${exportData.total_motorcycles || allMotorcycles.length}`],
        [`Total de Entregas por Motos (soma): ${exportData.total_deliveries_by_motorcycles || 0}`]
      ];

      // Planilha 4: Top Regiões (TODAS as regiões do BigQuery, se for unidade)
      let regioesData: any[] = [];
      if (type === 'unit' && allRegions && allRegions.length > 0) {
        regioesData = [
          ['TODAS AS REGIÕES ATENDIDAS'],
          ['Região', 'Número de Entregas'],
          ...allRegions
            .sort((a: any, b: any) => b[1] - a[1])
            .map(([region, count]: any) => [region, count]),
          [''], // Linha vazia
          [`Total de Regiões Atendidas: ${exportData.total_regions || allRegions.length}`],
          [`Total de Entregas por Região (soma): ${exportData.total_deliveries_by_regions || 0}`]
        ];
      } else {
        regioesData = [['Dados de regiões não disponíveis para este tipo de relatório']];
      }

      // Planilha 5: Desempenho conforme período (dia/semana/mês)
      const perfData = getPerformanceDataForPeriod(currentPeriod, combinedStats);
      const performanceData = [
        [perfData.title],
        [perfData.items[0]?.label.includes('h') ? 'Hora' : perfData.items[0]?.label.includes('Dia') ? 'Dia' : 'Dia da Semana', 'Número de Entregas'],
        ...perfData.items.map(item => [item.label, item.value])
      ];

      // Planilha 6: Tendência de Receita conforme período (se não for entregador)
      let receitaData: any[] = [];
      if (userRole !== 'deliv') {
        const revData = getRevenueDataForPeriod(currentPeriod, combinedStats);
        receitaData = [
          [revData.title],
          [revData.items[0]?.label.includes('h') ? 'Hora' : revData.items[0]?.label.includes('Dia') ? 'Dia' : 'Dia da Semana', 'Receita (R$)'],
          ...revData.items.map(item => [item.label, item.value.toFixed(2)])
        ];
      } else {
        receitaData = [['Dados de receita não disponíveis']];
      }

      // Planilha 7: Observações e Metadados
      const observacoesData = [
        ['OBSERVAÇÕES E METADADOS DO RELATÓRIO'],
        [''],
        ['Informações Gerais:'],
        ['Tipo de Relatório', type === 'unit' ? 'Unidade Farmacêutica' : 'Entregador'],
        ['Período Analisado', periodLabel],
        ['Sistema', 'FarmaNossa GO'],
        ['Versão do Relatório', '3.0 - BigQuery Export (Dados Completos)'],
        [''],
        ['Estatísticas Consolidadas (DADOS COMPLETOS DO BIGQUERY):'],
        ['Total de Entregadores', type === 'unit' ? allDeliverymen?.length || 'N/A' : 'N/A'],
        ['Total de Motos Utilizadas', allMotorcycles.length],
        ['Total de Regiões Atendidas', type === 'unit' ? (allRegions?.length || 'N/A') : 'N/A'],
        ['Média de Avaliações', combinedStats.totalRatings > 0 ? (combinedStats.totalRatings / combinedStats.totalDeliveries).toFixed(1) : 'N/A'],
        [''],
        ['IMPORTANTE:'],
        ['- Este relatório contém TODOS os dados disponíveis do BigQuery'],
        ['- Não há limitação por "tops" nas seções detalhadas'],
        ['- Dados ordenados por performance (maior para menor)'],
        ['- Incluídos totais e contadores para validação'],
        ['- Fonte: BigQuery Analytics (alta performance)'],
      ];

      // Criar workbook
      const wb = XLSX.utils.book_new();

      // Adicionar planilhas com nomes mais descritivos
      const ws1 = XLSX.utils.aoa_to_sheet(resumoData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Resumo Executivo');

      const ws2 = XLSX.utils.aoa_to_sheet(entregadoresData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Entregadores');

      const ws3 = XLSX.utils.aoa_to_sheet(motosData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Motos');

      const ws4 = XLSX.utils.aoa_to_sheet(regioesData);
      XLSX.utils.book_append_sheet(wb, ws4, 'Regiões');

      const ws5 = XLSX.utils.aoa_to_sheet(performanceData);
      XLSX.utils.book_append_sheet(wb, ws5, 'Desempenho');

      const ws6 = XLSX.utils.aoa_to_sheet(receitaData);
      XLSX.utils.book_append_sheet(wb, ws6, 'Receita');

      const ws7 = XLSX.utils.aoa_to_sheet(observacoesData);
      XLSX.utils.book_append_sheet(wb, ws7, 'Observações');

      // Gerar arquivo Excel
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileName = `Relatorio_${currentPeriod}_${new Date().toISOString().split('T')[0]}.xlsx`;

      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (!permissions.granted) {
          Alert.alert(
            'Permissão Necessária',
            'Precisamos de acesso ao armazenamento para salvar o arquivo Excel.',
            [{ text: 'OK' }]
          );
          return;
        }

        try {
          const dirUri = permissions.directoryUri;
          const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            dirUri,
            fileName,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          );
          
          await FileSystem.writeAsStringAsync(fileUri, wbout, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          Alert.alert(
            'Sucesso',
            'Arquivo Excel salvo com sucesso!',
            [{ text: 'OK' }]
          );

        } catch (error) {
          console.error('Error saving Excel file:', error);
          Alert.alert(
            'Erro',
            'Não foi possível salvar o arquivo Excel. Por favor, tente novamente.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // iOS - salvar arquivo temporário e compartilhar
        const tempUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(tempUri, wbout, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        await Sharing.shareAsync(tempUri, {
          UTI: 'org.openxmlformats.spreadsheetml.sheet',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Salvar arquivo Excel'
        });
      }

    } catch (error) {
      console.error('Error in Excel export:', error);
      Alert.alert(
        'Erro',
        'Ocorreu um erro ao gerar o arquivo Excel. Por favor, tente novamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Memoizar dados do gráfico de receitas para garantir atualização quando o período mudar
  const revenueChartData = useMemo(() => {
    return getRevenueTrendChartData();
  }, [combinedStats, currentDateFilter]);

  if (!combinedStats) {
    return (
      <View>
        <DateFilterPicker
          selectedFilter={selectedFilter}
          currentDateFilter={currentDateFilter || defaultDateFilter}
          onFilterChange={handleFilterChange}
          onDateChange={handleDateChange}
          isLoading={true}
        />
        
        <View style={styles.detailedCard}>
          <View style={styles.loadingTextContainer}>
            <Text style={styles.loadingMainText}>
              {getLoadingMessage(selectedFilter).split('\n')[0]}
            </Text>
            {getLoadingMessage(selectedFilter).includes('\n') && (
              <Text style={styles.loadingSubText}>
                {getLoadingMessage(selectedFilter).split('\n')[1]}
              </Text>
            )}
          </View>
          <MetricSkeleton height={80} />
          <MetricSkeleton height={60} />
          <MetricSkeleton height={200} showChart={true} />
          <MetricSkeleton height={150} />
        </View>
      </View>
    );
  }

  return (
    <View>
      <DateFilterPicker
        selectedFilter={selectedFilter}
        currentDateFilter={currentDateFilter || defaultDateFilter}
        onFilterChange={handleFilterChange}
        onDateChange={handleDateChange}
        isLoading={isProcessing}
      />

      {isProcessing ? (
        <View style={styles.detailedCard}>
          <View style={styles.loadingTextContainer}>
            <Text style={styles.loadingMainText}>
              {getLoadingMessage(selectedFilter).split('\n')[0]}
            </Text>
            {getLoadingMessage(selectedFilter).includes('\n') && (
              <Text style={styles.loadingSubText}>
                {getLoadingMessage(selectedFilter).split('\n')[1]}
              </Text>
            )}
          </View>
          <MetricSkeleton height={80} />
          <MetricSkeleton height={60} />
          <MetricSkeleton height={200} showChart={true} />
          <MetricSkeleton height={150} />
        </View>
      ) : (
        <View style={styles.detailedCard}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <MaterialIcons name="local-shipping" size={24} color="#FF4B2B" />
              <Text style={styles.statValue}>{combinedStats.totalDeliveries}</Text>
              <Text style={styles.statLabel}>Entregas Totais</Text>
            </View>
            {userRole !== 'deliv' && (
              <View style={styles.statItem}>
                <MaterialIcons name="attach-money" size={24} color="#FF4B2B" />
                <Text style={styles.statValue}>R$ {safeNumber(combinedStats.totalRevenue, 0).toFixed(2)}</Text>
                <Text style={styles.statLabel}>Receita Total</Text>
              </View>
            )}
          </View>

        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <MaterialIcons name="access-time" size={24} color="#FF4B2B" />
            <Text style={styles.statValue}>{safeNumber(combinedStats.averageDeliveryTime, 0).toFixed(0)} min</Text>
            <Text style={styles.statLabel}>Tempo Médio de Entrega</Text>        
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="speed" size={24} color="#FF4B2B" />
            <Text style={styles.statValue}>{safeNumber(combinedStats.fastestDelivery, 0).toFixed(0)} min</Text>
            <Text style={styles.statLabel}>Entrega Mais Rápida</Text>
          </View>
        </View>

        {type === 'unit' && (
          <View style={styles.topDeliverymenContainer}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Pedidos Cancelados</Text>
              <TouchableOpacity 
                style={styles.viewMoreButton}
                disabled={isLoadingCancelledOrders}
                onPress={async () => {
                  if (ids && ids.length > 0) {
                    const period = getPeriodType(currentDateFilter);
                    // A API espera 'today', 'week', 'month' (não 'daily', 'weekly', 'monthly')
                    await fetchCancelledOrders(ids[0], period);
                    setIsCancelledOrdersModalVisible(true);
                  }
                }}
              >
                {isLoadingCancelledOrders ? (
                  <ActivityIndicator size="small" color="#FF4B2B" />
                ) : (
                  <>
                    <Text style={styles.viewMoreText}>Ver mais</Text>
                    <MaterialIcons name="arrow-forward" size={16} color="#FF4B2B" />
                  </>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.topDeliverymanInfo}>
              <MaterialIcons name="cancel" size={24} color="#FF4B2B" />
              <Text style={styles.topDeliverymanName}>Total de cancelamentos</Text>
              <Text style={styles.topDeliverymanDeliveries}>
                {combinedStats.totalCancelledOrders || 0} {(combinedStats.totalCancelledOrders || 0) !== 1 ? 'pedidos' : 'pedido'}
              </Text>
            </View>
          </View>
        )}

        {(() => {
          const chartData = getPerformanceChartData();
          return (
            <>
              <Text style={styles.sectionTitle}>{chartData.title}</Text>        
              <BarChart
                data={{
                  labels: chartData.labels,
                  datasets: [{
                    data: chartData.data.length > 0 ? chartData.data : [0]
                  }]
                }}
                width={300}
                height={200}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(255, 75, 43, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  propsForLabels: {
                    fontSize: 8, // Fonte menor para caber mais labels
                  },
                  barPercentage: 0.3, // Barras ultra-finas (30% da largura) para caber todas
                  fillShadowGradientOpacity: 1,
                }}
                style={styles.chart}
                fromZero
                withInnerLines={true}
                showBarTops={false}
              />
            </>
          );
        })()}

        {userRole !== 'deliv' && (
          <>
            <Text style={styles.sectionTitle}>{revenueChartData.title}</Text>
            <LineChart
              data={{
                labels: revenueChartData.labels,
                datasets: [{
                  data: revenueChartData.data.length > 0 ? revenueChartData.data : [0]
                }]
              }}
              width={300}
              height={200}
              yAxisLabel="R$"
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(34, 139, 34, ${opacity})`, // Verde para receita
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                propsForLabels: {
                  fontSize: 10,
                },
              }}
              style={styles.chart}
              bezier // Linha suave
              fromZero
            />
          </>
        )}

        {type === 'unit' && combinedStats.topRegions && combinedStats.topRegions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Top 10 Regiões</Text>
            {combinedStats.topRegions.slice(0, 10).map(([region, count], i) => (
              <Text key={i} style={styles.listItem}>{region}: {count} {count > 1 ? 'entregas' : 'entrega' }</Text>
            ))}
          </>
        )}

        {type === 'unit' && combinedStats.topDeliverymen && (
          <View style={styles.topDeliverymenContainer}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Top 3 Entregadores</Text>
              {allDeliverymenStats.length > 0 && (
                <TouchableOpacity 
                  style={styles.viewMoreButton}
                  onPress={() => setIsModalVisible(true)}
                >
                  <Text style={styles.viewMoreText}>Ver mais</Text>
                  <MaterialIcons name="arrow-forward" size={16} color="#FF4B2B" />
                </TouchableOpacity>
              )}
            </View>
            {combinedStats.topDeliverymen.slice(0, 3).map((deliveryman, idx) => (
              <View key={idx} style={styles.topDeliverymanInfo}>
                <MaterialIcons name="person" size={24} color="#FF4B2B" />
                <Text style={styles.topDeliverymanName}>{deliveryman.name.split(' ').slice(0, 2).join(' ')}</Text>
                <Text style={styles.topDeliverymanDeliveries}>
                  {deliveryman.deliveries} {deliveryman.deliveries > 1 ? 'entregas' : 'entrega' }
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Top 5 Itens Mais Vendidos</Text>
        {combinedStats.topItems.slice(0, 5).map(([item, count], i) => (
          <Text key={i} style={styles.listItem}>{item}: {count} {count > 1 ? 'vendas' : 'venda' }</Text>
        ))}

        <Text style={styles.sectionTitle}>Top 5 Clientes Mais Frequentes</Text>
        {combinedStats.topCustomers.slice(0, 5).map(([customer, count], i) => (
          <Text key={i} style={styles.listItem}>{customer}: {count} {count > 1 ? 'compras' : 'compra' }</Text>
        ))}

        <Text style={styles.sectionTitle}>Top 3 Motos Mais Utilizadas</Text>
        {combinedStats.topMotorcycles.slice(0, 3).map(([plate, count], i) => (
          <Text key={i} style={styles.listItem}>{plate}: {count} {count > 1 ? 'entregas' : 'entrega' }</Text>
        ))}

        <Text style={styles.sectionTitle}>Distância Total Percorrida</Text>
        {(() => {
          const distanceInMeters = combinedStats.totalDistanceKm;
          const distanceInKm = safeNumber(distanceInMeters / 1000, 0).toFixed(1);
                return <Text style={styles.statValue}>{distanceInKm} km</Text>;
        })()}
        </View>
      )}
      
      {userRole !== 'deliv' && (
        <View>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportPDF}
            disabled={isExporting}
          >
            <MaterialIcons name="picture-as-pdf" size={24} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>
              {isExporting ? 'Exportando...' : 'Exportar para PDF'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: '#28a745', marginTop: 10 }]}
            onPress={handleExportExcel}
            disabled={isExporting}
          >
            <MaterialIcons name="table-chart" size={24} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>
              {isExporting ? 'Exportando...' : 'Exportar para Excel'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <AllDeliverymenModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        deliverymenStats={allDeliverymenStats}
        onNavigateToDeliveryman={onNavigateToDeliveryman}
      />

      <CancelledOrdersModal
        visible={isCancelledOrdersModalVisible}
        onClose={() => setIsCancelledOrdersModalVisible(false)}
        cancelledOrders={cancelledOrders}
        isLoading={isLoadingCancelledOrders}
        onOrderPress={handleOrderPress}
      />
    </View>
  );
};

// Estilos para o modal de seleção de período
const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  periodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  optionContent: {
    flex: 1,
    marginLeft: 15,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  cancelButton: {
    backgroundColor: '#6C757D',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default StatsDetailsTab;
