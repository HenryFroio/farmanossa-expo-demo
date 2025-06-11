import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { CommonActions, NavigationContainerRef } from '@react-navigation/native';
import { db } from '../config/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestUserPermission() {
  if (!Device.isDevice && !__DEV__) {
    console.log('Not a physical device and not in dev mode');
    return false;
  }
  
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
}

export async function getExpoPushToken() {
  try {
    const hasPermission = await requestUserPermission();

    if (!hasPermission) {
      console.log('No permission to get push token');
      return null;
    }

    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    // Use o projectId correto baseado na plataforma
    const projectId = Platform.OS === 'ios' 
      ? 'b2af46af-966b-48a0-9aac-3330c19e5ee5'  // iOS projectId 
      : 'ff5aaf92-c863-41a3-8da5-8f029b64115c'; // Android projectId

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return tokenData.data;
  } catch (error) {
    console.warn('Error getting push token:', error);
    return null;
  }
}

// Função para gerar um ID de dispositivo único
export function getDeviceId(): string {
  // Use uma combinação de informações do dispositivo para criar um ID razoavelmente único
  const brand = Device.brand || '';
  const modelName = Device.modelName || '';
  const osVersion = Device.osVersion || '';
  
  return `${Platform.OS}-${brand}-${modelName}-${osVersion}`.replace(/\s+/g, '-').toLowerCase();
}

// Interface para as informações do dispositivo
interface DeviceInfo {
  deviceId: string;
  pushToken: string;
  platform: string;
  brand?: string;
  modelName?: string;
  osVersion?: string;
  lastActive: any;
}

// Adiciona um token de notificação a um usuário
export async function addUserPushToken(userId: string): Promise<boolean> {
  try {
    const pushToken = await getExpoPushToken();
    
    if (!pushToken) {
      console.warn('Não foi possível obter token de notificação');
      return false;
    }
    
    const deviceId = getDeviceId();
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    // Obter informações do dispositivo
    const deviceInfo: DeviceInfo = {
      deviceId,
      pushToken,
      platform: Platform.OS,
      brand: Device.brand || undefined,
      modelName: Device.modelName || undefined,
      osVersion: Device.osVersion || undefined,
      lastActive: serverTimestamp()
    };
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const devices = userData.devices || [];
      
      // Verificar se este dispositivo já está registrado
      const existingDeviceIndex = devices.findIndex((d: DeviceInfo) => d.deviceId === deviceId);
      
      if (existingDeviceIndex >= 0) {
        // Atualizar apenas o token e o timestamp para o dispositivo existente
        console.log('Atualizando token para dispositivo existente');
        
        // Cria uma cópia do array de dispositivos
        const updatedDevices = [...devices];
        updatedDevices[existingDeviceIndex] = {
          ...updatedDevices[existingDeviceIndex],
          pushToken,
          lastActive: serverTimestamp()
        };
        
        await updateDoc(userRef, { 
          devices: updatedDevices
        });
      } else {
        // Adicionar novo dispositivo ao array
        console.log('Adicionando novo dispositivo ao usuário');
        await updateDoc(userRef, {
          devices: arrayUnion(deviceInfo)
        });
      }
    } else {
      // Documento do usuário não existe, criá-lo com o dispositivo
      console.log('Criando documento de usuário com dispositivo');
      await setDoc(userRef, {
        devices: [deviceInfo],
        createdAt: serverTimestamp()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao adicionar token do dispositivo:', error);
    return false;
  }
}

// Remove o token de notificação do dispositivo atual
export async function removeUserPushToken(userId: string): Promise<boolean> {
  try {
    const deviceId = getDeviceId();
    const userRef = doc(db, 'users', userId);
    
    // Verificar se o dispositivo está registrado
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const devices = userData.devices || [];
      
      // Encontrar o dispositivo atual
      const currentDevice = devices.find((d: DeviceInfo) => d.deviceId === deviceId);
      
      if (currentDevice) {
        // Remover o dispositivo do array
        await updateDoc(userRef, {
          devices: arrayRemove(currentDevice)
        });
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Erro ao remover token do dispositivo:', error);
    return false;
  }
}

// Obtém todos os tokens de notificação de um usuário
export async function getAllUserPushTokens(userId: string): Promise<string[]> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const devices = userData.devices || [];
      
      // Extrair apenas os tokens de todos os dispositivos
      const tokens = devices.map((device: DeviceInfo) => device.pushToken);
      return tokens.filter(Boolean); // Remove possíveis valores null/undefined
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao obter tokens do usuário:', error);
    return [];
  }
}

// Atualiza o timestamp de atividade do dispositivo atual
export async function updateDeviceActivity(userId: string): Promise<boolean> {
  try {
    const deviceId = getDeviceId();
    const userRef = doc(db, 'users', userId);
    
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const devices = userData.devices || [];
      
      // Encontrar o dispositivo atual
      const deviceIndex = devices.findIndex((d: DeviceInfo) => d.deviceId === deviceId);
      
      if (deviceIndex >= 0) {
        // Atualizar apenas o timestamp para o dispositivo
        const updatedDevices = [...devices];
        updatedDevices[deviceIndex] = {
          ...updatedDevices[deviceIndex],
          lastActive: serverTimestamp()
        };
        
        await updateDoc(userRef, { 
          devices: updatedDevices
        });
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Erro ao atualizar atividade do dispositivo:', error);
    return false;
  }
}

/**
 * Configura os listeners de notificação e retorna uma função de limpeza
 * @param navigationRef Referência do NavigationContainer
 * @returns Função para remover os listeners
 */
export async function setupNotificationListeners(
  navigationRef: NavigationContainerRef<any>
): Promise<() => void> {
  try {
    // Solicita permissões de notificação
    const hasPermission = await requestUserPermission();
    if (!hasPermission) {
      console.log('Permissões de notificação não concedidas');
      return () => {}; // Retorna função vazia se não tiver permissão
    }

    // Configura o listener para notificações recebidas quando o app está em primeiro plano
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notificação recebida em primeiro plano:', notification);
      // Aqui você pode atualizar a UI ou mostrar um badge
    });

    // Configura o listener para resposta às notificações
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      try {
        console.log('Resposta à notificação recebida:', response);

        // Extrai dados da notificação
        const data = response.notification.request.content.data;
        
        // Navega para a tela apropriada com base nos dados da notificação
        if (data && navigationRef) {
          if (data.route) {
            // Navegação simples
            navigationRef.navigate(data.route, data.params || {});
          } else if (data.resetTo) {
            // Resetar a navegação para uma rota específica
            navigationRef.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: data.resetTo, params: data.params || {} }],
              })
            );
          }
        }
      } catch (error) {
        console.error('Erro ao processar resposta de notificação:', error);
      }
    });

    // Retorna uma função de limpeza que remove ambos os listeners
    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  } catch (error) {
    console.error('Erro ao configurar listeners de notificação:', error);
    // Retorna uma função vazia para evitar erros ao tentar chamar o cleanup
    return () => {};
  }
}