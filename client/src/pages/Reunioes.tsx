import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { formatTurmaCompleta } from "@/lib/formatTurma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, FileText, DollarSign, Trash2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FormularioVenda } from "@/components/FormularioVenda";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Reunioes() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedReuniaoId, setSelectedReuniaoId] = useState<number | null>(null);
  const [isVendaOpen, setIsVendaOpen] = useState(false);
  const [vendaData, setVendaData] = useState<{ eventoId: number; formandoId: number; formandoNome: string; reuniaoId: number } | null>(null);
  const [isFormandoSelectOpen, setIsFormandoSelectOpen] = useState(false);
  const [selectedReuniaoForVenda, setSelectedReuniaoForVenda] = useState<any>(null);
  const [selectedFormandoIds, setSelectedFormandoIds] = useState<number[]>([]);
  
  // Campos do formulário inicial
  const [turmaId, setTurmaId] = useState<number | null>(null);
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [tiposEventoSelecionados, setTiposEventoSelecionados] = useState<number[]>([]);
  const [tipoReuniao, setTipoReuniao] = useState<"Presencial" | "Online">("Presencial");
  const [turmaSearchOpen, setTurmaSearchOpen] = useState(false);
  const [turmaSearch, setTurmaSearch] = useState("");
  
  // Campos do formulário de detalhes (botão 📄)
  const [quantidadeReunioes, setQuantidadeReunioes] = useState(0);
  const [dataResumo, setDataResumo] = useState("");
  const [alinhamento, setAlinhamento] = useState(false);
  const [dataBriefing, setDataBriefing] = useState("");
  
  // Filtros
  const [filtroBuscaGeral, setFiltroBuscaGeral] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [ordenacaoData, setOrdenacaoData] = useState<"asc" | "desc">("desc"); // desc = mais recente primeiro
  const [visualizacao, setVisualizacao] = useState<"lista" | "calendario">("lista");

  // Queries
  const { data: reunioes, isLoading, refetch } = trpc.reunioes.list.useQuery();
  const { data: turmas } = trpc.turmas.list.useQuery();
  const { data: tiposEvento } = trpc.tiposEvento.list.useQuery();
  const { data: formandos } = trpc.formandos.listByTurma.useQuery(
    { turmaId: selectedReuniaoForVenda?.turmaId || 0 },
    { enabled: !!selectedReuniaoForVenda }
  );

  // Mutations
  const createMutation = trpc.reunioes.create.useMutation({
    onSuccess: () => {
      toast.success("Reunião cadastrada!");
      setIsOpen(false);
      resetForm();
      refetch();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const updateMutation = trpc.reunioes.update.useMutation({
    onSuccess: () => {
      toast.success("Reunião atualizada!");
      setIsDetailsOpen(false);
      refetch();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const deleteMutation = trpc.reunioes.delete.useMutation({
    onSuccess: () => {
      toast.success("Reunião excluída!");
      refetch();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const resetForm = () => {
    setTurmaId(null);
    setData("");
    setHorario("");
    setTiposEventoSelecionados([]);
    setTipoReuniao("Presencial");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!turmaId) {
      toast.error("Selecione uma turma");
      return;
    }
    if (!data) {
      toast.error("Informe a data");
      return;
    }
    if (!horario) {
      toast.error("Informe o horário");
      return;
    }
    if (tiposEventoSelecionados.length === 0) {
      toast.error("Selecione pelo menos um tipo de evento");
      return;
    }

    createMutation.mutate({
      turmaId,
      data,
      horario,
      tiposEvento: tiposEventoSelecionados,
      tipoReuniao,
    });
  };

  const handleOpenDetails = (reuniao: any) => {
    setSelectedReuniaoId(reuniao.id);
    setQuantidadeReunioes(reuniao.quantidadeReunioes || 0);
    setDataResumo(reuniao.dataResumo || "");
    setAlinhamento(reuniao.alinhamento || false);
    setDataBriefing(reuniao.dataBriefing || "");
    setIsDetailsOpen(true);
  };

  const handleUpdateDetails = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReuniaoId) return;

    updateMutation.mutate({
      id: selectedReuniaoId,
      quantidadeReunioes,
      dataResumo: dataResumo || undefined,
      alinhamento,
      dataBriefing: dataBriefing || undefined,
    });
  };

  const getTurmaNome = (turmaId: number) => {
    const turma = turmas?.find(t => t.id === turmaId);
    if (!turma) return "Turma não encontrada";
    return formatTurmaCompleta(turma);
  };

  const getTiposEventoNomes = (tiposEventoJson: string) => {
    try {
      const ids = JSON.parse(tiposEventoJson);
      return ids.map((id: number) => {
        const tipo = tiposEvento?.find(t => t.id === id);
        return tipo?.nome || `ID ${id}`;
      }).join(", ");
    } catch {
      return "";
    }
  };

  const toggleTipoEvento = (id: number) => {
    if (tiposEventoSelecionados.includes(id)) {
      setTiposEventoSelecionados(tiposEventoSelecionados.filter(t => t !== id));
    } else {
      setTiposEventoSelecionados([...tiposEventoSelecionados, id]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reuniões Atendimento</h1>
          <p className="text-slate-500 mt-1">Gerencie as reuniões com as comissões de formatura</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-500 to-pink-600">
                <Plus className="h-4 w-4 mr-2" />
                Nova Reunião
              </Button>
            </DialogTrigger>
          </Dialog>
          <Button
            variant="outline"
            onClick={() => setVisualizacao(visualizacao === "lista" ? "calendario" : "lista")}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            {visualizacao === "lista" ? "Calendário" : "Lista"}
          </Button>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Reunião</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Turma *</Label>
                <Popover open={turmaSearchOpen} onOpenChange={setTurmaSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={turmaSearchOpen}
                      className="w-full justify-between"
                    >
                      {turmaId
                        ? getTurmaNome(turmaId)
                        : "Selecione a turma"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar turma..."
                        value={turmaSearch}
                        onValueChange={setTurmaSearch}
                      />
                      <CommandEmpty>Nenhuma turma encontrada.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-y-auto">
                        {turmas
                          ?.filter((turma: any) => {
                            if (!turmaSearch) return true;
                            const busca = turmaSearch.toLowerCase();
                            const nome = getTurmaNome(turma.id).toLowerCase();
                            return nome.includes(busca);
                          })
                          .map((turma: any) => (
                            <CommandItem
                              key={turma.id}
                              value={turma.id.toString()}
                              onSelect={() => {
                                setTurmaId(turma.id);
                                setTurmaSearchOpen(false);
                                setTurmaSearch("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  turmaId === turma.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {getTurmaNome(turma.id)}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data *</Label>
                  <Input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Horário *</Label>
                  <Input
                    type="time"
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Tipo de Evento *</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                  {tiposEvento?.filter((tipo: any) => tipo.nome && tipo.nome.trim() !== "").map((tipo: any) => (
                    <div key={tipo.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={tiposEventoSelecionados.includes(tipo.id)}
                        onCheckedChange={() => toggleTipoEvento(tipo.id)}
                      />
                      <label className="text-sm cursor-pointer" onClick={() => toggleTipoEvento(tipo.id)}>
                        {tipo.nome}
                      </label>
                    </div>
                  ))}
                </div>
                {tiposEventoSelecionados.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tiposEventoSelecionados.map(id => {
                      const tipo = tiposEvento?.find(t => t.id === id);
                      return (
                        <Badge key={id} variant="secondary">
                          {tipo?.nome}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <Label>Tipo da Reunião *</Label>
                <Select value={tipoReuniao} onValueChange={(v: any) => setTipoReuniao(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Presencial">Presencial</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-purple-500" />
            Lista de Reuniões
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : reunioes?.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma reunião cadastrada</p>
              <p className="text-sm mt-2">Clique em "Nova Reunião" para começar</p>
            </div>
          ) : visualizacao === "calendario" ? (
            <div className="text-center py-12 text-slate-400">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Visualização em Calendário</p>
              <p className="text-sm mt-2">Em desenvolvimento - Use a visualização em lista por enquanto</p>
            </div>
          ) : (
            <>
              {/* Filtros */}
              <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm">Buscar (Turma, Tipo Evento, Tipo Reunião)</Label>
                  <Input
                    placeholder="Digite para filtrar..."
                    value={filtroBuscaGeral}
                    onChange={(e) => setFiltroBuscaGeral(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <Label className="text-sm">Data Início</Label>
                  <Input
                    type="date"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label className="text-sm">Data Fim</Label>
                  <Input
                    type="date"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                  <TableRow className="bg-white">
                    <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => setOrdenacaoData(ordenacaoData === "asc" ? "desc" : "asc")}>
                      <div className="flex items-center gap-1">
                        Data
                        {ordenacaoData === "asc" ? (
                          <span className="text-xs">↑</span>
                        ) : (
                          <span className="text-xs">↓</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Tipo de Evento</TableHead>
                    <TableHead>Tipo da Reunião</TableHead>
                    <TableHead className="text-center">Qtd Reuniões</TableHead>
                    <TableHead className="text-center">Resumo</TableHead>
                    <TableHead className="text-center">Alinhamento</TableHead>
                    <TableHead className="text-center">Briefing</TableHead>
                    <TableHead className="text-center">Vendas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reunioes
                    ?.filter((reuniao: any) => {
                      // Filtro de busca geral
                      if (filtroBuscaGeral) {
                        const busca = filtroBuscaGeral.toLowerCase();
                        const turmaNome = getTurmaNome(reuniao.turmaId).toLowerCase();
                        const tiposEventoNomes = getTiposEventoNomes(reuniao.tiposEvento).toLowerCase();
                        const tipoReuniao = reuniao.tipoReuniao.toLowerCase();
                        
                        const match = turmaNome.includes(busca) || 
                                     tiposEventoNomes.includes(busca) || 
                                     tipoReuniao.includes(busca);
                        
                        if (!match) return false;
                      }
                      
                      // Filtros de data
                      if (filtroDataInicio && new Date(reuniao.data + 'T00:00:00') < new Date(filtroDataInicio + 'T00:00:00')) return false;
                      if (filtroDataFim && new Date(reuniao.data + 'T00:00:00') > new Date(filtroDataFim + 'T00:00:00')) return false;
                      return true;
                    })
                    .sort((a: any, b: any) => {
                      const dataA = new Date(a.data + 'T00:00:00').getTime();
                      const dataB = new Date(b.data + 'T00:00:00').getTime();
                      return ordenacaoData === "asc" ? dataA - dataB : dataB - dataA;
                    })
                    .map((reuniao: any) => (
                    <TableRow key={reuniao.id}>
                      <TableCell>{reuniao.data ? new Date(reuniao.data + 'T00:00:00').toLocaleDateString("pt-BR") : "-"}</TableCell>
                      <TableCell>{reuniao.horario}</TableCell>
                      <TableCell className="whitespace-normal break-words">{getTurmaNome(reuniao.turmaId)}</TableCell>
                      <TableCell className="whitespace-normal break-words">{getTiposEventoNomes(reuniao.tiposEvento)}</TableCell>
                      <TableCell>
                        <Badge variant={reuniao.tipoReuniao === "Presencial" ? "default" : "secondary"}>
                          {reuniao.tipoReuniao}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{reuniao.quantidadeReunioes || 0}</TableCell>
                      <TableCell className="text-center">
                        {reuniao.dataResumo ? new Date(reuniao.dataResumo + 'T00:00:00').toLocaleDateString("pt-BR") : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reuniao.alinhamento ? "✓" : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reuniao.dataBriefing ? new Date(reuniao.dataBriefing + 'T00:00:00').toLocaleDateString("pt-BR") : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {/* TODO: Contar vendas da reunião */}
                        0
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDetails(reuniao)}
                            title="Detalhes"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedReuniaoForVenda(reuniao);
                              setIsFormandoSelectOpen(true);
                            }}
                            title="Nova Venda"
                          >
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Deseja excluir esta reunião?")) {
                                deleteMutation.mutate({ id: reuniao.id });
                              }
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes (botão 📄) */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Reunião</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateDetails} className="space-y-4">
            <div>
              <Label>Quantidade de Reuniões</Label>
              <Input
                type="number"
                min="0"
                value={quantidadeReunioes}
                onChange={(e) => setQuantidadeReunioes(parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label>Data de Envio do Resumo</Label>
              <Input
                type="date"
                value={dataResumo}
                onChange={(e) => setDataResumo(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={alinhamento}
                onCheckedChange={(checked) => setAlinhamento(checked as boolean)}
              />
              <Label className="cursor-pointer" onClick={() => setAlinhamento(!alinhamento)}>
                Alinhamento
              </Label>
            </div>

            <div>
              <Label>Data de Envio do Briefing</Label>
              <Input
                type="date"
                value={dataBriefing}
                onChange={(e) => setDataBriefing(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Seleção de Formando */}
      <Dialog open={isFormandoSelectOpen} onOpenChange={setIsFormandoSelectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Formandos (Venda em Massa)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Selecione um ou mais formandos para registrar a venda:
            </p>
            {formandos && formandos.length > 0 ? (
              <div className="border rounded-md p-3 space-y-2 max-h-96 overflow-y-auto">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Checkbox
                    checked={selectedFormandoIds.length === formandos.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedFormandoIds(formandos.map((f: any) => f.id));
                      } else {
                        setSelectedFormandoIds([]);
                      }
                    }}
                  />
                  <label className="text-sm font-medium cursor-pointer" onClick={() => {
                    if (selectedFormandoIds.length === formandos.length) {
                      setSelectedFormandoIds([]);
                    } else {
                      setSelectedFormandoIds(formandos.map((f: any) => f.id));
                    }
                  }}>
                    Selecionar Todos ({formandos.length})
                  </label>
                </div>
                {formandos.map((formando: any) => (
                  <div key={formando.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedFormandoIds.includes(formando.id)}
                      onCheckedChange={() => {
                        if (selectedFormandoIds.includes(formando.id)) {
                          setSelectedFormandoIds(selectedFormandoIds.filter(id => id !== formando.id));
                        } else {
                          setSelectedFormandoIds([...selectedFormandoIds, formando.id]);
                        }
                      }}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => {
                      if (selectedFormandoIds.includes(formando.id)) {
                        setSelectedFormandoIds(selectedFormandoIds.filter(id => id !== formando.id));
                      } else {
                        setSelectedFormandoIds([...selectedFormandoIds, formando.id]);
                      }
                    }}>
                      {formando.nome}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Nenhum formando encontrado nesta turma.</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsFormandoSelectOpen(false);
                  setSelectedFormandoIds([]);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedFormandoIds.length === 0) {
                    toast.error("Selecione pelo menos um formando");
                    return;
                  }
                  
                  // Buscar primeiro evento da reunião para usar como eventoId
                  const primeiroEventoId = selectedReuniaoForVenda?.tiposEvento?.[0] || 0;
                  const primeiroFormando = formandos?.find((f: any) => f.id === selectedFormandoIds[0]);
                  
                  setVendaData({
                    eventoId: primeiroEventoId,
                    formandoId: selectedFormandoIds[0],
                    formandoNome: primeiroFormando?.nome || "",
                    reuniaoId: selectedReuniaoForVenda.id,
                  });
                  setIsFormandoSelectOpen(false);
                  setIsVendaOpen(true);
                }}
                disabled={selectedFormandoIds.length === 0}
              >
                Continuar ({selectedFormandoIds.length} selecionado{selectedFormandoIds.length !== 1 ? 's' : ''})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Formulário de Venda */}
      {vendaData && (
        <FormularioVenda
          open={isVendaOpen}
          onOpenChange={(open) => {
            setIsVendaOpen(open);
            if (!open) {
              setVendaData(null);
              setSelectedFormandoIds([]);
              setSelectedReuniaoForVenda(null);
            }
          }}
          eventoId={vendaData.eventoId}
          formandoId={vendaData.formandoId}
          formandoNome={vendaData.formandoNome}
          reuniaoId={vendaData.reuniaoId}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}
