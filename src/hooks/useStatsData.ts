// src/hooks/useStatsData.ts
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  doc,
  getDoc,
  DocumentData,
  Query,
  CollectionReference
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  calculateDetailedStats, 
  calculateOverallStats, 
  calculateTopMotorcycles,
  UserRole,
  Order,
  Deliveryman,
  PharmacyUnit,
  DeliveryRun
} from '../utils/statsUtils';
import { Alert } from 'react-native';

// Interface para dados de ponto
export interface Ponto {
  id: string;
  [key: string]: any; // Para as propriedades dinâmicas como Entrada1, Saida1, unitEntrada1, motorcycleEntrada1, etc.
}

// Interface para dados de pico (horários de maior movimento)
export interface PicoData {
  hour: number;
  orderCount: number;
  formattedHour: string;
}

// Função para buscar dados de ponto de um entregador específico
export const getPontoDataForDeliveryman = async (
  deliverymanId: string, 
  date?: string
): Promise<Ponto | null> => {
  if (!deliverymanId) {
    console.error("Cannot get ponto data: deliverymanId is required.");
    return null;
  }

  const dateString = date || new Date().toISOString().split('T')[0];
  const pontoId = `${dateString}-${deliverymanId}`;

  try {
    const pontoRef = doc(db, 'pontos', pontoId);
    const pontoDoc = await getDoc(pontoRef);

    if (pontoDoc.exists()) {
      return {
        id: pontoDoc.id,
        ...pontoDoc.data()
      } as Ponto;
    } else {
      console.log("No ponto document found!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching ponto data:", error);
    throw error;
  }
};

// Interface para dados agregados de folha de ponto de uma unidade
export interface FolhaPontoData {
  id: string;
  unitId: string;
  date: string;
  employees: Array<{
    id: string;
    name: string;
    pontoData: Ponto | null;
    totalHours?: number;
  }>;
  totalUnitHours: number;
  activeEmployees: number;
}

// Função para buscar dados de folha de ponto para uma unidade (busca direta na coleção pontos)
export const getFolhaPontoDataForUnit = async (
  unitId: string,
  date?: string
): Promise<FolhaPontoData | null> => {
  if (!unitId) {
    console.error("Cannot get folha ponto data: unitId is required.");
    return null;
  }

  const dateString = date || new Date().toISOString().split('T')[0];
  
  try {
    console.log(`Buscando registros de ponto para unidade ${unitId} na data ${dateString}`);

    // 1. Buscar todos os registros de ponto da data específica
    const pontosRef = collection(db, 'pontos');
    const pontosQuery = query(
      pontosRef,
      where('date', '==', dateString)
    );
    const pontosSnapshot = await getDocs(pontosQuery);

    console.log(`Encontrados ${pontosSnapshot.docs.length} registros de ponto para a data ${dateString}`);

    // 2. Filtrar registros que têm entradas na unidade especificada
    const pontosForUnit: Array<{ pontoData: any; deliverymanId: string }> = [];
    const deliverymanIds = new Set<string>();

    pontosSnapshot.docs.forEach(doc => {
      const pontoData = doc.data();
      const deliverymanId = pontoData.deliverymanId;
      
      // Verificar se alguma entrada foi feita nesta unidade
      let hasEntryInUnit = false;
      for (let i = 1; i <= 10; i++) {
        const unitEntradaKey = `unitEntrada${i}`;
        if (pontoData[unitEntradaKey] === unitId) {
          hasEntryInUnit = true;
          break;
        }
      }

      if (hasEntryInUnit && deliverymanId) {
        pontosForUnit.push({
          pontoData: { id: doc.id, ...pontoData },
          deliverymanId
        });
        deliverymanIds.add(deliverymanId);
      }
    });

    console.log(`Encontrados ${pontosForUnit.length} registros de ponto para a unidade ${unitId}`);
    console.log(`Funcionários únicos: ${deliverymanIds.size}`);

    // 3. Buscar nomes dos funcionários na coleção deliverymen
    const employeeNames = new Map<string, string>();
    
    if (deliverymanIds.size > 0) {
      const deliverymenRef = collection(db, 'deliverymen');
      const deliverymanIdsArray = Array.from(deliverymanIds);
      
      // Firestore tem limite de 10 itens no array 'in', então fazer em batches se necessário
      const batches = [];
      for (let i = 0; i < deliverymanIdsArray.length; i += 10) {
        const batch = deliverymanIdsArray.slice(i, i + 10);
        const batchQuery = query(deliverymenRef, where('__name__', 'in', batch));
        batches.push(getDocs(batchQuery));
      }

      const batchResults = await Promise.all(batches);
      batchResults.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          const deliverymanData = doc.data();
          employeeNames.set(doc.id, deliverymanData.name || 'Nome não informado');
        });
      });
    }

    // 4. Processar dados e calcular horas trabalhadas
    const employeesWithPonto = pontosForUnit.map(({ pontoData, deliverymanId }) => {
      // Calcular total de horas trabalhadas
      let totalHours = 0;
      
      // Procurar por pares de Entrada/Saida
      for (let i = 1; i <= 10; i++) {
        const entradaKey = `Entrada${i}`;
        const saidaKey = `Saida${i}`;
        const unitEntradaKey = `unitEntrada${i}`;
        
        // Só calcular se a entrada foi feita na unidade especificada
        if (pontoData[entradaKey] && pontoData[saidaKey] && pontoData[unitEntradaKey] === unitId) {
          try {
            const entrada = pontoData[entradaKey].toDate ? pontoData[entradaKey].toDate() : new Date(pontoData[entradaKey]);
            const saida = pontoData[saidaKey].toDate ? pontoData[saidaKey].toDate() : new Date(pontoData[saidaKey]);
            
            const diffMs = saida.getTime() - entrada.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            
            if (diffHours > 0 && diffHours < 24) { // Sanidade: entre 0 e 24 horas
              totalHours += diffHours;
            }
          } catch (timeError) {
            console.warn(`Error calculating hours for employee ${deliverymanId}, sequence ${i}:`, timeError);
          }
        }
      }

      return {
        id: deliverymanId,
        name: employeeNames.get(deliverymanId) || 'Nome não encontrado',
        pontoData,
        totalHours: totalHours > 0 ? Math.round(totalHours * 100) / 100 : undefined
      };
    });

    // 5. Calcular estatísticas da unidade
    const totalUnitHours = employeesWithPonto.reduce((sum, emp) => 
      sum + (emp.totalHours || 0), 0);
    const activeEmployees = employeesWithPonto.length;

    console.log(`Total de horas da unidade: ${totalUnitHours}h`);
    console.log(`Funcionários ativos: ${activeEmployees}`);

    return {
      id: `${dateString}-${unitId}`,
      unitId,
      date: dateString,
      employees: employeesWithPonto,
      totalUnitHours: Math.round(totalUnitHours * 100) / 100,
      activeEmployees
    };

  } catch (error) {
    console.error("Error fetching folha ponto data for unit:", error);
    throw error;
  }
};

