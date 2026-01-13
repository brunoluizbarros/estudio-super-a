import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FileText,
  Receipt,
  DollarSign,
  Calendar,
  Building2,
  User,
  Upload,
  X,
  Eye,
  Utensils,
  Hotel,
  Clock,
  Coffee,
  Users,
  Paperclip
} from "lucide-react";

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
};

const formatDate = (date: Date | string | null) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR");
};

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  apto: "bg-green-100 text-green-800",
  pendente_nf: "bg-orange-100 text-orange-800",
  cancelado: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  apto: "Apto",
  pendente_nf: "Pendente NF",
  cancelado: "Cancelado",
};

// Valores fixos de refeições (em centavos)
const VALOR_CAFE = 2500; // R$ 25,00
const VALOR_ALMOCO = 4000; // R$ 40,00
const VALOR_JANTAR = 4000; // R$ 40,00

// Valores padrão de diárias (em centavos)
const VALORES_DIARIAS_PADRAO = {
  single: 18000, // R$ 180,00
  duplo: 25000, // R$ 250,00
  triplo: 28000, // R$ 280,00
  quadruplo: 32000, // R$ 320,00
};

interface Quarto {
  tipo: "single" | "duplo" | "triplo" | "quadruplo";
  nomes: string;
  valor: number;
}

interface RefeicaoCalculada {
  data: string;
  cafe: number;
  almoco: number;
  jantar: number;
}

