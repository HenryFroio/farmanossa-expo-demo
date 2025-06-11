// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import {
  AccessToken,
  LoginManager,
  Settings,
} from 'react-native-fbsdk-next';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User,
  updateProfile,
  signInWithCredential,
  FacebookAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  deleteUser
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getFirestore,
  serverTimestamp,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  query as firebaseQuery,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, app } from '../config/firebase';
import { FACEBOOK_APP_ID, WEB_CLIENT_ID } from '@env';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useNavigation } from '@react-navigation/native';
import { getExpoPushToken } from '../services/notification';
import { Alert, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';

// Initialize Firestore
const db = getFirestore(app);

// Facebook Login Configuration
Settings.setAppID(FACEBOOK_APP_ID);
Settings.initializeSDK();

// Configure GoogleSignin immediately with all necessary options
GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  ...(Platform.OS === 'ios' 
    ? { iosClientId: '670446448086-e5ub65lcogt4quddblppaeraeindnjr5.apps.googleusercontent.com' }
    : {}),
  offlineAccess: true
});

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  userRole: string | null;
  managerUnit: string | null;
  updateUserPhone: (phone: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  isAnonymous: boolean;
  isManager: boolean;
  isClient: boolean;
  isDeliveryman: boolean;
  signInWithGoogle: () => Promise<User | null>;
  signInWithFacebook: () => Promise<User | null>;
  signInWithApple: () => Promise<User | null>;
  signInWithEmail: (email: string, password: string) => Promise<User | null>;
  resetPassword: (email: string) => Promise<boolean>;
  createOrUpdateUserRole: (user: User) => Promise<UserData>;
  deleteDeliveryman: (deliverymanId: string) => Promise<boolean>;
  deleteAccount: () => Promise<void>;
}

interface DeviceInfo {
  deviceId: string;
  pushToken: string;
  platform: string;
  brand?: string;
  modelName?: string;
  osVersion?: string;
  lastActive: any;
}

interface UserData {
  role: string;
  unit?: string;
  deleted?: boolean;
  devices?: DeviceInfo[];
  privacyPreferences?: {
    isPrivateEmail: boolean;
    allowAdvertising: boolean;
  };
}

