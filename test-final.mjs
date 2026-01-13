import XLSX from 'xlsx';
import fs from 'fs';

const filePath = '/home/ubuntu/upload/Rede_Rel_Recebimentos_01_12_2025-31_12_2025-0e62da66-d45a-4c6f-bd37-801e92484011.xlsx';

const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer' });
const worksheet = workbook.Sheets['pagamentos'];

const data = [];
for (let R = 0; R < 200; R++) {
  const row = [];
  let hasData = false;
  for (let C = 0; C < 15; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
    const cell = worksheet[cellAddress];
    const value = cell ? cell.v : undefined;
    row.push(value);
    if (value !== undefined && value !== null && value !== '') hasData = true;
  }
  if (hasData) data.push(row);
  else if (data.length > 10) break;
}

const headerRow = data[1];
const colTarifa = 6; // "valor MDR descontado"
const colData = 0; // "data do recebimento"

const rows = data.slice(2);
let totalTarifa = 0;
let count = 0;

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const tarifaStr = row[colTarifa];
  const dataRecebimento = row[colData];
  
  if (!tarifaStr) continue;
  
  const tarifa = parseFloat(String(tarifaStr).replace(',', '.'));
  
  // Parse data
  let dataObj = null;
  if (!isNaN(Number(dataRecebimento))) {
    const date = XLSX.SSF.parse_date_code(Number(dataRecebimento));
    if (date) dataObj = { mes: date.m, ano: date.y };
  }
  
  if (!isNaN(tarifa) && tarifa > 0 && dataObj && dataObj.mes === 12 && dataObj.ano === 2025) {
    totalTarifa += tarifa;
    count++;
  }
}

console.log('Total de lançamentos:', count);
console.log('Total de tarifas: R$', totalTarifa.toFixed(2));
