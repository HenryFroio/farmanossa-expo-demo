// src/components/OrderItem/index.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CheckCircle, Truck, Clock } from 'lucide-react-native';
import styles from '../styles/clientScreenStyles';
import { Order } from '../types/statsTypes';


interface OrderItemProps {
  item: Order;
  onPress: (item: Order) => void;
  index: number;
}

const OrderItem: React.FC<OrderItemProps> = React.memo(({ item, onPress, index }) => {
  const getStatusIcon = () => {
    switch (item.status) {
      case 'Entregue':
        return <CheckCircle size={24} color="#48BB78" />;
      case 'Em andamento':
        return <Truck size={24} color="#e41c26" />;
      default:
        return <Clock size={24} color="#ff6b00" />;
    }
  };

  return (
    <View>
      <TouchableOpacity 
        style={[
          styles.orderItem,
          item.status === 'Em andamento' && styles.activeOrderItem
        ]} 
        onPress={() => onPress(item)}
      >
        <View style={styles.orderIconContainer}>
          {getStatusIcon()}
        </View>
        
        <View style={styles.orderDetails}>
          <Text style={styles.orderNumber}>Pedido #{item.id}</Text>
          
          <Text style={styles.orderItems}>
            {item.items?.slice(0, 2).join(', ')}
            {(item.items?.length > 2) && '...'}
          </Text>
          
          <View style={styles.orderFooter}>
            <Text style={styles.orderDate}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
            
            <View style={[
              styles.statusBadge,
              item.status === 'Entregue' && styles.deliveredBadge,
              item.status === 'Em andamento' && styles.activeStatusBadge
            ]}>
              <Text style={styles.orderStatus}>{item.status}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

// Adicionando displayName para melhor debugging
OrderItem.displayName = 'OrderItem';

export default OrderItem;