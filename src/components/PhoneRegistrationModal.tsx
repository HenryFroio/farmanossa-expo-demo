import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated
} from 'react-native';
import { Phone, Smartphone } from 'lucide-react-native';
import { mask } from 'react-native-mask-text';
import styles from '../styles/clientScreenStyles';
// Comentado temporariamente
// import { phoneVerificationService } from '../services/phoneVerification';

interface PhoneRegistrationModalProps {
  visible: boolean;
  onSubmit: (phone: string) => Promise<void>;
}

const PhoneRegistrationModal: React.FC<PhoneRegistrationModalProps> = ({ 
  visible, 
  onSubmit 
}) => {
  const [phone, setPhone] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations to initial values
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);

      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handlePhoneChange = (value: string) => {
    const maskedValue = mask(value, '(99) 99999-9999');
    setPhone(maskedValue);
    setIsValid(maskedValue.replace(/[^0-9]/g, '').length === 11);
  };

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert('Número Inválido', 'Por favor, insira um número de telefone válido com DDD.');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(phone);
      setPhone('');
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao salvar o número de telefone');
    } finally {
      setIsLoading(false);
    }
  };

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [{ scale: scaleAnim }]
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={() => {}}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <Animated.View
          style={[
            styles.phoneModalContent,
            animatedStyle
          ]}
        >
          <Smartphone 
            size={48} 
            color="#e41c26" 
            style={styles.phoneModalIcon} 
          />
          
          <Text style={styles.phoneModalTitle}>
            Bem-vindo!
          </Text>
          
          <Text style={styles.phoneModalDescription}>
            Para acessar seus pedidos, precisamos do seu número de telefone.
          </Text>

          <View style={styles.phoneInputContainer}>
            <Phone 
              size={24} 
              color="#718096" 
              style={styles.phoneInputIcon} 
            />
            <TextInput
              style={styles.phoneInput}
              placeholder="(00) 00000-0000"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="numeric"
              maxLength={15}
              placeholderTextColor="#718096"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity 
            style={[
              styles.phoneSubmitButton,
              (!isValid || isLoading) && styles.phoneSubmitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.phoneSubmitButtonText}>
                Continuar
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.phoneModalDisclaimer}>
            Usaremos este número apenas para identificar seus pedidos
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default PhoneRegistrationModal;