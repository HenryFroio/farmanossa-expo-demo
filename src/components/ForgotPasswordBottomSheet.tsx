import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.5;
const DRAG_THRESHOLD = 50;

interface ForgotPasswordBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

const ForgotPasswordBottomSheet: React.FC<ForgotPasswordBottomSheetProps> = ({
  visible,
  onClose,
}) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const animatedValue = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const lastGestureValue = useRef(SCREEN_HEIGHT);
  
  // Nova referência para a opacidade do backdrop
  const backdropOpacity = animatedValue.interpolate({
    inputRange: [0, BOTTOM_SHEET_HEIGHT],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newValue = lastGestureValue.current + gestureState.dy;
        if (newValue >= 0) {
          animatedValue.setValue(newValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DRAG_THRESHOLD) {
          closeBottomSheet();
        } else {
          openBottomSheet();
        }
      },
    })
  ).current;

  const openBottomSheet = () => {
    lastGestureValue.current = 0;
    Animated.spring(animatedValue, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const closeBottomSheet = () => {
    lastGestureValue.current = SCREEN_HEIGHT;
    Animated.spring(animatedValue, {
      toValue: SCREEN_HEIGHT,
      useNativeDriver: true,
      bounciness: 4,
    }).start(() => {
      onClose();
      setEmail('');
    });
  };

  useEffect(() => {
    if (visible) {
      openBottomSheet();
    } else {
      closeBottomSheet();
    }
  }, [visible]);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Por favor, insira seu email');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email);
      Alert.alert(
        'Email enviado',
        'Verifique sua caixa de entrada para redefinir sua senha',
        [{ text: 'OK', onPress: closeBottomSheet }]
      );
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View 
        style={[
          styles.backdrop,
          { opacity: backdropOpacity }
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={closeBottomSheet}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            transform: [{ translateY: animatedValue }],
          },
        ]}
      >
        <View style={styles.dragIndicatorContainer} {...panResponder.panHandlers}>
          <View style={styles.dragIndicator} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Recuperar senha</Text>
          <Text style={styles.subtitle}>
            Digite seu email para receber um link de recuperação de senha
          </Text>

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons
              name="email-outline"
              size={20}
              color="#718096"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Seu email"
              placeholderTextColor="#718096"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionButtonText}>Enviar</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: -BOTTOM_SHEET_HEIGHT * 0.1,
    left: 0,
    right: 0,
    height: BOTTOM_SHEET_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  dragIndicatorContainer: {
    width: '100%',
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E0',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    height: 56,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
  },
  actionButton: {
    backgroundColor: '#e41c26',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#e41c2680',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ForgotPasswordBottomSheet;