// Função para buscar dados de pico (horários com mais pedidos) para uma unidade
export const getPicoDataForUnit = async (
  unitId: string,
  date?: string
): Promise<PicoData[]> => {
  if (!unitId) {
    console.error("Cannot get pico data: unitId is required.");
    return [];
  }

  const dateString = date || new Date().toISOString().split('T')[0];
  
  // Criar datas de forma mais robusta para funcionar em iOS e Android
  // Vamos trabalhar diretamente com o dia em horário de Brasília
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Criar início e fim do dia em horário de Brasília (UTC-3)
  // Início: 00:00:00 Brasília = 03:00:00 UTC
  const startOfDayBrasilia = new Date();
  startOfDayBrasilia.setUTCFullYear(year, month - 1, day);
  startOfDayBrasilia.setUTCHours(3, 0, 0, 0); // 00:00 Brasília = 03:00 UTC
  
  // Fim: 23:59:59 Brasília = 02:59:59 UTC do dia seguinte
  const endOfDayBrasilia = new Date();
  endOfDayBrasilia.setUTCFullYear(year, month - 1, day + 1);
  endOfDayBrasilia.setUTCHours(2, 59, 59, 999); // 23:59 Brasília = 02:59 UTC do dia seguinte
  
  console.log('=== DEBUG PICO DATA ===');
  console.log('Data solicitada:', dateString);
  console.log('Ano:', year, 'Mês:', month, 'Dia:', day);
  console.log('Início Brasília (00:00):', startOfDayBrasilia.toISOString());
  console.log('Fim Brasília (23:59):', endOfDayBrasilia.toISOString());
  console.log('Unidade:', unitId);

  try {
    const ordersRef = collection(db, 'orders');
    // Busca otimizada com filtros diretos do Firestore
    const q = query(
      ordersRef,
      where('pharmacyUnitId', '==', unitId),
      where('createdAt', '>=', startOfDayBrasilia),
      where('createdAt', '<=', endOfDayBrasilia)
    );

    const querySnapshot = await getDocs(q);
    
    console.log('Pedidos encontrados no período:', querySnapshot.docs.length);
    
    // Inicializar contadores para cada hora (7h às 1h = 18 horas)
    const hourCounts: { [hour: number]: number } = {};
    
    // Inicializar todas as horas de 7 AM a 1 AM (próximo dia)
    for (let hour = 7; hour <= 23; hour++) {
      hourCounts[hour] = 0;
    }
    hourCounts[0] = 0; // 12 AM (meia-noite)
    hourCounts[1] = 0; // 1 AM

    // Contar pedidos por hora (convertendo UTC para Brasília)
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.createdAt && data.createdAt.toDate) {
        const orderDateUTC = data.createdAt.toDate();
        
        // Converter UTC para horário de Brasília de forma mais robusta
        const orderDateBrasilia = new Date(orderDateUTC.getTime() - (3 * 60 * 60 * 1000));
        const brasiliaHour = orderDateBrasilia.getHours();
        const brasiliaDateStr = orderDateBrasilia.toISOString().split('T')[0];
        
        // Debug detalhado
        console.log(`Pedido: ${data.orderId}`);
        console.log(`  UTC: ${orderDateUTC.toISOString()}`);
        console.log(`  Brasília: ${orderDateBrasilia.toISOString()}`);
        console.log(`  Data Brasília: ${brasiliaDateStr} | Solicitada: ${dateString}`);
        console.log(`  Hora Brasília: ${brasiliaHour}h`);
        
        // Verificar se o pedido é realmente do dia solicitado (em horário de Brasília)
        if (brasiliaDateStr === dateString) {
          // Só contar se estiver no horário de funcionamento (7h às 1h)
          if ((brasiliaHour >= 7 && brasiliaHour <= 23) || brasiliaHour === 0 || brasiliaHour === 1) {
            if (hourCounts[brasiliaHour] !== undefined) {
              hourCounts[brasiliaHour]++;
              console.log(`  ✅ Contado na hora ${brasiliaHour}h`);
            }
          } else {
            console.log(`  ❌ Fora do horário de funcionamento (${brasiliaHour}h)`);
          }
        } else {
          console.log(`  ❌ Data diferente: ${brasiliaDateStr} !== ${dateString}`);
        }
      }
    });

    console.log('Contadores finais por hora (Brasília):', hourCounts);

    // Converter para array e formatar
    const picoData: PicoData[] = [];
    
    // Adicionar horas de 7h às 23h
    for (let hour = 7; hour <= 23; hour++) {
      picoData.push({
        hour,
        orderCount: hourCounts[hour],
        formattedHour: `${hour.toString().padStart(2, '0')}:00`
      });
    }
    
    // Adicionar 0h e 1h (meia-noite e 1h da madrugada)
    picoData.push({
      hour: 0,
      orderCount: hourCounts[0],
      formattedHour: '00:00'
    });
    picoData.push({
      hour: 1,
      orderCount: hourCounts[1],
      formattedHour: '01:00'
    });

    // Ordenar por hora (7h primeiro, depois 8h... até 1h)
    picoData.sort((a, b) => {
      if (a.hour >= 7 && b.hour >= 7) return a.hour - b.hour;
      if (a.hour >= 7 && b.hour < 7) return -1;
      if (a.hour < 7 && b.hour >= 7) return 1;
      return a.hour - b.hour;
    });

    return picoData;
  } catch (error) {
    console.error("Error fetching pico data:", error);
    throw error;
  }
};

