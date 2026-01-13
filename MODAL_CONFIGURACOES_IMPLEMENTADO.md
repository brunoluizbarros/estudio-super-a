# Modal de Detalhes - Permissões de Configurações

## ✅ Implementação Concluída

### 📋 O que foi feito:

#### 1. **Banco de Dados**
- ✅ Criada tabela `permissoes_configuracoes` com:
  - `role`: enum com 8 tipos de usuário
  - `aba`: enum com 11 abas de configurações
  - `visualizar`, `inserir`, `excluir`: boolean
  - timestamps (createdAt, updatedAt)
- ✅ Populadas 88 permissões padrão (8 roles × 11 abas)
- ✅ Administrador tem todas as permissões habilitadas por padrão

#### 2. **Backend (server/)**
- ✅ Schema atualizado em `drizzle/schema.ts`
- ✅ Funções criadas em `server/db.ts`:
  - `getPermissoesConfiguracoesByRole(role)`
  - `upsertPermissaoConfiguracao(data)`
- ✅ Router criado em `server/routers.ts`:
  - `permissoesConfiguracoes.list` - lista permissões do usuário logado
  - `permissoesConfiguracoes.listByRole` - lista por role (admin only)
  - `permissoesConfiguracoes.upsert` - cria/atualiza permissão (admin only)

#### 3. **Frontend (client/)**
- ✅ Constante `ABAS_CONFIGURACOES` com 11 abas:
  1. Instituições
  2. Cursos
  3. Cidades
  4. Locais
  5. Tipos de Evento
  6. Tipos de Serviço
  7. Fornecedores
  8. Tabela de Preço
  9. Taxas de Cartão
  10. Produtos
  11. Maquiagem

- ✅ Estado `modalConfiguracoesOpen` adicionado
- ✅ Query `permissoesConfiguracoes.list` integrada
- ✅ Mutation `upsertPermissaoConfiguracaoMutation` criada
- ✅ Funções helper:
  - `getPermissaoConfiguracao(role, aba)`
  - `handlePermissaoConfiguracaoChange(role, aba, campo, valor)`

- ✅ Modal implementado com:
  - Título dinâmico com nome do role
  - Lista scrollável com todas as abas
  - 3 checkboxes por aba (Visualizar, Inserir, Excluir)
  - Checkboxes desabilitados para Administrador
  - Atualização em tempo real via upsert

#### 4. **Interface**
- ✅ Botão "Detalhes" habilitado na coluna Configurações
- ✅ Modal abre ao clicar no botão
- ✅ Layout responsivo com scroll vertical
- ✅ Toast de sucesso ao atualizar permissões
- ✅ Integração perfeita com design existente

### 🎯 Funcionalidades:

1. **Visualização**: Cada role pode ver suas permissões específicas por aba
2. **Edição**: Admin pode modificar permissões de qualquer role
3. **Granularidade**: Controle V/I/E independente para cada aba
4. **Persistência**: Alterações salvas automaticamente no banco
5. **Feedback**: Toast de confirmação em cada alteração

### 📊 Estrutura de Dados:

```sql
CREATE TABLE permissoes_configuracoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('administrador', 'gestor', 'coordenador', 'cerimonial', 'beca', 'logistica', 'armazenamento', 'financeiro'),
  aba ENUM('instituicoes', 'cursos', 'cidades', 'locais', 'tipos_evento', 'tipos_servico', 'fornecedores', 'tabela_preco', 'taxas_cartao', 'produtos', 'maquiagem'),
  visualizar BOOLEAN DEFAULT FALSE,
  inserir BOOLEAN DEFAULT FALSE,
  excluir BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 🔗 Arquivos Modificados:

1. `drizzle/schema.ts` - Schema da tabela
2. `server/db.ts` - Funções de banco
3. `server/routers.ts` - Endpoints tRPC
4. `client/src/pages/ConfiguracoesUsuarios.tsx` - Interface do modal

### ✨ Resultado:

Modal totalmente funcional seguindo o mesmo padrão do modal de Relatórios, permitindo gerenciamento granular de permissões para todas as abas de Configurações.
