# Debug - Erro SQL Dashboard Vendas Mensais

## Erro Reportado
```
Failed query: select MONTH(`dataVenda`), SUM(`valorTotal`) from `vendas` 
where (YEAR(`vendas`.`dataVenda`) = ? and `vendas`.`excluido` = ?) 
group by MONTH(`vendas`.`dataVenda`) 
order by MONTH(`vendas`.`dataVenda`)
params: 2026,false
```

## Análise
1. A query SQL está correta sintaticamente
2. O campo `dataVenda` existe na tabela (confirmado via SHOW COLUMNS)
3. A query funciona quando executada diretamente no banco
4. O erro ocorre apenas quando executada via Drizzle ORM

## Problema Identificado
O Drizzle está usando backticks inconsistentes:
- `MONTH(\`dataVenda\`)` - sem prefixo de tabela
- `YEAR(\`vendas\`.\`dataVenda\`)` - com prefixo de tabela

Isso pode estar causando ambiguidade na query.

## Solução
Reescrever a query para usar referências consistentes ao campo dataVenda.
