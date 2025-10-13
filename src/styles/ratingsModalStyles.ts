// src/styles/ratingsModalStyles.ts
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: 50, // Para dar espaço para a status bar
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  titleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  placeholder: {
    width: 40, // Para balancear o close button
  },
  summaryContainer: {
    backgroundColor: 'white',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  averageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  averageRating: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF4B2B',
    marginRight: 12,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    marginHorizontal: 1,
  },
  totalRatings: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    paddingVertical: 8,
  },
  ratingItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  ratingDate: {
    fontSize: 12,
    color: '#999',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  orderId: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    flex: 1,
    fontStyle: 'italic',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF4B2B',
  },
  footerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF4B2B',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadMoreText: {
    fontSize: 16,
    color: '#FF4B2B',
    fontWeight: '600',
    marginRight: 8,
  },
});