-- Verificar despesas de Maquiadora
SELECT 
  ci,
  tipoServicoCompra,
  mesServico,
  YEAR(createdAt) as ano,
  valorTotal / 100 as valor_reais
FROM despesas_v2
WHERE tipoServicoCompra LIKE '%Maquiadora%'
ORDER BY createdAt DESC
LIMIT 10;

-- Verificar despesas de Investimentos
SELECT 
  ci,
  tipoServicoCompra,
  mesServico,
  YEAR(createdAt) as ano,
  valorTotal / 100 as valor_reais
FROM despesas_v2
WHERE tipoServicoCompra LIKE '%Equipamentos%'
ORDER BY createdAt DESC
LIMIT 10;

-- Verificar despesas de Transferência Santander
SELECT 
  ci,
  tipoServicoCompra,
  mesServico,
  YEAR(createdAt) as ano,
  valorTotal / 100 as valor_reais
FROM despesas_v2
WHERE tipoServicoCompra LIKE '%Santander%'
ORDER BY createdAt DESC
LIMIT 10;
