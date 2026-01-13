import XLSX from 'xlsx';
import fs from 'fs';

const filePath = '/home/ubuntu/upload/Rede_Rel_Recebimentos_01_12_2025-31_12_2025-0e62da66-d45a-4c6f-bd37-801e92484011.xlsx';

console.log('=== ANÁLISE DO ARQUIVO EXCEL DA REDE ===\n');

const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer' });

console.log('1. ABAS DISPONÍVEIS:');
workbook.SheetNames.forEach((name, i) => {
  console.log(`   ${i + 1}. "${name}"`);
});

console.log('\n2. VERIFICANDO ABA "pagamentos":');
if (workbook.SheetNames.includes('pagamentos')) {
  console.log('   ✅ Aba "pagamentos" EXISTE');
  
  const worksheet = workbook.Sheets['pagamentos'];
  
  // Ler as primeiras 10 linhas
  const data = [];
  for (let R = 0; R < 10; R++) {
    const row = [];
    for (let C = 0; C < 15; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      row.push(cell ? cell.v : undefined);
    }
    data.push(row);
  }
  
  console.log('\n3. PRIMEIRAS 10 LINHAS (primeiras 15 colunas):');
  data.forEach((row, i) => {
    console.log(`   Linha ${i}:`, row.filter(v => v !== undefined));
  });
  
  // Procurar cabeçalho
  console.log('\n4. PROCURANDO CABEÇALHO:');
  for (let R = 0; R < 20; R++) {
    const row = [];
    for (let C = 0; C < 15; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      const value = cell ? String(cell.v).toLowerCase() : '';
      row.push(cell ? cell.v : undefined);
      
      if (value.includes('valor') || value.includes('bruto') || value.includes('liquido') || value.includes('mdr')) {
        console.log(`   Linha ${R}, Coluna ${C}: "${cell.v}"`);
      }
    }
  }
  
} else {
  console.log('   ❌ Aba "pagamentos" NÃO EXISTE');
  console.log('\n   Tentando primeira aba disponível:', workbook.SheetNames[0]);
  
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = [];
  for (let R = 0; R < 10; R++) {
    const row = [];
    for (let C = 0; C < 15; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      row.push(cell ? cell.v : undefined);
    }
    data.push(row);
  }
  
  console.log('\n   PRIMEIRAS 10 LINHAS:');
  data.forEach((row, i) => {
    console.log(`   Linha ${i}:`, row.filter(v => v !== undefined));
  });
}
