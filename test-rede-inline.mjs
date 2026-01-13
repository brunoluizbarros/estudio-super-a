import XLSX from 'xlsx';
import fs from 'fs';

const filePath = '/home/ubuntu/upload/Rede_Rel_Recebimentos_01_12_2025-31_12_2025-0e62da66-d45a-4c6f-bd37-801e92484011.xlsx';

console.log('=== TESTE DE PROCESSAMENTO DO ARQUIVO DA REDE ===\n');

const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer' });
const worksheet = workbook.Sheets['pagamentos'];

// Ler células
const data = [];
for (let R = 0; R < 1000; R++) {
  const row = [];
  let hasData = false;
  
  for (let C = 0; C < 15; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
    const cell = worksheet[cellAddress];
    const value = cell ? cell.v : undefined;
    row.push(value);
    if (value !== undefined && value !== null && value !== '') hasData = true;
  }
  
  if (hasData) {
    data.push(row);
  } else if (data.length > 10) {
    break;
  }
}

console.log('Total de linhas lidas:', data.length);

// Cabeçalho na linha 1
const headerRow = data[1];
console.log('\nCabeçalho:', headerRow);

// Buscar colunas
const colBruto = headerRow.findIndex((col) => {
  const colStr = String(col || '').toLowerCase();
  return colStr.includes('valor bruto da parcela original');
});

const colLiquido = headerRow.findIndex((col) => 
  String(col || '').toLowerCase().includes('valor mdr descontado')
);

const colData = headerRow.findIndex((col) => 
  String(col || '').toLowerCase().includes('data do recebimento')
);

console.log('\nÍndices das colunas:');
console.log('- Valor Bruto:', colBruto);
console.log('- Valor Líquido (MDR descontado):', colLiquido);
console.log('- Data do Recebimento:', colData);

// Processar dados (começam na linha 2)
const rows = data.slice(2);
let totalTarifa = 0;
let count = 0;

console.log('\n=== PROCESSANDO LANÇAMENTOS ===');

for (let i = 0; i < Math.min(rows.length, 10); i++) {
  const row = rows[i];
  
  const valorBruto = parseFloat(String(row[colBruto] || '0').replace(',', '.'));
  const valorLiquido = parseFloat(String(row[colLiquido] || '0').replace(',', '.'));
  const dataRecebimento = row[colData];
  
  if (!isNaN(valorBruto) && !isNaN(valorLiquido)) {
    const tarifa = valorBruto - valorLiquido;
    
    // Parse data Excel serial
    let dataObj = null;
    if (!isNaN(Number(dataRecebimento))) {
      const date = XLSX.SSF.parse_date_code(Number(dataRecebimento));
      if (date) {
        dataObj = { dia: date.d, mes: date.m, ano: date.y };
      }
    }
    
    console.log(`Linha ${i + 2}: Data ${dataObj?.dia}/${dataObj?.mes}/${dataObj?.ano} - Bruto R$ ${valorBruto.toFixed(2)} - Líquido R$ ${valorLiquido.toFixed(2)} = Tarifa R$ ${tarifa.toFixed(2)}`);
    
    if (dataObj && dataObj.mes === 12 && dataObj.ano === 2025) {
      totalTarifa += tarifa;
      count++;
    }
  }
}

console.log('\n=== RESULTADO ===');
console.log('Total de lançamentos de dez/2025:', count);
console.log('Total de tarifas:', totalTarifa.toFixed(2));
