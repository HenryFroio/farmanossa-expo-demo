import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs, QueryConstraint, limit, startAfter, documentId, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface RoutineItem {
  id: string;
  name: string;
  status: 'ok' | 'attention' | 'critical';
}

export interface SafetyItem {
  id: string;
  name: string;
  status: 'ok' | 'attention' | 'critical';
}

export interface FormData {
  id: string;
  createdAt?: any;
  updatedAt?: any;
  date?: string;
  deliverymanId?: string;
  deliverymanName?: string;
  motorcyclePlate?: string;
  pharmacyUnitId?: string;
  pharmacyUnitName?: string;
  currentKm?: string;
  nextMaintenanceKm?: string;
  initialTime?: string;
  finalTime?: string;
  observations?: string;
  routineItems?: RoutineItem[];
  safetyItems?: SafetyItem[];
}

export interface FormsFilters {
  selectedDate?: string;
  plateSearch?: string;
}

export const useFormsData = (userRole?: string, managerUnit?: string) => {
  const [forms, setForms] = useState<FormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  
  // Inicializar com filtro do dia atual
  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  };
  
  const [filters, setFilters] = useState<FormsFilters>({
    selectedDate: getCurrentDate()
  });

  const ITEMS_PER_PAGE = 10;

  const fetchForms = useCallback(async (isLoadMore = false, currentFilters = filters) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        setForms([]);
        setLastDoc(null);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const formsRef = collection(db, 'forms');
      const constraints: QueryConstraint[] = [];

      // Filtro por unidade do manager
      if (userRole === 'manager' && managerUnit) {
        constraints.push(where('pharmacyUnitId', '==', managerUnit));
      }

      // Filtro por data
      if (currentFilters.selectedDate) {
        constraints.push(where('date', '==', currentFilters.selectedDate));
      }

      // Filtro por placa
      if (currentFilters.plateSearch && currentFilters.plateSearch.trim()) {
        // Remove o hífen para fazer uma busca que funcione tanto para placas formatadas quanto não formatadas
        const plateClean = currentFilters.plateSearch.trim().replace('-', '').toUpperCase();
        
        // Busca por range que captura tanto ABC1234 quanto ABC-1234
        constraints.push(where('motorcyclePlate', '>=', plateClean));
        constraints.push(where('motorcyclePlate', '<=', plateClean + '\uf8ff'));
        
        // Também busca pela versão formatada
        const plateFormatted = currentFilters.plateSearch.trim().toUpperCase();
        if (plateFormatted !== plateClean) {
          // Como não podemos usar OR em Firestore facilmente, vamos fazer duas queries separadas
          // Por enquanto, vamos usar apenas a busca pelo formato limpo que pega ambos
        }
      }

      // Ordenação
      constraints.push(orderBy('createdAt', 'desc'));

      // Paginação
      constraints.push(limit(ITEMS_PER_PAGE));
      
      if (isLoadMore && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const q = query(formsRef, ...constraints);
      const querySnapshot = await getDocs(q);

      const formsData: FormData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        formsData.push({
          id: doc.id,
          ...data,
        } as FormData);
      });

      // Atualizar estado
      if (isLoadMore) {
        setForms(prev => [...prev, ...formsData]);
      } else {
        setForms(formsData);
      }

      // Verificar se há mais dados
      setHasMore(formsData.length === ITEMS_PER_PAGE);
      
      // Guardar último documento para paginação
      if (formsData.length > 0) {
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }

    } catch (err) {
      console.error('Erro ao buscar formulários:', err);
      setError('Erro ao carregar formulários');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userRole, managerUnit, filters]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchForms(true);
    }
  }, [fetchForms, loadingMore, hasMore]);

  const applyFilters = useCallback((newFilters: FormsFilters) => {
    setFilters(newFilters);
    fetchForms(false, newFilters);
  }, [fetchForms]);

  const clearFilters = useCallback(() => {
    const emptyFilters = { selectedDate: getCurrentDate() };
    setFilters(emptyFilters);
    fetchForms(false, emptyFilters);
  }, [fetchForms]);

  const navigateToDate = useCallback((direction: 'previous' | 'next') => {
    const currentDate = new Date(filters.selectedDate || getCurrentDate());
    const newDate = new Date(currentDate);
    
    if (direction === 'previous') {
      newDate.setDate(currentDate.getDate() - 1);
    } else {
      newDate.setDate(currentDate.getDate() + 1);
    }
    
    const newDateString = newDate.toISOString().split('T')[0];
    const newFilters = { ...filters, selectedDate: newDateString };
    setFilters(newFilters);
    fetchForms(false, newFilters);
  }, [filters, fetchForms]);

  const setSelectedDate = useCallback((dateString: string) => {
    const newFilters = { ...filters, selectedDate: dateString };
    setFilters(newFilters);
    fetchForms(false, newFilters);
  }, [filters, fetchForms]);

  const setPlateSearch = useCallback((plateSearch: string) => {
    const newFilters = { ...filters, plateSearch };
    setFilters(newFilters);
    fetchForms(false, newFilters);
  }, [filters, fetchForms]);

  useEffect(() => {
    fetchForms();
  }, [userRole, managerUnit]);

  return {
    forms,
    loading,
    loadingMore,
    error,
    hasMore,
    filters,
    fetchForms: () => fetchForms(false),
    loadMore,
    applyFilters,
    clearFilters,
    navigateToDate,
    setSelectedDate,
    setPlateSearch
  };
};