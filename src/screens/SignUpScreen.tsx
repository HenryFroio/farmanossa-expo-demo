import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import styles from '../styles/signUpScreenStyles';

interface PrivacyPreferences {
  isPrivateEmail: boolean;
  allowAdvertising: boolean;
}

interface UserData {
  role: 'anon' | 'cliente' | 'admin';
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  createdAt: any; // FirebaseFirestore.Timestamp
  privacyPreferences: PrivacyPreferences;
  expoPushToken?: string;
  tokenUpdatedAt?: any; // FirebaseFirestore.Timestamp
}

interface SignUpFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  isPrivateEmail: boolean;
  allowAdvertising: boolean;
}

const SignUpScreen = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const { createOrUpdateUserRole } = useAuth();
  
  const [formData, setFormData] = useState<SignUpFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    showPassword: false,
    showConfirmPassword: false,
    isPrivateEmail: false,
    allowAdvertising: false,
  });

  const handleChange = (key: keyof SignUpFormData) => (value: string | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const togglePasswordVisibility = (field: 'showPassword' | 'showConfirmPassword') => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSignUp = async () => {
    const { name, email, password, confirmPassword, isPrivateEmail, allowAdvertising } = formData;

    // Validações
    if (!name.trim() || !email.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    try {
      setIsLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(userCredential.user, { displayName: name });
      
      // Passa as preferências de privacidade para a função de criação do usuário
      await createOrUpdateUserRole(userCredential.user, {
        isPrivateEmail,
        allowAdvertising,
      });
      
      Alert.alert('Sucesso', 'Conta criada com sucesso!', [
        { text: 'OK', onPress: () => navigation.navigate('Client' as never) }
      ]);
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      
      let errorMessage = 'Erro ao criar conta. Tente novamente.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está em uso.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Senha muito fraca.';
      }
      
      Alert.alert('Erro', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#2D3748" />
          </TouchableOpacity>

          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>Preencha seus dados para começar</Text>

          <View style={styles.formContainer}>
            {/* Nome */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="account-outline" size={20} color="#718096" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nome completo"
                value={formData.name}
                onChangeText={handleChange('name')}
                autoCapitalize="words"
              />
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#718096" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-mail"
                value={formData.email}
                onChangeText={handleChange('email')}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Senha */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#718096" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                value={formData.password}
                onChangeText={handleChange('password')}
                secureTextEntry={!formData.showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={() => togglePasswordVisibility('showPassword')}
                style={styles.passwordIcon}
              >
                <MaterialCommunityIcons 
                  name={formData.showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#718096"
                />
              </TouchableOpacity>
            </View>

            {/* Confirmar Senha */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#718096" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirmar senha"
                value={formData.confirmPassword}
                onChangeText={handleChange('confirmPassword')}
                secureTextEntry={!formData.showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={() => togglePasswordVisibility('showConfirmPassword')}
                style={styles.passwordIcon}
              >
                <MaterialCommunityIcons 
                  name={formData.showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#718096"
                />
              </TouchableOpacity>
            </View>

            {/* Opções de Privacidade */}
            <View style={privacyStyles.container}>
              <View style={privacyStyles.option}>
                <View style={privacyStyles.optionTextContainer}>
                  <Text style={privacyStyles.optionText}>Manter e-mail privado</Text>
                  <Text style={privacyStyles.optionDescription}>
                    Seu e-mail não será compartilhado com terceiros
                  </Text>
                </View>
                <Switch
                  value={formData.isPrivateEmail}
                  onValueChange={handleChange('isPrivateEmail')}
                  trackColor={{ false: "#767577", true: "#4A5568" }}
                  thumbColor={formData.isPrivateEmail ? "#2D3748" : "#f4f3f4"}
                />
              </View>
              
              <View style={privacyStyles.option}>
                <View style={privacyStyles.optionTextContainer}>
                  <Text style={privacyStyles.optionText}>Permitir coleta de dados para publicidade</Text>
                  <Text style={privacyStyles.optionDescription}>
                    Permite que coletemos dados de uso para melhorar sua experiência e mostrar anúncios relevantes
                  </Text>
                </View>
                <Switch
                  value={formData.allowAdvertising}
                  onValueChange={handleChange('allowAdvertising')}
                  trackColor={{ false: "#767577", true: "#4A5568" }}
                  thumbColor={formData.allowAdvertising ? "#2D3748" : "#f4f3f4"}
                />
              </View>
            </View>

            {/* Botão de criar conta */}
            <TouchableOpacity
              style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>Criar conta</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const privacyStyles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  optionTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  optionText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
});

export default SignUpScreen;