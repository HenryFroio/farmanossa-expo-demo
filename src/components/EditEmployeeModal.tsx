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
// import { Picker } from '@react-native-picker/picker'; // Removed
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native'; // Added ChevronLeft, ChevronRight
import styles from '../styles/EmployeeModalStyles';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

interface EditEmployeeModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (employeeData: any) => void;
  employee: any;
  userRole?: string; // Adicionado
  userUnitId?: string; // Adicionado
  loading?: boolean; // Adicionado
}

const ROLES = [
  { label: 'Administrador', value: 'admin' },
  { label: 'Entregador', value: 'deliv' },
  { label: 'Gerente', value: 'manager' },
  { label: 'Atendente', value: 'attendant' }
];

const { height } = Dimensions.get('window');
const DRAG_THRESHOLD = 50;

const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  visible,
  onClose,
  onSubmit,
  employee,
  userRole,
  userUnitId,
  loading: externalLoading = false
}) => {
  const [formData, setFormData] = useState({
    id: '',
    displayName: '',
    email: '',
    role: '',
    unit: '',
    chavePix: ''
  });
  const [units, setUnits] = useState<Array<{ id: string, name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

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
    }
  }, [visible]);
  useEffect(() => {
    if (visible && employee) {
      setFormData({
        id: employee.id,
        displayName: employee.displayName,
        email: employee.email,
        role: employee.role,
        unit: employee.unit,
        chavePix: ''
      });
      
      // Se for ou está se tornando um entregador, buscar chave PIX (se disponível)
      fetchDeliverymanPix();
      
      fetchUnits();
    }
  }, [visible, employee]);  const fetchDeliverymanPix = async () => {
    try {
      // Primeiro tentamos buscar na coleção deliverymen com o ID atual
      const deliverymanRef = doc(db, 'deliverymen', employee.id);
      const deliverymanDoc = await getDoc(deliverymanRef);
      
      if (deliverymanDoc.exists()) {
        const data = deliverymanDoc.data();
        setFormData(prev => ({
          ...prev,
          chavePix: data?.chavePix || ''
        }));
      }
      // Se não encontrar e o funcionário não for entregador,
      // verificamos se já existe um entregador com o mesmo email
      else if (employee.role !== 'deliv' && formData.role === 'deliv') {
        const deliverymenRef = collection(db, 'deliverymen');
        const q = query(deliverymenRef, where('previousId', '==', employee.id));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Encontramos um entregador que já foi transformado deste funcionário antes
          const prevDelivDoc = querySnapshot.docs[0];
          const data = prevDelivDoc.data();
          setFormData(prev => ({
            ...prev,
            chavePix: data?.chavePix || ''
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados do entregador:', error);
    }
  };

  const fetchUnits = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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
      onSubmit(formData);
      // Note: não finalizamos o loading aqui porque o componente pai vai fechar o modal
    }
  };

  // Custom selector logic for roles
  const availableRoles = userRole === 'admin' ? ROLES : ROLES.filter(r => ['deliv', 'attendant'].includes(r.value));
  const currentRoleIndex = availableRoles.findIndex(r => r.value === formData.role);
  const currentRoleLabel = currentRoleIndex >= 0 ? availableRoles[currentRoleIndex].label : 'Selecione uma função';

  const prevRole = () => {
    if (availableRoles.length > 0) {
      const newIndex = currentRoleIndex > 0 ? currentRoleIndex - 1 : availableRoles.length - 1;
      setFormData({ ...formData, role: availableRoles[newIndex].value });
    }
  };

  const nextRole = () => {
    if (availableRoles.length > 0) {
      const newIndex = currentRoleIndex >= 0 ? (currentRoleIndex + 1) % availableRoles.length : 0;
      setFormData({ ...formData, role: availableRoles[newIndex].value });
    }
  };

  // Custom selector logic for units
  const currentUnitIndex = units.findIndex(u => u.id === formData.unit);
  const currentUnitName = currentUnitIndex >= 0 
    ? `${units[currentUnitIndex].name} (${units[currentUnitIndex].id.split(' ')[1] || ''})` 
    : 'Selecione uma unidade';

  const prevUnit = () => {
    if (userRole !== 'manager' && units.length > 0) {
      const newIndex = currentUnitIndex > 0 ? currentUnitIndex - 1 : units.length - 1;
      setFormData({ ...formData, unit: units[newIndex].id });
    }
  };

  const nextUnit = () => {
    if (userRole !== 'manager' && units.length > 0) {
      const newIndex = currentUnitIndex >= 0 ? (currentUnitIndex + 1) % units.length : 0;
      setFormData({ ...formData, unit: units[newIndex].id });
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
          <Text style={styles.modalTitle}>Editar Funcionário</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#718096" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formContainer}>
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
              style={[styles.input, { backgroundColor: '#f0f0f0' }]}
              value={formData.email}
              editable={false}
              placeholderTextColor="#718096"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Função</Text>
            {/* <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                style={styles.picker}
              >
                {(userRole === 'admin' ? ROLES : ROLES.filter(role => 
                  ['deliv', 'attendant'].includes(role.value)
                )).map((role) => (
                  <Picker.Item key={role.value} label={role.label} value={role.value} />
                ))}
              </Picker>
            </View> */}
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
            {/* <View style={[styles.pickerContainer, userRole === 'manager' && styles.disabledPickerContainer]}>
              <Picker
                selectedValue={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
                style={styles.picker}
                enabled={userRole !== 'manager'} // Desabilita para gerentes
              >
                {units.map((unit) => (
                  <Picker.Item key={unit.id} label={unit.name} value={unit.id} />
                ))}
              </Picker>
            </View> */}
            <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, userRole === 'manager' && styles.disabledPickerContainer]}>
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
              <Text style={styles.submitButtonText}>Salvar Alterações</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

export default EditEmployeeModal;