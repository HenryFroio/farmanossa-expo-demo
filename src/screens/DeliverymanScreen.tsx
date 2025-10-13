// src/screens/DeliverymanScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  Animated, 
  Easing, 
  FlatList, 
  Alert, 
  Platform,
  Image,
  ActivityIndicator,
  Linking
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import BottomSheet from '@gorhom/bottom-sheet';
import { 
  MotorcycleBottomSheet, 
  OrdersBottomSheet, 
  FinishDeliveryBottomSheet 
} from '../components/DeliveryBottomSheets';
import { MotorcycleInspectionForm, InspectionFormData } from '../components/MotorcycleInspectionForm';
import CustomDrawer from '../components/CustomDrawer';
import styles from '../styles/deliverymanStyles';
import headerStyles from '../styles/headerStyles';
import { startDeliveryRun, endDeliveryRun, getLastUnfinishedRun, checkActiveDeliveryRun } from '../utils/locationTracking';
import * as Location from 'expo-location';
import * as Tracking from 'expo-tracking-transparency';
import { hasTrackingPermission } from '../utils/trackingPermissions';

import { db } from '../config/firebase';
import { collection, doc, getDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';

import { useDeliveryman, type Order as DeliverymanOrder } from '../hooks/useDeliveryman'; 
import UnitSelectionBottomSheet from '../components/UnitSelectionBottomSheet';
import { useAuth } from '../hooks/useAuth';

type DeliveryStatus = 'Fora de expediente' | 'Aguardando pedido' | 'Em rota de entrega' | 'Retornando a unidade';

const DeliverymanScreen: React.FC = () => {
  const navigation = useNavigation<any>();   const { 
    deliveryman,
    motorcycles: filteredMotorcycles,
    orders: filteredOrders,
    pharmacyUnit: currentPharmacyUnit,
    loading: dataLoading,
    error: dataError,
    updateDeliverymanStatus,
    updateOrderStatus,
    updateDeliverymanLicensePlate,
    updateMultipleOrderStatus,
    setDeliverymanOrders,
    clearDeliverymanLicensePlate,
    updateDeliverymanUnit,
    cancelUnitSelection,
    fetchAvailablePreparingOrders,
    loadingPreparingOrders,
    isLoadingSecondaryData,
    hasMoreOriginOrders,
    hasMoreTransferOrders,
    createOrUpdatePonto,
    getPontoData,
    saveInspectionForm,
    updateInspectionFormFinalTime,
    loadSecondaryData
   } = useDeliveryman();

  const [status, setStatus] = useState<DeliveryStatus>('Fora de expediente');
  const [isWorking, setIsWorking] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [activeOrders, setActiveOrders] = useState<DeliverymanOrder[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<DeliverymanOrder | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [unitConfirmed, setUnitConfirmed] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [syncAttempted, setSyncAttempted] = useState(false);  const [isFinishingRun, setIsFinishingRun] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [deliveryJustStarted, setDeliveryJustStarted] = useState(false);
  const [currentInspectionFormId, setCurrentInspectionFormId] = useState<string | null>(null);
  const [isFinishingExpedient, setIsFinishingExpedient] = useState(false);
  const [isStartingWork, setIsStartingWork] = useState(false);
  const [isSelectingUnit, setIsSelectingUnit] = useState(false);
  const [isRestoringUnit, setIsRestoringUnit] = useState(false);
  const [isConfirmingCurrentUnit, setIsConfirmingCurrentUnit] = useState(false);

  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncInProgressRef = useRef(false);

  const motorcycleBottomSheetRef = useRef<BottomSheet>(null);
  const unitSelectionBottomSheetRef = useRef<BottomSheet>(null);
  const inspectionFormBottomSheetRef = useRef<BottomSheet>(null);
  const ordersBottomSheetRef = useRef<BottomSheet>(null);
  const finishDeliveryBottomSheetRef = useRef<BottomSheet>(null);
  const { signOut } = useAuth();

  useEffect(() => {
    if (status === 'Em rota de entrega' && deliveryman?.orderId && filteredOrders.length > 0) {
      const currentActiveOrders = filteredOrders.filter((order: DeliverymanOrder) => 
        deliveryman.orderId.includes(order.id) && 
        (order.status === 'A caminho' || order.status === 'Cancelado')
      );
      setActiveOrders(currentActiveOrders);
    } else if (status !== 'Em rota de entrega') {
      setActiveOrders([]);
    }
  }, [status, filteredOrders, deliveryman?.orderId]);

  useEffect(() => {
    if (deliveryman) {
      console.log('[DeliverymanScreen] 📦 Deliveryman data received:', {
        status: deliveryman.status,
        licensePlate: deliveryman.licensePlate,
        pharmacyUnitId: deliveryman.pharmacyUnitId
      });
      
      const previousStatus = status;
      setStatus(deliveryman.status as DeliveryStatus);
      setIsWorking(deliveryman.status !== 'Fora de expediente');
      
      // Find motorcycle ID based on licensePlate
      if (deliveryman.licensePlate) {
        const motorcycle = filteredMotorcycles.find(m => m.plate === deliveryman.licensePlate);
        setSelectedMotorcycle(motorcycle?.id || null);
        console.log('[DeliverymanScreen] 🏍️ Motorcycle found:', motorcycle?.plate);
      } else {
        setSelectedMotorcycle(null);
        console.log('[DeliverymanScreen] 🏍️ No motorcycle selected');
      }
      
      if (previousStatus !== deliveryman.status && deliveryman.status === 'Aguardando pedido') {
        console.log('[DeliverymanScreen] Status changed to "Aguardando pedido", resetting sync flags');
        setSyncAttempted(false);
      }
    }
  }, [deliveryman, filteredMotorcycles]);
  useEffect(() => {
    if (syncInProgressRef.current || syncAttempted) return;

    const checkActiveRun = async () => {
      try {
        if (deliveryman?.id && deliveryman.status === 'Em rota de entrega') {
          // Adicionar um pequeno delay para permitir que as operações de banco sejam processadas
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          syncInProgressRef.current = true;
          setSyncAttempted(true);

          console.log(`[DeliverymanScreen] Verificando corridas ativas para o entregador ${deliveryman.id}`);
          
          setIsLoadingOrders(true);
          setLoadingTimeout(false);
          
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
          
          loadingTimeoutRef.current = setTimeout(() => {
            setLoadingTimeout(true);
          }, 10000);
          
          const activeRun = await checkActiveDeliveryRun(deliveryman.id);
          
          if (activeRun) {
            console.log(`[DeliverymanScreen] Corrida ativa encontrada: ${activeRun.runId} com ${activeRun.orderIds.length} pedidos`);
            setCurrentRunId(activeRun.runId);
            
            const needsOrdersSync = (!activeOrders || activeOrders.length === 0) && activeRun.orderIds.length > 0;
            const ordersOutOfSync = deliveryman.orderId && activeRun.orderIds.some(id => !deliveryman.orderId.includes(id));
            
            if (needsOrdersSync || ordersOutOfSync) {
              console.log(`[DeliverymanScreen] Sincronizando pedidos ativos na inicialização. 
                Razão: ${needsOrdersSync ? 'Sem pedidos na interface' : 'Pedidos desincronizados'}`);
              
              {
                const ordersRef = collection(db, 'orders');
                const snapshots = await Promise.all(
                  activeRun.orderIds.map(id => getDoc(doc(ordersRef, id)))
                );
                const prepIds = snapshots
                  .filter(snap => snap.exists() && snap.data().status === 'Em Preparação')
                  .map(snap => snap.id);
                if (prepIds.length > 0) {
                  console.log(
                    `[DeliverymanScreen] Atualizando status de pedidos em preparação para 'A caminho': ${prepIds.join(', ')}`
                  );
                  await updateMultipleOrderStatus(prepIds, 'A caminho');
                }
              }
              await setDeliverymanOrders(activeRun.orderIds);
              
              const ordersRef = collection(db, 'orders');
              const ordersPromises = activeRun.orderIds.map(orderId => {
                const docRef = doc(ordersRef, orderId);
                return getDoc(docRef);
              });              const ordersSnapshots = await Promise.all(ordersPromises);
              const ordersStatus = ordersSnapshots
                .filter(docSnap => docSnap.exists())
                .map(docSnap => docSnap.data().status);
              
              // Contar pedidos em diferentes estados
              const completedOrders = ordersStatus.filter(status => status === 'Entregue' || status === 'Cancelado');
              const inTransitOrders = ordersStatus.filter(status => status === 'A caminho');
              const preparingOrders = ordersStatus.filter(status => status === 'Em Preparação');
              
              console.log(`[DeliverymanScreen] Status dos pedidos - Entregues/Cancelados: ${completedOrders.length}, A caminho: ${inTransitOrders.length}, Em Preparação: ${preparingOrders.length}`);
              
              // Só considerar "todos completos" se realmente não houver pedidos ativos
              // E se não há pedidos "Em Preparação" que podem estar sendo processados
              const allOrdersCompleted = ordersStatus.length > 0 && 
                completedOrders.length === ordersStatus.length && 
                inTransitOrders.length === 0 && 
                preparingOrders.length === 0;
              
              // Não mudar para "Retornando" se a entrega acabou de ser iniciada
              if (allOrdersCompleted && !deliveryJustStarted) {
                console.log('[DeliverymanScreen] Todos os pedidos já foram entregues ou cancelados. Mudando status do entregador.');
                await updateDeliverymanStatus('Retornando a unidade', []);
                setStatus('Retornando a unidade');
                Alert.alert(
                  'Pedidos Finalizados',
                  'Todos os pedidos já foram concluídos. Você pode agora retornar à unidade.'
                );
              } else if (deliveryJustStarted && allOrdersCompleted) {
                console.log('[DeliverymanScreen] Entrega recém-iniciada, aguardando processamento dos status dos pedidos...');
                // Não fazer nada, apenas aguardar o processamento
              } else {
                await syncActiveOrders();
              }
            }
          } else {
            console.log(`[DeliverymanScreen] Nenhuma corrida ativa encontrada para o entregador ${deliveryman.id}`);
          }
          
          setIsLoadingOrders(false);
          syncInProgressRef.current = false;
        }
      } catch (error) {
        console.error('[DeliverymanScreen] Erro ao verificar corridas ativas:', error);
        setIsLoadingOrders(false);
        syncInProgressRef.current = false;
      }
    };
    
    checkActiveRun();
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [deliveryman?.id, deliveryman?.status]);

  // Monitor dataLoading state changes
  useEffect(() => {
    console.log('[DeliverymanScreen] ⏳ dataLoading changed:', dataLoading);
    if (!dataLoading) {
      console.log('[DeliverymanScreen] ✅ INITIAL DATA LOADING COMPLETED');
      console.log('[DeliverymanScreen] 📊 Current state:', {
        hasDeliveryman: !!deliveryman,
        hasMotorcycles: filteredMotorcycles.length > 0,
        hasPharmacyUnit: !!currentPharmacyUnit,
        motorcyclesCount: filteredMotorcycles.length,
        pharmacyUnit: currentPharmacyUnit?.name
      });
    }
  }, [dataLoading, deliveryman, filteredMotorcycles, currentPharmacyUnit]);

  // Monitor isLoadingSecondaryData state changes
  useEffect(() => {
    console.log('[DeliverymanScreen] ⏳ isLoadingSecondaryData changed:', isLoadingSecondaryData);
    if (!isLoadingSecondaryData && !dataLoading) {
      console.log('[DeliverymanScreen] ✅ ALL DATA LOADING COMPLETED (Primary + Secondary)');
      console.log('[DeliverymanScreen] 📊 Final state:', {
        motorcyclesCount: filteredMotorcycles.length,
        pharmacyUnit: currentPharmacyUnit?.name,
        ordersCount: filteredOrders.length
      });
    }
  }, [isLoadingSecondaryData, dataLoading, filteredMotorcycles, currentPharmacyUnit, filteredOrders]);

  const syncActiveOrders = useCallback(async () => {
    try {
      if (!deliveryman?.id) return false;

      console.log(`[syncActiveOrders] Iniciando sincronização para o entregador ${deliveryman.id}`);

      const activeRun = await checkActiveDeliveryRun(deliveryman.id);
      
      if (activeRun && activeRun.orderIds.length > 0) {
        console.log(`[syncActiveOrders] Recuperou corrida ativa com ${activeRun.orderIds.length} pedidos: ${JSON.stringify(activeRun.orderIds)}`);
        
        await setDeliverymanOrders(activeRun.orderIds);
        
        const ordersRef = collection(db, 'orders');
        
        const ordersPromises = activeRun.orderIds.map(orderId => {
          const docRef = doc(ordersRef, orderId);
          return getDoc(docRef);
        });
        
        const ordersSnapshots = await Promise.all(ordersPromises);
        const recoveredOrders = ordersSnapshots
          .filter(docSnap => {
            if (!docSnap.exists()) return false;
            const data = docSnap.data();
            return data.status === 'A caminho';
          })
          .map(docSnap => {
            const data = docSnap.data();
            return { id: docSnap.id, ...data } as DeliverymanOrder; 
          });
        
        console.log(`[syncActiveOrders] Detalhes recuperados para ${recoveredOrders.length} pedidos em rota`);
        
        if (recoveredOrders.length > 0) {
          setActiveOrders(recoveredOrders);
          return true;
        }
      } else {
        console.log(`[syncActiveOrders] Nenhuma corrida ativa encontrada para o entregador ${deliveryman.id}`);
      }
      
      if (deliveryman.orderId && deliveryman.orderId.length > 0) {
        console.log(`[syncActiveOrders] Tentando método alternativo com IDs: ${JSON.stringify(deliveryman.orderId)}`);
        
        const ordersRef = collection(db, 'orders');
        const ordersPromises = deliveryman.orderId.map(orderId => {
          const docRef = doc(ordersRef, orderId);
          return getDoc(docRef);
        });
        const ordersSnapshots = await Promise.all(ordersPromises);
        const existingOrders = ordersSnapshots
          .filter(docSnap => {
            if (!docSnap.exists()) return false;
            const data = docSnap.data();
            return data.status === 'A caminho';
          })
          .map(docSnap => {
            const data = docSnap.data();
            return { id: docSnap.id, ...data } as DeliverymanOrder; 
          });
        
        console.log(`[syncActiveOrders] Encontrados ${existingOrders.length} pedidos em rota pelo método alternativo`);
        
        if (existingOrders.length > 0) {
          setActiveOrders(existingOrders);
          return true;
        }
      }
      
      console.log('[syncActiveOrders] Nenhum pedido recuperado por nenhum método');
      return false;
    } catch (error) {
      console.error('Erro ao sincronizar pedidos ativos:', error);
      return false;
    }
  }, [deliveryman?.id, deliveryman?.orderId, db, setDeliverymanOrders]);

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'ios') {
        const hasPermission = await hasTrackingPermission();
        
        if (!hasPermission) {
          Alert.alert(
            'Permissão de Rastreamento',
            'Para fornecer entregas precisas, precisamos da sua permissão para rastrear sua localização. ' +
            'Isso é usado apenas para fins de entrega e nunca compartilhado com terceiros.',
            [
              {
                text: 'Não Permitir',
                style: 'cancel'
              },
              {
                text: 'Abrir Configurações',
                onPress: () => Linking.openSettings()
              }
            ]
          );
        }
      }

      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Permissão Necessária',
          'Para realizar entregas, precisamos da sua localização. ' +
          'Isso nos ajuda a garantir a segurança e eficiência das entregas.',
          [
            {
              text: 'Não Permitir',
              style: 'cancel'
            },
            {
              text: 'Abrir Configurações',
              onPress: () => Linking.openSettings()
            }
          ]
        );
        return false;
      }

      if (Platform.OS === 'ios') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        
        if (backgroundStatus !== 'granted') {
          Alert.alert(
            'Localização em Segundo Plano',
            'Para um melhor rastreamento das entregas, precisamos acessar sua localização mesmo quando o app estiver em segundo plano. ' +
            'Isso nos ajuda a garantir a segurança das entregas.',
            [
              {
                text: 'Não Permitir',
                style: 'cancel'
              },
              {
                text: 'Abrir Configurações',
                onPress: () => Linking.openSettings()
              }
            ]
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
      return false;
    }
  };

  useEffect(() => {
    const checkPermissions = async () => {
      const hasPermissions = await requestPermissions();
      setHasLocationPermission(hasPermissions);
      
      if (!hasPermissions) {
        Alert.alert(
          'Permissões Necessárias',
          'Para usar o app como entregador, precisamos das permissões de localização. ' +
          'Por favor, conceda as permissões necessárias nas configurações.',
          [
            {
              text: 'Mais tarde',
              style: 'cancel'
            },
            {
              text: 'Abrir Configurações',
              onPress: () => Linking.openSettings()
            }
          ]
        );
      }
    };

    checkPermissions();
  }, []);

  useEffect(() => {
    const restoreRunId = async () => {
      if (status === 'Retornando a unidade' && !currentRunId && deliveryman?.id) {
        const lastRunId = await getLastUnfinishedRun(deliveryman.id);
        if (lastRunId) {
          setCurrentRunId(lastRunId);
        }
      }
    };
    
    restoreRunId();
  }, [status, currentRunId, deliveryman?.id]);

  useEffect(() => {
    Animated.timing(animation, {
      toValue: isWorking ? 1 : 0,
      duration: 500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [isWorking, animation]);

  const handleActiveOrderPress = (order: DeliverymanOrder) => {
    setSelectedOrderDetails(order);
    setIsDrawerOpen(true);
  };

  const getButtonText = () => {
    // Show loading text when restoring unit
    if (isRestoringUnit) {
      return 'Restaurando unidade...';
    }
    
    // Show loading text when initial data is loading
    if (dataLoading) {
      return 'Carregando...';
    }
    
    // Show loading text when secondary data is still loading
    if (isLoadingSecondaryData) {
      return 'Carregando...';
    }
    
    switch (status) {
      case 'Fora de expediente':
        return 'Iniciar Expediente';
      case 'Aguardando pedido':
        return 'Iniciar entrega';
      case 'Em rota de entrega':
        return 'Finalizar entrega';
      case 'Retornando a unidade':
        return 'Cheguei';
      default:
        return '';
    }
  };

  const handleStatusUpdate = async () => {
     try {
       if (status === 'Fora de expediente') {
         unitSelectionBottomSheetRef.current?.expand();
       } else if (status === 'Aguardando pedido') {
        // Load first page of preparing orders on demand
        if (deliveryman?.pharmacyUnitId) {
          fetchAvailablePreparingOrders({ unitId: deliveryman.pharmacyUnitId, loadMore: false });
        }
        ordersBottomSheetRef.current?.expand();
       } else if (status === 'Em rota de entrega') {
        finishDeliveryBottomSheetRef.current?.expand();
      } else if (status === 'Retornando a unidade') {
        if (isFinishingRun) return; // Prevent double execution
        setIsFinishingRun(true);
        let runIdToEnd = currentRunId;
        let runEndedSuccessfully = false; // Flag to track if run was ended

        // Try to find the run ID if not already set locally
        if (!runIdToEnd && deliveryman?.id) {
          console.log('[handleStatusUpdate] currentRunId is null. Attempting to fetch last run.');
          try {
            runIdToEnd = await getLastUnfinishedRun(deliveryman.id);
            if (runIdToEnd) {
              console.log('[handleStatusUpdate] Found lastRunId:', runIdToEnd);
            } else {
               console.log('[handleStatusUpdate] No unfinished run found via getLastUnfinishedRun.');
            }
          } catch (fetchError) {
             console.error('[handleStatusUpdate] Error fetching last unfinished run:', fetchError);
             // Continue even if fetching fails, runIdToEnd will remain null
          }
        }

        // Attempt to end the run if an ID was found
        if (runIdToEnd) {
          try {
            const totalDistance = await endDeliveryRun(); // Assumes endDeliveryRun uses the internally tracked runId
            Alert.alert('Corrida Finalizada', `Distância total percorrida: ${(totalDistance/1000).toFixed(2)} km`);
            runEndedSuccessfully = true;
          } catch (error) {
            console.error('[handleStatusUpdate] Error ending delivery run:', error);
            if (error instanceof Error && error.message.includes('No active run found')) {
                Alert.alert('Aviso', 'Não foi possível encontrar uma corrida ativa para finalizar formalmente, mas seu status será atualizado.');
            } else {
                Alert.alert('Erro', 'Ocorreu um erro ao finalizar a corrida. Seu status será atualizado.');
            }
            // Do not set runEndedSuccessfully = true here, but proceed to update status
          }
        } else {
          console.warn('[handleStatusUpdate] Could not find an active or unfinished run to end. Proceeding with status update.');
          Alert.alert('Aviso', 'Nenhuma corrida encontrada para finalizar, mas seu status será atualizado para "Aguardando pedido".');
        }

        // Always update status to 'Aguardando pedido' in this flow to unblock the user
        try {
          await updateDeliverymanStatus('Aguardando pedido', []);
          setStatus('Aguardando pedido');
          setCurrentRunId(null); // Clear local run ID regardless
          console.log('[handleStatusUpdate] Status updated to "Aguardando pedido".');
        } catch (updateError) {
           console.error('[handleStatusUpdate] Failed to update deliveryman status after attempting to end run:', updateError);
           Alert.alert('Erro Crítico', 'Não foi possível atualizar seu status. Por favor, tente novamente ou contate o suporte.');
           // If status update fails, we should ideally revert local state or handle appropriately
           // For now, we leave the local state potentially inconsistent with backend if this specific error occurs
        } finally {
          // Ensure this runs regardless of success/failure in updating status
          setIsFinishingRun(false);
        }
      }
    } catch (error) {
       // This outer catch might now only catch errors from the other status branches
       // or unforeseen issues before the 'Retornando a unidade' logic starts.
       console.error('Erro geral ao atualizar status:', error);
       Alert.alert('Erro', 'Não foi possível atualizar o status. Tente novamente.');
       // Ensure isFinishingRun is reset if an error occurred before the specific finally block
       if (status === 'Retornando a unidade' && isFinishingRun) { // Check isFinishingRun state here
           setIsFinishingRun(false);
       }
    }
  };

  const handleUnitConfirmation = async () => {
    try {
      setIsConfirmingCurrentUnit(true); // Set loading for confirming current unit
      // Load secondary data for the current unit
      if (deliveryman?.pharmacyUnitId) {
        await loadSecondaryData(deliveryman.pharmacyUnitId);
      }
      unitSelectionBottomSheetRef.current?.close();
      setUnitConfirmed(true);
      motorcycleBottomSheetRef.current?.expand();
    } catch (error) {
      console.error('Erro ao confirmar unidade:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da unidade');
    } finally {
      setIsConfirmingCurrentUnit(false);
    }
  };

  const handleUnitSelection = async (newUnitId: string) => {
    // Set loading state immediately for instant visual feedback
    setIsSelectingUnit(true);
    
    // Allow React to render the loading state before starting async operations
    await new Promise(resolve => setTimeout(resolve, 0));
    
    try {
      await updateDeliverymanUnit(newUnitId);
      // Load secondary data for the selected unit
      await loadSecondaryData(newUnitId);
      unitSelectionBottomSheetRef.current?.close();
      setUnitConfirmed(true);
      motorcycleBottomSheetRef.current?.expand();
    } catch (error) {
      console.error('Erro ao selecionar unidade:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a unidade');
    } finally {
      setIsSelectingUnit(false);
    }
  };
  
  const handleUnitSelectionCancel = useCallback(async () => {
    setIsRestoringUnit(true);
    try {
      await cancelUnitSelection();
    } catch (error) {
      console.error('[DeliverymanScreen] Error canceling unit selection:', error);
    } finally {
      setIsRestoringUnit(false);
    }
  }, [cancelUnitSelection]);
  
  const toggleWorkStatus = async () => {
    if (isFinishingExpedient) return; // Previne múltiplos cliques
    
    try {
      if (isWorking) {
        setIsFinishingExpedient(true);
        console.log('[DeliverymanScreen] Iniciando finalização do expediente');
        
        if (currentRunId && status === 'Retornando a unidade') {
          const totalDistance = await endDeliveryRun();
          Alert.alert(
            'Expediente Finalizado',
            `Distância total percorrida: ${(totalDistance/1000).toFixed(2)} km`
          );
        }
        
        // Atualizar hora final no formulário de inspeção se existe
        if (currentInspectionFormId) {
          try {
            const finalTime = new Date().toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit',
              timeZone: 'America/Sao_Paulo' 
            });
            await updateInspectionFormFinalTime(currentInspectionFormId, finalTime);
          } catch (error) {
            console.error('Erro ao atualizar hora final do formulário:', error);
          }
        }
        
        // Registrar saída do expediente
        await createOrUpdatePonto('saida');
        
        console.log('[DeliverymanScreen] Atualizando status e limpando dados');
        await Promise.all([
          updateDeliverymanStatus('Fora de expediente', []),
          clearDeliverymanLicensePlate()
        ]);
        
        console.log('[DeliverymanScreen] Resetando estados locais');
        setIsWorking(false);
        setSelectedMotorcycle(null);
        setSelectedOrders([]);
        setActiveOrders([]);
        setStatus('Fora de expediente');
        setCurrentRunId(null);
        setUnitConfirmed(false);
        setCurrentInspectionFormId(null);
        
        console.log('[DeliverymanScreen] Expediente finalizado com sucesso');
      } else {
        unitSelectionBottomSheetRef.current?.expand();
      }
    } catch (error) {
      console.error('Erro ao alterar status de trabalho:', error);
      Alert.alert('Erro', 'Não foi possível alterar o status de trabalho');
    } finally {
      // Aguardar um tempo para que os logs de "Cleared license plate" apareçam
      setTimeout(() => {
        setIsFinishingExpedient(false);
        console.log('[DeliverymanScreen] Loading de finalização removido');
      }, 2000);
    }
  };    const startWork = useCallback(async () => {
    if (selectedMotorcycle) {
      setIsStartingWork(true);
      try {
        // Verificar se a placa contém 'BIKE' - se contém, pode prosseguir diretamente
        const selectedMotorcycleData = filteredMotorcycles.find(m => m.id === selectedMotorcycle);
        const isChecklistRequired = selectedMotorcycleData && !selectedMotorcycleData.plate.toUpperCase().includes('BIKE');
        
        if (isChecklistRequired) {
          // Fechar o modal de motocicleta e abrir o formulário de inspeção
          motorcycleBottomSheetRef.current?.close();
          setTimeout(() => {
            inspectionFormBottomSheetRef.current?.expand();
          }, 300);
          return;
        }
        
        // Se é BIKE ou não precisa de checklist, iniciar expediente diretamente
        await startWorkWithoutInspection();
      } catch (error) {
        console.error('Erro ao iniciar expediente:', error);
        Alert.alert('Erro', 'Não foi possível iniciar o expediente');
      } finally {
        setIsStartingWork(false);
      }
    }
  }, [selectedMotorcycle, filteredMotorcycles]);

  const startWorkWithoutInspection = useCallback(async () => {
    if (selectedMotorcycle) {
      try {
        // Buscar a placa da motocicleta selecionada
        const motorcycle = filteredMotorcycles.find(m => m.id === selectedMotorcycle);
        if (!motorcycle) {
          Alert.alert('Erro', 'Motocicleta não encontrada');
          return;
        }
        
        // Registrar entrada do expediente com a placa da motocicleta
        await createOrUpdatePonto('entrada', motorcycle.plate);
        
        await Promise.all([
          updateDeliverymanStatus('Aguardando pedido', []),
          updateDeliverymanLicensePlate(motorcycle.plate)
        ]);
        setIsWorking(true);
        setStatus('Aguardando pedido');
        motorcycleBottomSheetRef.current?.close();
      } catch (error) {
        console.error('Erro ao iniciar expediente:', error);
        Alert.alert('Erro', 'Não foi possível iniciar o expediente');
      }
    }
  }, [selectedMotorcycle, filteredMotorcycles, updateDeliverymanStatus, updateDeliverymanLicensePlate, createOrUpdatePonto]);

  const handleInspectionFormSubmit = useCallback(async (formData: InspectionFormData, formId: string) => {
    try {
      // Salvar o ID do formulário
      setCurrentInspectionFormId(formId);
      
      // Registrar entrada do expediente com a motocicleta selecionada
      if (selectedMotorcycle) {
        const motorcycle = filteredMotorcycles.find(m => m.id === selectedMotorcycle);
        if (motorcycle) {
          await createOrUpdatePonto('entrada', motorcycle.plate);
          
          await Promise.all([
            updateDeliverymanStatus('Aguardando pedido', []),
            updateDeliverymanLicensePlate(motorcycle.plate)
          ]);
          setIsWorking(true);
          setStatus('Aguardando pedido');
        }
      }
      
      console.log('Formulário de inspeção salvo e expediente iniciado com sucesso!');
    } catch (error) {
      console.error('Erro ao processar formulário de inspeção:', error);
      Alert.alert('Erro', 'Não foi possível iniciar o expediente. Tente novamente.');
    }
  }, [selectedMotorcycle, filteredMotorcycles, createOrUpdatePonto, updateDeliverymanStatus, updateDeliverymanLicensePlate]);

  const handleInspectionFormClose = useCallback(async () => {
    inspectionFormBottomSheetRef.current?.close();
    await handleUnitSelectionCancel();
  }, [handleUnitSelectionCancel]);

  const handleInspectionFormAfterClose = useCallback(() => {
    console.log('[DeliverymanScreen] Resetando formulário após fechamento...');
    // Aqui podemos adicionar lógica adicional se necessário
    // O formulário se resetará automaticamente
  }, []);
  
  const refreshAvailableOrders = useCallback(async () => {
    if (deliveryman?.pharmacyUnitId) {
      try {
        await fetchAvailablePreparingOrders({ unitId: deliveryman.pharmacyUnitId, loadMore: false });
      } catch (error) {
        console.error('Erro ao atualizar lista de pedidos:', error);
        throw error;
      }
    }
  }, [deliveryman?.pharmacyUnitId, fetchAvailablePreparingOrders]);
    const startDelivery = useCallback(async () => { 
    if (selectedOrders.length > 0 && deliveryman?.id && selectedMotorcycle) {
      if (!hasLocationPermission) {
        Alert.alert(
          'Permissão Negada',
          'Não podemos rastrear sua localização sem permissão.'
        );
        return;
      }      try {
        // Prevenir verificações automáticas durante o início da entrega
        syncInProgressRef.current = true;
        setDeliveryJustStarted(true);
        
        const runId = await startDeliveryRun( 
          deliveryman.id,
          selectedMotorcycle,
          selectedOrders,
          deliveryman.pharmacyUnitId
        );
        
        setCurrentRunId(runId);
  
        await Promise.all([
          updateDeliverymanStatus('Em rota de entrega', selectedOrders),
          updateMultipleOrderStatus(selectedOrders, 'A caminho'),
        ]);
        
        const newActiveOrders = filteredOrders.filter((order: DeliverymanOrder) => 
          selectedOrders.includes(order.id)
        );
        setActiveOrders(prevActive => [...prevActive, ...newActiveOrders]);
        setSelectedOrders([]);
        setStatus('Em rota de entrega');
        ordersBottomSheetRef.current?.close();
        
        // Permitir verificações novamente após um delay para que as atualizações sejam processadas
        setTimeout(() => {
          syncInProgressRef.current = false;
          setDeliveryJustStarted(false);
        }, 5000); // 5 segundos de delay
  
      } catch (error) {
        console.error('Erro ao iniciar entrega:', error);
        Alert.alert('Erro', 'Não foi possível iniciar a entrega');
        syncInProgressRef.current = false; // Reset em caso de erro
        setDeliveryJustStarted(false);
      }
    }
  }, [
    selectedOrders,
    deliveryman?.id,
    selectedMotorcycle,
    filteredOrders,
    hasLocationPermission,
    updateDeliverymanStatus,
    updateMultipleOrderStatus
  ]);
  
  const finishDelivery = useCallback(async (orderId: string) => { 
    try {
      const remainingOrders = activeOrders.filter(order => order.id !== orderId);
      const currentOrder = activeOrders.find(order => order.id === orderId);
      
      if (!currentOrder) throw new Error('Pedido não encontrado');
  
      await Promise.all([
        currentOrder.status !== 'Cancelado' 
          ? updateOrderStatus(orderId, 'Entregue')
          : Promise.resolve(),
        setDeliverymanOrders(remainingOrders.map(order => order.id))
      ]);
  
      if (remainingOrders.length === 0) {
        await updateDeliverymanStatus('Retornando a unidade', []);
        setStatus('Retornando a unidade');
        Alert.alert(
          'Pedidos Finalizados',
          'Você pode agora retornar à unidade. A corrida será finalizada quando você chegar.'
        );
      }
  
      setActiveOrders(remainingOrders);
      finishDeliveryBottomSheetRef.current?.close();
  
    } catch (error) {
      console.error('Erro ao finalizar entrega:', error);
      Alert.alert('Erro', 'Não foi possível finalizar a entrega');
    }
  }, [activeOrders, updateOrderStatus, setDeliverymanOrders, updateDeliverymanStatus]);

  const cancelDelivery = useCallback(async (orderId: string, reason: string) => { 
    try {
      const remainingOrders = activeOrders.filter(order => order.id !== orderId);
      const currentOrder = activeOrders.find(order => order.id === orderId);
      
      if (!currentOrder) throw new Error('Pedido não encontrado');

      await Promise.all([
        updateOrderStatus(orderId, 'Cancelado'), 
        setDeliverymanOrders(remainingOrders.map(order => order.id))
      ]);

      if (remainingOrders.length === 0) {
        await updateDeliverymanStatus('Retornando a unidade', []);
        setStatus('Retornando a unidade');
        Alert.alert(
          'Pedidos Finalizados',
          'Você pode agora retornar à unidade. A corrida será finalizada quando você chegar.'
        );
      }

      setActiveOrders(remainingOrders);
      finishDeliveryBottomSheetRef.current?.close();

    } catch (error) {
      console.error('Erro ao cancelar entrega:', error);
      Alert.alert('Erro', 'Não foi possível cancelar a entrega');
    }
  }, [activeOrders, updateOrderStatus, setDeliverymanOrders, updateDeliverymanStatus]);

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prevSelected => 
      prevSelected.includes(orderId)
        ? prevSelected.filter(id => id !== orderId)
        : [...prevSelected, orderId]
    );
  };

  const scale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  const getStatusColor = () => {
    switch (status) {
      case 'Fora de expediente':
        return styles.statusOffDuty;
      case 'Aguardando pedido':
        return styles.statusWaiting;
      case 'Em rota de entrega':
        return styles.statusDelivering;
      case 'Retornando a unidade':
        return styles.statusReturning;
      default:
        return styles.statusOffDuty;
    }
  };

  const goToStatsScreen = () => {
    if (deliveryman) {
      navigation.navigate('Stats', { 
        type: 'deliveryman', 
        ids: [deliveryman.id],
        isOwnStats: true
      });
    }
  };

  // Remover o useEffect de timeout/prompt (caso exista)

  if (dataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4B2B" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  if (dataError || !deliveryman) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {dataError || 'Erro ao carregar dados do entregador'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View 
        style={styles.mainSafeArea}
      >
        <View style={[styles.header, headerStyles.headerContainer]}>
          <View style={styles.headerLeft}>
            <Image 
              source={require('../assets/avatar.png')}
              style={headerStyles.headerLogo}
            />
          </View>
          
          <View style={headerStyles.headerTitleContainer}>
            <Text 
              style={[styles.greeting, headerStyles.headerTitle]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Olá, {deliveryman.name.split(' ')[0]}
            </Text>
          </View>
  
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={[styles.headerIcon, styles.headerIconMargin]}
              onPress={goToStatsScreen}
              disabled={isLoggingOut}
            >
              <MaterialIcons name="bar-chart" size={24} color="#FFFFFF" />
            </TouchableOpacity>
  
            <TouchableOpacity 
              style={styles.headerIcon}
              disabled={isLoggingOut}
              onPress={async () => {
                Alert.alert(
                  'Confirmar Saída',
                  'Deseja realmente sair do aplicativo?',
                  [
                    {
                      text: 'Cancelar',
                      style: 'cancel'
                    },
                    {
                      text: 'Sair',
                      onPress: async () => {
                        setIsLoggingOut(true);
                        try {
                          await signOut();
                        } catch (error) {
                          Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
                        } finally {
                          setIsLoggingOut(false);
                        }
                      },
                      style: 'destructive'
                    }
                  ]
                );
              }}
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="exit-to-app" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
  
        <View style={styles.content}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="delivery-dining" size={120} color="#4299E1" />
          </View>
  
          <View style={[styles.statusCard, getStatusColor()]}>
            <Text style={styles.statusLabel}>Status atual</Text>
            <Text style={styles.statusText}>{status}</Text>
          </View>

          {status === 'Em rota de entrega' && (
            <>
              {isLoadingOrders ? (
                <View style={styles.loadingOrdersContainer}>
                  <ActivityIndicator size="large" color="#FF4B2B" />
                  <Text style={styles.loadingOrdersText}>
                    Carregando seus pedidos ativos...
                  </Text>
                  {loadingTimeout && (
                    <TouchableOpacity 
                      style={styles.reloadButton}
                      onPress={syncActiveOrders}
                    >
                      <Text style={styles.reloadButtonText}>Forçar Carregamento</Text>
                      <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : activeOrders.length === 0 ? (
                <View style={styles.noOrdersContainer}>
                  <Text style={styles.noOrdersText}>
                    Nenhum pedido ativo encontrado, mas você está em rota de entrega
                  </Text>
                  <TouchableOpacity 
                    style={styles.reloadButton}
                    onPress={syncActiveOrders}
                  >
                    <Text style={styles.reloadButtonText}>Recarregar Pedidos</Text>
                    <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reloadButton, { backgroundColor: '#FFA726', marginTop: 12 }]}
                    onPress={async () => {
                      await updateDeliverymanStatus('Retornando a unidade', []);
                      setStatus('Retornando a unidade');
                    }}
                  >
                    <Text style={styles.reloadButtonText}>Retornar à unidade</Text>
                    <MaterialIcons name="keyboard-return" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.activeOrdersContainer}>
                  <Text style={styles.activeOrdersTitle}>Pedidos em andamento:</Text>
                  <FlatList
                    data={Array.from(new Map(activeOrders.map(order => [order.id, order])).values())}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={[
                          styles.activeOrderItem,
                          item.status === 'Cancelado' && styles.canceledOrderItem
                        ]} 
                        onPress={() => handleActiveOrderPress(item)}
                      >
                        <View> 
                          <Text style={styles.activeOrderNumber}>{item.customerName}</Text> 
                          <Text style={styles.activeOrderAddress}>{item.address}</Text>
                          <Text style={styles.activeOrderAddress}>Pedido #{item.id}</Text>
                          {item.status === 'Cancelado' && (
                            <Text style={styles.canceledOrderText}>CANCELADO</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  />
                </View>
              )}
            </>
          )}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, (isFinishingRun || isRestoringUnit || dataLoading) && styles.buttonDisabled]}
              onPress={handleStatusUpdate}
              disabled={isFinishingRun || isRestoringUnit || dataLoading}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {(isLoadingSecondaryData || isRestoringUnit || dataLoading) && !isFinishingRun && (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.buttonText}>
                  {isFinishingRun && status === 'Retornando a unidade' ? 'Finalizando...' : getButtonText()}
                </Text>
              </View>
            </TouchableOpacity>
  
            {status === 'Aguardando pedido' && (
              <Animated.View style={{ transform: [{ scale }] }}>
                <TouchableOpacity 
                  style={[styles.workButton, isFinishingExpedient && styles.buttonDisabled]} 
                  onPress={toggleWorkStatus}
                  disabled={isFinishingExpedient}
                >
                  {isFinishingExpedient ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.workButtonText}>Finalizando Expediente...</Text>
                    </View>
                  ) : (
                    <Text style={styles.workButtonText}>Finalizar Expediente</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>
  
        <MotorcycleBottomSheet
          bottomSheetRef={motorcycleBottomSheetRef}
          dummyMotorcycles={filteredMotorcycles}
          selectedMotorcycle={selectedMotorcycle}
          setSelectedMotorcycle={setSelectedMotorcycle}
          startWork={startWork}
          isStartingWork={isStartingWork}
          onClose={handleUnitSelectionCancel}
        />

        <UnitSelectionBottomSheet
          bottomSheetRef={unitSelectionBottomSheetRef}
          currentUnit={deliveryman.pharmacyUnitId}
          onConfirmCurrentUnit={handleUnitConfirmation}
          onSelectNewUnit={handleUnitSelection}
          onClose={handleUnitSelectionCancel}
          isConfirmingUnit={isConfirmingCurrentUnit}
          isSelectingNewUnit={isSelectingUnit}
        />
  
        <OrdersBottomSheet
          bottomSheetRef={ordersBottomSheetRef}
          dummyOrders={filteredOrders.filter((order: DeliverymanOrder) => 
            !activeOrders.some(ao => ao.id === order.id)
          ) as any}
          selectedOrders={selectedOrders}
          toggleOrderSelection={toggleOrderSelection}
          startDelivery={startDelivery}
          refreshOrders={refreshAvailableOrders}
          fetchAvailablePreparingOrders={fetchAvailablePreparingOrders}
          loadingPreparingOrders={loadingPreparingOrders}
          hasMoreOriginOrders={hasMoreOriginOrders}
          hasMoreTransferOrders={hasMoreTransferOrders}
          unitId={deliveryman?.pharmacyUnitId || ''}
          onSheetClose={() => setIsLoadingOrders(false)}
        />
  
        <FinishDeliveryBottomSheet
          bottomSheetRef={finishDeliveryBottomSheetRef}
          activeOrders={activeOrders as any}
          finishDelivery={finishDelivery}
          cancelDelivery={cancelDelivery}
        />

        <MotorcycleInspectionForm
          bottomSheetRef={inspectionFormBottomSheetRef}
          deliverymanName={deliveryman?.name || ''}
          motorcyclePlate={filteredMotorcycles.find(m => m.id === selectedMotorcycle)?.plate || ''}
          motorcycleId={selectedMotorcycle || ''}
          pharmacyUnitName={currentPharmacyUnit?.name || ''}
          deliverymanId={deliveryman?.id || ''}
          pharmacyUnitId={deliveryman?.pharmacyUnitId || ''}
          onSubmit={handleInspectionFormSubmit}
          onClose={handleInspectionFormClose}
          onAfterClose={handleInspectionFormAfterClose}
        />
  
        <CustomDrawer 
          isOpen={isDrawerOpen}
          setIsOpen={setIsDrawerOpen}
          selectedOrder={selectedOrderDetails as any}
        />
      </View>
    </View>
  );
};

export default DeliverymanScreen;