# Teste: Exibição de CPF no Relatório de Emissão de Nota Fiscal

## Data do Teste
26/12/2025 - 17:34

## Problema Reportado
A coluna CPF no Relatório de Emissão de Nota Fiscal estava exibindo "-" em vez dos dados reais do CPF dos formandos.

## Causa Raiz
A query `getAllVendas()` no arquivo `server/db.ts` não estava incluindo o campo `formandoCpf` no SELECT, apesar de fazer JOIN com a tabela `formandos`.

## Correção Aplicada
1. Adicionado campo `formandoCpf: formandos.cpf` na query `getAllVendas()` (linha 580)
2. Adicionado campo `formandoCpf: formandos.cpf` na query de vendas excluídas (linha 3440)

## Resultado do Teste
✅ **APROVADO** - A coluna CPF agora exibe os dados corretamente formatados:
- Bruna Gabriela Pontes Ramos: 089.480.874-59
- Bárbara Leite Pessoa: 092.073.284-45
- Luana Gabriely De Souza Roza: 132.775.204-20
- Joana Beatriz Nunes Gama: 700.868.444-40
- Ana Beatriz Da Silva Santos: 017.888.583-06
- Joab Vinicius Jacolino Mangueira: 091.430.314-10
- Ana Beatriz Silva Pereira: 091.963.894-51
- Beatriz Arruda Escorel Vieira: 710.028.414-70
- Emanuelle Fernandes De Paula: 079.275.544-84
- Maria Luiza Dantas De Araujo Estrela: 129.865.644-37
- Monaliza Carvalho Alves Feitosa: 081.435.694-03
- Emmily Heiner Maia Carvalho: 085.441.624-28

## Próximos Passos
- [ ] Testar exportação Excel
- [ ] Testar exportação PDF
