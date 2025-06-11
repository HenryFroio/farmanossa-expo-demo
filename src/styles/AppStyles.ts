import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  rootView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  debugButton: {
    position: 'absolute',
    bottom: 20,
    right: 30,
    alignSelf: 'center',
    opacity: 0.05,
    width: 15,
    height: 15,
    backgroundColor: '#e41c26', // Usando a cor primary do seu tema
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
});