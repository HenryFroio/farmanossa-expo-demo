import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import styles from '../styles/loginScreenStyles';
import { useAuth } from '../hooks/useAuth';
import ForgotPasswordBottomSheet from '../components/ForgotPasswordBottomSheet';
import * as AppleAuthentication from 'expo-apple-authentication';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

type NavigationProps = {
  navigate: (screen: string) => void;
};

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProps>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(Platform.OS === 'ios'); // Default true para iOS
  const { signInWithGoogle, signInWithFacebook, signInWithApple, signInWithEmail, userRole, loading: authLoading, user } = useAuth();
  
  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Verificar se a autenticação da Apple está disponível no dispositivo
    if (Platform.OS === 'ios') {
      console.log('Verificando disponibilidade de Apple Sign In...');
      
      // Em iOS 13 ou superior, Apple Sign In está sempre disponível
      // Vamos verificar apenas para confirmar e logging
      AppleAuthentication.isAvailableAsync()
        .then(available => {
          console.log('Apple Sign In disponibilidade:', available);
          setAppleAuthAvailable(true); // Força para true em iOS
        })
        .catch(error => {
          console.error('Erro ao verificar disponibilidade de Apple Auth:', error);
          // Mesmo com erro, vamos manter disponível para iOS
          setAppleAuthAvailable(true);
        });
    }
  }, []);

  // Função atualizada para corretamente identificar o papel do usuário
  const getScreenByRole = (role: string | null) => {
    if (!role) return 'Anon';
    
    switch(role.toLowerCase()) {
      case 'cliente':
        return 'Client';
      case 'admin':
        return 'Admin';
      case 'manager':
        return 'Admin';
      case 'deliveryman':
      case 'deliv':
        return 'Deliveryman';
      case 'attendant':
        return 'Attendant';
      default:
        console.warn(`Papel não reconhecido: "${role}", usando tela anônima`);
        return 'Anon';
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }
  
    try {
      setIsLoading(true);
      const result = await signInWithEmail(email, password);
      setEmail('');
      setPassword('');
      Keyboard.dismiss();
      
      if (result) {
        // Instead of depending solely on the userRole from context, 
        // let's get it directly from Firebase
        try {
          // Get the user document which should contain the role
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, 'users', result.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = userData.role;
            
            if (role) {
              console.log(`User role from document: ${role}`);
              const targetScreen = getScreenByRole(role);
              
              // Navigate with the directly retrieved role
              setTimeout(() => {
                // @ts-ignore
                navigation.reset({
                  index: 0,
                  routes: [{ name: targetScreen }],
                });
              }, Platform.OS === 'ios' ? 800 : 500);
              return;
            }
          }
          
          // Fallback to using the context's userRole if we couldn't get it directly
          console.log('Falling back to context userRole:', userRole);
          if (userRole) {
            const targetScreen = getScreenByRole(userRole);
            
            setTimeout(() => {
              // @ts-ignore
              navigation.reset({
                index: 0,
                routes: [{ name: targetScreen }],
              });
            }, Platform.OS === 'ios' ? 800 : 500);
          } else {
            console.warn('userRole not available even in fallback');
            // Default to a safe screen if we can't determine the role
            navigation.reset({
              index: 0,
              routes: [{ name: 'Anon' }],
            });
          }
        } catch (roleError) {
          console.error('Error getting user role:', roleError);
          // Navigate to a safe default screen in case of error
          navigation.reset({
            index: 0,
            routes: [{ name: 'Anon' }],
          });
        }
      }
    } catch (error: any) {
      // Simplificar a mensagem de erro no console
      console.error(`Erro no login: ${error.code || 'desconhecido'} - ${error.message}`);
      
      // Determinar mensagem de erro baseado no código ou mensagem
      let errorMessage = 'Ocorreu um erro durante o login. Por favor, tente novamente.';
      
      // Se temos um código de erro (preferencial)
      if (error.code) {
        switch (error.code) {
          case 'auth/wrong-password':
            errorMessage = 'Senha incorreta. Por favor, verifique e tente novamente.';
            break;
          case 'auth/user-not-found':
            errorMessage = 'Usuário não encontrado. Verifique seu e-mail ou crie uma nova conta.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'E-mail inválido. Por favor, verifique se digitou corretamente.';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'Credenciais inválidas. Verifique seu e-mail e senha.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Muitas tentativas de login. Por favor, tente novamente mais tarde ou recupere sua senha.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'Sua conta foi desativada. Entre em contato com o suporte para mais informações.';
            break;
        }
      } 
      // Se não temos código mas temos mensagem
      else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Erro de Login', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const user = await signInWithGoogle();
      
      if (!user) {
        throw new Error('Falha no login com Google');
      }
      
      // Remova a verificação de plataforma e aplique a mesma lógica de redirecionamento
      // para iOS e Android, igual ao que é feito no login por email/senha
      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role;
          
          if (role) {
            console.log(`User role from document (Google): ${role}`);
            const targetScreen = getScreenByRole(role);
            
            setTimeout(() => {
              // @ts-ignore
              navigation.reset({
                index: 0,
                routes: [{ name: targetScreen }],
              });
            }, Platform.OS === 'ios' ? 800 : 500);
            return;
          }
        }
        
        // Fallback para o userRole do contexto
        console.log('Usando userRole do contexto após login com Google:', userRole);
        if (userRole) {
          const targetScreen = getScreenByRole(userRole);
          
          setTimeout(() => {
            // @ts-ignore
            navigation.reset({
              index: 0,
              routes: [{ name: targetScreen }],
            });
          }, Platform.OS === 'ios' ? 800 : 500);
        }
      } catch (roleError) {
        console.error('Erro ao obter função do usuário após login Google:', roleError);
        // Navegue para uma tela segura em caso de erro
        navigation.reset({
          index: 0,
          routes: [{ name: 'Anon' }],
        });
      }
    } catch (error: any) {
      console.error(`Erro no login com Google: ${error.code || 'desconhecido'} - ${error.message}`);
      
      let errorMessage = 'Não foi possível fazer login com Google.';
      
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services não está disponível ou atualizado em seu dispositivo.';
      } else if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // Usuário cancelou, não mostrar erro
        return;
      }
      
      Alert.alert('Erro de Login', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFacebookLogin = async () => {
    try {
      setIsLoading(true);
      const user = await signInWithFacebook();
      
      if (!user) {
        throw new Error('Falha no login com Facebook');
      }
      
      // Aplicar a mesma lógica de redirecionamento para Facebook
      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role;
          
          if (role) {
            console.log(`User role from document (Facebook): ${role}`);
            const targetScreen = getScreenByRole(role);
            
            setTimeout(() => {
              // @ts-ignore
              navigation.reset({
                index: 0,
                routes: [{ name: targetScreen }],
              });
            }, Platform.OS === 'ios' ? 800 : 500);
            return;
          }
        }
        
        // Fallback para o userRole do contexto
        console.log('Usando userRole do contexto após login com Facebook:', userRole);
        if (userRole) {
          const targetScreen = getScreenByRole(userRole);
          
          setTimeout(() => {
            // @ts-ignore
            navigation.reset({
              index: 0,
              routes: [{ name: targetScreen }],
            });
          }, Platform.OS === 'ios' ? 800 : 500);
        }
      } catch (roleError) {
        console.error('Erro ao obter função do usuário após login Facebook:', roleError);
        // Navegue para uma tela segura em caso de erro
        navigation.reset({
          index: 0,
          routes: [{ name: 'Anon' }],
        });
      }
    } catch (error: any) {
      console.error(`Erro no login com Facebook: ${error.code || 'desconhecido'} - ${error.message}`);
      
      // Se o usuário cancelou, não exibir erro
      if (error.message && error.message.includes('cancelled')) {
        return;
      }
      
      Alert.alert('Erro de Login', 'Não foi possível fazer login com Facebook. Verifique sua conexão e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setIsLoading(true);
      const user = await signInWithApple();
      
      if (!user) {
        throw new Error('Falha no login com Apple');
      }
      
      // Obter diretamente a função do usuário do Firestore
      if (user) {
        try {
          // Obtenha o documento do usuário que contém a função
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = userData.role;
            
            if (role) {
              console.log(`User role from document: ${role}`);
              const targetScreen = getScreenByRole(role);
              
              // Navegue com a função recuperada diretamente
              setTimeout(() => {
                // @ts-ignore
                navigation.reset({
                  index: 0,
                  routes: [{ name: targetScreen }],
                });
              }, Platform.OS === 'ios' ? 800 : 500);
              return;
            }
          }
          
          // Fallback para usar o userRole do contexto
          if (userRole) {
            const targetScreen = getScreenByRole(userRole);
            
            setTimeout(() => {
              // @ts-ignore
              navigation.reset({
                index: 0,
                routes: [{ name: targetScreen }],
              });
            }, Platform.OS === 'ios' ? 800 : 500);
          } else {
            console.warn('userRole não disponível após login com Apple');
            // Navegue para uma tela segura se não pudermos determinar a função
            navigation.reset({
              index: 0,
              routes: [{ name: 'Anon' }],
            });
          }
        } catch (roleError) {
          console.error('Erro ao obter a função do usuário:', roleError);
          // Navegue para uma tela padrão segura em caso de erro
          navigation.reset({
            index: 0,
            routes: [{ name: 'Anon' }],
          });
        }
      }
    } catch (error: any) {
      console.error(`Erro no login com Apple: ${error.code || 'desconhecido'} - ${error.message}`);
      
      // Se o usuário cancelou, não exibir erro
      if (error.code === 'ERR_CANCELED') {
        return;
      }
      
      Alert.alert('Erro de Login', 'Não foi possível fazer login com Apple. Por favor, tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const navigateToSignUp = () => {
    navigation.navigate('SignUp');
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.welcomeText}>Bem-vindo de volta!</Text>
          <Text style={styles.subText}>Entre para continuar</Text>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#718096" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-mail"
                placeholderTextColor="#718096"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#718096" style={styles.inputIcon} />
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="#718096"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleEmailLogin}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordIcon}
              >
                <MaterialCommunityIcons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#718096"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                (!email || !password) && styles.loginButtonDisabled
              ]}
              onPress={handleEmailLogin}
              disabled={isLoading || !email || !password}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Entrar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.forgotPasswordButton}
              onPress={() => setShowForgotPassword(true)}
            >
              <Text style={styles.forgotPasswordText}>Esqueceu sua senha?</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>ou continue com</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleLogin}
                disabled={isLoading}
              >
                <MaterialCommunityIcons name="google" size={24} color="#EA4335" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleFacebookLogin}
                disabled={isLoading}
              >
                <MaterialCommunityIcons name="facebook" size={24} color="#1877F2" />
              </TouchableOpacity>
              
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleAppleLogin}
                  disabled={isLoading}
                >
                  <MaterialCommunityIcons name="apple" size={24} color="#000000" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity 
              style={styles.continueAnonButton}
              onPress={() => navigation.navigate('Anon')}
            >
              <Text style={styles.continueAnonText}>Continuar sem login</Text>
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Ainda não tem uma conta? </Text>
              <TouchableOpacity onPress={navigateToSignUp}>
                <Text style={styles.signupLink}>Cadastre-se</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordBottomSheet
        visible={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </View>
  );
};

export default LoginScreen;