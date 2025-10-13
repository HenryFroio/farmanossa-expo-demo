import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Dimensions,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import BottomSheet from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  User, 
  Bike,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  X,
  RotateCcw
} from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { useFormsData, FormData } from '../hooks/useFormsData';
import FormDetailsBottomSheet from '../components/FormDetailsBottomSheet';

const { width } = Dimensions.get('window');

const FormsScreen = () => {
  const navigation = useNavigation();
  const { userRole, managerUnit } = useAuth();
  const { 
    forms, 
    loading, 
    loadingMore, 
    error, 
    hasMore, 
    filters,
    fetchForms,
    loadMore,
    clearFilters,
    navigateToDate,
    setSelectedDate,
    setPlateSearch
  } = useFormsData(userRole || undefined, managerUnit || undefined);
  
  const [selectedForm, setSelectedForm] = useState<FormData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [plateInput, setPlateInput] = useState('');
  
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Sincronizar o input local com o filtro
  useEffect(() => {
    setPlateInput(filters.plateSearch || '');
  }, [filters.plateSearch]);

  const handleFormPress = (form: FormData) => {
    setSelectedForm(form);
  };

  const handleCloseBottomSheet = () => {
    bottomSheetRef.current?.close();
    setSelectedForm(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchForms();
    setRefreshing(false);
  };

  const hasActiveFilters = (filters.plateSearch && filters.plateSearch.trim() !== '') || 
                          (plateInput && plateInput.trim() !== '' && plateInput !== filters.plateSearch);

  const formatDisplayDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Hoje';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Ontem';
      } else {
        return date.toLocaleDateString('pt-BR');
      }
    } catch {
      return dateString;
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    
    // Só atualiza a data se o usuário confirmou (não cancelou)
    if (event.type === 'set' && selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setSelectedDate(dateString);
    }
    // Se o usuário cancelou (event.type === 'dismissed'), não faz nada
  };

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const isToday = (dateString: string) => {
    return dateString === getCurrentDate();
  };

  const formatPlate = (text: string) => {
    // Remove todos os caracteres que não são letras ou números
    const cleaned = text.replace(/[^A-Z0-9]/g, '');
    
    // Aplica a formatação XXX-XXXX (3 letras + 4 números)
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 7) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else {
      // Limita a 7 caracteres no total
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
    }
  };

  const handlePlateChange = (text: string) => {
    // Converte para uppercase primeiro
    const upperText = text.toUpperCase();
    // Aplica a formatação
    const formattedText = formatPlate(upperText);
    
    // Atualiza o estado local imediatamente para mostrar a formatação
    setPlateInput(formattedText);
    
    // Só faz a busca se a placa estiver completa (8 caracteres incluindo hífen) ou vazia
    if (formattedText.length === 8 || formattedText.length === 0) {
      setPlateSearch(formattedText);
    }
  };

  const handlePlateSubmit = () => {
    // Permite busca manual mesmo com placa incompleta
    if (plateInput.length > 0) {
      setPlateSearch(plateInput);
    }
  };

  const clearPlateSearch = () => {
    setPlateInput('');
    setPlateSearch('');
  };

  const renderLoadMoreButton = () => {
    if (!hasMore) return null;

    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={loadMore}
        disabled={loadingMore}
      >
        {loadingMore ? (
          <ActivityIndicator size="small" color="#e41c26" />
        ) : (
          <Text style={styles.loadMoreText}>Carregar mais formulários</Text>
        )}
      </TouchableOpacity>
    );
  };

  const getOverallStatus = (form: FormData) => {
    const safetyItems = form.safetyItems || [];
    const routineItems = form.routineItems || [];
    const allItems = [...safetyItems, ...routineItems];
    
    const hasCritical = allItems.some(item => item?.status === 'critical');
    const hasAttention = allItems.some(item => item?.status === 'attention');
    
    if (hasCritical) return 'critical';
    if (hasAttention) return 'attention';
    return 'ok';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return '#10B981';
      case 'attention':
        return '#F59E0B';
      case 'critical':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle size={20} color="#10B981" />;
      case 'attention':
        return <AlertTriangle size={20} color="#F59E0B" />;
      case 'critical':
        return <XCircle size={20} color="#EF4444" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    try {
      if (!dateString) return '--/--/--';
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString || '--/--/--';
    }
  };

  const formatTime = (timeString: string | undefined) => {
    // Remove segundos se estiver presente (formato HH:MM:SS -> HH:MM)
    if (!timeString) return '--:--';
    return timeString.split(':').slice(0, 2).join(':');
  };

  const renderFormItem = ({ item }: { item: FormData }) => {
    const overallStatus = getOverallStatus(item);
    
    return (
      <TouchableOpacity
        style={styles.formItem}
        onPress={() => handleFormPress(item)}
        activeOpacity={0.7}
      >
        {/* Header com status e placa */}
        <View style={styles.formHeader}>
          <View style={styles.plateContainer}>
            <Bike size={18} color="#e41c26" />
            <Text style={styles.motorcyclePlate}>{item.motorcyclePlate || 'Placa não informada'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(overallStatus) }]}>
            {getStatusIcon(overallStatus)}
          </View>
        </View>

        {/* Informações principais */}
        <View style={styles.formContent}>
          <View style={styles.infoRow}>
            <User size={14} color="#666" />
            <Text style={styles.infoText}>{item.deliverymanName || 'Nome não informado'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <MapPin size={14} color="#666" />
            <Text style={styles.infoText}>{item.pharmacyUnitName || 'Unidade não informada'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Clock size={14} color="#666" />
            <Text style={styles.infoText}>
              {formatTime(item.initialTime)} - {formatTime(item.finalTime)}
            </Text>
          </View>
        </View>

        {/* Footer com km e observações */}
        <View style={styles.formFooter}>
          <Text style={styles.kmText}>{item.currentKm || '0'} km</Text>
          {item.observations && (
            <View style={styles.observationIndicator}>
              <Text style={styles.observationText}>📝</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {userRole === 'manager' 
          ? 'Nenhum formulário encontrado para sua unidade'
          : 'Nenhum formulário encontrado'
        }
      </Text>
    </View>
  );

  if (loading && forms.length === 0) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Formulários</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e41c26" />
            <Text style={styles.loadingText}>Carregando formulários...</Text>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  if (error) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Formulários</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {userRole === 'manager' ? 'Formulários da Unidade' : 'Formulários'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Navegação de Data */}
      <View style={styles.dateNavigationContainer}>
        <TouchableOpacity 
          onPress={() => navigateToDate('previous')} 
          style={styles.dateNavButton}
          disabled={loading}
        >
          <ChevronLeft size={20} color={loading ? "#D1D5DB" : "#374151"} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setShowDatePicker(true)} 
          style={styles.currentDateButton}
          disabled={loading}
        >
          <Calendar size={16} color="#374151" />
          <Text style={styles.currentDateText}>
            {formatDisplayDate(filters.selectedDate || getCurrentDate())}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => navigateToDate('next')} 
          style={styles.dateNavButton}
          disabled={loading || isToday(filters.selectedDate || getCurrentDate())}
        >
          <ChevronRight size={20} color={
            loading || isToday(filters.selectedDate || getCurrentDate()) 
              ? "#D1D5DB" 
              : "#374151"
          } />
        </TouchableOpacity>
      </View>

      {/* Barra de Busca */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={16} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por placa (ex: ABC-1234)..."
            value={plateInput}
            onChangeText={handlePlateChange}
            onSubmitEditing={handlePlateSubmit}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8} // XXX-XXXX = 8 caracteres
            returnKeyType="search"
          />
          {plateInput && (
            <TouchableOpacity 
              onPress={clearPlateSearch}
              style={styles.clearSearchButton}
            >
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
        
        {hasActiveFilters && (
          <TouchableOpacity onPress={() => {
            clearFilters();
            setPlateInput('');
          }} style={styles.clearAllButton}>
            <RotateCcw size={14} color="#6B7280" />
            <Text style={styles.clearAllText}>Limpar</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {forms.length} formulário{forms.length !== 1 ? 's' : ''} para {formatDisplayDate(filters.selectedDate || getCurrentDate()).toLowerCase()}
          </Text>
        </View>
      </View>        
      <FlatList
          data={forms}
          renderItem={renderFormItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#e41c26']}
              tintColor="#e41c26"
            />
          }
          ListEmptyComponent={renderEmptyComponent}
          ListFooterComponent={renderLoadMoreButton}
          showsVerticalScrollIndicator={false}
        />

        <FormDetailsBottomSheet
          form={selectedForm}
          bottomSheetRef={bottomSheetRef}
          onClose={handleCloseBottomSheet}
        />

        {showDatePicker && (
          <DateTimePicker
            value={new Date(filters.selectedDate || getCurrentDate())}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#e41c26',
  },
  dateNavigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dateNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currentDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  currentDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#374151',
  },
  clearSearchButton: {
    padding: 4,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    gap: 4,
  },
  clearAllText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  loadMoreButton: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadMoreText: {
    fontSize: 14,
    color: '#e41c26',
    fontWeight: '500',
  },
  formItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginHorizontal: 2,
    marginVertical: 4,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  plateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  motorcyclePlate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContent: {
    gap: 4,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  formFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  kmText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  observationIndicator: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  observationText: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default FormsScreen;