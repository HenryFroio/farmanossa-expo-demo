// src/components/StatsOverviewTab.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import OrderSelectionModal from './OrderSelectionModal';
import PontoModal from './PontoModal';
import PicoModal from './PicoModal';
import FolhaPontoModal from './FolhaPontoModal';
import styles from '../styles/statsScreenStyles';
import { Order } from '../types/statsTypes'; // Import Order from statsTypes
import { useNavigation } from '@react-navigation/native'; // Import useNavigation

interface StatsOverviewTabProps {
  type: string;
  selectedData?: Array<{
    status: string;
    orderId?: string[];
    id?: string;
    name?: string;
  }>;
  detailedStats?: Array<{
    totalRatings?: number;
    averageRating?: number;
  }>;
  userRole?: string;
  openBottomSheet: () => void;
  recentOrders?: Order[];
  setSelectedOrder: (order: Order) => void;
  ids: string[]; // Add ids to props
}

// Componente para exibir as estrelas de avaliação
const RatingStars = ({ rating }: { rating: number }) => {
  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialIcons
          key={star}
          name={star <= rating ? 'star' : star - 0.5 <= rating ? 'star-half' : 'star-border'}
          size={24}
          color="#FFD700"
          style={styles.starIcon}
        />
      ))}
    </View>
  );
};

// Componente para exibir um pedido recente
const RecentOrderItem = ({ order, onPress }: { 
  order: Order;
  onPress: (order: Order) => void;
}) => (
  <TouchableOpacity
    style={styles.orderItem}
    onPress={() => onPress(order)}
    activeOpacity={0.7}
  >
    <View style={styles.orderHeader}>
      <Text style={styles.orderNumber}>Pedido #{order.id}</Text>
      <Text style={styles.orderDate}>
        {new Date(order.date).toLocaleDateString()}
      </Text>
    </View>
    <View style={styles.orderDetails}>
      <MaterialIcons name="person" size={16} color="#666" style={styles.orderIcon} />
      <Text style={styles.customerName}>{order.customerName}</Text>
    </View>
    <View style={styles.orderStatus}>
      <MaterialIcons name="delivery-dining" size={16} color="#FF4B2B" style={styles.orderIcon} />
      <Text style={styles.statusText}>{order.status}</Text>
    </View>
  </TouchableOpacity>
);

