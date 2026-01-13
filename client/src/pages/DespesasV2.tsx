import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { LOGO_BASE64 } from "@/lib/logo";
import { formatTurmaCompleta } from "@/lib/formatTurma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  FileText, 
  Download, 
  Check,
  ChevronsUpDown,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  History,
  Paperclip,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { PermissionGate } from "@/components/PermissionGate";

// Meses do ano
const MESES = [
  { value: "janeiro", label: "Janeiro" },
  { value: "fevereiro", label: "Fevereiro" },
  { value: "marco", label: "Março" },
  { value: "abril", label: "Abril" },
  { value: "maio", label: "Maio" },
  { value: "junho", label: "Junho" },
  { value: "julho", label: "Julho" },
  { value: "agosto", label: "Agosto" },
  { value: "setembro", label: "Setembro" },
  { value: "outubro", label: "Outubro" },
  { value: "novembro", label: "Novembro" },
  { value: "dezembro", label: "Dezembro" },
];

// Status labels
const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  aguardando_aprovacao_gestor: { label: "Aguardando Aprovação do Gestor", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: Clock },
  aguardando_aprovacao_gestor_geral: { label: "Aguardando Aprovação do Gestor Geral", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", icon: Clock },
  aprovado_gestor: { label: "Aprovado pelo Gestor", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: CheckCircle },
  aprovado_gestor_geral: { label: "Aprovado pelo Gestor Geral", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
  liquidado: { label: "Liquidado", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400", icon: DollarSign },
};

// Ações do histórico
const ACAO_LABELS: Record<string, { label: string; color: string }> = {
  criacao: { label: "Criação", color: "text-blue-600" },
  aprovacao_gestor: { label: "Aprovação do Gestor", color: "text-green-600" },
  rejeicao_gestor: { label: "Rejeição do Gestor", color: "text-red-600" },
  aprovacao_gestor_geral: { label: "Aprovação do Gestor Geral", color: "text-green-600" },
  rejeicao_gestor_geral: { label: "Rejeição do Gestor Geral", color: "text-red-600" },
  edicao: { label: "Edição", color: "text-yellow-600" },
  liquidacao: { label: "Liquidação", color: "text-emerald-600" },
};

// Tipos de comprovante fiscal
const TIPOS_COMPROVANTE = [
  { value: "contrato", label: "Contrato" },
  { value: "nota_fiscal", label: "Nota Fiscal" },
  { value: "rpa", label: "RPA" },
];

// Tipos de pagamento
const TIPOS_PAGAMENTO = [
  { value: "pix", label: "PIX" },
  { value: "cartao", label: "Cartão" },
  { value: "boleto", label: "Boleto" },
  { value: "dinheiro", label: "Dinheiro" },
];

// Função movida para @/lib/formatTurma.ts
const formatDadosTurma = formatTurmaCompleta;

// Helper para formatar valor em reais
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

// Helper para formatar data
function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  // Usar componentes UTC para evitar problema de timezone
  const day = d.getUTCDate().toString().padStart(2, '0');
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

// Helper para formatar data e hora
function formatDateTime(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleString("pt-BR");
}

export default function DespesasV2() {
  const { user } = useAuth();
  const isAdmin = user?.role === "administrador";
  
  // Estados
  const [activeTab, setActiveTab] = useState("despesas");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [filtroSetor, setFiltroSetor] = useState<string | null>(null);
  const [filtroTipoServico, setFiltroTipoServico] = useState<string | null>(null);
  
  // Modal de aprovação/rejeição
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"aprovar" | "rejeitar">("aprovar");
  const [approvalDespesaId, setApprovalDespesaId] = useState<number | null>(null);
  const [approvalTipo, setApprovalTipo] = useState<"gestor" | "gestor_geral">("gestor");
  const [rejeicaoJustificativa, setRejeicaoJustificativa] = useState("");
  
  // Modal de liquidação
  const [liquidacaoModalOpen, setLiquidacaoModalOpen] = useState(false);
  const [liquidacaoDespesaId, setLiquidacaoDespesaId] = useState<number | null>(null);
  const [liquidacaoData, setLiquidacaoData] = useState("");
  const [liquidacaoComprovantes, setLiquidacaoComprovantes] = useState<File[]>([]);
  const liquidacaoComprovanteRef = useRef<HTMLInputElement>(null);
  
  // Modal de edição de anexos de liquidação
  const [editarAnexosModalOpen, setEditarAnexosModalOpen] = useState(false);
  const [editarAnexosDespesaId, setEditarAnexosDespesaId] = useState<number | null>(null);
  const [novosAnexosLiquidacao, setNovosAnexosLiquidacao] = useState<File[]>([]);
  const novosAnexosLiquidacaoRef = useRef<HTMLInputElement>(null);
  
  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>("all");
  const [filtroTurma, setFiltroTurma] = useState<number | null>(null);
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroEventoInicio, setFiltroEventoInicio] = useState("");
  const [filtroEventoFim, setFiltroEventoFim] = useState("");
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Formulário
  const [tipoDespesa, setTipoDespesa] = useState<"operacional" | "administrativa">("operacional");
  const [mesServico, setMesServico] = useState("");
  const [setorSolicitante, setSetorSolicitante] = useState<"estudio" | "fotografia" | "becas">("estudio");
  const [fornecedorId, setFornecedorId] = useState<number | null>(null);
  const [tipoServicoCompra, setTipoServicoCompra] = useState("");
  const [detalhamento, setDetalhamento] = useState("");
  const [eReembolso, setEReembolso] = useState(false);
  const [valorTotal, setValorTotal] = useState("");
  const [tipoPagamento, setTipoPagamento] = useState<"pix" | "cartao" | "boleto" | "dinheiro">("pix");
  const [dadosPagamento, setDadosPagamento] = useState("");
  const [tipoComprovanteFiscal, setTipoComprovanteFiscal] = useState<"contrato" | "nota_fiscal" | "rpa" | "">("");
  const [dataLimitePagamento, setDataLimitePagamento] = useState("");
  const [local, setLocal] = useState("");
  
  // Turmas selecionadas (para operacional)
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<{ turmaId: number; tipoEvento?: string }[]>([]);
  const [datasRealizacao, setDatasRealizacao] = useState<Date[]>([]);
  
  // Comboboxes
  const [openFornecedor, setOpenFornecedor] = useState(false);
  const [searchFornecedor, setSearchFornecedor] = useState("");
  const [openTurma, setOpenTurma] = useState(false);
  const [searchTurma, setSearchTurma] = useState("");
  
  // Anexos
  const [comprovanteFiscalFiles, setComprovanteFiscalFiles] = useState<File[]>([]);
  const [documentosFiles, setDocumentosFiles] = useState<File[]>([]);
  const comprovanteFiscalRef = useRef<HTMLInputElement>(null);
  const documentosRef = useRef<HTMLInputElement>(null);
  
  // Queries
  const { data: despesas, refetch: refetchDespesas } = trpc.despesasV2.list.useQuery();
  const { data: turmas } = trpc.turmas.list.useQuery();
  const { data: fornecedores } = trpc.fornecedores.list.useQuery();
  const { data: tiposServico } = trpc.tiposServico.list.useQuery();
  const { data: eventos } = trpc.eventos.list.useQuery();
  const { data: locais } = trpc.locais.list.useQuery();
  
  // Mutations
  const createDespesaMutation = trpc.despesasV2.create.useMutation({
    onSuccess: () => {
      toast.success("Despesa criada com sucesso!");
      refetchDespesas();
      closeModal();
    },
    onError: (error) => {
      toast.error("Erro ao criar despesa: " + error.message);
    },
  });
  
  const updateDespesaMutation = trpc.despesasV2.update.useMutation({
    onSuccess: () => {
      toast.success("Despesa atualizada com sucesso!");
      refetchDespesas();
      closeModal();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar despesa: " + error.message);
    },
  });
  
  const deleteDespesaMutation = trpc.despesasV2.delete.useMutation({
    onSuccess: () => {
      toast.success("Despesa excluída com sucesso!");
      refetchDespesas();
    },
    onError: (error) => {
      toast.error("Erro ao excluir despesa: " + error.message);
    },
  });
  
  const aprovarGestorMutation = trpc.despesasV2.aprovarGestor.useMutation({
    onSuccess: () => {
      toast.success("Despesa aprovada pelo Gestor!");
      refetchDespesas();
      setApprovalModalOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao aprovar: " + error.message);
    },
  });
  
  const aprovarGestorGeralMutation = trpc.despesasV2.aprovarGestorGeral.useMutation({
    onSuccess: () => {
      toast.success("Despesa aprovada pelo Gestor Geral!");
      refetchDespesas();
      setApprovalModalOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao aprovar: " + error.message);
    },
  });
  
  const rejeitarMutation = trpc.despesasV2.rejeitar.useMutation({
    onSuccess: () => {
      toast.success("Despesa rejeitada!");
      refetchDespesas();
      setApprovalModalOpen(false);
      setRejeicaoJustificativa("");
    },
    onError: (error) => {
      toast.error("Erro ao rejeitar: " + error.message);
    },
  });
  
  const liquidarMutation = trpc.despesasV2.liquidar.useMutation({
    onSuccess: () => {
      toast.success("Despesa liquidada com sucesso!");
      refetchDespesas();
      setLiquidacaoModalOpen(false);
      setLiquidacaoData("");
      setLiquidacaoComprovantes([]);
    },
    onError: (error) => {
      toast.error("Erro ao liquidar: " + error.message);
    },
  });
  
  const uploadAnexoMutation = trpc.despesasV2.uploadAnexo.useMutation({
    onError: (error) => {
      toast.error("Erro ao fazer upload: " + error.message);
    },
  });
  
  const deleteAnexoMutation = trpc.despesasV2.deleteAnexo.useMutation({
    onSuccess: () => {
      toast.success("Anexo removido com sucesso!");
      refetchDespesas();
    },
    onError: (error) => {
      toast.error("Erro ao remover anexo: " + error.message);
    },
  });
  
  // Função para converter arquivo para base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remover o prefixo "data:...;base64,"
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };
  
  // Função para fazer upload de múltiplos arquivos
  const uploadFiles = async (
    despesaId: number, 
    files: File[], 
    tipoAnexo: 'comprovante_fiscal' | 'documento' | 'comprovante_liquidacao'
  ) => {
    for (const file of files) {
      const base64 = await fileToBase64(file);
      await uploadAnexoMutation.mutateAsync({
        despesaId,
        tipoAnexo,
        nomeArquivo: file.name,
        fileBase64: base64,
        contentType: file.type || 'application/octet-stream',
      });
    }
  };
  
  // Função para exportar para Excel
  const exportToExcel = () => {
    if (!despesasFiltradas || despesasFiltradas.length === 0) {
      toast.error("Não há despesas para exportar");
      return;
    }
    
    // Criar dados para CSV
    const headers = [
      "Setor", "Data", "Mês Serviço", "Nº CI", "Turma", "Tipo Evento", "Data Realização",
      "Fornecedor", "Tipo Serviço", "Valor", "Dados Pagamento", "Tipo Comprovante",
      "Data Limite", "Status"
    ];
    
    // Função auxiliar para formatar datas de realização como texto
    const formatDatasRealizacaoTexto = (datasRealizacao: any[]): string => {
      if (!datasRealizacao || datasRealizacao.length === 0) return "-";
      return datasRealizacao.map((dr) => formatDate(dr.dataRealizacao)).join(", ");
    };
    
    // Função auxiliar para obter nomes de turmas como texto
    const getTurmasNomesTexto = (turmasVinculadas: any[]): string => {
      if (!turmasVinculadas || turmasVinculadas.length === 0) return "-";
      return turmasVinculadas.map((tv) => {
        // tv.turma já vem do backend com dados completos
        return tv.turma ? formatTurmaCompleta(tv.turma) : "";
      }).filter(Boolean).join(", ");
    };
    
    // Função auxiliar para obter tipos de evento como texto
    const getTipoEventoTexto = (turmasVinculadas: any[]): string => {
      if (!turmasVinculadas || turmasVinculadas.length === 0) return "-";
      const tipos = turmasVinculadas.map((tv) => tv.tipoEvento || "").filter(Boolean);
      if (tipos.length === 0) return "-";
      return Array.from(new Set(tipos)).join(", ");
    };
    
    const rows = despesasFiltradas.map((d) => [
      d.setorSolicitante === "estudio" ? "Estúdio" : d.setorSolicitante === "fotografia" ? "Fotografia" : (d.setorSolicitante || "-"),
      formatDate(d.createdAt),
      d.mesServico,
      d.numeroCi,
      d.tipoDespesa === "administrativa" ? "Administrativo" : getTurmasNomesTexto(d.turmasVinculadas),
      d.tipoDespesa === "administrativa" ? "-" : getTipoEventoTexto(d.turmasVinculadas),
      formatDatasRealizacaoTexto(d.datasRealizacao),
      getFornecedorNomeCompleto(d.fornecedorId),
      d.tipoServicoCompra || "-",
      formatCurrency(d.valorTotal),
      d.dadosPagamento || "-",
      d.tipoComprovanteFiscal?.replace("_", " ") || "-",
      d.dataLimitePagamento ? formatDate(d.dataLimitePagamento) : "-",
      STATUS_LABELS[d.status]?.label || d.status
    ]);
    
    // Criar CSV
    const csvContent = [
      headers.join(";")
    ].concat(rows.map((r) => r.join(";"))).join("\n");
    
    // Download
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `despesas_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo exportado com sucesso!");
  };
  
  // Função para exportar para PDF (usando impressão do navegador)
  const exportToPDF = () => {
    if (!despesasFiltradas || despesasFiltradas.length === 0) {
      toast.error("Não há despesas para exportar");
      return;
    }
    
    // Funções auxiliares para formatar dados como texto
    const formatDatasTexto = (datasRealizacao: any[]): string => {
      if (!datasRealizacao || datasRealizacao.length === 0) return "-";
      return datasRealizacao.map((dr) => formatDate(dr.dataRealizacao)).join(", ");
    };
    
    const getTurmasTexto = (turmasVinculadas: any[]): string => {
      if (!turmasVinculadas || turmasVinculadas.length === 0) return "-";
      return turmasVinculadas.map((tv) => {
        const t = turmas?.find((turma) => turma.id === tv.turmaId);
        return t?.codigo || "";
      }).filter(Boolean).join(", ");
    };
    
    const getTipoEventoTexto = (turmasVinculadas: any[]): string => {
      if (!turmasVinculadas || turmasVinculadas.length === 0) return "-";
      const tipos = turmasVinculadas.map((tv) => tv.tipoEvento || "").filter(Boolean);
      if (tipos.length === 0) return "-";
      return Array.from(new Set(tipos)).join(", ");
    };
    
    // Criar HTML para impressão com TODAS as colunas
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Despesas</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 8px; }
          .header { display: flex; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .logo { width: 100px; height: auto; margin-right: 15px; }
          .header-text h1 { margin: 0; font-size: 16px; }
          .header-text p { margin: 5px 0 0 0; font-size: 10px; color: #666; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 3px; text-align: left; font-size: 7px; }
          th { background-color: #f4f4f4; font-weight: bold; }
          .total { font-weight: bold; margin-top: 10px; }
          .footer { margin-top: 20px; font-size: 9px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
          @media print { 
            body { -webkit-print-color-adjust: exact; } 
            @page { size: landscape; margin: 5mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${LOGO_BASE64}" class="logo" alt="Logo" />
          <div class="header-text">
            <h1>Relatório de Despesas</h1>
            <p>Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} | Total: ${despesasFiltradas.length} despesas</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Setor</th>
              <th>Data Lançamento</th>
              <th>Mês</th>
              <th>Nº CI</th>
              <th>Turma</th>
              <th>Tipo Evento</th>
              <th>Data Realiz.</th>
              <th>Fornecedor</th>
              <th>Tipo Serviço</th>
              <th>Valor</th>
              <th>Dados Pgto</th>
              <th>Comprov. Fiscal</th>
              <th>Data Limite</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${despesasFiltradas.map((d) => `
              <tr>
                <td>${d.setorSolicitante === "estudio" ? "Estúdio" : d.setorSolicitante === "fotografia" ? "Fotografia" : (d.setorSolicitante || "-")}</td>
                <td>${formatDate(d.createdAt)}</td>
                <td>${d.mesServico || "-"}</td>
                <td>${d.numeroCi}</td>
                <td>${d.tipoDespesa === "administrativa" ? "Administrativo" : getTurmasTexto(d.turmasVinculadas)}</td>
                <td>${d.tipoDespesa === "administrativa" ? "-" : getTipoEventoTexto(d.turmasVinculadas)}</td>
                <td>${formatDatasTexto(d.datasRealizacao)}</td>
                <td>${getFornecedorNomeCompleto(d.fornecedorId)}</td>
                <td>${d.tipoServicoCompra || "-"}</td>
                <td>${formatCurrency(d.valorTotal)}</td>
                <td>${d.dadosPagamento || "-"}</td>
                <td>${d.tipoComprovanteFiscal?.replace("_", " ") || "-"}</td>
                <td>${d.dataLimitePagamento ? formatDate(d.dataLimitePagamento) : "-"}</td>
                <td>${STATUS_LABELS[d.status]?.label || d.status}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <p class="total">Total: ${formatCurrency(despesasFiltradas.reduce((acc, d) => acc + Number(d.valorTotal), 0))}</p>
        <div class="footer">
          Estúdio Super A Formaturas - Relatório de Despesas
        </div>
      </body>
      </html>
    `;
    
    // Criar um Blob com o conteúdo HTML com charset UTF-8
    const blob = new Blob([printContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Abrir em nova janela
    const printWindow = window.open(blobUrl, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        // Limpar o Blob URL após um tempo
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      };
    } else {
      // Fallback se window.open for bloqueado
      const printFrame = document.createElement('iframe');
      printFrame.style.display = 'none';
      document.body.appendChild(printFrame);
      const doc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(printContent);
        doc.close();
        printFrame.contentWindow?.print();
        setTimeout(() => document.body.removeChild(printFrame), 1000);
      }
      URL.revokeObjectURL(blobUrl);
    }
  };
  
  // Filtrar fornecedores
  const filteredFornecedores = useMemo(() => {
    if (!fornecedores) return [];
    if (!searchFornecedor) return fornecedores;
    return fornecedores.filter((f) =>
      f.nome.toLowerCase().includes(searchFornecedor.toLowerCase())
    );
  }, [fornecedores, searchFornecedor]);
  
  // Filtrar turmas
  const filteredTurmas = useMemo(() => {
    if (!turmas) return [];
    if (!searchTurma) return turmas;
    const search = searchTurma.toLowerCase();
    return turmas.filter((t) => {
      const formatted = formatDadosTurma(t).toLowerCase();
      return formatted.includes(search) || t.codigo.toLowerCase().includes(search);
    });
  }, [turmas, searchTurma]);
  
  // Obter tipos de serviço do fornecedor selecionado
  const tiposServicoFornecedor = useMemo(() => {
    if (!fornecedorId || !fornecedores || !tiposServico) return [];
    const fornecedor = fornecedores.find((f) => f.id === fornecedorId);
    if (!fornecedor?.tiposServico) return [];
    
    try {
      const ids = JSON.parse(fornecedor.tiposServico);
      return tiposServico.filter((ts) => ids.includes(ts.id));
    } catch {
      return [];
    }
  }, [fornecedorId, fornecedores, tiposServico]);
  
  // Obter eventos da turma selecionada (apenas eventos que existem na seção Eventos)
  const eventosTurma = useMemo(() => {
    if (turmasSelecionadas.length === 0 || !eventos) return [];
    
    // Se houver tipo de evento selecionado, filtrar apenas eventos daquele tipo
    const turmasComTipo = turmasSelecionadas.filter((t) => t.tipoEvento);
    
    if (turmasComTipo.length > 0) {
      // Retornar apenas eventos dos tipos selecionados
      return eventos.filter((e) => 
        turmasComTipo.some((t) => 
          e.turmaId === t.turmaId && 
          e.tipoEvento === t.tipoEvento && 
          e.dataEvento
        )
      );
    }
    
    // Se não houver tipo selecionado, retornar todos os eventos das turmas
    const turmaIds = turmasSelecionadas.map((t) => t.turmaId);
    return eventos.filter((e) => turmaIds.includes(e.turmaId) && e.dataEvento);
  }, [turmasSelecionadas, eventos]);
   // Obter locais únicos dos eventos filtrados
  const locaisUnicos = useMemo(() => {
    if (!locais || eventosTurma.length === 0) return [];
    
    const locaisNomes = new Set<string>();
    eventosTurma.forEach((evento) => {
      if (evento.local && typeof evento.local === 'string') {
        locaisNomes.add(evento.local);
      }
    });
    
    return locais.filter((l) => locaisNomes.has(l.nome));
  }, [eventosTurma, locais]);  
  // Atualizar local automaticamente quando turma/evento mudar
  useEffect(() => {
    if (turmasSelecionadas.length > 0 && locais && eventos) {
      // Limpar local se não houver eventos filtrados
      if (eventosTurma.length === 0) {
        setLocal("");
        return;
      }
      
      // Se houver apenas um local único, preencher automaticamente
      if (locaisUnicos.length === 1) {
        setLocal(locaisUnicos[0].nome);
      } else if (locaisUnicos.length === 0) {
        setLocal("");
      }
      // Se houver múltiplos locais, deixar o usuário escolher (não limpar o valor atual)
    }
  }, [turmasSelecionadas, eventosTurma, eventos, locais, locaisUnicos]);
  
  // Helper para extrair data local de uma data UTC (evita problema de timezone)
  function getLocalDateParts(date: Date | string): { year: number; month: number; day: number } {
    const d = new Date(date);
    // Se a data veio do banco como UTC, precisamos extrair os componentes corretamente
    // Usamos getUTCDate/Month/Year para pegar os valores originais salvos
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      day: d.getUTCDate()
    };
  }
  
  // Obter datas disponíveis dos eventos
  const datasDisponiveis = useMemo(() => {
    const datas: Date[] = [];
    eventosTurma.forEach((evento) => {
      if (evento.dataEvento) {
        // Usar getLocalDateParts para extrair componentes UTC corretamente
        const startParts = getLocalDateParts(evento.dataEvento);
        const endParts = evento.dataEventoFim ? getLocalDateParts(evento.dataEventoFim) : startParts;
        
        // Criar datas locais usando os componentes extraídos
        const start = new Date(startParts.year, startParts.month, startParts.day);
        const end = new Date(endParts.year, endParts.month, endParts.day);
        
        // Incluir todas as datas do período
        const current = new Date(start);
        while (current <= end) {
          datas.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
      }
    });
    return datas;
  }, [eventosTurma]);
  
  // Filtrar despesas
  const despesasFiltradas = useMemo(() => {
    if (!despesas) return [];
    
    return despesas.filter((d) => {
      // Filtro de busca geral
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        
        // Busca em campos diretos
        const matchNumeroCi = d.numeroCi.toLowerCase().includes(search);
        const matchDetalhamento = d.detalhamento?.toLowerCase().includes(search);
        
        // Busca em turmas vinculadas
        const matchTurma = (d.turmasVinculadas || []).some((tv: any) => {
          if (!tv.turma) return false;
          const turma = tv.turma;
          
          // Busca no código da turma
          if (turma.codigo?.toLowerCase().includes(search)) return true;
          
          // Busca nos cursos
          try {
            const cursos = JSON.parse(turma.cursos || '[]');
            if (cursos.some((c: string) => c.toLowerCase().includes(search))) return true;
          } catch {}
          
          // Busca nas instituições
          try {
            const instituicoes = JSON.parse(turma.instituicoes || '[]');
            if (instituicoes.some((i: string) => i.toLowerCase().includes(search))) return true;
          } catch {}
          
          // Busca no número da turma
          if (turma.numeroTurma?.toLowerCase().includes(search)) return true;
          
          return false;
        });
        
        // Busca no fornecedor (se existir)
        const matchFornecedor = fornecedores?.some((f: any) => 
          f.id === d.fornecedorId && f.nome?.toLowerCase().includes(search)
        );
        
        if (!matchNumeroCi && !matchDetalhamento && !matchTurma && !matchFornecedor) {
          return false;
        }
      }
      
      // Filtro de status
      if (filtroStatus && filtroStatus !== "all" && d.status !== filtroStatus) return false;
      
      // Filtro por setor
      if (filtroSetor) {
        if (d.setorSolicitante !== filtroSetor) return false;
      }
      
      // Filtro por tipo de serviço
      if (filtroTipoServico) {
        if (d.tipoServicoCompra !== filtroTipoServico) return false;
      }
      
      // Filtro de data - ATRELADO À DATA REALIZAÇÃO
      if (filtroDataInicio || filtroDataFim) {
        // Verificar se a despesa tem datas de realização
        if (!d.datasRealizacao || d.datasRealizacao.length === 0) {
          // Se não tem data de realização, não passa no filtro de período
          return false;
        }
        
        // Verificar se alguma data de realização está dentro do período
        const dentroDoPerio = d.datasRealizacao.some((dr: any) => {
          const dataRealizacao = new Date(dr.dataRealizacao);
          
          if (filtroDataInicio) {
            const dataInicio = new Date(filtroDataInicio);
            if (dataRealizacao < dataInicio) return false;
          }
          
          if (filtroDataFim) {
            const dataFim = new Date(filtroDataFim);
            dataFim.setHours(23, 59, 59, 999);
            if (dataRealizacao > dataFim) return false;
          }
          
          return true;
        });
        
        if (!dentroDoPerio) return false;
      }
      
      return true;
    });
  }, [despesas, searchTerm, filtroStatus, filtroSetor, filtroTipoServico, filtroDataInicio, filtroDataFim, fornecedores]);
  
  // Paginação
  const totalPages = Math.ceil((despesasFiltradas?.length || 0) / itemsPerPage);
  const paginatedDespesas = useMemo(() => {
    if (!despesasFiltradas) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return despesasFiltradas.slice(startIndex, startIndex + itemsPerPage);
  }, [despesasFiltradas, currentPage, itemsPerPage]);
  
  // Resetar página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroStatus, filtroTurma, filtroDataInicio, filtroDataFim]);
  
  // Calcular totais para relatório
  const totais = useMemo(() => {
    if (!despesasFiltradas) return { total: 0, pendentes: 0, aprovadas: 0, liquidadas: 0 };
    
    let total = 0;
    let pendentes = 0;
    let aprovadas = 0;
    let liquidadas = 0;
    
    despesasFiltradas.forEach((d) => {
      total += d.valorTotal;
      if (d.status === "aguardando_aprovacao_gestor" || d.status === "aguardando_aprovacao_gestor_geral") {
        pendentes += d.valorTotal;
      } else if (d.status === "aprovado_gestor_geral") {
        aprovadas += d.valorTotal;
      } else if (d.status === "liquidado") {
        liquidadas += d.valorTotal;
      }
    });
    
    return { total, pendentes, aprovadas, liquidadas };
  }, [despesasFiltradas]);
  
  // Funções
  function openModal(despesa?: any) {
    if (despesa) {
      setEditingDespesa(despesa);
      setTipoDespesa(despesa.tipoDespesa);
      setMesServico(despesa.mesServico);
      setSetorSolicitante(despesa.setorSolicitante);
      setFornecedorId(despesa.fornecedorId);
      setTipoServicoCompra(despesa.tipoServicoCompra || "");
      setDetalhamento(despesa.detalhamento);
      setEReembolso(despesa.eReembolso);
      setValorTotal(String(despesa.valorTotal / 100));
      setTipoPagamento(despesa.tipoPagamento);
      setDadosPagamento(despesa.dadosPagamento);
      setTipoComprovanteFiscal(despesa.tipoComprovanteFiscal || "");
      setDataLimitePagamento(despesa.dataLimitePagamento ? new Date(despesa.dataLimitePagamento).toISOString().split("T")[0] : "");
      setLocal(despesa.local || "");
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  }
  
  function closeModal() {
    setIsModalOpen(false);
    setEditingDespesa(null);
    resetForm();
  }
  
  function resetForm() {
    setTipoDespesa("operacional");
    setMesServico("");
    setSetorSolicitante("estudio");
    setFornecedorId(null);
    setTipoServicoCompra("");
    setDetalhamento("");
    setEReembolso(false);
    setValorTotal("");
    setTipoPagamento("pix");
    setDadosPagamento("");
    setTipoComprovanteFiscal("");
    setDataLimitePagamento("");
    setLocal("");
    setTurmasSelecionadas([]);
    setDatasRealizacao([]);
    setComprovanteFiscalFiles([]);
    setDocumentosFiles([]);
    setSearchFornecedor("");
    setSearchTurma("");
  }
  
  function handleAddTurma(turmaId: number) {
    if (!turmasSelecionadas.some((t) => t.turmaId === turmaId)) {
      setTurmasSelecionadas([...turmasSelecionadas, { turmaId }]);
    }
    setOpenTurma(false);
    setSearchTurma("");
  }
  
  function handleRemoveTurma(turmaId: number) {
    setTurmasSelecionadas(turmasSelecionadas.filter((t) => t.turmaId !== turmaId));
  }
  
  function handleTipoEventoChange(turmaId: number, tipoEvento: string) {
    setTurmasSelecionadas(
      turmasSelecionadas.map((t) =>
        t.turmaId === turmaId ? { ...t, tipoEvento } : t
      )
    );
    
    // Atualizar local automaticamente
    const evento = eventos?.find((e) => e.turmaId === turmaId && e.tipoEvento === tipoEvento);
    if (evento?.local && locais) {
      // Buscar nome do local pelo ID (converter para number se necessário)
      const localId = typeof evento.local === 'string' ? parseInt(evento.local, 10) : evento.local;
      const localObj = locais.find((l) => l.id === localId);
      if (localObj) {
        setLocal(localObj.nome);
      }
    }
  }
  
  function toggleDataRealizacao(data: Date) {
    const exists = datasRealizacao.some((d) => d.getTime() === data.getTime());
    if (exists) {
      setDatasRealizacao(datasRealizacao.filter((d) => d.getTime() !== data.getTime()));
    } else {
      setDatasRealizacao([...datasRealizacao, data]);
    }
  }
  
  function toggleRowExpanded(id: number) {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  }
  
  async function handleSubmit() {
    if (!mesServico || !fornecedorId || !detalhamento || !valorTotal || !dadosPagamento) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    if (!setorSolicitante) {
      toast.error("Selecione o setor solicitante");
      return;
    }
    
    const valorEmCentavos = Math.round(parseFloat(valorTotal.replace(",", ".")) * 100);
    
    const data: any = {
      tipoDespesa,
      mesServico: mesServico as any,
      setorSolicitante,
      fornecedorId,
      tipoServicoCompra: tipoServicoCompra || undefined,
      detalhamento,
      eReembolso,
      valorTotal: valorEmCentavos,
      tipoPagamento,
      dadosPagamento,
      tipoComprovanteFiscal: tipoComprovanteFiscal || undefined,
      dataLimitePagamento: dataLimitePagamento ? new Date(dataLimitePagamento) : undefined,
      local: tipoDespesa === "operacional" ? local : undefined,
      turmas: tipoDespesa === "operacional" ? turmasSelecionadas : undefined,
      datasRealizacao: tipoDespesa === "operacional" && datasRealizacao.length > 0 ? datasRealizacao : undefined,
    };
    
    try {
      let despesaId: number;
      
      if (editingDespesa) {
        await updateDespesaMutation.mutateAsync({ id: editingDespesa.id, ...data });
        despesaId = editingDespesa.id;
      } else {
        const result = await createDespesaMutation.mutateAsync(data);
        if (!result.id) {
          toast.error("Erro ao criar despesa: ID não retornado");
          return;
        }
        despesaId = result.id;
      }
      
      // Upload dos arquivos de comprovante fiscal
      if (comprovanteFiscalFiles.length > 0) {
        toast.info("Fazendo upload dos comprovantes fiscais...");
        await uploadFiles(despesaId, comprovanteFiscalFiles, 'comprovante_fiscal');
      }
      
      // Upload dos documentos
      if (documentosFiles.length > 0) {
        toast.info("Fazendo upload dos documentos...");
        await uploadFiles(despesaId, documentosFiles, 'documento');
      }
      
      // Limpar arquivos após upload
      setComprovanteFiscalFiles([]);
      setDocumentosFiles([]);
      
      // Refetch para atualizar a lista com os anexos
      refetchDespesas();
    } catch (error) {
      console.error("Erro ao salvar despesa:", error);
    }
  }
  
  function handleDelete(id: number) {
    if (confirm("Tem certeza que deseja excluir esta despesa?")) {
      deleteDespesaMutation.mutate({ id });
    }
  }
  
  function openApprovalModal(despesaId: number, action: "aprovar" | "rejeitar", tipo: "gestor" | "gestor_geral") {
    setApprovalDespesaId(despesaId);
    setApprovalAction(action);
    setApprovalTipo(tipo);
    setRejeicaoJustificativa("");
    setApprovalModalOpen(true);
  }
  
  function handleApproval() {
    if (!approvalDespesaId) return;
    
    if (approvalAction === "aprovar") {
      if (approvalTipo === "gestor") {
        aprovarGestorMutation.mutate({ despesaId: approvalDespesaId });
      } else {
        aprovarGestorGeralMutation.mutate({ despesaId: approvalDespesaId });
      }
    } else {
      if (!rejeicaoJustificativa.trim()) {
        toast.error("Informe a justificativa para rejeição");
        return;
      }
      rejeitarMutation.mutate({
        despesaId: approvalDespesaId,
        tipo: approvalTipo,
        justificativa: rejeicaoJustificativa,
      });
    }
  }
  
  function openLiquidacaoModal(despesaId: number) {
    setLiquidacaoDespesaId(despesaId);
    setLiquidacaoData(new Date().toISOString().split("T")[0]);
    setLiquidacaoComprovantes([]);
    setLiquidacaoModalOpen(true);
  }
  
  async function handleLiquidacao() {
    if (!liquidacaoDespesaId || !liquidacaoData) {
      toast.error("Informe a data de liquidação");
      return;
    }
    
    try {
      // Converter todos os arquivos para base64
      const comprovantesData = [];
      
      if (liquidacaoComprovantes.length > 0) {
        toast.info(`Fazendo upload de ${liquidacaoComprovantes.length} comprovante(s)...`);
        
        for (const file of liquidacaoComprovantes) {
          const base64 = await fileToBase64(file);
          comprovantesData.push({
            nomeArquivo: file.name,
            fileBase64: base64,
            contentType: file.type || 'application/octet-stream',
          });
        }
      }
      
      liquidarMutation.mutate({
        despesaId: liquidacaoDespesaId,
        dataLiquidacao: new Date(liquidacaoData),
        comprovantes: comprovantesData.length > 0 ? comprovantesData : undefined,
      });
    } catch (error) {
      console.error("Erro ao liquidar despesa:", error);
      toast.error("Erro ao processar liquidação");
    }
  }
  
  // Obter nome do fornecedor (truncado se muito longo)
  function getFornecedorNome(id: number, maxLength: number = 25): string {
    const fornecedor = fornecedores?.find((f) => f.id === id);
    if (!fornecedor?.nome) return "-";
    if (fornecedor.nome.length <= maxLength) return fornecedor.nome;
    return fornecedor.nome.substring(0, maxLength) + "...";
  }
  
  // Obter nome completo do fornecedor (para tooltip)
  function getFornecedorNomeCompleto(id: number): string {
    const fornecedor = fornecedores?.find((f) => f.id === id);
    return fornecedor?.nome || "-";
  }
  
  // Verificar se pode aprovar como gestor
  function canApproveAsGestor(despesa: any): boolean {
    return despesa.status === "aguardando_aprovacao_gestor";
  }
  
  // Verificar se pode aprovar como gestor geral
  function canApproveAsGestorGeral(despesa: any): boolean {
    return despesa.status === "aguardando_aprovacao_gestor" || despesa.status === "aguardando_aprovacao_gestor_geral";
  }
  
  // Verificar se pode liquidar
  function canLiquidar(despesa: any): boolean {
    return despesa.status === "aprovado_gestor_geral";
  }
  
  // Obter nomes das turmas vinculadas
  function getTurmasNomes(turmasVinculadas: any[]): string {
    if (!turmasVinculadas || turmasVinculadas.length === 0) return "-";
    const nomes = turmasVinculadas.map((tv) => {
      // tv.turma já vem do backend com dados completos
      return tv.turma ? formatTurmaCompleta(tv.turma) : String(tv.turmaId);
    });
    return nomes.join(", ");
  }
  
  // Obter tipos de evento das turmas vinculadas
  function getTipoEventoDisplay(turmasVinculadas: any[]): string {
    if (!turmasVinculadas || turmasVinculadas.length === 0) return "-";
    const tipos = turmasVinculadas
      .filter((tv) => tv.tipoEvento)
      .map((tv) => tv.tipoEvento?.replace("foto_", "Foto ").replace("_", " "));
    if (tipos.length === 0) return "-";
    return Array.from(new Set(tipos)).join(", ");
  }
  
  // Obter datas de realização formatadas (para exibição vertical)
  function getDatasRealizacaoDisplay(datasRealizacao: any[]): React.ReactNode {
    if (!datasRealizacao || datasRealizacao.length === 0) return "-";
    const datas = datasRealizacao.map((dr) => formatDate(dr.dataRealizacao));
    return (
      <div className="flex flex-col gap-0.5">
        {datas.map((data, idx) => (
          <span key={idx}>{data}</span>
        ))}
      </div>
    );
  }
  
  // Obter link de anexos por tipo
  function getAnexosLink(anexos: any[], tipo: string): React.ReactNode {
    if (!anexos || anexos.length === 0) return "-";
    const anexosFiltrados = anexos.filter((a) => a.tipo === tipo);
    if (anexosFiltrados.length === 0) return "-";
    return (
      <div className="flex gap-1">
        {anexosFiltrados.map((anexo, idx) => (
          <a
            key={idx}
            href={anexo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            <Paperclip className="w-3 h-3" />
          </a>
        ))}
      </div>
    );
  }
  
  // Obter botão de anexos por tipo (com ícone de visualização)
  // Campos do schema: tipoAnexo, nomeArquivo, urlArquivo
  function getAnexosButton(anexos: any[], tipo: string, despesaId?: number): React.ReactNode {
    if (!anexos || anexos.length === 0) return <span className="text-slate-400">-</span>;
    const anexosFiltrados = anexos.filter((a) => a.tipoAnexo === tipo);
    if (anexosFiltrados.length === 0) return <span className="text-slate-400">-</span>;
    
    // Se for comprovante de liquidação, adicionar botão de editar
    if (tipo === "comprovante_liquidacao" && despesaId) {
      return (
        <div className="flex flex-col gap-1">
          {anexosFiltrados.map((anexo, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <a
                href={anexo.urlArquivo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                title={anexo.nomeArquivo}
              >
                <Eye className="w-3 h-3" />
                Ver
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-600 hover:text-red-700"
                onClick={() => {
                  if (confirm(`Deseja remover o anexo "${anexo.nomeArquivo}"?`)) {
                    deleteAnexoMutation.mutate({ id: anexo.id });
                  }
                }}
                title="Remover anexo"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      );
    }
    
    // Para outros tipos, adicionar botão de deletar também
    return (
      <div className="flex flex-col gap-1">
        {anexosFiltrados.map((anexo, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <a
              href={anexo.urlArquivo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              title={anexo.nomeArquivo}
            >
              <Eye className="w-3 h-3" />
              Ver
            </a>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-600 hover:text-red-700"
              onClick={() => {
                if (confirm(`Deseja remover o anexo "${anexo.nomeArquivo}"?`)) {
                  deleteAnexoMutation.mutate({ id: anexo.id });
                }
              }}
              title="Remover anexo"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Despesas</h1>
          <p className="text-muted-foreground">Gerenciamento de despesas operacionais e administrativas</p>
        </div>
        <PermissionGate secao="despesas" permission="inserir">
          <Button onClick={() => openModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Despesa
          </Button>
        </PermissionGate>
      </div>
      
      {/* Conteúdo */}
      <div className="space-y-4">
          {/* Cards de Resumo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-xl font-bold text-slate-800">
                {(() => {
                  // Verificar se há algum filtro ativo
                  const temFiltroAtivo = searchTerm || 
                    (filtroStatus && filtroStatus !== "all") || 
                    filtroTurma || 
                    filtroDataInicio || 
                    filtroDataFim || 
                    filtroEventoInicio || 
                    filtroEventoFim || 
                    filtroSetor || 
                    filtroTipoServico;
                  if (!temFiltroAtivo) return formatCurrency(0);
                  return formatCurrency(
                    despesasFiltradas.reduce((sum, d) => sum + (d.valorTotal || 0), 0)
                  );
                })()}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600">Pago</p>
              <p className="text-xl font-bold text-green-700">
                {(() => {
                  // Verificar se há algum filtro ativo
                  const temFiltroAtivo = searchTerm || 
                    (filtroStatus && filtroStatus !== "all") || 
                    filtroTurma || 
                    filtroDataInicio || 
                    filtroDataFim || 
                    filtroEventoInicio || 
                    filtroEventoFim || 
                    filtroSetor || 
                    filtroTipoServico;
                  if (!temFiltroAtivo) return formatCurrency(0);
                  return formatCurrency(
                    despesasFiltradas
                      .filter((d) => d.status === "liquidado")
                      .reduce((sum, d) => sum + (d.valorTotal || 0), 0)
                  );
                })()}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-red-600">Pendente</p>
              <p className="text-xl font-bold text-red-700">
                {(() => {
                  // Verificar se há algum filtro ativo
                  const temFiltroAtivo = searchTerm || 
                    (filtroStatus && filtroStatus !== "all") || 
                    filtroTurma || 
                    filtroDataInicio || 
                    filtroDataFim || 
                    filtroEventoInicio || 
                    filtroEventoFim || 
                    filtroSetor || 
                    filtroTipoServico;
                  if (!temFiltroAtivo) return formatCurrency(0);
                  return formatCurrency(
                    despesasFiltradas
                      .filter((d) => d.status !== "liquidado")
                      .reduce((sum, d) => sum + (d.valorTotal || 0), 0)
                  );
                })()}
              </p>
            </div>
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Linha 1: Busca e Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative sm:col-span-2 lg:col-span-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por CI, detalhamento, turma ou fornecedor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={filtroStatus || "all"} onValueChange={setFiltroStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Filtro por Setor */}
                  <Select 
                    value={filtroSetor || "all"} 
                    onValueChange={(v) => setFiltroSetor(v && v !== "all" ? v : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os setores</SelectItem>
                      <SelectItem value="estudio">Estúdio</SelectItem>
                      <SelectItem value="fotografia">Fotografia</SelectItem>
                      <SelectItem value="becas">Becas</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Filtro por Tipo de Serviço */}
                  <Select 
                    value={filtroTipoServico || "all"} 
                    onValueChange={(v) => setFiltroTipoServico(v && v !== "all" ? v : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por tipo de serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {tiposServico?.map((ts) => (
                        <SelectItem key={ts.id} value={ts.nome}>
                          {ts.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Linha 2: Datas e Botões de Exportação */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input
                    type="date"
                    placeholder="Data início"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                  />
                  <Input
                    type="date"
                    placeholder="Data fim"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                  />
                  <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSearchTerm("");
                        setFiltroStatus("all");
                        setFiltroSetor(null);
                        setFiltroTipoServico(null);
                        setFiltroDataInicio("");
                        setFiltroDataFim("");
                        setFiltroTurma(null);
                        toast.success("Filtros limpos com sucesso!");
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Limpar Filtros</span>
                    </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={exportToPDF}>
                    <FileText className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">PDF</span>
                  </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={exportToExcel}>
                      <Download className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Excel</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Tabela */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0 bg-white z-50 shadow-sm">
                    <tr className="bg-white">
                      <th className="px-2 py-3 text-left text-xs font-medium w-10"></th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Setor</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Data Lançamento</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Mês</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Nº CI</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Turma</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Tipo Evento</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Data Realização</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Fornecedor</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Tipo Serviço</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Detalhamento</th>
                      <th className="px-2 py-3 text-right text-xs font-medium">Valor</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Dados Pgto</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Comprov. Fiscal</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Data Limite</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Status</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Docs</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Comprov.</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Liquidação</th>
                      <th className="px-2 py-3 text-center text-xs font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedDespesas.map((despesa) => (
                      <Collapsible key={despesa.id} asChild open={expandedRows.has(despesa.id)}>
                        <>
                          <tr className="hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleRowExpanded(despesa.id)}
                                >
                                  {expandedRows.has(despesa.id) ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </td>
                            {/* 1. Setor */}
                            <td className="px-2 py-3 text-xs">
                              {despesa.setorSolicitante === "estudio" ? (
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Estúdio</Badge>
                              ) : despesa.setorSolicitante === "fotografia" ? (
                                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Fotografia</Badge>
                              ) : despesa.setorSolicitante === "becas" ? (
                                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Becas</Badge>
                              ) : (
                                <span>{despesa.setorSolicitante || "-"}</span>
                              )}
                            </td>
                            {/* 2. Data */}
                            <td className="px-2 py-3 text-xs">{formatDate(despesa.createdAt)}</td>
                            {/* 2. Mês Serviço */}
                            <td className="px-2 py-3 text-xs capitalize">{despesa.mesServico}</td>
                            {/* 3. Número CI */}
                            <td className="px-2 py-3 text-xs font-mono">{despesa.numeroCi}</td>
                            {/* 4. Turma (ou Administrativo) */}
                            <td className="px-2 py-3 text-xs">
                              {despesa.tipoDespesa === "administrativa" 
                                ? "Administrativo" 
                                : getTurmasNomes(despesa.turmasVinculadas)}
                            </td>
                            {/* 5. Tipo Evento */}
                            <td className="px-2 py-3 text-xs">
                              {despesa.tipoDespesa === "administrativa" 
                                ? "-" 
                                : getTipoEventoDisplay(despesa.turmasVinculadas)}
                            </td>
                            {/* 6. Data Realização */}
                            <td className="px-2 py-3 text-xs">
                              {getDatasRealizacaoDisplay(despesa.datasRealizacao)}
                            </td>
                            {/* 7. Fornecedor */}
                            <td className="px-3 py-3 text-xs">
                              {getFornecedorNomeCompleto(despesa.fornecedorId)}
                            </td>
                            {/* 8. Tipo Serviço */}
                            <td className="px-2 py-3 text-xs">{despesa.tipoServicoCompra || "-"}</td>
                            {/* 9. Detalhamento */}
                            <td className="px-2 py-3 text-xs max-w-[200px] truncate" title={despesa.detalhamento || "-"}>
                              {despesa.detalhamento || "-"}
                            </td>
                            {/* 10. Valor */}
                            <td className="px-2 py-3 text-xs text-right font-medium">
                              {formatCurrency(despesa.valorTotal)}
                            </td>
                            {/* 11. Dados Pagamento */}
                            <td className="px-3 py-3 text-xs whitespace-pre-wrap">
                              {despesa.dadosPagamento || "-"}
                            </td>
                            {/* 12. Tipo Comprovante Fiscal */}
                            <td className="px-2 py-3 text-xs capitalize">
                              {despesa.tipoComprovanteFiscal?.replace("_", " ") || "-"}
                            </td>
                            {/* 13. Data Limite Pagamento */}
                            <td className="px-2 py-3 text-xs">
                              {despesa.dataLimitePagamento ? formatDate(despesa.dataLimitePagamento) : "-"}
                            </td>
                            {/* 14. Status */}
                            <td className="px-2 py-3 text-xs">
                              <Badge className={cn("text-xs", STATUS_LABELS[despesa.status]?.color)}>
                                {STATUS_LABELS[despesa.status]?.label?.replace("Aprovação do ", "").replace("pelo ", "") || despesa.status}
                              </Badge>
                            </td>
                            {/* 15. Documentos */}
                            <td className="px-3 py-3 text-xs">
                              {getAnexosButton(despesa.anexos, "documento")}
                            </td>
                            {/* 16. Comprovante Fiscal */}
                            <td className="px-3 py-3 text-xs">
                              {getAnexosButton(despesa.anexos, "comprovante_fiscal")}
                            </td>
                            {/* 17. Liquidação */}
                            <td className="px-3 py-3 text-xs">
                              {getAnexosButton(despesa.anexos, "comprovante_liquidacao", despesa.id)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                {/* Botões de aprovação */}
                                {canApproveAsGestor(despesa) && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-green-600 hover:text-green-700"
                                      onClick={() => openApprovalModal(despesa.id, "aprovar", "gestor")}
                                      title="Aprovar como Gestor"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-600 hover:text-red-700"
                                      onClick={() => openApprovalModal(despesa.id, "rejeitar", "gestor")}
                                      title="Rejeitar"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                                
                                {/* Gestor Geral pode aprovar em qualquer status de aprovação */}
                                {isAdmin && canApproveAsGestorGeral(despesa) && despesa.status === "aguardando_aprovacao_gestor_geral" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-green-600 hover:text-green-700"
                                      onClick={() => openApprovalModal(despesa.id, "aprovar", "gestor_geral")}
                                      title="Aprovar como Gestor Geral"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-600 hover:text-red-700"
                                      onClick={() => openApprovalModal(despesa.id, "rejeitar", "gestor_geral")}
                                      title="Rejeitar"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                                
                                {/* Botão de liquidação */}
                                {canLiquidar(despesa) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-emerald-600 hover:text-emerald-700"
                                    onClick={() => openLiquidacaoModal(despesa.id)}
                                    title="Liquidar"
                                  >
                                    <DollarSign className="w-4 h-4" />
                                  </Button>
                                )}
                                
                                {/* Botão de adicionar comprovante de liquidação */}
                                {despesa.status === "liquidado" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-blue-600 hover:text-blue-700"
                                    onClick={() => {
                                      setEditarAnexosDespesaId(despesa.id);
                                      setEditarAnexosModalOpen(true);
                                    }}
                                    title="Adicionar comprovante de liquidação"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                )}
                                
                                {/* Editar e excluir */}
                                <PermissionGate secao="despesas" permission="inserir">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openModal(despesa)}
                                    title="Editar"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </PermissionGate>
                                <PermissionGate secao="despesas" permission="excluir">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(despesa.id)}
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </PermissionGate>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Linha expandida com histórico */}
                          <CollapsibleContent asChild>
                            <tr>
                              <td colSpan={18} className="bg-muted/20 px-4 py-4">
                                <HistoricoSection despesaId={despesa.id} />
                              </td>
                            </tr>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    ))}
                    {paginatedDespesas.length === 0 && (
                      <tr>
                        <td colSpan={18} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhuma despesa encontrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          {/* Paginação */}
          {totalPages > 0 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Mostrando</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>de {despesasFiltradas?.length || 0} registros</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <span className="text-sm px-2">
                      Página {currentPage} de {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
      </div>
      
      {/* Relatório foi movido para a seção Relatórios */}
      {false && (
          <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Geral</p>
                    <p className="text-2xl font-bold">{formatCurrency(totais.total)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold">{formatCurrency(totais.pendentes)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aprovadas</p>
                    <p className="text-2xl font-bold">{formatCurrency(totais.aprovadas)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Liquidadas</p>
                    <p className="text-2xl font-bold">{formatCurrency(totais.liquidadas)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Filtros do relatório */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Select value={filtroStatus || "all"} onValueChange={setFiltroStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Período Lançamento</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      placeholder="Início"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                    />
                    <Input
                      type="date"
                      placeholder="Fim"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Período Eventos</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      placeholder="Início"
                      value={filtroEventoInicio}
                      onChange={(e) => setFiltroEventoInicio(e.target.value)}
                    />
                    <Input
                      type="date"
                      placeholder="Fim"
                      value={filtroEventoFim}
                      onChange={(e) => setFiltroEventoFim(e.target.value)}
                    />
                  </div>
                </div>
                
                <div></div>
                
                <div className="flex gap-2 items-end">
                  <Button variant="outline" className="flex-1" onClick={exportToPDF}>
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={exportToExcel}>
                    <Download className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Tabela do relatório */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-2 py-3 text-left text-xs font-medium">Data Lançamento</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Mês</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Nº CI</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Turma</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Tipo Evento</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Data Realização</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Fornecedor</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Tipo Serviço</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Detalhamento</th>
                      <th className="px-2 py-3 text-right text-xs font-medium">Valor</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Dados Pgto</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Comprov. Fiscal</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Data Limite</th>
                      <th className="px-2 py-3 text-left text-xs font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {despesasFiltradas.map((despesa) => (
                      <tr key={despesa.id} className="hover:bg-muted/30">
                        <td className="px-2 py-3 text-xs">{formatDate(despesa.createdAt)}</td>
                        <td className="px-2 py-3 text-xs capitalize">{despesa.mesServico}</td>
                        <td className="px-2 py-3 text-xs font-mono">{despesa.numeroCi}</td>
                        <td className="px-2 py-3 text-xs">
                          {despesa.tipoDespesa === "administrativa" 
                            ? "Administrativo" 
                            : getTurmasNomes(despesa.turmasVinculadas)}
                        </td>
                        <td className="px-2 py-3 text-xs">
                          {despesa.tipoDespesa === "administrativa" 
                            ? "-" 
                            : getTipoEventoDisplay(despesa.turmasVinculadas)}
                        </td>
                        <td className="px-2 py-3 text-xs">
                          {getDatasRealizacaoDisplay(despesa.datasRealizacao)}
                        </td>
                        <td className="px-2 py-3 text-xs" title={getFornecedorNomeCompleto(despesa.fornecedorId)}>
                          {getFornecedorNome(despesa.fornecedorId, 15)}
                        </td>
                        <td className="px-2 py-3 text-xs">{despesa.tipoServicoCompra || "-"}</td>
                        <td className="px-2 py-3 text-xs max-w-[200px] truncate" title={despesa.detalhamento || "-"}>
                          {despesa.detalhamento || "-"}
                        </td>
                        <td className="px-2 py-3 text-xs text-right font-medium">
                          {formatCurrency(despesa.valorTotal)}
                        </td>
                        <td className="px-2 py-3 text-xs whitespace-normal break-words" title={despesa.dadosPagamento}>
                          {despesa.dadosPagamento?.substring(0, 12) || "-"}...
                        </td>
                        <td className="px-2 py-3 text-xs capitalize">
                          {despesa.tipoComprovanteFiscal?.replace("_", " ") || "-"}
                        </td>
                        <td className="px-2 py-3 text-xs">
                          {despesa.dataLimitePagamento ? formatDate(despesa.dataLimitePagamento) : "-"}
                        </td>
                        <td className="px-2 py-3 text-xs">
                          <Badge className={cn("text-xs", STATUS_LABELS[despesa.status]?.color)}>
                            {STATUS_LABELS[despesa.status]?.label?.replace("Aprovação do ", "").replace("pelo ", "") || despesa.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {despesasFiltradas.length === 0 && (
                      <tr>
                        <td colSpan={14} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhuma despesa encontrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-muted/50">
                    <tr>
                      <td colSpan={8} className="px-4 py-3 text-sm font-bold text-right">Total:</td>
                      <td className="px-4 py-3 text-sm font-bold text-right">{formatCurrency(totais.total)}</td>
                      <td colSpan={4}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
          </div>
      )}
      
      {/* Modal Nova/Editar Despesa */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDespesa ? "Editar Despesa" : "Nova Despesa"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Informações Gerais */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Informações Gerais</h3>
              
              {/* Tipo da Despesa */}
              <div className="space-y-2">
                <Label>Tipo da despesa *</Label>
                <RadioGroup
                  value={tipoDespesa}
                  onValueChange={(v) => setTipoDespesa(v as "operacional" | "administrativa")}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="operacional" id="operacional" />
                    <Label htmlFor="operacional">Operacional</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="administrativa" id="administrativa" />
                    <Label htmlFor="administrativa">Administrativa</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Número da CI (automático) */}
                <div className="space-y-2">
                  <Label>Número da CI *</Label>
                  <Input
                    value={editingDespesa?.numeroCi || "Gerado automaticamente"}
                    disabled
                    className="bg-muted"
                  />
                </div>
                
                {/* Mês do Serviço */}
                <div className="space-y-2">
                  <Label>Mês do serviço *</Label>
                  <Select value={mesServico || ""} onValueChange={setMesServico}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês do serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map((mes) => (
                        <SelectItem key={mes.value} value={mes.value}>
                          {mes.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Setor Solicitante */}
              <div className="space-y-2">
                <Label>Setor solicitante *</Label>
                <Select value={setorSolicitante || "estudio"} onValueChange={(v) => setSetorSolicitante(v as "estudio" | "fotografia" | "becas")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o setor solicitante" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estudio">Estúdio</SelectItem>
                    <SelectItem value="fotografia">Fotografia</SelectItem>
                    <SelectItem value="becas">Becas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Fornecedor */}
                <div className="space-y-2">
                  <Label>Fornecedor *</Label>
                  <Popover open={openFornecedor} onOpenChange={setOpenFornecedor} modal={false}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openFornecedor}
                        className="w-full justify-between"
                      >
                        {fornecedorId
                          ? fornecedores?.find((f) => f.id === fornecedorId)?.nome
                          : "Informe o fornecedor"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar fornecedor..."
                          value={searchFornecedor}
                          onValueChange={setSearchFornecedor}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                          <CommandGroup>
                            {filteredFornecedores.slice(0, 50).map((fornecedor) => (
                              <CommandItem
                                key={fornecedor.id}
                                value={String(fornecedor.id)}
                                onSelect={() => {
                                  setFornecedorId(fornecedor.id);
                                  setOpenFornecedor(false);
                                  setSearchFornecedor("");
                                  // Preencher dados de pagamento com Pix do fornecedor
                                  if (fornecedor.chavesPix) {
                                    try {
                                      const chaves = JSON.parse(fornecedor.chavesPix);
                                      if (chaves.length > 0) {
                                        setDadosPagamento(`PIX: ${chaves[0]}`);
                                      }
                                    } catch {}
                                  } else if (fornecedor.pix) {
                                    setDadosPagamento(`PIX: ${fornecedor.pix}`);
                                  }
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    fornecedorId === fornecedor.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {fornecedor.nome}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* Tipo do Serviço/Compra */}
                <div className="space-y-2">
                  <Label>Tipo do serviço/compra</Label>
                  <Select value={tipoServicoCompra || ""} onValueChange={setTipoServicoCompra}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposServicoFornecedor.length > 0 ? (
                        tiposServicoFornecedor.map((ts) => (
                          <SelectItem key={ts.id} value={ts.nome}>
                            {ts.nome}
                          </SelectItem>
                        ))
                      ) : (
                        tiposServico?.map((ts) => (
                          <SelectItem key={ts.id} value={ts.nome}>
                            {ts.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Detalhamento */}
              <div className="space-y-2">
                <Label>Detalhamento *</Label>
                <Textarea
                  placeholder="Informe o detalhamento do serviço/compra"
                  value={detalhamento}
                  onChange={(e) => setDetalhamento(e.target.value)}
                  rows={3}
                />
              </div>
              
              {/* É reembolso? */}
              <div className="space-y-2">
                <Label>É reembolso? *</Label>
                <RadioGroup
                  value={eReembolso ? "sim" : "nao"}
                  onValueChange={(v) => setEReembolso(v === "sim")}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="reembolso-sim" />
                    <Label htmlFor="reembolso-sim">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="reembolso-nao" />
                    <Label htmlFor="reembolso-nao">Não</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Campos para Operacional */}
              {tipoDespesa === "operacional" && (
                <>
                  {/* Turmas */}
                  <div className="space-y-2">
                    <Label>Turma(s)</Label>
                    <Popover open={openTurma} onOpenChange={setOpenTurma} modal={false}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openTurma}
                          className="w-full justify-between"
                        >
                          Adicionar turma
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[500px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar turma..."
                            value={searchTurma}
                            onValueChange={setSearchTurma}
                          />
                          <CommandList>
                            <CommandEmpty>Nenhuma turma encontrada.</CommandEmpty>
                            <CommandGroup>
                              {filteredTurmas.map((turma) => (
                                <CommandItem
                                  key={turma.id}
                                  value={String(turma.id)}
                                  onSelect={() => handleAddTurma(turma.id)}
                                >
                                  {formatDadosTurma(turma)}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    
                    {/* Turmas selecionadas */}
                    {turmasSelecionadas.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {turmasSelecionadas.map((ts) => {
                          const turma = turmas?.find((t) => t.id === ts.turmaId);
                          // Filtrar apenas eventos que têm data cadastrada (existem na seção Eventos)
                          const eventosDaTurma = eventos?.filter((e) => e.turmaId === ts.turmaId && e.dataEvento) || [];
                          const tiposEventoUnicos = Array.from(new Set(eventosDaTurma.map((e) => e.tipoEvento))).filter((tipo) => tipo && tipo.trim() !== '');
                          
                          return (
                            <div key={ts.turmaId} className="flex items-center gap-2 p-2 border rounded">
                              <span className="flex-1 text-sm">{turma ? formatDadosTurma(turma) : ts.turmaId}</span>
                              <Select
                                value={ts.tipoEvento || "__placeholder__"}
                                onValueChange={(v) => handleTipoEventoChange(ts.turmaId, v)}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Tipo de evento" />
                                </SelectTrigger>
                                <SelectContent>
                                  {tiposEventoUnicos.length > 0 ? (
                                    tiposEventoUnicos.map((tipo) => (
                                      <SelectItem key={tipo} value={tipo}>
                                        {tipo.replace("foto_", "Foto ").replace("_", " ")}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="__placeholder__" disabled>
                                      Nenhum evento cadastrado
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveTurma(ts.turmaId)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Datas de Realização */}
                  {datasDisponiveis.length > 0 && (
                    <div className="space-y-2">
                      <Label>Data de Realização</Label>
                      <div className="flex flex-wrap gap-2">
                        {datasDisponiveis.map((data, idx) => {
                          const isSelected = datasRealizacao.some((d) => d.getTime() === data.getTime());
                          return (
                            <Badge
                              key={idx}
                              variant={isSelected ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => toggleDataRealizacao(data)}
                            >
                              {formatDate(data)}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Local */}
                  <div className="space-y-2">
                    <Label>Local</Label>
                    {locaisUnicos.length > 1 ? (
                      <Select value={local} onValueChange={setLocal}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o local" />
                        </SelectTrigger>
                        <SelectContent>
                          {locaisUnicos.map((l) => (
                            <SelectItem key={l.id} value={l.nome}>
                              {l.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={local}
                        onChange={(e) => setLocal(e.target.value)}
                        placeholder="Local do evento (preenchido automaticamente)"
                        disabled={locaisUnicos.length === 1}
                      />
                    )}
                    {locaisUnicos.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {locaisUnicos.length === 1 
                          ? `Local do evento: ${locaisUnicos[0].nome}`
                          : `${locaisUnicos.length} locais disponíveis para esta turma`
                        }
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* Informações Financeiras */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Informações Financeiras</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Valor Total */}
                <div className="space-y-2">
                  <Label>Valor total do serviço/compra *</Label>
                  <Input
                    type="text"
                    placeholder="Informe o valor"
                    value={valorTotal}
                    onChange={(e) => setValorTotal(e.target.value)}
                  />
                </div>
                
                {/* Tipo de Pagamento */}
                <div className="space-y-2">
                  <Label>Tipo de pagamento *</Label>
                  <Select value={tipoPagamento || "pix"} onValueChange={(v) => setTipoPagamento(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_PAGAMENTO.map((tp) => (
                        <SelectItem key={tp.value} value={tp.value}>
                          {tp.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Dados para Pagamento */}
              <div className="space-y-2">
                <Label>Dados para o pagamento *</Label>
                <Textarea
                  placeholder="Informe os dados para o pagamento, seja pix, conta bancária e etc"
                  value={dadosPagamento}
                  onChange={(e) => setDadosPagamento(e.target.value)}
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Tipo de Comprovante Fiscal */}
                <div className="space-y-2">
                  <Label>Tipo de comprovante fiscal</Label>
                  <Select value={tipoComprovanteFiscal || ""} onValueChange={(v) => setTipoComprovanteFiscal(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_COMPROVANTE.map((tc) => (
                        <SelectItem key={tc.value} value={tc.value}>
                          {tc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Data Limite de Pagamento */}
                <div className="space-y-2">
                  <Label>Data limite de pagamento</Label>
                  <Input
                    type="date"
                    value={dataLimitePagamento}
                    onChange={(e) => setDataLimitePagamento(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            {/* Anexos */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Anexos (Opcional)</h3>
              
              {/* Comprovante Fiscal */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Comprovante fiscal</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => comprovanteFiscalRef.current?.click()}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar anexo
                  </Button>
                  <input
                    ref={comprovanteFiscalRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        setComprovanteFiscalFiles([...comprovanteFiscalFiles, ...Array.from(e.target.files)]);
                      }
                    }}
                  />
                </div>
                {comprovanteFiscalFiles.length > 0 && (
                  <div className="space-y-1">
                    {comprovanteFiscalFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                        <span>{file.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setComprovanteFiscalFiles(comprovanteFiscalFiles.filter((_, i) => i !== idx))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Documentos */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Documentos</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => documentosRef.current?.click()}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar anexo
                  </Button>
                  <input
                    ref={documentosRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        setDocumentosFiles([...documentosFiles, ...Array.from(e.target.files)]);
                      }
                    }}
                  />
                </div>
                {documentosFiles.length > 0 && (
                  <div className="space-y-1">
                    {documentosFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                        <span>{file.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDocumentosFiles(documentosFiles.filter((_, i) => i !== idx))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Nota de campos obrigatórios */}
            <p className="text-sm text-muted-foreground">* Campos obrigatórios</p>
            
            {/* Botões */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createDespesaMutation.isPending || updateDespesaMutation.isPending}
              >
                {createDespesaMutation.isPending || updateDespesaMutation.isPending
                  ? "Salvando..."
                  : editingDespesa
                  ? "Salvar alterações"
                  : "Enviar solicitação"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Aprovação/Rejeição */}
      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "aprovar" ? "Aprovar Despesa" : "Rejeitar Despesa"}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === "aprovar"
                ? `Confirma a aprovação como ${approvalTipo === "gestor" ? "Gestor" : "Gestor Geral"}?`
                : "Informe o motivo da rejeição."}
            </DialogDescription>
          </DialogHeader>
          
          {approvalAction === "rejeitar" && (
            <div className="space-y-2">
              <Label>Justificativa *</Label>
              <Textarea
                placeholder="Informe o motivo da rejeição"
                value={rejeicaoJustificativa}
                onChange={(e) => setRejeicaoJustificativa(e.target.value)}
                rows={3}
              />
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setApprovalModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={approvalAction === "aprovar" ? "default" : "destructive"}
              onClick={handleApproval}
              disabled={aprovarGestorMutation.isPending || aprovarGestorGeralMutation.isPending || rejeitarMutation.isPending}
            >
              {approvalAction === "aprovar" ? "Aprovar" : "Rejeitar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Liquidação */}
      <Dialog open={liquidacaoModalOpen} onOpenChange={setLiquidacaoModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liquidar Despesa</DialogTitle>
            <DialogDescription>
              Informe a data de liquidação e anexe o comprovante de pagamento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data de liquidação *</Label>
              <Input
                type="date"
                value={liquidacaoData}
                onChange={(e) => setLiquidacaoData(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Comprovantes de pagamento</Label>
              <div className="border rounded-lg p-4 space-y-3">
                {liquidacaoComprovantes.length > 0 ? (
                  <div className="space-y-2">
                    {liquidacaoComprovantes.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => {
                            setLiquidacaoComprovantes(prev => prev.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum arquivo selecionado</p>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => liquidacaoComprovanteRef.current?.click()}
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Adicionar Comprovante
                </Button>
                <input
                  ref={liquidacaoComprovanteRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      const newFiles = Array.from(e.target.files);
                      setLiquidacaoComprovantes(prev => [...prev, ...newFiles]);
                      // Limpar o input para permitir adicionar o mesmo arquivo novamente
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLiquidacaoModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleLiquidacao}
              disabled={liquidarMutation.isPending}
            >
              {liquidarMutation.isPending ? "Processando..." : "Confirmar Liquidação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Edição de Anexos de Liquidação */}
      <Dialog open={editarAnexosModalOpen} onOpenChange={setEditarAnexosModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Anexos de Liquidação</DialogTitle>
            <DialogDescription>
              Adicione novos comprovantes de pagamento para esta despesa.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Novos comprovantes</Label>
              <div className="border rounded-lg p-4 space-y-3">
                {novosAnexosLiquidacao.length > 0 ? (
                  <div className="space-y-2">
                    {novosAnexosLiquidacao.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => {
                            setNovosAnexosLiquidacao(prev => prev.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum arquivo selecionado</p>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => novosAnexosLiquidacaoRef.current?.click()}
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Selecionar Arquivos
                </Button>
                <input
                  ref={novosAnexosLiquidacaoRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      const newFiles = Array.from(e.target.files);
                      setNovosAnexosLiquidacao(prev => [...prev, ...newFiles]);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setEditarAnexosModalOpen(false);
                setNovosAnexosLiquidacao([]);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!editarAnexosDespesaId || novosAnexosLiquidacao.length === 0) {
                  toast.error("Selecione pelo menos um arquivo");
                  return;
                }
                
                try {
                  // Upload de cada arquivo
                  for (const file of novosAnexosLiquidacao) {
                    const base64 = await fileToBase64(file);
                    const base64Data = base64.split(',')[1];
                    
                    await uploadAnexoMutation.mutateAsync({
                      despesaId: editarAnexosDespesaId,
                      tipoAnexo: 'comprovante_liquidacao',
                      nomeArquivo: file.name,
                      fileBase64: base64Data,
                      contentType: file.type,
                    });
                  }
                  
                  toast.success("Anexos adicionados com sucesso!");
                  refetchDespesas();
                  setEditarAnexosModalOpen(false);
                  setNovosAnexosLiquidacao([]);
                } catch (error) {
                  console.error('Erro ao adicionar anexos:', error);
                  toast.error("Erro ao adicionar anexos");
                }
              }}
              disabled={uploadAnexoMutation.isPending || novosAnexosLiquidacao.length === 0}
            >
              {uploadAnexoMutation.isPending ? "Enviando..." : "Adicionar Anexos"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente para exibir o histórico de uma despesa
function HistoricoSection({ despesaId }: { despesaId: number }) {
  const { data: historico, isLoading } = trpc.despesasV2.listHistorico.useQuery({ despesaId });
  
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando histórico...</div>;
  }
  
  if (!historico || historico.length === 0) {
    return <div className="text-sm text-muted-foreground">Nenhum registro no histórico.</div>;
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <History className="w-4 h-4" />
        Histórico de Aprovações
      </div>
      <div className="space-y-2">
        {historico.map((item) => (
          <div key={item.id} className="flex items-start gap-3 text-sm p-2 bg-background rounded border">
            <div className={cn("font-medium", ACAO_LABELS[item.acao]?.color || "text-gray-600")}>
              {ACAO_LABELS[item.acao]?.label || item.acao}
            </div>
            <div className="flex-1">
              <div className="text-muted-foreground">
                por {item.usuarioNome || "Sistema"} em {formatDateTime(item.createdAt)}
              </div>
              {item.justificativa && (
                <div className="mt-1 text-sm bg-muted p-2 rounded">
                  <span className="font-medium">Justificativa:</span> {item.justificativa}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
