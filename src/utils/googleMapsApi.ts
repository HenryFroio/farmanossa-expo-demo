import axios from 'axios';
import Constants from 'expo-constants';

// Pegar a chave da API das variáveis de ambiente do Expo
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || 'AIzaSyAeB_XWNDHz8Wuq1dKTSz3u0JOJdmlKSyo';

interface DistanceMatrixResponse {
  rows: {
    elements: {
      distance: {
        value: number; // distância em metros
      };
      duration: {
        value: number; // duração em segundos
      };
      status: string;
    }[];
  }[];
  status: string;
}

export const getDistance = async (origin: string, destination: string): Promise<number> => {
  try {
    // Adicionar timeout e validação de entrada
    if (!origin || !destination) {
      console.error('Origin or destination is missing');
      return 0;
    }

    const response = await axios.get<DistanceMatrixResponse>(
      `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${encodeURIComponent(
        origin
      )}&destinations=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`,
      {
        timeout: 10000 // 10 segundos de timeout
      }
    );

    if (response.data.status === 'OK' && 
        response.data.rows?.[0]?.elements?.[0]?.status === 'OK') {
      return response.data.rows[0].elements[0].distance.value / 1000; // Converte metros para quilômetros
    } else {
      console.error('Erro ao obter distância:', response.data.status);
      return 0;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Erro na requisição:', error.message);
    } else {
      console.error('Erro ao chamar a API do Google Maps:', error);
    }
    return 0;
  }
};