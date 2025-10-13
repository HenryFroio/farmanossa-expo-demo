import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.9;

const colors = {
  primary: '#e41c26',
  primaryLight: '#ff4d54',
  primaryDark: '#b81219',
  secondary: '#ff6b00',
  background: '#FFFFFF',
  drawerBackground: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#2D3748',
  textLight: '#718096',
  border: '#E2E8F0',
  success: '#48BB78',
  shadow: '#000',
};

const shadows = {
  drawer: {
    shadowColor: colors.shadow,
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
  },
  button: {
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  }
};

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },  contentContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
  },
  buttonContainer: {
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...shadows.button,
  },
  activeButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    marginLeft: 12,
    fontWeight: '600',
    color: colors.text,
    fontSize: 16,
  },
  activeButtonText: {
    color: colors.background,
  },
  selectionModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    ...shadows.button,
  },
  modeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
  },
  activeModeButton: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  activeModeButtonText: {
    color: colors.background,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  searchButton: {
    backgroundColor: '#FF4B2B',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },  searchIcon: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
    color: colors.textLight,
  },
  searchResultsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginTop: 10,
    ...shadows.button,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedItem: {
    backgroundColor: `${colors.secondary}10`,
  },
  searchResultText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  selectedItemText: {
    color: colors.primary,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 12,
    margin: 20,
    ...shadows.button,
  },
  
  confirmButtonText: {
    color: colors.background,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default styles;