# Validação - Ocultação da Aba Fechamentos Mensais

## Data: 26/12/2025

## Alteração Realizada
Comentado o botão "Fechamentos Mensais" na página de Relatórios (arquivo: `client/src/pages/Relatorios.tsx`, linhas 1218-1228)

## Resultado da Validação
✅ **Sucesso** - A aba "Fechamentos Mensais" não aparece mais na página de Relatórios

### Abas Visíveis na Página de Relatórios:
1. Emissão de Nota Fiscal
2. Serviços Make/Cabelo
3. Execução
4. Vendas Excluídas

### Aba Removida:
- ~~Fechamentos Mensais~~ (agora disponível apenas na seção Financeiro)

## Observações
- A funcionalidade de Fechamentos Mensais continua disponível através da seção Financeiro no menu lateral
- O código foi comentado (não removido) para facilitar futuras manutenções
- A página está funcionando corretamente sem erros
