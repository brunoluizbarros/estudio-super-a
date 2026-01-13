import { useState, useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SimpleModal } from "@/components/ui/simple-modal";
// Select imports removed - using native HTML select
// Command e Popover removidos para evitar erro removeChild
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ObservationField } from "@/components/ObservationField";
import { 
  PlayCircle, 
  Calendar, 
  Search, 
  ShoppingCart, 
  Camera,
  Edit,
  Plus,
  Trash2,
  Users,
  Sparkles,
  ArrowUpDown,
  DollarSign,
  X,
  Clock,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { withRetry, formatErrorMessage } from "@/hooks/useRetryMutation";

const TAMANHOS_BECA = ["PPP", "PP", "P", "M", "G", "GG", "GGG"];

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

interface ItemVenda {
  produtoId: number;
  produto: string;
  categoria: string;
  quantidade: number;
  valorUnitario: number;
  ajusteValor: number; // em centavos (positivo ou negativo)
  justificativa: string; // obrigatório quando há ajuste
}

interface Pagamento {
  tipo: "pix" | "dinheiro" | "debito" | "credito" | "incluso_pacote";
  valor: number;
  bandeira?: string;
  parcelas: number;
  cvNsu?: string;
}

const BANDEIRAS = ["VISA", "MASTER", "ELO", "HIPERCARD", "AMERICAN EXPRESS", "DINERS"];

// Tipos para ordenação
type SortDirection = 'asc' | 'desc' | null;
type SortConfig = { column: string; direction: SortDirection };

export default function Execucao() {
  // Autenticação e permissões
  const { user } = useAuth();
  const podeEditarStatus = user?.role && ['financeiro', 'gestor', 'administrador', 'controle'].includes(user.role);
  
  // Estados de seleção
  const [selectedTurmaId, setSelectedTurmaId] = useState<number | null>(null);
  const [selectedEventoId, setSelectedEventoId] = useState<number | null>(null);
  const [searchTurma, setSearchTurma] = useState("");
  const [searchFormando, setSearchFormando] = useState("");
  const [filterObservacoes, setFilterObservacoes] = useState<"all" | "com" | "sem">("all");
  
  // Estados de modal
  const [editingFormando, setEditingFormando] = useState<any>(null);
  const [showVendaModal, setShowVendaModal] = useState<any>(null);
  const [showCenarios, setShowCenarios] = useState<any>(null);
  const [showFotoModal, setShowFotoModal] = useState<any>(null);
  const [isClosingFotoModal, setIsClosingFotoModal] = useState(false);
  
  // Estados do formulário de fotos (múltiplos registros)
  interface FotoRegistro {
    id: number;
    cenarioId: string;
    numeroArquivos: string;
    fotografoId: string;
    fotografoSearch: string;
    observacao: string;
    horarioInicio?: string;
    horarioTermino?: string;
  }
  const [fotoRegistros, setFotoRegistros] = useState<FotoRegistro[]>([{ id: 1, cenarioId: "", numeroArquivos: "", fotografoId: "", fotografoSearch: "", observacao: "" }]);
  
  // Função para obter data atual no horário de Recife (UTC-3)
  const getDataRecifeHoje = () => {
    const agora = new Date();
    // Usar Intl.DateTimeFormat para obter a data correta no timezone de Recife
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Recife',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    // Retornar no formato YYYY-MM-DD
    return formatter.format(agora);
  };

  // Estado para data de execução (inicializado com data de Recife)
  const [dataExecucao, setDataExecucao] = useState<string>(getDataRecifeHoje());
  
  // Estado para observações gerais
  const [observacoesGerais, setObservacoesGerais] = useState<string>("");
  
  // Estados para serviços de Make e Cabelo
  interface ServicoMakeCabelo {
    tipo: 'make_formando' | 'make_familia' | 'cabelo_simples' | 'cabelo_combinado';
    quantidade: number;
    fornecedorId: string;
    fornecedorSearch: string;
  }
  const [servicosMakeCabelo, setServicosMakeCabelo] = useState<ServicoMakeCabelo[]>([]);
  
  // Estado para múltiplas maquiadoras no Make Família
  interface MakeFamiliaItem {
    id: number;
    fornecedorId: string;
    quantidade: number;
  }
  const [makeFamiliaItems, setMakeFamiliaItems] = useState<MakeFamiliaItem[]>([]);
  
  // Estados para Make do Formando
  const [makeFormandoMaquiadora, setMakeFormandoMaquiadora] = useState<string>("");
  const [makeFormandoRetoque, setMakeFormandoRetoque] = useState<number>(0);
  const [makeFormandoTipo, setMakeFormandoTipo] = useState<'masc' | 'fem'>('fem');
  
  // Estados para Comissão-Foto (múltiplos registros com data)
  interface ComissaoFotoRegistro {
    id: number;
    data: string;
  }
  const [comissaoFotoRegistros, setComissaoFotoRegistros] = useState<{id: number; data: string}[]>([]);
  const [servicosJaCarregados, setServicosJaCarregados] = useState(false);
  // Estados de venda
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [novoPagamentoTipo, setNovoPagamentoTipo] = useState<"pix" | "dinheiro" | "debito" | "credito" | "incluso_pacote">("pix");
  const [novoPagamentoValor, setNovoPagamentoValor] = useState("");
  const [novoPagamentoBandeira, setNovoPagamentoBandeira] = useState("VISA");
  const [novoPagamentoParcelas, setNovoPagamentoParcelas] = useState(1);
  const [novoPagamentoCvNsu, setNovoPagamentoCvNsu] = useState("");
  const [dataVenda, setDataVenda] = useState<string>(new Date().toISOString().split('T')[0]);

  // Estados de ordenação
  const [sortFormandos, setSortFormandos] = useState<SortConfig>({ column: '', direction: null });

  // Função para alternar ordenação
  const toggleSort = (column: string) => {
    if (sortFormandos.column !== column) {
      setSortFormandos({ column, direction: 'asc' });
    } else if (sortFormandos.direction === 'asc') {
      setSortFormandos({ column, direction: 'desc' });
    } else {
      setSortFormandos({ column: '', direction: null });
    }
  };

  // Função para ordenar dados
  const sortData = <T extends Record<string, any>>(data: T[]): T[] => {
    if (!data || !sortFormandos.column || !sortFormandos.direction) return data || [];
    return [...data].sort((a, b) => {
      const aVal = a[sortFormandos.column];
      const bVal = b[sortFormandos.column];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const comparison = String(aVal).localeCompare(String(bVal), 'pt-BR', { numeric: true });
      return sortFormandos.direction === 'asc' ? comparison : -comparison;
    });
  };

  // Componente de cabeçalho com ordenação
  const SortableHeader = ({ column, label, className = '', style }: { column: string; label: string; className?: string; style?: React.CSSProperties }) => (
    <TableHead 
      className={`cursor-pointer hover:bg-slate-100 select-none ${className}`} 
      style={style}
      onClick={() => toggleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortFormandos.column === column ? 'text-amber-600' : 'text-slate-400'}`} />
        {sortFormandos.column === column && (
          <span className="text-xs text-amber-600">
            {sortFormandos.direction === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </TableHead>
  );

  // Queries
  const { data: turmas, isLoading: loadingTurmas } = trpc.turmas.list.useQuery();
  // Usar query específica por turma para melhor performance e evitar problemas de filtragem
  const { data: eventosDaTurmaQuery, isLoading: loadingEventos } = trpc.eventos.listByTurma.useQuery(
    { turmaId: selectedTurmaId || 0 },
    { enabled: !!selectedTurmaId }
  );
  const { data: formandos, isLoading: loadingFormandos, refetch: refetchFormandos } = trpc.formandos.listByTurma.useQuery(
    { turmaId: selectedTurmaId || 0 },
    { enabled: !!selectedTurmaId }
  );
  const { data: produtos } = trpc.produtos.list.useQuery();
  const { data: cenariosAntigos } = trpc.cenarios.listByAgendamento.useQuery(
    { agendamentoId: showCenarios?.agendamentoId || 0 },
    { enabled: !!showCenarios?.agendamentoId }
  );
  const { data: tiposCenario } = trpc.tiposCenario.list.useQuery();
  const { data: fornecedores } = trpc.fornecedores.list.useQuery();
  const { data: tiposServicoData } = trpc.tiposServico.list.useQuery();
  const { data: execucoesFormando, refetch: refetchExecucoes } = trpc.execucaoFormando.listByEvento.useQuery(
    { eventoId: selectedEventoId || 0 },
    { enabled: !!selectedEventoId }
  );
  
  // Query para carregar serviços de Make e Cabelo salvos do formando quando o modal é aberto
  const { data: servicosSalvos, refetch: refetchServicos } = trpc.servicosExecucao.listByEventoFormando.useQuery(
    { eventoId: selectedEventoId || 0, formandoId: showFotoModal?.id || 0 },
    { enabled: !!selectedEventoId && !!showFotoModal?.id }
  );
  
  // Query para carregar histórico de vendas do formando quando o modal de venda é aberto
  const { data: historicoVendas, refetch: refetchHistoricoVendas } = trpc.vendas.listByFormando.useQuery(
    { formandoId: showVendaModal?.id || 0 },
    { enabled: !!showVendaModal?.id }
  );
  
  // Query para carregar todos os serviços do evento (para indicadores visuais)
  const { data: todosServicosEvento, refetch: refetchTodosServicos } = trpc.servicosExecucao.listByEvento.useQuery(
    { eventoId: selectedEventoId || 0 },
    { enabled: !!selectedEventoId }
  );
  
  // Query para buscar valores de maquiagem da turma (com fallback)
  const { data: valoresMaquiagem } = trpc.configMaquiagemTurma.getValoresByTurma.useQuery(
    { turmaId: selectedTurmaId || 0 },
    { enabled: !!selectedTurmaId }
  );
  
  // Criar mapa de serviços por formando para indicadores visuais
  const servicosPorFormando = useMemo(() => {
    const mapa = new Map<number, { hasMake: boolean; hasMakeFamilia: boolean; hasCabelo: boolean }>(); 
    if (todosServicosEvento) {
      todosServicosEvento.forEach((servico: any) => {
        const atual = mapa.get(servico.formandoId) || { hasMake: false, hasMakeFamilia: false, hasCabelo: false };
        if (servico.tipoServico === 'make_formando') atual.hasMake = true;
        if (servico.tipoServico === 'make_familia') atual.hasMakeFamilia = true;
        if (servico.tipoServico === 'cabelo_simples' || servico.tipoServico === 'cabelo_combinado') atual.hasCabelo = true;
        mapa.set(servico.formandoId, atual);
      });
    }
    return mapa;
  }, [todosServicosEvento]);
  
  // Mutations
  const updateFormandoMutation = trpc.formandos.update.useMutation({
    onSuccess: () => {
      toast.success("Formando atualizado!");
      setEditingFormando(null);
      refetchFormandos();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const createVendaMutation = trpc.vendas.create.useMutation({
    onSuccess: () => {
      toast.success("Venda registrada com sucesso!");
      setShowVendaModal(null);
      setItensVenda([]);
      setPagamentos([]);
      setEditandoVenda(null);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateVendaMutation = trpc.vendas.update.useMutation({
    onSuccess: () => {
      toast.success("Venda atualizada com sucesso!");
      // Refetch para garantir dados atualizados
      refetchHistoricoVendas();
      setShowVendaModal(null);
      setItensVenda([]);
      setPagamentos([]);
      setEditandoVenda(null);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar venda: ${error.message}`);
    },
  });

  const upsertExecucaoMutation = trpc.execucaoFormando.upsert.useMutation({
    // Removido onSuccess automático para evitar refetch durante salvamento do modal
    // O refetch será feito manualmente após fechar o modal
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const createFotoFormandoMutation = trpc.fotosFormando.create.useMutation({
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteAllFotosMutation = trpc.fotosFormando.deleteAll.useMutation({
    onError: (error) => {
      toast.error(`Erro ao limpar fotos: ${error.message}`);
    },
  });

  // Mutations para serviços de Make e Cabelo
  const createMakeFormandoMutation = trpc.servicosExecucao.createMakeFormando.useMutation({
    onError: (error) => {
      toast.error(`Erro ao registrar make: ${error.message}`);
    },
  });

  const createMakeFamiliaMutation = trpc.servicosExecucao.createMakeFamilia.useMutation({
    onError: (error) => {
      toast.error(`Erro ao registrar make família: ${error.message}`);
    },
  });

  const createCabeloMutation = trpc.servicosExecucao.createCabelo.useMutation({
    onError: (error) => {
      toast.error(`Erro ao registrar cabelo: ${error.message}`);
    },
  });

  const deleteServicoMutation = trpc.servicosExecucao.delete.useMutation({
    onError: (error) => {
      toast.error(`Erro ao excluir serviço: ${error.message}`);
    },
  });

  const deleteAllServicosMutation = trpc.servicosExecucao.deleteByEventoFormando.useMutation({
    onError: (error) => {
      toast.error(`Erro ao excluir serviços: ${error.message}`);
    },
  });

  const deleteVendaMutation = trpc.vendas.delete.useMutation({
    onSuccess: () => {
      toast.success("Venda excluída com sucesso!");
      refetchHistoricoVendas();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir venda: ${error.message}`);
    },
  });

  // Estado para edição de venda
  const [editandoVenda, setEditandoVenda] = useState<any>(null);

  // useEffect para carregar dados da venda ao editar
  useEffect(() => {
    if (editandoVenda) {
      // Carregar data da venda
      if (editandoVenda.dataVenda) {
        const dataFormatada = new Date(editandoVenda.dataVenda).toISOString().split('T')[0];
        setDataVenda(dataFormatada);
      }
      
      // Carregar itens da venda
      if (editandoVenda.itens && Array.isArray(editandoVenda.itens)) {
        const itensCarregados = editandoVenda.itens.map((item: any) => ({
          produtoId: item.produtoId,
          produto: item.produto || '',
          categoria: item.categoria || 'Outros',
          quantidade: item.quantidade || 1,
          valorUnitario: item.valorUnitario || 0,
          ajusteValor: item.ajusteValor || 0,
          justificativa: item.justificativa || ''
        }));
        setItensVenda(itensCarregados);
      }
      
      // Carregar pagamentos da venda
      if (editandoVenda.pagamentos && Array.isArray(editandoVenda.pagamentos)) {
        const pagamentosCarregados = editandoVenda.pagamentos.map((pag: any) => ({
          tipo: pag.tipo || 'pix',
          valor: pag.valor || 0,
          bandeira: pag.bandeira || '',
          parcelas: pag.parcelas || 1,
          cvNsu: pag.cvNsu || ''
        }));
        setPagamentos(pagamentosCarregados);
      }
      
      console.log('[DEBUG] Venda carregada para edição:', editandoVenda);
    }
  }, [editandoVenda]);

  // Dados derivados
  const selectedTurma = turmas?.find(t => t.id === selectedTurmaId);
  
  // Filtrar turmas baseado na busca
  const filteredTurmas = useMemo(() => {
    if (!turmas) return [];
    if (!searchTurma.trim()) return turmas;
    const search = searchTurma.toLowerCase();
    return turmas.filter(t => 
      t.codigo?.toLowerCase().includes(search) ||
      t.cursos?.toLowerCase().includes(search) ||
      t.instituicoes?.toLowerCase().includes(search)
    );
  }, [turmas, searchTurma]);

  // Filtrar eventos que possuem data cadastrada
  const eventosDaTurma = useMemo(() => {
    console.log('eventosDaTurmaQuery:', eventosDaTurmaQuery);
    if (!eventosDaTurmaQuery) return [];
    const filtered = eventosDaTurmaQuery.filter(e => e.dataEvento);
    console.log('eventosDaTurma filtrados:', filtered);
    return filtered;
  }, [eventosDaTurmaQuery]);

  const selectedEvento = eventosDaTurma.find(e => e.id === selectedEventoId);

  // Encontrar os IDs dos tipos de serviço relacionados a fotógrafo
  const tiposFotografoIds = tiposServicoData?.filter((t: any) => {
    const nome = t.nome?.toLowerCase() || '';
    return nome.includes('fotógrafo') || nome.includes('fotografo');
  }).map((t: any) => t.id) || [];
  
  // Filtrar apenas fotógrafos
  const fotografos = fornecedores?.filter((f: any) => {
    const tiposServico = f.tiposServico ? JSON.parse(f.tiposServico) : [];
    return tiposServico.some((t: any) => {
      const tipoId = typeof t === 'string' ? parseInt(t) : t;
      if (tiposFotografoIds.includes(tipoId)) return true;
      if (typeof t === 'string' && isNaN(parseInt(t))) {
        return t.toLowerCase().includes('fotógrafo') || t.toLowerCase().includes('fotografo');
      }
      return false;
    });
  }) || [];

  // Encontrar os IDs dos tipos de serviço relacionados a maquiagem
  const tiposMaquiagemIds = tiposServicoData?.filter((t: any) => {
    const nome = t.nome?.toLowerCase() || '';
    return nome.includes('maquiagem') || nome.includes('maquiador') || nome.includes('make');
  }).map((t: any) => t.id) || [];
  
  // Filtrar apenas maquiadoras
  const maquiadoras = fornecedores?.filter((f: any) => {
    const tiposServico = f.tiposServico ? JSON.parse(f.tiposServico) : [];
    return tiposServico.some((t: any) => {
      const tipoId = typeof t === 'string' ? parseInt(t) : t;
      if (tiposMaquiagemIds.includes(tipoId)) return true;
      if (typeof t === 'string' && isNaN(parseInt(t))) {
        return t.toLowerCase().includes('maquiagem') || t.toLowerCase().includes('maquiador') || t.toLowerCase().includes('make');
      }
      return false;
    });
  }) || [];

  // Cenários do evento selecionado
  const cenariosDoEvento = useMemo(() => {
    if (!selectedEvento?.cenarios || !tiposCenario) return [];
    try {
      const cenarioIds = JSON.parse(selectedEvento.cenarios);
      if (Array.isArray(cenarioIds)) {
        // Se for array de IDs
        if (cenarioIds.length > 0 && typeof cenarioIds[0] === 'number') {
          return tiposCenario.filter((c: any) => cenarioIds.includes(c.id));
        }
      }
      return [];
    } catch {
      return [];
    }
  }, [selectedEvento, tiposCenario]);
  
  // Fotógrafos do evento selecionado (filtrar pelos que foram selecionados no evento)
  const fotografosDoEvento = useMemo(() => {
    if (!selectedEvento?.fotografos || !fotografos) return fotografos || [];
    try {
      const fotografoIds = JSON.parse(selectedEvento.fotografos);
      if (Array.isArray(fotografoIds) && fotografoIds.length > 0) {
        // Filtrar apenas os fotógrafos que foram selecionados no evento
        return fotografos.filter((f: any) => fotografoIds.includes(f.id));
      }
      return fotografos || [];
    } catch {
      return fotografos || [];
    }
  }, [selectedEvento, fotografos]);
  
  // Maquiadoras do evento selecionado (filtrar pelas que foram selecionadas no evento)
  const maquiadorasDoEvento = useMemo(() => {
    if (!selectedEvento?.maquiadoras || !maquiadoras) return maquiadoras || [];
    try {
      const maquiadoraIds = JSON.parse(selectedEvento.maquiadoras);
      if (Array.isArray(maquiadoraIds) && maquiadoraIds.length > 0) {
        // Filtrar apenas as maquiadoras que foram selecionadas no evento
        return maquiadoras.filter((m: any) => maquiadoraIds.includes(m.id));
      }
      return maquiadoras || [];
    } catch {
      return maquiadoras || [];
    }
  }, [selectedEvento, maquiadoras]);

  // Mapa de execuções por formando
  const execucoesMap = useMemo(() => {
    const map = new Map<number, any>();
    execucoesFormando?.forEach((e: any) => {
      map.set(e.formandoId, e);
    });
    return map;
  }, [execucoesFormando]);

  // Query para buscar fotos existentes do formando quando o modal é aberto
  const execucaoDoFormandoNoModal = showFotoModal ? execucoesMap.get(showFotoModal.id) : null;
  const { data: fotosExistentes, refetch: refetchFotos } = trpc.fotosFormando.list.useQuery(
    { execucaoFormandoId: execucaoDoFormandoNoModal?.id || 0 },
    { enabled: !!execucaoDoFormandoNoModal?.id }
  );

  // Query para buscar dados da Abordagem (horários de cenários preenchidos)
  const { data: dadosAbordagem } = trpc.fotosFormando.listByBriefingFormando.useQuery(
    { briefingFormandoId: showFotoModal?.briefingFormandoId || 0 },
    { enabled: !!showFotoModal?.briefingFormandoId }
  );

  // Efeito para carregar fotos existentes quando o modal é aberto
  useEffect(() => {
    if (showFotoModal && fotosExistentes && fotosExistentes.length > 0) {
      // Converter fotos existentes para o formato do formulário
      const registrosExistentes: FotoRegistro[] = fotosExistentes.map((foto: any, index: number) => ({
        id: index + 1,
        cenarioId: foto.cenarioId?.toString() || "",
        numeroArquivos: foto.numeroArquivos?.toString() || "",
        fotografoId: foto.fotografoId?.toString() || "",
        fotografoSearch: "",
        observacao: foto.observacao || "",
        horarioInicio: foto.horarioInicio || "",
        horarioTermino: foto.horarioTermino || "",
      }));
      setFotoRegistros(registrosExistentes);
    } else if (showFotoModal && dadosAbordagem && dadosAbordagem.length > 0) {
      // Se não há fotos existentes mas há dados da Abordagem, carregar horários
      const registrosAbordagem: FotoRegistro[] = dadosAbordagem.map((foto: any, index: number) => ({
        id: index + 1,
        cenarioId: foto.cenarioId?.toString() || "",
        numeroArquivos: "",
        fotografoId: "",
        fotografoSearch: "",
        observacao: foto.observacao || "",
        horarioInicio: foto.horarioInicio || "",
        horarioTermino: foto.horarioTermino || "",
      }));
      setFotoRegistros(registrosAbordagem);
    } else if (showFotoModal && (!fotosExistentes || fotosExistentes.length === 0)) {
      // Se não há fotos existentes, iniciar com formulário vazio
      setFotoRegistros([{ id: 1, cenarioId: "", numeroArquivos: "", fotografoId: "", fotografoSearch: "", observacao: "" }]);
    }
  }, [showFotoModal, fotosExistentes, dadosAbordagem]);

  // Efeito para carregar a data de execução e observações da tabela execucaoFormando
  useEffect(() => {
    if (showFotoModal && execucaoDoFormandoNoModal) {
      // Tentar carregar data de execução dos registros de foto existentes (prioridade)
      if (fotosExistentes && fotosExistentes.length > 0 && fotosExistentes[0].dataExecucao) {
        const dataFormatada = new Date(fotosExistentes[0].dataExecucao).toISOString().split('T')[0];
        setDataExecucao(dataFormatada);
      } else if (execucaoDoFormandoNoModal.dataExecucao) {
        // Fallback: carregar da tabela execucaoFormando
        const dataFormatada = new Date(execucaoDoFormandoNoModal.dataExecucao).toISOString().split('T')[0];
        setDataExecucao(dataFormatada);
      } else {
        // Se não houver data salva, usar data atual de Recife
        setDataExecucao(getDataRecifeHoje());
      }
      // Carregar observações
      if (execucaoDoFormandoNoModal.observacoes) {
        setObservacoesGerais(execucaoDoFormandoNoModal.observacoes);
      }
    }
  }, [showFotoModal, execucaoDoFormandoNoModal, fotosExistentes]);

  // Efeito para carregar serviços de Make e Cabelo salvos quando o modal é aberto
  useEffect(() => {
    if (showFotoModal && servicosSalvos && servicosSalvos.length > 0 && !servicosJaCarregados) {
      setServicosJaCarregados(true);
      
      // Carregar Make do Formando
      const makeFormando = servicosSalvos.find((s: any) => s.tipoServico === 'make_formando');
      if (makeFormando) {
        setMakeFormandoMaquiadora(makeFormando.fornecedorId?.toString() || "");
        setMakeFormandoRetoque(0); // Retoque não é salvo ainda
        // Carregar o tipo de make diretamente do banco de dados
        if (makeFormando.tipoMake) {
          setMakeFormandoTipo(makeFormando.tipoMake as 'masc' | 'fem');
        } else {
          // Fallback: Determinar o tipo baseado no valor salvo (para dados antigos)
          if (selectedTurma && makeFormando.valorUnitario) {
            const valorMasc = selectedTurma.valorMakeFormandoMasc || 0;
            const valorFem = selectedTurma.valorMakeFormandoFem || 0;
            if (makeFormando.valorUnitario === valorMasc) {
              setMakeFormandoTipo('masc');
            } else {
              setMakeFormandoTipo('fem');
            }
          }
        }
        // Popular o servicosMakeCabelo com o make_formando salvo
        setServicosMakeCabelo(prev => {
          const filtered = prev.filter(s => s.tipo !== 'make_formando');
          return [...filtered, {
            tipo: 'make_formando' as const,
            quantidade: 1,
            fornecedorId: makeFormando.fornecedorId?.toString() || "",
            fornecedorSearch: ""
          }];
        });
      }
      
      // Carregar Make Família (múltiplas maquiadoras)
      const makesFamilia = servicosSalvos.filter((s: any) => s.tipoServico === 'make_familia');
      if (makesFamilia.length > 0) {
        setMakeFamiliaItems(makesFamilia.map((mf: any, idx: number) => ({
          id: idx + 1,
          fornecedorId: mf.fornecedorId?.toString() || "",
          quantidade: mf.quantidade || 1
        })));
      } else {
        setMakeFamiliaItems([]);
      }
      
      // Carregar Cabelo Simples
      const cabeloSimples = servicosSalvos.find((s: any) => s.tipoServico === 'cabelo_simples');
      if (cabeloSimples) {
        setServicosMakeCabelo(prev => {
          const filtered = prev.filter(s => s.tipo !== 'cabelo_simples');
          return [...filtered, {
            tipo: 'cabelo_simples' as const,
            quantidade: cabeloSimples.quantidade || 0,
            fornecedorId: "",
            fornecedorSearch: ""
          }];
        });
      }
      
      // Carregar Cabelo Combinado
      const cabeloCombinado = servicosSalvos.find((s: any) => s.tipoServico === 'cabelo_combinado');
      if (cabeloCombinado) {
        setServicosMakeCabelo(prev => {
          const filtered = prev.filter(s => s.tipo !== 'cabelo_combinado');
          return [...filtered, {
            tipo: 'cabelo_combinado' as const,
            quantidade: cabeloCombinado.quantidade || 0,
            fornecedorId: "",
            fornecedorSearch: ""
          }];
        });
      }
    }
  }, [showFotoModal, servicosSalvos, servicosJaCarregados]);

  // Agrupar produtos por categoria
  const produtosPorCategoria = useMemo(() => {
    if (!produtos) return {};
    return produtos.reduce((acc, p) => {
      const cat = p.descricao || "Outros";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    }, {} as Record<string, typeof produtos>);
  }, [produtos]);

  // Filtrar formandos
  const filteredFormandos = useMemo(() => {
    if (!formandos) return [];
    return formandos.filter((f: any) => {
      const matchesSearch = f.nome.toLowerCase().includes(searchFormando.toLowerCase()) ||
        f.telefone?.includes(searchFormando) ||
        f.cpf?.includes(searchFormando);
      
      // Filtro de observações
      const execucao = execucoesMap.get(f.id);
      const temObservacoes = execucao?.observacoes && execucao.observacoes.trim() !== "";
      const matchesObs = filterObservacoes === "all" ||
        (filterObservacoes === "com" && temObservacoes) ||
        (filterObservacoes === "sem" && !temObservacoes);
      
      // Filtro por pacote baseado no tipo de evento
      let matchesPacote = true;
      if (selectedEvento && selectedTurma?.pacotesConfig) {
        try {
          const pacotes = JSON.parse(selectedTurma.pacotesConfig);
          const pacoteFormando = f.pacote;
          
          if (pacoteFormando) {
            // Encontrar configuração do pacote do formando
            const configPacote = pacotes.find((p: any) => p.nome === pacoteFormando);
            
            if (configPacote) {
              // Verificar se o tipo de evento está incluído no pacote
              matchesPacote = configPacote.tiposEventos.includes(selectedEvento.tipoEvento);
            }
          }
        } catch (e) {
          // Se houver erro ao parsear, não filtrar
          matchesPacote = true;
        }
      }
      
      return matchesSearch && matchesObs && matchesPacote;
    });
  }, [formandos, searchFormando, filterObservacoes, execucoesMap, selectedEvento, selectedTurma]);

  // Calcular totais
  const totalItens = itensVenda.reduce((sum, item) => sum + (item.valorUnitario * item.quantidade) + (item.ajusteValor || 0), 0);
  const totalPagamentos = pagamentos.reduce((sum, p) => sum + p.valor, 0);

  // Handlers
  const handleAddItem = (produto: any) => {
    const existing = itensVenda.find(i => i.produtoId === produto.id);
    if (existing) {
      setItensVenda(itensVenda.map(i => 
        i.produtoId === produto.id 
          ? { ...i, quantidade: i.quantidade + 1 }
          : i
      ));
    } else {
      setItensVenda([...itensVenda, {
        produtoId: produto.id,
        produto: produto.nome,
        categoria: produto.descricao || "Outros",
        quantidade: 1,
        valorUnitario: produto.preco,
        ajusteValor: 0,
        justificativa: "",
      }]);
    }
  };

  const handleRemoveItem = (produtoId: number) => {
    setItensVenda(itensVenda.filter(i => i.produtoId !== produtoId));
  };

  const handleUpdateQuantidade = (produtoId: number, quantidade: number) => {
    if (quantidade <= 0) {
      handleRemoveItem(produtoId);
    } else {
      setItensVenda(itensVenda.map(i => 
        i.produtoId === produtoId ? { ...i, quantidade } : i
      ));
    }
  };

  const handleAddPagamento = () => {
    const valor = Math.round(parseFloat(novoPagamentoValor || "0") * 100);
    if (valor <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    // Validar CV/NSU para pagamentos que não são dinheiro ou incluso no pacote
    if (novoPagamentoTipo !== "dinheiro" && novoPagamentoTipo !== "incluso_pacote" && !novoPagamentoCvNsu.trim()) {
      toast.error("Informe o CV (NSU) do pagamento");
      return;
    }
    setPagamentos([...pagamentos, {
      tipo: novoPagamentoTipo,
      valor,
      bandeira: novoPagamentoTipo === "credito" || novoPagamentoTipo === "debito" ? novoPagamentoBandeira : undefined,
      parcelas: novoPagamentoTipo === "credito" ? novoPagamentoParcelas : 1,
      cvNsu: novoPagamentoTipo !== "dinheiro" ? novoPagamentoCvNsu : undefined,
    }]);
    // Limpar todos os campos
    setNovoPagamentoTipo("pix");
    setNovoPagamentoValor("");
    setNovoPagamentoBandeira("VISA");
    setNovoPagamentoParcelas(1);
    setNovoPagamentoCvNsu("");
  };

  const handleRemovePagamento = (index: number) => {
    setPagamentos(pagamentos.filter((_, i) => i !== index));
  };

  const handleFinalizarVenda = () => {
    if (itensVenda.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }
    if (pagamentos.length === 0) {
      toast.error("Adicione pelo menos um pagamento");
      return;
    }
    if (totalPagamentos < totalItens) {
      toast.error("O valor dos pagamentos é menor que o total");
      return;
    }
    
    // Validar justificativa obrigatória quando há ajuste de valor
    const itemSemJustificativa = itensVenda.find(item => item.ajusteValor !== 0 && !item.justificativa?.trim());
    if (itemSemJustificativa) {
      toast.error(`Informe a justificativa para o ajuste do item "${itemSemJustificativa.produto}"`);
      return;
    }

    // Se está editando uma venda existente, usar mutation de update
    if (editandoVenda) {
      updateVendaMutation.mutate({
        id: editandoVenda.id,
        dataVenda: new Date(dataVenda + 'T12:00:00'),
        itens: itensVenda.map(item => ({
          ...item,
          ajusteValor: item.ajusteValor || 0,
          justificativa: item.justificativa || "",
        })),
        pagamentos: pagamentos.map(p => ({
          tipo: p.tipo as "pix" | "dinheiro" | "debito" | "credito" | "incluso_pacote",
          valor: p.valor,
          bandeira: p.bandeira,
          parcelas: p.parcelas,
          cvNsu: p.cvNsu || undefined,
        })) as any,
      });
    } else {
      // Criar nova venda
      createVendaMutation.mutate({
        eventoId: selectedEventoId!,
        formandoId: showVendaModal.id,
        dataVenda: new Date(dataVenda + 'T12:00:00'),
        itens: itensVenda.map(item => ({
          ...item,
          ajusteValor: item.ajusteValor || 0,
          justificativa: item.justificativa || "",
        })),
        pagamentos: pagamentos.map(p => ({
          tipo: p.tipo as "pix" | "dinheiro" | "debito" | "credito" | "incluso_pacote",
          valor: p.valor,
          bandeira: p.bandeira,
          parcelas: p.parcelas,
          cvNsu: p.cvNsu || undefined,
        })) as any,
      });
    }
  };

  const handleUpdateFormando = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateFormandoMutation.mutate({
      id: editingFormando.id,
      nome: editingFormando.nome,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Execução</h1>
        <p className="text-slate-500 mt-1">
          Controle a execução dos eventos e vendas
        </p>
      </div>

      {/* Seleção de Turma e Evento */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-amber-500" />
            Selecione a Turma e o Evento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Busca de Turma */}
            <div className="space-y-2">
              <Label>Turma</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Buscar turma por código, curso ou instituição..."
                  value={searchTurma}
                  onChange={(e) => setSearchTurma(e.target.value)}
                  className="w-full"
                />
                <select
                  value={selectedTurmaId?.toString() || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedTurmaId(val ? parseInt(val) : null);
                    setSelectedEventoId(null);
                  }}
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Selecione a turma</option>
                  {filteredTurmas.slice(0, 50).map((turma) => {
                    let label = turma.codigo;
                    try {
                      const cur = JSON.parse(turma.cursos || '[]');
                      const inst = JSON.parse(turma.instituicoes || '[]');
                      const anos = JSON.parse(turma.anos || '[]');
                      label = `${turma.codigo} - ${cur.join(', ')} ${inst.join(', ')} ${turma.numeroTurma || ''} ${anos.join(', ')}`;
                    } catch {}
                    return (
                      <option key={turma.id} value={turma.id.toString()}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                {searchTurma && filteredTurmas.length > 50 && (
                  <p className="text-xs text-slate-500">Mostrando 50 de {filteredTurmas.length} turmas. Refine sua busca.</p>
                )}
              </div>
            </div>

            {/* Seleção de Evento */}
            <div className="space-y-2">
              <Label>Evento</Label>
              <select
                value={selectedEventoId?.toString() || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedEventoId(val ? parseInt(val) : null);
                }}
                disabled={!selectedTurmaId || eventosDaTurma.length === 0}
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{eventosDaTurma.length === 0 ? "Nenhum evento" : "Selecione o evento"}</option>
                {(() => {
                  // Função para formatar tipo de evento em Camel Case
                  const formatarTipoEvento = (tipo: string) => {
                    const mapa: Record<string, string> = {
                      'foto_estudio': 'Foto Estúdio',
                      'foto_50': 'Foto 50%',
                      'foto_descontraida': 'Foto Descontraída',
                      'foto_oficial': 'Foto Oficial',
                      'foto_samu': 'Foto SAMU',
                      'foto_bloco': 'Foto Bloco',
                      'foto_consultorio': 'Foto Consultório',
                    };
                    return mapa[tipo] || tipo.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                  };

                  // Remover duplicatas mantendo apenas o primeiro de cada tipo
                  const tiposUnicos = new Map<string, typeof eventosDaTurma[0]>();
                  eventosDaTurma.forEach(evento => {
                    if (evento.tipoEvento && !tiposUnicos.has(evento.tipoEvento)) {
                      tiposUnicos.set(evento.tipoEvento, evento);
                    }
                  });

                  return Array.from(tiposUnicos.values()).map((evento) => (
                    <option key={evento.id} value={evento.id.toString()}>
                      {formatarTipoEvento(evento.tipoEvento || '')}
                    </option>
                  ));
                })()}
              </select>
            </div>
          </div>

          {/* Busca de Formando */}
          {selectedEventoId && (
            <div className="mt-4 flex gap-4 items-end">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar formando por nome, telefone ou CPF..."
                  value={searchFormando}
                  onChange={(e) => setSearchFormando(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="w-48">
                <select
                  value={filterObservacoes}
                  onChange={(e) => setFilterObservacoes(e.target.value as "all" | "com" | "sem")}
                  className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">Todas observações</option>
                  <option value="com">Com observações</option>
                  <option value="sem">Sem observações</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Formandos */}
      {selectedEventoId && (
        <Card className="border-0 shadow-md flex flex-col" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <CardHeader className="bg-white border-b flex-shrink-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-amber-500" />
              Formandos ({filteredFormandos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            {loadingFormandos ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredFormandos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Users className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">Nenhum formando encontrado</p>
              </div>
            ) : (
              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b" style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#f8fafc' }}>
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted" style={{ backgroundColor: '#f8fafc' }}>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-slate-100 select-none min-w-[200px]" style={{ position: 'sticky', left: 0, zIndex: 40, backgroundColor: '#f8fafc', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }} onClick={() => toggleSort('nome')}>
                        <div className="flex items-center gap-1">
                          Nome
                          <ArrowUpDown className={`h-3 w-3 ${sortFormandos.column === 'nome' ? 'text-amber-600' : 'text-slate-400'}`} />
                        </div>
                      </th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-slate-100 select-none" style={{ backgroundColor: '#f8fafc' }} onClick={() => toggleSort('telefone')}>
                        <div className="flex items-center gap-1">
                          Telefone
                          <ArrowUpDown className={`h-3 w-3 ${sortFormandos.column === 'telefone' ? 'text-amber-600' : 'text-slate-400'}`} />
                        </div>
                      </th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-slate-100 select-none" style={{ backgroundColor: '#f8fafc' }} onClick={() => toggleSort('pacote')}>
                        <div className="flex items-center gap-1">
                          Pacote
                          <ArrowUpDown className={`h-3 w-3 ${sortFormandos.column === 'pacote' ? 'text-amber-600' : 'text-slate-400'}`} />
                        </div>
                      </th>
                      <th className="h-10 px-2 text-center align-middle font-medium text-muted-foreground cursor-pointer hover:bg-slate-100 select-none" style={{ backgroundColor: '#f8fafc' }} onClick={() => toggleSort('tamanhoBeca')}>
                        <div className="flex items-center justify-center gap-1">
                          Beca
                          <ArrowUpDown className={`h-3 w-3 ${sortFormandos.column === 'tamanhoBeca' ? 'text-amber-600' : 'text-slate-400'}`} />
                        </div>
                      </th>

                      <th className="h-10 px-2 text-center align-middle font-medium text-muted-foreground cursor-pointer hover:bg-slate-100 select-none" style={{ backgroundColor: '#f8fafc' }} onClick={() => toggleSort('comissao')}>
                        <div className="flex items-center justify-center gap-1">
                          Comissão
                          <ArrowUpDown className={`h-3 w-3 ${sortFormandos.column === 'comissao' ? 'text-amber-600' : 'text-slate-400'}`} />
                        </div>
                      </th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-slate-100 select-none" style={{ backgroundColor: '#f8fafc' }} onClick={() => toggleSort('status')}>
                        <div className="flex items-center gap-1">
                          Status
                          <ArrowUpDown className={`h-3 w-3 ${sortFormandos.column === 'status' ? 'text-amber-600' : 'text-slate-400'}`} />
                        </div>
                      </th>
                      <th className="h-10 px-2 text-center align-middle font-medium text-muted-foreground" style={{ backgroundColor: '#f8fafc' }} title="Serviços de Make e Cabelo registrados">Serviços</th>
                      <th className="h-10 px-2 text-center align-middle font-medium text-muted-foreground" style={{ position: 'sticky', right: 72, zIndex: 20, backgroundColor: '#f8fafc', boxShadow: '-2px 0 5px -2px rgba(0,0,0,0.1)' }}>Arquivo</th>
                      <th className="h-10 px-2 text-center align-middle font-medium text-muted-foreground" style={{ position: 'sticky', right: 0, zIndex: 20, backgroundColor: '#f8fafc' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {sortData(filteredFormandos).map((formando: any) => (
                      <tr key={formando.id} className="border-b transition-colors hover:bg-slate-50/50 data-[state=selected]:bg-muted">
                        <td className="p-2 align-middle sticky left-0 bg-white z-10 min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          <div>
                            <p className="font-medium">{formando.nome}</p>
                            <p className="text-xs text-slate-400">{formando.email || '-'}</p>
                          </div>
                        </td>
                        <td className="p-2 align-middle text-slate-600">
                          {formando.telefone || "-"}
                        </td>
                        <td className="p-2 align-middle">
                          <Badge variant="secondary">{formando.pacote || "-"}</Badge>
                        </td>
                        <td className="p-2 align-middle text-center">
                          <select
                            value={formando.tamanhoBeca || ""}
                            onChange={(e) => {
                              updateFormandoMutation.mutate({
                                id: formando.id,
                                tamanhoBeca: e.target.value === "" ? null : e.target.value,
                              });
                            }}
                            className="w-20 h-8 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">-</option>
                            {TAMANHOS_BECA.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>

                        <td className="p-2 align-middle text-center">
                          {formando.eComissao ? (
                            <Badge className="bg-violet-100 text-violet-700">Sim</Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-2 align-middle">
                          {(() => {
                            const execucao = execucoesMap.get(formando.id);
                            const statusAtual = execucao?.status || "apto";
                            return (
                              <select
                                value={statusAtual}
                                disabled={!podeEditarStatus}
                                onChange={(e) => {
                                  const novoStatus = e.target.value as "apto" | "inapto" | "migracao";
                                  if (!selectedEventoId) return;
                                  upsertExecucaoMutation.mutate({
                                    eventoId: selectedEventoId,
                                    formandoId: formando.id,
                                    status: novoStatus,
                                  });
                                }}
                                className={
                                  `px-2 py-1 rounded-md text-xs font-medium border ${
                                    podeEditarStatus ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                                  } ${
                                    statusAtual === "apto" ? "bg-green-100 text-green-800 border-green-300" :
                                    statusAtual === "inapto" ? "bg-red-100 text-red-800 border-red-300" :
                                    statusAtual === "migracao" ? "bg-yellow-100 text-yellow-800 border-yellow-300" :
                                    "bg-green-100 text-green-800 border-green-300"
                                  }`
                                }
                                title={!podeEditarStatus ? "Apenas Financeiro, Gestor, Administrador e Controle podem alterar o Status" : ""}
                              >
                                <option value="apto">Apto</option>
                                <option value="inapto">Inapto</option>
                                <option value="migracao">Migração</option>
                              </select>
                            );
                          })()}
                        </td>
                        <td className="p-2 align-middle text-center">
                          {(() => {
                            const servicos = servicosPorFormando.get(formando.id);
                            if (!servicos || (!servicos.hasMake && !servicos.hasMakeFamilia && !servicos.hasCabelo)) {
                              return <span className="text-slate-300">-</span>;
                            }
                            return (
                              <div className="flex items-center justify-center gap-1">
                                {servicos.hasMake && (
                                  <span title="Make Formando" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-pink-100 text-pink-600 text-xs font-medium">
                                    <Sparkles className="h-3 w-3" />
                                  </span>
                                )}
                                {servicos.hasMakeFamilia && (
                                  <span title="Make Família" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs font-medium">
                                    <Users className="h-3 w-3" />
                                  </span>
                                )}
                                {servicos.hasCabelo && (
                                  <span title="Cabelo" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-600 text-xs font-medium">
                                    ✂
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-2 align-middle text-center sticky right-[72px] bg-white z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          <select
                            value={execucoesMap.get(formando.id)?.arquivoEntregue ? "sim" : "nao"}
                            onChange={(e) => {
                              if (selectedEventoId) {
                                upsertExecucaoMutation.mutate({
                                  eventoId: selectedEventoId,
                                  formandoId: formando.id,
                                  arquivoEntregue: e.target.value === "sim",
                                }, {
                                  onSuccess: () => refetchExecucoes(),
                                });
                              }
                            }}
                            className="w-16 h-8 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="nao">Não</option>
                            <option value="sim">Sim</option>
                          </select>
                        </td>
                        <td className="p-2 align-middle text-center sticky right-0 bg-white z-10">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setShowVendaModal(formando);
                                setItensVenda([]);
                                setPagamentos([]);
                              }}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Registrar Venda"
                            >
                              <DollarSign className="h-5 w-5" />
                            </Button>
                            {execucoesMap.get(formando.id)?.observacoes ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setShowFotoModal(formando);
                                      setFotoRegistros([{ id: 1, cenarioId: "", numeroArquivos: "", fotografoId: "", fotografoSearch: "", observacao: "" }]);
                                      setDataExecucao("");
                                      setObservacoesGerais("");
                                      setMakeFormandoRetoque(0);
                                      setMakeFormandoTipo(formando.sexo === 'M' ? 'masc' : 'fem');
                                      setComissaoFotoRegistros([]);
                                    }}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 relative"
                                  >
                                    <Camera className="h-5 w-5" />
                                    <MessageSquare className="h-3 w-3 absolute -top-1 -right-1 text-amber-500 fill-amber-100" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="font-medium text-xs mb-1">Observações:</p>
                                  <p className="text-xs">{execucoesMap.get(formando.id)?.observacoes}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setShowFotoModal(formando);
                                  setFotoRegistros([{ id: 1, cenarioId: "", numeroArquivos: "", fotografoId: "", fotografoSearch: "", observacao: "" }]);
                                  setDataExecucao("");
                                  setObservacoesGerais("");
                                  setMakeFormandoRetoque(0);
                                  setMakeFormandoTipo(formando.sexo === 'M' ? 'masc' : 'fem');
                                  setComissaoFotoRegistros([]);
                                }}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Registrar Foto"
                              >
                                <Camera className="h-5 w-5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estado vazio */}
      {!selectedEventoId && (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-slate-400">
              <PlayCircle className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Selecione uma turma e evento</p>
              <p className="text-sm mt-1">
                Escolha uma turma e evento acima para controlar a execução
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Venda */}
      <Dialog open={!!showVendaModal} onOpenChange={(open) => !open && setShowVendaModal(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-500" />
              Nova Venda - {showVendaModal?.nome}
            </DialogTitle>
          </DialogHeader>
          
          {/* Histórico de Vendas */}
          {historicoVendas && historicoVendas.length > 0 && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border">
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Histórico de Vendas ({historicoVendas.length})
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {historicoVendas.map((venda: any) => (
                  <div 
                    key={venda.id} 
                    className={cn(
                      "flex items-center justify-between text-xs p-2 bg-white rounded border",
                      venda.excluido ? "opacity-60" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-medium", venda.excluido && "line-through")}>
                          {new Date(venda.dataVenda).toLocaleDateString('pt-BR')}
                        </span>
                        {venda.excluido && (
                          <Badge variant="secondary" className="text-xs bg-slate-200 text-slate-600">
                            Excluído
                          </Badge>
                        )}
                      </div>
                      <span className={cn("text-slate-500 ml-2", venda.excluido && "line-through")}>
                        {venda.tipoEvento?.replace(/_/g, ' ') || 'Evento'}
                      </span>
                      {venda.itens && venda.itens.length > 0 && (
                        <span className={cn("text-slate-400 ml-2", venda.excluido && "line-through")}>
                          ({venda.itens.map((i: any) => i.produto).join(', ')})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-semibold",
                        venda.excluido ? "text-slate-400 line-through" : "text-emerald-600"
                      )}>
                        {formatCurrency(venda.valorTotal || 0)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditandoVenda(venda);
                        }}
                        title="Editar venda"
                        disabled={venda.excluido}
                      >
                        <Edit className={cn("h-3 w-3", venda.excluido ? "text-slate-300" : "text-blue-500")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          const motivo = prompt("Por favor, informe o motivo da exclusão:");
                          if (motivo !== null && motivo.trim() !== "") {
                            deleteVendaMutation.mutate({ id: venda.id, motivoExclusao: motivo });
                          } else if (motivo !== null) {
                            alert("É obrigatório informar o motivo da exclusão.");
                          }
                        }}
                        title="Excluir venda"
                        disabled={venda.excluido}
                      >
                        <Trash2 className={cn("h-3 w-3", venda.excluido ? "text-slate-300" : "text-red-500")} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Campo Data da Venda */}
          <div className="mb-4">
            <Label className="text-sm font-medium">Data da Venda</Label>
            <Input
              type="date"
              value={dataVenda}
              onChange={(e) => setDataVenda(e.target.value)}
              className="w-48 mt-1"
            />
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* Produtos por Categoria */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Produtos</h3>
              {Object.entries(produtosPorCategoria).map(([categoria, prods]) => (
                <div key={categoria} className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {categoria}
                  </h4>
                  <div className="grid gap-2">
                    {prods?.map((produto) => (
                      <div 
                        key={produto.id} 
                        className="flex items-center justify-between p-2 border rounded-lg hover:bg-slate-50 cursor-pointer"
                        onClick={() => handleAddItem(produto)}
                      >
                        <div>
                          <p className="text-sm font-medium">{produto.nome}</p>
                          <p className="text-xs text-slate-500">{formatCurrency(produto.preco)}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Carrinho e Pagamento */}
            <div className="space-y-4">
              {/* Itens do Carrinho */}
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900">Carrinho</h3>
                {itensVenda.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Nenhum item adicionado</p>
                ) : (
                  <div className="space-y-2">
                    {itensVenda.map((item) => (
                      <div key={item.produtoId} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.produto}</p>
                            <p className="text-xs text-slate-500">
                              {formatCurrency(item.valorUnitario)} x {item.quantidade}
                              {item.ajusteValor !== 0 && (
                                <span className={item.ajusteValor > 0 ? "text-emerald-600" : "text-red-600"}>
                                  {" "}({item.ajusteValor > 0 ? "+" : ""}{formatCurrency(item.ajusteValor)})
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => handleUpdateQuantidade(item.produtoId, item.quantidade - 1)}
                            >
                              -
                            </Button>
                            <span className="w-6 text-center text-sm">{item.quantidade}</span>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => handleUpdateQuantidade(item.produtoId, item.quantidade + 1)}
                            >
                              +
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-red-500"
                              onClick={() => handleRemoveItem(item.produtoId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {/* Campos de Ajuste de Valor */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed">
                          <div>
                            <label className="text-xs text-slate-500">Ajuste de Valor</label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              value={item.ajusteValor ? (item.ajusteValor / 100).toFixed(2) : ""}
                              onChange={(e) => {
                                const valor = Math.round(parseFloat(e.target.value || "0") * 100);
                                setItensVenda(itensVenda.map(i => 
                                  i.produtoId === item.produtoId ? { ...i, ajusteValor: valor } : i
                                ));
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500">Justificativa {item.ajusteValor !== 0 && <span className="text-red-500">*</span>}</label>
                            <Input
                              type="text"
                              placeholder="Motivo do ajuste"
                              value={item.justificativa || ""}
                              onChange={(e) => {
                                setItensVenda(itensVenda.map(i => 
                                  i.produtoId === item.produtoId ? { ...i, justificativa: e.target.value } : i
                                ));
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between p-2 bg-slate-50 rounded-lg font-semibold">
                      <span>Total:</span>
                      <span>{formatCurrency(totalItens)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Pagamentos */}
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900">Pagamento</h3>
                
                {/* Lista de pagamentos */}
                {pagamentos.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {pagamentos.map((pag, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {pag.tipo === "credito" ? `Crédito ${pag.parcelas}x - ${pag.bandeira}` :
                             pag.tipo === "debito" ? `Débito - ${pag.bandeira}` :
                             pag.tipo}
                          </p>
                          {pag.cvNsu && (
                            <p className="text-xs text-slate-500">NSU: {pag.cvNsu}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatCurrency(pag.valor)}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-red-500"
                            onClick={() => handleRemovePagamento(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Adicionar pagamento */}
                <div className="grid gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={novoPagamentoTipo}
                      onChange={(e) => setNovoPagamentoTipo(e.target.value as any)}
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="pix">PIX</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="debito">Cartão Débito</option>
                      <option value="credito">Cartão Crédito</option>
                      <option value="incluso_pacote">Incluso no Pacote</option>
                    </select>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Valor"
                      value={novoPagamentoValor}
                      onChange={(e) => setNovoPagamentoValor(e.target.value)}
                    />
                  </div>
                  
                  {(novoPagamentoTipo === "credito" || novoPagamentoTipo === "debito") && (
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={novoPagamentoBandeira}
                        onChange={(e) => setNovoPagamentoBandeira(e.target.value)}
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Bandeira</option>
                        {BANDEIRAS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                      {novoPagamentoTipo === "credito" && (
                        <select
                          value={novoPagamentoParcelas.toString()}
                          onChange={(e) => setNovoPagamentoParcelas(parseInt(e.target.value))}
                          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {[1, 2, 3, 4].map((p) => (
                            <option key={p} value={p.toString()}>{p}x</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                  
                  {/* Campo CV (NSU) - obrigatório exceto para dinheiro */}
                  {novoPagamentoTipo !== "dinheiro" && (
                    <div>
                      <Input
                        type="text"
                        placeholder="CV (NSU) *"
                        value={novoPagamentoCvNsu}
                        onChange={(e) => setNovoPagamentoCvNsu(e.target.value)}
                      />
                    </div>
                  )}
                  
                  <Button variant="outline" onClick={handleAddPagamento}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Pagamento
                  </Button>
                </div>

                {/* Resumo */}
                {pagamentos.length > 0 && (
                  <div className={cn(
                    "flex justify-between p-2 rounded-lg font-semibold",
                    totalPagamentos >= totalItens ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  )}>
                    <span>Total Pago:</span>
                    <span>{formatCurrency(totalPagamentos)}</span>
                  </div>
                )}
              </div>

              {/* Botão Finalizar/Salvar */}
              <Button 
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600"
                onClick={handleFinalizarVenda}
                disabled={createVendaMutation.isPending || updateVendaMutation.isPending || itensVenda.length === 0 || pagamentos.length === 0}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {editandoVenda ? 'Salvar Alterações' : 'Finalizar Venda'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Fotos - Múltiplos Registros */}
      <Dialog 
        open={!!showFotoModal && !isClosingFotoModal} 
        onOpenChange={(open) => {
          if (!open) {
            // Primeiro fecha o modal, depois reseta os estados
            setIsClosingFotoModal(true);
            setTimeout(() => {
              setShowFotoModal(null);
              setFotoRegistros([{ id: 1, cenarioId: "", numeroArquivos: "", fotografoId: "", fotografoSearch: "", observacao: "" }]);
              setServicosMakeCabelo([]);
              setDataExecucao("");
              setObservacoesGerais("");
              setMakeFormandoRetoque(0);
              setMakeFormandoTipo('fem');
              setComissaoFotoRegistros([]);
              setIsClosingFotoModal(false);
            }, 150);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-500" />
              Registrar Fotos - {showFotoModal?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Data da Execução */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data da Execução</Label>
              <Input
                type="date"
                value={dataExecucao}
                onChange={(e) => setDataExecucao(e.target.value)}
                className="w-full"
              />
            </div>
            
            {cenariosDoEvento.length === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">Nenhum cenário cadastrado no evento. Mostrando todos os cenários disponíveis.</p>
            )}
            
            {/* Lista de registros */}
            <div className="space-y-3">
              {fotoRegistros.map((registro, index) => (
                <div key={registro.id} className="p-3 border rounded-lg bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Registro {index + 1}</span>
                    {fotoRegistros.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                        onClick={() => {
                          setFotoRegistros(prev => prev.filter(r => r.id !== registro.id));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Cenário *</Label>
                      <select
                        value={registro.cenarioId}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          console.log('Cenário selecionado:', newValue, 'para registro.id:', registro.id);
                          setFotoRegistros(prev => {
                            const newState = prev.map(r => 
                              r.id === registro.id ? { ...r, cenarioId: newValue } : r
                            );
                            console.log('Estado atualizado:', JSON.stringify(newState));
                            return newState;
                          });
                        }}
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Selecione...</option>
                        {(cenariosDoEvento.length > 0 ? cenariosDoEvento : tiposCenario || []).map((cenario: any) => (
                          <option key={cenario.id} value={cenario.id.toString()}>
                            {cenario.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Nº de Arquivos</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Qtd"
                        value={registro.numeroArquivos}
                        onChange={(e) => {
                          setFotoRegistros(prev => prev.map(r => 
                            r.id === registro.id ? { ...r, numeroArquivos: e.target.value } : r
                          ));
                        }}
                        className="bg-white"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Fotógrafo</Label>
                      <Input
                        placeholder="Buscar fotógrafo..."
                        value={registro.fotografoSearch}
                        onChange={(e) => {
                          setFotoRegistros(prev => prev.map(r => 
                            r.id === registro.id ? { ...r, fotografoSearch: e.target.value, fotografoId: "" } : r
                          ));
                        }}
                        className="bg-white mb-1"
                      />
                      <select
                        value={registro.fotografoId}
                        onChange={(e) => {
                          const selectedFotografo = fotografosDoEvento.find((f: any) => f.id.toString() === e.target.value);
                          setFotoRegistros(prev => prev.map(r => 
                            r.id === registro.id ? { 
                              ...r, 
                              fotografoId: e.target.value,
                              fotografoSearch: selectedFotografo ? selectedFotografo.nome : ""
                            } : r
                          ));
                        }}
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Selecione...</option>
                        {fotografosDoEvento
                          .filter((fotografo: any) => 
                            !registro.fotografoSearch || 
                            fotografo.nome.toLowerCase().includes(registro.fotografoSearch.toLowerCase())
                          )
                          .map((fotografo: any) => (
                            <option key={fotografo.id} value={fotografo.id.toString()}>
                              {fotografo.nome}
                            </option>
                          ))}
                      </select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Observação</Label>
                      <Input
                        placeholder="Obs..."
                        value={registro.observacao}
                        onChange={(e) => {
                          setFotoRegistros(prev => prev.map(r => 
                            r.id === registro.id ? { ...r, observacao: e.target.value } : r
                          ));
                        }}
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Botão Adicionar */}
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => {
                const newId = Math.max(...fotoRegistros.map(r => r.id)) + 1;
                setFotoRegistros(prev => [...prev, { id: newId, cenarioId: "", numeroArquivos: "", fotografoId: "", fotografoSearch: "", observacao: "" }]);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Outro Cenário
            </Button>

            {/* Seção de Serviços de Make e Cabelo */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-pink-500" />
                  Serviços de Make e Cabelo
                </h4>
              </div>
              
              {/* Formando - Make */}
              <div className="space-y-3">
                {/* Make do Formando */}
                <div className="p-3 border rounded-lg bg-pink-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-pink-700">Make do Formando</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <select
                        value={makeFormandoTipo}
                        onChange={(e) => setMakeFormandoTipo(e.target.value as 'masc' | 'fem')}
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="masc">Masc.</option>
                        <option value="fem">Fem.</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Maquiadora</Label>
                      <select
                        value={servicosMakeCabelo.find(s => s.tipo === 'make_formando')?.fornecedorId || ''}
                        onChange={(e) => {
                          const fornecedorId = e.target.value;
                          setServicosMakeCabelo(prev => {
                            const existing = prev.find(s => s.tipo === 'make_formando');
                            if (fornecedorId) {
                              if (existing) {
                                return prev.map(s => s.tipo === 'make_formando' ? { ...s, fornecedorId, fornecedorSearch: '' } : s);
                              } else {
                                return [...prev, { tipo: 'make_formando', quantidade: 1, fornecedorId, fornecedorSearch: '' }];
                              }
                            } else {
                              return prev.filter(s => s.tipo !== 'make_formando');
                            }
                          });
                        }}
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Sem make</option>
                        {maquiadorasDoEvento.map((m: any) => (
                          <option key={m.id} value={m.id.toString()}>{m.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Retoque</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          value={makeFormandoRetoque}
                          onChange={(e) => setMakeFormandoRetoque(parseInt(e.target.value) || 0)}
                          className="h-9 w-20 text-center"
                          placeholder="0"
                        />
                        {selectedTurma?.valorRetoque && makeFormandoRetoque > 0 && (
                          <span className="text-xs text-pink-600">
                            {formatCurrency(selectedTurma.valorRetoque * makeFormandoRetoque)}
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Comissão-Foto (apenas para formandos da comissão) */}
                {showFotoModal?.eComissao && (
                  <div className="p-3 border rounded-lg bg-violet-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-violet-700">Comissão - Foto</span>
                    </div>
                    <p className="text-xs text-slate-500">Registre cada dia que o membro da comissão foi ao evento tirar foto com formandos</p>
                    
                    {/* Lista de registros de Comissão-Foto */}
                    <div className="space-y-2">
                      {comissaoFotoRegistros.map((registro, index) => (
                        <div key={registro.id} className="flex items-center gap-2">
                          <Input
                            type="date"
                            value={registro.data}
                            onChange={(e) => {
                              setComissaoFotoRegistros(prev => 
                                prev.map(r => r.id === registro.id ? { ...r, data: e.target.value } : r)
                              );
                            }}
                            className="flex-1 h-9"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                            onClick={() => {
                              setComissaoFotoRegistros(prev => prev.filter(r => r.id !== registro.id));
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-dashed border-violet-300 text-violet-600 hover:bg-violet-50"
                      onClick={() => {
                        const newId = comissaoFotoRegistros.length > 0 
                          ? Math.max(...comissaoFotoRegistros.map(r => r.id)) + 1 
                          : 1;
                        setComissaoFotoRegistros(prev => [...prev, { id: newId, data: '' }]);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Data
                    </Button>
                    
                    {comissaoFotoRegistros.length > 0 && (
                      <div className="text-xs text-violet-600 font-medium text-right">
                        Total: {formatCurrency(
                          comissaoFotoRegistros.filter(r => r.data).length * 
                          (showFotoModal?.sexo === 'M' ? (selectedTurma?.valorMakeFormandoMasc || 0) : (selectedTurma?.valorMakeFormandoFem || 0))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Make Família - Múltiplas Maquiadoras */}
                <div className="p-3 border rounded-lg bg-purple-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-700">Make Família</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-100"
                      onClick={() => {
                        const newId = makeFamiliaItems.length > 0 ? Math.max(...makeFamiliaItems.map(i => i.id)) + 1 : 1;
                        setMakeFamiliaItems([...makeFamiliaItems, { id: newId, fornecedorId: '', quantidade: 1 }]);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar Maquiadora
                    </Button>
                  </div>
                  {makeFamiliaItems.length === 0 ? (
                    <p className="text-xs text-purple-600">Nenhuma maquiadora adicionada. Clique em "Adicionar Maquiadora" para incluir.</p>
                  ) : (
                    <div className="space-y-2">
                      {makeFamiliaItems.map((item, idx) => (
                        <div key={item.id} className="grid grid-cols-[1fr_80px_32px] gap-2 items-end">
                          <div className="space-y-1">
                            <Label className="text-xs">Maquiadora {idx + 1}</Label>
                            <select
                              value={item.fornecedorId}
                              onChange={(e) => {
                                setMakeFamiliaItems(prev => prev.map(i => 
                                  i.id === item.id ? { ...i, fornecedorId: e.target.value } : i
                                ));
                              }}
                              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="">Selecione...</option>
                              {maquiadorasDoEvento.map((m: any) => (
                                <option key={m.id} value={m.id.toString()}>{m.nome}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Qtd</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantidade}
                              onChange={(e) => {
                                const quantidade = parseInt(e.target.value) || 1;
                                setMakeFamiliaItems(prev => prev.map(i => 
                                  i.id === item.id ? { ...i, quantidade } : i
                                ));
                              }}
                              className="bg-white"
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-9 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setMakeFamiliaItems(prev => prev.filter(i => i.id !== item.id));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {makeFamiliaItems.filter(i => i.fornecedorId && i.quantidade > 0).length > 0 && (
                        <div className="text-xs text-purple-600 pt-1 border-t border-purple-200">
                          Total: {makeFamiliaItems.filter(i => i.fornecedorId && i.quantidade > 0).reduce((sum, i) => sum + i.quantidade, 0)} make(s) família
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Cabelo Simples */}
                <div className="p-3 border rounded-lg bg-amber-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-700">Cabelo Simples</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        min="0"
                        value={servicosMakeCabelo.find(s => s.tipo === 'cabelo_simples')?.quantidade || ''}
                        onChange={(e) => {
                          const quantidade = parseInt(e.target.value) || 0;
                          setServicosMakeCabelo(prev => {
                            const existing = prev.find(s => s.tipo === 'cabelo_simples');
                            if (quantidade > 0) {
                              if (existing) {
                                return prev.map(s => s.tipo === 'cabelo_simples' ? { ...s, quantidade } : s);
                              } else {
                                return [...prev, { tipo: 'cabelo_simples', quantidade, fornecedorId: '', fornecedorSearch: '' }];
                              }
                            } else {
                              return prev.filter(s => s.tipo !== 'cabelo_simples');
                            }
                          });
                        }}
                        placeholder="0"
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Cabelo Combinado */}
                <div className="p-3 border rounded-lg bg-orange-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-orange-700">Cabelo Combinado</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        min="0"
                        value={servicosMakeCabelo.find(s => s.tipo === 'cabelo_combinado')?.quantidade || ''}
                        onChange={(e) => {
                          const quantidade = parseInt(e.target.value) || 0;
                          setServicosMakeCabelo(prev => {
                            const existing = prev.find(s => s.tipo === 'cabelo_combinado');
                            if (quantidade > 0) {
                              if (existing) {
                                return prev.map(s => s.tipo === 'cabelo_combinado' ? { ...s, quantidade } : s);
                              } else {
                                return [...prev, { tipo: 'cabelo_combinado', quantidade, fornecedorId: '', fornecedorSearch: '' }];
                              }
                            } else {
                              return prev.filter(s => s.tipo !== 'cabelo_combinado');
                            }
                          });
                        }}
                        placeholder="0"
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Campo de Observações Gerais */}
            <ObservationField
              value={observacoesGerais}
              onChange={setObservacoesGerais}
              label="Observações Gerais"
              placeholder="Observações gerais sobre a execução..."
              isSaving={upsertExecucaoMutation.isPending}
              onCriticalObservation={async (obs) => {
                // Enviar notificação por email
                try {
                  const formandoNome = showFotoModal?.nome || "Formando";
                  const eventoInfo = selectedEventoId 
                    ? `Evento ${selectedEventoId}`
                    : "Execução";
                  
                  await fetch('/api/trpc/system.notifyOwner', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: `⚠️ Observação Crítica - Execução: ${formandoNome}`,
                      content: `**Data/Hora:** ${obs.timestamp}\n**Usuário:** ${obs.userName}\n**Origem:** ${eventoInfo} - ${formandoNome}\n\n**Observação:**\n${obs.text}`,
                    }),
                  });
                  toast.success("Notificação enviada por email!");
                } catch (error) {
                  console.error('Erro ao enviar notificação:', error);
                  toast.error("Erro ao enviar notificação");
                }
              }}
            />

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
onClick={() => {
                   setShowFotoModal(null);
                   setServicosMakeCabelo([]);
                   setServicosJaCarregados(false);
                 }}
               >
                 Cancelar
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600"
                disabled={createFotoFormandoMutation.isPending}
                onClick={async () => {
                  console.log('Clicou em Salvar Todos, fotoRegistros:', fotoRegistros);
                  if (!showFotoModal || !selectedEventoId) return;
                  
                  try {
                    // Filtrar apenas registros com cenário preenchido
                    const registrosValidos = fotoRegistros.filter(r => r.cenarioId);
                    
                    // Primeiro, garantir que existe uma execução para este formando
                    let execucao = execucoesMap.get(showFotoModal.id);
                    
                    // Sempre atualizar a execução com a data de execução
                    console.log('Salvando data de execução:', dataExecucao, 'como Date:', dataExecucao ? new Date(dataExecucao) : null);
                    
                    // Usar retry com backoff exponencial para lidar com erros 503
                    const resultado = await withRetry(
                      () => upsertExecucaoMutation.mutateAsync({
                        eventoId: selectedEventoId,
                        formandoId: showFotoModal.id,
                        dataExecucao: dataExecucao ? new Date(dataExecucao) : null,
                        observacoes: observacoesGerais || null,
                      }),
                      { maxRetries: 3, baseDelay: 1000 }
                    );
                  
                  // Obter o ID da execução (pode vir do resultado ou do mapa existente)
                  const execucaoId = resultado?.id || execucao?.id;
                  
                  if (execucaoId) {
                    // Só deletar e salvar fotos se houver registros válidos
                    if (registrosValidos.length > 0) {
                      try {
                        // Primeiro, deletar todas as fotos existentes para evitar duplicação
                        console.log('Deletando fotos existentes para execucaoFormandoId:', execucaoId);
                        await withRetry(
                          () => deleteAllFotosMutation.mutateAsync({
                            execucaoFormandoId: execucaoId,
                          }),
                          { maxRetries: 3, baseDelay: 1000 }
                        );
                        console.log('Fotos deletadas com sucesso');
                      } catch (deleteError: any) {
                        console.error('Erro ao deletar fotos:', deleteError);
                        toast.error(formatErrorMessage(deleteError));
                        return;
                      }
                      
                      // Salvar todos os registros de foto
                      for (const registro of registrosValidos) {
                        await withRetry(
                          () => createFotoFormandoMutation.mutateAsync({
                            execucaoFormandoId: execucaoId,
                            cenarioId: parseInt(registro.cenarioId),
                            fotografoId: registro.fotografoId ? parseInt(registro.fotografoId) : undefined,
                            numeroArquivos: registro.numeroArquivos ? parseInt(registro.numeroArquivos) : undefined,
                            observacao: registro.observacao || undefined,
                            dataExecucao: dataExecucao ? new Date(dataExecucao) : null,
                          }),
                          { maxRetries: 3, baseDelay: 1000 }
                        );
                      }
                    }

                    // Sempre deletar e salvar serviços de Make e Cabelo (mesmo sem fotos)
                    try {
                      console.log('Deletando serviços existentes para eventoId:', selectedEventoId, 'formandoId:', showFotoModal.id);
                      await withRetry(
                        () => deleteAllServicosMutation.mutateAsync({
                          eventoId: selectedEventoId,
                          formandoId: showFotoModal.id,
                        }),
                        { maxRetries: 3, baseDelay: 1000 }
                      );
                      console.log('Serviços deletados com sucesso');
                    } catch (deleteError) {
                      console.error('Erro ao deletar serviços:', deleteError);
                      // Continua mesmo se der erro na deleção
                    }

                    // Salvar serviços de Make e Cabelo
                    for (const servico of servicosMakeCabelo) {
                      if (servico.tipo === 'make_formando' && servico.fornecedorId) {
                        const valorMake = makeFormandoTipo === 'masc' 
                          ? (valoresMaquiagem?.valorMasculino || 0)
                          : (valoresMaquiagem?.valorFeminino || 0);
                        await withRetry(
                          () => createMakeFormandoMutation.mutateAsync({
                            eventoId: selectedEventoId,
                            formandoId: showFotoModal.id,
                            fornecedorId: parseInt(servico.fornecedorId),
                            valorUnitario: valorMake,
                            tipoMake: makeFormandoTipo,
                            dataRealizacao: dataExecucao ? new Date(dataExecucao) : undefined,
                          }),
                          { maxRetries: 3, baseDelay: 1000 }
                        );
                      } else if (servico.tipo === 'cabelo_simples' && servico.quantidade > 0) {
                        await withRetry(
                          () => createCabeloMutation.mutateAsync({
                            eventoId: selectedEventoId,
                            formandoId: showFotoModal.id,
                            tipo: 'simples',
                            quantidade: servico.quantidade,
                            dataRealizacao: dataExecucao ? new Date(dataExecucao) : undefined,
                          }),
                          { maxRetries: 3, baseDelay: 1000 }
                        );
                      } else if (servico.tipo === 'cabelo_combinado' && servico.quantidade > 0) {
                        await withRetry(
                          () => createCabeloMutation.mutateAsync({
                            eventoId: selectedEventoId,
                            formandoId: showFotoModal.id,
                            tipo: 'combinado',
                            quantidade: servico.quantidade,
                            dataRealizacao: dataExecucao ? new Date(dataExecucao) : undefined,
                          }),
                          { maxRetries: 3, baseDelay: 1000 }
                        );
                      }
                    }
                    
                    // Salvar múltiplas maquiadoras do Make Família
                    for (const item of makeFamiliaItems) {
                      if (item.fornecedorId && item.quantidade > 0) {
                        await withRetry(
                          () => createMakeFamiliaMutation.mutateAsync({
                            eventoId: selectedEventoId,
                            formandoId: showFotoModal.id,
                            fornecedorId: parseInt(item.fornecedorId),
                            quantidade: item.quantidade,
                            dataRealizacao: dataExecucao ? new Date(dataExecucao) : undefined,
                          }),
                          { maxRetries: 3, baseDelay: 1000 }
                        );
                      }
                    }

                    toast.success(`Registros salvos com sucesso!`);
                    
                    // Invalidar cache dos serviços para forçar refetch
                    await refetchServicos();
                    await refetchTodosServicos(); // Atualizar indicadores visuais
                    
                    // Fechar modal usando isClosingFotoModal para evitar erro removeChild
                    setIsClosingFotoModal(true);
                    setTimeout(() => {
                      setShowFotoModal(null);
                      setFotoRegistros([{ id: 1, cenarioId: "", numeroArquivos: "", fotografoId: "", fotografoSearch: "", observacao: "" }]);
                      setServicosMakeCabelo([]);
                      setMakeFamiliaItems([]);
                      setDataExecucao("");
                      setObservacoesGerais("");
                      setMakeFormandoRetoque(0);
                      setMakeFormandoTipo('fem');
                      setComissaoFotoRegistros([]);
                      setServicosJaCarregados(false);
                      setIsClosingFotoModal(false);
                      // Refetch após fechar o modal para atualizar a lista
                      refetchExecucoes();
                    }, 200);
                  } else {
                    toast.error("Erro ao criar registro de execução");
                  }
                  } catch (error: any) {
                    console.error('Erro ao salvar execução:', error);
                    toast.error(formatErrorMessage(error));
                  }
                }}
              >
                <Camera className="h-4 w-4 mr-2" />
                Salvar {fotoRegistros.filter(r => r.cenarioId).length > 0 ? `(${fotoRegistros.filter(r => r.cenarioId).length} fotos)` : 'Serviços'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
