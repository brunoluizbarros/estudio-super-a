import { describe, it, expect, vi } from 'vitest';

// Funções copiadas do hook para teste
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

async function withRetry<T>(
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
      
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

function formatErrorMessage(error: any): string {
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

describe('useRetryMutation', () => {
  describe('withRetry', () => {
    it('deve retornar resultado na primeira tentativa se não houver erro', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('deve fazer retry em caso de erro 503', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Service Unavailable'))
        .mockResolvedValue('success');
      
      const result = await withRetry(mockFn, { maxRetries: 3, baseDelay: 10 });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('deve fazer retry em caso de erro 502', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('502 Bad Gateway'))
        .mockResolvedValue('success');
      
      const result = await withRetry(mockFn, { maxRetries: 3, baseDelay: 10 });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('deve lançar erro após esgotar tentativas', async () => {
      const error = new Error('Service Unavailable');
      const mockFn = vi.fn().mockRejectedValue(error);
      
      await expect(
        withRetry(mockFn, { maxRetries: 2, baseDelay: 10 })
      ).rejects.toThrow('Service Unavailable');
      
      expect(mockFn).toHaveBeenCalledTimes(3); // 1 inicial + 2 retries
    });

    it('não deve fazer retry para erros não recuperáveis', async () => {
      const error = new Error('Validation error');
      const mockFn = vi.fn().mockRejectedValue(error);
      
      await expect(
        withRetry(mockFn, { maxRetries: 3, baseDelay: 10 })
      ).rejects.toThrow('Validation error');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('formatErrorMessage', () => {
    it('deve formatar erro 503 corretamente', () => {
      const error = { message: 'Service Unavailable' };
      expect(formatErrorMessage(error)).toBe(
        'O servidor está temporariamente indisponível. Por favor, tente novamente em alguns segundos.'
      );
    });

    it('deve formatar erro 502 corretamente', () => {
      const error = { message: '502 Bad Gateway' };
      expect(formatErrorMessage(error)).toBe(
        'Erro de conexão com o servidor. Por favor, tente novamente.'
      );
    });

    it('deve formatar erro de rede corretamente', () => {
      const error = { message: 'Network error' };
      expect(formatErrorMessage(error)).toBe(
        'Erro de conexão. Verifique sua internet e tente novamente.'
      );
    });

    it('deve formatar erro de JSON inválido corretamente', () => {
      const error = { message: 'Unexpected token S' };
      expect(formatErrorMessage(error)).toBe(
        'O servidor retornou uma resposta inválida. Por favor, tente novamente.'
      );
    });

    it('deve retornar mensagem padrão para erros desconhecidos', () => {
      const error = { message: 'Unknown error' };
      expect(formatErrorMessage(error)).toBe('Unknown error');
    });

    it('deve retornar mensagem padrão quando não há mensagem', () => {
      expect(formatErrorMessage({})).toBe(
        'Ocorreu um erro inesperado. Por favor, tente novamente.'
      );
    });
  });
});
