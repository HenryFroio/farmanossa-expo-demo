import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  Image, 
  Dimensions, 
  Modal, 
  TextInput, 
  Alert, 
  TouchableOpacity, 
  Animated
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Star, Phone, MapPin, User, Store, ClipboardCheck, Calendar, DollarSign } from 'lucide-react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import styles from '../styles/orderDetailsBottomSheetStyles';

interface Order {
  id: string;
  number: string;
  orderId?: string;
  status: string;
  date: any;
  price: string;
  items: string[];
  deliveryManName?: string;
  licensePlate?: string;
  deliveryMan?: string;
  rating?: number;
  reviewComment?: string;
  cancelReason?: string;
  address?: string;
  customerName?: string;
  customerPhone?: string;
  sellerName?: string;
  sellerId?: string;
  pharmacyUnitId?: string;
  location?: any; // Coordenadas GPS ou null se não informado
  statusHistory?: Array<{
    status: string;
    timestamp: any;
    reason?: string;
    note?: string;
  }>;
}

interface OrderDetailsBottomSheetProps {
  order: Order | null;
  bottomSheetRef: React.RefObject<BottomSheet>;
  onClose: () => void;
  userRole?: string;
}

interface DeliveryLocation {
  latitude: number;
  longitude: number;
  timestamp: any;
}

