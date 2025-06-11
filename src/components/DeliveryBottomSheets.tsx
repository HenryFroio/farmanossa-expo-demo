// src/components/DeliveryBottomSheets.tsx
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { CheckCircle2, Search, X, Check, X as XIcon, RefreshCw } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import styles from '../styles/deliveryBottomSheetsStyles';

// Função para formatar o timestamp para exibir apenas a hora no fuso horário de Brasília
const formatTime = (timestamp: any): string => {
  if (!timestamp) return '';
  
  try {
    let date;
    
    // Caso 1: É um objeto Date direto
    if (timestamp instanceof Date) {
      date = timestamp;
    }
    // Caso 2: É um timestamp do Firebase (com segundos e nanosegundos)
    else if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      date = new Date(timestamp.seconds * 1000);
    }
    // Caso 3: É um timestamp do Firebase (com toDate())
    else if (timestamp && typeof timestamp === 'object' && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    }
    // Caso 4: É uma string ISO ou timestamp numérico
    else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    }
    // Se não for nenhum dos tipos esperados
    else {
      console.log('Formato de timestamp não reconhecido:', timestamp);
      return '';
    }
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      console.log('Data inválida após conversão:', date);
      return '';
    }
    
    // Forçar o fuso horário de Brasília (GMT-3)
    const brasiliaOptions = { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo' // Brasília está em America/Sao_Paulo
    };
    
    return date.toLocaleTimeString('pt-BR', brasiliaOptions);
  } catch (error) {
    console.log('Erro ao formatar data:', error, 'Valor original:', timestamp);
    return '';
  }
};

type Order = {
  orderId: string;
  number: string;
  address: string;
  items: string[];
  status: string;
  customerName?: string;
  createdAt?: Date | string | number; // Adicionando campo para o timestamp da criação do pedido
};

type MotorcycleBottomSheetProps = {
  bottomSheetRef: React.RefObject<BottomSheet>;
  dummyMotorcycles: { id: string; plate: string }[];
  selectedMotorcycle: string | null;
  setSelectedMotorcycle: (id: string) => void;
  startWork: () => void;
};

// Extend props to include pagination controls
type OrdersBottomSheetProps = {
  bottomSheetRef: React.RefObject<BottomSheet>;
  dummyOrders: Order[];
  selectedOrders: string[];
  toggleOrderSelection: (orderId: string) => void;
  startDelivery: () => Promise<void>;
  refreshOrders?: () => Promise<void>;
  fetchAvailablePreparingOrders: (options: { unitId: string; loadMore?: boolean }) => Promise<void>;
  loadingPreparingOrders: boolean;
  hasMoreOriginOrders: boolean;
  hasMoreTransferOrders: boolean;
  unitId: string;
  onSheetClose?: () => void;
};

type FinishDeliveryBottomSheetProps = {
  bottomSheetRef: React.RefObject<BottomSheet>;
  activeOrders: Order[];
  finishDelivery: (orderId: string) => Promise<void>;
  cancelDelivery?: (orderId: string, reason: string) => Promise<void>; // Nova função para cancelar entregas
  onSheetClose?: () => void;
};

export const MotorcycleBottomSheet: React.FC<MotorcycleBottomSheetProps> = ({
  bottomSheetRef,
  dummyMotorcycles,
  selectedMotorcycle,
  setSelectedMotorcycle,
  startWork,
}) => (
  <BottomSheet
    ref={bottomSheetRef}
    index={-1}
    snapPoints={['60%']}
    enablePanDownToClose={true}
    backgroundStyle={styles.bottomSheetBackground}
  >
    <View style={styles.bottomSheetContent}>
      <Text style={styles.bottomSheetTitle}>Selecione uma moto</Text>
      <BottomSheetScrollView>
        {dummyMotorcycles.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.motorcycleItem,
              selectedMotorcycle === item.id && styles.selectedMotorcycleItem,
            ]}
            onPress={() => setSelectedMotorcycle(item.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.motorcyclePlate}>{item.plate}</Text>
          </TouchableOpacity>
        ))}
      </BottomSheetScrollView>
      <TouchableOpacity
        style={[styles.confirmButton, !selectedMotorcycle && styles.confirmButtonDisabled]}
        onPress={startWork}
        disabled={!selectedMotorcycle}
        activeOpacity={0.7}
      >
        <Text style={styles.confirmButtonText}>Confirmar</Text>
      </TouchableOpacity>
    </View>
  </BottomSheet>
);

