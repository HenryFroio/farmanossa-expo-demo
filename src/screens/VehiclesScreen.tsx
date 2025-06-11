import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Search, Edit2, Trash2, Plus, Car } from 'lucide-react-native';
import CreateVehicleModal from '../components/CreateVehicleModal';
import EditVehicleModal from '../components/EditVehicleModal';
import { useVehicles } from '../hooks/useVehicles';
import { useAuth } from '../hooks/useAuth'; // Importar useAuth
import styles from '../styles/vehicleScreenStyles';

interface Vehicle {
  id: string;
  plate: string;
  km: number;
  pharmacyUnitId: string;
  createdAt: any;
  updatedAt: any;
}

const VehiclesScreen = () => {
  const { userRole, managerUnit } = useAuth(); // Obter userRole e managerUnit
  const {
    vehicles,
    loading,
    error,
    fetchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle
  } = useVehicles();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isCreating, setIsCreating] = useState(false); // Estado de loading para criação
  const [isEditing, setIsEditing] = useState(false); // Estado de loading para edição

  const handleSearch = () => {
    setHasSearched(true);
    const queryToUse = searchQuery.trim() === '' ? undefined : searchQuery;
    if (userRole === 'manager' && managerUnit) {
      fetchVehicles(queryToUse, managerUnit);
    } else {
      fetchVehicles(queryToUse);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Se o usuário for gerente, buscar apenas veículos da unidade dele
    if (userRole === 'manager' && managerUnit) {
      fetchVehicles(undefined, managerUnit).finally(() => setRefreshing(false));
    } else {
      // Para outros usuários, também resetamos a query no refresh para undefined
      fetchVehicles(undefined).finally(() => setRefreshing(false));
    }
  };

  const handleCreateVehicle = async (vehicleData: any) => {
    setIsCreating(true);
    const result = await createVehicle(vehicleData);
    setIsCreating(false);
    if (result.success) {
      setCreateModalVisible(false);
      Alert.alert('Sucesso', 'Veículo cadastrado com sucesso!');
    } else {
      Alert.alert('Erro', result.error || 'Erro ao cadastrar veículo');
    }
  };

  const handleEditVehicle = async (vehicleData: any) => {
    setIsEditing(true);
    const result = await updateVehicle(vehicleData);
    setIsEditing(false);
    if (result.success) {
      setEditModalVisible(false);
      Alert.alert('Sucesso', 'Veículo atualizado com sucesso!');
    } else {
      Alert.alert('Erro', result.error || 'Erro ao atualizar veículo');
    }
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente inativar o veículo ${vehicle.plate}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteVehicle(vehicle);
            if (result.success) {
              Alert.alert('Sucesso', 'Veículo inativado com sucesso!');
            } else {
              Alert.alert('Erro', result.error || 'Erro ao inativar veículo');
            }
          }
        }
      ]
    );
  };

  const renderVehicle = ({ item }: { item: Vehicle }) => (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleInfo}>
        <Text style={styles.vehiclePlate}>{item.plate}</Text>
        <Text style={styles.vehicleDetails}>
          {typeof item.km === 'number' ? item.km.toFixed(2) : item.km} km • {item.pharmacyUnitId}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            setSelectedVehicle(item);
            setEditModalVisible(true);
          }}
        >
          <Edit2 size={20} color="#FF4B2B" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteVehicle(item)}
        >
          <Trash2 size={20} color="#FF4B2B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPlaceholder = () => (
    <View style={styles.placeholderContainer}>
      <Car size={64} color="#CBD5E0" />
      <Text style={styles.placeholderTitle}>Buscar Veículos</Text>
      <Text style={styles.placeholderText}>
        Digite a placa do veículo na barra de pesquisa acima para começar
      </Text>
    </View>
  );

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchVehicles()}>
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderContent = () => {
    if (loading && !refreshing) {
      return <ActivityIndicator size="large" color="#FF4B2B" style={styles.loader} />;
    }

    if (!hasSearched) {
      return renderPlaceholder();
    }

    if (vehicles.length === 0 && hasSearched) {
      return (
        <View style={styles.placeholderContainer}>
          <Car size={64} color="#CBD5E0" />
          <Text style={styles.placeholderTitle}>Nenhum Veículo Encontrado</Text>
          <Text style={styles.placeholderText}>
            Tente uma nova busca com termos diferentes
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={vehicles}
        renderItem={renderVehicle}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar veículo..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
            <Search size={20} color="#718096" />
          </TouchableOpacity>
        </View>
      </View>

      {renderContent()}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setCreateModalVisible(true)}
      >
        <Plus size={24} color="#FFF" />
        <Text style={styles.addButtonText}>Adicionar Veículo</Text>
      </TouchableOpacity>

      <CreateVehicleModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSubmit={handleCreateVehicle} // Corrigido: onCreate para onSubmit
        loading={isCreating}
        userRole={userRole ?? undefined}
        userUnitId={managerUnit ?? undefined}
      />
      {selectedVehicle && ( // Corrigido: editingVehicle para selectedVehicle
        <EditVehicleModal
          visible={isEditModalVisible}
          onClose={() => setEditModalVisible(false)}
          onSubmit={handleEditVehicle} // Corrigido: onEdit para onSubmit
          vehicle={selectedVehicle} // Corrigido: editingVehicle para selectedVehicle
          loading={isEditing}
          userRole={userRole ?? undefined}
          userUnitId={managerUnit ?? undefined}
        />
      )}
    </View>
  );
};

export default VehiclesScreen;