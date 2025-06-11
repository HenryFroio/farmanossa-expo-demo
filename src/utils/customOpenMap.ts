import { Platform, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser'; // Alternativa mais robusta para abrir URLs

interface OpenMapOptions {
  start?: string;
  end: string;
  waypoints?: string[];
  travelMode?: 'drive' | 'walk' | 'bicycle';
}

export const openMap = async ({ start, end, waypoints = [], travelMode = 'drive' }: OpenMapOptions) => {
  try {
    const destination = encodeURIComponent(end);
    const waypointsEncoded = waypoints.map(encodeURIComponent);

    let url = '';

    if (Platform.OS === 'ios') {
      // Apple Maps
      url = `http://maps.apple.com/?daddr=${destination}`;
      if (start) {
        url += `&saddr=${encodeURIComponent(start)}`;
      }
      if (waypointsEncoded.length > 0) {
        url += `&waypoints=${waypointsEncoded.join(',')}`;
      }
    } else {
      // Google Maps
      url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
      if (start) {
        url += `&origin=${encodeURIComponent(start)}`;
      }
      if (waypointsEncoded.length > 0) {
        url += `&waypoints=${waypointsEncoded.join('|')}`;
      }
      url += `&travelmode=${travelmode}`;
    }

    const supported = await Linking.canOpenURL(url);

    if (supported) {
      try {
        // Tenta primeiro usar o WebBrowser do Expo
        await WebBrowser.openBrowserAsync(url);
      } catch (webError) {
        // Se falhar, usa o Linking padrão
        await Linking.openURL(url);
      }
    } else {
      // Tenta abrir no Google Maps web como fallback
      const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
      await WebBrowser.openBrowserAsync(webUrl);
    }
  } catch (error) {
    console.error('Erro ao abrir o mapa:', error);
    throw new Error('Não foi possível abrir o mapa. Por favor, verifique se você tem um aplicativo de mapas instalado.');
  }
};