export default function Despesas() {
  const { user } = useAuth();
  const isAdminOrGestor = user?.role === "administrador" || user?.role === "gestor";
  
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [selectedTurmaId, setSelectedTurmaId] = useState<number | null>(null);
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<number | null>(null);
  const [selectedTipoServicoId, setSelectedTipoServicoId] = useState<number | null>(null);
  const [dadosPagamentoEditado, setDadosPagamentoEditado] = useState("");
  const [comprovanteFiscalFiles, setComprovanteFiscalFiles] = useState<File[]>([]);
  const [documentosFiles, setDocumentosFiles] = useState<File[]>([]);
  
  // Estados para Alimentação
  const [horarioSaida, setHorarioSaida] = useState("");
  const [horarioRetorno, setHorarioRetorno] = useState("");
  const [cafeDaManhaIncluso, setCafeDaManhaIncluso] = useState(false);
  const [fornecedoresAlimentacaoSelecionados, setFornecedoresAlimentacaoSelecionados] = useState<number[]>([]);
  
  // Estados para Hospedagem
  const [fornecedorHospedagem, setFornecedorHospedagem] = useState<number | null>(null);
  const [quartos, setQuartos] = useState<Quarto[]>([]);
  const [valoresDiarias, setValoresDiarias] = useState(VALORES_DIARIAS_PADRAO);
  const [diasAntes, setDiasAntes] = useState(0);
  const [diasDepois, setDiasDepois] = useState(0);

  // Queries
  const { data: despesas, isLoading, refetch } = trpc.despesas.list.useQuery();
  const { data: nextNumeroCi } = trpc.despesas.getNextNumeroCi.useQuery();
  const { data: turmas } = trpc.turmas.list.useQuery();
  const { data: fornecedores } = trpc.fornecedores.list.useQuery();
  const { data: tiposServico } = trpc.tiposServico.list.useQuery();
  const { data: tiposEvento } = trpc.tiposEvento.list.useQuery();

  // Eventos filtrados por turma
  const { data: eventos } = trpc.eventos.list.useQuery();
  const [selectedEventoId, setSelectedEventoId] = useState<number | null>(null);
  
  const eventosFiltrados = eventos?.filter((e: any) => 
    !selectedTurmaId || e.turmaId === selectedTurmaId
  );
  
  const eventoSelecionado = eventos?.find((e: any) => e.id === selectedEventoId);

  // Verificar se o tipo de serviço selecionado é Alimentação ou Hospedagem
  const tipoServicoSelecionado = tiposServico?.find((t: any) => t.id === selectedTipoServicoId);
  const isAlimentacao = tipoServicoSelecionado?.nome?.toLowerCase().includes("alimenta") || 
                        tipoServicoSelecionado?.nome?.toLowerCase().includes("alimento");
  const isHospedagem = tipoServicoSelecionado?.nome?.toLowerCase().includes("hospedagem");

  // Filtrar fornecedores por tipo de serviço
  const fornecedoresAlimentacao = useMemo(() => {
    if (!fornecedores || !tiposServico) return [];
    const tipoAlimentacao = tiposServico.find((t: any) => 
      t.nome?.toLowerCase().includes("alimenta") || t.nome?.toLowerCase().includes("alimento")
    );
    if (!tipoAlimentacao) return [];
    return fornecedores.filter((f: any) => {
      try {
        const tipos = f.tiposServico ? JSON.parse(f.tiposServico) : [];
        return tipos.includes(tipoAlimentacao.id);
      } catch {
        return false;
      }
    });
  }, [fornecedores, tiposServico]);

  const fornecedoresHospedagem = useMemo(() => {
    if (!fornecedores || !tiposServico) return [];
    const tipoHospedagem = tiposServico.find((t: any) => 
      t.nome?.toLowerCase().includes("hospedagem")
    );
    if (!tipoHospedagem) return [];
    return fornecedores.filter((f: any) => {
      try {
        const tipos = f.tiposServico ? JSON.parse(f.tiposServico) : [];
        return tipos.includes(tipoHospedagem.id);
      } catch {
        return false;
      }
    });
  }, [fornecedores, tiposServico]);

  // Calcular refeições baseado nas regras
  const refeicoesCalculadas = useMemo(() => {
    if (!eventoSelecionado || !horarioSaida || !horarioRetorno) return [];
    
    // Usar dataEvento como início e dataEventoFim como fim (se existir)
    const dataInicio = new Date(eventoSelecionado.dataEvento || new Date());
    const dataFim = new Date(eventoSelecionado.dataEventoFim || eventoSelecionado.dataEvento || new Date());
    const refeicoes: RefeicaoCalculada[] = [];
    
    const [horaSaida] = horarioSaida.split(":").map(Number);
    const [horaRetorno] = horarioRetorno.split(":").map(Number);
    
    // Calcular número de dias
    const diffTime = Math.abs(dataFim.getTime() - dataInicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    for (let i = 0; i < diffDays; i++) {
      const currentDate = new Date(dataInicio);
      currentDate.setDate(currentDate.getDate() + i);
      
      let cafe = 0, almoco = 0, jantar = 0;
      
      if (i === 0) {
        // Primeiro dia (saída) - refeições APÓS o horário de saída
        // Se sair antes das 7h, tem café
        if (horaSaida < 7) cafe = 1;
        // Se sair antes das 12h, tem almoço
        if (horaSaida < 12) almoco = 1;
        // Se sair antes das 19h, tem jantar
        if (horaSaida < 19) jantar = 1;
      } else if (i === diffDays - 1) {
        // Último dia (retorno) - refeições ANTES do horário de retorno
        // Se retornar depois das 8h, tem café (exceto se incluso no hotel)
        if (horaRetorno > 8 && !cafeDaManhaIncluso) cafe = 1;
        // Se retornar depois das 13h, tem almoço
        if (horaRetorno > 13) almoco = 1;
        // Se retornar depois das 20h, tem jantar
        if (horaRetorno > 20) jantar = 1;
      } else {
        // Dias intermediários - todas as refeições
        if (!cafeDaManhaIncluso) cafe = 1;
        almoco = 1;
        jantar = 1;
      }
      
      refeicoes.push({
        data: currentDate.toLocaleDateString("pt-BR"),
        cafe,
        almoco,
        jantar,
      });
    }
    
    return refeicoes;
  }, [eventoSelecionado, horarioSaida, horarioRetorno, cafeDaManhaIncluso]);

  // Calcular valor total de alimentação
  const valorTotalAlimentacao = useMemo(() => {
    return refeicoesCalculadas.reduce((total, r) => {
      return total + (r.cafe * VALOR_CAFE) + (r.almoco * VALOR_ALMOCO) + (r.jantar * VALOR_JANTAR);
    }, 0);
  }, [refeicoesCalculadas]);

  // Calcular valor total de hospedagem
  const valorTotalHospedagem = useMemo(() => {
    if (!eventoSelecionado) return 0;
    
    // Usar dataEvento como início e dataEventoFim como fim (se existir)
    const dataInicio = new Date(eventoSelecionado.dataEvento || new Date());
    const dataFim = new Date(eventoSelecionado.dataEventoFim || eventoSelecionado.dataEvento || new Date());
    const diffTime = Math.abs(dataFim.getTime() - dataInicio.getTime());
    // Número de diárias = dias do evento + dias extras antes + dias extras depois
    const numDiarias = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 + diasAntes + diasDepois;
    
    return quartos.reduce((total, q) => {
      return total + (q.valor * numDiarias);
    }, 0);
  }, [eventoSelecionado, quartos, diasAntes, diasDepois]);

  // Atualizar dados de pagamento quando selecionar fornecedor
  useEffect(() => {
    if (selectedFornecedorId && fornecedores) {
      const fornecedor = fornecedores.find((f: any) => f.id === selectedFornecedorId);
      if (fornecedor) {
        const dados = [];
        if (fornecedor.banco) dados.push(`Banco: ${fornecedor.banco}`);
        if (fornecedor.agencia) dados.push(`Agência: ${fornecedor.agencia}`);
        if (fornecedor.conta) dados.push(`Conta: ${fornecedor.conta}`);
        if (fornecedor.pix) dados.push(`Pix: ${fornecedor.pix}`);
        setDadosPagamentoEditado(dados.join("\n"));
      }
    }
  }, [selectedFornecedorId, fornecedores]);

  // Mutations
  const createMutation = trpc.despesas.create.useMutation({
    onSuccess: () => {
      toast.success("Despesa cadastrada!");
      setIsOpen(false);
      resetForm();
      refetch();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const updateMutation = trpc.despesas.update.useMutation({
    onSuccess: () => {
      toast.success("Despesa atualizada!");
      setEditing(null);
      resetForm();
      refetch();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const deleteMutation = trpc.despesas.delete.useMutation({
    onSuccess: () => {
      toast.success("Despesa excluída!");
      refetch();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const resetForm = () => {
    setSelectedTurmaId(null);
    setSelectedFornecedorId(null);
    setSelectedTipoServicoId(null);
    setSelectedEventoId(null);
    setDadosPagamentoEditado("");
    setComprovanteFiscalFiles([]);
    setDocumentosFiles([]);
    setHorarioSaida("");
    setHorarioRetorno("");
    setCafeDaManhaIncluso(false);
    setFornecedoresAlimentacaoSelecionados([]);
    setFornecedorHospedagem(null);
    setQuartos([]);
    setValoresDiarias(VALORES_DIARIAS_PADRAO);
    setDiasAntes(0);
    setDiasDepois(0);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Validações
    const fornecedorIdStr = formData.get("fornecedorId") as string;
    if (!fornecedorIdStr || isNaN(parseInt(fornecedorIdStr))) {
      toast.error("Selecione um fornecedor");
      return;
    }
    
    const setorSolicitanteValue = formData.get("setorSolicitante") as string;
    if (!setorSolicitanteValue) {
      toast.error("Selecione o setor solicitante");
      return;
    }
    
    let valorTotal = Math.round(parseFloat(formData.get("valorTotal") as string || "0") * 100);
    
    // Se for alimentação, usar o valor calculado (exceto se admin/gestor editou)
    if (isAlimentacao && !isAdminOrGestor) {
      valorTotal = valorTotalAlimentacao;
    }
    
    // Se for hospedagem, usar o valor calculado
    if (isHospedagem) {
      valorTotal = valorTotalHospedagem;
    }
    
    const data: any = {
      numeroCi: formData.get("numeroCi") as string,
      tipoDespesa: formData.get("tipoDespesa") as "operacional" | "administrativo",
      turmaId: formData.get("turmaId") ? parseInt(formData.get("turmaId") as string) : undefined,
      eventoId: selectedEventoId || undefined,
      mesServico: formData.get("mesServico") as string || undefined,
      setorSolicitante: setorSolicitanteValue as "estudio" | "fotografia" | "becas",
      fornecedorId: parseInt(formData.get("fornecedorId") as string),
      tipoServicoId: selectedTipoServicoId || undefined,
      detalhamento: formData.get("detalhamento") as string || undefined,
      eReembolso: formData.get("eReembolso") === "on",
      valorTotal,
      tipoPagamento: formData.get("tipoPagamento") as any || undefined,
      dadosPagamento: dadosPagamentoEditado || undefined,
      tipoComprovante: formData.get("tipoComprovante") as any || undefined,
      dataLimitePagamento: formData.get("dataLimitePagamento") 
        ? new Date(formData.get("dataLimitePagamento") as string) 
        : undefined,
    };

    // Adicionar campos de alimentação
    if (isAlimentacao) {
      data.horarioSaida = horarioSaida;
      data.horarioRetorno = horarioRetorno;
      data.cafeDaManhaIncluso = cafeDaManhaIncluso;
      data.fornecedoresAlimentacao = JSON.stringify(fornecedoresAlimentacaoSelecionados);
      data.refeicoesCalculadas = JSON.stringify(refeicoesCalculadas);
    }

    // Adicionar campos de hospedagem
    if (isHospedagem) {
      data.fornecedorHospedagem = fornecedorHospedagem;
      data.quartosHospedagem = JSON.stringify(quartos);
      data.valoresDiarias = JSON.stringify(valoresDiarias);
      data.diasAntes = diasAntes;
      data.diasDepois = diasDepois;
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditModal = (despesa: any) => {
    setEditing(despesa);
    setSelectedTurmaId(despesa.turmaId);
    setSelectedFornecedorId(despesa.fornecedorId);
    setSelectedTipoServicoId(despesa.tipoServicoId);
    setSelectedEventoId(despesa.eventoId);
    setDadosPagamentoEditado(despesa.dadosPagamento || "");
    
    // Carregar dados de alimentação
    if (despesa.horarioSaida) setHorarioSaida(despesa.horarioSaida);
    if (despesa.horarioRetorno) setHorarioRetorno(despesa.horarioRetorno);
    if (despesa.cafeDaManhaIncluso) setCafeDaManhaIncluso(despesa.cafeDaManhaIncluso);
    if (despesa.fornecedoresAlimentacao) {
      try {
        setFornecedoresAlimentacaoSelecionados(JSON.parse(despesa.fornecedoresAlimentacao));
      } catch {}
    }
    
    // Carregar dados de hospedagem
    if (despesa.fornecedorHospedagem) setFornecedorHospedagem(despesa.fornecedorHospedagem);
    if (despesa.quartosHospedagem) {
      try {
        setQuartos(JSON.parse(despesa.quartosHospedagem));
      } catch {}
    }
    if (despesa.valoresDiarias) {
      try {
        setValoresDiarias(JSON.parse(despesa.valoresDiarias));
      } catch {}
    }
    if (despesa.diasAntes) setDiasAntes(despesa.diasAntes);
    if (despesa.diasDepois) setDiasDepois(despesa.diasDepois);
  };

  const addQuarto = (tipo: "single" | "duplo" | "triplo" | "quadruplo") => {
    setQuartos([...quartos, { tipo, nomes: "", valor: valoresDiarias[tipo] }]);
  };

  const updateQuarto = (index: number, field: keyof Quarto, value: any) => {
    const newQuartos = [...quartos];
    newQuartos[index] = { ...newQuartos[index], [field]: value };
    setQuartos(newQuartos);
  };

  const removeQuarto = (index: number) => {
    setQuartos(quartos.filter((_, i) => i !== index));
  };

  const filteredDespesas = despesas?.filter((d: any) => {
    const fornecedor = fornecedores?.find((f: any) => f.id === d.fornecedorId);
    const turma = turmas?.find((t: any) => t.id === d.turmaId);
    const searchLower = search.toLowerCase();
    return (
      d.numeroCi?.toLowerCase().includes(searchLower) ||
      fornecedor?.nome?.toLowerCase().includes(searchLower) ||
      turma?.codigo?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-red-500" />
            Despesas
          </h1>
          <p className="text-slate-500 mt-1">Gerencie as despesas operacionais e administrativas</p>
        </div>
        <Dialog open={isOpen || !!editing} onOpenChange={(open) => {
          if (!open) {
            setIsOpen(false);
            setEditing(null);
            resetForm();
          } else {
            setIsOpen(true);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-red-500 hover:bg-red-600">
              <Plus className="h-4 w-4 mr-2" /> Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="numeroCi">Número da CI *</Label>
                  <Input 
                    id="numeroCi" 
                    name="numeroCi" 
                    required 
                    defaultValue={editing?.numeroCi || nextNumeroCi || ""} 
                    readOnly={!editing}
                    className={!editing ? "bg-slate-100" : ""}
                  />
                </div>
                <div>
                  <Label htmlFor="tipoDespesa">Tipo de Despesa *</Label>
                  <Select name="tipoDespesa" defaultValue={editing?.tipoDespesa || "operacional"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operacional">Operacional</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="setorSolicitante">Setor Solicitante *</Label>
                  <Select name="setorSolicitante" defaultValue={editing?.setorSolicitante || "estudio"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estudio">Estúdio</SelectItem>
                      <SelectItem value="fotografia">Fotografia</SelectItem>
                      <SelectItem value="becas">Becas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="turmaId">Turma</Label>
                  <Select 
                    name="turmaId" 
                    defaultValue={editing?.turmaId?.toString() || ""}
                    onValueChange={(v) => setSelectedTurmaId(v ? parseInt(v) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {turmas?.map((t: any) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.codigo} - {t.instituicao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="eventoId">Evento</Label>
                  <Select 
                    name="eventoId" 
                    defaultValue={editing?.eventoId?.toString() || ""}
                    onValueChange={(v) => setSelectedEventoId(v ? parseInt(v) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventosFiltrados?.map((e: any) => {
                        const tipoEvento = tiposEvento?.find((t: any) => t.id === e.tipoEventoId);
                        return (
                          <SelectItem key={e.id} value={e.id.toString()}>
                            {tipoEvento?.nome || "Evento"} - {formatDate(e.dataInicio)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="mesServico">Período (Mês)</Label>
                  <Input 
                    id="mesServico" 
                    name="mesServico" 
                    type="month" 
                    defaultValue={editing?.mesServico || ""} 
                  />
                </div>
                <div>
                  <Label htmlFor="fornecedorId">Fornecedor *</Label>
                  <Select 
                    name="fornecedorId" 
                    defaultValue={editing?.fornecedorId?.toString() || ""}
                    onValueChange={(v) => setSelectedFornecedorId(v ? parseInt(v) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {fornecedores?.map((f: any) => (
                        <SelectItem key={f.id} value={f.id.toString()}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tipoServicoId">Tipo de Serviço/Compra</Label>
                  <Select 
                    name="tipoServicoId" 
                    defaultValue={editing?.tipoServicoId?.toString() || ""}
                    onValueChange={(v) => setSelectedTipoServicoId(v ? parseInt(v) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposServico?.map((t: any) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seção de Alimentação */}
              {isAlimentacao && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Utensils className="h-5 w-5 text-orange-500" />
                      Alimentação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="horarioSaida">Horário de Saída</Label>
                        <Input 
                          id="horarioSaida" 
                          type="time" 
                          value={horarioSaida}
                          onChange={(e) => setHorarioSaida(e.target.value)}
                        />
                        <p className="text-xs text-slate-500 mt-1">Primeiro dia do evento</p>
                      </div>
                      <div>
                        <Label htmlFor="horarioRetorno">Horário de Retorno</Label>
                        <Input 
                          id="horarioRetorno" 
                          type="time" 
                          value={horarioRetorno}
                          onChange={(e) => setHorarioRetorno(e.target.value)}
                        />
                        <p className="text-xs text-slate-500 mt-1">Último dia do evento</p>
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Checkbox 
                          id="cafeDaManhaIncluso" 
                          checked={cafeDaManhaIncluso}
                          onCheckedChange={(checked) => setCafeDaManhaIncluso(!!checked)}
                        />
                        <Label htmlFor="cafeDaManhaIncluso" className="cursor-pointer">
                          Café da Manhã Incluso no Hotel
                        </Label>
                      </div>
                    </div>

                    <div>
                      <Label>Fornecedores de Alimentação</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {fornecedoresAlimentacao.map((f: any) => (
                          <label 
                            key={f.id} 
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                              fornecedoresAlimentacaoSelecionados.includes(f.id)
                                ? "bg-orange-100 border-orange-300"
                                : "bg-white border-slate-200 hover:border-orange-200"
                            }`}
                          >
                            <Checkbox 
                              checked={fornecedoresAlimentacaoSelecionados.includes(f.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFornecedoresAlimentacaoSelecionados([...fornecedoresAlimentacaoSelecionados, f.id]);
                                } else {
                                  setFornecedoresAlimentacaoSelecionados(fornecedoresAlimentacaoSelecionados.filter(id => id !== f.id));
                                }
                              }}
                            />
                            {f.nome}
                          </label>
                        ))}
                      </div>
                    </div>

                    {refeicoesCalculadas.length > 0 && (
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Coffee className="h-4 w-4" />
                          Refeições Calculadas
                        </Label>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead className="text-center">Café da Manhã</TableHead>
                              <TableHead className="text-center">Almoço</TableHead>
                              <TableHead className="text-center">Jantar</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {refeicoesCalculadas.map((r, i) => (
                              <TableRow key={i}>
                                <TableCell>{r.data}</TableCell>
                                <TableCell className="text-center">{r.cafe}</TableCell>
                                <TableCell className="text-center">{r.almoco}</TableCell>
                                <TableCell className="text-center">{r.jantar}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="font-bold bg-orange-100">
                              <TableCell>Total</TableCell>
                              <TableCell className="text-center">
                                {refeicoesCalculadas.reduce((t, r) => t + r.cafe, 0)} × R$ 25,00
                              </TableCell>
                              <TableCell className="text-center">
                                {refeicoesCalculadas.reduce((t, r) => t + r.almoco, 0)} × R$ 40,00
                              </TableCell>
                              <TableCell className="text-center">
                                {refeicoesCalculadas.reduce((t, r) => t + r.jantar, 0)} × R$ 40,00
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                        <div className="mt-2 text-right">
                          <span className="font-bold text-lg">
                            Valor Total: {formatCurrency(valorTotalAlimentacao)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Seção de Hospedagem */}
              {isHospedagem && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Hotel className="h-5 w-5 text-blue-500" />
                      Hospedagem
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Fornecedor de Hospedagem</Label>
                      <Select 
                        value={fornecedorHospedagem?.toString() || ""}
                        onValueChange={(v) => setFornecedorHospedagem(v ? parseInt(v) : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o hotel/pousada" />
                        </SelectTrigger>
                        <SelectContent>
                          {fornecedoresHospedagem.map((f: any) => (
                            <SelectItem key={f.id} value={f.id.toString()}>
                              {f.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Dias Extras Antes do Evento</Label>
                        <Input 
                          type="number" 
                          min="0" 
                          value={diasAntes}
                          onChange={(e) => setDiasAntes(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Dias Extras Depois do Evento</Label>
                        <Input 
                          type="number" 
                          min="0" 
                          value={diasDepois}
                          onChange={(e) => setDiasDepois(parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Valores por Diária</Label>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs">Single</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={(valoresDiarias.single / 100).toFixed(2)}
                            onChange={(e) => setValoresDiarias({...valoresDiarias, single: Math.round(parseFloat(e.target.value) * 100)})}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Duplo</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={(valoresDiarias.duplo / 100).toFixed(2)}
                            onChange={(e) => setValoresDiarias({...valoresDiarias, duplo: Math.round(parseFloat(e.target.value) * 100)})}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Triplo</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={(valoresDiarias.triplo / 100).toFixed(2)}
                            onChange={(e) => setValoresDiarias({...valoresDiarias, triplo: Math.round(parseFloat(e.target.value) * 100)})}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Quádruplo</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={(valoresDiarias.quadruplo / 100).toFixed(2)}
                            onChange={(e) => setValoresDiarias({...valoresDiarias, quadruplo: Math.round(parseFloat(e.target.value) * 100)})}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Quartos
                        </Label>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => addQuarto("single")}>
                            + Single
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => addQuarto("duplo")}>
                            + Duplo
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => addQuarto("triplo")}>
                            + Triplo
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => addQuarto("quadruplo")}>
                            + Quádruplo
                          </Button>
                        </div>
                      </div>
                      
                      {quartos.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Nomes</TableHead>
                              <TableHead>Valor/Diária</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {quartos.map((q, i) => (
                              <TableRow key={i}>
                                <TableCell className="capitalize">{q.tipo}</TableCell>
                                <TableCell>
                                  <Input 
                                    value={q.nomes}
                                    onChange={(e) => updateQuarto(i, "nomes", e.target.value)}
                                    placeholder="Ex: João, Maria"
                                  />
                                </TableCell>
                                <TableCell>{formatCurrency(q.valor)}</TableCell>
                                <TableCell>
                                  <Button 
                                    type="button" 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => removeQuarto(i)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                      
                      {quartos.length > 0 && eventoSelecionado && (
                        <div className="mt-2 space-y-1">
                          <div className="text-sm text-slate-600">
                            {(() => {
                              const dataInicio = new Date(eventoSelecionado.dataEvento || new Date());
                              const dataFim = new Date(eventoSelecionado.dataEventoFim || eventoSelecionado.dataEvento || new Date());
                              const diffTime = Math.abs(dataFim.getTime() - dataInicio.getTime());
                              const diasEvento = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                              const numDiarias = diasEvento + diasAntes + diasDepois;
                              return `${diasEvento} dia(s) do evento ${diasAntes > 0 ? `+ ${diasAntes} antes ` : ""}${diasDepois > 0 ? `+ ${diasDepois} depois ` : ""}= ${numDiarias} diária(s)`;
                            })()}
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-lg">
                              Valor Total: {formatCurrency(valorTotalHospedagem)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div>
                <Label htmlFor="detalhamento">Detalhamento</Label>
                <Textarea 
                  id="detalhamento" 
                  name="detalhamento" 
                  rows={3}
                  defaultValue={editing?.detalhamento || ""} 
                  placeholder="Descreva os detalhes da despesa..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="eReembolso" name="eReembolso" defaultChecked={editing?.eReembolso} />
                <Label htmlFor="eReembolso" className="cursor-pointer">É reembolso?</Label>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Pagamento</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipoPagamento">Tipo de Pagamento</Label>
                    <Select name="tipoPagamento" defaultValue={editing?.tipoPagamento || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">Pix</SelectItem>
                        <SelectItem value="transferencia">Transferência</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dataLimitePagamento">Data Limite de Pagamento</Label>
                    <Input 
                      id="dataLimitePagamento" 
                      name="dataLimitePagamento" 
                      type="date" 
                      defaultValue={editing?.dataLimitePagamento ? new Date(editing.dataLimitePagamento).toISOString().split('T')[0] : ""} 
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="dadosPagamento">Dados de Pagamento</Label>
                  <Textarea 
                    id="dadosPagamento" 
                    value={dadosPagamentoEditado}
                    onChange={(e) => setDadosPagamentoEditado(e.target.value)}
                    rows={3}
                    placeholder="Dados bancários, chave Pix, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipoComprovante">Tipo de Comprovante</Label>
                  <Select name="tipoComprovante" defaultValue={editing?.tipoComprovante || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nota_fiscal">Nota Fiscal</SelectItem>
                      <SelectItem value="recibo">Recibo</SelectItem>
                      <SelectItem value="cupom">Cupom</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="valorTotal">Valor Total (R$) *</Label>
                  <Input 
                    id="valorTotal" 
                    name="valorTotal" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    required={!isAlimentacao && !isHospedagem}
                    readOnly={(isAlimentacao && !isAdminOrGestor) || isHospedagem}
                    className={(isAlimentacao && !isAdminOrGestor) || isHospedagem ? "bg-slate-100" : ""}
                    value={
                      isAlimentacao ? (valorTotalAlimentacao / 100).toFixed(2) :
                      isHospedagem ? (valorTotalHospedagem / 100).toFixed(2) :
                      undefined
                    }
                    defaultValue={editing && !isAlimentacao && !isHospedagem ? (editing.valorTotal / 100).toFixed(2) : ""} 
                  />
                  {isAlimentacao && !isAdminOrGestor && (
                    <p className="text-xs text-slate-500 mt-1">Valor calculado automaticamente</p>
                  )}
                </div>
              </div>

              {/* Seção de Anexos */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Anexos
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="comprovanteFiscal" className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      Comprovante Fiscal
                    </Label>
                    <div className="mt-2">
                      <input
                        id="comprovanteFiscal"
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            setComprovanteFiscalFiles([...comprovanteFiscalFiles, ...Array.from(e.target.files)]);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('comprovanteFiscal')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Anexar Comprovante
                      </Button>
                      {comprovanteFiscalFiles.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {comprovanteFiscalFiles.map((file, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm bg-blue-50 p-2 rounded">
                              <FileText className="h-4 w-4 text-blue-500" />
                              <span className="flex-1 whitespace-normal break-words">{file.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setComprovanteFiscalFiles(comprovanteFiscalFiles.filter((_, idx) => idx !== i))}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="documentos" className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      Documentos
                    </Label>
                    <div className="mt-2">
                      <input
                        id="documentos"
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            setDocumentosFiles([...documentosFiles, ...Array.from(e.target.files)]);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('documentos')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Anexar Documento
                      </Button>
                      {documentosFiles.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {documentosFiles.map((file, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm bg-green-50 p-2 rounded">
                              <FileText className="h-4 w-4 text-green-500" />
                              <span className="flex-1 whitespace-normal break-words">{file.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setDocumentosFiles(documentosFiles.filter((_, idx) => idx !== i))}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsOpen(false);
                  setEditing(null);
                  resetForm();
                }}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-red-500 hover:bg-red-600">
                  {editing ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Busca */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por CI, fornecedor ou turma..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setSearch("")}
              className="whitespace-nowrap"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar Filtro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Despesas */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 bg-white z-10">
                  <TableHead>CI</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDespesas?.map((despesa: any) => {
                  const fornecedor = fornecedores?.find((f: any) => f.id === despesa.fornecedorId);
                  const turma = turmas?.find((t: any) => t.id === despesa.turmaId);
                  return (
                    <TableRow key={despesa.id}>
                      <TableCell className="font-medium">{despesa.numeroCi}</TableCell>
                      <TableCell className="capitalize">{despesa.tipoDespesa}</TableCell>
                      <TableCell>{fornecedor?.nome || "-"}</TableCell>
                      <TableCell>{turma?.codigo || "-"}</TableCell>
                      <TableCell>{formatCurrency(despesa.valorTotal)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[despesa.status] || "bg-slate-100"}`}>
                          {STATUS_LABELS[despesa.status] || despesa.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => openEditModal(despesa)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm("Deseja excluir esta despesa?")) {
                                deleteMutation.mutate({ id: despesa.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
