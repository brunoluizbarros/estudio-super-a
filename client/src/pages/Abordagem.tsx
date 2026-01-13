import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { ClipboardList, Search, Check, ChevronsUpDown, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Abordagem() {
  const [selectedTurma, setSelectedTurma] = useState<string>("");
  const [selectedTipoEvento, setSelectedTipoEvento] = useState<string>("");
  const [search, setSearch] = useState("");
  const [turmaPopoverOpen, setTurmaPopoverOpen] = useState(false);
  const [turmaBusca, setTurmaBusca] = useState("");
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());

  const { data: turmas, isLoading: loadingTurmas } = trpc.turmas.list.useQuery();
  
  // Buscar eventos da turma selecionada
  const { data: eventosTurma, isLoading: loadingEventos } = trpc.eventos.listByTurma.useQuery(
    { turmaId: parseInt(selectedTurma) },
    { enabled: !!selectedTurma }
  );

  // Extrair tipos únicos de eventos
  const tiposEventosUnicos = useMemo(() => {
    if (!eventosTurma) return [];
    const tipos = new Set<string>();
    eventosTurma.forEach(e => {
      if (e.tipoEvento) tipos.add(e.tipoEvento);
    });
    return Array.from(tipos);
  }, [eventosTurma]);

  // Buscar primeiro evento do tipo selecionado
  const eventoSelecionado = useMemo(() => {
    if (!eventosTurma || !selectedTipoEvento) return null;
    return eventosTurma.find(e => e.tipoEvento === selectedTipoEvento) || null;
  }, [eventosTurma, selectedTipoEvento]);
  
  // Buscar grupos do briefing do evento selecionado
  const { data: grupos = [], isLoading: loadingGrupos } = trpc.briefing.listGrupos.useQuery(
    { eventoId: eventoSelecionado?.id || 0 },
    { enabled: !!eventoSelecionado }
  );
  
  // Buscar formandos do briefing do evento selecionado
  const { data: formandosBriefing = [], isLoading: loadingFormandos } = trpc.briefing.listFormandosByEvento.useQuery(
    { eventoId: eventoSelecionado?.id || 0 },
    { enabled: !!eventoSelecionado }
  );

  // Mutation para atualizar abordagem
  const utils = trpc.useUtils();
  const updateAbordagemMutation = trpc.briefing.updateAbordagem.useMutation({
    onSuccess: () => {
      // Invalidar queries para atualizar dados
      utils.briefing.listFormandosByEvento.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao salvar", {
        description: error.message || "Não foi possível salvar as alterações",
      });
    },
  });

  // Formatar tipo de evento
  const formatTipoEvento = (tipo: string) => {
    const tipos: Record<string, string> = {
      foto_estudio: "Foto Estúdio",
      foto_50: "Foto 50%",
      foto_descontrada: "Foto Descontraída",
      foto_oficial: "Foto Oficial",
      foto_samu: "Foto Samu",
      foto_bloco: "Foto Bloco",
      foto_consultorio: "Foto Consultório",
      foto_estrela: "Foto Estrela",
      foto_internato: "Foto Internato",
      family_day: "Family Day"
    };
    return tipos[tipo] || tipo;
  };

  // Formatar dados da turma
  const formatDadosTurma = (turma: any) => {
    if (!turma) return "";
    const codigo = turma.codigo || "";
    const cursos = turma.cursos ? JSON.parse(turma.cursos) : [];
    const instituicoes = turma.instituicoes ? JSON.parse(turma.instituicoes) : [];
    const numeroTurma = turma.numeroTurma || "";
    const anos = turma.anos ? JSON.parse(turma.anos) : [];
    const periodos = turma.periodos ? JSON.parse(turma.periodos) : [];
    
    const curso = cursos[0] || "";
    const instituicao = instituicoes[0] || "";
    const ano = anos[0] || "";
    const periodo = periodos[0] || "";
    
    return `${codigo} - ${curso} ${instituicao} ${numeroTurma} ${ano}.${periodo}`.trim();
  };

  // Criar mapa de grupos por ID
  const gruposMap = useMemo(() => {
    const map: Record<number, typeof grupos[0]> = {};
    grupos.forEach(g => {
      map[g.id] = g;
    });
    return map;
  }, [grupos]);

  // Agrupar formandos por grupo
  const formandosPorGrupo = useMemo(() => {
    const agrupados: Record<number, typeof formandosBriefing> = {};
    formandosBriefing.forEach(f => {
      if (!agrupados[f.grupoId]) {
        agrupados[f.grupoId] = [];
      }
      agrupados[f.grupoId].push(f);
    });
    return agrupados;
  }, [formandosBriefing]);

  // Filtrar grupos e formandos por busca
  const gruposFiltrados = useMemo(() => {
    if (!search) {
      return grupos.map(g => ({
        grupo: g,
        formandos: formandosPorGrupo[g.id] || []
      }));
    }
    
    const searchLower = search.toLowerCase();
    return grupos
      .map(g => ({
        grupo: g,
        formandos: (formandosPorGrupo[g.id] || []).filter(f => 
          f.formandoNome?.toLowerCase().includes(searchLower)
        )
      }))
      .filter(g => g.formandos.length > 0);
  }, [grupos, formandosPorGrupo, search]);

  // Contar total de formandos filtrados
  const totalFormandosFiltrados = useMemo(() => {
    return gruposFiltrados.reduce((acc, g) => acc + g.formandos.length, 0);
  }, [gruposFiltrados]);

  // Handler para mudança de turma
  const handleTurmaChange = (turmaId: string) => {
    setSelectedTurma(turmaId);
    setSelectedTipoEvento("");
    setSearch("");
  };

  // Handler para mudança de tipo de evento
  const handleTipoEventoChange = (tipo: string) => {
    setSelectedTipoEvento(tipo);
    setSearch("");
  };

  // Formatar data do grupo
  const formatDataGrupo = (data: Date | string | null) => {
    if (!data) return "-";
    return new Date(data).toLocaleDateString('pt-BR');
  };

  // Handler para atualizar campo de abordagem
  const handleUpdateField = async (
    formandoId: number,
    field: string,
    value: any
  ) => {
    const fieldKey = `${formandoId}-${field}`;
    setSavingFields(prev => new Set(prev).add(fieldKey));

    try {
      await updateAbordagemMutation.mutateAsync({
        id: formandoId,
        [field]: value,
      });
    } finally {
      setSavingFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldKey);
        return newSet;
      });
    }
  };

  // Verificar se um campo está sendo salvo
  const isFieldSaving = (formandoId: number, field: string) => {
    return savingFields.has(`${formandoId}-${field}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-md">
            <ClipboardList className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Abordagem</h1>
            <p className="text-sm text-slate-500">Planejamento e organização dos grupos</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Seleção de Turma com Combobox */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Turma</Label>
              <Popover open={turmaPopoverOpen} onOpenChange={setTurmaPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={turmaPopoverOpen}
                    className="w-full justify-between h-10 text-left font-normal"
                  >
                    {selectedTurma && turmas
                      ? formatDadosTurma(turmas.find((t) => t.id.toString() === selectedTurma))
                      : "Selecione a turma"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Buscar turma..." 
                      value={turmaBusca}
                      onValueChange={setTurmaBusca}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhuma turma encontrada.</CommandEmpty>
                      <CommandGroup>
                        {turmas
                          ?.filter((turma) => {
                            if (!turmaBusca) return true;
                            const searchLower = turmaBusca.toLowerCase();
                            const turmaStr = formatDadosTurma(turma).toLowerCase();
                            return turmaStr.includes(searchLower);
                          })
                          .map((turma) => (
                            <CommandItem
                              key={turma.id}
                              value={turma.id.toString()}
                              onSelect={(currentValue) => {
                                handleTurmaChange(currentValue === selectedTurma ? "" : currentValue);
                                setTurmaPopoverOpen(false);
                                setTurmaBusca("");
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedTurma === turma.id.toString() ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {formatDadosTurma(turma)}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Seleção de Tipo de Evento */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Tipo de Evento</Label>
              <Select value={selectedTipoEvento} onValueChange={handleTipoEventoChange} disabled={!selectedTurma}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposEventosUnicos.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {formatTipoEvento(tipo)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Busca de Formando */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Buscar Formando</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Digite o nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10"
                  disabled={!selectedTipoEvento}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Formandos */}
      {selectedTurma && selectedTipoEvento && (
        <>
          {loadingGrupos || loadingFormandos ? (
            <Card className="border-0 shadow-md">
              <CardContent className="py-12">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </CardContent>
            </Card>
          ) : totalFormandosFiltrados === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <Users className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum formando encontrado</p>
                  <p className="text-sm mt-1">
                    {search ? "Tente uma busca diferente" : "Crie grupos para este evento no Briefing"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {gruposFiltrados.map(({ grupo, formandos }) => (
                <Card key={grupo.id} className="border-0 shadow-md">
                  {/* Cabeçalho do Grupo */}
                  <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                        <Users className="h-5 w-5 text-white inline mr-2" />
                        <span className="text-white font-bold text-lg">Grupo {grupo.numero}</span>
                      </div>
                      <div className="text-white text-sm">
                        <span className="font-medium">Data do Grupo:</span> {formatDataGrupo(grupo.dataGrupo)}
                      </div>
                      <div className="text-white text-sm">
                        <span className="font-medium">Horário Formandos:</span> {grupo.horarioFormandos || "-"}
                      </div>
                    </div>
                    <div className="text-white text-sm font-medium">
                      {formandos.length} / {grupo.limiteFormandos || 9} formandos
                    </div>
                  </div>

                  {/* Tabela de Formandos do Grupo */}
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="text-xs font-semibold text-slate-700 py-3 px-4 min-w-[180px]">Formando</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-700 py-3 px-4 min-w-[120px]">Pacote</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-700 py-3 px-4 text-center min-w-[80px]">Make F.</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-700 py-3 px-4 text-center min-w-[80px]">Cab. F.</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-700 py-3 px-4 text-center min-w-[90px]">Cab. Simples</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-700 py-3 px-4 text-center min-w-[100px]">Cab. Combinado</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-700 py-3 px-4 text-center min-w-[90px]">Make Família</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-700 py-3 px-4 text-center min-w-[100px]">Qtd Família</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-700 py-3 px-4 min-w-[90px]">Limite</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formandos.map((formando) => (
                            <TableRow key={formando.id} className="hover:bg-slate-50">
                              {/* Formando */}
                              <TableCell className="py-3 px-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-slate-900">{formando.formandoNome || "-"}</span>
                                  <span className="text-xs text-slate-500">{formando.formandoTelefone || "-"}</span>
                                </div>
                              </TableCell>
                              
                              {/* Pacote - Espelha campo 'pacote' do Briefing (que espelha Formandos) */}
                              <TableCell className="py-3 px-4">
                                <span className="text-xs text-slate-700">
                                  {formando.formandoPacote || "-"}
                                </span>
                              </TableCell>
                              
                              {/* Make Formando - EDITÁVEL */}
                              <TableCell className="py-3 px-4 text-center">
                                <div className="flex justify-center">
                                  <button
                                    onClick={() => handleUpdateField(formando.id, "abordagemMakeFormando", !(formando.abordagemMakeFormando ?? formando.makeFormando))}
                                    disabled={isFieldSaving(formando.id, "abordagemMakeFormando")}
                                    className="relative"
                                  >
                                    {(formando.abordagemMakeFormando ?? formando.makeFormando) ? (
                                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer">
                                        <Check className="h-3 w-3 text-white" />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-blue-400 transition-colors cursor-pointer" />
                                    )}
                                    {isFieldSaving(formando.id, "abordagemMakeFormando") && (
                                      <Loader2 className="absolute -right-4 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-slate-400" />
                                    )}
                                  </button>
                                </div>
                              </TableCell>
                              
                              {/* Cabelo Formando - EDITÁVEL */}
                              <TableCell className="py-3 px-4 text-center">
                                <div className="flex justify-center">
                                  <button
                                    onClick={() => handleUpdateField(formando.id, "abordagemCabeloFormando", !(formando.abordagemCabeloFormando ?? formando.cabeloFormando))}
                                    disabled={isFieldSaving(formando.id, "abordagemCabeloFormando")}
                                    className="relative"
                                  >
                                    {(formando.abordagemCabeloFormando ?? formando.cabeloFormando) ? (
                                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer">
                                        <Check className="h-3 w-3 text-white" />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-blue-400 transition-colors cursor-pointer" />
                                    )}
                                    {isFieldSaving(formando.id, "abordagemCabeloFormando") && (
                                      <Loader2 className="absolute -right-4 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-slate-400" />
                                    )}
                                  </button>
                                </div>
                              </TableCell>
                              
                              {/* Cabelo Simples - EDITÁVEL */}
                              <TableCell className="py-3 px-4 text-center">
                                <div className="relative flex justify-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={formando.abordagemQtdCabeloSimples ?? formando.qtdCabeloSimples ?? 0}
                                    onChange={(e) => handleUpdateField(formando.id, "abordagemQtdCabeloSimples", parseInt(e.target.value) || 0)}
                                    className="h-8 text-xs w-16 text-center"
                                    disabled={isFieldSaving(formando.id, "abordagemQtdCabeloSimples")}
                                  />
                                  {isFieldSaving(formando.id, "abordagemQtdCabeloSimples") && (
                                    <Loader2 className="absolute -right-4 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-slate-400" />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Cabelo Combinado - EDITÁVEL */}
                              <TableCell className="py-3 px-4 text-center">
                                <div className="relative flex justify-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={formando.abordagemQtdCabeloCombinado ?? formando.qtdCabeloCombinado ?? 0}
                                    onChange={(e) => handleUpdateField(formando.id, "abordagemQtdCabeloCombinado", parseInt(e.target.value) || 0)}
                                    className="h-8 text-xs w-16 text-center"
                                    disabled={isFieldSaving(formando.id, "abordagemQtdCabeloCombinado")}
                                  />
                                  {isFieldSaving(formando.id, "abordagemQtdCabeloCombinado") && (
                                    <Loader2 className="absolute -right-4 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-slate-400" />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Make Família - EDITÁVEL */}
                              <TableCell className="py-3 px-4 text-center">
                                <div className="relative flex justify-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={formando.abordagemQtdMakeFamilia ?? formando.qtdMakeFamilia ?? 0}
                                    onChange={(e) => handleUpdateField(formando.id, "abordagemQtdMakeFamilia", parseInt(e.target.value) || 0)}
                                    className="h-8 text-xs w-16 text-center"
                                    disabled={isFieldSaving(formando.id, "abordagemQtdMakeFamilia")}
                                  />
                                  {isFieldSaving(formando.id, "abordagemQtdMakeFamilia") && (
                                    <Loader2 className="absolute -right-4 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-slate-400" />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Qtd Família - EDITÁVEL */}
                              <TableCell className="py-3 px-4 text-center">
                                <div className="relative flex justify-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={formando.abordagemQtdFamilia ?? formando.qtdFamilia ?? 0}
                                    onChange={(e) => handleUpdateField(formando.id, "abordagemQtdFamilia", parseInt(e.target.value) || 0)}
                                    className="h-8 text-xs w-16 text-center"
                                    disabled={isFieldSaving(formando.id, "abordagemQtdFamilia")}
                                  />
                                  {isFieldSaving(formando.id, "abordagemQtdFamilia") && (
                                    <Loader2 className="absolute -right-4 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-slate-400" />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Limite */}
                              <TableCell className="py-3 px-4 text-xs text-slate-600 text-center">
                                {grupo.limiteFormandos || 9}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Estado inicial - sem seleção */}
      {!selectedTurma && (
        <Card className="border-0 shadow-md">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-slate-400">
              <ClipboardList className="h-20 w-20 mb-4 opacity-30" />
              <p className="text-lg font-medium">Selecione uma turma para começar</p>
              <p className="text-sm mt-1">
                Escolha a turma e o tipo de evento para visualizar os grupos
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
