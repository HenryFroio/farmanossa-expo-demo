//src/hooks/useEmployees.ts
import { useState } from 'react';
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  where,
  orderBy,
  limit,
  getDoc
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface Employee {
  id: string;
  displayName: string;
  email: string;
  password?: string; // Campo opcional para senhas
  role: string;
  unit: string;
  updatedAt: any;
  status?: string;
  searchName?: string;
}

const EMPLOYEE_ROLES = ['admin', 'deliv', 'manager', 'attendant'];

// Função para gerar o próximo ID de entregador disponível
const generateNextDeliverymanId = async () => {
  try {
    const usedNumbers = new Set<number>();
    
    // Verificar IDs na coleção users (role 'deliv')
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, where('role', '==', 'deliv'));
    const usersSnapshot = await getDocs(usersQuery);
    
    usersSnapshot.docs.forEach(doc => {
      const id = doc.data().id || doc.id;
      if (id && id.startsWith('DM')) {
        const num = parseInt(id.substring(2));
        if (!isNaN(num)) usedNumbers.add(num);
      }
    });
    
    // Verificar IDs na coleção deliverymen
    const deliverymenRef = collection(db, 'deliverymen');
    const deliverymenSnapshot = await getDocs(deliverymenRef);
    
    deliverymenSnapshot.docs.forEach(doc => {
      const id = doc.data().id || doc.id;
      if (id && id.startsWith('DM')) {
        const num = parseInt(id.substring(2));
        if (!isNaN(num)) usedNumbers.add(num);
      }
    });
      // Encontrar o próximo número disponível
    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) {
      nextNumber++;
    }
    
    console.log('IDs usados encontrados:', Array.from(usedNumbers).sort((a, b) => a - b));
    console.log('Próximo número disponível:', nextNumber);
    
    return `DM${String(nextNumber).padStart(3, '0')}`;
  } catch (error) {
    console.error('Erro ao gerar ID de entregador:', error);
    // Fallback: usar timestamp para garantir unicidade
    const timestamp = Date.now().toString().slice(-3);
    return `DM${timestamp}`;
  }
};

