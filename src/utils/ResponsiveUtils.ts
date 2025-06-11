import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Baseado em um iPhone 11 Pro como design base (375x812)
const baseWidth = 375;
const baseHeight = 812;

// Valor para considerar o dispositivo como tablet
const TABLET_THRESHOLD = 768;

export const isTablet = SCREEN_WIDTH >= TABLET_THRESHOLD;
export const isLargeTablet = SCREEN_WIDTH >= 1024;

// Retorna um valor escalado conforme proporção da tela
export const scaleWidth = (size: number) => {
  const scale = SCREEN_WIDTH / baseWidth;
  const newSize = size * scale;
  return Math.round(newSize);
};

export const scaleHeight = (size: number) => {
  const scale = SCREEN_HEIGHT / baseHeight;
  const newSize = size * scale;
  return Math.round(newSize);
};

// Escala para dimensões responsivas que funcionam bem em telas de tablets
export const responsiveDimension = (size: number, factor: number = 0.5) => {
  // Para tablets, diminuímos a escala para que não fique excessivamente grande
  if (isTablet) {
    return size * (1 + (factor * 0.5)); // 50% do fator para tablets
  }
  
  return size * (1 + factor);
};

// Dimensionamento para fontes que escalam bem entre phones e tablets
export const responsiveFontSize = (size: number) => {
  const scale = Math.min(SCREEN_WIDTH / baseWidth, SCREEN_HEIGHT / baseHeight);
  const newSize = size * scale;
  
  // Para tablets, limitamos o crescimento
  if (isTablet) {
    return Math.min(newSize, size * 1.4); // No máximo 40% maior em tablets
  }
  
  return Math.round(newSize);
};

// Espaçamento responsivo (margens, padding)
export const responsiveSpacing = (size: number) => {
  if (isTablet) {
    return size * 1.5; // 50% maior em tablets
  }
  return size;
};

// Layout adaptativo para grids
export const getGridColumns = () => {
  if (isLargeTablet) return 4;
  if (isTablet) return 3;
  if (SCREEN_WIDTH >= 480) return 2;
  return 1;
};

export default {
  isTablet,
  isLargeTablet,
  scaleWidth,
  scaleHeight,
  responsiveFontSize,
  responsiveSpacing,
  responsiveDimension,
  getGridColumns,
  SCREEN_WIDTH,
  SCREEN_HEIGHT
};