const OrderDetailsBottomSheet: React.FC<OrderDetailsBottomSheetProps> = ({ 
  order, 
  bottomSheetRef,
  onClose,
  userRole
}) => {
  const [showMap, setShowMap] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const snapPoints = useMemo(() => ['95%'], []);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [refreshingOrder, setRefreshingOrder] = useState(false);
  const [bottomSheetIndex, setBottomSheetIndex] = useState(-1); // novo estado
  
  // Modal animation values
  const modalFadeAnim = React.useRef(new Animated.Value(0)).current;
  const modalContentAnim = React.useRef(new Animated.Value(0)).current;
  
  const isAdmin = userRole === 'admin' || userRole === 'manager';

  // Função para converter timestamp do Firestore em Date
  const convertFirestoreTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    
    if (timestamp._seconds) {
      return new Date(timestamp._seconds * 1000);
    }
    
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    return null;
  };

  // Função para calcular tempo entre etapas e tempo total
  const calculateDeliveryTimings = (statusHistory?: Array<{status: string; timestamp: any}>) => {
    if (!statusHistory || statusHistory.length === 0) {
      return null;
    }

    const stages = ['Pendente', 'Em Preparação', 'A caminho', 'Entregue'];
    const timings: {[key: string]: {start: Date | null, end: Date | null, duration: number}} = {};
    let totalTime = 0;

    // Organizar status history por ordem cronológica
    const sortedHistory = [...statusHistory].sort((a, b) => {
      const dateA = convertFirestoreTimestamp(a.timestamp);
      const dateB = convertFirestoreTimestamp(b.timestamp);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });

    // Calcular duração de cada etapa
    for (let i = 0; i < sortedHistory.length - 1; i++) {
      const currentStage = sortedHistory[i];
      const nextStage = sortedHistory[i + 1];
      
      const startTime = convertFirestoreTimestamp(currentStage.timestamp);
      const endTime = convertFirestoreTimestamp(nextStage.timestamp);
      
      if (startTime && endTime) {
        const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // em minutos
        timings[currentStage.status] = {
          start: startTime,
          end: endTime,
          duration: duration
        };
      }
    }

    // Calcular tempo total da entrega (do primeiro status até entregue)
    if (sortedHistory.length >= 2) {
      const firstStage = convertFirestoreTimestamp(sortedHistory[0].timestamp);
      const lastStage = convertFirestoreTimestamp(sortedHistory[sortedHistory.length - 1].timestamp);
      
      if (firstStage && lastStage) {
        totalTime = (lastStage.getTime() - firstStage.getTime()) / (1000 * 60); // em minutos
      }
    }

    return {
      timings,
      totalTime,
      sortedHistory
    };
  };
  // Função para formatar tempo em formato legível
  const formatDuration = (minutes: number): string => {
    if (!minutes || isNaN(minutes) || minutes < 1) return 'Menos de 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}min`;
  };

  // Atualiza currentOrder e controla abertura do BottomSheet
  useEffect(() => {
    if (order) {
      setCurrentOrder(order);
      setBottomSheetIndex(0); // abre o BottomSheet
    } else {
      setCurrentOrder(null);
      setBottomSheetIndex(-1); // fecha o BottomSheet
    }
  }, [order]);

  // Handle modal animations
  useEffect(() => {
    if (cancelModalVisible) {
      // Animate overlay first
      Animated.timing(modalFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Then animate modal content with slight delay for better effect
      setTimeout(() => {
        Animated.spring(modalContentAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }, 150);
    } else {
      // Reverse animation when closing
      Animated.parallel([
        Animated.timing(modalContentAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [cancelModalVisible, modalFadeAnim, modalContentAnim]);

  // Function to refresh order data
  const refreshOrderData = useCallback(async () => {
    if (!currentOrder?.id) return;
    
    try {
      setRefreshingOrder(true);
      const orderRef = doc(db, 'orders', currentOrder.id);
      const orderDoc = await getDoc(orderRef);
      
      if (orderDoc.exists()) {
        const freshOrderData = {
          id: orderDoc.id,
          ...orderDoc.data(),
        } as Order;
        setCurrentOrder(freshOrderData);
      }
    } catch (error) {
      console.error("Error refreshing order data:", error);
    } finally {
      setRefreshingOrder(false);
    }
  }, [currentOrder?.id]);

  // Location tracking for delivery
  useEffect(() => {
    if (!showMap || !currentOrder?.id) return;

    const deliveryRunsRef = collection(db, 'deliveryRuns');
    const q = query(
      deliveryRunsRef,
      where('orderIds', 'array-contains', currentOrder.id),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        console.log('Nenhuma corrida ativa encontrada para este pedido');
        return;
      }

      const deliveryRun = snapshot.docs[0].data();
      
      if (deliveryRun.checkpoints && deliveryRun.checkpoints.length > 0) {
        const lastCheckpoint = deliveryRun.checkpoints[deliveryRun.checkpoints.length - 1];
        setDeliveryLocation({
          latitude: lastCheckpoint.latitude,
          longitude: lastCheckpoint.longitude,
          timestamp: lastCheckpoint.timestamp
        });
      }
    }, (error) => {
      console.error('Erro ao monitorar localização:', error);
    });

    return () => {
      unsubscribe();
      setDeliveryLocation(null);
    };
  }, [showMap, currentOrder?.id]);

  const formatFirestoreTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Data não disponível';
    
    if (timestamp._seconds) {
      return new Date(timestamp._seconds * 1000).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return 'Data inválida';
  };

  const renderRating = (rating?: number) => {
    if (!rating && rating !== 0) {
      return (
        <View style={styles.noRatingContainer}>
          <Text style={styles.noRatingText}>Não avaliado</Text>
        </View>
      );
    }

    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={20}
            fill={star <= rating ? '#FFD700' : 'transparent'}
            color={star <= rating ? '#FFD700' : '#718096'}
            style={styles.starIcon}
          />
        ))}
      </View>
    );
  };

  const handleBottomSheetClose = () => {
    setShowMap(false);
    setDeliveryLocation(null);
    onClose();
  };

  const renderMap = () => {
    if (!deliveryLocation) {
      return (
        <View style={styles.loadingContainer}>
          <Text>Carregando localização do entregador...</Text>
        </View>
      );
    }

    return (
      <MapView
        style={styles.map}
        region={{
          latitude: deliveryLocation.latitude,
          longitude: deliveryLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={{
            latitude: deliveryLocation.latitude,
            longitude: deliveryLocation.longitude,
          }}
          title="Entregador"
          description="Localização atual do entregador"
        >
          <Image
            source={require('../assets/moto-icon.png')}
            style={styles.markerImage}
            resizeMode="contain"
          />
        </Marker>
      </MapView>
    );
  };

  const handleCancelOrder = async () => {
    if (!currentOrder || !cancelReason.trim()) {
      Alert.alert('Erro', 'Por favor, informe o motivo do cancelamento.');
      return;
    }

    try {
      const orderRef = doc(db, 'orders', currentOrder.id);
      
      // Update order status and add cancel reason
      await updateDoc(orderRef, {
        status: 'Cancelado',
        cancelReason: cancelReason.trim(),
        lastStatusUpdate: new Date(),
        isInPreparation: false,
        isPending: false,
        isInDelivery: false,
        isDelivered: false
      });

      // Add cancellation to status history
      await updateDoc(orderRef, {
        statusHistory: [
          ...(currentOrder.statusHistory || []), 
          {
            status: 'Cancelado',
            timestamp: new Date(),
            reason: cancelReason.trim()
          }
        ]
      });

      // Close the modal and clear input
      setCancelModalVisible(false);
      setCancelReason('');
      
      // Refresh order data immediately
      await refreshOrderData();
      
      Alert.alert('Sucesso', 'Pedido cancelado com sucesso.');
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      Alert.alert('Erro', 'Não foi possível cancelar o pedido. Tente novamente.');
    }
  };

  const handleReactivateOrder = async () => {
    if (!currentOrder) return;

    try {
      const orderRef = doc(db, 'orders', currentOrder.id);
      
      // Update order status to "Em Preparação" and remove deliveryMan and licensePlate
      await updateDoc(orderRef, {
        status: 'Em Preparação',
        deliveryMan: null,
        licensePlate: null,
        lastStatusUpdate: new Date(),
        isInPreparation: true,
        isPending: false,
        isInDelivery: false,
        isDelivered: false
      });

      // Add reactivation to status history
      await updateDoc(orderRef, {
        statusHistory: [
          ...(currentOrder.statusHistory || []), 
          {
            status: 'Em Preparação',
            timestamp: new Date(),
            note: 'Pedido reativado'
          }
        ]
      });

      // Refresh order data immediately
      await refreshOrderData();
      
      Alert.alert('Sucesso', 'Pedido reativado com sucesso.');
    } catch (error) {
      console.error('Erro ao reativar pedido:', error);
      Alert.alert('Erro', 'Não foi possível reativar o pedido. Tente novamente.');
    }
  };

  const closeModal = () => {
    Animated.timing(modalContentAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    Animated.timing(modalFadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCancelModalVisible(false);
      setCancelReason('');
    });
  };

  if (!currentOrder) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      index={bottomSheetIndex}
      onChange={setBottomSheetIndex}
      onClose={handleBottomSheetClose}
      backgroundStyle={styles.bottomSheetBackground}
    >
      <View style={styles.bottomSheetContent}>
        <View style={styles.bottomSheetHeader}>
          <Text style={styles.bottomSheetTitle}>
            Pedido #{currentOrder.orderId || currentOrder.number || currentOrder.id}
          </Text>          
          <View style={[styles.statusBadge, (styles as any)[`status${currentOrder.status.replace(/\s/g, '')}`]]}>
            <Text style={styles.statusText}>{currentOrder.status}</Text>
          </View>
        </View>
        
        {refreshingOrder ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Atualizando dados do pedido...</Text>
          </View>
        ) : (
          <BottomSheetScrollView 
            style={styles.scrollContainer} 
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={true}
          >
            {/* Informações do cliente */}
            {currentOrder.customerName && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <User size={16} color="#718096" />
                </View>
                <Text style={styles.infoLabel}>Cliente:</Text>
                <Text style={styles.infoValue}>{currentOrder.customerName}</Text>
              </View>
            )}
            
            {currentOrder.customerPhone && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Phone size={16} color="#718096" />
                </View>
                <Text style={styles.infoLabel}>Telefone:</Text>
                <Text style={styles.infoValue}>{currentOrder.customerPhone}</Text>
              </View>
            )}
            
            {currentOrder.address && (
              <View style={styles.infoRowAddress}>
                <View style={styles.addressHeader}>
                  <View style={styles.infoIconContainer}>
                    <MapPin size={16} color="#718096" />
                  </View>
                  <Text style={styles.infoLabel}>Endereço:</Text>
                </View>
                <Text style={styles.addressText}>{currentOrder.address}</Text>
              </View>
            )}

            {/* Informação sobre localização GPS */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons 
                  name={currentOrder.location ? "gps-fixed" : "gps-off"} 
                  size={16} 
                  color={currentOrder.location ? "#38A169" : "#E53E3E"} 
                />
              </View>
              <Text style={styles.infoLabel}>Localização GPS:</Text>
              <Text style={[
                styles.infoValue, 
                { color: currentOrder.location ? "#38A169" : "#E53E3E" }
              ]}>
                {currentOrder.location ? "Disponível" : "Não informada"}
              </Text>
            </View>

            {/* Alerta sobre localização não informada */}
            {!currentOrder.location && (
              <View style={[styles.cancelReasonContainer, { 
                backgroundColor: '#FFF3CD', 
                borderLeftColor: '#FF8C00',
                borderLeftWidth: 4 
              }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <MaterialIcons name="warning" size={16} color="#FF8C00" />
                  <Text style={[styles.cancelReasonLabel, { 
                    color: '#B45309', 
                    marginLeft: 6,
                    marginBottom: 0 
                  }]}>
                    Atenção: Localização não informada
                  </Text>
                </View>
                <Text style={[styles.cancelReasonText, { color: '#92400E' }]}>
                  O vendedor não informou a localização GPS. O entregador precisará usar apenas o endereço textual para encontrar o destino.
                </Text>
              </View>
            )}

            {/* Confirmação de localização disponível */}
            {currentOrder.location && (
              <View style={[styles.cancelReasonContainer, { 
                backgroundColor: '#D1FAE5', 
                borderLeftColor: '#38A169',
                borderLeftWidth: 4 
              }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <MaterialIcons name="check-circle" size={16} color="#38A169" />
                  <Text style={[styles.cancelReasonLabel, { 
                    color: '#059669', 
                    marginLeft: 6,
                    marginBottom: 0 
                  }]}>
                    Localização GPS disponível
                  </Text>
                </View>
                <Text style={[styles.cancelReasonText, { color: '#047857' }]}>
                  O vendedor informou as coordenadas GPS. O entregador poderá navegar diretamente até o destino.
                </Text>
              </View>
            )}

            {/* Informações do pedido */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Calendar size={16} color="#718096" />
              </View>
              <Text style={styles.infoLabel}>Data:</Text>
              <Text style={styles.infoValue}>
                {formatFirestoreTimestamp(currentOrder.date)}
              </Text>
            </View>
              <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <DollarSign size={16} color="#718096" />
              </View>
              <Text style={styles.infoLabel}>Preço Total:</Text>
              <Text style={styles.infoValue}>{currentOrder.price}</Text>
            </View>

            {/* Informações do vendedor */}
            {currentOrder.sellerName && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Store size={16} color="#718096" />
                </View>
                <Text style={styles.infoLabel}>Vendedor:</Text>
                <Text style={styles.infoValue}>{currentOrder.sellerName}</Text>
              </View>
            )}

            {/* Motivo de cancelamento - se aplicável */}
            {currentOrder.status === 'Cancelado' && currentOrder.cancelReason && (
              <View style={styles.cancelReasonContainer}>
                <Text style={styles.cancelReasonLabel}>Motivo do Cancelamento:</Text>
                <Text style={styles.cancelReasonText}>{currentOrder.cancelReason}</Text>
              </View>
            )}

            {/* Itens do Pedido */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons name="shopping-bag" size={18} color="#4A5568" />
                <Text style={styles.sectionTitle}>Itens do Pedido</Text>
              </View>
              
              <View style={styles.itemsContainer}>
                {currentOrder.items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemText}>{item}</Text>
                    <View style={styles.itemDot} />
                  </View>
                ))}
              </View>
            </View>

            {/* Entregador - se aplicável */}
            {currentOrder.deliveryManName && currentOrder.status !== 'Cancelado' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionTitleContainer}>
                  <MaterialIcons name="delivery-dining" size={18} color="#4A5568" />
                  <Text style={styles.sectionTitle}>Informações do Entregador</Text>
                </View>
                
                <View style={styles.infoCard}>
                  <View style={styles.infoCardRow}>
                    <Text style={styles.infoCardLabel}>Nome:</Text>
                    <Text style={styles.infoCardValue}>{currentOrder.deliveryManName}</Text>
                  </View>
                  
                  {currentOrder.licensePlate && (
                    <View style={styles.infoCardRow}>
                      <Text style={styles.infoCardLabel}>Placa da Moto:</Text>
                      <Text style={styles.infoCardValue}>{currentOrder.licensePlate}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Mapa de localização - apenas para pedidos em entrega */}
            {currentOrder.status === 'A caminho' && (
              <View style={styles.sectionContainer}>
                {!showMap ? (
                  <TouchableOpacity
                    style={styles.mapButton}
                    onPress={() => setShowMap(true)}
                  >
                    <Text style={styles.mapButtonText}>
                      Acompanhar entrega em tempo real
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={styles.sectionTitleContainer}>
                      <MaterialIcons name="location-on" size={18} color="#4A5568" />
                      <Text style={styles.sectionTitle}>Localização do Entregador</Text>
                    </View>
                    <View style={styles.mapContainer}>
                      {renderMap()}
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Avaliação - somente para pedidos entregues */}
            {currentOrder.status === 'Entregue' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionTitleContainer}>
                  <MaterialIcons name="star" size={18} color="#4A5568" />
                  <Text style={styles.sectionTitle}>Avaliação da Entrega</Text>
                </View>
                
                <View style={styles.infoCard}>
                  <View style={styles.ratingContainer}>
                    {renderRating(currentOrder.rating)}
                  </View>
                  
                  {currentOrder.reviewComment && (
                    <View style={styles.reviewContainer}>
                      <Text style={styles.reviewLabel}>Comentário:</Text>
                      <Text style={styles.reviewText}>{currentOrder.reviewComment}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Informações do Vendedor - visible only for admin/manager */}
            {isAdmin && currentOrder.sellerName && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionTitleContainer}>
                  <MaterialIcons name="store" size={18} color="#4A5568" />
                  <Text style={styles.sectionTitle}>Informações do Vendedor</Text>
                </View>
                
                <View style={styles.infoCard}>
                  <View style={styles.infoCardRow}>
                    <Text style={styles.infoCardLabel}>Vendedor:</Text>
                    <Text style={styles.infoCardValue}>{currentOrder.sellerName}</Text>
                  </View>
                  
                  {currentOrder.pharmacyUnitId && (
                    <View style={styles.infoCardRow}>
                      <Text style={styles.infoCardLabel}>Unidade:</Text>
                      <Text style={styles.infoCardValue}>{currentOrder.pharmacyUnitId}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Informações de Tempo de Entrega - visible only for admin/manager */}
            {isAdmin && currentOrder.statusHistory && currentOrder.statusHistory.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionTitleContainer}>
                  <MaterialIcons name="schedule" size={18} color="#4A5568" />
                  <Text style={styles.sectionTitle}>Tempo de Entrega</Text>
                </View>
                
                {(() => {
                  const deliveryTimings = calculateDeliveryTimings(currentOrder.statusHistory);
                  if (!deliveryTimings) return null;

                  const { timings, totalTime } = deliveryTimings;

                  return (
                    <View style={styles.infoCard}>
                      {/* Tempo total */}
                      <View style={styles.timingTotalRow}>
                        <Text style={styles.timingTotalLabel}>Tempo Total:</Text>
                        <Text style={styles.timingTotalValue}>{formatDuration(totalTime)}</Text>
                      </View>
                      
                      {/* Tempos por etapa */}
                      <View style={styles.timingStagesContainer}>
                        <Text style={styles.timingStagesTitle}>Tempo por Etapa:</Text>
                        
                        {Object.entries(timings).map(([stage, timing]) => (
                          <View key={stage} style={styles.timingStageRow}>
                            <View style={styles.timingStageInfo}>
                              <Text style={styles.timingStageLabel}>{stage}:</Text>
                              <Text style={styles.timingStageDuration}>
                                {formatDuration(timing.duration)}
                              </Text>
                            </View>
                            {timing.start && timing.end && (
                              <Text style={styles.timingStageTimeRange}>
                                {timing.start.toLocaleTimeString('pt-BR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })} - {timing.end.toLocaleTimeString('pt-BR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })()}
              </View>
            )}            
            {/* Controles do Admin */}
            {isAdmin && (
              <View style={styles.adminControlsContainer}>
                {currentOrder.status !== 'Cancelado' ? (
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setCancelModalVisible(true)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar Pedido</Text>
                  </TouchableOpacity>
                ) : currentOrder.status === 'Cancelado' ? (
                  <TouchableOpacity 
                    style={styles.reactivateButton}
                    onPress={handleReactivateOrder}
                  >
                    <Text style={styles.reactivateButtonText}>Reativar Pedido</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
            
            {/* Adicione padding extra no final para evitar que o conteúdo fique cortado */}
            <View style={styles.bottomPadding} />
          </BottomSheetScrollView>
        )}
      </View>

      {/* Modal de cancelamento com animações melhoradas */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeModal}
      >
        <Animated.View 
          style={[styles.modalOverlay, { opacity: modalFadeAnim }]}
        >
          <Pressable 
            style={styles.modalTouchableOverlay} 
            onPress={closeModal}
          />
          
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                opacity: modalContentAnim,
                transform: [{ 
                  scale: modalContentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1]
                  }) 
                }]
              }
            ]}
          >
            <Text style={styles.modalTitle}>Cancelar Pedido</Text>
            <Text style={styles.modalSubtitle}>
              Informe o motivo do cancelamento deste pedido:
            </Text>
            
            <TextInput
              style={styles.cancelReasonInput}
              multiline
              numberOfLines={4}
              placeholder="Digite o motivo do cancelamento..."
              placeholderTextColor="#A0AEC0"
              value={cancelReason}
              onChangeText={setCancelReason}
            />
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeModal}
              >
                <Text style={styles.modalCancelButtonText}>Voltar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleCancelOrder}
              >
                <Text style={styles.modalConfirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </BottomSheet>
  );
};

export default OrderDetailsBottomSheet;