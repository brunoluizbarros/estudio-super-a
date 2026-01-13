/**
 * Helper para processamento de extratos bancários
 * Processa extratos do Itaú (Entrada/Saída) e Rede para Fechamento Mensal
 */

import * as XLSX from 'xlsx';

export interface ResultadoProcessamento {
  sucesso: boolean;
  valor: number;
  detalhes?: any;
  erro?: string;
}

/**
 * Processa extrato Itaú Entrada
 * Identifica: CARTÕES, PIX, RENDIMENTO
 */
export function processarExtratoItauEntrada(
  buffer: Buffer,
  tipo: 'cartoes' | 'pix' | 'rendimento',
  mes: number,
  ano: number
): ResultadoProcessamento {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = 'Lançamentos';
    
    if (!workbook.SheetNames.includes(sheetName)) {
      return {
        sucesso: false,
        valor: 0,
        erro: `Aba "${sheetName}" não encontrada no arquivo`
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    
    // Ler célula por célula ignorando range declarado (pode estar incorreto)
    const data: any[] = [];
    let emptyRowCount = 0;
    
    for (let R = 0; R < 1000; ++R) {
      const row: any[] = [];
      let hasData = false;
      
      for (let C = 0; C < 10; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        const value = cell ? cell.v : undefined;
        row.push(value);
        if (value !== undefined && value !== null && value !== '') hasData = true;
      }
      
      if (hasData) {
        data.push(row);
        emptyRowCount = 0;
      } else {
        emptyRowCount++;
        // Parar após 5 linhas vazias consecutivas
        if (emptyRowCount >= 5 && data.length > 10) break;
      }
    }
    
    // Encontrar onde começam os dados (primeira linha com data válida)
    let startIndex = 0;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row && row[0] && typeof row[0] === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(row[0])) {
        startIndex = i;
        break;
      }
    }
    
    const rows = data.slice(startIndex);
    console.log(`[EXTRATO ${tipo.toUpperCase()}] Cabeçalho termina na linha ${startIndex}, processando ${rows.length} linhas de dados`);
    
    let total = 0;
    const detalhes: any[] = [];
    
    console.log(`[EXTRATO ${tipo.toUpperCase()}] Processando ${rows.length} linhas`);

    for (const row of rows) {
      if (!row || row.length < 5) continue;
      
      const dataLancamento = row[0];
      const lancamento = String(row[1] || '').toUpperCase();
      const valorStr = row[4];
      
      if (!dataLancamento || !lancamento || !valorStr) continue;

      // Filtrar por mês/ano
      const dataObj = parseDataItau(dataLancamento);
      if (!dataObj || dataObj.mes !== mes || dataObj.ano !== ano) continue;

      const valor = parseFloat(String(valorStr).replace(',', '.'));
      if (isNaN(valor)) continue;

      let incluir = false;

      if (tipo === 'cartoes') {
        // RECEBIMENTO REDE (qualquer código)
        if (lancamento.includes('RECEBIMENTO REDE')) {
          incluir = true;
        }
      } else if (tipo === 'pix') {
        // PIX RECEBIDO, PIX QRS, TED PIX, ou qualquer variação de PIX de entrada
        if (
          lancamento.includes('PIX RECEBIDO') || 
          lancamento.includes('PIX QRS') ||
          lancamento.includes('TED PIX') ||
          (lancamento.includes('PIX') && !lancamento.includes('PAGTO'))
        ) {
          incluir = true;
        }
      } else if (tipo === 'rendimento') {
        // RENDIMENTOS REND PAGO APLIC AUT MAIS
        if (lancamento.includes('RENDIMENTOS REND PAGO APLIC AUT MAIS')) {
          incluir = true;
        }
      }

      if (incluir) {
        total += valor;
        detalhes.push({
          data: dataLancamento,
          lancamento: row[1],
          valor
        });
        console.log(`[EXTRATO ${tipo.toUpperCase()}] Incluindo: ${dataLancamento} | ${row[1]} | R$ ${valor.toFixed(2)}`);
      }
    }
    
    console.log(`[EXTRATO ${tipo.toUpperCase()}] Total encontrado: R$ ${total.toFixed(2)} em ${detalhes.length} lançamentos`);

    const resultado = {
      sucesso: true,
      valor: total,
      detalhes
    };
    
    console.log(`[EXTRATO ${tipo.toUpperCase()}] Resultado final:`, resultado);
    
    return resultado;
  } catch (error: any) {
    return {
      sucesso: false,
      valor: 0,
      erro: `Erro ao processar arquivo: ${error.message}`
    };
  }
}

