import { getFirestore } from 'firebase/firestore';
import { auth } from '../../firebaseInit.demo';
import { Alert } from 'react-native';

export { auth };
// Demo version - Firebase configuration sanitized for portfolio
export const db = getFirestore();

export const checkFirebaseConnection = async () => {
    try {
        if (!auth) {
            throw new Error('Auth não disponível');
        }

        if (!db) {
            throw new Error('Firestore não disponível');
        }

        // Demo: Firebase connection check (sanitized)
        const isInitialized = auth.app && auth.app.options;
        if (!isInitialized) {
            throw new Error('Firebase não está completamente inicializado');
        }

        console.log('✅ Firebase conectado com sucesso');
        return true;
        
    } catch (error) {
        console.error('❌ Erro na conexão Firebase:', error);
        Alert.alert(
            'Erro de Conexão',
            'Não foi possível conectar ao Firebase. Verifique sua conexão com a internet.',
            [{ text: 'OK' }]
        );
        return false;
    }
};