// Função auxiliar para obter um identificador único para o dispositivo
const getDeviceId = async (): Promise<string> => {
  // Use uma combinação de informações do dispositivo para criar um ID razoavelmente único
  const brand = Device.brand || '';
  const modelName = Device.modelName || '';
  const osVersion = Device.osVersion || '';
  
  return `${Platform.OS}-${brand}-${modelName}-${osVersion}`.replace(/\s+/g, '-').toLowerCase();
};

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [managerUnit, setManagerUnit] = useState<string | null>(null);
  const navigation = useNavigation();

  // Função corrigida para adicionar o token do dispositivo atual ao usuário
  const addDeviceToken = async (userId: string): Promise<void> => {
    const startTime = Date.now();
    try {
      const pushToken = await getExpoPushToken();
      
      if (!pushToken) {
        return;
      }
      
      const deviceId = await getDeviceId();
      const userRef = doc(db, 'users', userId);
      
      // Obter informações do dispositivo
      const deviceInfo = {
        deviceId,
        pushToken,
        platform: Platform.OS,
        brand: Device.brand,
        modelName: Device.modelName,
        osVersion: Device.osVersion,
        // Usamos Date.now() como timestamp em vez de serverTimestamp()
        lastActive: new Date().toISOString()
      };
      
      // Verificar se o dispositivo já está registrado para o usuário
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const devices = userData.devices || [];
        
        // Verificar se este dispositivo já está registrado
        const existingDeviceIndex = devices.findIndex((d: DeviceInfo) => d.deviceId === deviceId);
        
        if (existingDeviceIndex >= 0) {
          // Atualizar apenas o token e o timestamp para o dispositivo existente
          
          // Cria uma cópia do array de dispositivos
          const updatedDevices = [...devices];
          updatedDevices[existingDeviceIndex] = {
            ...updatedDevices[existingDeviceIndex],
            pushToken,
            lastActive: new Date().toISOString()
          };
          
          await updateDoc(userRef, { 
            devices: updatedDevices,
            lastActiveAt: serverTimestamp() // Podemos usar serverTimestamp() diretamente no updateDoc
          });
        } else {
          // Adicionar novo dispositivo ao array
          await updateDoc(userRef, {
            devices: arrayUnion(deviceInfo),
            lastActiveAt: serverTimestamp() // Podemos usar serverTimestamp() diretamente no updateDoc
          });
        }
      } else {
        // Documento do usuário não existe, criá-lo com o dispositivo
        await setDoc(userRef, {
          devices: [deviceInfo],
          createdAt: serverTimestamp() // Podemos usar serverTimestamp() diretamente no setDoc
        });
      }
      
    } catch (error) {
      // Ignored
    }
  };

  // Função para remover o token do dispositivo atual
  const removeDeviceToken = async (userId: string): Promise<void> => {
    const startTime = Date.now();
    try {
      const deviceId = await getDeviceId();
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
        }
      }
    } catch (error) {
      // Ignored
    }
  };

  const createOrUpdateUserRole = async (
    user: User | null | undefined,
    privacyPreferences?: {
      isPrivateEmail: boolean;
      allowAdvertising: boolean;
    },
    additionalData?: Record<string, any>
  ): Promise<UserData | null> => {
    const startTime = Date.now();
    try {
      // Verificar se o usuário existe e tem um UID
      if (!user || !user.uid) {
        return null;
      }

      // Verificar se o db está inicializado
      if (!db) {
        return null;
      }

      // Primeiro verificamos na coleção users se o usuário já existe com algum papel
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      // Se o usuário já existe como deliv em users, mantemos esse papel
      if (userSnap.exists() && userSnap.data().role === 'deliv') {
        const userData = userSnap.data();
        
        // Atualiza dados básicos
        await updateDoc(userRef, {
          lastLogin: serverTimestamp(),
          ...(user.displayName && { displayName: user.displayName }),
          ...(user.photoURL && { photoURL: user.photoURL }),
          ...(additionalData || {})
        });
        
        // Verifica se existe o ID do entregador vinculado
        if (userData.deliverymanId) {
          try {
            const deliverymanRef = doc(db, 'deliverymen', userData.deliverymanId);
            const deliverymanDoc = await getDoc(deliverymanRef);
            
            if (deliverymanDoc.exists()) {
              await updateDoc(deliverymanRef, {
                lastLogin: serverTimestamp()
              });
            }
          } catch (err) {
            // Ignored
          }
        }
        
        setUserRole('deliv');
        if (userData.unit) {
          setManagerUnit(userData.unit);
        }
        return userData as UserData;
      }
      
      // Se não encontrou como 'deliv', procura pelo nome na coleção deliverymen
      let deliverymanDoc = null;
      let deliverymanId = null;
      
      // NOVO: Tentativa 1 - Verificar por nome direto
      if (user.displayName) {
        
        const deliverymenRef = collection(db, 'deliverymen');
        const normalizedName = user.displayName.toUpperCase().trim();
        
        const nameQuery = firebaseQuery(deliverymenRef, where('name', '==', normalizedName));
        const nameSnap = await getDocs(nameQuery);
        
        if (!nameSnap.empty) {
          deliverymanDoc = nameSnap.docs[0];
          deliverymanId = deliverymanDoc.id;
        } else {
          // NOVO: Se não encontrar pelo nome exato, tenta buscar pelo email
          if (user.email) {
            
            const emailQuery = firebaseQuery(
              deliverymenRef, 
              where('email', '==', user.email.toLowerCase())
            );
            const emailSnap = await getDocs(emailQuery);
            
            if (!emailSnap.empty) {
              deliverymanDoc = emailSnap.docs[0];
              deliverymanId = emailSnap.docs[0].id;
            } else {
              // NOVO: Último recurso - buscar todos os entregadores e comparar nomes de forma mais flexível
              
              const allDeliverymenQuery = firebaseQuery(deliverymenRef, where('name', '!=', ''));
              const allDeliverymenSnap = await getDocs(allDeliverymenQuery);
              
              for (const doc of allDeliverymenSnap.docs) {
                const deliverymanName = doc.data().name?.toUpperCase()?.trim();
                const nameSimilarity = compareNames(normalizedName, deliverymanName);
                
                if (nameSimilarity >= 0.8) {
                  deliverymanDoc = doc;
                  deliverymanId = doc.id;
                  break;
                }
              }
            }
          }
        }
      }
      
      let finalUserRole = null;
      let finalUserData = null;
      
      // Se for um entregador, o papel é 'deliv'
      if (deliverymanDoc) {
        finalUserRole = 'deliv';
        const deliverymanData = deliverymanDoc.data();
        
        // Atualiza último login em deliverymen
        if (deliverymanId) {
          const deliverymanRef = doc(db, 'deliverymen', deliverymanId);
          await updateDoc(deliverymanRef, { lastLogin: serverTimestamp() });
        }
        
        // Se o usuário também existe na coleção users, garantimos que o role 'deliv' esteja definido lá
        if (userSnap.exists()) {
          const updateUserDelivStartTime = Date.now();
          await updateDoc(userRef, {
            role: 'deliv',
            lastLogin: serverTimestamp(),
            displayName: user.displayName || deliverymanData.name,
            unit: deliverymanData.pharmacyUnitId,
            deliverymanId: deliverymanId, 
            ...(user.photoURL ? { photoURL: user.photoURL } : {}),
            ...(additionalData || {})
          });
          
          finalUserData = {
            ...userSnap.data(),
            ...deliverymanData,
            role: 'deliv',
            unit: deliverymanData.pharmacyUnitId,
            deliverymanId: deliverymanId
          };
        } 
        // Se o entregador não existir na coleção users, criamos o registro
        else {
          const createUserDelivStartTime = Date.now();
          await setDoc(userRef, {
            role: 'deliv',
            email: user.email,
            displayName: user.displayName || deliverymanData.name,
            unit: deliverymanData.pharmacyUnitId,
            deliverymanId: deliverymanId, 
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
          });
          
          finalUserData = {
            ...deliverymanData,
            role: 'deliv',
            unit: deliverymanData.pharmacyUnitId,
            deliverymanId: deliverymanId
          };
        }
      }
      // Não é um entregador, mas pode ser um usuário normal
      else if (userSnap.exists()) {
        
        const userData = userSnap.data();
        finalUserRole = userData.role;
        
        await updateDoc(userRef, {
          displayName: user.displayName,
          photoURL: user.photoURL,
          ...(privacyPreferences && { privacyPreferences }),
          ...(additionalData || {}),
          lastLogin: serverTimestamp()
        });
        
        finalUserData = {
          ...userData,
          displayName: user.displayName,
          photoURL: user.photoURL,
          ...(additionalData || {})
        };
      }
      // Usuário completamente novo
      else {
        finalUserRole = 'cliente';
        
        const defaultUserData: UserData = {
          role: 'cliente',
          email: user.email,
          displayName: user.displayName,
          phoneNumber: user.phoneNumber || null,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          privacyPreferences: privacyPreferences || {
            isPrivateEmail: false,
            allowAdvertising: false
          },
          ...(additionalData || {})
        };
        
        await setDoc(userRef, defaultUserData);
        finalUserData = defaultUserData;
      }
      
      setUserRole(finalUserRole);
      
      if (finalUserRole === 'manager' && finalUserData && finalUserData.unit) {
        setManagerUnit(finalUserData.unit);
      }
      
      return finalUserData;
    } catch (error) {
      throw error;
    }
  };

  // Helper function to compare name similarity (simple implementation)
  function compareNames(name1: string, name2: string): number {
    if (!name1 || !name2) return 0;
    
    // Convert to lowercase and remove extra spaces
    const n1 = name1.toLowerCase().trim().replace(/\s+/g, ' ');
    const n2 = name2.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Check if one name contains the other
    if (n1.includes(n2) || n2.includes(n1)) return 0.9;
    
    // Split names into parts and check for matches
    const parts1 = n1.split(' ');
    const parts2 = n2.split(' ');
    
    // Count matching parts
    const matches = parts1.filter(part => parts2.includes(part)).length;
    const total = Math.max(parts1.length, parts2.length);
    
    return total > 0 ? matches / total : 0;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const authStateChangedStartTime = Date.now();
      setLoading(true); // Ensure loading is true at the start of processing

      if (user) {
        try {
          // Verificação específica para admins por email
          if (user.email?.toLowerCase() === 'admin@farmanossa.com') {
            setUserRole('admin');
            setManagerUnit(null);
            setUser(user);
            setLoading(false);
            return;
          }
          
          const userDocStartTime = Date.now();
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            if (userData.role) {
              setUserRole(userData.role);
              if (userData.role === 'manager' && userData.unit) {
                setManagerUnit(userData.unit);
              }
              setUser(user);
              setLoading(false);
              return;
            }
            
            if (userData.deliverymanId) {
              setUserRole('deliv');
              if (userData.unit) {
                setManagerUnit(userData.unit);
              }
              setUser(user);
              setLoading(false);
              return;
            }
          }
          
          const deliverymenRef = collection(db, 'deliverymen');
          const normalizedName = user.displayName?.toUpperCase().trim();

          if (normalizedName) {
            const nameQueryStartTime = Date.now();
            const nameQuery = firebaseQuery(deliverymenRef, where('name', '==', normalizedName));
            const nameSnap = await getDocs(nameQuery);
            
            if (!nameSnap.empty) {
              setUserRole('deliv');
              const unit = nameSnap.docs[0].data().pharmacyUnitId;
              setManagerUnit(unit);
              setUser(user);
              setLoading(false);
              return;
            }
          }
          
          if (user.email) {
            const emailQueryStartTime = Date.now();
            const emailQuery = firebaseQuery(
              deliverymenRef, 
              where('email', '==', user.email.toLowerCase())
            );
            const emailSnap = await getDocs(emailQuery);
            
            if (!emailSnap.empty) {
              setUserRole('deliv');
              const unit = emailSnap.docs[0].data().pharmacyUnitId;
              setManagerUnit(unit);
              setUser(user);
              setLoading(false);
              return;
            }
          }
          
          const allDeliverymenQueryStartTime = Date.now();
          const allDeliverymenQuery = firebaseQuery(deliverymenRef, where('name', '!=', ''));
          const allDeliverymenSnap = await getDocs(allDeliverymenQuery);
          
          for (const doc of allDeliverymenSnap.docs) {
            const deliverymanName = doc.data().name?.toUpperCase()?.trim();
            const nameSimilarity = compareNames(normalizedName || '', deliverymanName);
            
            if (nameSimilarity >= 0.8) {
              setUserRole('deliv');
              const unit = doc.data().pharmacyUnitId;
              setManagerUnit(unit);
              setUser(user);
              setLoading(false);
              return;
            }
          }
          
          // Se chegou aqui e ainda não definiu um papel, pode fazer uma última verificação
          // This block might be redundant if createOrUpdateUserRole is always called on login
          // However, onAuthStateChanged can fire independently.
          if (!userRole) { // Check if userRole is still not set by previous logic
            if (user.email) {
              const email = user.email.toLowerCase();
              if (email.includes('admin') || email.includes('administrador')) {
                setUserRole('admin');
              } else if (email.includes('manager') || email.includes('gerente')) {
                setUserRole('manager');
                // Attempt to get unit if userDoc exists and has unit for manager
                if (userDoc.exists() && userDoc.data().unit) {
                    setManagerUnit(userDoc.data().unit);
                }
              } else if (email.includes('deliv') || email.includes('entrega')) {
                setUserRole('deliv');
                 // Attempt to get unit if userDoc exists and has unit for deliv
                if (userDoc.exists() && userDoc.data().unit) {
                    setManagerUnit(userDoc.data().unit);
                }
              } else {
                setUserRole('cliente');
              }
            } else {
              setUserRole('cliente');
            }
          }
        } catch (error) {
          setUserRole('cliente'); // Default to 'cliente' on error
        } finally {
          setUser(user); // Set user in all cases if user object exists
          setLoading(false); // Ensure loading is set to false
        }
      } else {
        // Usuário não autenticado
        setUser(null);
        setUserRole(null);
        setManagerUnit(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []); // Removed userRole from dependencies to avoid re-triggering on its own change

  const signInWithEmail = async (email: string, password: string): Promise<User | null> => {
    const startTime = Date.now();
    try {
      setLoading(true);
      
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      const userData = await createOrUpdateUserRole(result.user);
      
      if (result.user && result.user.uid) {
        await addDeviceToken(result.user.uid);
      }
      
      return result.user;
    } catch (error: any) {
      const authError: any = new Error();
      authError.code = error.code;
      
      switch (error.code) {
        case 'auth/invalid-email':
          authError.message = 'E-mail inválido';
          break;
        case 'auth/user-disabled':
          authError.message = 'Usuário desativado';
          break;
        case 'auth/user-not-found':
          authError.message = 'Usuário não encontrado';
          break;
        case 'auth/wrong-password':
          authError.message = 'Senha incorreta';
          break;
        case 'auth/invalid-credential':
          authError.message = 'Credenciais inválidas. Verifique seu e-mail e senha.';
          break;
        case 'auth/too-many-requests':
          authError.message = 'Muitas tentativas. Tente novamente mais tarde';
          break;
        case 'auth/invalid-api-key':
          authError.message = 'Erro de configuração do Firebase';
          break;
        case 'auth/app-not-authorized':
          authError.message = 'Erro de autorização do app';
          break;
        default:
          authError.message = 'Erro ao fazer login: ' + (error.message || 'Erro desconhecido');
      }
      
      throw authError;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<User | null> => {
    const startTime = Date.now();
    try {
      setLoading(true);
      
      await GoogleSignin.hasPlayServices({ 
        showPlayServicesUpdateDialog: true,
        suppressErrors: Platform.OS === 'ios'
      });
      
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        await GoogleSignin.signOut();
      }
      
      // Add a small delay on iOS to ensure previous operations are complete
      if (Platform.OS === 'ios') {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      const { idToken } = await GoogleSignin.signIn();
      
      if (!idToken) {
        throw new Error('No ID token received from Google Sign In');
      }
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      
      const userData = await createOrUpdateUserRole(result.user);
      
      if (userData && userData.role) {
        setUserRole(userData.role);
      }
      
      if (result.user && result.user.uid) {
        await addDeviceToken(result.user.uid);
      }
      
      return result.user;
    } catch (error: any) {
      // Handle iOS-specific errors
      if (Platform.OS === 'ios') {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          return null;
        }
        if (error.code === statusCodes.IN_PROGRESS) {
          // Force reset Google Sign In
          await GoogleSignin.signOut();
          throw new Error('Por favor, tente novamente');
        }
      }
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return null;
      } else if (error.code === statusCodes.IN_PROGRESS) {
        return null;
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services não disponível');
      } else {
        throw new Error('Erro ao fazer login com Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithFacebook = async (): Promise<User | null> => {
    const startTime = Date.now();
    try {
      setLoading(true);
      
      if (Platform.OS === 'ios') {
        LoginManager.setLoginBehavior('browser');
      } else {
        LoginManager.setLoginBehavior('native_only');
      }
      
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      
      if (result.isCancelled) {
        throw new Error('User cancelled the login process');
      }
      const data = await AccessToken.getCurrentAccessToken();
      
      if (!data?.accessToken) {
        throw new Error('Não foi possível obter o token do Facebook');
      }
  
      const credential = FacebookAuthProvider.credential(data.accessToken);
      const firebaseResult = await signInWithCredential(auth, credential);
      
      const userData = await createOrUpdateUserRole(firebaseResult.user);
      
      if (userData && userData.role) {
        setUserRole(userData.role);
      }
      
      if (firebaseResult.user && firebaseResult.user.uid) {
        await addDeviceToken(firebaseResult.user.uid);
      }
      
      return firebaseResult.user;
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithApple = async (): Promise<User | null> => {
    const startTime = Date.now();
    try {
      setLoading(true);
      
      // Gerar um nonce aleatório para segurança
      const rawNonce = Math.random().toString(36).substring(2, 10);
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );
      
      // Solicitar credenciais da Apple
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: nonce
      });
      
      if (!appleCredential.identityToken) {
        throw new Error('Apple Sign-In falhou: token não recebido');
      }
      
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: appleCredential.identityToken,
        rawNonce: rawNonce,
      });
      
      const result = await signInWithCredential(auth, credential);
      
      if (appleCredential.fullName && 
          (appleCredential.fullName.givenName || appleCredential.fullName.familyName)) {
        const displayName = [
          appleCredential.fullName.givenName,
          appleCredential.fullName.familyName
        ].filter(Boolean).join(' ');
        
        if (displayName && result.user) {
          await updateProfile(result.user, { displayName: displayName });
        }
      }
      
      const appleSpecificUserData = { appleUserId: appleCredential.user };
      const userDataResult = await createOrUpdateUserRole(result.user, undefined, appleSpecificUserData);
      
      if (userDataResult && userDataResult.role) {
        setUserRole(userDataResult.role);
      }
      
      if (result.user && result.user.uid) {
        await addDeviceToken(result.user.uid);
      }
      
      return result.user;
    } catch (error: any) {
      // Se o usuário cancelou, não mostrar erro
      if (error.code === 'ERR_CANCELED') {
        return null;
      }
      
      throw error; // Importante: propagar o erro para tratamento adequado
    } finally {
      setLoading(false);
    }
  };

  const updateUserPhone = async (phone: string): Promise<boolean> => {
    const startTime = Date.now();
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuário não encontrado');
      }
      
      await updateProfile(currentUser, {
        phoneNumber: phone
      });

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { 
        phoneNumber: phone,
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    const startTime = Date.now();
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error: any) {
      let errorMessage = 'Erro ao enviar email de recuperação';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Usuário não encontrado';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
          break;
      }
      
      throw new Error(errorMessage);
    }
  };

  const deleteDeliveryman = async (deliverymanId: string): Promise<boolean> => {
    const startTime = Date.now();
    try {
      const userRef = doc(db, 'deliverymen', deliverymanId);
      const userDoc = await getDoc(userRef);
  
      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }
  
      await updateDoc(userRef, { 
        deleted: true,
        deletedAt: serverTimestamp(),
        status: 'inactive',
        deletedBy: auth.currentUser?.uid
      });
  
      const response = await fetch('https://us-central1-farmanossadelivery-76182.cloudfunctions.net/api/deleteUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },body: JSON.stringify({
          userId: deliverymanId,
          adminId: auth.currentUser?.uid
        })
      });
  
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Erro ao deletar usuário no Authentication');
      }
  
      return true;
    } catch (error) {
      throw error;
    }
  };

  const deleteAccount = async (): Promise<void> => {
    const startTime = Date.now();
    try {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      await removeDeviceToken(user.uid);
      
      const response = await fetch(`https://us-central1-farmanossadelivery-76182.cloudfunctions.net/api/deleteUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          selfDelete: true
        }),
      });
  
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao excluir conta');
      }
      
      // Após excluir no backend, também desconecte localmente
      await auth.signOut();
      setUser(null);
      setUserRole(null);
      setManagerUnit(null);
    } catch (error) {
      Alert.alert(
        'Erro',
        'Não foi possível excluir sua conta. Por favor, tente novamente mais tarde.'
      );
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    const startTime = Date.now();
    try {
      setLoading(true);
      
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid) {
        await removeDeviceToken(currentUser.uid);
      }
  
      setUser(null);
      setUserRole(null);
      setManagerUnit(null);
  
      try {
        await GoogleSignin.signOut();
        await GoogleSignin.revokeAccess();
      } catch (googleError) {
        // Ignored
      }
  
      try {
        LoginManager.logOut();
      } catch (fbError) {
        // Ignored
      }
  
      try {
        await auth.signOut(); // This is an alias for firebaseSignOut(auth)
      } catch (firebaseError) {
        // Ignored
      }
  
      // firebaseSignOut(auth) is often redundant if auth.signOut() was called,
      // but keeping it for thoroughness as per original code.
      // console.log('[signOut] Calling firebaseSignOut(auth).');
      // await firebaseSignOut(auth);
      // console.log('[signOut] firebaseSignOut(auth) complete.');
  
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const keys = [
          '@user_data',
          '@auth_token',
          '@user_role',
          '@login_type',
        ];
        await AsyncStorage.multiRemove(keys);
      } catch (storageError) {
        // Ignored
      }
  
      await new Promise(resolve => setTimeout(resolve, 500));
  
      // @ts-ignore
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    userRole,
    managerUnit,
    updateUserPhone,
    signOut,
    isAnonymous: user?.isAnonymous || false,
    isManager: userRole === 'manager',
    isClient: userRole === 'cliente',
    isDeliveryman: userRole === 'deliv',
    signInWithGoogle,
    signInWithFacebook,
    signInWithApple,
    signInWithEmail,
    resetPassword,
    createOrUpdateUserRole,
    deleteDeliveryman,
    deleteAccount,
  };
};

export default useAuth;