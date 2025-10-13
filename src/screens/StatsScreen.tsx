// src/screens/StatsScreen.tsx
import React, { useRef, useState } from 'react';
import { 
  View, 
  ScrollView, 
  ActivityIndicator, 
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import OrderDetailsBottomSheet from '../components/OrderDetailsBottomSheet';
import { StatsHeader } from '../components/StatsHeader';
import { StatsTabs } from '../components/StatsTabs';
import { StatsOverviewTab } from '../components/StatsOverviewTab';
import { StatsDetailsTab } from '../components/StatsDetailsTab';
import { useAuth } from '../hooks/useAuth';
// HÍBRIDO: useStatsData (Firestore) para Overview + useStatsDataBigQuery para Details
import { useStatsData } from '../hooks/useStatsData'; // Overview Tab: tempo real
import { useStatsDataBigQuery } from '../hooks/useStatsDataBigQuery'; // Details Tab: analytics
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import styles from '../styles/statsScreenStyles';
import { StatsScreenProps, TabType, Order } from '../types/statsTypes';
import { UserRole } from '../utils/statsUtils';
import { Trash2 } from 'lucide-react-native';

const StatsScreen: React.FC<StatsScreenProps> = ({ route }) => {
  const { type, ids, managerUnit, allDeliverymenStats: allDeliverymenStatsFromRoute } = route.params;
  const navigation = useNavigation();
  const { 
    user, 
    userRole,  
    loading: authLoading, 
    deleteDeliveryman 
  } = useAuth();
  const [activeTab, setActiveTab] = React.useState<TabType>('overview');
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmationId, setConfirmationId] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationStartTime, setNavigationStartTime] = useState<number | null>(null);
  const [isDataReady, setIsDataReady] = useState(true);

  // Função auxiliar para ajustar a data para o início do dia
  const getStartOfDay = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  };

  // Função auxiliar para ajustar a data para o fim do dia
  const getEndOfDay = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  };

  const [dateFilter, setDateFilter] = useState<{ startDate: Date; endDate: Date }>({
    startDate: getStartOfDay(new Date()), // Início do dia atual (período diário)
    endDate: getEndOfDay(new Date()) // Fim do dia atual (período diário)
  });

  // OVERVIEW TAB: Sempre carrega Firestore para dados em tempo real
  const firestoreData = useStatsData(
    type,
    ids,
    userRole as UserRole,
    user?.uid || null,
    managerUnit ?? null,
    navigation,
    dateFilter
  );

  // DETAILS TAB: Só carrega BigQuery quando tab Details está ativa
  const bigQueryData = useStatsDataBigQuery(
    type,
    activeTab === 'details' ? ids : [], // Só busca quando tab Details está ativa
    userRole as UserRole,
    user?.uid || null,
    managerUnit ?? null,
    navigation,
    dateFilter
  );

  // Usar dados apropriados baseado na tab ativa
  const activeData = activeTab === 'overview' ? firestoreData : bigQueryData;
  
  // selectedData sempre vem do Firestore (tem name + id corretos)
  // Outros dados variam conforme a tab
  const { 
    detailedStats,
    overallStats,
    topMotorcycles,
    recentOrders,
    allDeliverymenStats: allDeliverymenStatsFromHook,
    isLoading,
    hasError
  } = activeData;
  
  // SEMPRE usar selectedData do Firestore (não muda entre tabs)
  const selectedData = firestoreData.selectedData;

  // Usar allDeliverymenStats dos route params se disponível (vindo da AdminScreen)
  // Caso contrário, usar do hook (fallback)
  const allDeliverymenStats = allDeliverymenStatsFromRoute || allDeliverymenStatsFromHook;

  // Debug: Verificar de onde vieram os dados
  React.useEffect(() => {
    if (allDeliverymenStatsFromRoute) {
    } else if (allDeliverymenStatsFromHook) {
    }
  }, [allDeliverymenStatsFromRoute, allDeliverymenStatsFromHook]);

  // Monitor data loading progress
  React.useEffect(() => {
  }, [isLoading, hasError, selectedData, detailedStats, overallStats, topMotorcycles, recentOrders, allDeliverymenStats]);

  // Track navigation timing
  React.useEffect(() => {
    const navigationTime = Date.now();
    setNavigationStartTime(navigationTime);
    setIsNavigating(true);
    
    return () => {
    };
  }, [type, ids]);

  // Adicionado para forçar a atualização dos dados quando a aba 'details' é ativada.
  // Isso é feito recriando a referência do objeto dateFilter,
  // o que dispara o useEffect em useStatsData.
  React.useEffect(() => {
    const tabChangeStartTime = Date.now();
    
    if (activeTab === 'details') {
      // Usamos o valor atual do filtro para criar uma nova instância do objeto.
      // Isso é suficiente para o React detectar uma mudança na dependência `dateFilter`
      // no hook `useStatsData`, fazendo com que os dados sejam buscados novamente.
      setDateFilter(currentFilter => ({ 
        startDate: getStartOfDay(new Date(currentFilter.startDate)), // Garante nova instância e ajuste de hora
        endDate: getEndOfDay(new Date(currentFilter.endDate))     // Garante nova instância e ajuste de hora
      }));
    } else {
    }
  }, [activeTab]); // A dependência é activeTab

  // Reset para aba 'overview' quando mudar para estatísticas de entregador
  React.useEffect(() => {
    const typeChangeStartTime = Date.now();
    
    if (type === 'deliveryman') {
      setActiveTab('overview');
      setIsDataReady(false); // Mark data as not ready when switching to deliveryman
    }
  }, [type, ids]); // Dependências: type e ids

  // Marcar dados como prontos quando temos dados de entregador válidos
  React.useEffect(() => {
    const readinessCheckStartTime = Date.now();
    
    
    if (type === 'deliveryman' && !isLoading && detailedStats && detailedStats.length > 0 && selectedData && selectedData.length > 0) {
      // Verificar se temos dados de status do entregador (indicador de que dados estão completos)
      const hasDeliverymanStatus = selectedData.some(data => 
        (data as any).status !== undefined && (data as any).status !== null
      );
      
      
      if (hasDeliverymanStatus) {
        // Pequeno delay para garantir que o componente renderizou
        setTimeout(() => {
          setIsDataReady(true);
        }, 100);
      }
    } else if (type === 'unit') {
      setIsDataReady(true); // Para unidades, sempre marcar como pronto
    }
    
  }, [type, isLoading, detailedStats, selectedData]);

  // Reset isNavigating quando os dados terminarem de carregar com tempo mínimo
  React.useEffect(() => {
    const completionCheckStartTime = Date.now();
    
    
    if (!isLoading && isNavigating && isDataReady && navigationStartTime) {
      const minLoadingTime = 1000; // Minimum 1 second loading
      const elapsedTime = Date.now() - navigationStartTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      // Also check if we have actual data
      const hasData = detailedStats && detailedStats.length > 0;
      
      
      if (hasData) {
        setTimeout(() => {
          setIsNavigating(false);
          setNavigationStartTime(null);
        }, remainingTime);
      }
    }
    
  }, [isLoading, isNavigating, isDataReady, navigationStartTime, detailedStats]);

  // Debug effect to monitor activeTab changes
  React.useEffect(() => {
  }, [activeTab]);

  const openBottomSheet = React.useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const handleDateFilterChange = (start: Date, end: Date) => {
    // Ajusta as datas recebidas do picker para o início e fim do dia respectivamente
    const adjustedStartDate = getStartOfDay(start);
    const adjustedEndDate = getEndOfDay(end);
    setDateFilter({ startDate: adjustedStartDate, endDate: adjustedEndDate });
  };

  const handleDeletePress = () => {
    setDeleteError('');
    setConfirmationId('');
    setShowDeleteModal(true);
  };
  
  const handleCloseBottomSheet = () => {
    setSelectedOrder(null);
  };

  const navigateToDeliverymanStats = (deliverymanId: string) => {
    setIsNavigating(true);
    setNavigationStartTime(Date.now());
    (navigation as any).navigate('Stats', { 
      type: 'deliveryman', 
      ids: [deliverymanId],
      managerUnit
    });
  };

  const handleConfirmDelete = async () => {
    if (!selectedData?.[0]?.id) return;

    if (confirmationId.trim() !== selectedData[0].id) {
      setDeleteError('ID não corresponde ao entregador selecionado');
      return;
    }

    try {
      setIsDeleting(true);
      await deleteDeliveryman(selectedData[0].id);
      setShowDeleteModal(false);
      Alert.alert('Sucesso', 'Entregador excluído com sucesso');
      navigation.goBack();
    } catch (error: any) {
      console.error('Erro ao excluir entregador:', error);
      
      if (error?.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Ação Sensível',
          'Para realizar esta ação, é necessário fazer login novamente. Por favor, deslogue e logue novamente no aplicativo.',
          [
            {
              text: 'OK',
              onPress: () => setShowDeleteModal(false)
            }
          ]
        );
      } else {
        setDeleteError('Não foi possível excluir o entregador. Tente novamente.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || !userRole) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4B2B" />
        <Text style={styles.loadingText}>
          {authLoading ? 'Verificando permissões...' : 'Carregando dados do usuário...'}
        </Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Não foi possível carregar os dados. Por favor, tente novamente mais tarde.
        </Text>
      </View>
    );
  }

  // Show loading em 2 casos:
  // 1. Primeira carga (navegação inicial) - sem dados ainda
  // 2. Navegando de outra tela
  // NÃO mostrar loading ao mudar de aba (overview → details) - skeleton cuida disso
  const shouldShowLoading = (isLoading && !detailedStats) || isNavigating || 
    (type === 'deliveryman' && !isDataReady);

  if (shouldShowLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4B2B" />
        <Text style={styles.loadingText}>
          {isNavigating 
            ? `Carregando estatísticas ${type === 'deliveryman' ? 'do entregador' : 'da unidade'}...` 
            : 'Carregando estatísticas...'
          }
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.safeArea}>
        <ScrollView style={styles.container}>
          <StatsHeader 
            type={type} 
            selectedData={selectedData}
          />
          <StatsTabs 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
          />
          {activeTab === 'overview' ? (
            <StatsOverviewTab
              type={type}
              selectedData={selectedData as any}
              detailedStats={detailedStats}
              openBottomSheet={openBottomSheet}
              userRole={userRole}
              recentOrders={recentOrders}
              setSelectedOrder={(order: Order) => setSelectedOrder(order)}
              ids={ids} // Pass the ids prop here
            />
          ) : (
            <StatsDetailsTab 
              detailedStats={detailedStats} 
              type={type}
              userRole={userRole}
              allDeliverymenStats={allDeliverymenStats}
              onNavigateToDeliveryman={navigateToDeliverymanStats}
              onDateFilterChange={handleDateFilterChange}
              currentDateFilter={dateFilter}
              bottomSheetRef={bottomSheetRef}
              setSelectedOrder={setSelectedOrder}
              ids={ids}
            />
          )}
          
          {userRole === 'admin' && 
           type === 'deliveryman' && 
           activeTab === 'overview' && 
           selectedData && 
           Array.isArray(selectedData) &&
           selectedData.length === 1 && (
            <View style={styles.deleteButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  isDeleting && styles.deleteButtonDisabled
                ]}
                onPress={handleDeletePress}
                disabled={isDeleting}
              >
                <Trash2 
                  size={16} 
                  color="white" 
                  style={styles.deleteIcon}
                />
                <Text style={styles.deleteButtonText}>
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlayD}>
            <View style={styles.modalContentD}>
              <Text style={styles.modalTitleD}>Confirmar Exclusão</Text>
              <Text style={styles.modalText}>
                Para excluir o entregador {selectedData?.[0]?.name}, digite o ID dele:
              </Text>
              <Text style={styles.modalId}>{selectedData?.[0]?.id}</Text>
              
              <TextInput
                style={styles.confirmationInput}
                value={confirmationId}
                onChangeText={setConfirmationId}
                placeholder="Digite o ID do entregador"
                placeholderTextColor="#A0AEC0"
              />
              
              {deleteError ? (
                <Text style={styles.errorText}>{deleteError}</Text>
              ) : null}

              <View style={styles.modalButtonsD}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    isDeleting && styles.deleteButtonDisabled
                  ]}
                  onPress={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  <Text style={styles.confirmButtonText}>
                    {isDeleting ? 'Excluindo...' : 'Confirmar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <OrderDetailsBottomSheet 
          bottomSheetRef={bottomSheetRef}
          order={selectedOrder}
          onClose={handleCloseBottomSheet}
          userRole={userRole as string | undefined}
        />
      </View>
    </GestureHandlerRootView>
  );
};

export default StatsScreen;