export const OrdersBottomSheet: React.FC<OrdersBottomSheetProps> = ({
  bottomSheetRef,
  dummyOrders,
  selectedOrders,
  toggleOrderSelection,
  startDelivery,
  refreshOrders,
  fetchAvailablePreparingOrders,
  loadingPreparingOrders,
  hasMoreOriginOrders,
  hasMoreTransferOrders,
  unitId,
  onSheetClose
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOrders, setFilteredOrders] = useState(dummyOrders);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  // Efeito para filtrar os pedidos quando a query de busca ou os pedidos mudarem
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Se não houver termo de busca, mostrar todos os pedidos
      setFilteredOrders(dummyOrders);
    } else {
      // Filtrar pedidos que correspondam ao termo de busca (cliente ou endereço)
      const normalizedQuery = searchQuery.trim().toLowerCase();
      const filtered = dummyOrders.filter(order =>
        (order.customerName?.toLowerCase().includes(normalizedQuery)) ||
        order.address.toLowerCase().includes(normalizedQuery)
      );
      setFilteredOrders(filtered);
    }
  }, [searchQuery, dummyOrders]);

  // Função para converter timestamps do Firebase para objetos Date
  const getDateFromTimestamp = (timestamp: any): Date => {
    if (!timestamp) return new Date(0); // Data mínima se não houver timestamp
    
    try {
      // Timestamp do Firestore com seconds
      if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
        return new Date(timestamp.seconds * 1000);
      }
      // Timestamp do Firestore com toDate()
      else if (timestamp && typeof timestamp === 'object' && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      }
      // String ou número
      else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        return new Date(timestamp);
      }
      // Já é um Date
      else if (timestamp instanceof Date) {
        return timestamp;
      }
    } catch (error) {
      console.log('Erro ao converter data para ordenação:', error);
    }
    
    return new Date(0);
  };

  // Ordenar pedidos por data (do mais recente para o mais antigo)
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const dateA = getDateFromTimestamp(a.createdAt);
    const dateB = getDateFromTimestamp(b.createdAt);
    return dateB.getTime() - dateA.getTime(); // Ordem decrescente (mais recente primeiro)
  });

  const handleStartDelivery = () => {
    setIsLoading(true);
    // call startDelivery; loading will be cleared in onClose
    startDelivery();
  };

  const handleRefresh = async () => {
    if (!refreshOrders || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refreshOrders();
      // Feedback visual: o estilo refreshSuccessIcon será aplicado temporariamente
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 1500); // Remove o estilo após 1.5 segundos
    } catch (error) {
      console.error('Erro ao atualizar pedidos:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a lista de pedidos');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['85%']} // Aumentado de 70% para 85% para melhor visibilidade
      enablePanDownToClose={!isLoading && !isRefreshing}
      backgroundStyle={styles.bottomSheetBackground}
      onClose={() => {
        setIsLoading(false);
        setIsRefreshing(false);
        if (onSheetClose) onSheetClose();
      }}
    >
      <View style={styles.bottomSheetContent}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={styles.bottomSheetTitle}>Pedidos disponíveis</Text>
          {isLoading && <ActivityIndicator size="small" color="#4299E1" style={{marginLeft: 8}} />}
        </View>
        <View style={styles.searchContainer}>
          <Search size={20} color="#718096" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por cliente ou endereço..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#718096"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <X size={20} color="#718096" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={handleRefresh} 
            style={styles.refreshButton}
            disabled={isRefreshing}
          >
            <RefreshCw 
              size={20} 
              color={refreshSuccess ? '#48BB78' : '#4299E1'}
              style={isRefreshing ? styles.refreshingIcon : undefined}
            />
          </TouchableOpacity>
        </View>
        <BottomSheetScrollView>
          {isRefreshing ? (
            <View style={styles.refreshingContainer}>
              <ActivityIndicator size="large" color="#4299E1" />
              <Text style={styles.refreshingText}>Atualizando pedidos...</Text>
            </View>
          ) : sortedOrders.length > 0 ? (
            sortedOrders.map((item) => (
              <TouchableOpacity
                key={item.orderId}
                style={[
                  styles.orderItem,
                  selectedOrders.includes(item.orderId) && styles.selectedOrderItem,
                ]}
                onPress={() => toggleOrderSelection(item.orderId)}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <View style={styles.orderHeader}>
                  {item.customerName ? (
                    <Text style={styles.customerName}>{item.customerName}</Text>
                  ) : (
                    <Text style={styles.customerName}>Cliente</Text>
                  )}
                  <Text style={styles.orderIdSmall}>#{item.orderId}</Text>
                  {selectedOrders.includes(item.orderId) && (
                    <CheckCircle2 size={24} color="#4299E1" style={{marginLeft: 8}} />
                  )}
                </View>
                <Text style={styles.orderAddress}>{item.address}</Text>
                <View style={styles.orderItemsContainer}>
                  <Text style={styles.orderItems} numberOfLines={1} ellipsizeMode="tail">
                    {item.items.join(', ')}
                  </Text>
                  <Text style={styles.orderTime}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.emptyStateText}>
                {searchQuery ? `Nenhum pedido encontrado para "${searchQuery}"` : 'Nenhum pedido disponível no momento'}
              </Text>
            </View>
          )}
          {/* Paginated load more button */}
          {(hasMoreOriginOrders || hasMoreTransferOrders) && (
            <TouchableOpacity
              style={{
                margin: 16,
                padding: 12,
                backgroundColor: '#EDF2F7',
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={() => fetchAvailablePreparingOrders({ unitId, loadMore: true })}
              disabled={loadingPreparingOrders}
            >
              {loadingPreparingOrders ? (
                <ActivityIndicator size="small" color="#4299E1" />
              ) : (
                <Text style={{ color: '#4299E1', fontWeight: 'bold' }}>Carregar mais</Text>
              )}
            </TouchableOpacity>
          )}
        </BottomSheetScrollView>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            selectedOrders.length === 0 && styles.confirmButtonDisabled // only disable style when no orders
          ]}
          onPress={handleStartDelivery}
          disabled={selectedOrders.length === 0 || isLoading} // still disable pressing during loading
          activeOpacity={0.7}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={[styles.confirmButtonText, styles.loadingText]}>
                Iniciando entrega...
              </Text>
            </View>
          ) : (
            <Text style={styles.confirmButtonText}>
              Iniciar Entrega ({selectedOrders.length} pedido{selectedOrders.length !== 1 ? 's' : ''})
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

export const FinishDeliveryBottomSheet: React.FC<FinishDeliveryBottomSheetProps> = ({
  bottomSheetRef,
  activeOrders,
  finishDelivery,
  cancelDelivery,
  onSheetClose
}) => {
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [isCompletingDelivery, setIsCompletingDelivery] = useState(false);
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});
  const [localOrders, setLocalOrders] = useState<Order[]>([]);
  
  // Estados para modais de confirmação
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  // Sincronizar ordens locais com ordens ativas
  useEffect(() => {
    setLocalOrders(activeOrders);
  }, [activeOrders]);

  // Função para converter timestamps do Firebase para objetos Date
  const getDateFromTimestamp = (timestamp: any): Date => {
    if (!timestamp) return new Date(0); // Data mínima se não houver timestamp
    
    try {
      // Timestamp do Firestore com seconds
      if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
        return new Date(timestamp.seconds * 1000);
      }
      // Timestamp do Firestore com toDate()
      else if (timestamp && typeof timestamp === 'object' && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      }
      // String ou número
      else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        return new Date(timestamp);
      }
      // Já é um Date
      else if (timestamp instanceof Date) {
        return timestamp;
      }
    } catch (error) {
      console.log('Erro ao converter data para ordenação:', error);
    }
    
    return new Date(0);
  };
  
  // Ordenar pedidos por data (do mais recente para o mais antigo)
  const sortedOrders = Array.from(
    new Map(localOrders.map(order => [order.orderId, order])).values()
  ).sort((a, b) => {
    const dateA = getDateFromTimestamp(a.createdAt);
    const dateB = getDateFromTimestamp(b.createdAt);
    return dateB.getTime() - dateA.getTime(); // Ordem decrescente (mais recente primeiro)
  });

  const handleFinishDelivery = async (orderId: string) => {
    setPendingOrderId(orderId);
    setShowFinishConfirmModal(true);
  };

  const confirmFinishDelivery = async () => {
    if (!pendingOrderId) return;

    swipeableRefs.current[pendingOrderId]?.close();
    setLoadingOrderId(pendingOrderId);
    setIsCompletingDelivery(true);
    setLocalOrders(prevOrders => prevOrders.filter(order => order.orderId !== pendingOrderId));
    setShowFinishConfirmModal(false);

    const safetyTimer = setTimeout(() => {
      setLoadingOrderId(null);
      setIsCompletingDelivery(false);
      Alert.alert("Operação demorada", "A operação está demorando mais que o esperado.");
    }, 20000);

    try {
      await finishDelivery(pendingOrderId);
    } catch (error) {
      console.error('Erro ao finalizar entrega:', error);
      Alert.alert('Erro', 'Não foi possível finalizar a entrega. Tente novamente.');
    } finally {
      clearTimeout(safetyTimer);
      setLoadingOrderId(null);
      setIsCompletingDelivery(false);
      setPendingOrderId(null);
    }
  };

  const handleCancelDelivery = async (orderId: string) => {
    setPendingOrderId(orderId);
    setShowCancelConfirmModal(true);
  };

  const confirmCancelDelivery = async () => {
    if (!pendingOrderId || !cancelDelivery) return;

    swipeableRefs.current[pendingOrderId]?.close();
    setLoadingOrderId(pendingOrderId);
    setIsCompletingDelivery(true);
    setLocalOrders(prevOrders => prevOrders.filter(order => order.orderId !== pendingOrderId));
    setShowCancelConfirmModal(false);

    const safetyTimer = setTimeout(() => {
      setLoadingOrderId(null);
      setIsCompletingDelivery(false);
      Alert.alert("Operação demorada", "A operação está demorando mais que o esperado.");
    }, 20000);

    const defaultReason = "Não foi possível completar a entrega, entre em contato com a unidade que fez o pedido.";

    try {
      await cancelDelivery(pendingOrderId, defaultReason);
    } catch (error) {
      console.error('Erro ao cancelar entrega:', error);
      Alert.alert('Erro', 'Não foi possível cancelar a entrega. Tente novamente.');
    } finally {
      clearTimeout(safetyTimer);
      setLoadingOrderId(null);
      setIsCompletingDelivery(false);
      setPendingOrderId(null);
    }
  };

  const renderRightActions = (orderId: string) => {
    return (
      <View style={[styles.swipeActionContainer, styles.completeActionContainer]}>
        <Check size={24} color="#FFFFFF" style={styles.swipeActionIcon} />
        <Text style={styles.swipeActionText}>Finalizar</Text>
      </View>
    );
  };

  const renderLeftActions = (orderId: string) => {
    return (
      <View style={[styles.swipeActionContainer, styles.cancelActionContainer]}>
        <XIcon size={24} color="#FFFFFF" style={styles.swipeActionIcon} />
        <Text style={styles.swipeActionText}>Cancelar</Text>
      </View>
    );
  };

  useEffect(() => {
    const resetStates = () => {
      setLoadingOrderId(null);
      setIsCompletingDelivery(false);
    };

    return () => resetStates();
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['85%']} 
      enablePanDownToClose={!loadingOrderId && !isCompletingDelivery}
      backgroundStyle={styles.bottomSheetBackground}
      onClose={() => {
        setLoadingOrderId(null);
        setIsCompletingDelivery(false);
        if (onSheetClose) onSheetClose();
      }}
    >
      <View style={styles.bottomSheetContent}>
        <View style={[styles.headerContainer, {flexDirection: 'row', alignItems: 'center'}]}>
          <Text style={styles.bottomSheetTitle}>Pedidos em entrega</Text>
          {isCompletingDelivery && <ActivityIndicator size="small" color="#4299E1" style={{marginLeft: 8}} />}
        </View>
        
        {sortedOrders.length === 0 && isCompletingDelivery ? (
          <View style={styles.globalLoadingContainer}>
            <ActivityIndicator size="large" color="#4299E1" />
            <Text style={styles.globalLoadingText}>
              Finalizando entregas...
            </Text>
          </View>
        ) : sortedOrders.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Text style={styles.emptyStateText}>
              Não há pedidos em entrega no momento
            </Text>
          </View>
        ) : (
          <View style={{flex: 1}}>
            <BottomSheetScrollView contentContainerStyle={{paddingBottom: 50}}>
              {sortedOrders.map((item) => (
                <View key={item.orderId} style={styles.swipeContainer}>
                  <Swipeable
                    ref={ref => swipeableRefs.current[item.orderId] = ref}
                    renderRightActions={() => renderLeftActions(item.orderId)}
                    renderLeftActions={() => renderRightActions(item.orderId)}
                    onSwipeableRightOpen={() => handleCancelDelivery(item.orderId)}
                    onSwipeableLeftOpen={() => handleFinishDelivery(item.orderId)}
                    enabled={!loadingOrderId && !isCompletingDelivery && item.status !== 'Cancelado'}
                    containerStyle={styles.swipeContainer}
                    friction={2}
                    rightThreshold={40}
                    leftThreshold={40}
                    overshootRight={false}
                    overshootLeft={false}
                    overshootFriction={8}
                  >
                    <View
                      style={[
                        styles.orderItem,
                        loadingOrderId === item.orderId && styles.loadingOrderItem,
                        item.status === 'Cancelado' && styles.canceledOrderItem
                      ]}
                    >
                      {loadingOrderId === item.orderId ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="small" color="#4299E1" />
                          <Text style={styles.loadingText}>
                            {item.status === 'Cancelado' ? 'Confirmando cancelamento...' : 'Finalizando pedido...'}
                          </Text>
                        </View>
                      ) : (
                        <>
                          <View style={styles.orderHeader}>
                            {item.customerName ? (
                              <Text style={styles.customerName}>{item.customerName}</Text>
                            ) : (
                              <Text style={styles.customerName}>Cliente</Text>
                            )}
                            <Text style={styles.orderIdSmall}>#{item.orderId}</Text>
                            {item.status === 'Cancelado' && (
                              <Text style={styles.canceledBadge}>CANCELADO</Text>
                            )}
                          </View>
                          <Text style={[
                            styles.orderAddress,
                            item.status === 'Cancelado' && styles.canceledText
                          ]}>
                            {item.address}
                          </Text>
                          <View style={styles.orderItemsContainer}>
                            <Text style={[
                              styles.orderItems,
                              item.status === 'Cancelado' && styles.canceledText
                            ]} numberOfLines={1} ellipsizeMode="tail">
                              {item.items.join(', ')}
                            </Text>
                            <Text style={[
                              styles.orderTime,
                              item.status === 'Cancelado' && styles.canceledText
                            ]}>
                              {formatTime(item.createdAt)}
                            </Text>
                          </View>
                        </>
                      )}              
                    </View>
                  </Swipeable>
                </View>
              ))}
            </BottomSheetScrollView>
            
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionText}>
                <Text style={[styles.instructionArrow, styles.finishArrow]}>→</Text>
                <Text style={styles.finishText}> Deslize para a direita para finalizar</Text>
              </Text>
              <Text style={styles.instructionText}>
                <Text style={[styles.instructionArrow, styles.cancelArrow]}>←</Text>
                <Text style={styles.cancelText}> Deslize para a esquerda para cancelar</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Modal de confirmação para finalizar entrega */}
        <Modal
          transparent={true}
          visible={showFinishConfirmModal}
          animationType="fade"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Confirmar Finalização</Text>
              <Text style={styles.modalMessage}>
                Tem certeza que deseja finalizar este pedido?
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={confirmFinishDelivery}
                >
                  <Text style={styles.modalButtonText}>Sim</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setShowFinishConfirmModal(false)}
                >
                  <Text style={styles.modalButtonText}>Não</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de confirmação para cancelar entrega */}
        <Modal
          transparent={true}
          visible={showCancelConfirmModal}
          animationType="fade"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Confirmar Cancelamento</Text>
              <Text style={styles.modalMessage}>
                Tem certeza que deseja cancelar este pedido?
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={confirmCancelDelivery}
                >
                  <Text style={styles.modalButtonText}>Sim</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setShowCancelConfirmModal(false)}
                >
                  <Text style={styles.modalButtonText}>Não</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </BottomSheet>
  );
};