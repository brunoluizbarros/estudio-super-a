# Sistema de Permissões - Guia de Uso

Este documento explica como usar o sistema de permissões implementado no Álbum.

## Componentes Disponíveis

### 1. Hook `usePermissoes`

Hook para verificar permissões do usuário logado.

```tsx
import { usePermissoes } from "@/hooks/usePermissoes";

function MeuComponente() {
  const { temPermissao, podeAcessar, isAdmin } = usePermissoes();

  // Verificar permissão específica
  const podeInserir = temPermissao("turmas", "inserir");
  const podeExcluir = temPermissao("despesas", "excluir");

  // Verificar se pode acessar (visualizar)
  const podeVerRelatorios = podeAcessar("relatorios");

  // Verificar se é administrador
  if (isAdmin) {
    // Administrador tem todas as permissões
  }
}
```

### 2. Componente `ProtectedRoute`

Protege páginas inteiras redirecionando usuários sem permissão.

```tsx
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Em App.tsx ou nas rotas
<Route path="/turmas">
  <ProtectedRoute secao="turmas">
    <TurmasPage />
  </ProtectedRoute>
</Route>

// Exigir permissão específica (padrão é "visualizar")
<Route path="/turmas/nova">
  <ProtectedRoute secao="turmas" requiredPermission="inserir">
    <NovaTurmaPage />
  </ProtectedRoute>
</Route>
```

### 3. Componente `PermissionGate`

Controla visibilidade de elementos (botões, seções, etc).

```tsx
import { PermissionGate } from "@/components/PermissionGate";

function TurmasPage() {
  return (
    <div>
      <h1>Turmas</h1>

      {/* Ocultar botão se não tiver permissão de inserir */}
      <PermissionGate secao="turmas" permission="inserir">
        <Button>Nova Turma</Button>
      </PermissionGate>

      {/* Mostrar mensagem alternativa */}
      <PermissionGate 
        secao="despesas" 
        permission="excluir"
        fallback={<span className="text-muted-foreground">Sem permissão para excluir</span>}
      >
        <Button variant="destructive">Excluir</Button>
      </PermissionGate>
    </div>
  );
}
```

## Tipos de Permissão

- **visualizar**: Permite ver a seção/página
- **inserir**: Permite criar novos registros
- **excluir**: Permite deletar registros

## Seções Disponíveis

- `dashboard`
- `turmas`
- `eventos`
- `abordagem`
- `execucao`
- `vendas`
- `reunioes`
- `servicos`
- `financeiro`
- `despesas`
- `relatorios`
- `briefing`
- `becas`
- `configuracoes`

## Permissões Granulares de Relatórios

Para a seção Relatórios, existem permissões adicionais por aba:

```tsx
import { usePermissoes } from "@/hooks/usePermissoes";

function RelatoriosPage() {
  const { temPermissaoRelatorio, podeAcessarRelatorio } = usePermissoes();

  // Verificar se pode acessar aba de Despesas
  const podeVerDespesas = podeAcessarRelatorio("despesas");

  // Verificar permissão específica
  const podeExportarNF = temPermissaoRelatorio("emissao_nf", "inserir");
}
```

### Abas de Relatórios

- `despesas`
- `emissao_nf`
- `servicos_make_cabelo`
- `execucao`

## Configuração de Permissões

As permissões são configuradas em **Configurações > Usuários > Permissões**:

1. Aba **Usuários**: Alterar tipo de cada usuário
2. Aba **Permissões**: Matriz de permissões por tipo de usuário
3. Coluna **Relatórios**: Botão "Detalhes" para permissões granulares

## Tipos de Usuário

- **Administrador**: Acesso total
- **Gestor**: Acesso total
- **Coordenador**: Visualizar e inserir (sem excluir)
- **Cerimonial**: Foco em execução
- **Beca**: Foco em becas
- **Logística**: Foco em serviços make/cabelo
- **Armazenamento**: Acesso limitado
- **Financeiro**: Foco em despesas e notas fiscais

## Exemplo Completo

```tsx
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PermissionGate } from "@/components/PermissionGate";
import { usePermissoes } from "@/hooks/usePermissoes";
import { Button } from "@/components/ui/button";

function TurmasPage() {
  const { temPermissao } = usePermissoes();

  return (
    <ProtectedRoute secao="turmas">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Turmas</h1>

          <PermissionGate secao="turmas" permission="inserir">
            <Button>Nova Turma</Button>
          </PermissionGate>
        </div>

        <div className="space-y-4">
          {/* Lista de turmas */}
          {turmas.map(turma => (
            <div key={turma.id} className="flex justify-between items-center p-4 border rounded">
              <span>{turma.nome}</span>

              <div className="flex gap-2">
                <PermissionGate secao="turmas" permission="inserir">
                  <Button variant="outline">Editar</Button>
                </PermissionGate>

                <PermissionGate secao="turmas" permission="excluir">
                  <Button variant="destructive">Excluir</Button>
                </PermissionGate>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}
```

## Notas Importantes

1. **Administradores** sempre têm todas as permissões
2. A **sidebar** filtra automaticamente seções sem permissão de visualizar
3. **ProtectedRoute** redireciona para "/" se não tiver permissão
4. **PermissionGate** oculta elementos se não tiver permissão
5. Permissões são carregadas automaticamente ao fazer login
