import { Platform } from 'react-native';
import * as Tracking from 'expo-tracking-transparency';

/**
 * Solicita permissão de rastreamento em dispositivos iOS
 * Deve ser chamado após um pequeno atraso na inicialização do app,
 * conforme recomendação da Apple
 */
export const requestTrackingPermission = async (): Promise<boolean> => {
  // Apenas necessário para iOS
  if (Platform.OS !== 'ios') {
    return true;
  }
  
  try {
    // Verificar se podemos solicitar permissão no dispositivo
    const canTrack = await Tracking.getTrackingPermissionsAsync();
    
    // Se o usuário já tomou uma decisão, respeitamos essa escolha
    if (canTrack.status === 'granted' || canTrack.status === 'denied') {
      return canTrack.status === 'granted';
    }
    
    // Solicitar permissão
    const { status } = await Tracking.requestTrackingPermissionsAsync();
    console.log(`Tracking permission request result: ${status}`);
    
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting tracking permissions:', error);
    return false;
  }
};

/**
 * Verifica se o usuário concedeu permissão de rastreamento
 */
export const hasTrackingPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return true; // No Android não é necessário
  }
  
  try {
    const { status } = await Tracking.getTrackingPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking tracking permission:', error);
    return false;
  }
};
