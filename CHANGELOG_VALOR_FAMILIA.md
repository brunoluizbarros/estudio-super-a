# Adição do Campo Valor Família - Configuração de Maquiagem

**Data:** 25/12/2025

## Resumo

Implementado o campo **Valor Família (R$)** na funcionalidade de Configuração de Maquiagem por Turma, permitindo cadastrar valores específicos para serviços de maquiagem família por turma.

## Alterações Realizadas

### 1. Schema do Banco de Dados
- ✅ Adicionado campo `valorFamilia INT NOT NULL` na tabela `configMaquiagemTurma`
- ✅ Campo armazena valores em centavos (ex: R$ 30,00 = 3000)
- ✅ Valor padrão: 3000 (R$ 30,00)

### 2. Backend (tRPC)
- ✅ Atualizado schema de validação no router `configMaquiagemTurma.create`
- ✅ Atualizado schema de validação no router `configMaquiagemTurma.update`
- ✅ Atualizado schema de validação no router `configMaquiagemTurma.updateMultiple`
- ✅ Campo `valorFamilia` agora é obrigatório na criação e opcional na edição

### 3. Frontend - Formulário de Nova Configuração
- ✅ Adicionado campo "Valor Família (R$)" com placeholder "30,00"
- ✅ Campo integrado com lógica de checkbox "Sem Serviço de Maquiagem Família"
- ✅ Quando checkbox está marcado, campo é desabilitado e valor enviado como 0
- ✅ Conversão automática de reais para centavos no submit

### 4. Frontend - Tabela de Configurações
- ✅ Adicionada coluna "Valor Família" na tabela
- ✅ Exibição formatada: R$ XX,XX
- ✅ Ordenação crescente/decrescente implementada
- ✅ Ícone de ordenação visual

### 5. Frontend - Formulário de Edição
- ✅ Adicionado campo "Valor Família (R$)" no modal de edição
- ✅ Campo pré-preenchido com valor atual da configuração
- ✅ Layout em grid com 3 colunas (Masculino, Feminino, Família)

### 6. Frontend - Edição em Massa
- ✅ Adicionado campo "Valor Família (R$)" no formulário de edição em massa
- ✅ Campo opcional (deixar vazio para não alterar)
- ✅ Atualização aplicada a todas as configurações selecionadas

## Arquivos Modificados

1. `drizzle/schema.ts` - Schema da tabela
2. `server/routers.ts` - Validação e procedures tRPC
3. `client/src/pages/Configuracoes.tsx` - Interface completa

## Testes Realizados

- ✅ Coluna "Valor Família" visível na tabela
- ✅ Campo "Valor Família (R$)" visível no formulário de nova configuração
- ✅ Ordenação por Valor Família funcionando
- ✅ Layout responsivo mantido

## Observações

- O campo é obrigatório na criação de novas configurações
- O valor padrão sugerido é R$ 30,00 (conforme regra de negócio existente)
- A linha padrão de Recife exibe "Valor fixo" para o campo Valor Família
- Integração completa com sistema de checkboxes de serviços desabilitados
