import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View, Alert, Platform, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Device from 'expo-device';
import AppNavigator from './navigation/AppNavigator';
import { auth, checkFirebaseConnection } from './config/firebase';
import { AuthProvider } from './contexts/AuthContext';
import { styles } from './styles/AppStyles';
import { setupNotificationListeners } from './services/notification';
import { onAuthStateChanged } from 'firebase/auth';
import { navigationRef } from './navigation/navigationRef';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const App = () => {
  const notificationListenerCleanup = useRef<(() => void) | null>(null);
  const [currentRoute, setCurrentRoute] = useState<string>('');

  const legacyIphones = [
    'iPhone SE',
    'iPhone 8',
    'iPhone 7',
    'iPhone 6',
    'iPhone 5',
    'iPhone 4'
  ];

  // Grupos de rotas com suas respectivas cores
  const routeColors = {
    lightRoutes: ['Splash', 'SignUp', 'Login', 'Anon'],
    darkRoutes: ['Client', 'Deliveryman', 'Admin', 'Stats']
  };

  const getBackgroundColor = (position: 'top' | 'bottom') => {
    if (!currentRoute) return '#F8F9FA';

    if (routeColors.lightRoutes.includes(currentRoute)) {
      return '#F8F9FA';
    }

    if (routeColors.darkRoutes.includes(currentRoute)) {
      return position === 'top' ? '#e41c26' : '#F8F9FA';
    }

    return '#F8F9FA';
  };

  const getTopPadding = async () => {
    const deviceType = await Device.getDeviceTypeAsync();
    const modelName = await Device.modelName;
    
    if (Platform.OS === 'ios') {
      if (modelName && legacyIphones.some(phone => modelName.includes(phone))) {
        return StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 20;
      }
      return 47;
    }

    if (Platform.OS === 'android') {
      const hasNotch = await Device.deviceHasNotch;
      if (hasNotch) {
        return StatusBar.currentHeight ? StatusBar.currentHeight + 15 : 35;
      }
      return StatusBar.currentHeight || 0;
    }

    return 0;
  };

  const getBottomPadding = async () => {
    const deviceType = await Device.getDeviceTypeAsync();
    const modelName = await Device.modelName;
    
    if (Platform.OS === 'ios') {
      if (modelName && legacyIphones.some(phone => modelName.includes(phone))) {
        return 0;
      }
      return 34;
    }
    
    if (Platform.OS === 'android') {
      const hasNotch = await Device.deviceHasNotch;
      if (hasNotch && deviceType === Device.DeviceType.PHONE) {
        return 24;
      }
      return 0;
    }
    
    return 0;
  };

  const [safeAreaPadding, setSafeAreaPadding] = useState({ top: 0, bottom: 0 });

  useEffect(() => {
    const setupPadding = async () => {
      const topPadding = await getTopPadding();
      const bottomPadding = await getBottomPadding();
      setSafeAreaPadding({ top: topPadding, bottom: bottomPadding });
    };
    
    setupPadding();
  }, []);

  // Adicione esta função auxiliar
  const getScreenByRole = (userRole: string | null) => {
    switch(userRole) {
      case 'cliente':
        return 'Client';
      case 'admin':
        return 'Admin';
      case 'manager':
        return 'Admin'; // Com parâmetros, se necessário
      case 'deliveryman':
      case 'deliv':
        return 'Deliveryman';
      case 'attendant':
        return 'Attendant';
      default:
        return 'Anon';
    }
  };

  // Atualize o useEffect que detecta mudanças de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Log simplificado para apenas o básico necessário
      if (user) {
        console.log(`Autenticação: Usuário ${user.uid.substring(0, 6)}... conectado`);
      } else {
        console.log('Autenticação: Usuário desconectado');
      }
    });
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Verifica a conexão com o Firebase
        const firebaseOk = await checkFirebaseConnection();
        if (!firebaseOk) {
          console.warn('Verificação de conexão com Firebase retornou false');
          // Continue mesmo se o firebase falhar
        }
        
        // Configura os listeners de notificação apenas se a navegação estiver pronta
        if (navigationRef.current) {
          notificationListenerCleanup.current = await setupNotificationListeners(navigationRef.current);
          console.log('Serviço de notificações inicializado com sucesso');
        }
      } catch (error: any) {
        console.error('Erro durante a inicialização dos serviços:', error);
        
        // Em ambiente de desenvolvimento, mostre o erro completo
        if (__DEV__) {
          console.error('Detalhes do erro:', error?.stack);
        }
        // Não exibir o alerta para o usuário final, já que o app continua funcionando
      }
    };
    
    initializeServices();

    // Cleanup function
    return () => {
      if (notificationListenerCleanup.current) {
        notificationListenerCleanup.current();
        notificationListenerCleanup.current = null;
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.rootView}>
      <NavigationContainer
        ref={navigationRef}
        onStateChange={() => {
          const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
          if (currentRouteName) {
            setCurrentRoute(currentRouteName);
          }
        }}
      >
        <AuthProvider>
          <View
            style={[
              styles.container,
              {
                paddingTop: safeAreaPadding.top,
                paddingBottom: safeAreaPadding.bottom,
              }
            ]}
          >
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: safeAreaPadding.top,
                backgroundColor: getBackgroundColor('top'),
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: safeAreaPadding.bottom,
                backgroundColor: getBackgroundColor('bottom'),
              }}
            />
            <AppNavigator />
          </View>
        </AuthProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default App;