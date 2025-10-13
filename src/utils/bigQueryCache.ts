/**
 * BigQuery API Cache Layer
 * 
 * Implementa cache em 3 níveis:
 * 1. Memory Cache (React State) - 0ms, volátil
 * 2. AsyncStorage - ~50ms, persistente entre sessões
 * 3. BigQuery API - ~800ms, sempre atualizado
 * 
 * Estratégia: Stale-While-Revalidate
 * - Retorna cache imediatamente (se disponível)
 * - Revalida em background
 * - Atualiza UI quando dados frescos chegarem
 * 
 * TTL: 5 minutos para dados de 'today', 30 minutos para períodos passados
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache TTL (Time To Live)
const CACHE_TTL = {
  today: 5 * 60 * 1000,      // 5 minutos
  week: 15 * 60 * 1000,      // 15 minutos
  month: 30 * 60 * 1000,     // 30 minutos
  all: 60 * 60 * 1000,       // 1 hora
};

// Memory cache (in-memory para ultra performance)
const memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

/**
 * Generate cache key
 */
const getCacheKey = (endpoint: string, params: Record<string, any>): string => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `bigquery:${endpoint}:${sortedParams}`;
};

/**
 * Get TTL based on period
 */
const getTTL = (period: string): number => {
  switch (period) {
    case 'today':
      return CACHE_TTL.today;
    case 'week':
      return CACHE_TTL.week;
    case 'month':
      return CACHE_TTL.month;
    default:
      return CACHE_TTL.all;
  }
};

/**
 * Check if cached data is still valid
 */
const isCacheValid = (timestamp: number, ttl: number): boolean => {
  return Date.now() - timestamp < ttl;
};

/**
 * Get from memory cache
 */
