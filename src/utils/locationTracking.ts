// src/services/deliveryTracking.ts

import { db } from '../config/firebase';
import * as Location from 'expo-location';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  getDoc,
  query,
  where,
  limit,
  getDocs,
  arrayUnion, 
  Timestamp 
} from 'firebase/firestore';

// Interfaces
interface DeliveryRun {
  id?: string;
  deliverymanId: string;
  motorcycleId: string;
  pharmacyUnitId: string;
  orderIds: string[];
  startTime: Timestamp;
  endTime?: Timestamp;
  totalDistance?: number;
  status: 'active' | 'completed';
  checkpoints: {
    latitude: number;
    longitude: number;
    timestamp: Timestamp;
  }[];
}

interface Motorcycle {
  id: string;
  plate: string;
  pharmacyUnitId: string;
  km: number;
}

// Variáveis de controle
let currentRun: DeliveryRun | null = null;
let watchId: number | null = null;

/**
 * Verifica se existe uma corrida ativa para o entregador e sincroniza o estado
 * @param deliverymanId ID do entregador
 * @returns Objeto com informações da corrida ativa, ou null se não houver
 */
const checkActiveDeliveryRun = async (deliverymanId: string): Promise<{
  runId: string;
  orderIds: string[];
} | null> => {
  try {
    const deliveryRunsRef = collection(db, 'deliveryRuns');
    const q = query(
      deliveryRunsRef,
      where('deliverymanId', '==', deliverymanId),
      where('status', '==', 'active'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const runId = querySnapshot.docs[0].id;
    const runData = querySnapshot.docs[0].data() as DeliveryRun;

    // Restaurar estado da corrida
    currentRun = { ...runData, id: runId };

    // Reiniciar o watching de localização
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000
        },
        async (location) => {
          if (!currentRun?.id) return;

          const checkpoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: Timestamp.now()
          };

          const runRef = doc(db, 'deliveryRuns', currentRun.id);
          await updateDoc(runRef, {
            checkpoints: arrayUnion(checkpoint)
          });
        }
      ).then(subscriber => subscriber as any);
    }

    return {
      runId: runId,
      orderIds: runData.orderIds
    };

  } catch (error) {
    console.error('Erro ao verificar corrida ativa:', error);
    return null;
  }
};

/**
 * Busca e restaura a última corrida não finalizada de um entregador
 * @param deliverymanId ID do entregador
 * @returns ID da corrida ativa ou null se não encontrada
 */
const getLastUnfinishedRun = async (deliverymanId: string): Promise<string | null> => {
  try {
    const deliveryRunsRef = collection(db, 'deliveryRuns');
    const q = query(
      deliveryRunsRef,
      where('deliverymanId', '==', deliverymanId),
      where('status', '==', 'active'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const runId = querySnapshot.docs[0].id;
    const runData = querySnapshot.docs[0].data() as DeliveryRun;

    // Restaurar estado da corrida
    currentRun = { ...runData, id: runId };

    // Reiniciar o watching de localização
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Permissão de localização negada');

    watchId = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 5000
      },
      async (location) => {
        if (!currentRun?.id) return;

        const checkpoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Timestamp.now()
        };

        const runRef = doc(db, 'deliveryRuns', currentRun.id);
        await updateDoc(runRef, {
          checkpoints: arrayUnion(checkpoint)
        });
      }
    ).then(subscriber => subscriber as any);

    return runId;

  } catch (error) {
    console.error('Erro ao buscar corrida não finalizada:', error);
    return null;
  }
};

/**
 * Inicia uma nova corrida de entrega
 * @param deliverymanId ID do entregador
 * @param motorcycleId ID da motocicleta
 * @param orderIds Array de IDs dos pedidos
 * @param pharmacyUnitId ID da unidade farmacêutica
 * @returns ID da corrida criada
 */
const startDeliveryRun = async (
  deliverymanId: string,
  motorcycleId: string,
  orderIds: string[],
  pharmacyUnitId: string
): Promise<string> => {
  try {
    // Criar novo documento de corrida
    const runData: Omit<DeliveryRun, 'id'> = {
      deliverymanId,
      motorcycleId,
      orderIds,
      pharmacyUnitId,
      startTime: Timestamp.now(),
      status: 'active',
      checkpoints: []
    };

    const deliveryRunsRef = collection(db, 'deliveryRuns');
    const docRef = await addDoc(deliveryRunsRef, runData);

    currentRun = { ...runData, id: docRef.id };

    // Iniciar rastreamento
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Permissão de localização negada');

    watchId = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10, // metros
        timeInterval: 5000 // 5 segundos
      },
      async (location) => {
        if (!currentRun?.id) return;

        const checkpoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Timestamp.now()
        };

        const runRef = doc(db, 'deliveryRuns', currentRun.id);
        await updateDoc(runRef, {
          checkpoints: arrayUnion(checkpoint)
        });
      }
    ).then(subscriber => subscriber as any);

    return docRef.id;

  } catch (error) {
    console.error('Erro ao iniciar corrida:', error);
    throw error;
  }
};

/**
 * Finaliza a corrida atual e atualiza a quilometragem da moto
 * @returns Distância total percorrida em metros
 */
const endDeliveryRun = async (): Promise<number> => {
  if (!currentRun?.id || !watchId) throw new Error('Nenhuma corrida ativa');

  try {
    (watchId as any).remove();
    watchId = null;

    const runRef = doc(db, 'deliveryRuns', currentRun.id);
    const runDoc = await getDoc(runRef);

    if (!runDoc.exists()) {
      throw new Error('Documento da corrida não encontrado');
    }

    const runData = runDoc.data() as DeliveryRun;
    const totalDistance = calculateTotalDistance(runData.checkpoints);

    await updateDoc(runRef, {
      endTime: Timestamp.now(),
      totalDistance,
      status: 'completed'
    });

    const motorcycleRef = doc(db, 'motorcycles', runData.motorcycleId);
    const motorcycleDoc = await getDoc(motorcycleRef);

    if (motorcycleDoc.exists()) {
      const motorcycleData = motorcycleDoc.data() as Motorcycle;
      const currentKm = motorcycleData.km || 0;
      const newKm = currentKm + (totalDistance / 1000);
      
      await updateDoc(motorcycleRef, {
        km: newKm
      });
    }

    currentRun = null;
    return totalDistance;

  } catch (error) {
    console.error('Erro ao finalizar corrida:', error);
    throw error;
  }
};

/**
 * Calcula a distância total do percurso
 * @param checkpoints Array de checkpoints da corrida
 * @returns Distância total em metros
 */
const calculateTotalDistance = (checkpoints: DeliveryRun['checkpoints']): number => {
  let total = 0;
  
  for (let i = 1; i < checkpoints.length; i++) {
    const prev = checkpoints[i - 1];
    const curr = checkpoints[i];
    total += calculateDistance(
      { latitude: prev.latitude, longitude: prev.longitude },
      { latitude: curr.latitude, longitude: curr.longitude }
    );
  }

  return total;
};

/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine
 * @param coord1 Coordenadas do ponto inicial
 * @param coord2 Coordenadas do ponto final
 * @returns Distância em metros
 */
const calculateDistance = (
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number => {
  const R = 6371e3; // raio da Terra em metros
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distância em metros
};

export { startDeliveryRun, endDeliveryRun, getLastUnfinishedRun, checkActiveDeliveryRun };