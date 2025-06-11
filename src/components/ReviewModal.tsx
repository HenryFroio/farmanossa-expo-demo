import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Keyboard,
} from 'react-native';
import { 
  Star, 
  StarOff, 
  X, 
  Heart, 
  Copy 
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { getFirestore, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { styles } from '../styles/reviewModalStyles';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  deliveryManId: string;
  deliveryManName: string;
  onSubmitReview: (data: {
    orderId: string;
    rating: number;
    comment: string;
  }) => Promise<void>;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  visible,
  onClose,
  orderId,
  deliveryManId,
  deliveryManName,
  onSubmitReview,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [pixKey, setPixKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPix, setShowPix] = useState(false);

  const db = getFirestore();

  useEffect(() => {
    const fetchPixKey = async () => {
      try {
        const deliverymanRef = doc(db, 'deliverymen', deliveryManId);
        const deliverymanSnap = await getDoc(deliverymanRef);

        if (deliverymanSnap.exists()) {
          const data = deliverymanSnap.data();
          setPixKey(data?.chavePix || null);
        }
      } catch (error) {
        console.error('Erro ao buscar chave PIX:', error);
      }
    };

    if (visible && deliveryManId) {
      fetchPixKey();
    }
  }, [deliveryManId, visible, db]);

  const handleClose = async () => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        reviewRequested: true,
        updatedAt: serverTimestamp(),
      });
      
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar status de review:', error);
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Avaliação necessária', 'Por favor, selecione uma classificação em estrelas.');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmitReview({
        orderId,
        rating,
        comment,
      });
      handleClose();
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      Alert.alert('Erro', 'Não foi possível enviar sua avaliação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyPixKey = async () => {
    if (pixKey) {
      await Clipboard.setStringAsync(pixKey);
      Alert.alert('Chave PIX copiada!', 'A chave PIX foi copiada para sua área de transferência.');
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    // Check if the enter key was pressed
    if (e.nativeEvent.key === 'Enter') {
      // If shift key is not pressed, dismiss keyboard
      if (!e.nativeEvent.shiftKey) {
        e.preventDefault?.();
        Keyboard.dismiss();
        return;
      }
      // If shift key is pressed, allow new line (default behavior)
    }
  };

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity
        key={star}
        onPress={() => setRating(star)}
        style={styles.starButton}
      >
        {rating >= star ? (
          <Star size={32} color="#FFD700" />
        ) : (
          <StarOff size={32} color="#718096" />
        )}
      </TouchableOpacity>
    ));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Como foi sua entrega?</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#718096" />
            </TouchableOpacity>
          </View>

          <Text style={styles.deliveryManName}>
            Entregador: {deliveryManName}
          </Text>

          <View style={styles.starsContainer}>
            {renderStars()}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Deixe um comentário (opcional)"
            placeholderTextColor="#718096"
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
            onKeyPress={handleKeyPress}
            blurOnSubmit={false}
            returnKeyType="default"
          />

          {!showPix ? (
            <TouchableOpacity
              style={styles.tipButton}
              onPress={() => setShowPix(true)}
            >
              <Heart size={24} color="#e41c26" />
              <Text style={styles.tipButtonText}>
                Gostou do serviço? Deixe uma gorjeta!
              </Text>
            </TouchableOpacity>
          ) : pixKey ? (
            <View style={styles.pixContainer}>
              <Text style={styles.pixTitle}>Chave PIX do entregador:</Text>
              <View style={styles.pixKeyContainer}>
                <Text style={styles.pixKey}>{pixKey}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={copyPixKey}
                >
                  <Copy size={20} color="#4299E1" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text>
              Chave PIX não disponível para este entregador.
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              isLoading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Enviar avaliação</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ReviewModal;