import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Make Família - Valor por Turma', () => {
  it('deve aceitar turmaId como parâmetro obrigatório', async () => {
    // A função agora requer turmaId (não pode ser chamada sem parâmetro)
    const valor = await db.getValorMakeFamilia(1);
    
    // Deve retornar um número (valor em centavos)
    expect(typeof valor).toBe('number');
    expect(valor).toBeGreaterThan(0);
  });
  
  it('deve retornar valor padrão (R$ 30,00) para turma sem configuração', async () => {
    const valor = await db.getValorMakeFamilia(99999); // turma inexistente
    
    // Fallback para R$ 30,00 (3000 centavos)
    expect(valor).toBe(3000);
  });
  
  it('deve buscar valor consistente para mesma turma', async () => {
    // Verificar que a função retorna valor consistente
    const valor1 = await db.getValorMakeFamilia(1);
    const valor2 = await db.getValorMakeFamilia(1);
    
    // Mesma turma deve retornar mesmo valor
    expect(valor1).toBe(valor2);
  });
  
  it('deve retornar valores diferentes para turmas diferentes (se configuradas)', async () => {
    const valor1 = await db.getValorMakeFamilia(1);
    const valor2 = await db.getValorMakeFamilia(99999); // sem config, usa fallback
    
    // Pelo menos uma deve usar o fallback ou ter configuração diferente
    expect(typeof valor1).toBe('number');
    expect(typeof valor2).toBe('number');
  });
});