/**
 * Processa extrato Itaú Saída
 * Identifica: OUTRAS TARIFAS (excluindo PIX ENVIADO, PAGAMENTO PIX QR-CODE, PAGAMENTO DE BOLETO, SAÍDA)
 */
export function processarExtratoItauSaida(
  buffer: Buffer,
  mes: number,
  ano: number
): ResultadoProcessamento {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = 'Lançamentos';
    
    if (!workbook.SheetNames.includes(sheetName)) {
      return {
        sucesso: false,
        valor: 0,
        erro: `Aba "${sheetName}" não encontrada no arquivo`
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    
    // Ler célula por célula ignorando range declarado (pode estar incorreto)
    const data: any[] = [];
    let emptyRowCount = 0;
    
    for (let R = 0; R < 1000; ++R) {
      const row: any[] = [];
      let hasData = false;
      
      for (let C = 0; C < 10; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        const value = cell ? cell.v : undefined;
        row.push(value);
        if (value !== undefined && value !== null && value !== '') hasData = true;
      }
      
      if (hasData) {
        data.push(row);
        emptyRowCount = 0;
      } else {
        emptyRowCount++;
        // Parar após 5 linhas vazias consecutivas
        if (emptyRowCount >= 5 && data.length > 10) break;
      }
    }
    
    // Encontrar onde começam os dados (primeira linha com data válida)
    let startIndex = 0;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row && row[0] && typeof row[0] === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(row[0])) {
        startIndex = i;
        break;
      }
    }
    
    const rows = data.slice(startIndex);
    console.log(`[EXTRATO ITAU_SAIDA] Cabeçalho termina na linha ${startIndex}, processando ${rows.length} linhas de dados`);
    
    let total = 0;
    const detalhes: any[] = [];

    const EXCLUSOES = [
      'PIX ENVIADO',
      'PAGAMENTO PIX QR-CODE',
      'PAGAMENTOS PIX QR-CODE',
      'PAGAMENTO DE BOLETO',
      'SAÍDA'
    ];

    for (const row of rows) {
      if (!row || row.length < 5) continue;
      
      const dataLancamento = row[0];
      const lancamento = String(row[1] || '').toUpperCase();
      const valorStr = row[4];
      
      if (!dataLancamento || !lancamento || !valorStr) continue;

      // Filtrar por mês/ano
      const dataObj = parseDataItau(dataLancamento);
      if (!dataObj || dataObj.mes !== mes || dataObj.ano !== ano) continue;

      // Verificar se contém algum padrão de exclusão
      const deveExcluir = EXCLUSOES.some(exclusao => lancamento.includes(exclusao));
      
      if (!deveExcluir) {
        const valor = Math.abs(parseFloat(String(valorStr).replace(',', '.')));
        if (!isNaN(valor) && valor > 0) {
          total += valor;
          detalhes.push({
            data: dataLancamento,
            lancamento: row[1],
            valor
          });
          console.log(`[EXTRATO ITAU_SAIDA] Incluindo: ${dataLancamento} | ${row[1]} | R$ ${valor.toFixed(2)}`);
        }
      }
    }
    
    console.log(`[EXTRATO ITAU_SAIDA] Total encontrado: R$ ${total.toFixed(2)} em ${detalhes.length} lançamentos`);

    const resultado = {
      sucesso: true,
      valor: total,
      detalhes
    };
    
    console.log(`[EXTRATO ITAU_SAIDA] Resultado final:`, resultado);
    
    return resultado;
  } catch (error: any) {
    return {
      sucesso: false,
      valor: 0,
      erro: `Erro ao processar arquivo: ${error.message}`
    };
  }
}

/**
 * Processa extrato Rede Recebimentos
 * A tarifa (MDR) já está calculada na coluna "valor MDR descontado"
 * Basta somar os valores dessa coluna para o mês/ano especificado
 */
