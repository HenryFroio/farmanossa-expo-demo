import { useState } from 'react';
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface Vehicle {
  id: string;
  plate: string;
  km: number;
  pharmacyUnitId: string;
  createdAt: any;
  updatedAt: any;
  searchName?: string;
  status?: string;
}

export const useVehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<Array<{ id: string, name: string }>>([]);
  const [lastSearch, setLastSearch] = useState('');

  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };
  const fetchVehicles = async (search = '', unitId?: string) => {
    setLastSearch(search);
    setLoading(true);
    try {
      const vehiclesRef = collection(db, 'motorcycles');
      let q;
      
      if (search) {
        const normalizedSearch = normalizeString(search);
        
        // Se uma unidade específica for passada, filtrar por ela
        if (unitId) {
          q = query(
            vehiclesRef,
            where('pharmacyUnitId', '==', unitId),
            orderBy('plate')
          );
        } else {
          q = query(
            vehiclesRef,
            orderBy('plate')
          );
        }
        
        const querySnapshot = await getDocs(q);
        const vehiclesList = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            searchName: normalizeString(doc.data().plate)
          })) as Vehicle[];

        // Primeiro filtra os veículos inativos
        const activeVehicles = vehiclesList.filter(vehicle => vehicle.status !== 'inactive');
        
        // Depois aplica o filtro da busca
        const filteredVehicles = activeVehicles.filter(vehicle =>
          vehicle.searchName?.includes(normalizedSearch)
        );

        setVehicles(filteredVehicles);
      } else {
        q = query(
          vehiclesRef,
          orderBy('plate')
        );
        
        const querySnapshot = await getDocs(q);
        const vehiclesList = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Vehicle[];

        // Filtra veículos inativos
        const activeVehicles = vehiclesList.filter(vehicle => vehicle.status !== 'inactive');
        
        // Limita a 20 resultados
        setVehicles(activeVehicles.slice(0, 20));
      }

      setError(null);
    } catch (error) {
      console.error('Erro ao buscar veículos:', error);
      setError('Erro ao carregar veículos');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const unitsRef = collection(db, 'pharmacyUnits');
      const snapshot = await getDocs(unitsRef);
      const unitsList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setUnits(unitsList);
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
      setError('Erro ao carregar unidades');
    }
  };

  const createVehicle = async (vehicleData: any) => {
    setLoading(true);
    try {
      const vehiclesRef = collection(db, 'motorcycles');
      const q = query(vehiclesRef, orderBy('id'));
      const snapshot = await getDocs(q);
      
      let maxNumber = 0;
      snapshot.docs.forEach(doc => {
        const id = doc.data().id;
        if (id && id.startsWith('M')) {
          const num = parseInt(id.substring(1));
          if (num > maxNumber) maxNumber = num;
        }
      });
      
      const newId = `M${String(maxNumber + 1).padStart(3, '0')}`;

      const vehicleDoc = {
        id: newId,
        plate: vehicleData.plate.toUpperCase(),
        km: vehicleData.km || 0,
        pharmacyUnitId: vehicleData.pharmacyUnitId,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active'
      };

      await setDoc(doc(db, 'motorcycles', newId), vehicleDoc);

      if (vehicles.length > 0) {
        await fetchVehicles(lastSearch);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao criar veículo:', error);
      return { 
        success: false, 
        error: 'Erro ao criar veículo' 
      };
    } finally {
      setLoading(false);
    }
  };

  const updateVehicle = async (vehicleData: any) => {
    setLoading(true);
    try {
      const vehicleDoc = {
        plate: vehicleData.plate.toUpperCase(),
        km: vehicleData.km,
        pharmacyUnitId: vehicleData.pharmacyUnitId,
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'motorcycles', vehicleData.id), vehicleDoc);

      if (vehicles.length > 0) {
        await fetchVehicles(lastSearch);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar veículo:', error);
      return { 
        success: false, 
        error: 'Erro ao atualizar veículo' 
      };
    } finally {
      setLoading(false);
    }
  };

  const deleteVehicle = async (vehicle: Vehicle) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'motorcycles', vehicle.id), {
        status: 'inactive',
        updatedAt: new Date()
      });

      if (vehicles.length > 0) {
        await fetchVehicles(lastSearch);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao inativar veículo:', error);
      return { 
        success: false, 
        error: 'Erro ao inativar veículo' 
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    vehicles,
    units,
    loading,
    error,
    fetchVehicles,
    fetchUnits,
    createVehicle,
    updateVehicle,
    deleteVehicle
  };
};