import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Shield, UserCheck, Save } from "lucide-react";

export default function PermissoesCerimoniais() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedTurmaIds, setSelectedTurmaIds] = useState<number[]>([]);

  // Queries
  const { data: usuariosCerimoniais, isLoading: loadingUsuarios } = trpc.permissoesCerimoniais.listUsuariosCerimoniais.useQuery();
  const { data: todasTurmas, isLoading: loadingTurmas } = trpc.turmas.list.useQuery();
  const { data: turmasUsuario, isLoading: loadingTurmasUsuario } = trpc.permissoesCerimoniais.listTurmasUsuario.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId }
  );

  // Mutation
  const vincularTurmasMutation = trpc.permissoesCerimoniais.vincularTurmas.useMutation({
    onSuccess: () => {
      toast.success("Permissões salvas com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao salvar permissões: ${error.message}`);
    },
  });

  // Atualizar checkboxes quando carregar turmas do usuário
  useMemo(() => {
    if (turmasUsuario) {
      setSelectedTurmaIds(turmasUsuario.map(t => t.turmaId));
    }
  }, [turmasUsuario]);

  // Handler para selecionar usuário
  const handleSelectUsuario = (userId: string) => {
    const id = parseInt(userId);
    setSelectedUserId(id);
    setSelectedTurmaIds([]);
  };

  // Handler para toggle checkbox de turma
  const handleToggleTurma = (turmaId: number, checked: boolean) => {
    if (checked) {
      setSelectedTurmaIds(prev => [...prev, turmaId]);
    } else {
      setSelectedTurmaIds(prev => prev.filter(id => id !== turmaId));
    }
  };

  // Handler para salvar permissões
  const handleSalvar = () => {
    if (!selectedUserId) {
      toast.error("Selecione um usuário primeiro");
      return;
    }

    vincularTurmasMutation.mutate({
      userId: selectedUserId,
      turmaIds: selectedTurmaIds,
    });
  };

  // Formatar exibição da turma
  const formatarTurma = (turma: any) => {
    const cursos = JSON.parse(turma.cursos || "[]");
    const instituicoes = JSON.parse(turma.instituicoes || "[]");
    const anos = JSON.parse(turma.anos || "[]");
    const periodos = JSON.parse(turma.periodos || "[]");
    
    const curso = cursos[0] || "";
    const instituicao = instituicoes[0] || "";
    const ano = anos[0] || "";
    const periodo = periodos[0] || "";
    
    return `${turma.codigo} - ${curso} ${instituicao} ${turma.numeroTurma || ""} ${ano}.${periodo}`.trim();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <CardTitle>Permissões Cerimoniais</CardTitle>
        </div>
        <CardDescription>
          Gerencie o acesso de usuários Cerimoniais a turmas específicas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seleção de Usuário */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Usuário Cerimonial
          </Label>
          {loadingUsuarios ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={selectedUserId?.toString() || ""} onValueChange={handleSelectUsuario}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário cerimonial" />
              </SelectTrigger>
              <SelectContent>
                {usuariosCerimoniais?.map((usuario) => (
                  <SelectItem key={usuario.id} value={usuario.id.toString()}>
                    {usuario.name || usuario.email || `Usuário #${usuario.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Lista de Turmas */}
        {selectedUserId && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">Turmas Autorizadas</Label>
            <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto space-y-2">
              {loadingTurmas || loadingTurmasUsuario ? (
                <>
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </>
              ) : todasTurmas && todasTurmas.length > 0 ? (
                todasTurmas.map((turma) => (
                  <div key={turma.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded">
                    <Checkbox
                      id={`turma-${turma.id}`}
                      checked={selectedTurmaIds.includes(turma.id)}
                      onCheckedChange={(checked) => handleToggleTurma(turma.id, checked as boolean)}
                    />
                    <label
                      htmlFor={`turma-${turma.id}`}
                      className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {formatarTurma(turma)}
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  Nenhuma turma cadastrada no sistema
                </p>
              )}
            </div>

            {/* Contador de turmas selecionadas */}
            <p className="text-sm text-slate-600">
              {selectedTurmaIds.length} turma(s) selecionada(s)
            </p>

            {/* Botão Salvar */}
            <Button
              onClick={handleSalvar}
              disabled={vincularTurmasMutation.isPending}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {vincularTurmasMutation.isPending ? "Salvando..." : "Salvar Permissões"}
            </Button>
          </div>
        )}

        {/* Mensagem quando nenhum usuário selecionado */}
        {!selectedUserId && !loadingUsuarios && (
          <div className="text-center py-8 text-slate-500">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Selecione um usuário cerimonial para gerenciar suas permissões</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
