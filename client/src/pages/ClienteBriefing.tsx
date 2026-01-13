import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Users, Calendar, Clock, LogOut, Search, User } from "lucide-react";

interface ClienteFormando {
  id: number;
  nome: string;
  turmaId: number;
}

interface ClienteTurma {
  id: number;
  codigo: string;
}

export default function ClienteBriefing() {
  const [, setLocation] = useLocation();
  const [cliente, setCliente] = useState<ClienteFormando | null>(null);
  const [turma, setTurma] = useState<ClienteTurma | null>(null);
  const [selectedEventoId, setSelectedEventoId] = useState<number | null>(null);
  const [showAddFormandoDialog, setShowAddFormandoDialog] = useState(false);
  const [selectedGrupoId, setSelectedGrupoId] = useState<number | null>(null);
  const [searchFormando, setSearchFormando] = useState("");

  // Carregar dados do cliente do sessionStorage
  useEffect(() => {
    const clienteData = sessionStorage.getItem("cliente");
    const turmaData = sessionStorage.getItem("clienteTurma");
    
    if (!clienteData || !turmaData) {
      toast.error("Sessão expirada. Faça login novamente.");
      setLocation("/cliente");
      return;
    }

    try {
      setCliente(JSON.parse(clienteData));
      setTurma(JSON.parse(turmaData));
    } catch {
      toast.error("Erro ao carregar dados. Faça login novamente.");
      setLocation("/cliente");
    }
  }, [setLocation]);

  // Queries
  const { data: eventos = [] } = trpc.eventos.listByTurma.useQuery(
    { turmaId: turma?.id || 0 },
    { enabled: !!turma?.id }
  );

  const { data: grupos = [] } = trpc.briefing.listGrupos.useQuery(
    { eventoId: selectedEventoId! },
    { enabled: !!selectedEventoId }
  );

  const { data: formandosBriefing = [], refetch: refetchFormandos } = trpc.briefing.listFormandosByEvento.useQuery(
    { eventoId: selectedEventoId! },
    { enabled: !!selectedEventoId }
  );

  const { data: formandosTurma = [] } = trpc.formandos.listByTurma.useQuery(
    { turmaId: turma?.id || 0 },
    { enabled: !!turma?.id }
  );

  // Mutations
  const addFormando = trpc.briefing.addFormando.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Formando adicionado ao grupo!");
        refetchFormandos();
        setShowAddFormandoDialog(false);
        setSearchFormando("");
      } else {
        toast.error(result.error || "Erro ao adicionar formando");
      }
    }
  });

  const updateFormando = trpc.briefing.updateFormando.useMutation({
    onSuccess: () => {
      refetchFormandos();
    }
  });

  const removeFormando = trpc.briefing.removeFormando.useMutation({
    onSuccess: () => {
      toast.success("Formando removido do grupo!");
      refetchFormandos();
    }
  });

  // Formandos disponíveis (não estão em nenhum grupo)
  const formandosDisponiveis = useMemo(() => {
    const formandosNoGrupo = new Set(formandosBriefing.map(f => f.formandoId));
    return formandosTurma
      .filter(f => !formandosNoGrupo.has(f.id))
      .filter(f => {
        if (!searchFormando) return true;
        return f.nome?.toLowerCase().includes(searchFormando.toLowerCase()) ||
               f.cpf?.includes(searchFormando);
      });
  }, [formandosTurma, formandosBriefing, searchFormando]);

  // Formandos por grupo
  const formandosPorGrupo = useMemo(() => {
    const map: Record<number, typeof formandosBriefing> = {};
    grupos.forEach(g => {
      map[g.id] = formandosBriefing.filter(f => f.grupoId === g.id);
    });
    return map;
  }, [grupos, formandosBriefing]);

  const handleLogout = () => {
    sessionStorage.removeItem("cliente");
    sessionStorage.removeItem("clienteTurma");
    setLocation("/cliente");
  };

  const handleAddFormando = (formandoId: number) => {
    if (!selectedGrupoId || !selectedEventoId) return;
    addFormando.mutate({
      grupoId: selectedGrupoId,
      eventoId: selectedEventoId,
      formandoId,
    });
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  if (!cliente || !turma) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/logo-estudio-supera.png" 
              alt="Estúdio Super A" 
              className="h-10 object-contain"
            />
            <div>
              <h1 className="font-semibold">Briefing do Evento</h1>
              <p className="text-sm text-muted-foreground">
                Turma {turma.codigo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span>{cliente.nome}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Seleção de Evento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Selecione o Evento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedEventoId?.toString() || ""}
              onValueChange={(v) => setSelectedEventoId(Number(v))}
            >
              <SelectTrigger className="w-full md:w-96">
                <SelectValue placeholder="Selecione um evento" />
              </SelectTrigger>
              <SelectContent>
                {eventos.filter(e => e.dataEvento).map((evento) => (
                  <SelectItem key={evento.id} value={evento.id.toString()}>
                    {evento.tipoEvento} - {formatDate(evento.dataEvento)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {eventos.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Nenhum evento cadastrado para esta turma.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Grupos */}
        {selectedEventoId && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Grupos ({grupos.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {grupos.map((grupo) => (
                <Card key={grupo.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Grupo {grupo.numero}</CardTitle>
                      <Badge variant="outline">
                        {formandosPorGrupo[grupo.id]?.length || 0}/{grupo.limiteFormandos || 10} formandos
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Info do Grupo (somente leitura para cliente) */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground">Data do Grupo</p>
                        <p className="font-medium flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(grupo.dataGrupo)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Horário dos Formandos</p>
                        <p className="font-medium flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {grupo.horarioFormandos || "-"}
                        </p>
                      </div>
                    </div>

                    {/* Tabela de Formandos */}
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs py-2">Formando</TableHead>
                            <TableHead className="text-xs py-2 w-16">Pacote</TableHead>
                            <TableHead className="text-xs py-2 w-14 text-center">Make F.</TableHead>
                            <TableHead className="text-xs py-2 w-14 text-center">Cab. F.</TableHead>
                            <TableHead className="text-xs py-2 w-14 text-center">Make Fam.</TableHead>
                            <TableHead className="text-xs py-2 w-14 text-center">Cab. Fam.</TableHead>
                            <TableHead className="text-xs py-2 w-12 text-center">Fam.</TableHead>
                            <TableHead className="text-xs py-2 w-12 text-center">Pets</TableHead>
                            <TableHead className="text-xs py-2 w-14 text-center">Só Grp.</TableHead>
                            <TableHead className="text-xs py-2 w-8"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formandosPorGrupo[grupo.id]?.map((f) => (
                            <TableRow key={f.id}>
                              <TableCell className="py-1 text-xs font-medium">{f.formandoNome}</TableCell>
                              <TableCell className="py-1 text-xs">{f.formandoPacote || "-"}</TableCell>
                              <TableCell className="py-1 text-center">
                                <Checkbox
                                  checked={f.makeFormando || false}
                                  onCheckedChange={(v) => updateFormando.mutate({
                                    id: f.id,
                                    makeFormando: !!v,
                                  })}
                                />
                              </TableCell>
                              <TableCell className="py-1 text-center">
                                <Checkbox
                                  checked={f.cabeloFormando || false}
                                  onCheckedChange={(v) => updateFormando.mutate({
                                    id: f.id,
                                    cabeloFormando: !!v,
                                  })}
                                />
                              </TableCell>
                              <TableCell className="py-1 text-center">
                                <Checkbox
                                  checked={f.makeFamilia || false}
                                  onCheckedChange={(v) => updateFormando.mutate({
                                    id: f.id,
                                    makeFamilia: !!v,
                                  })}
                                />
                              </TableCell>
                              <TableCell className="py-1 text-center">
                                <Checkbox
                                  checked={f.cabeloFamilia || false}
                                  onCheckedChange={(v) => updateFormando.mutate({
                                    id: f.id,
                                    cabeloFamilia: !!v,
                                  })}
                                />
                              </TableCell>
                              <TableCell className="py-1">
                                <Input
                                  type="number"
                                  min={0}
                                  value={f.qtdFamilia || 0}
                                  onChange={(e) => updateFormando.mutate({
                                    id: f.id,
                                    qtdFamilia: Number(e.target.value),
                                  })}
                                  className="h-6 text-xs w-12 text-center"
                                />
                              </TableCell>
                              <TableCell className="py-1">
                                <Input
                                  type="number"
                                  min={0}
                                  value={f.qtdPets || 0}
                                  onChange={(e) => updateFormando.mutate({
                                    id: f.id,
                                    qtdPets: Number(e.target.value),
                                  })}
                                  className="h-6 text-xs w-12 text-center"
                                />
                              </TableCell>
                              <TableCell className="py-1 text-center">
                                <Checkbox
                                  checked={f.somenteGrupo || false}
                                  onCheckedChange={(v) => updateFormando.mutate({
                                    id: f.id,
                                    somenteGrupo: !!v,
                                  })}
                                />
                              </TableCell>
                              <TableCell className="py-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => {
                                    if (confirm("Remover este formando do grupo?")) {
                                      removeFormando.mutate({ id: f.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!formandosPorGrupo[grupo.id] || formandosPorGrupo[grupo.id].length === 0) && (
                            <TableRow>
                              <TableCell colSpan={10} className="text-center text-muted-foreground py-4 text-sm">
                                Nenhum formando neste grupo
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Botão adicionar formando */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedGrupoId(grupo.id);
                        setShowAddFormandoDialog(true);
                      }}
                      disabled={(formandosPorGrupo[grupo.id]?.length || 0) >= (grupo.limiteFormandos || 10)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Formando
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {grupos.length === 0 && (
                <Card className="col-span-2">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mb-4" />
                    <p>Nenhum grupo criado para este evento.</p>
                    <p className="text-sm">Aguarde a equipe do Estúdio Super A configurar os grupos.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </main>

      {/* Dialog Adicionar Formando */}
      <Dialog open={showAddFormandoDialog} onOpenChange={setShowAddFormandoDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Formando ao Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar formando por nome ou CPF..."
                value={searchFormando}
                onChange={(e) => setSearchFormando(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="border rounded-lg max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Pacote</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formandosDisponiveis.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.nome}</TableCell>
                      <TableCell>{f.cpf}</TableCell>
                      <TableCell>{f.pacote || "-"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleAddFormando(f.id)}
                          disabled={addFormando.isPending}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {formandosDisponiveis.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        {searchFormando ? "Nenhum formando encontrado" : "Todos os formandos já estão em grupos"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFormandoDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