const normalizeString = (str: string | null | undefined) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<Array<{ id: string, name: string }>>([]);
  const [lastSearch, setLastSearch] = useState('');
  const fetchEmployees = async (search = '', unitId?: string) => {
    setLastSearch(search);
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const normalizedSearch = normalizeString(search);
      
      // Criar a base da query
      let baseQuery = query(
        usersRef,
        where('role', 'in', EMPLOYEE_ROLES),
      );
      
      // Se uma unidade específica for passada, filtrar por ela
      if (unitId) {
        baseQuery = query(
          usersRef,
          where('role', 'in', EMPLOYEE_ROLES),
          where('unit', '==', unitId),
        );
      }
      
      // Aplicar a query final
      const q = query(
        baseQuery,
        orderBy('displayName')
      );

      const querySnapshot = await getDocs(q);      let employeesList = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          searchName: normalizeString(doc.data().displayName || '')
        })) as Employee[];

      employeesList = employeesList.filter(emp => emp.status !== 'inactive');      if (search) {
        employeesList = employeesList.filter(employee => 
          employee.searchName && employee.searchName.includes(normalizedSearch)
        );
      } else {
        employeesList = employeesList.slice(0, 20);
      }

      setEmployees(employeesList);
      setError(null);    } catch (error: any) {
      console.error('Erro ao buscar funcionários:', error);
      setError('Erro ao carregar funcionários');
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
      setUnits(unitsList);    } catch (error: any) {
      console.error('Erro ao carregar unidades:', error);
      setError('Erro ao carregar unidades');
    }
  };

  const createEmployee = async (employeeData: any) => {
    setLoading(true);
    try {
      let employeeId = '';
      
      // Log dos dados sendo enviados
      console.log('Criando funcionário com dados:', {
        email: employeeData.email,
        role: employeeData.role,
        adminId: auth.currentUser?.uid
      });

      if (!auth.currentUser?.uid) {
        console.error('Admin não autenticado');
        throw new Error('Admin não autenticado');
      }      if (employeeData.role === 'deliv') {
        employeeId = await generateNextDeliverymanId();
        console.log('ID de entregador gerado:', employeeId);
      }

      // Criar usuário através da API
      console.log('Enviando requisição para criar usuário');
      const response = await fetch('https://us-central1-farmanossadelivery-76182.cloudfunctions.net/api/createUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: employeeData.email,
          password: employeeData.password,
          adminId: auth.currentUser?.uid,
          uid: employeeId // Enviamos o ID personalizado para o backend
        })
      });

      // Log da resposta bruta
      const responseText = await response.text();
      console.log('Resposta bruta da API:', responseText);

      // Tentar parsear a resposta
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Erro ao parsear resposta:', parseError);
        throw new Error(`Erro ao parsear resposta: ${responseText}`);
      }

      if (!result.success) {
        console.error('Erro retornado pela API:', result.error);
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      // ID do usuário criado pelo Auth
      const authUserId = result.userId;
      const finalId = employeeId || authUserId;

      console.log('Criando documento do usuário com ID:', finalId);      // Documento base para users
      const userDoc = {
        displayName: employeeData.displayName,
        email: employeeData.email,
        password: employeeData.password, // Armazenar senha no documento
        role: employeeData.role,
        unit: employeeData.unit,
        updatedAt: new Date(),
        status: 'active',
        id: finalId
      };

      // Se for entregador, adicionar em ambas as coleções
      if (employeeData.role === 'deliv') {
        console.log('Criando documentos de entregador');
        await setDoc(doc(db, 'users', employeeId), userDoc);

        const deliverymanDoc = {
          id: employeeId,
          name: employeeData.displayName,
          chavePix: employeeData.chavePix,
          pharmacyUnitId: employeeData.unit,
          status: 'Fora de expediente',
          orderId: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          licensePlate: null,
          originalUnit: null
        };

        await setDoc(doc(db, 'deliverymen', employeeId), deliverymanDoc);
      } else {
        console.log('Criando documento de usuário comum');
        await setDoc(doc(db, 'users', authUserId), userDoc);
      }

      if (employees.length > 0) {
        await fetchEmployees(lastSearch);
      }
      
      return { success: true };    } catch (error: any) {
      console.error('Erro detalhado ao criar funcionário:', error);
      return { 
        success: false, 
        error: error?.message || 'Erro ao criar funcionário' 
      };
    } finally {
      setLoading(false);
    }
};

  const deleteEmployee = async (employee: Employee) => {
  setLoading(true);
  try {
    // Atualizar status na coleção users
    await updateDoc(doc(db, 'users', employee.id), {
      status: 'inactive',
      updatedAt: new Date(),
      deleted: true,
      deletedAt: new Date(),
      deletedBy: auth.currentUser?.uid
    });

    // Se for entregador, atualizar também na coleção deliverymen
    if (employee.role === 'deliv') {
      const deliverymanRef = doc(db, 'deliverymen', employee.id);
      const deliverymanSnapshot = await getDoc(deliverymanRef);
      
      if (deliverymanSnapshot.exists()) {
        await updateDoc(deliverymanRef, {
          status: 'inactive',
          updatedAt: new Date(),
          deleted: true,
          deletedAt: new Date(),
          deletedBy: auth.currentUser?.uid
        });
      }
    }

    // Chamar a API para deletar o usuário no Authentication
    const response = await fetch('https://us-central1-farmanossadelivery-76182.cloudfunctions.net/api/deleteUser', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: employee.id,
        adminId: auth.currentUser?.uid
      })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Erro ao deletar usuário no Authentication');
    }

    if (employees.length > 0) {
      await fetchEmployees(lastSearch);
    }
    
    return { success: true };  } catch (error: any) {
    console.error('Erro ao inativar funcionário:', error);
    return { 
      success: false, 
      error: 'Erro ao inativar funcionário' 
    };
  } finally {
    setLoading(false);
  }
};
  const updateEmployee = async (employeeData: any) => {
    setLoading(true);
    try {
      // Buscar o documento atual do funcionário para verificar o role anterior
      const userRef = doc(db, 'users', employeeData.id);
      const userSnapshot = await getDoc(userRef);
      
      if (!userSnapshot.exists()) {
        throw new Error('Funcionário não encontrado');
      }
      
      const userData = userSnapshot.data();
      const previousRole = userData.role;
      const newRole = employeeData.role;
      
      // Verificar se está mudando de outra função para entregador
      if (previousRole !== 'deliv' && newRole === 'deliv') {
        // Funcionário comum sendo transformado em entregador
        console.log('Transformando funcionário comum em entregador');
          // 1. Gerar novo ID de entregador (DMXXX)
        const newDeliverymanId = await generateNextDeliverymanId();
        console.log('Novo ID de entregador gerado:', newDeliverymanId);// 2. Deletar usuário anterior do Auth
        console.log('Deletando usuário anterior do Authentication');
        const deleteOldUserResponse = await fetch('https://us-central1-farmanossadelivery-76182.cloudfunctions.net/api/deleteUser', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: employeeData.id,
            adminId: auth.currentUser?.uid
          })
        });

        const deleteOldUserResult = await deleteOldUserResponse.json();
        if (!deleteOldUserResult.success) {
          console.error('Erro ao deletar usuário anterior:', deleteOldUserResult.error);
          throw new Error(deleteOldUserResult.error || 'Erro ao deletar usuário anterior');
        }

        // 3. Criar usuário no Auth com o novo ID
        console.log('Criando novo usuário de autenticação');
        const response = await fetch('https://us-central1-farmanossadelivery-76182.cloudfunctions.net/api/createUser', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },          body: JSON.stringify({
            email: employeeData.email,
            password: userData.password || 'Farmanossa@123', // Usar senha original ou padrão como fallback
            adminId: auth.currentUser?.uid,
            uid: newDeliverymanId
          })
        });
        
        const responseText = await response.text();
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Erro ao parsear resposta:', parseError);
          throw new Error(`Erro ao parsear resposta: ${responseText}`);
        }
        
        if (!result.success) {
          console.error('Erro retornado pela API:', result.error);
          throw new Error(result.error || 'Erro ao criar usuário');
        }
          // 4. Criar novo documento na coleção users com o novo ID
        const newUserDoc = {
          displayName: employeeData.displayName,
          email: employeeData.email,
          password: userData.password || 'Farmanossa@123', // Preservar senha original
          role: 'deliv',
          unit: employeeData.unit,
          updatedAt: new Date(),
          status: 'active',
          id: newDeliverymanId,
          previousId: employeeData.id // Manter referência ao ID anterior
        };
        
        await setDoc(doc(db, 'users', newDeliverymanId), newUserDoc);
        
        // 5. Criar documento na coleção deliverymen
        const deliverymanDoc = {
          id: newDeliverymanId,
          name: employeeData.displayName,
          chavePix: employeeData.chavePix,
          pharmacyUnitId: employeeData.unit,
          status: 'Fora de expediente',
          orderId: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          licensePlate: null,
          originalUnit: null,
          previousId: employeeData.id // Manter referência ao ID anterior
        };
          await setDoc(doc(db, 'deliverymen', newDeliverymanId), deliverymanDoc);
        
        // 6. Deletar o documento antigo da coleção users
        console.log('Deletando documento antigo da coleção users');
        await deleteDoc(userRef);
        
      } 
      else if (previousRole === 'deliv' && newRole !== 'deliv') {        // Entregador mudando para outra função - apenas atualizar o role
        console.log('Entregador mudando para outra função');
        const userDoc = {
          displayName: employeeData.displayName,
          email: employeeData.email,
          password: userData.password || employeeData.password, // Preservar senha
          role: employeeData.role,
          unit: employeeData.unit,
          updatedAt: new Date()
        };
        
        await updateDoc(userRef, userDoc);
      } 
      else {        // Atualização normal sem mudança de tipo de funcionário
        console.log('Atualização normal de funcionário');
        const userDoc = {
          displayName: employeeData.displayName,
          email: employeeData.email,
          password: userData.password || employeeData.password, // Preservar senha
          role: employeeData.role,
          unit: employeeData.unit,
          updatedAt: new Date()
        };
        
        await updateDoc(userRef, userDoc);
        
        if (newRole === 'deliv') {
          const deliverymanRef = doc(db, 'deliverymen', employeeData.id);
          const deliverymanSnapshot = await getDoc(deliverymanRef);
          
          if (deliverymanSnapshot.exists()) {
            await updateDoc(deliverymanRef, {
              name: employeeData.displayName,
              chavePix: employeeData.chavePix,
              pharmacyUnitId: employeeData.unit,
              updatedAt: new Date()
            });
          } else {
            // Criar documento de entregador caso não exista
            // (caso especial se anteriormente tivesse role='deliv' mas o documento deliverymen não existisse)
            const deliverymanDoc = {
              id: employeeData.id,
              name: employeeData.displayName,
              chavePix: employeeData.chavePix,
              pharmacyUnitId: employeeData.unit,
              status: 'Fora de expediente',
              orderId: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              licensePlate: null,
              originalUnit: null
            };
            
            await setDoc(doc(db, 'deliverymen', employeeData.id), deliverymanDoc);
          }
        }
      }

      if (employees.length > 0) {
        await fetchEmployees(lastSearch);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao atualizar funcionário:', error);
      return { 
        success: false, 
        error: error.message || 'Erro ao atualizar funcionário' 
      };
    } finally {
      setLoading(false);
    }
  };


  return {
    employees,
    units,
    loading,
    error,
    fetchEmployees,
    fetchUnits,
    createEmployee,
    updateEmployee,
    deleteEmployee
  };
};