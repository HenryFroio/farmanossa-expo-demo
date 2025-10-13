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
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import styles from '../styles/vehicleModalStyles';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

interface CreateVehicleModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (vehicleData: any) => void;
  userRole?: string;
  userUnitId?: string;
  loading?: boolean; // Adicionado parâmetro loading
}

const { height } = Dimensions.get('window');
const DRAG_THRESHOLD = 50;

const CreateVehicleModal: React.FC<CreateVehicleModalProps> = ({
  visible,
  onClose,
  onSubmit,
  userRole,
  userUnitId,
  loading: externalLoading = false // Valor padrão é false
}) => {
  const [formData, setFormData] = useState({
    plate: '',
    km: 0,
    pharmacyUnitId: ''
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

      // Pré-seleciona a unidade se for gerente
      if (userRole === 'manager' && userUnitId) {
        setFormData(prev => ({ ...prev, pharmacyUnitId: userUnitId }));
      }

      fetchUnits();
    }
  }, [visible, userRole, userUnitId]);

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
        plate: '',
        km: 0,
        pharmacyUnitId: ''
      });
      onClose();
    });
  };

  const validateForm = () => {
    if (!formData.plate.trim()) {
      Alert.alert('Erro', 'Placa é obrigatória');
      return false;
    }
    if (formData.km < 0) {
      Alert.alert('Erro', 'Quilometragem não pode ser negativa');
      return false;
    }
    if (!formData.pharmacyUnitId) {
      Alert.alert('Erro', 'Unidade é obrigatória');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      setIsLoading(true); // Iniciar loading interno
      onSubmit(formData);
      // Note: não finalizamos o loading aqui porque o componente pai vai fechar o modal
    }
  };

  // Custom selector logic for units
  const currentUnitIndex = units.findIndex(u => u.id === formData.pharmacyUnitId);
  const currentUnitName = currentUnitIndex >= 0 
    ? `${units[currentUnitIndex].name} (${units[currentUnitIndex].id.split(' ')[1]})` 
    : 'Selecione uma unidade';

  const prevUnit = () => {
    if (userRole !== 'manager' && units.length > 0) {
      const newIndex = currentUnitIndex > 0 ? currentUnitIndex - 1 : units.length - 1;
      setFormData({ ...formData, pharmacyUnitId: units[newIndex].id });
    }
  };

  const nextUnit = () => {
    if (userRole !== 'manager' && units.length > 0) {
      const newIndex = currentUnitIndex >= 0 ? (currentUnitIndex + 1) % units.length : 0;
      setFormData({ ...formData, pharmacyUnitId: units[newIndex].id });
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
          }        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.modalDragIndicator} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Novo Veículo</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#718096" />
            </TouchableOpacity>          
          </View>

          <ScrollView
          style={styles.formContainer}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Placa</Text>
            <TextInput
              style={styles.input}
              value={formData.plate}
              onChangeText={(text) => setFormData({ ...formData, plate: text })}
              placeholder="Digite a placa"
              placeholderTextColor="#718096"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quilometragem</Text>
            <TextInput
              style={styles.input}
              value={String(formData.km)}
              onChangeText={(text) => {
                const km = parseInt(text) || 0;
                setFormData({ ...formData, km });
              }}              placeholder="Digite a quilometragem"
              placeholderTextColor="#718096"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
              <Text style={styles.label}>Unidade</Text>
              <View style={[styles.unitSelector, userRole === 'manager' && styles.disabledPickerContainer]}>
                <TouchableOpacity onPress={prevUnit} disabled={userRole === 'manager'}>
                  <ChevronLeft size={24} color={userRole === 'manager' ? '#ccc' : '#718096'} />
                </TouchableOpacity>
                <Text style={{ flex: 1, textAlign: 'center', color: '#2D3748', fontSize: 16 }}>
                  {currentUnitName}
                </Text>
                <TouchableOpacity onPress={nextUnit} disabled={userRole === 'manager'}>
                  <ChevronRight size={24} color={userRole === 'manager' ? '#ccc' : '#718096'} />
                </TouchableOpacity>              
                </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleClose}
            disabled={externalLoading || isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={handleSubmit}
            disabled={externalLoading || isLoading}
          >
            {externalLoading || isLoading ? (              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>Criar Veículo</Text>
            )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

export default CreateVehicleModal;