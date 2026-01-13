import { useState, useCallback } from 'react';

interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

/**
 * Executa uma função com retry e backoff exponencial
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay } = { ...DEFAULT_CONFIG, ...config };
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Verificar se é um erro recuperável (503, 502, 504, network error)
      const isRetryable = 
        error?.message?.includes('Service Unavailable') ||
        error?.message?.includes('503') ||
        error?.message?.includes('502') ||
        error?.message?.includes('504') ||
        error?.message?.includes('Network') ||
        error?.message?.includes('fetch') ||
        error?.data?.httpStatus === 503 ||
        error?.data?.httpStatus === 502 ||
        error?.data?.httpStatus === 504;
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Calcular delay com backoff exponencial
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      console.log(`[Retry] Tentativa ${attempt + 1}/${maxRetries} falhou, aguardando ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Hook para gerenciar estado de retry
 */
export function useRetryState() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const executeWithRetry = useCallback(async <T>(
    fn: () => Promise<T>,
    config: RetryConfig = {}
  ): Promise<T> => {
    setIsRetrying(true);
    setRetryCount(0);
    
    const { maxRetries, baseDelay, maxDelay } = { ...DEFAULT_CONFIG, ...config };
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        setIsRetrying(false);
        return result;
      } catch (error: any) {
        lastError = error;
        setRetryCount(attempt + 1);
        
        // Verificar se é um erro recuperável
        const isRetryable = 
          error?.message?.includes('Service Unavailable') ||
          error?.message?.includes('503') ||
          error?.message?.includes('502') ||
          error?.message?.includes('504') ||
          error?.message?.includes('Network') ||
          error?.message?.includes('fetch') ||
          error?.data?.httpStatus === 503 ||
          error?.data?.httpStatus === 502 ||
          error?.data?.httpStatus === 504;
        
        if (!isRetryable || attempt === maxRetries) {
          setIsRetrying(false);
          throw error;
        }
        
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    setIsRetrying(false);
    throw lastError;
  }, []);
  
  return { isRetrying, retryCount, executeWithRetry };
}

/**
 * Formata mensagem de erro amigável
 */
export function formatErrorMessage(error: any): string {
  if (error?.message?.includes('Service Unavailable') || 
      error?.message?.includes('503') ||
      error?.data?.httpStatus === 503) {
    return 'O servidor está temporariamente indisponível. Por favor, tente novamente em alguns segundos.';
  }
  
  if (error?.message?.includes('502') || error?.data?.httpStatus === 502) {
    return 'Erro de conexão com o servidor. Por favor, tente novamente.';
  }
  
  if (error?.message?.includes('504') || error?.data?.httpStatus === 504) {
    return 'O servidor demorou muito para responder. Por favor, tente novamente.';
  }
  
  if (error?.message?.includes('Network') || error?.message?.includes('fetch')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  
  if (error?.message?.includes('Unexpected token')) {
    return 'O servidor retornou uma resposta inválida. Por favor, tente novamente.';
  }
  
  return error?.message || 'Ocorreu um erro inesperado. Por favor, tente novamente.';
}
