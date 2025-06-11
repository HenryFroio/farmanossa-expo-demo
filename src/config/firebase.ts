import { getFirestore } from 'firebase/firestore';
import { app, auth } from '../../firebaseInit';
import { Alert } from 'react-native';

export { auth };
export const db = getFirestore(app);

export const checkFirebaseConnection = async () => {
    try {
        if (!auth) {
            throw new Error('Auth não disponível');
        }

        if (!db) {
            throw new Error('Firestore não disponível');
        }

        // Verifica se o app está realmente inicializado
        const isInitialized = auth.app && auth.app.options;
        if (!isInitialized) {
            throw new Error('Firebase não está completamente inicializado');
        }

        return true;
    } catch (error) {
        console.error('Erro na verificação do Firebase:', error);
        Alert.alert('Erro Firebase', error.message);
        return false;
    }
};