const getFromMemoryCache = (key: string): any | null => {
  const cached = memoryCache.get(key);
  if (!cached) return null;

  if (isCacheValid(cached.timestamp, cached.ttl)) {
    console.log(`✅ [Cache] Memory HIT: ${key} (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
    return cached.data;
  }

  // Remove expired cache
  memoryCache.delete(key);
  console.log(`⏰ [Cache] Memory EXPIRED: ${key}`);
  return null;
};

/**
 * Set to memory cache
 */
const setToMemoryCache = (key: string, data: any, ttl: number): void => {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
  console.log(`💾 [Cache] Memory SET: ${key} (TTL: ${ttl / 1000}s)`);
};

/**
 * Get from AsyncStorage
 */
const getFromAsyncStorage = async (key: string): Promise<any | null> => {
  try {
    const startTime = Date.now();
    const cached = await AsyncStorage.getItem(key);
    const readTime = Date.now() - startTime;

    if (!cached) {
      console.log(`❌ [Cache] AsyncStorage MISS: ${key}`);
      return null;
    }

    const parsed = JSON.parse(cached);
    
    if (isCacheValid(parsed.timestamp, parsed.ttl)) {
      console.log(`✅ [Cache] AsyncStorage HIT: ${key} (age: ${Math.round((Date.now() - parsed.timestamp) / 1000)}s, read: ${readTime}ms)`);
      
      // Promote to memory cache
      setToMemoryCache(key, parsed.data, parsed.ttl);
      
      return parsed.data;
    }

    // Remove expired cache
    await AsyncStorage.removeItem(key);
    console.log(`⏰ [Cache] AsyncStorage EXPIRED: ${key}`);
    return null;
  } catch (error) {
    console.error(`❌ [Cache] AsyncStorage read error:`, error);
    return null;
  }
};

/**
 * Set to AsyncStorage
 */
const setToAsyncStorage = async (key: string, data: any, ttl: number): Promise<void> => {
  try {
    const startTime = Date.now();
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    const writeTime = Date.now() - startTime;
    
    console.log(`💾 [Cache] AsyncStorage SET: ${key} (TTL: ${ttl / 1000}s, write: ${writeTime}ms)`);
    
    // Also set to memory cache
    setToMemoryCache(key, data, ttl);
  } catch (error) {
    console.error(`❌ [Cache] AsyncStorage write error:`, error);
  }
};

/**
 * Clear all BigQuery cache (useful for force refresh)
 */
export const clearBigQueryCache = async (): Promise<void> => {
  try {
    console.log(`🧹 [Cache] Clearing all cache...`);
    
    // Clear memory cache
    memoryCache.clear();
    
    // Clear AsyncStorage cache
    const allKeys = await AsyncStorage.getAllKeys();
    const bigQueryKeys = allKeys.filter(key => key.startsWith('bigquery:'));
    await AsyncStorage.multiRemove(bigQueryKeys);
    
    console.log(`✅ [Cache] Cleared ${bigQueryKeys.length} cached entries`);
  } catch (error) {
    console.error(`❌ [Cache] Clear error:`, error);
  }
};

/**
 * Clear cache for specific endpoint
 */
export const clearCacheForEndpoint = async (endpoint: string): Promise<void> => {
  try {
    console.log(`🧹 [Cache] Clearing cache for endpoint: ${endpoint}`);
    
    // Clear memory cache
    for (const [key] of memoryCache.entries()) {
      if (key.includes(endpoint)) {
        memoryCache.delete(key);
      }
    }
    
    // Clear AsyncStorage cache
    const allKeys = await AsyncStorage.getAllKeys();
    const endpointKeys = allKeys.filter(key => key.includes(endpoint));
    await AsyncStorage.multiRemove(endpointKeys);
    
    console.log(`✅ [Cache] Cleared ${endpointKeys.length} cached entries for ${endpoint}`);
  } catch (error) {
    console.error(`❌ [Cache] Clear endpoint error:`, error);
  }
};

/**
 * Fetch with cache
 * 
 * Stale-While-Revalidate strategy:
 * 1. Check memory cache → return immediately if valid
 * 2. Check AsyncStorage → return immediately if valid, revalidate in background
 * 3. Fetch from API → cache and return
 */
export const fetchWithCache = async <T>(
  endpoint: string,
  params: Record<string, any>,
  fetchFn: () => Promise<T>,
  options?: {
    skipCache?: boolean;
    onRevalidate?: (data: T) => void;
  }
): Promise<T> => {
  const cacheKey = getCacheKey(endpoint, params);
  const ttl = getTTL(params.period || 'today');

  // Skip cache if requested
  if (options?.skipCache) {
    console.log(`⏭️ [Cache] SKIP: ${cacheKey}`);
    const data = await fetchFn();
    await setToAsyncStorage(cacheKey, data, ttl);
    return data;
  }

  // 1. Try memory cache (instant)
  const memoryData = getFromMemoryCache(cacheKey);
  if (memoryData) {
    // Revalidate in background for 'today' period
    if (params.period === 'today') {
      console.log(`🔄 [Cache] Background revalidation started for: ${cacheKey}`);
      fetchFn()
        .then(freshData => {
          setToAsyncStorage(cacheKey, freshData, ttl);
          if (options?.onRevalidate) {
            options.onRevalidate(freshData);
          }
        })
        .catch(error => {
          console.error(`❌ [Cache] Background revalidation failed:`, error);
        });
    }
    return memoryData;
  }

  // 2. Try AsyncStorage (fast ~50ms)
  const asyncData = await getFromAsyncStorage(cacheKey);
  if (asyncData) {
    // Revalidate in background for 'today' period
    if (params.period === 'today') {
      console.log(`🔄 [Cache] Background revalidation started for: ${cacheKey}`);
      fetchFn()
        .then(freshData => {
          setToAsyncStorage(cacheKey, freshData, ttl);
          if (options?.onRevalidate) {
            options.onRevalidate(freshData);
          }
        })
        .catch(error => {
          console.error(`❌ [Cache] Background revalidation failed:`, error);
        });
    }
    return asyncData;
  }

  // 3. Fetch from API (slow ~800ms)
  console.log(`🌐 [Cache] API FETCH: ${cacheKey}`);
  const startTime = Date.now();
  const data = await fetchFn();
  const fetchTime = Date.now() - startTime;
  console.log(`✅ [Cache] API fetched in ${fetchTime}ms: ${cacheKey}`);
  
  // Cache the result
  await setToAsyncStorage(cacheKey, data, ttl);
  
  return data;
};

/**
 * Prefetch data (useful for warming up cache)
 */
export const prefetchBigQueryData = async (
  endpoint: string,
  params: Record<string, any>,
  fetchFn: () => Promise<any>
): Promise<void> => {
  try {
    console.log(`🔥 [Cache] Prefetching: ${endpoint}`, params);
    await fetchWithCache(endpoint, params, fetchFn, { skipCache: false });
  } catch (error) {
    console.error(`❌ [Cache] Prefetch error:`, error);
  }
};

/**
 * Get cache statistics (useful for debugging)
 */
export const getCacheStats = async (): Promise<{
  memorySize: number;
  asyncStorageSize: number;
  totalKeys: number;
}> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const bigQueryKeys = allKeys.filter(key => key.startsWith('bigquery:'));
    
    return {
      memorySize: memoryCache.size,
      asyncStorageSize: bigQueryKeys.length,
      totalKeys: memoryCache.size + bigQueryKeys.length,
    };
  } catch (error) {
    console.error(`❌ [Cache] Stats error:`, error);
    return { memorySize: 0, asyncStorageSize: 0, totalKeys: 0 };
  }
};