interface StatsData {
  selectedData: (Deliveryman | PharmacyUnit)[];
  detailedStats: any[];
  overallStats: any;
  topMotorcycles: Array<{ plate: string; count: number }>;
  recentOrders: Order[];
  isLoading: boolean;
  hasError: boolean;
}

interface QueryConfig {
  mainQuery: Query<DocumentData>;
  recentOrdersQuery: Query<DocumentData>;
  deliveredOrdersQuery: Query<DocumentData>;
  deliveryRunsQuery: Query<DocumentData>;
}

interface DateFilter {
  startDate: Date;
  endDate: Date;
}

export const useStatsData = (
  type: 'deliveryman' | 'unit',
  ids: string[],
  userRole: UserRole,
  userId: string | null,
  userUnitId: string | null,
  navigation: any,
  dateFilter?: DateFilter
) => {
  const [data, setData] = useState<StatsData>({
    selectedData: [],
    detailedStats: [],
    overallStats: null,
    topMotorcycles: [],
    recentOrders: [],
    isLoading: true,
    hasError: false
  });

  useEffect(() => {


    const configureQueries = (): QueryConfig => {
      const mainCollection = collection(db, type === 'deliveryman' ? 'deliverymen' : 'pharmacyUnits');
      const ordersCollection = collection(db, 'orders');
      const deliveryRunsCollection = collection(db, 'deliveryRuns');
      
      let mainQuery: Query<DocumentData>;
      let recentOrdersQuery: Query<DocumentData>;
      let deliveredOrdersQuery: Query<DocumentData>;
      let deliveryRunsQuery: Query<DocumentData>;
    
      recentOrdersQuery = query(
        ordersCollection,
        orderBy('date', 'desc'),
        limit(10)
      );
    
      deliveredOrdersQuery = query(
        ordersCollection,
        where('status', '==', 'Entregue')
      );
    
      switch (userRole?.toLowerCase()) {
        case 'admin':
          mainQuery = query(mainCollection, where('__name__', 'in', ids));
          
          if (type === 'deliveryman') {
            // Para entregadores
            recentOrdersQuery = query(recentOrdersQuery, where('deliveryMan', 'in', ids));
            deliveredOrdersQuery = query(deliveredOrdersQuery, where('deliveryMan', 'in', ids));
            // Correção: Buscar deliveryRuns pelo deliverymanId
            deliveryRunsQuery = query(
              deliveryRunsCollection, 
              where('deliverymanId', 'in', ids)
            );
          } else {
            // Para unidades
            recentOrdersQuery = query(recentOrdersQuery, where('pharmacyUnitId', 'in', ids));
            deliveredOrdersQuery = query(deliveredOrdersQuery, where('pharmacyUnitId', 'in', ids));
            deliveryRunsQuery = query(
              deliveryRunsCollection,
              where('pharmacyUnitId', 'in', ids)
            );
          }
          break;
    
        case 'manager':
          if (type === 'unit') {
            mainQuery = query(mainCollection, where('__name__', '==', userUnitId));
            recentOrdersQuery = query(recentOrdersQuery, where('pharmacyUnitId', '==', userUnitId));
            deliveredOrdersQuery = query(deliveredOrdersQuery, where('pharmacyUnitId', '==', userUnitId));
            deliveryRunsQuery = query(
              deliveryRunsCollection,
              where('pharmacyUnitId', '==', userUnitId)
            );
          } else {
            // Para visualização de entregadores
            mainQuery = query(mainCollection, where('__name__', 'in', ids));
            recentOrdersQuery = query(recentOrdersQuery, where('deliveryMan', 'in', ids));
            deliveredOrdersQuery = query(deliveredOrdersQuery, where('deliveryMan', 'in', ids));
            // Agora buscando deliveryRuns pela unidade do gerente
            deliveryRunsQuery = query(
              deliveryRunsCollection,
              where('pharmacyUnitId', '==', userUnitId)
            );
          }
          break;
    
        case 'deliv':
          if (type === 'unit') {
            throw new Error('Entregador não tem permissão para ver dados da unidade');
          }
          
          mainQuery = query(mainCollection, where('__name__', 'in', ids));
          recentOrdersQuery = query(recentOrdersQuery, where('deliveryMan', 'in', ids));
          deliveredOrdersQuery = query(deliveredOrdersQuery, where('deliveryMan', 'in', ids));
          // Para entregadores, mantemos a busca por deliverymanId
          deliveryRunsQuery = query(
            deliveryRunsCollection,
            where('deliverymanId', 'in', ids)
          );
          break;
    
        default:
          throw new Error(`Role não reconhecido: ${userRole}`);
      }
      
      if (dateFilter) {
        deliveredOrdersQuery = query(
          deliveredOrdersQuery,
          where('date', '>=', dateFilter.startDate),
          where('date', '<=', dateFilter.endDate)
        );
        deliveryRunsQuery = query(
          deliveryRunsQuery,
          where('startTime', '>=', dateFilter.startDate),
          where('endTime', '<=', dateFilter.endDate)
        );
      }

      return { mainQuery, recentOrdersQuery, deliveredOrdersQuery, deliveryRunsQuery };
    };

    const fetchData = async () => {
      try {
        if (!userRole) {
          console.log('Waiting for userRole...');
          return;
        }

        if (!ids.length) {
          throw new Error('Nenhum ID fornecido para busca');
        }

        const { mainQuery, recentOrdersQuery, deliveredOrdersQuery, deliveryRunsQuery } = configureQueries();

        const [
          mainSnapshot,
          recentOrdersSnapshot,
          deliveredOrdersSnapshot,
          deliveryRunsSnapshot,
          pharmacyUnitsSnapshot,
          deliverymenSnapshot
        ] = await Promise.all([
          getDocs(mainQuery),
          getDocs(recentOrdersQuery),
          getDocs(deliveredOrdersQuery),
          getDocs(deliveryRunsQuery),
          getDocs(collection(db, 'pharmacyUnits')),
          getDocs(collection(db, 'deliverymen'))
        ]);        const selectedData = mainSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as (Deliveryman | PharmacyUnit)[];

        if (selectedData.length === 0) {
          throw new Error('Nenhum dado encontrado para exibição');
        }

        const pharmacyUnits = pharmacyUnitsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PharmacyUnit[];

        const deliverymen = deliverymenSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Deliveryman[];

        const deliveryRuns = deliveryRunsSnapshot.docs.map(doc => ({
          ...doc.data(),
          checkpoints: doc.data().checkpoints.map((checkpoint: any) => ({
            ...checkpoint,
            timestamp: checkpoint.timestamp.toDate()
          })),
          startTime: doc.data().startTime.toDate(),
          endTime: doc.data().endTime.toDate()
        })) as DeliveryRun[];

        const convertTimestamp = (timestamp: any) => {
          if (!timestamp) return new Date();
          if (timestamp.toDate) return timestamp.toDate();
          if (timestamp instanceof Date) return timestamp;
          return new Date();
        };

        const mapOrderDoc = (doc: any) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: convertTimestamp(data.date),
            createdAt: convertTimestamp(data.createdAt),
            updatedAt: convertTimestamp(data.updatedAt),
            lastStatusUpdate: convertTimestamp(data.lastStatusUpdate),
            reviewDate: data.reviewDate ? convertTimestamp(data.reviewDate) : undefined,
            statusHistory: (data.statusHistory || []).map((item: any) => ({
              status: item.status,
              timestamp: convertTimestamp(item.timestamp)
            })),
            price: data.price,
            priceNumber: parseFloat(data.price.replace('R$ ', '').replace(',', '.')) || 0,
            items: data.items || [],
            itemCount: data.itemCount || 0,
            rating: data.rating,
            reviewComment: data.reviewComment,
            reviewRequested: data.reviewRequested || false,
            customerName: data.customerName || 'Cliente não identificado',
            customerPhone: data.customerPhone || '',
            address: data.address || '',
            isDelivered: data.status === 'Entregue',
            isInDelivery: data.status === 'Em Entrega',
            isInPreparation: data.status === 'Em Preparação',
            isPending: data.status === 'Pendente'
          } as Order;
        };

        const recentOrders = recentOrdersSnapshot.docs.map(mapOrderDoc);
        const deliveredOrders = deliveredOrdersSnapshot.docs.map(mapOrderDoc);

        const detailedStats = await calculateDetailedStats(
          selectedData,
          type,
          deliveredOrders,
          deliverymen,
          deliveryRuns,
          userRole
        );


        const overallStats = calculateOverallStats(detailedStats, userRole);
        
        const topMotorcycles = calculateTopMotorcycles(deliveredOrders, type, ids);

        setData({
          selectedData,
          detailedStats,
          overallStats,
          topMotorcycles,
          recentOrders,
          isLoading: false,
          hasError: false
        });

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setData(prev => ({ ...prev, isLoading: false, hasError: true }));
        
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar os dados';
        Alert.alert('Erro', errorMessage);
        navigation.goBack();
      }
    };

    fetchData();
  }, [type, ids, userRole, userId, userUnitId, navigation, dateFilter]);

  return data;
};