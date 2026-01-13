SELECT COUNT(*) as total_excluidas FROM vendas WHERE excluido = 1;
SELECT COUNT(*) as total_ativas FROM vendas WHERE excluido = 0;
SELECT COUNT(*) as total_geral FROM vendas;
