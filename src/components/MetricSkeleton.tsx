import React from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { StyleSheet } from 'react-native';

interface MetricSkeletonProps {
  height?: number;
  showTitle?: boolean;
  titleWidth?: number;
  showChart?: boolean;
}

const MetricSkeleton: React.FC<MetricSkeletonProps> = ({ 
  height = 200, 
  showTitle = true, 
  titleWidth = 150,
  showChart = false 
}) => {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const shimmer = () => {
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]).start(() => shimmer());
    };
    shimmer();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.container, { minHeight: height }]}>
      {showTitle && (
        <Animated.View style={[
          styles.titleSkeleton, 
          { width: titleWidth, opacity }
        ]} />
      )}
      
      <View style={styles.content}>
        {showChart ? (
          <Animated.View style={[styles.chartSkeleton, { opacity }]} />
        ) : (
          <View style={styles.listContainer}>
            {[1, 2, 3].map((item) => (
              <Animated.View key={item} style={[styles.listItem, { opacity }]}>
                <Animated.View style={[styles.listItemLeft, { opacity }]} />
                <Animated.View style={[styles.listItemRight, { opacity }]} />
              </Animated.View>
            ))}
          </View>
        )}
      </View>
      
      <View style={styles.loadingIndicator}>
        <View style={styles.loadingDot} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  titleSkeleton: {
    height: 20,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 16,
  },
  content: {
    flex: 1,
    marginBottom: 12,
  },
  chartSkeleton: {
    height: 120,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    marginVertical: 8,
  },
  listContainer: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  listItemLeft: {
    height: 16,
    width: '60%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  listItemRight: {
    height: 16,
    width: '25%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  loadingDot: {
    width: 8,
    height: 8,
    backgroundColor: '#e41c26',
    borderRadius: 4,
    marginRight: 6,
  },
  loadingText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
});

export default MetricSkeleton;
