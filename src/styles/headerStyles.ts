// headerStyles.ts
import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Função para calcular tamanho responsivo
const responsiveSize = (baseSize: number) => {
  const scale = Math.min(width / 375, 1.3); // Limita o scale máximo a 1.3
  return Math.round(baseSize * scale);
};

// Aproveitando as cores do design system
const colors = {
  primary: '#e41c26',
  white: '#ffffff',
};

export default StyleSheet.create({
  headerContainer: {
    position: 'relative',
    zIndex: -1,
  },
  headerLogo: {
    width: responsiveSize(50),
    height: responsiveSize(50),
    resizeMode: 'contain',
    tintColor: colors.white,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginHorizontal: 4,
  },
  headerTitle: {
    textAlign: 'center',
    flexShrink: 1,
  },
});