# Análise de Problemas - Enums e Valores Undefined

## Data da Análise: 12/01/2026

---

## 1. PROBLEMAS DE ENUMS FALTANDO

### 1.1 setorSolicitante - Despesas (Legado)

**Localização:** `server/routers.ts` - linhas 1811 e 1847

**Problema:** O schema do banco de dados (`drizzle/schema.ts` linha 461) define o enum `setorSolicitante` com 3 valores:
```typescript
setorSolicitante: mysqlEnum("setorSolicitante", ["estudio", "fotografia", "becas"]).notNull()
```

Porém, o router de despesas (legado) só aceita 2 valores:
```typescript
setorSolicitante: z.enum(["estudio", "fotografia"])
```

**Impacto:** Se um usuário tentar criar/editar uma despesa com setor "becas", receberá erro de validação.

**Correção Necessária:** Adicionar "becas" ao enum do router.

---

### 1.2 setorSolicitante - DespesasV2

**Localização:** `server/routers.ts` - linhas 2659 e 2746

**Problema:** Mesmo problema do item 1.1. O router de despesasV2 também só aceita:
```typescript
setorSolicitante: z.enum(['estudio', 'fotografia'])
```

**Correção Necessária:** Adicionar "becas" ao enum do router.

---

### 1.3 DespesasV2 - setorSolicitante no schema vs router

**Localização:** `drizzle/schema.ts` linha 688

**Problema:** O schema de despesasV2 também define `setorSolicitante` com 3 valores:
```typescript
setorSolicitante: mysqlEnum("setorSolicitante", ["estudio", "fotografia", "becas"]).notNull()
```

Mas o router só aceita 2 valores.

---

## 2. PROBLEMAS DE VALORES UNDEFINED EM HANDLESUBMIT

### 2.1 Eventos.tsx - turmaId pode ser NaN

**Localização:** `client/src/pages/Eventos.tsx` - linha 352

**Problema:**
```typescript
turmaId: parseInt(selectedTurmaId),
```

Se `selectedTurmaId` for uma string vazia ou undefined, `parseInt` retornará `NaN`.

**Correção Necessária:** Adicionar validação antes do parseInt ou usar valor padrão.

---

### 2.2 Despesas.tsx - fornecedorId pode ser NaN

**Localização:** `client/src/pages/Despesas.tsx` - linha 358

**Problema:**
```typescript
fornecedorId: parseInt(formData.get("fornecedorId") as string),
```

Se o campo não estiver preenchido, retornará NaN.

**Correção Necessária:** Adicionar validação.

---

### 2.3 TurmaDetalhes.tsx - genero pode ser string vazia

**Localização:** `client/src/pages/TurmaDetalhes.tsx` - linha 118

**Problema:**
```typescript
genero: formData.get("genero") as "masculino" | "feminino" || undefined,
```

Se o campo for uma string vazia "", a expressão `|| undefined` não funcionará porque "" é falsy mas ainda é uma string.

**Correção Necessária:** Usar validação explícita:
```typescript
genero: formData.get("genero") && formData.get("genero") !== "" 
  ? (formData.get("genero") as "masculino" | "feminino") 
  : undefined,
```

---

### 2.4 Configuracoes.tsx - handleSubmitTabelaPreco - parseInt pode retornar NaN

**Localização:** `client/src/pages/Configuracoes.tsx` - linhas 750-752

**Problema:**
```typescript
fornecedorId: parseInt(formData.get("fornecedorId") as string),
tipoServicoId: parseInt(formData.get("tipoServicoId") as string),
tipoEventoId: parseInt(formData.get("tipoEventoId") as string),
```

Se algum desses campos não estiver selecionado, retornará NaN.

**Correção Necessária:** Adicionar validação antes do envio.

---

### 2.5 Configuracoes.tsx - handleSubmitProduto - categoria pode ser undefined

**Localização:** `client/src/pages/Configuracoes.tsx` - linha 663

**Problema:**
```typescript
categoria: formData.get("categoria") as "Foto" | "Cabelo" | "Outros" || "Outros",
```

Se o campo for uma string vazia, a expressão `|| "Outros"` não funcionará.

---

## 3. PROBLEMAS DE ARRAYS VAZIOS

### 3.1 Turmas.tsx - arrays podem ser vazios

**Localização:** `client/src/pages/Turmas.tsx` - linhas 333-348

**Status:** ✅ JÁ TRATADO - O código já valida arrays vazios antes de enviar.

---

### 3.2 Reunioes.tsx - tiposEventoSelecionados

**Localização:** `client/src/pages/Reunioes.tsx` - linha 143

**Status:** ✅ JÁ TRATADO - O código já valida array vazio.

---

## 4. PROBLEMAS DE DATAS

### 4.1 Eventos.tsx - parseLocalDate pode retornar undefined

**Localização:** `client/src/pages/Eventos.tsx` - linhas 345-349

**Status:** ✅ JÁ TRATADO - A função retorna undefined se a string estiver vazia, e o campo é opcional.

---

### 4.2 DespesasV2.tsx - dataLimitePagamento

**Localização:** `client/src/pages/DespesasV2.tsx` - linha 951

**Status:** ✅ JÁ TRATADO - Usa operador ternário para tratar string vazia.

---

## 5. RESUMO DAS CORREÇÕES REALIZADAS

| # | Arquivo | Problema | Status |
|---|---------|----------|--------|
| 1 | server/routers.ts | setorSolicitante faltando "becas" em despesas | ✅ CORRIGIDO |
| 2 | server/routers.ts | setorSolicitante faltando "becas" em despesasV2 | ✅ CORRIGIDO |
| 3 | server/db.ts | setorSolicitante faltando "becas" em createDespesaV2 | ✅ CORRIGIDO |
| 4 | client/src/pages/Eventos.tsx | turmaId pode ser NaN | ✅ CORRIGIDO |
| 5 | client/src/pages/Despesas.tsx | fornecedorId pode ser NaN | ✅ CORRIGIDO |
| 6 | client/src/pages/Despesas.tsx | setorSolicitante validação | ✅ CORRIGIDO |
| 7 | client/src/pages/TurmaDetalhes.tsx | genero pode ser string vazia | ✅ CORRIGIDO |
| 8 | client/src/pages/Configuracoes.tsx | parseInt em IDs pode retornar NaN | ✅ CORRIGIDO |
| 9 | client/src/pages/DespesasV2.tsx | setorSolicitante validação | ✅ CORRIGIDO |

---

## 6. OBSERVAÇÕES ADICIONAIS

### 6.1 Padrão de tratamento de enums no frontend

O sistema usa um padrão inconsistente para tratar valores de enum:
- Alguns lugares usam `value || undefined`
- Outros usam `value !== "" ? value : undefined`
- Alguns não tratam string vazia

**Recomendação:** Padronizar o tratamento de enums em todo o sistema.

### 6.2 Validação de campos obrigatórios

Alguns formulários não validam campos obrigatórios antes de enviar, confiando apenas na validação do backend. Isso pode causar erros confusos para o usuário.

**Recomendação:** Adicionar validação no frontend antes de chamar a mutation.
