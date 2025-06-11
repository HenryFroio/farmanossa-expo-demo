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
import { Search, Edit2, Trash2, Plus, Users } from 'lucide-react-native';
import CreateEmployeeModal from '../components/CreateEmployeeModal';
import EditEmployeeModal from '../components/EditEmployeeModal';
import { useEmployees } from '../hooks/useEmployees';
import { useAuth } from '../hooks/useAuth'; // Importar useAuth
import styles from '../styles/EmployeesScreenStyles';

interface Employee {
  id: string;
  displayName: string;
  email: string;
  role: string;
  unit: string;
  updatedAt: any;
  status?: string;
}

const getRoleInPortuguese = (role: string): string => {
  const roles = {
    deliv: 'Entregador',
    attendant: 'Balconista',
    manager: 'Gerente',
    admin: 'Administrador'
  };
  return roles[role as keyof typeof roles] || role;
};

const EmployeesScreen = () => {
  const { userRole, managerUnit } = useAuth(); // Obter userRole e managerUnit
  const {
    employees,
    loading,
    error,
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee
  } = useEmployees();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isCreating, setIsCreating] = useState(false); // Estado de loading para criação
  const [isEditing, setIsEditing] = useState(false); // Estado de loading para edição

  const handleSearch = () => {
    setHasSearched(true);
    // Se o usuário for gerente, buscar apenas funcionários da unidade dele
    if (userRole === 'manager' && managerUnit) {
      fetchEmployees(searchQuery, managerUnit);
    } else {
      fetchEmployees(searchQuery);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Se o usuário for gerente, buscar apenas funcionários da unidade dele
    if (userRole === 'manager' && managerUnit) {
      fetchEmployees('', managerUnit).finally(() => setRefreshing(false));
    } else {
      fetchEmployees().finally(() => setRefreshing(false));
    }
  };

  const handleCreateEmployee = async (employeeData: any) => {
    setIsCreating(true);
    const result = await createEmployee(employeeData);
    setIsCreating(false);
    if (result.success) {
      setCreateModalVisible(false);
      Alert.alert('Sucesso', 'Funcionário criado com sucesso!');
    } else {
      Alert.alert('Erro', result.error || 'Erro ao criar funcionário');
    }
  };

  const handleEditEmployee = async (employeeData: any) => {
    setIsEditing(true);
    const result = await updateEmployee(employeeData);
    setIsEditing(false);
    if (result.success) {
      setEditModalVisible(false);
      Alert.alert('Sucesso', 'Funcionário atualizado com sucesso!');
    } else {
      Alert.alert('Erro', result.error || 'Erro ao atualizar funcionário');
    }
  };

  const handleDeleteEmployee = (employee: Employee) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente inativar o funcionário ${employee.displayName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteEmployee(employee);
            if (result.success) {
              Alert.alert('Sucesso', 'Funcionário inativado com sucesso!');
            } else {
              Alert.alert('Erro', result.error || 'Erro ao inativar funcionário');
            }
          }
        }
      ]
    );
  };

  const renderEmployee = ({ item }: { item: Employee }) => (
    <View style={styles.employeeCard}>
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{item.displayName}</Text>
        <Text style={styles.employeeDetails}>
          {item.email} • {"\n"} {getRoleInPortuguese(item.role)} • {item.unit}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            setSelectedEmployee(item);
            setEditModalVisible(true);
          }}
        >
          <Edit2 size={20} color="#FF4B2B" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteEmployee(item)}
        >
          <Trash2 size={20} color="#FF4B2B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPlaceholder = () => (
    <View style={styles.placeholderContainer}>
      <Users size={64} color="#CBD5E0" />
      <Text style={styles.placeholderTitle}>Buscar Funcionários</Text>
      <Text style={styles.placeholderText}>
        Digite o nome do funcionário na barra de pesquisa acima para começar
      </Text>
    </View>
  );

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchEmployees()}>
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

    if (employees.length === 0 && hasSearched) {
      return (
        <View style={styles.placeholderContainer}>
          <Users size={64} color="#CBD5E0" />
          <Text style={styles.placeholderTitle}>Nenhum Funcionário Encontrado</Text>
          <Text style={styles.placeholderText}>
            Tente uma nova busca com termos diferentes
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={employees}
        renderItem={renderEmployee}
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
            placeholder="Buscar funcionário..."
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
        <Text style={styles.addButtonText}>Adicionar Funcionário</Text>
      </TouchableOpacity>

      <CreateEmployeeModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSubmit={handleCreateEmployee} // Corrigido: onCreate para onSubmit
        loading={isCreating}
        userRole={userRole ?? undefined}
        userUnitId={managerUnit ?? undefined}
      />
      {selectedEmployee && ( // Corrigido: editingEmployee para selectedEmployee
        <EditEmployeeModal
          visible={isEditModalVisible}
          onClose={() => setEditModalVisible(false)}
          onSubmit={handleEditEmployee} // Corrigido: onEdit para onSubmit
          employee={selectedEmployee} // Corrigido: editingEmployee para selectedEmployee
          loading={isEditing}
          userRole={userRole ?? undefined}
          userUnitId={managerUnit ?? undefined}
        />
      )}
    </View>
  );
};

export default EmployeesScreen;