import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import styles from '../styles/EmployeeModalStyles';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

interface CreateEmployeeModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (employeeData: any) => void;
  userRole?: string; // Adicionado
  userUnitId?: string; // Adicionado
  loading?: boolean; // Adicionado parâmetro loading
}

const ROLES = [
  { label: 'Administrador', value: 'admin' },
  { label: 'Entregador', value: 'deliv' },
  { label: 'Gerente', value: 'manager' },
  { label: 'Atendente', value: 'attendant' }
];

const { height } = Dimensions.get('window');
const DRAG_THRESHOLD = 50;

const CreateEmployeeModal: React.FC<CreateEmployeeModalProps> = ({
  visible,
  onClose,
  onSubmit,
  userRole,
  userUnitId,
  loading: externalLoading = false // Valor padrão é false
}) => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    unit: '',
    chavePix: ''
  });
  const [units, setUnits] = useState<Array<{ id: string, name: string }>>([]);
  const [loadingState, setLoadingState] = useState(false);

  const overlayAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(height)).current;
  const modalY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          modalY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DRAG_THRESHOLD) {
          handleClose();
        } else {
          Animated.spring(modalY, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true
          }).start();
        }
      }
    })
  ).current;

  useEffect(() => {
    if (visible) {
      modalY.setValue(0);
      modalAnim.setValue(height);
      overlayAnim.setValue(0);
      
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(modalAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        })
      ]).start();

      // Pré-seleciona a unidade se for gerente
      if (userRole === 'manager' && userUnitId) {
        setFormData(prev => ({ ...prev, unit: userUnitId }));
      }

      fetchUnits();
    }
  }, [visible, userRole, userUnitId]); // Adicionado userRole e userUnitId às dependências

  const fetchUnits = async () => {
    try {
      const unitsRef = collection(db, 'pharmacyUnits');
      const snapshot = await getDocs(unitsRef);
      const unitsList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setUnits(unitsList);
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
      Alert.alert('Erro', 'Não foi possível carregar as unidades.');
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setFormData({
        displayName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: '',
        unit: '',
        chavePix: ''
      });
      onClose();
    });
  };

  const validateForm = () => {
    if (!formData.displayName.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Erro', 'Email é obrigatório');
      return false;
    }
    if (!formData.password.trim()) {
      Alert.alert('Erro', 'Senha é obrigatória');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return false;
    }
    if (!formData.role) {
      Alert.alert('Erro', 'Função é obrigatória');
      return false;
    }
    if (!formData.unit) {
      Alert.alert('Erro', 'Unidade é obrigatória');
      return false;
    }
    if (formData.role === 'deliv' && !formData.chavePix?.trim()) {
      Alert.alert('Erro', 'Chave PIX é obrigatória para entregadores');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      setLoadingState(true); // Iniciar loading interno
      onSubmit(formData);
      // Note: não finalizamos o loading aqui porque o componente pai vai fechar o modal
    }
  };

  // Custom selector logic for roles and units
  const availableRoles = userRole === 'admin' ? ROLES : ROLES.filter(r => ['deliv', 'attendant'].includes(r.value));
  const currentRoleIndex = availableRoles.findIndex(r => r.value === formData.role);
  const currentRoleLabel = currentRoleIndex >= 0 ? availableRoles[currentRoleIndex].label : 'Selecione uma função';
  const prevRole = () => {
    const idx = currentRoleIndex > 0 ? currentRoleIndex - 1 : availableRoles.length - 1;
    setFormData({ ...formData, role: availableRoles[idx].value });
  };
  const nextRole = () => {
    const idx = (currentRoleIndex + 1) % availableRoles.length;
    setFormData({ ...formData, role: availableRoles[idx].value });
  };

  const availableUnits = units;
  const currentUnitIndex = availableUnits.findIndex(u => u.id === formData.unit);
  const currentUnitName = currentUnitIndex >= 0 
    ? `${availableUnits[currentUnitIndex].name} (${availableUnits[currentUnitIndex].id.split(' ')[1]})` 
    : 'Selecione uma unidade';

  const prevUnit = () => {
    if (userRole !== 'manager' && availableUnits.length > 0) {
      const idx = currentUnitIndex > 0 ? currentUnitIndex - 1 : availableUnits.length - 1;
      setFormData({ ...formData, unit: availableUnits[idx].id });
    }
  };
  const nextUnit = () => {
    if (userRole !== 'manager' && availableUnits.length > 0) {
      const idx = currentUnitIndex >= 0 ? (currentUnitIndex + 1) % availableUnits.length : 0;
      setFormData({ ...formData, unit: availableUnits[idx].id });
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.modalOverlay,
          { opacity: overlayAnim }
        ]}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.modalContent,
          {
            transform: [
              { translateY: modalAnim },
              { translateY: modalY }
            ]
          }
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.modalDragIndicator} />
        
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Novo Funcionário</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#718096" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={{ width: '100%' }}
        >
          <ScrollView 
            style={styles.formContainer}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput
                style={styles.input}
                value={formData.displayName}
                onChangeText={(text) => setFormData({ ...formData, displayName: text })}
                placeholder="Digite o nome completo"
                placeholderTextColor="#718096"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="Digite o email"
                placeholderTextColor="#718096"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Digite a senha"
                placeholderTextColor="#718096"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmar Senha</Text>
              <TextInput
                style={styles.input}
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                placeholder="Confirme a senha"
                placeholderTextColor="#718096"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Função</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity onPress={prevRole}>
                  <ChevronLeft size={24} color="#718096" />
                </TouchableOpacity>
                <Text style={{ flex: 1, textAlign: 'center', color: '#333' }}>{currentRoleLabel}</Text>
                <TouchableOpacity onPress={nextRole}>
                  <ChevronRight size={24} color="#718096" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Unidade</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity onPress={prevUnit} disabled={userRole === 'manager'}>
                  <ChevronLeft size={24} color={userRole === 'manager' ? '#ccc' : '#718096'} />
                </TouchableOpacity>
                <Text style={{ flex: 1, textAlign: 'center', color: '#333' }}>
                  {currentUnitName}
                </Text>
                <TouchableOpacity onPress={nextUnit} disabled={userRole === 'manager'}>
                  <ChevronRight size={24} color={userRole === 'manager' ? '#ccc' : '#718096'} />
                </TouchableOpacity>
              </View>
            </View>

            {formData.role === 'deliv' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Chave PIX</Text>
                <TextInput
                  style={styles.input}
                  value={formData.chavePix}
                  onChangeText={(text) => setFormData({ ...formData, chavePix: text })}
                  placeholder="Digite a chave PIX"
                  placeholderTextColor="#718096"
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleClose}
              disabled={externalLoading} // Desabilitar durante o loading
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={externalLoading} // Desabilitar durante o loading
            >
              {externalLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Criar Funcionário</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

export default CreateEmployeeModal;