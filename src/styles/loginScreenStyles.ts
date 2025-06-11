// src/styles/loginScreenStyles.ts
import { StyleSheet, Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768; // Considerando tablets com largura mínima de 768px
const isSmallDevice = width < 375; // iPhone SE e similares

export default StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: isSmallDevice ? 16 : (isTablet ? 100 : 24), // Aumentando de 80 para 100 em tablets
    paddingVertical: isSmallDevice ? 5 : (isTablet ? 50 : 10), // Aumentando de 40 para 50 em tablets
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: isSmallDevice ? 8 : (isTablet ? 60 : 24), // Aumentando de 40 para 60 em tablets
    paddingBottom: isSmallDevice ? 20 : (isTablet ? 80 : 30), // Aumentando de 60 para 80 em tablets
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: isSmallDevice ? 10 : (isTablet ? 70 : 20), // Aumentando de 60 para 70 em tablets
    marginBottom: isSmallDevice ? 10 : (isTablet ? 50 : 20), // Aumentando de 40 para 50 em tablets
  },
  logo: {
    width: isSmallDevice ? width * 0.8 : (isTablet ? width * 0.55 : width * 0.9), // Aumentando de 0.5 para 0.55 em tablets
    height: isSmallDevice ? 80 : (isTablet ? 200 : 100), // Aumentando de 180 para 200 em tablets
    maxWidth: 500, // Aumentando de 450 para 500
  },
  welcomeText: {
    fontSize: isSmallDevice ? 20 : (isTablet ? 42 : 24), // Aumentando de 36 para 42 em tablets
    fontWeight: 'bold',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: isSmallDevice ? 4 : (isTablet ? 20 : 8), // Aumentando de 16 para 20 em tablets
  },
  subText: {
    fontSize: isSmallDevice ? 14 : (isTablet ? 26 : 16), // Aumentando de 22 para 26 em tablets
    color: '#718096',
    textAlign: 'center',
    marginBottom: isSmallDevice ? 20 : (isTablet ? 70 : 32), // Aumentando de 60 para 70 em tablets
  },
  formContainer: {
    width: '100%',
    maxWidth: isTablet ? 650 : undefined, // Aumentando de 600 para 650 em tablets
    alignSelf: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: isSmallDevice ? 12 : (isTablet ? 24 : 16),
    paddingHorizontal: 16,
    height: isSmallDevice ? 48 : (isTablet ? 80 : 56), // Aumentando de 72 para 80 em tablets
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#2D3748',
    fontSize: isSmallDevice ? 14 : (isTablet ? 22 : 16), // Aumentando de 20 para 22 em tablets
    padding: 0,
  },
  passwordIcon: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: '#e41c26',
    borderRadius: 12,
    height: isSmallDevice ? 48 : (isTablet ? 80 : 56), // Aumentando de 66 para 80 em tablets
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: isTablet ? 12 : 8, // Aumentando de 8 para 12 em tablets
  },
  loginButtonDisabled: {
    backgroundColor: '#ff4d54',
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallDevice ? 15 : (isTablet ? 22 : 16), // Aumentando de 16 para 22 em tablets
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: isSmallDevice ? 16 : (isTablet ? 32 : 24), // Aumentando de 24 para 32 em tablets
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    color: '#718096',
    paddingHorizontal: isTablet ? 24 : 16, // Aumentando de 16 para 24 em tablets
    fontSize: isSmallDevice ? 12 : (isTablet ? 18 : 14), // Aumentando de 14 para 18 em tablets
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: isSmallDevice ? 12 : (isTablet ? 40 : 16), // Aumentando de 32 para 40 em tablets
  },
  socialButton: {
    width: isSmallDevice ? 48 : (isTablet ? 90 : 56), // Aumentando de 80 para 90 em tablets
    height: isSmallDevice ? 48 : (isTablet ? 90 : 56), // Aumentando de 80 para 90 em tablets
    borderRadius: isSmallDevice ? 10 : (isTablet ? 24 : 12), // Aumentando de 20 para 24 em tablets
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: isSmallDevice ? 14 : 32, // Reduzindo de 20 para 14 em dispositivos pequenos
    marginBottom: isSmallDevice ? 10 : 16,
  },
  signupText: {
    color: '#718096',
    fontSize: isSmallDevice ? 12 : 14,
  },
  signupLink: {
    color: '#e41c26',
    fontSize: isSmallDevice ? 12 : 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalCloseButton: {
    marginTop: 12,
    padding: 12,
  },
  modalCloseButtonText: {
    color: '#718096',
    fontSize: 16,
    textAlign: 'center',
  },
  forgotPasswordButton: {
    marginTop: isSmallDevice ? 12 : 16,
    padding: isSmallDevice ? 6 : 8,
  },
  forgotPasswordText: {
    color: '#e41c26',
    fontSize: isSmallDevice ? 13 : (isTablet ? 18 : 14), // Aumentando de 14 para 18 em tablets
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#e41c26',
    borderRadius: 12,
    height: isSmallDevice ? 48 : 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#ff4d54',
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
  },
  continueAnonButton: {
    marginTop: isSmallDevice ? 8 : 16,    // Reduzindo de 12 para 8 em dispositivos pequenos
    marginBottom: isSmallDevice ? 4 : 8,  // Reduzindo de 6 para 4 em dispositivos pequenos
    paddingVertical: isSmallDevice ? 4 : 8, // Reduzindo o padding também
  },
  continueAnonText: {
    color: '#718096',
    fontSize: isSmallDevice ? 12 : (isTablet ? 16 : 14), // Aumentando de 14 para 16 em tablets
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});