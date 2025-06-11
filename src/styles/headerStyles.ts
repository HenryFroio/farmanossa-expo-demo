// headerStyles.ts
import { StyleSheet } from 'react-native';

// Aproveitando as cores do design system
const colors = {
  primary: '#e41c26',
  white: '#ffffff',
};

export default StyleSheet.create({
  headerContainer: {
    position: 'relative', // Para garantir que os elementos filhos sejam posicionados corretamente,
    zIndex:-1
  },
  headerLogo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    tintColor: colors.white, // Caso a logo precise ser branca
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    // Não precisamos sobrescrever muitas propriedades pois já estão definidas no styles compartilhado
    // Apenas ajustamos o que for necessário para o novo layout
    textAlign: 'center',
  },
});