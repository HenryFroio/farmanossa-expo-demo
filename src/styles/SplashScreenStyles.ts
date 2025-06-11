// src/styles/SplashScreenStyles.ts
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    maxWidth:'80%',
    height: 400,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: '20%',
  },
});