export const StatsOverviewTab: React.FC<StatsOverviewTabProps> = ({
  type,
  selectedData = [],
  detailedStats = [],
  userRole,
  openBottomSheet,
  recentOrders = [],
  setSelectedOrder,
  ids // Destructure ids from props
}) => {  const [isOrderSelectionVisible, setIsOrderSelectionVisible] = useState(false);
  const [isPontoModalVisible, setIsPontoModalVisible] = useState(false); // State for PontoModal
  const [isPicoModalVisible, setIsPicoModalVisible] = useState(false); // State for PicoModal
  const [isFolhaPontoModalVisible, setIsFolhaPontoModalVisible] = useState(false); // State for FolhaPontoModal
  const navigation = useNavigation(); // Initialize navigation

  // Handle order click
  const handleOrderPress = (order: Order) => {
    setSelectedOrder(order);
    openBottomSheet();
  };

  // Calculando a média geral de avaliações e total
  const totalRatings = detailedStats?.reduce((acc, stat) => acc + (stat.totalRatings || 0), 0) || 0;
  const averageRating = totalRatings > 0 
    ? detailedStats?.reduce((acc, stat) => acc + ((stat.averageRating || 0) * (stat.totalRatings || 0)), 0) / totalRatings 
    : 0;

  // Combinar todos os orderIds e status dos selectedData
  const combinedDeliveryStatus = selectedData.reduce(
    (acc, curr) => {
      // Se algum entregador estiver em rota, mostramos como "Em rota de entrega"
      if (curr.status === 'Em rota de entrega') {
        return {
          status: 'Em rota de entrega',
          orderIds: [...(acc.orderId || []), ...(curr.orderId || [])] // Corrected: acc.orderId
        };
      }
      // Se não houver status em rota, mostramos o status do último entregador
      return {
        status: curr.status,
        orderIds: [...(acc.orderId || []), ...(curr.orderId || [])] // Corrected: acc.orderId
      };
    },
    { status: '', orderIds: [] as string[] } // Keep orderIds here for the accumulator type
  );

  const handleStatusCardPress = () => {
    if (combinedDeliveryStatus.orderIds.length > 0 && combinedDeliveryStatus.status === 'Em rota de entrega') {
      setIsOrderSelectionVisible(true);
    }
  };
  const handleSeeMoreOrders = () => {
    // Navigate to OrdersScreen, passing necessary params
    (navigation as any).navigate('OrdersScreen', {
      type,
      ids,
      initialDate: new Date().toISOString() // Pass current date as initialDate
    });
  };

  return (
    <View style={styles.container}>
      {type === 'deliveryman' && selectedData?.length > 0 && (
        <TouchableOpacity
          style={styles.statusCard}
          onPress={handleStatusCardPress}
          activeOpacity={0.7}
        >
          <Text style={styles.statusTitle}>Status Atual</Text>
          <View style={styles.statusInfo}>
            <MaterialIcons name="info" size={24} color="#FF4B2B" />
            <Text style={styles.statusText}>{combinedDeliveryStatus.status}</Text>
          </View>
          {combinedDeliveryStatus.status === 'Em rota de entrega' && combinedDeliveryStatus.orderIds.length > 0 && (
            <View style={styles.orderInfo}>
              <MaterialIcons name="local-shipping" size={20} color="#FF4B2B" />
              <Text style={styles.orderIdText}>
                {combinedDeliveryStatus.orderIds.length > 1 
                  ? `${combinedDeliveryStatus.orderIds.length} pedidos em entrega`
                  : `Pedido: ${combinedDeliveryStatus.orderIds[0]}`
                }
              </Text>
            </View>          
          )}        
        </TouchableOpacity>
      )}      
      {type === 'deliveryman' && (
        <TouchableOpacity
          style={styles.pontoButton}
          onPress={() => setIsPontoModalVisible(true)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="schedule" size={24} color="#FF4B2B" />
          <Text style={styles.pontoButtonText}>
            {ids && ids.length > 1 
              ? `Registros de Ponto (${selectedData?.[0]?.name || 'Primeiro selecionado'})`
              : 'Registros de Ponto'
            }
          </Text>
          <MaterialIcons name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
      )}      
      {type === 'unit' && (
        <TouchableOpacity
          style={styles.pontoButton}
          onPress={() => setIsPicoModalVisible(true)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="timeline" size={24} color="#FF4B2B" />
          <Text style={styles.pontoButtonText}>
            {ids && ids.length > 1 
              ? `Registro de Pico (${selectedData?.[0]?.name || 'Primeira selecionada'})`
              : 'Registro de Pico'
            }
          </Text>
          <MaterialIcons name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
      )}

      {type === 'unit' && (
        <TouchableOpacity
          style={styles.pontoButton}
          onPress={() => setIsFolhaPontoModalVisible(true)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="schedule" size={24} color="#FF4B2B" />
          <Text style={styles.pontoButtonText}>
            {ids && ids.length > 1 
              ? `Folha de ponto (${selectedData?.[0]?.name || 'Primeira selecionada'})`
              : 'Folha de ponto'
            }
          </Text>
          <MaterialIcons name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
      )}

      <View style={styles.ratingCard}>
        <Text style={styles.cardTitle}>Avaliações</Text>
        <View style={styles.ratingContent}>
          <RatingStars rating={averageRating} />
          <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
          <Text style={styles.totalRatings}>
            {totalRatings} {totalRatings === 1 ? 'avaliação' : 'avaliações'}
          </Text>
        </View>
      </View>

      <View style={styles.recentOrdersCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Últimos Pedidos</Text>
          <TouchableOpacity onPress={handleSeeMoreOrders} style={styles.seeMoreButton}>
            <Text style={styles.seeMoreButtonText}>Ver mais</Text>
          </TouchableOpacity>
        </View>
        {Array.isArray(recentOrders) && recentOrders.length > 0 ? (
          recentOrders.map((order) => (
            <RecentOrderItem
              key={order.id}
              order={order}
              onPress={handleOrderPress}
            />
          ))
        ) : (
          <Text style={styles.noOrdersText}>Nenhum pedido encontrado</Text>
        )}
      </View>

      <OrderSelectionModal
        visible={isOrderSelectionVisible}
        onClose={() => setIsOrderSelectionVisible(false)}
        orderIds={combinedDeliveryStatus.orderIds}
        onSelectOrder={handleOrderPress}
      />          
      <PontoModal
        visible={isPontoModalVisible}
        onClose={() => setIsPontoModalVisible(false)}
        deliverymanId={ids && ids.length > 0 ? ids[0] : undefined}
        deliverymanName={selectedData && selectedData.length > 0 ? selectedData[0].name : undefined}
      />
      <PicoModal
        visible={isPicoModalVisible}
        onClose={() => setIsPicoModalVisible(false)}
        unitId={ids && ids.length > 0 ? ids[0] : undefined}
        unitName={selectedData && selectedData.length > 0 ? selectedData[0].name : undefined}
      />
      <FolhaPontoModal
        visible={isFolhaPontoModalVisible}
        onClose={() => setIsFolhaPontoModalVisible(false)}
        unitId={ids && ids.length > 0 ? ids[0] : undefined}
        unitName={selectedData && selectedData.length > 0 ? selectedData[0].name : undefined}
      />
    </View>
  );
};

export default StatsOverviewTab;