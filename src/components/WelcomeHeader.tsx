import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import styles from '../styles/clientScreenStyles';

interface WelcomeHeaderProps {
  userName?: string;
  activeOrders: number;
  lastOrderTime?: Date | null;
}

const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ 
  userName = "Cliente",
  activeOrders = 0,
  lastOrderTime = null
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatLastOrderTime = (date: Date | null) => {
    if (!date) return 'Nenhum pedido';

    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora mesmo';
    if (diffInMinutes < 60) return `Há ${diffInMinutes} minutos`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `Há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;
  };

  return (
    <Animated.View 
      style={[
        styles.welcomeContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.welcomeContent}>
        <View style={styles.welcomeTopSection}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="person" size={50} color="#e41c26" />
            <View style={styles.avatarBadge} />
          </View>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeText}>Olá,</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.deliveryInfoCard}>
            <MaterialIcons name="local-shipping" size={24} color="#e41c26" />
            <View style={styles.deliveryTextContainer}>
              <Text style={styles.deliveryTitle}>Entregas Ativas</Text>
              <Text style={styles.deliveryCount}>{activeOrders}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.lastOrderCard}>
            <MaterialIcons name="access-time" size={24} color="#4A5568" />
            <View style={styles.lastOrderTextContainer}>
              <Text style={styles.lastOrderTitle}>Último Pedido</Text>
              <Text style={styles.lastOrderTime}>
                {formatLastOrderTime(lastOrderTime)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

export default WelcomeHeader;