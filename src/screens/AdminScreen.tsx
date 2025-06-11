import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Dimensions, 
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PieChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import styles from '../styles/adminStyles';
import headerStyles from '../styles/headerStyles';
import { useAuth } from '../hooks/useAuth';
import { useAdminData } from '../hooks/useAdminData';
import SearchDrawer from '../components/SearchDrawer';
import OrderDetailsBottomSheet from '../components/OrderDetailsBottomSheet';

const { width } = Dimensions.get('window');

const AdminScreen = () => {
  // 1. Hooks básicos - sempre executados
  const navigation = useNavigation();
  const bottomSheetRef = React.useRef(null);
  const { userRole, managerUnit, signOut } = useAuth(); // Removed authLoading
  // console.log(`[AdminScreen] Component rendered/re-rendered. AuthLoading: ${authLoading}, UserRole: ${userRole}, ManagerUnit: ${managerUnit}`);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  
  // Estados para controlar o carregamento de cada seção
  const [unitFilterApplied, setUnitFilterApplied] = useState(false);
  const [dataProcessed, setDataProcessed] = useState(false);
  const [sectionsReady, setSectionsReady] = useState(false);
  
  // 2. Hook de dados
  const { 
    deliverymen, 
    pharmacyUnits, 
    deliveredOrders, 
    dummyOrders, 
    loading: dataLoading, 
    error 
  } = useAdminData(userRole, managerUnit);
  // console.log(`[AdminScreen] useAdminData - DataLoading: ${dataLoading}, Error: ${error}, Deliverymen: ${deliverymen.length}, Units: ${pharmacyUnits.length}, DeliveredOrders: ${deliveredOrders.length}, DummyOrders: ${dummyOrders.length}`);

  // Verificar se o filtro de unidade foi aplicado
  useEffect(() => {
    const effectStartTime = Date.now();
    // console.log(`[AdminScreen][useEffect unitFilterApplied] START. DataLoading: ${dataLoading}, UserRole: ${userRole}, ManagerUnit: ${managerUnit}, PharmacyUnits: ${pharmacyUnits.length}`);
    if (dataLoading) {
      if (unitFilterApplied) {
        // console.log("[AdminScreen][useEffect unitFilterApplied] Data is loading, resetting unitFilterApplied to false.");
        setUnitFilterApplied(false); 
      }
      // console.log(`[AdminScreen][useEffect unitFilterApplied] END (dataLoading is true). Duration: ${Date.now() - effectStartTime}ms`);
      return;
    }

    let newUnitFilterApplied = false;
    if (userRole === 'manager') {
      newUnitFilterApplied = !!managerUnit && pharmacyUnits.length > 0;
      // console.log(`[AdminScreen][useEffect unitFilterApplied] Manager role. ManagerUnit: ${managerUnit}, PharmacyUnits loaded: ${pharmacyUnits.length > 0}. NewUnitFilterApplied: ${newUnitFilterApplied}`);
    } else {
      newUnitFilterApplied = true; // For admin or other roles, filter is considered applied or not applicable
      // console.log(`[AdminScreen][useEffect unitFilterApplied] Not a manager role (${userRole}). NewUnitFilterApplied: true`);
    }
    
    if (unitFilterApplied !== newUnitFilterApplied) {
      // console.log(`[AdminScreen][useEffect unitFilterApplied] Setting unitFilterApplied to: ${newUnitFilterApplied}`);
      setUnitFilterApplied(newUnitFilterApplied);
    }
    // console.log(`[AdminScreen][useEffect unitFilterApplied] END. Duration: ${Date.now() - effectStartTime}ms`);
  }, [userRole, managerUnit, pharmacyUnits, dataLoading, unitFilterApplied]); // Added unitFilterApplied to dependencies to avoid potential stale closures if logic depends on its previous state

  // Processar dados somente após filtro aplicado
  useEffect(() => {
    const effectStartTime = Date.now();
    // console.log(`[AdminScreen][useEffect dataProcessed] START. DataLoading: ${dataLoading}, UnitFilterApplied: ${unitFilterApplied}, Current DataProcessed: ${dataProcessed}`);
    if (dataLoading || !unitFilterApplied) {
      if (dataProcessed) {
        // console.log("[AdminScreen][useEffect dataProcessed] Conditions not met (dataLoading or !unitFilterApplied), resetting dataProcessed to false.");
        setDataProcessed(false); // Reset if conditions are no longer met
      }
      // console.log(`[AdminScreen][useEffect dataProcessed] END (conditions not met). Duration: ${Date.now() - effectStartTime}ms`);
      return;
    }
    
    // If already processed, no need to set timeout again unless dependencies change significantly
    if (dataProcessed) {
      // console.log("[AdminScreen][useEffect dataProcessed] Already processed and conditions met. No change.");
      // console.log(`[AdminScreen][useEffect dataProcessed] END (already processed). Duration: ${Date.now() - effectStartTime}ms`);
      return;
    }

    // console.log("[AdminScreen][useEffect dataProcessed] Conditions met, setting timer to set dataProcessed to true.");
    const timer = setTimeout(() => {
      // console.log("[AdminScreen][useEffect dataProcessed] Timer fired. Setting dataProcessed to true.");
      setDataProcessed(true);
    }, 100); // Small delay to allow UI to catch up if needed
    
    // console.log(`[AdminScreen][useEffect dataProcessed] END (timer set). Duration: ${Date.now() - effectStartTime}ms`);
    return () => {
      // console.log("[AdminScreen][useEffect dataProcessed] Cleanup: Clearing timer.");
      clearTimeout(timer);
    };
  }, [dataLoading, unitFilterApplied, dataProcessed]); // Added dataProcessed to dependencies

  // Preparar dados para animação
  useEffect(() => {
    const effectStartTime = Date.now();
    // console.log(`[AdminScreen][useEffect sectionsReady] START. DataProcessed: ${dataProcessed}, Current SectionsReady: ${sectionsReady}`);
    if (!dataProcessed) {
      if (sectionsReady) {
        // console.log("[AdminScreen][useEffect sectionsReady] Data not processed, resetting sectionsReady to false.");
        setSectionsReady(false); // Reset if data is no longer processed
      }
      // console.log(`[AdminScreen][useEffect sectionsReady] END (data not processed). Duration: ${Date.now() - effectStartTime}ms`);
      return;
    }

    if (sectionsReady) {
        // console.log("[AdminScreen][useEffect sectionsReady] Already sectionsReady and dataProcessed. No change.");
        // console.log(`[AdminScreen][useEffect sectionsReady] END (already ready). Duration: ${Date.now() - effectStartTime}ms`);
        return;
    }
    
    // console.log("[AdminScreen][useEffect sectionsReady] Data processed. Setting sectionsReady to true.");
    setSectionsReady(true);
    // console.log(`[AdminScreen][useEffect sectionsReady] END (sections prepared). Duration: ${Date.now() - effectStartTime}ms`);
  }, [dataProcessed, sectionsReady]); // Added sectionsReady to dependencies

  // 3. Funções auxiliares
  const removeAccents = React.useCallback((str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }, []);

  const getShortName = React.useCallback((fullName: string) => {
    return fullName.length > 12 ? `${fullName.slice(0, 12)}...` : fullName;
  }, []);

  // Handler para fechar o BottomSheet
  const handleCloseBottomSheet = React.useCallback(() => {
    setSelectedOrder(null);
  }, []);

  // 4. Memoização de dados
  const currentUnit = React.useMemo(() => {
    const memoStartTime = Date.now();
    // console.log(`[AdminScreen][useMemo currentUnit] START. UserRole: ${userRole}, ManagerUnit: ${managerUnit}, PharmacyUnits: ${pharmacyUnits.length}`);
    if (userRole === 'manager' && managerUnit) {
      const foundUnit = pharmacyUnits.find(unit => unit.id === managerUnit);
      // console.log(`[AdminScreen][useMemo currentUnit] END (Manager). Found: ${!!foundUnit}. Duration: ${Date.now() - memoStartTime}ms`);
      return foundUnit;
    }
    // console.log(`[AdminScreen][useMemo currentUnit] END (Not Manager or no unit). Duration: ${Date.now() - memoStartTime}ms`);
    return null;
  }, [userRole, managerUnit, pharmacyUnits]);

  const ordersByDeliveryman = React.useMemo(() => {
    const memoStartTime = Date.now();
    // console.log(`[AdminScreen][useMemo ordersByDeliveryman] START. DataProcessed: ${dataProcessed}, DeliveredOrders: ${deliveredOrders.length}`);
    if (!dataProcessed) {
      // console.log(`[AdminScreen][useMemo ordersByDeliveryman] END (Not dataProcessed). Duration: ${Date.now() - memoStartTime}ms`);
      return {};
    }
    const result = deliveredOrders.reduce((acc, order) => {
      if (order.deliveryMan) {
        acc[order.deliveryMan] = (acc[order.deliveryMan] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    // console.log(`[AdminScreen][useMemo ordersByDeliveryman] END. Result keys: ${Object.keys(result).length}. Duration: ${Date.now() - memoStartTime}ms`);
    return result;
  }, [deliveredOrders, dataProcessed]);

  const deliveryData = React.useMemo(() => {
    const memoStartTime = Date.now();
    // console.log(`[AdminScreen][useMemo deliveryData] START. DataProcessed: ${dataProcessed}, Deliverymen: ${deliverymen.length}, OrdersByDeliveryman keys: ${Object.keys(ordersByDeliveryman).length}`);
    if (!dataProcessed || !deliverymen.length) {
      // console.log(`[AdminScreen][useMemo deliveryData] END (Not dataProcessed or no deliverymen). Duration: ${Date.now() - memoStartTime}ms`);
      return [];
    }

    const deliveryCount = deliverymen.map(deliveryman => {
      return {
        id: deliveryman.id,
        name: getShortName(deliveryman.name),
        deliveries: ordersByDeliveryman[deliveryman.id] || 0,
      };
    });

    const sortedData = deliveryCount
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, 5);

    if (sortedData.length === 0) return [];

    const result = sortedData.map((data, index) => ({
      name: data.name,
      population: data.deliveries,
      color: [`#FF6384`, `#36A2EB`, `#FFCE56`, `#4BC0C0`, `#9966FF`][index % 5],
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    }));
    // console.log(`[AdminScreen][useMemo deliveryData] END. Result length: ${result.length}. Duration: ${Date.now() - memoStartTime}ms`);
    return result;
  }, [deliverymen, ordersByDeliveryman, getShortName, dataProcessed]);

  const ordersByUnit = React.useMemo(() => {
    const memoStartTime = Date.now();
    // console.log(`[AdminScreen][useMemo ordersByUnit] START. DataProcessed: ${dataProcessed}, UserRole: ${userRole}, DeliveredOrders: ${deliveredOrders.length}`);
    if (!dataProcessed || userRole === 'manager') {
      // console.log(`[AdminScreen][useMemo ordersByUnit] END (Not dataProcessed or manager role). Duration: ${Date.now() - memoStartTime}ms`);
      return {}; 
    }
    const result = deliveredOrders.reduce((acc, order) => {
      if (order.pharmacyUnitId) {
        acc[order.pharmacyUnitId] = (acc[order.pharmacyUnitId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    // console.log(`[AdminScreen][useMemo ordersByUnit] END. Result keys: ${Object.keys(result).length}. Duration: ${Date.now() - memoStartTime}ms`);
    return result;
  }, [deliveredOrders, dataProcessed, userRole]);

  const unitData = React.useMemo(() => {
    const memoStartTime = Date.now();
    // console.log(`[AdminScreen][useMemo unitData] START. DataProcessed: ${dataProcessed}, UserRole: ${userRole}, CurrentUnit: ${!!currentUnit}, PharmacyUnits: ${pharmacyUnits.length}, DeliveredOrders: ${deliveredOrders.length}, OrdersByUnit keys: ${Object.keys(ordersByUnit).length}`);
    if (!dataProcessed) {
      // console.log(`[AdminScreen][useMemo unitData] END (Not dataProcessed). Duration: ${Date.now() - memoStartTime}ms`);
      return [];
    }
    
    if (userRole === 'manager' && currentUnit) {
      const deliveriesCount = deliveredOrders.length; // deliveredOrders is already filtered for manager's unit
      // console.log(`[AdminScreen][useMemo unitData] END (Manager). Result length: 1. Duration: ${Date.now() - memoStartTime}ms`);
      return [{
        id: currentUnit.id,
        name: currentUnit.name,
        deliveries: deliveriesCount
      }];
    }
    
    // Admin case:
    if (!pharmacyUnits.length) return [];

    const unitCount = pharmacyUnits.map(unit => ({
      id: unit.id,
      name: unit.name,
      deliveries: ordersByUnit[unit.id] || 0,
    }));

    const result = unitCount
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, 5);
    // console.log(`[AdminScreen][useMemo unitData] END (Admin). Result length: ${result.length}. Duration: ${Date.now() - memoStartTime}ms`);
    return result;
  }, [
    userRole, 
    currentUnit, 
    pharmacyUnits, 
    deliveredOrders, 
    ordersByUnit, 
    dataProcessed, 
    getShortName
  ]);

  const motorcycleData = React.useMemo(() => {
    const memoStartTime = Date.now();
    // console.log(`[AdminScreen][useMemo motorcycleData] START. DataProcessed: ${dataProcessed}, DeliveredOrders: ${deliveredOrders.length}`);
    if (!dataProcessed) {
      // console.log(`[AdminScreen][useMemo motorcycleData] END (Not dataProcessed). Duration: ${Date.now() - memoStartTime}ms`);
      return [];
    }
    
    const motorcycleUsage = deliveredOrders.reduce((acc, order) => {
      acc[order.licensePlate] = (acc[order.licensePlate] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const result = Object.entries(motorcycleUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([plate, deliveries]) => ({ plate, deliveries }));
    // console.log(`[AdminScreen][useMemo motorcycleData] END. Result length: ${result.length}. Duration: ${Date.now() - memoStartTime}ms`);
    return result;
  }, [deliveredOrders, dataProcessed]);

  // 5. Handlers
  const handleSearch = React.useCallback((
    type: 'deliveryman' | 'unit' | 'order' | null, 
    mode: 'single' | 'multiple', 
    query: string
  ) => {
    if (type === 'deliveryman') {
      const normalizedQuery = removeAccents(query.toLowerCase());
      return deliverymen.filter(dm => 
        removeAccents(dm.name.toLowerCase()).includes(normalizedQuery)
      );
    } else if (type === 'unit') {
      return pharmacyUnits.filter(unit => 
        unit.id.toLowerCase().includes(query.toLowerCase())
      );
    } else if (type === 'order') {
      return dummyOrders.filter(order => 
        order.number.toLowerCase().includes(query.toLowerCase()) ||
        order.items.some(item => item.toLowerCase().includes(query.toLowerCase()))
      );
    }
    return [];
  }, [deliverymen, pharmacyUnits, dummyOrders, removeAccents]);

  const handleSelect = React.useCallback((
    selected: string | string[], 
    type: 'deliveryman' | 'unit' | 'order' | null
  ) => {
    if (type === 'order') {
      const selectedOrder = dummyOrders.find(order => order.id === selected);
      
      if (selectedOrder) {
        setSelectedOrder(selectedOrder);
        setIsSearchDrawerOpen(false);
        
        // Adicionado um pequeno atraso para garantir que o drawer feche antes
        // Isso evita problemas de renderização e interação entre os componentes
        setTimeout(() => {
          bottomSheetRef.current?.expand();
        }, 500);
      }
    } else {
      const ids = Array.isArray(selected) ? selected : [selected];
      setIsSearchDrawerOpen(false);
      navigation.navigate('Stats', { 
        type, 
        ids,
        ...(managerUnit ? { managerUnit } : {})
      });
    }
  }, [dummyOrders, navigation, managerUnit]);
  
  const handleSearchDrawerClose = React.useCallback(() => {
    // Este callback foi refatorado para apenas lidar com o fechamento do drawer
    // A abertura do bottom sheet agora está contida no handleSelect
  }, []);

  // Handle logout function - Moved outside MainContent to fix reference error
  const handleLogout = () => {
    try {
      Alert.alert(
        'Confirmar Logout',
        'Deseja realmente sair do perfil?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Sair',
            onPress: async () => {
              try {
                await signOut();
              } catch (error) {
                Alert.alert('Erro', 'Não foi possível realizar o logout. Tente novamente.');
              }
            },
            style: 'destructive',
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível realizar o logout. Tente novamente.');
    }
  };

  // 6. Renderização condicional para loading e erro
  if (dataLoading) { // Simplified condition, authLoading was removed
    // console.log(`[AdminScreen] Rendering loading state. AuthLoading: ${authLoading}, DataLoading: ${dataLoading}, UserRole: ${userRole}`);
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#e41c26" />
        <Text style={{ marginTop: 16, color: '#4A5568' }}>
          {userRole === 'manager' 
            ? 'Carregando dados da unidade...' 
            : 'Carregando dados administrativos...'}
        </Text>
      </View>
    );
  }

  if (error) {
    // console.log(`[AdminScreen] Rendering error state: ${error}`);
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // 7. Chart config
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false
  };

  // Componente de loading para cada seção
  const SectionLoading = ({ message = 'Carregando...' }) => (
    <View style={styles.sectionLoading}>
      <ActivityIndicator size="small" color="#e41c26" />
      <Text style={styles.sectionLoadingText}>{message}</Text>
    </View>
  );

  const MainContent = () => {
    // console.log("[AdminScreen] Rendering MainContent");
    return (
    <View style={styles.container}>
      <View style={[styles.header, headerStyles.headerContainer]}>
        <View style={styles.headerLeft}>
          <Image 
            source={require('../assets/avatar.png')}
            style={headerStyles.headerLogo}
          />
        </View>
        
        <View style={headerStyles.headerTitleContainer}>
          <Text style={[styles.title, headerStyles.headerTitle]}>
            {userRole === 'manager' && currentUnit 
              ? `Unidade ${currentUnit.name}`
              : 'Área Administrativa'
            }
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.searchButton, styles.headerRight]}
          onPress={() => {
            setIsSearchDrawerOpen(true);
          }}
        >
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        <View 
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>
            Top 5 Entregadores (Semana)
          </Text>
          
          {!sectionsReady ? (
            <SectionLoading message="Carregando dados dos entregadores..." />
          ) : deliveryData.length > 0 ? (
            <PieChart
              data={deliveryData}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="0"
              absolute
            />
          ) : (
            <Text style={styles.emptyText}>Nenhum entregador encontrado</Text>
          )}
        </View>

        <View 
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>
            {userRole === 'manager' ? 'Estatísticas Semanais da Unidade' : 'Top 5 Unidades com Mais Entregas (Semana)'}
          </Text>
          
          {!sectionsReady ? (
            <SectionLoading message="Carregando dados das unidades..." />
          ) : unitData.length > 0 ? (
            unitData.map((unit, index) => (
              <View key={index} style={styles.unitItem}>
                <Text style={styles.unitName}>{unit.name}</Text>
                <Text style={styles.unitDeliveries}>{unit.deliveries} entregas</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Nenhuma entrega registrada</Text>
          )}
        </View>

        <View 
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>
            {userRole === 'manager' ? 'Motos da Unidade (Semana)' : 'Top 5 Motos Mais Utilizadas (Semana)'}
          </Text>
          
          {!sectionsReady ? (
            <SectionLoading message="Carregando dados das motos..." />
          ) : motorcycleData.length > 0 ? (
            motorcycleData.map((motorcycle, index) => (
              <View key={index} style={styles.unitItem}>
                <Text style={styles.unitName}>{motorcycle.plate}</Text>
                <Text style={styles.unitDeliveries}>{motorcycle.deliveries} entregas</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Nenhuma moto registrada</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <MaterialIcons name="logout" size={24} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
      </ScrollView>

      <SearchDrawer
        isOpen={isSearchDrawerOpen}
        onClose={() => setIsSearchDrawerOpen(false)}
        onAnimationEnd={handleSearchDrawerClose}
        onSearch={handleSearch}
        onSelect={handleSelect}
        userRole={userRole}
        userUnitId={managerUnit}
      />
      
      <OrderDetailsBottomSheet 
        order={selectedOrder}
        bottomSheetRef={bottomSheetRef}
        onClose={handleCloseBottomSheet}
        userRole={userRole}
      />
    </View>
  )};

  // console.log("[AdminScreen] Rendering GestureHandlerRootView with MainContent");
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MainContent />
    </GestureHandlerRootView>
  );
};

export default AdminScreen;