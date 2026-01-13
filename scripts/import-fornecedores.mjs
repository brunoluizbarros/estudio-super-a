#!/usr/bin/env node
/**
 * Script para importar fornecedores do arquivo JSON para o banco de dados.
 * Executa via Node.js usando conexão direta com o banco.
 */
import mysql from 'mysql2/promise';
import fs from 'fs';

// Ler arquivo JSON
const fornecedoresData = JSON.parse(fs.readFileSync('/home/ubuntu/fornecedores_import.json', 'utf-8'));

// Mapeamento de tipos de serviço para IDs (baseado nos dados do banco)
const tiposServicoMap = {
  'Alimento e Bebida (A&B)': 1,
  'Equipamentos / Utensílios /Bens': 2,
  'Gráfica (Impressos / Brindes)': 3,
  'Hospedagem': 4,
  'Locação de Equipamentos Fotográficos': 5,
  'Locação de Espaço': 6,
  'Locação de Estruturas': 7,
  'Manutenção Equipamentos': 8,
  'Mão de Obra - Administrativo': 9,
  'Mão de Obra - Cerimonial': 10,
  'Mão de Obra - Coordenação': 11,
  'Mão de Obra - Fotógrafo': 12,
  'Mão de Obra - Maquiagem': 13,
  'Mão de Obra - Produção': 14,
};

async function main() {
  // Conectar ao banco
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'gateway01.us-west-2.prod.aws.tidbcloud.com',
    port: parseInt(process.env.DB_PORT || '4000'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: true }
  });

  console.log('Conectado ao banco de dados');

  // Primeiro, buscar os tipos de serviço existentes para mapear corretamente
  const [tiposServico] = await connection.execute('SELECT id, nome FROM tipos_servico');
  const tipoServicoIdMap = {};
  for (const tipo of tiposServico) {
    tipoServicoIdMap[tipo.nome] = tipo.id;
  }
  console.log('Tipos de serviço encontrados:', Object.keys(tipoServicoIdMap).length);

  let importados = 0;
  let erros = 0;

  for (const fornecedor of fornecedoresData) {
    try {
      // Mapear tipos de serviço para IDs
      const tiposServicoIds = fornecedor.tiposServico
        .map(nome => tipoServicoIdMap[nome])
        .filter(id => id !== undefined);

      // Preparar dados
      const tipoPessoa = fornecedor.tipoPessoa || null;
      const cpfCnpj = fornecedor.cpfCnpj || null;
      const nome = fornecedor.nome;
      const tiposServicoJson = JSON.stringify(tiposServicoIds);
      const chavesPix = fornecedor.chavesPix || [];
      const chavesPixJson = JSON.stringify(chavesPix);
      const pixPrincipal = chavesPix[0] || null;

      // Verificar se já existe
      const [existing] = await connection.execute(
        'SELECT id FROM fornecedores WHERE nome = ?',
        [nome]
      );

      if (existing.length > 0) {
        // Atualizar existente
        await connection.execute(
          `UPDATE fornecedores SET 
            tipoPessoa = COALESCE(?, tipoPessoa),
            cpfCnpj = COALESCE(?, cpfCnpj),
            tiposServico = ?,
            pix = COALESCE(?, pix),
            chavesPix = ?
          WHERE nome = ?`,
          [tipoPessoa, cpfCnpj, tiposServicoJson, pixPrincipal, chavesPixJson, nome]
        );
        console.log(`Atualizado: ${nome}`);
      } else {
        // Inserir novo
        await connection.execute(
          `INSERT INTO fornecedores (tipoPessoa, cpfCnpj, nome, tiposServico, pix, chavesPix, ativo)
          VALUES (?, ?, ?, ?, ?, ?, true)`,
          [tipoPessoa, cpfCnpj, nome, tiposServicoJson, pixPrincipal, chavesPixJson]
        );
        console.log(`Inserido: ${nome}`);
      }
      importados++;
    } catch (error) {
      console.error(`Erro ao importar ${fornecedor.nome}:`, error.message);
      erros++;
    }
  }

  console.log(`\nImportação concluída!`);
  console.log(`Total importados: ${importados}`);
  console.log(`Total erros: ${erros}`);

  await connection.end();
}

main().catch(console.error);
