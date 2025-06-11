// src/screens/SplashScreen/index.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Animated, Image, ActivityIndicator, Platform } from 'react-native';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth'; // Ajuste o caminho conforme necessário
import { styles } from '../styles/SplashScreenStyles';
import { StackNavigationProp } from '@react-navigation/stack'; // Importar StackNavigationProp

// Definir os tipos para as props de navegação, se você tiver uma lista de parâmetros de rota
// Por exemplo: type RootStackParamList = { Home: undefined; Profile: { userId: string }; ... };
// Para este caso, como SplashScreen não usa params específicos, podemos usar um genérico ou definir um específico.
type SplashScreenNavigationProp = StackNavigationProp<any>; // Ou defina sua RootStackParamList aqui

interface SplashScreenProps {
  navigation: SplashScreenNavigationProp;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const [isLoadingIndicatorVisible, setIsLoadingIndicatorVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadingFade = useRef(new Animated.Value(0)).current;
  const auth = getAuth();
  const { user, userRole, managerUnit, loading: authLoading } = useAuth();

  // Efeito para animação da logo (executa uma vez)
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.delay(1500), // Tempo para a logo ficar visível
    ]).start();
  }, [fadeAnim]);

  const getScreenByRole = useCallback((role: string | null, currentUser: typeof user | null) => {
    console.log(`getScreenByRole - Timestamp: ${new Date().toISOString()}, Input role: '${role}', User email: '${currentUser?.email}', Is Anonymous: ${currentUser?.isAnonymous}`);
    if (currentUser?.isAnonymous) {
      console.log("getScreenByRole: Usuário anônimo, redirecionando para 'Anon'.");
      return 'Anon';
    }

    // Prioridade para o email de admin, independentemente do 'role' fornecido.
    if (currentUser?.email?.toLowerCase() === 'admin@farmanossa.com') {
      console.log("getScreenByRole: Email de admin detectado, redirecionando para 'Admin'.");
      return 'Admin';
    }
    
    switch(role) {
      case 'cliente':
        return 'Client';
      case 'admin': // Se o role for 'admin' (não apenas o email)
        return 'Admin';
      case 'manager': // Manager também vai para Admin
        return 'Admin'; 
      case 'deliveryman':
      case 'deliv':
        return 'Deliveryman';
      case 'attendant':
        console.warn("getScreenByRole: Role 'attendant' encontrado, mas tela 'Attendant' não existe. Redirecionando para 'Anon'.");
        return 'Anon'; // Fallback seguro
      default:
        // Se o role for null, undefined, ou não reconhecido para um usuário logado (não anônimo, não admin por email)
        console.warn(`getScreenByRole: Role não reconhecido ou nulo ('${role}') para usuário autenticado. Redirecionando para 'Anon' como fallback.`);
        return 'Anon';
    }
  }, []); // Vazio, pois não depende de props/state do SplashScreen que mudam

  const navigateToScreen = useCallback((screenName: string) => {
    Animated.timing(loadingFade, {
      toValue: 0, // Fade out do loading indicator
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setIsLoadingIndicatorVisible(false); // Esconde o indicador após o fade out
      
      const resetAction = { index: 0, routes: [{ name: screenName }] };
      
      // Para iOS, adicione um pequeno delay extra para a transição
      if (Platform.OS === 'ios') {
        setTimeout(() => navigation.reset(resetAction), 100); 
      } else {
        navigation.reset(resetAction);
      }
    });
  }, [navigation, loadingFade]); // Depende de navigation e loadingFade

  const handleAuthentication = useCallback(async () => {
    try {
      if (user) {
        console.log('====== Autenticação SplashScreen ======');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Status: Usuário Autenticado');
        console.log('Email:', user.email);
        console.log('UID:', user.uid);
        console.log('É Anônimo:', user.isAnonymous);
        console.log('UserRole Recebido:', userRole); // Log crucial
        if (userRole === 'manager') {
          console.log('Unidade:', managerUnit);
        }
        console.log('====================================');
        
        const targetScreen = getScreenByRole(userRole, user); // Passar user para getScreenByRole
        console.log(`Tela alvo determinada: ${targetScreen} (baseado no role: ${userRole})`);
        navigateToScreen(targetScreen);

      } else { // Usuário não encontrado (user é null/undefined)
        console.log('====== Autenticação SplashScreen ======');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Status: Usuário Não Encontrado. Iniciando login anônimo...');
        
        const anonUser = await signInAnonymously(auth);
        
        console.log('Login anônimo realizado com sucesso! UID Anônimo:', anonUser.user.uid);
        console.log('====================================');
        navigateToScreen('Anon');
      }
    } catch (error) {
      console.error('====== Erro de Autenticação na SplashScreen ======');
      console.error('Timestamp:', new Date().toISOString());
      if (error instanceof Error) {
        // Agora TypeScript sabe que error é do tipo Error e tem as propriedades code e message (embora 'code' não seja padrão em Error)
        // Firebase errors geralmente têm 'code' e 'message'. Para outros erros, 'code' pode ser undefined.
        const firebaseError = error as any; // Usar 'as any' para acessar 'code' se não for um erro padrão
        console.error('Tipo:', firebaseError.code || 'Desconhecido');
        console.error('Mensagem:', error.message);
      } else {
        console.error('Tipo: Erro desconhecido');
        console.error('Mensagem: Ocorreu um erro não identificado.');
      }
      console.error('===============================================');
      navigateToScreen('Anon'); // Fallback em caso de erro
    }
  }, [user, userRole, auth, getScreenByRole, navigateToScreen, managerUnit]);

  // Efeito para lidar com autenticação e navegação
  useEffect(() => {
    // Se authLoading é true, ainda estamos esperando dados do hook useAuth.
    // Mostra o indicador de loading.
    if (authLoading) {
      setIsLoadingIndicatorVisible(true);
      Animated.timing(loadingFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      return; // Aguarda authLoading se tornar false
    }

    // authLoading é false. Podemos prosseguir.
    // Garante que o indicador de loading esteja visível antes de iniciar handleAuthentication.
    setIsLoadingIndicatorVisible(true);
    Animated.timing(loadingFade, {
      toValue: 1,
      duration: 300, // Rápida aparição se já não estiver visível
      useNativeDriver: true,
    }).start(async () => {
      // Adiciona um pequeno delay para dar uma margem para userRole estabilizar após authLoading.
      await new Promise(resolve => setTimeout(resolve, 300)); // Pequeno delay (e.g., 300ms)
      
      await handleAuthentication();
    });
  }, [authLoading, user, userRole, handleAuthentication, loadingFade]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
        <Image 
          source={require('../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      
      {isLoadingIndicatorVisible && (
        <Animated.View style={[styles.loadingContainer, { opacity: loadingFade }]}>
          <ActivityIndicator size="large" color="black" />
        </Animated.View>
      )}
    </View>
  );
};

export default SplashScreen;