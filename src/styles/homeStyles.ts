import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Definindo a nova paleta de cores
export  const colors = {
  primary: '#ff131f',
  primaryDark: '#cc0f19',
  primaryLight: '#ff4d56',
  background: '#1a0305',
  text: '#ffffff',
  buttonText: '#ffffff',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 40,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 250,
  },
  iconContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  icon: {
    width: 40,
    height: 40,
    tintColor: colors.text,
  },
  bottomWave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default styles;