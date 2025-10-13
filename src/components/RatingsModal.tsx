// src/components/RatingsModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';
import { formatBrazilianDateTime } from '../utils/dateFormatter';
import styles from '../styles/ratingsModalStyles';

interface RatingItem {
  id: string;
  rating: number;
  reviewComment?: string;
  reviewDate?: Date;
  customerName: string;
  orderId: string;
}

interface RatingsModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'deliveryman' | 'unit';
  itemId: string;
  itemName: string;
}

const RATINGS_PER_PAGE = 10;

const RatingStars = ({ rating }: { rating: number }) => {
  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialIcons
          key={star}
          name={star <= rating ? 'star' : star - 0.5 <= rating ? 'star-half' : 'star-border'}
          size={16}
          color="#FFD700"
          style={styles.starIcon}
        />
      ))}
    </View>
  );
};

const RatingItem = ({ item }: { item: RatingItem }) => (
  <View style={styles.ratingItem}>
    <View style={styles.ratingHeader}>
      <View style={styles.ratingInfo}>
        <RatingStars rating={item.rating} />
        <Text style={styles.ratingValue}>{item.rating.toFixed(1)}</Text>
      </View>
      <Text style={styles.ratingDate}>
        {item.reviewDate ? formatBrazilianDateTime(item.reviewDate) : 'Data não disponível'}
      </Text>
    </View>
    
    <View style={styles.customerInfo}>
      <MaterialIcons name="person" size={14} color="#666" />
      <Text style={styles.customerName}>{item.customerName}</Text>
      <Text style={styles.orderId}>#{item.orderId}</Text>
    </View>
    
    {item.reviewComment && (
      <View style={styles.commentContainer}>
        <MaterialIcons name="comment" size={14} color="#666" style={styles.commentIcon} />
        <Text style={styles.reviewComment}>{item.reviewComment}</Text>
      </View>
    )}
  </View>
);

export const RatingsModal: React.FC<RatingsModalProps> = ({
  visible,
  onClose,
  type,
  itemId,
  itemName
}) => {
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Função para buscar ratings
  const fetchRatings = async (isLoadMore = false) => {
    if (loading || (isLoadMore && loadingMore)) return;

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setRatings([]);
        setLastDoc(null);
        setHasMore(true);
      }

      // Construir query
      const ordersRef = collection(db, 'orders');
      let ratingsQuery = query(
        ordersRef,
        where('rating', '>', 0),
        where(type === 'deliveryman' ? 'deliveryMan' : 'pharmacyUnitId', '==', itemId),
        orderBy('date', 'desc'),
        limit(RATINGS_PER_PAGE)
      );

      // Se estamos carregando mais, começar após o último documento
      if (isLoadMore && lastDoc) {
        ratingsQuery = query(
          ordersRef,
          where('rating', '>', 0),
          where(type === 'deliveryman' ? 'deliveryMan' : 'pharmacyUnitId', '==', itemId),
          orderBy('date', 'desc'),
          startAfter(lastDoc),
          limit(RATINGS_PER_PAGE)
        );
      }

      const snapshot = await getDocs(ratingsQuery);
      const newRatings: RatingItem[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.rating && data.rating > 0) {
          newRatings.push({
            id: doc.id,
            rating: data.rating,
            reviewComment: data.reviewComment,
            reviewDate: data.reviewDate?.toDate(),
            customerName: data.customerName || 'Cliente não identificado',
            orderId: data.id || doc.id
          });
        }
      });

      if (isLoadMore) {
        setRatings(prev => [...prev, ...newRatings]);
      } else {
        setRatings(newRatings);
      }

      // Atualizar lastDoc e hasMore
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      setHasMore(snapshot.docs.length === RATINGS_PER_PAGE);

    } catch (error) {
      console.error('Erro ao buscar ratings:', error);
      Alert.alert('Erro', 'Não foi possível carregar as avaliações');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Carregar ratings quando o modal abrir
  useEffect(() => {
    if (visible && itemId) {
      fetchRatings();
    }
  }, [visible, itemId, type]);

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      fetchRatings(true);
    }
  };

  const renderRatingItem = ({ item }: { item: RatingItem }) => (
    <RatingItem item={item} />
  );

  const renderFooter = () => {
    if (!hasMore) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            {ratings.length === 0 ? 'Nenhuma avaliação encontrada' : 'Todas as avaliações foram carregadas'}
          </Text>
        </View>
      );
    }

    if (loadingMore) {
      return (
        <View style={styles.footerContainer}>
          <ActivityIndicator size="small" color="#FF4B2B" />
          <Text style={styles.footerText}>Carregando mais avaliações...</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={handleLoadMore}
        activeOpacity={0.7}
      >
        <Text style={styles.loadMoreText}>Ver mais avaliações</Text>
        <MaterialIcons name="keyboard-arrow-down" size={20} color="#FF4B2B" />
      </TouchableOpacity>
    );
  };

  const averageRating = ratings.length > 0 
    ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length 
    : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Avaliações</Text>
            <Text style={styles.subtitle}>{itemName}</Text>
          </View>
          
          <View style={styles.placeholder} />
        </View>

        {ratings.length > 0 && (
          <View style={styles.summaryContainer}>
            <View style={styles.averageContainer}>
              <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
              <RatingStars rating={averageRating} />
            </View>
            <Text style={styles.totalRatings}>
              {ratings.length} {ratings.length === 1 ? 'avaliação' : 'avaliações'}
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF4B2B" />
            <Text style={styles.loadingText}>Carregando avaliações...</Text>
          </View>
        ) : (
          <FlatList
            data={ratings}
            keyExtractor={(item) => item.id}
            renderItem={renderRatingItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={renderFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
          />
        )}
      </View>
    </Modal>
  );
};

export default RatingsModal;