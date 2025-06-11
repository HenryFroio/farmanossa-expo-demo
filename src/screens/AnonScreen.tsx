import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Image,
  StatusBar,
  Platform,
  Animated,
  BackHandler,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import OrderDetailsBottomSheet from '../components/OrderDetailsBottomSheet';
import { useAnonOrders } from '../hooks/useAnonOrders';
import { useAuth } from '../hooks/useAuth';
import styles from '../styles/anonScreenStyles';

interface AnonScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

const AnonScreen = ({ navigation }: AnonScreenProps) => {
  const { searchOrderById, isLoading, error: searchAPIError } = useAnonOrders();
  const { userRole, loading: authLoading } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchError, setSearchError] = useState('');
  const bottomSheetRef = useRef<BottomSheet>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const closeModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSearchModalVisible(false);
    });
  };

  useEffect(() => {
    if (searchModalVisible) {
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [searchModalVisible]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (searchModalVisible) {
        closeModal();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [searchModalVisible]);

  const handleSearch = async () => {
    setSearchError('');

    if (!searchOrderId.trim()) {
      setSearchError('Por favor, digite o ID do pedido');
      return;
    }

    const foundOrder = await searchOrderById(searchOrderId);
    console.log(foundOrder);
    
    if (foundOrder) {
      setSelectedOrder(foundOrder);
      closeModal();
      setSearchOrderId('');
      bottomSheetRef.current?.expand();
    } else {
      setSearchError(searchAPIError || 'Não encontramos nenhum pedido com este ID. Verifique e tente novamente.');
    }
  };

  const handleCloseBottomSheet = () => {
    setSelectedOrder(null);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.safeArea}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#e41c26"
        />
        
        <View style={styles.container}>
          <View style={styles.header}>
            <Image 
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <ScrollView 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.emptyStateContainer}>
              <View style={styles.illustrationContainer}>
                <MaterialIcons name="medication" size={64} color="#e41c26" />
              </View>
              
              <Text style={styles.welcomeTitle}>Bem-vindo!</Text>
              <Text style={styles.welcomeSubtitle}>
                Entregamos saúde na sua porta
              </Text>
              
              <View style={styles.searchCard}>
                <Text style={styles.searchCardTitle}>
                  Acompanhe seu pedido
                </Text>
                <Text style={styles.searchCardDescription}>
                  Digite o ID do seu pedido para ver o status da entrega
                </Text>
                
                <TouchableOpacity 
                  style={styles.searchButton}
                  onPress={() => setSearchModalVisible(true)}
                >
                  <MaterialIcons name="search" size={20} color="#FFFFFF" />
                  <Text style={styles.searchButtonText}>Buscar Pedido</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoContainer}>
                <TouchableOpacity 
                  style={styles.benefitsCard}         
                  onPress={() => navigation.navigate('Login')}
                >
                  <MaterialIcons name="notifications-active" size={28} color="#e41c26" style={styles.benefitsIcon} />
                  <Text style={styles.benefitsTitle}>
                    Acompanhe suas entregas em tempo real
                  </Text>
                  <Text style={styles.benefitsDescription}>
                    Faça login para receber notificações automáticas sobre o status das suas entregas e tenha acesso rápido a todos os seus pedidos, sem necessidade de buscas manuais.
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.loginLink} 
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.loginLinkText}>
                  Já é cliente? <Text style={styles.loginLinkHighlight}>Faça login</Text>
                </Text>
                <MaterialIcons name="arrow-forward" size={20} color="#e41c26" />
              </TouchableOpacity>
            </View>
          </ScrollView>

          <OrderDetailsBottomSheet 
            order={selectedOrder}
            bottomSheetRef={bottomSheetRef}
            onClose={handleCloseBottomSheet}
            userRole="anon"
          />

          <Modal
            animationType="slide"
            transparent={true}
            visible={searchModalVisible}
            onRequestClose={closeModal}
          >
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalWrapper}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <Animated.View 
                  style={[
                    styles.modalOverlay,
                    {
                      opacity: fadeAnim,
                    }
                  ]}
                >
                  <TouchableOpacity 
                    style={{ flex: 1 }}
                    onPress={closeModal}
                  />
                </Animated.View>
              </TouchableWithoutFeedback>

              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Buscar Pedido</Text>
                  <TouchableOpacity 
                    onPress={closeModal}
                    style={styles.modalCloseButton}
                  >
                    <MaterialIcons name="close" size={24} color="#718096" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.modalDescription}>
                  Digite o ID do seu pedido para acompanhar o status da entrega
                </Text>
                
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.searchInput,
                      searchError ? styles.searchInputError : {}
                    ]}
                    placeholder="Ex: DO001 ou 001"
                    placeholderTextColor="#718096"
                    value={searchOrderId}
                    onChangeText={(text) => {
                      setSearchOrderId(text);
                      setSearchError('');
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={10}
                    editable={!isLoading}
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                  />
                  {searchError ? (
                    <View style={styles.errorContainer}>
                      <MaterialIcons name="error-outline" size={16} color="#e41c26" />
                      <Text style={styles.errorText}>{searchError}</Text>
                    </View>
                  ) : null}
                </View>
                
                <TouchableOpacity 
                  style={[
                    styles.modalSearchButton,
                    isLoading && styles.modalSearchButtonDisabled
                  ]} 
                  onPress={handleSearch}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSearchButtonText}>Buscar Pedido</Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

export default AnonScreen;