import { useState, useMemo } from "react";
import { useRef } from "react";
import { trpc } from "@/lib/trpc";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { ObservationField } from "@/components/ObservationField";
import { Plus, Search, Users, Edit, Trash2, Eye, X, Check, ChevronsUpDown, ArrowUpDown, ArrowUp, ArrowDown, Download, Upload, UserPlus } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { PermissionGate } from "@/components/PermissionGate";

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

// Helper para parsear JSON com fallback
const parseJsonArray = (value: string | null | undefined): string[] => {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

const parseJsonNumberArray = (value: string | null | undefined): number[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((v: any) => typeof v === 'string' ? parseInt(v, 10) : Number(v)) : [];
  } catch {
    return [];
  }
};

type SortField = "codigo" | "curso" | "instituicao" | "cidade" | "ano";
type SortDirection = "asc" | "desc" | null;

export default function Turmas() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<any>(null);
  
  // Ordenação
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // Campos de múltipla seleção
  const [cursos, setCursos] = useState<string[]>([]);
  const [instituicoes, setInstituicoes] = useState<string[]>([]);
  const [anos, setAnos] = useState<number[]>([]);
  const [periodos, setPeriodos] = useState<("1" | "2")[]>([]);
  
  // Popovers abertos
  const [cursoPopoverOpen, setCursoPopoverOpen] = useState(false);
  const [instituicaoPopoverOpen, setInstituicaoPopoverOpen] = useState(false);
  const [cidadePopoverOpen, setCidadePopoverOpen] = useState(false);
  
  // Inputs temporários
  const [anoInput, setAnoInput] = useState(new Date().getFullYear());
  
  // Outros campos
  const [codigo, setCodigo] = useState("");
  const [numeroTurma, setNumeroTurma] = useState("");
  const [cidadeId, setCidadeId] = useState<number | null>(null);
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  
  // Upload de formandos
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Formulário de incluir formando
  const [showFormandoForm, setShowFormandoForm] = useState(false);
  const [formandoNome, setFormandoNome] = useState("");
  const [formandoCpf, setFormandoCpf] = useState("");
  const [formandoTelefone, setFormandoTelefone] = useState("");
  const [formandoEmail, setFormandoEmail] = useState("");
  const [formandoStatus, setFormandoStatus] = useState<"apto" | "inapto" | "migracao" | "">("");
  const [formandoPacote, setFormandoPacote] = useState<string>("");
  
  // Novos campos de Turma
  const [fotosInclusas, setFotosInclusas] = useState<"todas" | "30" | "20" | "10" | null>(null);
  const [observacao, setObservacao] = useState("");
  
  // Valores de serviços de Make e Cabelo (em reais, convertido para centavos ao salvar)
  const [valorMakeFormandoMasc, setValorMakeFormandoMasc] = useState<string>("");
  
  // Pacotes e Eventos Inclusos
  const [pacotes, setPacotes] = useState<Array<{nome: string, tiposEventos: string[]}>>([]);
  const [valorMakeFormandoFem, setValorMakeFormandoFem] = useState<string>("");
  const [valorMakeFamilia, setValorMakeFamilia] = useState<string>("");
  const [valorCabeloSimples, setValorCabeloSimples] = useState<string>("");
  const [valorCabeloCombinado, setValorCabeloCombinado] = useState<string>("");
  const [valorRetoque, setValorRetoque] = useState<string>("");
  
  // Buscar dados dos cadastros
  const { data: turmas, isLoading, refetch } = trpc.turmas.list.useQuery();
  const { data: cursosCadastro } = trpc.cursosCadastro.list.useQuery();
  const { data: instituicoesCadastro } = trpc.instituicoes.list.useQuery();
  const { data: cidadesCadastro } = trpc.cidades.list.useQuery();
  
  const createMutation = trpc.turmas.create.useMutation({
    onSuccess: () => {
      toast.success("Turma criada com sucesso!");
      setIsOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar turma: ${error.message}`);
    },
  });
  const updateMutation = trpc.turmas.update.useMutation({
    onSuccess: () => {
      toast.success("Turma atualizada com sucesso!");
      setEditingTurma(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar turma: ${error.message}`);
    },
  });
  const deleteMutation = trpc.turmas.delete.useMutation({
    onSuccess: () => {
      toast.success("Turma excluída com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir turma: ${error.message}`);
    },
  });
  
  const createFormandoMutation = trpc.formandos.create.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar formando: ${error.message}`);
    },
  });

  const resetForm = () => {
    setCodigo("");
    setCursos([]);
    setInstituicoes([]);
    setNumeroTurma("");
    setAnos([]);
    setPeriodos([]);
    setCidade("");
    setEstado("");
    setCidadeId(null);
    setAnoInput(new Date().getFullYear());
    setFotosInclusas(null);
    setObservacao("");
    // Limpar valores de Make e Cabelo
    setValorMakeFormandoMasc("");
    setValorMakeFormandoFem("");
    setValorMakeFamilia("");
    setValorCabeloSimples("");
    setValorCabeloCombinado("");
    setValorRetoque("");
    setPacotes([]);
  };

  // Função para baixar modelo de planilha
  const handleDownloadModelo = () => {
    const headers = ["Nome", "CPF", "E-mail", "Telefone", "Pacote", "Status", "Gênero", "Comissão"];
    const csvContent = headers.join(";") + "\n";
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_formandos.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Modelo de planilha baixado!");
  };

  // Função para alternar ordenação
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Ícone de ordenação
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="ml-1 h-3 w-3" />;
    }
    return <ArrowDown className="ml-1 h-3 w-3" />;
  };

  // Filtrar e ordenar turmas
  const filteredAndSortedTurmas = useMemo(() => {
    if (!turmas) return [];
    
    // Filtrar em todas as colunas
    let result = turmas.filter((t) => {
      const cursosArr = parseJsonArray(t.cursos);
      const instituicoesArr = parseJsonArray(t.instituicoes);
      const anosArr = parseJsonNumberArray(t.anos);
      const periodosArr = parseJsonArray(t.periodos);
      const searchLower = search.toLowerCase();
      
      return (
        // Código
        t.codigo.toLowerCase().includes(searchLower) ||
        // Cursos
        cursosArr.some(c => c.toLowerCase().includes(searchLower)) ||
        // Instituições
        instituicoesArr.some(i => i.toLowerCase().includes(searchLower)) ||
        // Número da turma
        t.numeroTurma?.toString().includes(searchLower) ||
        // Anos
        anosArr.some(a => a.toString().includes(searchLower)) ||
        // Períodos
        periodosArr.some(p => p.includes(searchLower)) ||
        // Cidade
        t.cidade?.toLowerCase().includes(searchLower) ||
        // Estado
        t.estado?.toLowerCase().includes(searchLower)
      );
    });
    
    // Ordenar
    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        let valueA: string | number = "";
        let valueB: string | number = "";
        
        switch (sortField) {
          case "codigo":
            valueA = a.codigo || "";
            valueB = b.codigo || "";
            break;
          case "curso":
            valueA = parseJsonArray(a.cursos)[0] || "";
            valueB = parseJsonArray(b.cursos)[0] || "";
            break;
          case "instituicao":
            valueA = parseJsonArray(a.instituicoes)[0] || "";
            valueB = parseJsonArray(b.instituicoes)[0] || "";
            break;
          case "cidade":
            valueA = `${a.cidade} ${a.estado}`;
            valueB = `${b.cidade} ${b.estado}`;
            break;
          case "ano":
            valueA = parseJsonNumberArray(a.anos)[0] || 0;
            valueB = parseJsonNumberArray(b.anos)[0] || 0;
            break;
        }
        
        if (typeof valueA === "string" && typeof valueB === "string") {
          const comparison = valueA.localeCompare(valueB, "pt-BR", { sensitivity: "base" });
          return sortDirection === "asc" ? comparison : -comparison;
        }
        
        if (typeof valueA === "number" && typeof valueB === "number") {
          return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
        }
        
        return 0;
      });
    }
    
    return result;
  }, [turmas, search, sortField, sortDirection]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (cursos.length === 0) {
      toast.error("Selecione pelo menos um curso");
      return;
    }
    if (instituicoes.length === 0) {
      toast.error("Selecione pelo menos uma instituição");
      return;
    }
    if (anos.length === 0) {
      toast.error("Adicione pelo menos um ano");
      return;
    }
    if (periodos.length === 0) {
      toast.error("Selecione pelo menos um período");
      return;
    }
    if (!cidade || !estado) {
      toast.error("Selecione uma cidade");
      return;
    }

    const data = {
      codigo,
      cursos,
      instituicoes,
      numeroTurma: numeroTurma || undefined,
      anos: anos.map(a => typeof a === 'string' ? parseInt(a, 10) : a),
      periodos,
      cidade,
      estado,
      fotosInclusas: fotosInclusas || undefined,
      observacao: observacao || undefined,
      // Converter valores de reais para centavos
      valorMakeFormandoMasc: valorMakeFormandoMasc ? Math.round(parseFloat(valorMakeFormandoMasc.replace(',', '.')) * 100) : undefined,
      valorMakeFormandoFem: valorMakeFormandoFem ? Math.round(parseFloat(valorMakeFormandoFem.replace(',', '.')) * 100) : undefined,
      valorMakeFamilia: valorMakeFamilia ? Math.round(parseFloat(valorMakeFamilia.replace(',', '.')) * 100) : undefined,
      valorCabeloSimples: valorCabeloSimples ? Math.round(parseFloat(valorCabeloSimples.replace(',', '.')) * 100) : undefined,
      valorCabeloCombinado: valorCabeloCombinado ? Math.round(parseFloat(valorCabeloCombinado.replace(',', '.')) * 100) : undefined,
      valorRetoque: valorRetoque ? Math.round(parseFloat(valorRetoque.replace(',', '.')) * 100) : undefined,
      // Pacotes e Eventos
      pacotesConfig: pacotes.length > 0 ? JSON.stringify(pacotes) : null,
    };

    if (editingTurma) {
      updateMutation.mutate({ id: editingTurma.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (turma: any) => {
    setCodigo(turma.codigo);
    setCursos(parseJsonArray(turma.cursos));
    setInstituicoes(parseJsonArray(turma.instituicoes));
    setNumeroTurma(turma.numeroTurma || "");
    setAnos(parseJsonNumberArray(turma.anos));
    setPeriodos(parseJsonArray(turma.periodos) as ("1" | "2")[]);
    setCidade(turma.cidade);
    setEstado(turma.estado);
    setFotosInclusas(turma.fotosInclusas || null);
    setObservacao(turma.observacao || "");
    // Carregar valores de Make e Cabelo (converter de centavos para reais)
    setValorMakeFormandoMasc(turma.valorMakeFormandoMasc ? (turma.valorMakeFormandoMasc / 100).toFixed(2).replace('.', ',') : "");
    setValorMakeFormandoFem(turma.valorMakeFormandoFem ? (turma.valorMakeFormandoFem / 100).toFixed(2).replace('.', ',') : "");
    setValorMakeFamilia(turma.valorMakeFamilia ? (turma.valorMakeFamilia / 100).toFixed(2).replace('.', ',') : "");
    setValorCabeloSimples(turma.valorCabeloSimples ? (turma.valorCabeloSimples / 100).toFixed(2).replace('.', ',') : "");
    setValorCabeloCombinado(turma.valorCabeloCombinado ? (turma.valorCabeloCombinado / 100).toFixed(2).replace('.', ',') : "");
    setValorRetoque(turma.valorRetoque ? (turma.valorRetoque / 100).toFixed(2).replace('.', ',') : "");
    // Carregar pacotes e eventos
    setPacotes(turma.pacotesConfig ? JSON.parse(turma.pacotesConfig) : []);
    setEditingTurma(turma);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta turma?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditingTurma(null);
      resetForm();
    }
  };

  const toggleCurso = (cursoNome: string) => {
    if (cursos.includes(cursoNome)) {
      setCursos(cursos.filter(c => c !== cursoNome));
    } else {
      setCursos([...cursos, cursoNome]);
    }
  };

  const toggleInstituicao = (instNome: string) => {
    if (instituicoes.includes(instNome)) {
      setInstituicoes(instituicoes.filter(i => i !== instNome));
    } else {
      setInstituicoes([...instituicoes, instNome]);
    }
  };

  const selectCidade = (cid: { id: number; nome: string; estado: string }) => {
    setCidadeId(cid.id);
    setCidade(cid.nome);
    setEstado(cid.estado);
    setCidadePopoverOpen(false);
  };

  const addAno = () => {
    if (anoInput && !anos.includes(anoInput)) {
      setAnos([...anos, anoInput].sort((a, b) => a - b));
    }
  };

  const togglePeriodo = (p: "1" | "2") => {
    if (periodos.includes(p)) {
      setPeriodos(periodos.filter(x => x !== p));
    } else {
      setPeriodos([...periodos, p].sort());
    }
  };

  // Cursos ativos do cadastro
  const cursosAtivos = cursosCadastro?.filter(c => c.ativo) || [];
  // Instituições ativas do cadastro
  const instituicoesAtivas = instituicoesCadastro?.filter(i => i.ativo) || [];
  // Cidades ativas do cadastro
  const cidadesAtivas = cidadesCadastro?.filter(c => c.ativo) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Turmas</h1>
          <p className="text-slate-500 mt-1">Gerencie as turmas de formatura</p>
        </div>
        <PermissionGate secao="turmas" permission="inserir">
          <Dialog open={isOpen || !!editingTurma} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                <Plus className="h-4 w-4 mr-2" />
                Nova Turma
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTurma ? "Editar Turma" : "Nova Turma"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    required
                    placeholder="Ex: MED2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroTurma">Nº da Turma</Label>
                  <Input
                    id="numeroTurma"
                    value={numeroTurma}
                    onChange={(e) => setNumeroTurma(e.target.value)}
                    placeholder="Ex: 01"
                  />
                </div>
              </div>
              
              {/* Cursos - Seleção do Cadastro */}
              <div className="space-y-2">
                <Label>Cursos *</Label>
                <Popover open={cursoPopoverOpen} onOpenChange={setCursoPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={cursoPopoverOpen}
                      className="w-full justify-between"
                    >
                      {cursos.length > 0
                        ? `${cursos.length} curso(s) selecionado(s)`
                        : "Selecione os cursos..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar curso..." />
                      <CommandList>
                        <CommandEmpty>Nenhum curso encontrado.</CommandEmpty>
                        <CommandGroup>
                          {cursosAtivos.map((curso) => (
                            <CommandItem
                              key={curso.id}
                              value={curso.nome}
                              onSelect={() => toggleCurso(curso.nome)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  cursos.includes(curso.nome) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {curso.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {cursos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {cursos.map((curso, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                        {curso}
                        <button
                          type="button"
                          className="ml-1 hover:text-red-500"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCursos(cursos.filter((_, i) => i !== idx));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Instituições - Seleção do Cadastro */}
              <div className="space-y-2">
                <Label>Instituições *</Label>
                <Popover open={instituicaoPopoverOpen} onOpenChange={setInstituicaoPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={instituicaoPopoverOpen}
                      className="w-full justify-between"
                    >
                      {instituicoes.length > 0
                        ? `${instituicoes.length} instituição(ões) selecionada(s)`
                        : "Selecione as instituições..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar instituição..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma instituição encontrada.</CommandEmpty>
                        <CommandGroup>
                          {instituicoesAtivas.map((inst) => (
                            <CommandItem
                              key={inst.id}
                              value={inst.nome}
                              onSelect={() => toggleInstituicao(inst.nome)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  instituicoes.includes(inst.nome) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {inst.nome} {inst.sigla && `(${inst.sigla})`}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {instituicoes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {instituicoes.map((inst, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                        {inst}
                        <button
                          type="button"
                          className="ml-1 hover:text-red-500"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setInstituicoes(instituicoes.filter((_, i) => i !== idx));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Anos - Múltipla Seleção */}
              <div className="space-y-2">
                <Label>Anos de Conclusão *</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={anoInput}
                    onChange={(e) => setAnoInput(parseInt(e.target.value) || new Date().getFullYear())}
                    min={2000}
                    max={2100}
                    className="w-32"
                  />
                  <Button type="button" variant="outline" onClick={addAno}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {anos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {anos.map((ano, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                        {ano}
                        <button
                          type="button"
                          className="ml-1 hover:text-red-500"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setAnos(anos.filter((_, i) => i !== idx));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Períodos - Múltipla Seleção */}
              <div className="space-y-2">
                <Label>Períodos *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={periodos.includes("1") ? "default" : "outline"}
                    onClick={() => togglePeriodo("1")}
                    className={periodos.includes("1") ? "bg-amber-500 hover:bg-amber-600" : ""}
                  >
                    1 Semestre
                  </Button>
                  <Button
                    type="button"
                    variant={periodos.includes("2") ? "default" : "outline"}
                    onClick={() => togglePeriodo("2")}
                    className={periodos.includes("2") ? "bg-amber-500 hover:bg-amber-600" : ""}
                  >
                    2 Semestre
                  </Button>
                </div>
              </div>
              
              {/* Cidade - Seleção do Cadastro */}
              <div className="space-y-2">
                <Label>Cidade *</Label>
                <Popover open={cidadePopoverOpen} onOpenChange={setCidadePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={cidadePopoverOpen}
                      className="w-full justify-between"
                    >
                      {cidade
                        ? `${cidade} (${estado})`
                        : "Selecione a cidade..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar cidade..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                        <CommandGroup>
                          {cidadesAtivas.map((cid) => (
                            <CommandItem
                              key={cid.id}
                              value={`${cid.nome} ${cid.estado}`}
                              onSelect={() => selectCidade(cid)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  cidade === cid.nome && estado === cid.estado ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {cid.nome} ({cid.estado})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Fotos Inclusas */}
              <div className="space-y-2">
                <Label>Fotos Inclusas</Label>
                <Select
                  value={fotosInclusas || ""}
                  onValueChange={(value) => setFotosInclusas(value as "todas" | "30" | "20" | "10" | null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a quantidade de fotos..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Fotos</SelectItem>
                    <SelectItem value="30">30 fotos</SelectItem>
                    <SelectItem value="20">20 fotos</SelectItem>
                    <SelectItem value="10">10 fotos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Observação */}
              <ObservationField
                value={observacao}
                onChange={setObservacao}
                label="Observações"
                placeholder="Digite observações sobre a turma..."
                isSaving={createMutation.isPending || updateMutation.isPending}
              />
              
              {/* Valores de Serviços - Make e Cabelo */}
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium text-slate-700 mb-3">Valores de Serviços (Make e Cabelo)</p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Make Formando Masculino */}
                  <div className="space-y-2">
                    <Label htmlFor="valorMakeFormandoMasc">Make Formando Masc.</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                      <Input
                        id="valorMakeFormandoMasc"
                        value={valorMakeFormandoMasc}
                        onChange={(e) => setValorMakeFormandoMasc(e.target.value)}
                        placeholder="0,00"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  {/* Make Formando Feminino */}
                  <div className="space-y-2">
                    <Label htmlFor="valorMakeFormandoFem">Make Formando Fem.</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                      <Input
                        id="valorMakeFormandoFem"
                        value={valorMakeFormandoFem}
                        onChange={(e) => setValorMakeFormandoFem(e.target.value)}
                        placeholder="0,00"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  {/* Make Família */}
                  <div className="space-y-2">
                    <Label htmlFor="valorMakeFamilia">Make Família</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                      <Input
                        id="valorMakeFamilia"
                        value={valorMakeFamilia}
                        onChange={(e) => setValorMakeFamilia(e.target.value)}
                        placeholder="0,00"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  {/* Cabelo Simples */}
                  <div className="space-y-2">
                    <Label htmlFor="valorCabeloSimples">Cabelo Simples</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                      <Input
                        id="valorCabeloSimples"
                        value={valorCabeloSimples}
                        onChange={(e) => setValorCabeloSimples(e.target.value)}
                        placeholder="0,00"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  {/* Cabelo Combinado */}
                  <div className="space-y-2">
                    <Label htmlFor="valorCabeloCombinado">Cabelo Combinado</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                      <Input
                        id="valorCabeloCombinado"
                        value={valorCabeloCombinado}
                        onChange={(e) => setValorCabeloCombinado(e.target.value)}
                        placeholder="0,00"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  {/* Retoque */}
                  <div className="space-y-2">
                    <Label htmlFor="valorRetoque">Retoque</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                      <Input
                        id="valorRetoque"
                        value={valorRetoque}
                        onChange={(e) => setValorRetoque(e.target.value)}
                        placeholder="0,00"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Seção de Pacotes e Eventos Inclusos */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">📦 Pacotes e Eventos Inclusos</p>
                    <p className="text-xs text-slate-500 mt-0.5">Configure quais tipos de eventos estão incluídos em cada pacote</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPacotes([...pacotes, { nome: "", tiposEventos: [] }]);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar Pacote
                  </Button>
                </div>
                
                {pacotes.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed rounded-lg">
                    <p className="text-sm text-slate-400">Nenhum pacote configurado</p>
                    <p className="text-xs text-slate-400 mt-1">Clique em "Adicionar Pacote" para começar</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pacotes.map((pacote, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-slate-50">
                        <div className="flex items-center gap-2 mb-3">
                          <Input
                            placeholder="Nome do Pacote (ex: Completo, Premium, Básico)"
                            value={pacote.nome}
                            onChange={(e) => {
                              const novos = [...pacotes];
                              novos[index].nome = e.target.value;
                              setPacotes(novos);
                            }}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setPacotes(pacotes.filter((_, i) => i !== index));
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-600 mb-2">Eventos incluídos:</p>
                          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Seleção de eventos incluídos no pacote">
                            {[
                              { value: "foto_estudio", label: "Foto Estúdio" },
                              { value: "foto_50", label: "Foto 50" },
                              { value: "foto_descontrada", label: "Foto Descontraída" },
                              { value: "foto_oficial", label: "Foto Oficial" },
                              { value: "foto_samu", label: "Foto SAMU" },
                              { value: "foto_bloco", label: "Foto Bloco" },
                              { value: "foto_consultorio", label: "Consultório" },
                            ].map((evento) => (
                              <label key={evento.value} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-2 rounded">
                                <input
                                  type="checkbox"
                                  checked={pacote.tiposEventos.includes(evento.value)}
                                  onChange={(e) => {
                                    const novos = [...pacotes];
                                    if (e.target.checked) {
                                      novos[index].tiposEventos = [...novos[index].tiposEventos, evento.value];
                                    } else {
                                      novos[index].tiposEventos = novos[index].tiposEventos.filter(t => t !== evento.value);
                                    }
                                    setPacotes(novos);
                                  }}
                                  className="rounded border-slate-300"
                                />
                                <span className="text-slate-700">{evento.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-slate-500 mb-2">Gerenciar Formandos</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadModelo}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Modelo Planilha
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!editingTurma) {
                        toast.info("Salve a turma primeiro para importar formandos");
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    disabled={isUploading || !editingTurma}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? "Importando..." : "Upload Dados Formando"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!editingTurma) {
                        toast.info("Salve a turma primeiro para incluir formandos");
                        return;
                      }
                      setShowFormandoForm(!showFormandoForm);
                    }}
                    disabled={!editingTurma}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Incluir Formando
                  </Button>
                </div>
                
                {showFormandoForm && editingTurma && (
                  <div className="mt-4 p-4 border rounded-lg bg-slate-50">
                    <p className="text-sm font-medium mb-3">Novo Formando</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Nome *</Label>
                        <Input
                          value={formandoNome}
                          onChange={(e) => setFormandoNome(e.target.value)}
                          placeholder="Nome completo"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">CPF</Label>
                        <Input
                          value={formandoCpf}
                          onChange={(e) => setFormandoCpf(e.target.value)}
                          placeholder="000.000.000-00"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Telefone</Label>
                        <Input
                          value={formandoTelefone}
                          onChange={(e) => setFormandoTelefone(e.target.value)}
                          placeholder="(00) 00000-0000"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">E-mail</Label>
                        <Input
                          value={formandoEmail}
                          onChange={(e) => setFormandoEmail(e.target.value)}
                          placeholder="email@exemplo.com"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Pacote</Label>
                        <Select value={formandoPacote} onValueChange={setFormandoPacote}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecione o pacote" />
                          </SelectTrigger>
                          <SelectContent>
                            {pacotes.length === 0 ? (
                              <div className="p-2 text-xs text-slate-400">Nenhum pacote configurado</div>
                            ) : (
                              pacotes.map((pacote, idx) => (
                                <SelectItem key={idx} value={pacote.nome}>
                                  {pacote.nome}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Status</Label>
                        <Select value={formandoStatus} onValueChange={(v) => setFormandoStatus(v as "apto" | "inapto" | "migracao" | "")}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sem_status">Sem status</SelectItem>
                            <SelectItem value="apto">Apto</SelectItem>
                            <SelectItem value="inapto">Inapto</SelectItem>
                            <SelectItem value="migracao">Migração</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowFormandoForm(false);
                          setFormandoNome("");
                          setFormandoCpf("");
                          setFormandoTelefone("");
                          setFormandoEmail("");
                          setFormandoStatus("");
                          setFormandoPacote("");
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-gradient-to-r from-amber-500 to-orange-600"
                        onClick={async () => {
                          if (!formandoNome.trim()) {
                            toast.error("Nome é obrigatório");
                            return;
                          }
                          try {
                            const codigoFormando = `F${editingTurma.id}-${Date.now()}`;
                            await createFormandoMutation.mutateAsync({
                              turmaId: editingTurma.id,
                              codigoFormando,
                              nome: formandoNome,
                              cpf: formandoCpf || undefined,
                              telefone: formandoTelefone || undefined,
                              email: formandoEmail || undefined,
                              pacote: formandoPacote || undefined,
                              status: (formandoStatus !== "" ? formandoStatus : undefined) as "apto" | "inapto" | "migracao" | undefined,
                            });
                            toast.success("Formando adicionado com sucesso!");
                            setFormandoNome("");
                            setFormandoCpf("");
                            setFormandoTelefone("");
                            setFormandoEmail("");
                            setFormandoStatus("");
                            setFormandoPacote("");
                            setShowFormandoForm(false);
                          } catch (error) {
                            toast.error("Erro ao adicionar formando");
                          }
                        }}
                        disabled={createFormandoMutation.isPending}
                      >
                        {createFormandoMutation.isPending ? "Salvando..." : "Salvar Formando"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-amber-500 to-orange-600"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingTurma ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </PermissionGate>
        <input
          type="file"
          ref={fileInputRef}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file || !editingTurma) return;

            setIsUploading(true);
            try {
              let rows: string[][] = [];
              const fileName = file.name.toLowerCase();
              
              // Verificar tipo de arquivo e processar adequadamente
              if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                // Processar arquivo Excel
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
                rows = jsonData.map(row => row.map(cell => String(cell ?? '').trim()));
              } else {
                // Processar arquivo CSV/TXT
                const text = await file.text();
                const lines = text.split("\n").filter(line => line.trim());
                rows = lines.map(line => line.split(";").map(col => col.trim().replace(/^"|"$/g, "")));
              }
              
              if (rows.length < 2) {
                toast.error("Planilha vazia ou sem dados");
                return;
              }

              // Pular cabeçalho e processar linhas
              const dataRows = rows.slice(1);
              let successCount = 0;
              let errorCount = 0;

              toast.info(`Processando ${dataRows.length} formando(s)...`);

              for (const columns of dataRows) {
                const [nome, cpf, email, telefone, pacote, statusRaw, generoRaw, comissaoRaw] = columns;

                if (!nome) continue;

                // Mapear status da planilha para o enum do sistema
                let statusMapped: "apto" | "inapto" | "migracao" | undefined = undefined;
                if (statusRaw) {
                  const statusLower = statusRaw.toLowerCase().trim();
                  if (statusLower === "apto") statusMapped = "apto";
                  else if (statusLower === "inapto") statusMapped = "inapto";
                  else if (statusLower === "migração" || statusLower === "migracao") statusMapped = "migracao";
                }

                try {
                  // Mapear gênero da planilha
                  let generoMapped: "masculino" | "feminino" | undefined = undefined;
                  if (generoRaw) {
                    const generoLower = generoRaw.toLowerCase().trim();
                    if (generoLower === "m" || generoLower === "masculino" || generoLower === "masc") generoMapped = "masculino";
                    else if (generoLower === "f" || generoLower === "feminino" || generoLower === "fem") generoMapped = "feminino";
                  }

                  // Mapear comissão da planilha
                  let eComissao = false;
                  if (comissaoRaw) {
                    const comissaoLower = comissaoRaw.toLowerCase().trim();
                    eComissao = comissaoLower === "sim" || comissaoLower === "s" || comissaoLower === "true" || comissaoLower === "1" || comissaoLower === "x";
                  }

                  await createFormandoMutation.mutateAsync({
                    turmaId: editingTurma.id,
                    codigoFormando: `F${Date.now()}${Math.random().toString(36).substr(2, 4)}`.toUpperCase(),
                    nome: nome.trim(),
                    cpf: cpf?.trim() || undefined,
                    email: email?.trim() || undefined,
                    telefone: telefone?.trim() || undefined,
                    pacote: pacote?.trim() || undefined,
                    status: statusMapped,
                    genero: generoMapped,
                    eComissao: eComissao,
                  });
                  successCount++;
                } catch {
                  errorCount++;
                }
              }

              if (successCount > 0) {
                toast.success(`${successCount} formando(s) importado(s) com sucesso!`);
                refetch();
              }
              if (errorCount > 0) {
                toast.error(`${errorCount} formando(s) não puderam ser importados`);
              }
            } catch (error) {
              toast.error("Erro ao processar planilha");
            } finally {
              setIsUploading(false);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }
          }}
          accept=".csv,.txt,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
        />
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar turmas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-slate-500">
              {filteredAndSortedTurmas.length} turma(s)
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredAndSortedTurmas.length > 0 ? (
            <div className="rounded-lg border overflow-hidden max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                  <TableRow className="bg-white hover:bg-white">
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => toggleSort("codigo")}
                    >
                      <div className="flex items-center">
                        Código
                        <SortIcon field="codigo" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => toggleSort("curso")}
                    >
                      <div className="flex items-center">
                        Curso(s)
                        <SortIcon field="curso" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => toggleSort("instituicao")}
                    >
                      <div className="flex items-center">
                        Instituição(ões)
                        <SortIcon field="instituicao" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => toggleSort("cidade")}
                    >
                      <div className="flex items-center">
                        Cidade
                        <SortIcon field="cidade" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => toggleSort("ano")}
                    >
                      <div className="flex items-center">
                        Ano/Período
                        <SortIcon field="ano" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTurmas.map((turma) => {
                    const cursosArr = parseJsonArray(turma.cursos);
                    const instituicoesArr = parseJsonArray(turma.instituicoes);
                    const anosArr = parseJsonNumberArray(turma.anos);
                    const periodosArr = parseJsonArray(turma.periodos);
                    
                    return (
                      <TableRow key={turma.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{turma.codigo}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {cursosArr.slice(0, 2).map((c, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                            ))}
                            {cursosArr.length > 2 && (
                              <Badge variant="secondary" className="text-xs">+{cursosArr.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {instituicoesArr.slice(0, 1).map((i, idx) => (
                              <span key={idx} className="text-sm">{i}</span>
                            ))}
                            {instituicoesArr.length > 1 && (
                              <Badge variant="secondary" className="text-xs">+{instituicoesArr.length - 1}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{turma.cidade} ({turma.estado})</TableCell>
                        <TableCell>
                          {anosArr.join(", ")} / {periodosArr.join(", ")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setLocation(`/turmas/${turma.id}`)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <PermissionGate secao="turmas" permission="inserir">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(turma)}
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </PermissionGate>
                            <PermissionGate secao="turmas" permission="excluir">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(turma.id)}
                                title="Excluir"
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </PermissionGate>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhuma turma encontrada</p>
              <p className="text-sm text-slate-400 mt-1">
                Clique em "Nova Turma" para cadastrar
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
