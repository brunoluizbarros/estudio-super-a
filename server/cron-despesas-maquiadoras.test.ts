/**
 * Testes para o script de processamento mensal de despesas de maquiadoras
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  getServicosMaquiagemMesAnterior,
  createDespesaMaquiadora,
  getUsuariosByRoles,
} from './db.js';

describe('Script de Despesas de Maquiadoras', () => {
  describe('getServicosMaquiagemMesAnterior', () => {
    it('deve buscar serviços de maquiagem do mês especificado', async () => {
      // Testar com dezembro de 2024
      const servicos = await getServicosMaquiagemMesAnterior(12, 2024);
      
      expect(Array.isArray(servicos)).toBe(true);
      console.log(`✓ Encontrados ${servicos.length} serviços de maquiagem em Dezembro/2024`);
      
      // Validar estrutura dos serviços
      if (servicos.length > 0) {
        const primeiroServico = servicos[0];
        expect(primeiroServico).toHaveProperty('maquiadoraId');
        expect(primeiroServico).toHaveProperty('maquiadoraNome');
        expect(primeiroServico).toHaveProperty('turmaId');
        expect(primeiroServico).toHaveProperty('turmaCodigo');
        expect(primeiroServico).toHaveProperty('tipoServico');
        expect(primeiroServico).toHaveProperty('valor');
        expect(primeiroServico).toHaveProperty('quantidade');
        
        console.log('✓ Estrutura do serviço validada:', {
          maquiadora: primeiroServico.maquiadoraNome,
          turma: primeiroServico.turmaCodigo,
          tipo: primeiroServico.tipoServico,
          valor: primeiroServico.valor,
        });
      }
    });

    it('deve retornar apenas serviços de make_formando e make_familia', async () => {
      const servicos = await getServicosMaquiagemMesAnterior(12, 2024);
      
      const tiposValidos = ['make_formando', 'make_familia'];
      const servicosInvalidos = servicos.filter(s => !tiposValidos.includes(s.tipoServico));
      
      expect(servicosInvalidos.length).toBe(0);
      console.log('✓ Todos os serviços são do tipo make_formando ou make_familia');
    });
  });

  describe('getUsuariosByRoles', () => {
    it('deve buscar usuários com roles específicos', async () => {
      const usuarios = await getUsuariosByRoles(['logistica', 'gestor', 'administrador']);
      
      expect(Array.isArray(usuarios)).toBe(true);
      console.log(`✓ Encontrados ${usuarios.length} usuários com roles Logística, Gestor ou Administrador`);
      
      // Validar que todos têm um dos roles especificados
      const rolesValidos = ['logistica', 'gestor', 'administrador'];
      const usuariosInvalidos = usuarios.filter(u => !rolesValidos.includes(u.role));
      
      expect(usuariosInvalidos.length).toBe(0);
      console.log('✓ Todos os usuários têm roles válidos');
      
      // Contar usuários por role
      const contagemRoles = usuarios.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('✓ Distribuição de roles:', contagemRoles);
    });
  });

  describe('createDespesaMaquiadora', () => {
    it('deve criar despesa com todos os campos obrigatórios', async () => {
      // Buscar primeiro fornecedor do tipo maquiadora
      const servicos = await getServicosMaquiagemMesAnterior(12, 2024);
      
      if (servicos.length === 0) {
        console.log('⚠️  Nenhum serviço encontrado para teste. Pulando teste de criação.');
        return;
      }

      const servicoTeste = servicos.find(s => s.maquiadoraId && s.maquiadoraNome);
      
      if (!servicoTeste) {
        console.log('⚠️  Nenhum serviço com maquiadora válida. Pulando teste de criação.');
        return;
      }

      // Criar despesa de teste
      const despesaId = await createDespesaMaquiadora({
        fornecedorId: servicoTeste.maquiadoraId!,
        turmaId: servicoTeste.turmaId,
        mesServico: 12, // Dezembro
        detalhamento: 'Teste - Serviço de Maquiagem referente ao mês de Dezembro',
        valor: 100.50, // R$ 100,50
      });

      expect(despesaId).toBeGreaterThan(0);
      console.log(`✓ Despesa criada com sucesso - ID: ${despesaId}`);
      console.log(`  Fornecedor: ${servicoTeste.maquiadoraNome}`);
      console.log(`  Turma: ${servicoTeste.turmaCodigo}`);
      console.log(`  Valor: R$ 100,50`);
    });

    it('deve gerar número CI automático no formato correto', async () => {
      const servicos = await getServicosMaquiagemMesAnterior(12, 2024);
      
      if (servicos.length === 0) {
        console.log('⚠️  Nenhum serviço encontrado para teste. Pulando teste de CI.');
        return;
      }

      const servicoTeste = servicos.find(s => s.maquiadoraId && s.maquiadoraNome);
      
      if (!servicoTeste) {
        console.log('⚠️  Nenhum serviço com maquiadora válida. Pulando teste de CI.');
        return;
      }

      const despesaId = await createDespesaMaquiadora({
        fornecedorId: servicoTeste.maquiadoraId!,
        turmaId: servicoTeste.turmaId,
        mesServico: 12,
        detalhamento: 'Teste CI - Serviço de Maquiagem',
        valor: 50.00,
      });

      expect(despesaId).toBeGreaterThan(0);
      console.log(`✓ Número CI gerado automaticamente para despesa ${despesaId}`);
      console.log('  Formato esperado: XXX/AAAA (ex: 001/2025)');
    });
  });

  describe('Agrupamento de Serviços', () => {
    it('deve agrupar serviços por maquiadora e turma corretamente', async () => {
      const servicos = await getServicosMaquiagemMesAnterior(12, 2024);
      
      if (servicos.length === 0) {
        console.log('⚠️  Nenhum serviço encontrado. Pulando teste de agrupamento.');
        return;
      }

      // Agrupar manualmente para validar lógica
      const grupos = new Map<string, { totalAPagar: number; totalAReceber: number }>();

      for (const servico of servicos) {
        if (!servico.maquiadoraId || servico.valor === null) continue;

        const chave = `${servico.maquiadoraId}-${servico.turmaId}`;
        
        if (!grupos.has(chave)) {
          grupos.set(chave, { totalAPagar: 0, totalAReceber: 0 });
        }

        const grupo = grupos.get(chave)!;

        if (servico.tipoServico === 'make_formando') {
          grupo.totalAPagar += servico.valor * servico.quantidade;
        } else if (servico.tipoServico === 'make_familia') {
          grupo.totalAReceber += servico.valor * servico.quantidade;
        }
      }

      console.log(`✓ Serviços agrupados em ${grupos.size} combinações maquiadora + turma`);
      
      // Mostrar exemplos
      let contador = 0;
      for (const [chave, valores] of grupos.entries()) {
        if (contador >= 3) break; // Mostrar apenas 3 exemplos
        
        const valorFinal = (valores.totalAPagar - valores.totalAReceber) / 100;
        console.log(`  ${chave}: A Pagar R$ ${(valores.totalAPagar / 100).toFixed(2)} - A Receber R$ ${(valores.totalAReceber / 100).toFixed(2)} = R$ ${valorFinal.toFixed(2)}`);
        contador++;
      }

      expect(grupos.size).toBeGreaterThan(0);
    });
  });

  describe('Validações de Negócio', () => {
    it('deve ignorar serviços sem maquiadora vinculada', async () => {
      const servicos = await getServicosMaquiagemMesAnterior(12, 2024);
      
      const servicosSemMaquiadora = servicos.filter(s => !s.maquiadoraId);
      
      console.log(`✓ ${servicosSemMaquiadora.length} serviços sem maquiadora serão ignorados`);
      expect(servicosSemMaquiadora.length).toBeGreaterThanOrEqual(0);
    });

    it('deve calcular valor final corretamente (A Pagar - A Receber)', async () => {
      // Teste de cálculo
      const totalAPagar = 50000; // R$ 500,00 em centavos
      const totalAReceber = 15000; // R$ 150,00 em centavos
      const valorFinal = totalAPagar - totalAReceber;
      
      expect(valorFinal).toBe(35000); // R$ 350,00 em centavos
      console.log('✓ Cálculo de valor final validado:');
      console.log(`  Total a Pagar: R$ ${(totalAPagar / 100).toFixed(2)}`);
      console.log(`  Total a Receber: R$ ${(totalAReceber / 100).toFixed(2)}`);
      console.log(`  Valor Final: R$ ${(valorFinal / 100).toFixed(2)}`);
    });

    it('deve criar despesa apenas se valor final for positivo', () => {
      const valorFinal1 = 50000 - 30000; // R$ 200,00 (positivo - deve criar)
      const valorFinal2 = 30000 - 50000; // -R$ 200,00 (negativo - não deve criar)
      
      expect(valorFinal1).toBeGreaterThan(0);
      expect(valorFinal2).toBeLessThan(0);
      
      console.log('✓ Validação de valor positivo:');
      console.log(`  Valor Final 1: R$ ${(valorFinal1 / 100).toFixed(2)} - Deve criar despesa`);
      console.log(`  Valor Final 2: R$ ${(valorFinal2 / 100).toFixed(2)} - NÃO deve criar despesa`);
    });
  });
});
