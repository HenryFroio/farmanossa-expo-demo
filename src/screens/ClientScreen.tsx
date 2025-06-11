// src/screens/ClientScreen.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  View, 
  TouchableOpacity, 
  FlatList, 
  Text, 
  Image, 
  ActivityIndicator, 
  Platform,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Drawer } from 'react-native-drawer-layout';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import styles from '../styles/clientScreenStyles';
import { useClientOrders } from '../hooks/useClientOrders';
import { useAuth } from '../hooks/useAuth';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import WelcomeHeader from '../components/WelcomeHeader';
import OrderItem from '../components/OrderItem';
import PhoneRegistrationModal from '../components/PhoneRegistrationModal';
import SearchModal from '../components/SearchModal';
import OrderDetailsBottomSheet from '../components/OrderDetailsBottomSheet';
import ReviewModal from '../components/ReviewModal';
import { Linking } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';

interface Order {
  id: string;
  number: string;
  status: string;
  price: string;
  items: string[];
  date: Date;
  address: string;
  customerName: string;
  customerPhone: string;
  pharmacyUnitId: string;
  deliveryMan?: string;
  deliveryManName?: string;
  reviewRequested?: boolean;
}

const ClientScreen: React.FC = () => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToReview, setOrderToReview] = useState<Order | null>(null);
  const [showDelivered, setShowDelivered] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchOrderId, setSearchOrderId] = useState('');
  const [clientPhone, setClientPhone] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const { 
    user, 
    signOut, 
    deleteAccount 
  } = useAuth();
  
  const firestore = getFirestore();
  
  const bottomSheetRef = useRef<BottomSheet>(null);

  const { 
    orders, 
    isLoading, 
    error, 
    fetchOrders, 
    searchOrderById 
  } = useClientOrders(clientPhone);

  useEffect(() => {
    const requestNotificationPermission = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus === 'granted') {
          console.log('Permissão de notificação concedida!');
        } else {
          Alert.alert(
            'Notificações Desativadas',
            'Para receber atualizações sobre seus pedidos em tempo real, ative as notificações nas configurações.',
            [
              {
                text: 'Mais tarde',
                style: 'cancel'
              },
              {
                text: 'Configurações',
                onPress: () => {
                  Platform.OS === 'ios' 
                    ? Linking.openURL('app-settings:') 
                    : Linking.openSettings();
                }
              }
            ]
          );
        }
      } catch (error) {
        console.error('Erro ao solicitar permissão de notificação:', error);
      }
    };

    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const checkUserPhone = async () => {
      if (!user) {
        return;
      }

      try {
        setIsCheckingPhone(true);
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.phoneNumber) {
            setClientPhone(userData.phoneNumber);
          } else {
            setShowPhoneModal(true);
            setClientPhone('');
          }
        } else {
          setShowPhoneModal(true);
          setClientPhone('');
        }
      } catch (error) {
        console.error('Erro ao verificar telefone:', error);
        setClientPhone('');
      } finally {
        setIsCheckingPhone(false);
      }
    };

    checkUserPhone();
  }, [user]);

  useEffect(() => {
    console.log("Todos os pedidos:", orders.map(o => ({ id: o.id, status: o.status })));
    console.log("showDelivered está:", showDelivered);
  }, [orders, showDelivered]);

  useEffect(() => {
    const orderNeedingReview = orders.find(
      order => order.status === 'Entregue' && order.reviewRequested === false
    );
    
    if (orderNeedingReview) {
      console.log("Pedido encontrado para review:", orderNeedingReview);
      setOrderToReview(orderNeedingReview);
    }
  }, [orders]);

  const handlePhoneSubmit = async (phone: string) => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        phone: phone,
        phoneNumber: phone,
        phoneVerified: true,
        updatedAt: serverTimestamp()
      });

      setClientPhone(phone);
      setShowPhoneModal(false);
      
      fetchOrders(phone);
    } catch (error) {
      console.error('Erro ao salvar telefone:', error);
      Alert.alert(
        'Erro',
        'Não foi possível salvar seu número de telefone. Tente novamente.'
      );
    }
  };

  const handleCloseBottomSheet = () => {
    setSelectedOrder(null);
  };

  const handleOrderPress = useCallback((order: Order) => {
    if (!clientPhone) {
      setShowPhoneModal(true);
      return;
    }
    setSelectedOrder(order);
    bottomSheetRef.current?.expand();
  }, [clientPhone]);

  const handleSubmitReview = async (data: {
    orderId: string;
    rating: number;
    comment: string;
  }) => {
    try {
      const orderDocRef = doc(firestore, 'orders', data.orderId);
      await updateDoc(orderDocRef, {
        reviewRequested: true,
        rating: data.rating,
        reviewComment: data.comment,
        reviewDate: serverTimestamp(),
      });
      
      setOrderToReview(null);
      Alert.alert('Sucesso', 'Obrigado pela sua avaliação!');
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      Alert.alert('Erro', 'Não foi possível salvar sua avaliação. Tente novamente.');
    }
  };

  const handleSearch = async () => {
    if (!clientPhone) {
      setShowPhoneModal(true);
      return;
    }
    try {
      const foundOrder = await searchOrderById(searchOrderId);
      console.log('handleSearch: foundOrder', foundOrder);
      if (foundOrder && foundOrder.id) {
        setSelectedOrder(foundOrder);
        setSearchModalVisible(false);
        setSearchOrderId('');
      } else {
        Alert.alert(
          'Pedido não encontrado',
          'Não foi possível encontrar um pedido com o ID fornecido.'
        );
      }
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      Alert.alert(
        'Erro',
        'Ocorreu um erro ao buscar o pedido. Tente novamente.'
      );
    }
  };

  const sortedOrders = React.useMemo(() => {
    const filteredOrders = orders.filter(order => {
      if (order.status === 'Entregue') {
        return showDelivered;
      }
      return true;
    });
  
    return filteredOrders.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [orders, showDelivered]);

  const renderDrawerContent = () => {
    const handleDeleteAccount = () => {
      Alert.alert(
        'Excluir conta',
        'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Confirmar exclusão',
                'Todos os seus dados serão permanentemente excluídos. Deseja continuar?',
                [
                  {
                    text: 'Cancelar',
                    style: 'cancel'
                  },
                  {
                    text: 'Sim, excluir conta',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deleteAccount();
                      } catch (error) {
                        Alert.alert('Erro', error instanceof Error ? error.message : 'Erro ao excluir conta');
                      }
                    }
                  }
                ]
              );
            }
          }
        ]
      );
    };

    return (
      <View style={styles.drawerContent}>
        <View style={styles.drawerHeader}>
          <MaterialIcons name="account-circle" size={64} color="#e41c26" />
          <Text style={styles.drawerTitle}>Seu Perfil</Text>
          <TouchableOpacity
            style={styles.logoutIcon}
            onPress={async () => {
              try {
                await signOut();
              } catch (error) {
                console.error('Erro ao fazer logout:', error);
                Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
              }
            }}
          >
            <MaterialIcons name="logout" size={24} color="red" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.drawerBody}>
          {user?.email && (
            <View style={styles.drawerItem}>
              <MaterialIcons name="email" size={24} color="#718096" />
              <Text style={styles.drawerText}>
                {user.email.includes('@privaterelay.appleid') || user.email.includes('@private.relay.apple') 
                  ? 'Email privado' 
                  : user.email}
              </Text>
            </View>
          )}
          
          {clientPhone ? (
            <View style={styles.drawerItem}>
              <View style={styles.drawerItemContent}>
                <MaterialIcons name="phone" size={24} color="#718096" />
                <Text style={styles.drawerText}>{clientPhone}</Text>
              </View>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => {
                  setIsDrawerOpen(false);
                  setShowPhoneModal(true);
                }}
              >
                <MaterialIcons name="edit" size={20} color="#718096" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.addPhoneButton} 
              onPress={() => setShowPhoneModal(true)}
            >
              <MaterialIcons name="add" size={24} color="#FFFFFF" />
              <Text style={styles.addPhoneButtonText}>Adicionar telefone</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.deleteAccountButton}
          onPress={handleDeleteAccount}
        >
          <MaterialIcons name="delete-forever" size={18} color="#718096" />
          <Text style={styles.deleteAccountButtonText}>
            Excluir minha conta
          </Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  
  const LoadingComponent = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#e41c26" />
      <Text style={styles.loadingText}>Carregando seus pedidos...</Text>
    </View>
  );

  const EmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="inbox" size={48} color="#718096" />
      <Text style={styles.emptyText}>
        {clientPhone 
          ? 'Nenhum pedido encontrado para este número'
          : 'Cadastre seu telefone para ver seus pedidos'}
      </Text>
    </View>
  );

  const headerData = React.useMemo(() => {
    const activeOrders = orders.filter(
      order => order.status !== 'Entregue'
    ).length;
  
    const lastOrder = orders.length > 0 
      ? orders.reduce((latest, current) => 
          latest.date > current.date ? latest : current
        )
      : null;
  
    const userName = user?.displayName || 'Cliente';
  
    return {
      userName,
      activeOrders,
      lastOrderTime: lastOrder?.date || null
    };
  }, [orders, user]);

  if (isCheckingPhone) {
    return <LoadingComponent />;
  }

  const isScreenLoading = isCheckingPhone || (!clientPhone && isLoading);

  if (isScreenLoading) {
    return <LoadingComponent />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#e41c26" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => clientPhone && fetchOrders(clientPhone)}
        >
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Drawer
      open={isDrawerOpen}
      onOpen={() => setIsDrawerOpen(true)}
      onClose={() => setIsDrawerOpen(false)}
      renderDrawerContent={renderDrawerContent}
      drawerPosition="right"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Image 
              source={require('../assets/avatar.png')} 
              style={styles.headerLogo}
            />
          </View>
          <Text style={styles.title}>Meus pedidos</Text>
          <TouchableOpacity 
            style={styles.headerIcon} 
            onPress={() => setIsDrawerOpen(true)}
          >
            <MaterialIcons name="menu" size={24} color="#2D3748" />
          </TouchableOpacity>
        </View>

        <WelcomeHeader 
          userName={headerData.userName}
          activeOrders={headerData.activeOrders}
          lastOrderTime={headerData.lastOrderTime}
        />

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, showDelivered && styles.filterButtonActive]}
            onPress={() => setShowDelivered(!showDelivered)}
          >
            <MaterialIcons 
              name={showDelivered ? "visibility-off" : "visibility"} 
              size={20} 
              color={showDelivered ? "#FFFFFF" : "#718096"} 
            />
            <Text style={[
              styles.filterButtonText, 
              showDelivered && styles.filterButtonTextActive
            ]}>
              {showDelivered ? 'Ocultar entregues' : 'Mostrar entregues'}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={sortedOrders}
          renderItem={({ item, index }) => (
            <OrderItem 
              item={item} 
              onPress={handleOrderPress} 
              index={index} 
            />
          )
          }
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            (isLoading || sortedOrders.length === 0) && styles.listContentCentered
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={isLoading ? LoadingComponent : EmptyComponent}
          refreshing={isLoading && !clientPhone}
          onRefresh={() => clientPhone && fetchOrders(clientPhone)}
        />
        
        <TouchableOpacity
          style={styles.searchFloatingButton}
          onPress={() => setSearchModalVisible(true)}
        >
          <MaterialIcons name="search" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <OrderDetailsBottomSheet 
          order={selectedOrder && selectedOrder.id ? selectedOrder : null}
          bottomSheetRef={bottomSheetRef}
          onClose={handleCloseBottomSheet}
          userRole="client"
        />

        <SearchModal
          visible={searchModalVisible}
          onClose={() => setSearchModalVisible(false)}
          onSearch={handleSearch}
          searchOrderId={searchOrderId}
          setSearchOrderId={setSearchOrderId}
          isLoading={isLoading}
        />

        <PhoneRegistrationModal
          visible={showPhoneModal}
          onSubmit={handlePhoneSubmit}
        />

        {orderToReview && (
          <ReviewModal
            visible={!!orderToReview}
            onClose={() => setOrderToReview(null)}
            orderId={orderToReview.id}
            deliveryManId={orderToReview.deliveryMan || ''}
            deliveryManName={orderToReview.deliveryManName || 'Entregador'}
            onSubmitReview={handleSubmitReview}
          />
        )}
      </View>
    </Drawer>
  );
};

export default ClientScreen;