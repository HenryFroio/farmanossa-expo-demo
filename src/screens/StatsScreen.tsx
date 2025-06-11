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
import { useStatsData } from '../hooks/useStatsData';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import styles from '../styles/statsScreenStyles';
import { StatsScreenProps, TabType, Order } from '../types/statsTypes';
import { UserRole } from '../utils/statsUtils';
import { Trash2 } from 'lucide-react-native';

const StatsScreen: React.FC<StatsScreenProps> = ({ route }) => {
  const { type, ids, managerUnit } = route.params;
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
    startDate: getStartOfDay(new Date(new Date().setDate(1))), // Primeiro dia do mês atual, início do dia
    endDate: getEndOfDay(new Date()) // Dia atual, fim do dia
  });

  const { 
    selectedData,
    detailedStats,
    overallStats,
    topMotorcycles,
    recentOrders,
    isLoading,
    hasError
  } = useStatsData(
    type,
    ids,
    userRole as UserRole,
    user?.uid || null,
    managerUnit ?? null,
    navigation,
    dateFilter
  );

  // Adicionado para forçar a atualização dos dados quando a aba 'details' é ativada.
  // Isso é feito recriando a referência do objeto dateFilter,
  // o que dispara o useEffect em useStatsData.
  React.useEffect(() => {
    if (activeTab === 'details') {
      // Usamos o valor atual do filtro para criar uma nova instância do objeto.
      // Isso é suficiente para o React detectar uma mudança na dependência `dateFilter`
      // no hook `useStatsData`, fazendo com que os dados sejam buscados novamente.
      setDateFilter(currentFilter => ({ 
        startDate: getStartOfDay(new Date(currentFilter.startDate)), // Garante nova instância e ajuste de hora
        endDate: getEndOfDay(new Date(currentFilter.endDate))     // Garante nova instância e ajuste de hora
      }));
    }
  }, [activeTab]); // A dependência é activeTab

  const openBottomSheet = React.useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const handleDateFilterChange = (start: Date, end: Date) => {
    console.log('Date filter changed from picker:', { startDate: start, endDate: end });
    // Ajusta as datas recebidas do picker para o início e fim do dia respectivamente
    const adjustedStartDate = getStartOfDay(start);
    const adjustedEndDate = getEndOfDay(end);
    console.log('Adjusted date filter:', { startDate: adjustedStartDate, endDate: adjustedEndDate });
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4B2B" />
        <Text style={styles.loadingText}>Carregando estatísticas...</Text>
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
              onDateFilterChange={handleDateFilterChange}
              currentDateFilter={dateFilter}
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