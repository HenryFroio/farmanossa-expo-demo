// styles/deliverymanStyles.ts
import { StyleSheet, Platform } from 'react-native';

const colors = {
  primary: '#e41c26',
  secondary: '#ff6b00',
  background: '#f8f9fa',
  text: '#333333',
  white: '#ffffff',
  lightGray: '#e0e0e0',
  pending: '#FFA500',
  inProgress: '#4169E1',
  delivering: '#32CD32',
  returning: '#708090',
};

// Padding top apenas para dispositivos sem notch/safe area
const TOP_PADDING = Platform.OS === 'android' ? 
  (Platform.Version >= 23 ? 10 : 25) : // Android 6.0 (API 23) ou superior usa SafeArea
  0; // iOS sempre usa SafeArea

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary, // Cor do header
    zIndex:1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#e41c26'
  },
  topSafeArea: {
    backgroundColor: colors.primary, // Cor do header
  },
  mainSafeArea: {
    flex: 1,
    backgroundColor: colors.background, // Cor do background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    // Sombra apenas nas laterais e inferior
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3, // Sombra apenas para baixo
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    // Para Android
    elevation: 6,
    // Clip a sombra superior
    overflow: 'hidden',
    zIndex: 10,  },
  headerLeft: {
    left: 20,
    justifyContent: 'center',
    zIndex: 1,
  },
  headerIcon: {
    right: 20,
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
    zIndex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  headerIconMargin: {
    marginRight: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusCard: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusLabel: {
    fontSize: 16,
    color: colors.white,
    marginBottom: 5,
    opacity: 0.9,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  statusOffDuty: {
    backgroundColor: colors.pending,
  },
  statusWaiting: {
    backgroundColor: colors.inProgress,
  },
  statusDelivering: {
    backgroundColor: colors.delivering,
  },
  statusReturning: {
    backgroundColor: colors.returning,
  },
  activeOrdersContainer: {
    marginTop: 20,
    width: '100%',
  },
  activeOrdersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  activeOrderItem: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    marginRight: 15,
    marginLeft: 5,
    marginBottom: 15,
    width: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  activeOrderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  activeOrderAddress: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.8,
    marginBottom: 5,
  },
  activeOrderCustomer: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.8,
  },
  buttonContainer: {
    marginTop: 'auto',
    gap: 10,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6, // Example style to indicate disabled state
  },
  workButton: {
    backgroundColor: colors.secondary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  workButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerDrawerIcon: {
    padding: 10,
  },
  drawerContent: {
    flex: 1,
    padding: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  drawerCloseButton: {
    padding: 5,
  },
  drawerSection: {
    marginBottom: 20,
  },
  drawerSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  drawerItemText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 10,
  },
  bottomSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomSheetTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  motorcycleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  motorcycleSelected: {
    backgroundColor: '#f0f9ff',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  motorcyclePlate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  canceledOrderItem: {
    opacity: 0.7,
    backgroundColor: '#FEE2E2', // Light red background
  },
  canceledOrderText: {
    color: '#DC2626', // Red text
    fontWeight: 'bold',
    marginTop: 4,
  },
  // Estilos para o caso de não haver pedidos ativos
  noOrdersContainer: {
    marginTop: 20,
    width: '100%',
    padding: 15,
    backgroundColor: '#FFF8E1', // Fundo amarelo claro para chamar atenção
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FFD54F',
    borderWidth: 1,
  },
  noOrdersText: {
    fontSize: 16,
    color: '#5D4037',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  reloadButton: {
    backgroundColor: '#FF4B2B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  reloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  // Estilos para o loading de pedidos
  loadingOrdersContainer: {
    marginTop: 20,
    width: '100%',
    padding: 15,
    backgroundColor: '#E8F4FD',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#90CAF9',
    borderWidth: 1,
  },
  loadingOrdersText: {
    fontSize: 16,
    color: '#1565C0',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 8,
    fontWeight: '500',
  },
  // Estilos para tela de erro e loading
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  loadingText: {
    fontSize: 16,
    color: '#333333',
    marginTop: 10,
  },
});