# Sistema de Despesas V2 - Documentação

## Visão Geral

O sistema de Despesas V2 foi implementado com as seguintes funcionalidades:

### Formulário de Nova Despesa

**Informações Gerais:**
- Tipo da Despesa (Operacional/Administrativa)
- Número da CI (automático, formato: 001/2026, reinicia por ano)
- Mês do Serviço (Janeiro a Dezembro)
- Setor Solicitante (Estúdio/Fotografia)
- Fornecedor (combobox com busca)
- Tipo do Serviço/Compra (vinculado ao fornecedor)
- Detalhamento (texto livre)
- É Reembolso? (Sim/Não)

**Campos Condicionais (apenas para Operacional):**
- Turma(s) - múltipla seleção com busca
- Tipo de Evento (baseado nos eventos da turma)
- Data de Realização (múltipla seleção das datas do evento)
- Local (preenchido automaticamente do evento)

**Informações Financeiras:**
- Valor Total do Serviço/Compra
- Tipo de Pagamento (PIX/Cartão/Boleto/Dinheiro)
- Dados para Pagamento (preenchido automaticamente do fornecedor, editável)
- Tipo de Comprovante Fiscal (Contrato/Nota Fiscal/RPA)
- Data Limite de Pagamento

**Anexos:**
- Comprovante Fiscal (múltiplos arquivos)
- Documentos (múltiplos arquivos)

### Fluxo de Aprovação

1. **Aguardando Aprovação do Gestor** - Status inicial ao criar despesa
2. **Aguardando Aprovação do Gestor Geral** - Após aprovação do Gestor
3. **Aprovado Gestor Geral** - Após aprovação do Gestor Geral
4. **Liquidado** - Após liquidação com data e comprovante

**Observações:**
- O Gestor Geral (admin) pode aprovar em qualquer etapa
- Rejeição requer justificativa obrigatória
- Histórico de todas as ações é mantido em seção expandível

### Tela de Listagem

**Colunas:**
- Data (Data do Lançamento)
- Mês do Serviço
- Número da CI
- Tipo (Operacional/Administrativa)
- Fornecedor
- Tipo Serviço
- Valor
- Status
- Ações (Aprovar/Rejeitar/Liquidar/Editar/Excluir)

**Filtros:**
- Busca por CI ou detalhamento
- Filtro por Status
- Filtro por Período de Datas

**Exportação:**
- PDF (em desenvolvimento)
- Excel (em desenvolvimento)

### Aba de Relatório

**Cards de Totais:**
- Total Geral
- Total Pendentes
- Total Aprovadas
- Total Liquidadas

**Tabela com:**
- Todas as colunas da listagem
- Total no rodapé

### Tabelas do Banco de Dados

- `despesas_v2` - Tabela principal de despesas
- `despesas_v2_turmas` - Vínculo despesa-turma (múltiplo)
- `despesas_v2_datas` - Datas de realização (múltiplas)
- `despesas_v2_historico` - Log de aprovações/ações
- `despesas_v2_anexos` - Arquivos anexados
- `ci_sequence` - Controle de sequência do número CI

### Testes

Os testes unitários estão em `server/despesasV2.test.ts` e cobrem:
- Geração de número CI
- Criação de despesas
- Fluxo de aprovação
- Liquidação
- Histórico
- Listagem e busca
- Exclusão
- Validações de negócio
