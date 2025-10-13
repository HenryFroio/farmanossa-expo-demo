// src/components/CustomDrawer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Dimensions,
  Animated,
  PanResponder,
  TouchableOpacity,
  Linking,
  Alert 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;

type Order = {
  id: string;
  number: string;
  status: string;
  price: string;
  items: string[];
  date: Date | { seconds: number };
  address: string;
  customerName: string;
  customerPhone: string;
  location?: string;
};

type CustomDrawerProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  selectedOrder: Order | null;
};

const CustomDrawer: React.FC<CustomDrawerProps> = ({ 
  isOpen, 
  setIsOpen, 
  selectedOrder 
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const translateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleOpenLocation = (location: string) => {
    try {
      Linking.openURL(location);
    } catch (error) {
      console.error('Erro ao abrir localização:', error);
    }
  };

  const handleOpenWhatsApp = async (phone: string) => {
    try {
      // Remove caracteres não numéricos do telefone
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Tenta abrir o app do WhatsApp primeiro
      const whatsappAppUrl = `whatsapp://send?phone=55${cleanPhone}`;
      const canOpenApp = await Linking.canOpenURL(whatsappAppUrl);
      
      if (canOpenApp) {
        await Linking.openURL(whatsappAppUrl);
      } else {
        // Fallback para WhatsApp Web (funciona no emulador e quando o app não está instalado)
        Alert.alert(
          'Abrir WhatsApp',
          'O app do WhatsApp não está instalado. Deseja abrir no navegador?',
          [
            {
              text: 'Cancelar',
              style: 'cancel'
            },
            {
              text: 'Abrir no Navegador',
              onPress: async () => {
                const whatsappWebUrl = `https://wa.me/55${cleanPhone}`;
                await Linking.openURL(whatsappWebUrl);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error);
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: DRAWER_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsOpen(false);
      setIsClosing(false);
    });
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return gestureState.dx > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dx > 0) {
        translateX.setValue(gestureState.dx);
        const newOpacity = 1 - (gestureState.dx / DRAWER_WIDTH);
        fadeAnim.setValue(newOpacity);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > DRAWER_WIDTH / 3 || gestureState.vx > 0.5) {
        handleClose();
      } else {
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
  });

  if (!selectedOrder || (!isOpen && !isClosing)) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <TouchableOpacity 
        activeOpacity={1}
        onPress={handleClose}
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: fadeAnim,
          }
        ]} 
      />
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.container,
          {
            transform: [{ translateX }]
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Detalhes do Pedido</Text>
          <Text style={styles.orderNumber}>#{selectedOrder.number || selectedOrder.id}</Text>
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Badge */}
          <View style={[styles.statusBadge, getStatusColor(selectedOrder.status)]}>
            <MaterialIcons 
              name={getStatusIcon(selectedOrder.status)} 
              size={20} 
              color="#FFFFFF" 
            />
            <Text style={styles.statusText}>{selectedOrder.status}</Text>
          </View>

          {/* Cliente Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="person" size={24} color="#e41c26" />
              <Text style={styles.cardTitle}>Cliente</Text>
            </View>
            <Text style={styles.cardContent}>{selectedOrder.customerName}</Text>
            
            <View style={styles.cardDivider} />
            
            <View style={styles.phoneContainer}>
              <MaterialIcons name="phone" size={20} color="#718096" />
              <Text style={styles.phoneText}>{selectedOrder.customerPhone}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.whatsappButton}
              onPress={() => handleOpenWhatsApp(selectedOrder.customerPhone)}
            >
              <MaterialIcons name="chat" size={20} color="#FFFFFF" />
              <Text style={styles.whatsappButtonText}>Abrir WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {/* Endereço Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="location-on" size={24} color="#e41c26" />
              <Text style={styles.cardTitle}>Endereço de Entrega</Text>
            </View>
            <Text style={styles.addressText}>{selectedOrder.address}</Text>
            
            {selectedOrder.location && (
              <TouchableOpacity 
                style={styles.mapButton}
                onPress={() => handleOpenLocation(selectedOrder.location!)}
              >
                <MaterialIcons name="map" size={20} color="#FFFFFF" />
                <Text style={styles.mapButtonText}>Abrir no Mapa</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Itens Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="shopping-bag" size={24} color="#e41c26" />
              <Text style={styles.cardTitle}>Itens do Pedido</Text>
            </View>
            {selectedOrder.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <MaterialIcons name="check-circle" size={16} color="#48BB78" />
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Info Section */}
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <MaterialIcons name="access-time" size={20} color="#718096" />
                <Text style={styles.infoLabel}>Data</Text>
                <Text style={styles.infoValue}>
                  {(() => {
                    const dateObj = 'seconds' in selectedOrder.date 
                      ? new Date(selectedOrder.date.seconds * 1000) 
                      : selectedOrder.date;
                    return dateObj.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    });
                  })()}
                </Text>
                <Text style={styles.infoTime}>
                  {(() => {
                    const dateObj = 'seconds' in selectedOrder.date 
                      ? new Date(selectedOrder.date.seconds * 1000) 
                      : selectedOrder.date;
                    return dateObj.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  })()}
                </Text>
              </View>
              
              <View style={styles.infoDivider} />
              
              <View style={styles.infoItem}>
                <MaterialIcons name="attach-money" size={20} color="#718096" />
                <Text style={styles.infoLabel}>Valor Total</Text>
                <Text style={styles.priceValue}>{selectedOrder.price}</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Entregue':
      return { backgroundColor: '#48BB78' };
    case 'A caminho':
      return { backgroundColor: '#4299E1' };
    case 'Em Preparação':
      return { backgroundColor: '#ED8936' };
    case 'Cancelado':
      return { backgroundColor: '#F56565' };
    default:
      return { backgroundColor: '#718096' };
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Entregue':
      return 'check-circle';
    case 'A caminho':
      return 'local-shipping';
    case 'Em Preparação':
      return 'schedule';
    case 'Cancelado':
      return 'cancel';
    default:
      return 'info';
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#F7FAFC',
    shadowColor: "#000",
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  header: {
    backgroundColor: '#e41c26',
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
  },
  cardContent: {
    fontSize: 18,
    color: '#1A202C',
    fontWeight: '600',
    marginBottom: 8,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  phoneText: {
    fontSize: 16,
    color: '#4A5568',
    fontWeight: '500',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#25D366',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
    marginBottom: 12,
  },
  mapButton: {
    backgroundColor: '#e41c26',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#e41c26',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  mapButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  itemText: {
    fontSize: 15,
    color: '#4A5568',
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#718096',
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#2D3748',
    fontWeight: '600',
  },
  infoTime: {
    fontSize: 13,
    color: '#4A5568',
    marginTop: 2,
  },
  priceValue: {
    fontSize: 20,
    color: '#48BB78',
    fontWeight: '700',
    marginTop: 4,
  },
});

export default CustomDrawer;