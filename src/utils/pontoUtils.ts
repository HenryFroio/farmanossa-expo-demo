// src/utils/pontoUtils.ts
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Ponto {
  id: string;
  [key: string]: any; // Para as propriedades dinâmicas como Entrada1, Saida1, unitEntrada1, motorcycleEntrada1, etc.
}

export const getPontoDataForDeliveryman = async (
  deliverymanId: string, 
  date?: string
): Promise<Ponto | null> => {
  if (!deliverymanId) {
    console.error("Cannot get ponto data: deliverymanId is required.");
    return null;
  }

  const dateString = date || new Date().toISOString().split('T')[0];
  const pontoId = `${dateString}-${deliverymanId}`;

  try {
    const pontoRef = doc(db, 'pontos', pontoId);
    const pontoDoc = await getDoc(pontoRef);

    if (pontoDoc.exists()) {
      return { id: pontoDoc.id, ...pontoDoc.data() } as Ponto;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`[pontoUtils] Error getting ponto data for ${pontoId}:`, error);
    throw error;
  }
};
