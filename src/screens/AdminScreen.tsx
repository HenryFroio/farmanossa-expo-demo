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
// MIGRAÇÃO BIGQUERY: useAdminData (60s Firestore) → useAdminDataBigQuery (<1s BigQuery + Cache)
import { useAdminDataBigQuery as useAdminData, TimePeriod } from '../hooks/useAdminDataBigQuery';
import SearchDrawer from '../components/SearchDrawer';
import OrderDetailsBottomSheet from '../components/OrderDetailsBottomSheet';
import MetricSkeleton from '../components/MetricSkeleton';

const { width } = Dimensions.get('window');

const AdminScreen = () => {
  // 1. Hooks básicos - sempre executados
  const navigation = useNavigation();
  const bottomSheetRef = React.useRef<any>(null);
  const { userRole, managerUnit, signOut } = useAuth(); // Removed authLoading
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<any>(null);
  const [timePeriod, setTimePeriod] = React.useState<TimePeriod>(TimePeriod.DAILY);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  
  // 2. Hook de dados - BIGQUERY MIGRATION
  const { 
    deliverymen, 
    pharmacyUnits, 
    // deliveredOrders, // BIGQUERY: Não usado mais - dados vêm de bigQueryStats
    dummyOrders, // Mantido para funcionalidade de busca
    loading: dataLoading, 
    error,
    bigQueryStats // BIGQUERY: Stats pré-agregadas do servidor
  } = useAdminData(userRole, managerUnit, timePeriod);
  

  
  // Estado simplificado para verificar se os dados estão prontos para renderização
  const [dataReady, setDataReady] = useState(false);

  // Track when initial load is complete
  useEffect(() => {
    if (!dataLoading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [dataLoading, isInitialLoad]);

  // Verificar se os dados estão prontos (sem timeouts desnecessários)
  useEffect(() => {
    if (dataLoading) {
      setDataReady(false);
      return;
    }
    
    // Para manager, verificar se tem dados da unidade
    if (userRole === 'manager') {
      const hasManagerData = !!managerUnit && pharmacyUnits.length > 0;
      setDataReady(hasManagerData);
    } else {
      // Para admin ou outros roles, dados estão prontos quando não estão carregando
      setDataReady(true);
    }
    
  }, [dataLoading, userRole, managerUnit, pharmacyUnits.length]);  // 3. Funções auxiliares
  const removeAccents = React.useCallback((str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }, []);

  const getShortName = React.useCallback((fullName: string) => {
    return fullName.length > 12 ? `${fullName.slice(0, 12)}...` : fullName;
  }, []);

  const getPeriodLabel = React.useCallback((period: TimePeriod) => {
    switch (period) {
      case TimePeriod.DAILY:
        return 'Hoje';
      case TimePeriod.WEEKLY:
        return 'Semana';
      case TimePeriod.MONTHLY:
        return 'Mês';
      default:
        return 'Semana';
    }
  }, []);

  // Handler para fechar o BottomSheet
  const handleCloseBottomSheet = React.useCallback(() => {
    setSelectedOrder(null);
  }, []);

  // 4. Memoização de dados
  const currentUnit = React.useMemo(() => {
    if (userRole === 'manager' && managerUnit) {
      const foundUnit = pharmacyUnits.find(unit => unit.id === managerUnit);
      return foundUnit;
    }
    return null;
  }, [userRole, managerUnit, pharmacyUnits]);
  
  // BIGQUERY: Dados pré-agregados - substitui reduce client-side
  const ordersByDeliveryman = React.useMemo(() => {
    if (!bigQueryStats || !dataReady) return {};
    return bigQueryStats.ordersByDeliveryman || {};
  }, [bigQueryStats, dataReady]);
  
  const deliveryData = React.useMemo(() => {
    if (!dataReady || !deliverymen.length || !bigQueryStats) {
      return [];
    }

    // BIGQUERY: Usar stats pré-calculadas em vez de processar client-side
    const deliveryCount = deliverymen.map(deliveryman => ({
      id: deliveryman.id,
      name: getShortName(deliveryman.name),
      deliveries: ordersByDeliveryman[deliveryman.id]?.count || 0,
    }));

    const sortedData = deliveryCount
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, 5);

    if (sortedData.length === 0) return [];

    return sortedData.map((data, index) => ({
      name: data.name,
      population: data.deliveries,
      color: [`#FF6384`, `#36A2EB`, `#FFCE56`, `#4BC0C0`, `#9966FF`][index % 5],
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    }));
  }, [deliverymen, ordersByDeliveryman, getShortName, dataReady, bigQueryStats]);
  
  // BIGQUERY: Dados pré-agregados por unidade
  const ordersByUnit = React.useMemo(() => {
    if (!bigQueryStats || !dataReady || userRole === 'manager') {
      return {}; 
    }
    return bigQueryStats.ordersByUnit || {};
  }, [bigQueryStats, dataReady, userRole]);
  
  const unitData = React.useMemo(() => {
    if (!dataReady || !bigQueryStats) {
      return [];
    }
    
    if (userRole === 'manager' && currentUnit) {
      // BIGQUERY: Usar totalOrders do stats (já filtrado por unidade na API)
      const deliveriesCount = bigQueryStats.deliveredOrders || 0;
      return [{
        id: currentUnit.id,
        name: currentUnit.name,
        deliveries: deliveriesCount
      }];
    }
    
    // Admin case: BIGQUERY pré-agregado por unidade
    if (!pharmacyUnits.length) return [];

    const unitCount = pharmacyUnits.map(unit => ({
      id: unit.id,
      name: unit.name,
      deliveries: ordersByUnit[unit.id]?.count || 0,
    }));

    return unitCount
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, 5);
  }, [
    userRole, 
    currentUnit, 
    pharmacyUnits, 
    ordersByUnit, 
    dataReady, 
    bigQueryStats,
    getShortName
  ]);
  
  // BIGQUERY: Uso de motos pré-agregado
  const motorcycleData = React.useMemo(() => {
    if (!dataReady || !bigQueryStats) {
      return [];
    }
    
    const motorcycleUsage = bigQueryStats.motorcycleUsage || {};
    
    return Object.entries(motorcycleUsage)
      .sort(([, a]: [string, any], [, b]: [string, any]) => b.count - a.count)
      .slice(0, 5)
      .map(([plate, data]: [string, any]) => ({ 
        plate, 
        deliveries: data.count 
      }));
  }, [bigQueryStats, dataReady]);

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
        order.items.some((item: any) => item.toLowerCase().includes(query.toLowerCase()))
      );
    }
    return [];
  }, [deliverymen, pharmacyUnits, dummyOrders, removeAccents]);

  const handleSelect = React.useCallback((
    selected: string | string[] | any, 
    type: 'deliveryman' | 'unit' | 'order' | null
  ) => {
    if (type === 'order') {
      // Se selected já é um objeto (pedido completo do Firestore), usa diretamente
      let selectedOrder;
      if (typeof selected === 'object' && selected !== null && !Array.isArray(selected)) {
        selectedOrder = selected;
      } else {
        // Fallback: busca em dummyOrders se for apenas um ID
        selectedOrder = dummyOrders.find(order => order.id === selected);
      }
      
      if (selectedOrder) { 
        setSelectedOrder(selectedOrder);
        setIsSearchDrawerOpen(false);
        
        // Pequeno delay para garantir que o drawer fechou completamente
        setTimeout(() => {
          bottomSheetRef.current?.expand();
        }, 100);
      }
    } else {
      const ids = Array.isArray(selected) ? selected : [selected];
      
      // Preparar dados dos entregadores para passar para StatsScreen
      let deliverymenForUnit: any[] = [];
      if (type === 'unit' && ids.length === 1 && deliverymen && bigQueryStats) {
        const unitId = ids[0];
        
        // Filtrar entregadores desta unidade específica
        // BigQuery já contém apenas deliverymen ATIVOS (inactive são removidos automaticamente)
        deliverymenForUnit = deliverymen
          .filter(dm => dm.pharmacyUnitId === unitId)
          .map(dm => {
            const stats = bigQueryStats.ordersByDeliveryman?.[dm.id] || {};
            return {
              id: dm.id,
              name: dm.name,
              deliveries: stats.count || 0,
              averageRating: stats.avgRating || 0
            };
          })
          .sort((a, b) => b.deliveries - a.deliveries); // Ordenar por número de entregas
      }
      
      setIsSearchDrawerOpen(false);      
      (navigation as any).navigate('Stats', { 
        type, 
        ids,
        ...(managerUnit ? { managerUnit } : {}),
        ...(deliverymenForUnit.length > 0 ? { allDeliverymenStats: deliverymenForUnit } : {})
      });
    }
  }, [dummyOrders, navigation, managerUnit, deliverymen, bigQueryStats]);
  
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

  // Função para gerar mensagem contextual baseada no período
  const getLoadingMessage = (period: TimePeriod, userRole: string | null | undefined) => {
    const baseMessage = userRole === 'manager' 
      ? 'Carregando dados da unidade' 
      : 'Carregando dados administrativos';
    
    // Com BigQuery, o carregamento é rápido em todos os períodos
    return `${baseMessage}...`;
  };

  // 6. Renderização condicional para loading e erro - apenas loading inicial
  if (dataLoading && isInitialLoad) { // Only show full screen loading on initial load
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#e41c26" />
        <View style={styles.loadingTextContainer}>
          <Text style={styles.loadingMainText}>
            {getLoadingMessage(timePeriod, userRole).split('\n')[0]}
          </Text>
          {getLoadingMessage(timePeriod, userRole).includes('\n') && (
            <Text style={styles.loadingSubText}>
              {getLoadingMessage(timePeriod, userRole).split('\n')[1]}
            </Text>
          )}
        </View>
      </View>
    );
  }

  if (error) {
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

  const MainContent = () => {
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

      {/* Time Period Toggle Buttons */}
      <View style={styles.periodToggleContainer}>
        <TouchableOpacity
          style={[
            styles.periodToggleButton,
            timePeriod === TimePeriod.DAILY && styles.periodToggleButtonActive,
            dataLoading && styles.periodToggleButtonDisabled
          ]}
          onPress={() => !dataLoading && setTimePeriod(TimePeriod.DAILY)}
          disabled={dataLoading}
        >
          <Text style={[
            styles.periodToggleText,
            timePeriod === TimePeriod.DAILY && styles.periodToggleTextActive
          ]}>
            Hoje
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.periodToggleButton,
            timePeriod === TimePeriod.WEEKLY && styles.periodToggleButtonActive,
            dataLoading && styles.periodToggleButtonDisabled
          ]}
          onPress={() => !dataLoading && setTimePeriod(TimePeriod.WEEKLY)}
          disabled={dataLoading}
        >
          <Text style={[
            styles.periodToggleText,
            timePeriod === TimePeriod.WEEKLY && styles.periodToggleTextActive
          ]}>
            Semana
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.periodToggleButton,
            timePeriod === TimePeriod.MONTHLY && styles.periodToggleButtonActive,
            dataLoading && styles.periodToggleButtonDisabled
          ]}
          onPress={() => !dataLoading && setTimePeriod(TimePeriod.MONTHLY)}
          disabled={dataLoading}
        >
          <Text style={[
            styles.periodToggleText,
            timePeriod === TimePeriod.MONTHLY && styles.periodToggleTextActive
          ]}>
            Mês
          </Text>
        </TouchableOpacity>
      </View>

      {/* Period Loading Indicator */}
      {dataLoading && !isInitialLoad && (
        <View style={styles.periodLoadingContainer}>
          <ActivityIndicator size="small" color="#e41c26" />
          <View style={styles.periodLoadingTextContainer}>
            <Text style={styles.periodLoadingText}>
              {getLoadingMessage(timePeriod, userRole).split('\n')[0]}
            </Text>
            {getLoadingMessage(timePeriod, userRole).includes('\n') && (
              <Text style={styles.periodLoadingSubText}>
                {getLoadingMessage(timePeriod, userRole).split('\n')[1]}
              </Text>
            )}
          </View>
        </View>
      )}

      <ScrollView>        
        <View 
          style={styles.section}
        >
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>
              Top 5 Entregadores
            </Text>
            <Text style={styles.sectionPeriod}>
              {getPeriodLabel(timePeriod)}
            </Text>
          </View>
          
          {!dataReady ? (
            <MetricSkeleton height={240} showChart={true} titleWidth={200} />
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
            <Text style={styles.sectionLoadingText}>Nenhum entregador encontrado</Text>
          )}
        </View>        
        <View 
          style={styles.section}
        >
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>
              {userRole === 'manager' ? 'Estatísticas da Unidade' : 'Top 5 Unidades'}
            </Text>
            <Text style={styles.sectionPeriod}>
              {getPeriodLabel(timePeriod)}
            </Text>
          </View>
          
          {!dataReady ? (
            <MetricSkeleton height={180} showChart={false} titleWidth={250} />
          ) : unitData.length > 0 ? (
            unitData.map((unit, index) => (
              <View key={index} style={styles.unitItem}>
                <Text style={styles.unitName}>{unit.name}</Text>
                <Text style={styles.unitDeliveries}>{unit.deliveries} entregas</Text>
              </View>
            ))
          ) : (
            <Text style={styles.sectionLoadingText}>Nenhuma entrega registrada</Text>
          )}
        </View>

        <View 
          style={styles.section}
        >
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>
              {userRole === 'manager' ? 'Motos da Unidade' : 'Top 5 Motos'}
            </Text>
            <Text style={styles.sectionPeriod}>
              {getPeriodLabel(timePeriod)}
            </Text>
          </View>
          
          {!dataReady ? (
            <MetricSkeleton height={160} showChart={false} titleWidth={180} />
          ) : motorcycleData.length > 0 ? (
            motorcycleData.map((motorcycle, index) => (
              <View key={index} style={styles.unitItem}>
                <Text style={styles.unitName}>{motorcycle.plate}</Text>
                <Text style={styles.unitDeliveries}>{motorcycle.deliveries} entregas</Text>
              </View>
            ))
          ) : (
            <Text style={styles.sectionLoadingText}>Nenhuma moto registrada</Text>
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
        onSearch={handleSearch as any}
        onSelect={handleSelect as any}
        userRole={userRole || undefined}
        userUnitId={managerUnit || undefined}
      />
      
      <OrderDetailsBottomSheet 
        order={selectedOrder}
        bottomSheetRef={bottomSheetRef}
        onClose={handleCloseBottomSheet}
        userRole={userRole || undefined}
      />
    </View>
  )};

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MainContent />
    </GestureHandlerRootView>
  );
};

export default AdminScreen;