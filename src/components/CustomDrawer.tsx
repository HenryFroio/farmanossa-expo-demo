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
  Linking 
} from 'react-native';
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
      <Animated.View 
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
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Detalhes do Pedido {selectedOrder.number}</Text>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status:</Text>
            <Text style={styles.sectionContent}>{selectedOrder.status}</Text>
          </View>
            <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data:</Text>
            <Text style={styles.sectionContent}>
              {(() => {
                const dateObj = 'seconds' in selectedOrder.date 
                  ? new Date(selectedOrder.date.seconds * 1000) 
                  : selectedOrder.date;
                return dateObj.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              })()}
            </Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Endereço de Entrega:</Text>
            <Text style={styles.sectionContent}>{selectedOrder.address}</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Itens:</Text>
            {selectedOrder.items.map((item, index) => (
              <Text key={index} style={styles.sectionContent}>• {item}</Text>
            ))}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Valor Total:</Text>
            <Text style={styles.sectionContent}>{selectedOrder.price}</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cliente:</Text>
            <Text style={styles.sectionContent}>{selectedOrder.customerName}</Text>
          </View>
            <View style={styles.section}>
            <Text style={styles.sectionTitle}>Telefone:</Text>
            <Text style={styles.sectionContent}>{selectedOrder.customerPhone}</Text>
          </View>
          
          {selectedOrder.location && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Localização:</Text>
              <TouchableOpacity 
                style={styles.locationButton}
                onPress={() => handleOpenLocation(selectedOrder.location!)}
              >
                <Text style={styles.locationButtonText}>📍 Abrir no Mapa</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: "#000",
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex:1000
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2D3748',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A5568',
    marginBottom: 5,
  },  sectionContent: {
    fontSize: 16,
    color: '#2D3748',
  },  locationButton: {
    backgroundColor: '#e41c26',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomDrawer;