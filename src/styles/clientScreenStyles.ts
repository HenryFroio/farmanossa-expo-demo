import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

export default StyleSheet.create({
  welcomeContainer: {
    paddingHorizontal: isTablet ? 32 : 16,
    paddingBottom: isTablet ? 24 : 16,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#e41c26'
  },
  title: {
    fontSize: isTablet ? 34 : 28,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  welcomeContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: isTablet ? 32 : 24,
    padding: isTablet ? 30 : 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeTopSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImage: {
    width: isTablet ? 80 : 60,
    height: isTablet ? 80 : 60,
    borderRadius: isTablet ? 40 : 30,
    backgroundColor: '#F0F0F0', // Fallback color
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#48BB78',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 4,
  },
  userName: {
    fontSize: isTablet ? 30 : 24,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  infoContainer: {
    flexDirection: isTablet ? 'row' : 'row',
    justifyContent: 'space-between',
    flexWrap: isTablet ? 'wrap' : 'nowrap',
    marginTop: 8,
  },
  deliveryInfoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: isTablet ? 24 : 16,
    borderRadius: isTablet ? 20 : 16,
    marginRight: 8,
    minHeight: isTablet ? 100 : 'auto',
  },
  deliveryTextContainer: {
    marginLeft: 12,
  },
  deliveryTitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 2,
  },
  deliveryCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e41c26',
  },
  lastOrderCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 16,
    marginLeft: 8,
  },
  lastOrderTextContainer: {
    marginLeft: 12,
  },
  lastOrderTitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 2,
  },
  lastOrderTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568',
  },
  header: {
    backgroundColor: '#e81c24',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  
  headerIcon: {
    width: 40, // Tamanho fixo para o container do ícone
    height: 40,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  headerLogo: {
    width: 60,
    height: 60,
    borderRadius: 20,
  },
  
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },  
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  activeDeliveriesText: {
    marginLeft: 8,
    color: '#e41c26',
    fontWeight: '500',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: '#e41c26',
  },
  filterButtonText: {
    marginLeft: 8,
    color: '#718096',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  orderItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: isTablet ? 20 : 16,
    padding: isTablet ? 24 : 16,
    marginBottom: isTablet ? 24 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeOrderItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#e41c26',
  },
  orderIconContainer: {
    marginRight: 16,
    padding: 8,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
  },
  orderDetails: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  orderItems: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: 12,
    color: '#718096',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#EDF2F7',
  },
  deliveredBadge: {
    backgroundColor: '#F0FFF4',
  },
  activeStatusBadge: {
    backgroundColor: '#FFF5F5',
  },
  orderStatus: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  searchFloatingButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e41c26',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: isTablet ? 32 : 24,
    padding: isTablet ? 32 : 24,
    width: isTablet ? '70%' : '85%',
    maxWidth: 600,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchInput: {
    width: '100%',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#2D3748',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchButton: {
    backgroundColor: '#e41c26',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 12,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeButtonText: {
    color: '#718096',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  phoneModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  
  phoneModalIcon: {
    marginBottom: 24,
  },
  
  phoneModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 12,
    textAlign: 'center',
  },
  
  phoneModalDescription: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  
  phoneInputIcon: {
    marginRight: 12,
  },
  
  phoneInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2D3748',
  },
  
  phoneSubmitButton: {
    backgroundColor: '#e41c26',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  phoneSubmitButtonDisabled: {
    backgroundColor: '#CBD5E0',
  },
  
  phoneSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  phoneModalDisclaimer: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  listContentCentered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  
errorContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
  backgroundColor: '#FFFFFF',
},

errorText: {
  fontSize: 16,
  color: '#4A5568',
  textAlign: 'center',
  marginTop: 16,
  marginBottom: 24,
  lineHeight: 24,
  fontFamily: 'System',
},

retryButton: {
  backgroundColor: '#e41c26',
  paddingHorizontal: 24,
  paddingVertical: 12,
  borderRadius: 8,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
},

retryButtonText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '600',
  textAlign: 'center',
  fontFamily: 'System',
},
resendButton: {
  marginTop: 16,
  padding: 8,
},
resendButtonDisabled: {
  opacity: 0.5,
},
resendButtonText: {
  color: '#e41c26',
  fontSize: 14,
  textAlign: 'center',
},
resendButtonTextDisabled: {
  color: '#718096',
},
drawerContent: {
  flex: 1,
  backgroundColor: '#FFFFFF',
  padding: 16,
},

drawerBody: {
  paddingVertical: 16,
},
drawerItem: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#E2E8F0',
},
drawerItemContent: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
},
drawerText: {
  fontSize: 16,
  color: '#2D3748',
  marginLeft: 12,
  flex: 1,
},
editButton: {
  padding: 8,
  borderRadius: 20,
  backgroundColor: '#F7FAFC',
},
addPhoneButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#e41c26',
  padding: 12,
  borderRadius: 8,
  marginTop: 8,
},
addPhoneButtonText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '500',
  marginLeft: 8,
},
logoutButton: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  borderTopWidth: 1,
  borderTopColor: '#E2E8F0',
  backgroundColor: '#FFFFFF',
},
logoutButtonText: {
  color: '#e41c26',
  fontSize: 16,
  fontWeight: '500',
  marginLeft: 8,
},
drawerHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:'center',
  padding: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#E2E8F0',
  position: 'relative',
},

logoutIcon: {

  padding: 8,
},

deleteAccountButton: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 12,
  backgroundColor: '#F7FAFC',
  borderTopWidth: 1,
  borderTopColor: '#E2E8F0',
  marginTop: 'auto',
},

deleteAccountButtonText: {
  marginLeft: 12,
  color: '#718096',
  fontSize: 12,
  fontWeight: '500',
},

drawerTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#2D3748',
  marginLeft: 12,
  flex: 1,
},
});