export function processarExtratoRede(
  buffer: Buffer,
  mes: number,
  ano: number
): ResultadoProcessamento {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = 'pagamentos';
    
    console.log('[REDE] Abas disponíveis no arquivo:', workbook.SheetNames);
    
    if (!workbook.SheetNames.includes(sheetName)) {
      return {
        sucesso: false,
        valor: 0,
        erro: `Aba "${sheetName}" não encontrada. Abas disponíveis: ${workbook.SheetNames.join(', ')}`
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    
    // Ler célula por célula ignorando range declarado (pode estar incorreto)
    const data: any[] = [];
    let emptyRowCount = 0;
    
    for (let R = 0; R < 1000; ++R) {
      const row: any[] = [];
      let hasData = false;
      
      for (let C = 0; C < 10; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        const value = cell ? cell.v : undefined;
        row.push(value);
        if (value !== undefined && value !== null && value !== '') hasData = true;
      }
      
      if (hasData) {
        data.push(row);
        emptyRowCount = 0;
      } else {
        emptyRowCount++;
        // Parar após 5 linhas vazias consecutivas
        if (emptyRowCount >= 5 && data.length > 10) break;
      }
    }
    
    // Pular a primeira linha (título) - cabeçalho está na linha 1 (index 1)
    const headerRow = data[1];
    
    console.log('[REDE] Cabeçalho encontrado:', headerRow);
    
    // Buscar coluna "valor MDR descontado" (já é a tarifa calculada)
    const colTarifa = headerRow.findIndex((col: any) => 
      String(col || '').toLowerCase().includes('valor mdr descontado')
    );
    
    console.log('[REDE] Índice coluna Tarifa (MDR descontado):', colTarifa);
    
    if (colTarifa === -1) {
      return {
        sucesso: false,
        valor: 0,
        erro: `Coluna "valor MDR descontado" não encontrada. Cabeçalho: ${headerRow.map((c: any) => String(c || '')).join(', ')}`
      };
    }
    
    // Dados começam na linha 2 (index 2)
    const rows = data.slice(2);

    // Encontrar índice da coluna "data do recebimento"
    const dataColIndex = headerRow.findIndex((col: any) => 
      String(col || '').toLowerCase().includes('data do recebimento')
    );

    let totalTarifa = 0;
    const detalhes: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length <= colTarifa) continue;
      
      // Filtrar por mês/ano se houver coluna de data
      if (dataColIndex !== -1) {
        const dataRecebimento = row[dataColIndex];
        if (dataRecebimento) {
          const dataObj = parseDataRede(dataRecebimento);
          if (!dataObj || dataObj.mes !== mes || dataObj.ano !== ano) continue;
        }
      }

      const tarifaStr = row[colTarifa];
      
      if (!tarifaStr) continue;

      const tarifa = parseFloat(String(tarifaStr).replace(',', '.'));
      
      if (!isNaN(tarifa) && tarifa > 0) {
        totalTarifa += tarifa;
        detalhes.push({
          linha: i + 2, // +2 porque pulamos linha 0 (título) e linha 1 (cabeçalho)
          tarifa
        });
      }
    }

    return {
      sucesso: true,
      valor: totalTarifa,
      detalhes
    };
  } catch (error: any) {
    return {
      sucesso: false,
      valor: 0,
      erro: `Erro ao processar arquivo: ${error.message}`
    };
  }
}

/**
 * Parse data do formato Itaú (DD/MM/YYYY)
 */
function parseDataItau(data: any): { dia: number; mes: number; ano: number } | null {
  try {
    const dataStr = String(data);
    
    // Formato DD/MM/YYYY
    if (dataStr.includes('/')) {
      const parts = dataStr.split('/');
      if (parts.length === 3) {
        return {
          dia: parseInt(parts[0]),
          mes: parseInt(parts[1]),
          ano: parseInt(parts[2])
        };
      }
    }
    
    // Formato Excel serial date
    if (!isNaN(Number(data))) {
      const date = XLSX.SSF.parse_date_code(Number(data));
      if (date) {
        return {
          dia: date.d,
          mes: date.m,
          ano: date.y
        };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse data do formato Rede (YYYY-MM-DD HH:MM:SS ou similar)
 */
function parseDataRede(data: any): { dia: number; mes: number; ano: number } | null {
  try {
    const dataStr = String(data);
    
    // Formato YYYY-MM-DD
    if (dataStr.includes('-')) {
      const parts = dataStr.split(' ')[0].split('-');
      if (parts.length === 3) {
        return {
          ano: parseInt(parts[0]),
          mes: parseInt(parts[1]),
          dia: parseInt(parts[2])
        };
      }
    }
    
    // Formato Excel serial date
    if (!isNaN(Number(data))) {
      const date = XLSX.SSF.parse_date_code(Number(data));
      if (date) {
        return {
          dia: date.d,
          mes: date.m,
          ano: date.y
        };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}
