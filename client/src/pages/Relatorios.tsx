/**
 * Relatorios.tsx
 * Correção do erro removeChild - 11/12/2024 22:40
 * Usado useMemo para ordenar turmas de forma segura
 */
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { LOGO_BASE64 } from "@/lib/logo";
import { formatTurmaServico, formatTurmaVenda as formatTurmaVendaUtil, parseJsonArray, parseJsonNumberArray } from "@/lib/formatTurma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Check, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  FileText,
  Download,
  Filter,
  BarChart3,
  Eye,
  Paperclip,
  Receipt,
  FileSpreadsheet,
  Sparkles,
  Scissors,
  Users,
  DollarSign
} from "lucide-react";
import * as XLSX from "xlsx";
import RelatoriosDashboard from "./RelatoriosDashboard";

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
};

// Componente para tab de Vendas Excluídas
function VendasExcluidasTab() {
  const [searchVE, setSearchVE] = useState("");
  const [filterTipoVE, setFilterTipoVE] = useState<string>("all"); // Novo filtro: Todas, Excluída, Editada
  const [filterPeriodoInicioVE, setFilterPeriodoInicioVE] = useState("");
  const [filterPeriodoFimVE, setFilterPeriodoFimVE] = useState("");
  
  const { data: vendasExcluidas, isLoading } = trpc.vendas.vendasExcluidas.useQuery();
  const { data: turmas } = trpc.turmas.list.useQuery();
  
  // Filtrar vendas
  const vendasFiltradas = useMemo(() => {
    if (!vendasExcluidas) return [];
    return vendasExcluidas.filter((venda: any) => {
      // Busca expandida: Formando, Turma, Valor, Usuário
      const matchSearch = !searchVE || 
        venda.formandoNome?.toLowerCase().includes(searchVE.toLowerCase()) ||
        String(venda.turmaCodigo)?.toLowerCase().includes(searchVE.toLowerCase()) ||
        venda.turmaCurso?.toLowerCase().includes(searchVE.toLowerCase()) ||
        String(venda.valorTotal)?.includes(searchVE) ||
        venda.usuarioNome?.toLowerCase().includes(searchVE.toLowerCase());
      
      const matchTipo = filterTipoVE === "all" || venda.tipo === filterTipoVE;
      const matchPeriodo = (!filterPeriodoInicioVE || new Date(venda.dataAlteracao) >= new Date(filterPeriodoInicioVE)) &&
                          (!filterPeriodoFimVE || new Date(venda.dataAlteracao) <= new Date(filterPeriodoFimVE));
      return matchSearch && matchTipo && matchPeriodo;
    });
  }, [vendasExcluidas, searchVE, filterTipoVE, filterPeriodoInicioVE, filterPeriodoFimVE]);
  
  // Função para exportar para Excel
  const exportToExcel = () => {
    if (!vendasFiltradas || vendasFiltradas.length === 0) {
      toast.error("Nenhuma alteração para exportar");
      return;
    }
    
    const dados = vendasFiltradas.map((v: any) => {
      let camposAlteradosTexto = "-";
      if (v.camposAlterados) {
        try {
          const campos = typeof v.camposAlterados === 'string' 
            ? JSON.parse(v.camposAlterados) 
            : v.camposAlterados;
          camposAlteradosTexto = Object.keys(campos).join(", ");
        } catch (e) {
          camposAlteradosTexto = "-";
        }
      }
      
      return {
        "Tipo": v.tipo === "exclusao" ? "Excluída" : "Editada",
        "Data Venda": formatDate(v.dataVenda),
        "Formando": v.formandoNome,
        "Turma": formatTurmaVenda(v),
        "Valor": formatCurrency(v.valorTotal),
        "Campos Alterados": camposAlteradosTexto,
        "Motivo": v.motivo || "-",
        "Usuário": v.usuarioNome || "-",
        "Data Manipulação": formatDate(v.dataAlteracao),
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alterações de Vendas");
    XLSX.writeFile(wb, `alteracoes_vendas_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Relatório exportado com sucesso!");
  };
  
  // Função para exportar para PDF
  const exportToPDF = () => {
    if (!vendasFiltradas || vendasFiltradas.length === 0) {
      toast.error("Nenhuma alteração para exportar");
      return;
    }
    
    const linhasTabela = vendasFiltradas.map((v: any) => {
      let camposAlteradosTexto = "-";
      if (v.camposAlterados) {
        try {
          const campos = typeof v.camposAlterados === 'string' 
            ? JSON.parse(v.camposAlterados) 
            : v.camposAlterados;
          camposAlteradosTexto = Object.keys(campos).join(", ");
        } catch (e) {
          camposAlteradosTexto = "-";
        }
      }
      
      const tipoTag = v.tipo === "exclusao" 
        ? '<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 500;">Excluída</span>'
        : '<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 500;">Editada</span>';
      
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tipoTag}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${formatDate(v.dataVenda)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${v.formandoNome}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${formatTurmaVenda(v)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: 600;">${formatCurrency(v.valorTotal)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${camposAlteradosTexto}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${v.motivo || "-"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${v.usuarioNome || "-"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${formatDate(v.dataAlteracao)}</td>
        </tr>
      `;
    }).join('');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Alterações de Vendas</title>
        <style>
          @page { margin: 1cm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { max-width: 200px; margin-bottom: 10px; }
          h1 { color: #1e293b; margin: 10px 0; font-size: 24px; }
          .info { color: #64748b; font-size: 14px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #cbd5e1; }
          .total { margin-top: 20px; text-align: right; font-size: 16px; font-weight: bold; color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/logo.png" alt="Estúdio Super A" class="logo" />
          <h1>Relatório de Alterações de Vendas</h1>
          <div class="info">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
          <div class="info">{vendasFiltradas.length} {vendasFiltradas.length === 1 ? 'alteração' : 'alterações'} encontrada(s)</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Data Venda</th>
              <th>Formando</th>
              <th>Turma</th>
              <th>Valor</th>
              <th>Campos Alterados</th>
              <th>Motivo</th>
              <th>Usuário</th>
              <th>Data Manipulação</th>
            </tr>
          </thead>
          <tbody>
            ${linhasTabela}
          </tbody>
        </table>
        <div class="total">Total Manipulado: ${formatCurrency(totalExcluido)}</div>
      </body>
      </html>
    `;
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    toast.success("PDF gerado com sucesso!");
  };
  
  // Calcular total
  const totalExcluido = useMemo(() => {
    return vendasFiltradas.reduce((sum: number, v: any) => sum + (v.valorTotal || 0), 0);
  }, [vendasFiltradas]);
  
  return (
    <div className="space-y-4">
      {/* Botões de Ação e Total */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button onClick={exportToPDF} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">Total Manipulado</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExcluido)}</p>
          <p className="text-xs text-slate-500">{vendasFiltradas.length} {vendasFiltradas.length === 1 ? 'alteração' : 'alterações'}</p>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label>Buscar</Label>
          <Input
            placeholder="Formando, Turma, Valor, Usuário..."
            value={searchVE}
            onChange={(e) => setSearchVE(e.target.value)}
          />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={filterTipoVE} onValueChange={setFilterTipoVE}>
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="exclusao">Excluída</SelectItem>
              <SelectItem value="edicao">Editada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Período (Início)</Label>
          <Input
            type="date"
            value={filterPeriodoInicioVE}
            onChange={(e) => setFilterPeriodoInicioVE(e.target.value)}
          />
        </div>
        <div>
          <Label>Período (Fim)</Label>
          <Input
            type="date"
            value={filterPeriodoFimVE}
            onChange={(e) => setFilterPeriodoFimVE(e.target.value)}
          />
        </div>
      </div>
      
      {/* Tabela */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[600px] relative">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Data Venda</TableHead>
                <TableHead>Formando</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Campos Alterados</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Data Manipulação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendasFiltradas.length > 0 ? (
                vendasFiltradas.map((venda: any) => {
                  // Processar campos alterados se existirem
                  let camposAlteradosTexto = "-";
                  if (venda.camposAlterados) {
                    try {
                      const campos = typeof venda.camposAlterados === 'string' 
                        ? JSON.parse(venda.camposAlterados) 
                        : venda.camposAlterados;
                      camposAlteradosTexto = Object.keys(campos).join(", ");
                    } catch (e) {
                      camposAlteradosTexto = "-";
                    }
                  }
                  
                  return (
                    <TableRow key={venda.id}>
                      <TableCell>
                        {venda.tipo === "exclusao" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Excluída
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Editada
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(venda.dataVenda)}</TableCell>
                      <TableCell className="font-medium">{venda.formandoNome}</TableCell>
                      <TableCell>{formatTurmaVenda(venda)}</TableCell>
                      <TableCell className="font-semibold text-red-600">{formatCurrency(venda.valorTotal)}</TableCell>
                      <TableCell className="max-w-xs truncate" title={camposAlteradosTexto}>{camposAlteradosTexto}</TableCell>
                      <TableCell className="max-w-xs truncate" title={venda.motivo}>{venda.motivo || "-"}</TableCell>
                      <TableCell>{venda.usuarioNome || "-"}</TableCell>
                      <TableCell>{formatDate(venda.dataAlteracao)}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    Nenhuma alteração de venda encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

const formatDate = (date: Date | string | null) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR");
};

// Formatar tipo de evento: foto_estudio -> Foto Estúdio
const formatTipoEvento = (tipo: string) => {
  if (!tipo) return "";
  return tipo
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Funções movidas para @/lib/formatTurma.ts
const formatTurmaCompleta = formatTurmaServico;
const formatTurmaVenda = formatTurmaVendaUtil;

// Obter nome do mês em português
const getMesEvento = (data: Date | string | null): string => {
  if (!data) return '-';
  const d = new Date(data);
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return meses[d.getMonth()];
};

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-gray-100 text-gray-800",
  apto: "bg-green-100 text-green-800",
  pendente_nf: "bg-red-100 text-red-800",
  cancelado: "bg-blue-100 text-blue-800",
  // Status despesasV2
  aguardando_gestor: "bg-yellow-100 text-yellow-800",
  aguardando_gestor_geral: "bg-orange-100 text-orange-800",
  aprovado_gestor: "bg-blue-100 text-blue-800",
  aprovado_gestor_geral: "bg-green-100 text-green-800",
  liquidado: "bg-emerald-100 text-emerald-800",
  rejeitado: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  apto: "Apto",
  pendente_nf: "Pendente NF",
  cancelado: "Cancelado",
  // Status despesasV2
  aguardando_aprovacao_gestor: "Aguardando Aprovação Gestor",
  aguardando_aprovacao_gestor_geral: "Aguardando Aprovação Gestor Geral",
  aprovado_gestor: "Aprovado Gestor",
  aprovado_gestor_geral: "Aprovado Gestor Geral",
  liquidado: "Liquidado",
  rejeitado: "Rejeitado",
};

const TIPO_DESPESA_LABELS: Record<string, string> = {
  operacional: "Operacional",
  administrativo: "Administrativo",
};

const SETOR_LABELS: Record<string, string> = {
  estudio: "Estúdio",
  fotografia: "Fotografia",
};

export default function Relatorios() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTipoDespesa, setFilterTipoDespesa] = useState<string>("all");
  const [filterSetor, setFilterSetor] = useState<string>("all");
  const [filterPago, setFilterPago] = useState<string>("all");
  const [filterPeriodoEventoInicio, setFilterPeriodoEventoInicio] = useState("");
  const [filterPeriodoEventoFim, setFilterPeriodoEventoFim] = useState("");
  
  // Estados para Relatório NF
  const [searchNF, setSearchNF] = useState("");
  const [filterTurmaNF, setFilterTurmaNF] = useState<string>("all");
  const [filterPeriodoInicio, setFilterPeriodoInicio] = useState("");
  const [filterPeriodoFim, setFilterPeriodoFim] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "despesas" | "nf" | "servicos" | "execucao" | "compensacao" | "vendas_excluidas">("dashboard");
  
  // Estados para Relatório de Serviços Make/Cabelo
  const [filterTurmaServicos, setFilterTurmaServicos] = useState<string>("all");
  const [searchTurmaServicos, setSearchTurmaServicos] = useState("");
  
  // Estados para Relatório de Execução
  const [filterTurmaExecucao, setFilterTurmaExecucao] = useState<string>("all");
  const [filterEventoExecucao, setFilterEventoExecucao] = useState<string>("all");
  const [searchExecucao, setSearchExecucao] = useState("");
  const [filterComObservacoes, setFilterComObservacoes] = useState<string>("all");
  const [filterPeriodoInicioServicos, setFilterPeriodoInicioServicos] = useState("");
  const [filterPeriodoFimServicos, setFilterPeriodoFimServicos] = useState("");
  const [openTurmaCombobox, setOpenTurmaCombobox] = useState(false);
  
  // Estados para Relatório de Compensação Bancária
  const [searchCompensacao, setSearchCompensacao] = useState("");
  const [filterTurmaCompensacao, setFilterTurmaCompensacao] = useState<string>("all");
  const [filterTipoPagamento, setFilterTipoPagamento] = useState<string>("all");
  const [filterPeriodoInicioCompensacao, setFilterPeriodoInicioCompensacao] = useState("");
  const [filterPeriodoFimCompensacao, setFilterPeriodoFimCompensacao] = useState("");
  const [sortColumnCompensacao, setSortColumnCompensacao] = useState<string | null>(null);
  const [sortDirectionCompensacao, setSortDirectionCompensacao] = useState<'asc' | 'desc'>('asc');

  // Queries
  const { data: despesas, isLoading } = trpc.despesasV2.list.useQuery();
  const { data: turmas } = trpc.turmas.list.useQuery();
  const { data: fornecedores } = trpc.fornecedores.list.useQuery();
  const { data: tiposServico } = trpc.tiposServico.list.useQuery();
  const { data: tiposEvento } = trpc.tiposEvento.list.useQuery();
  const { data: eventos } = trpc.eventos.list.useQuery();
  const { data: vendas } = trpc.vendas.list.useQuery();
  const { data: permissoesRelatorios } = trpc.permissoesRelatorios.list.useQuery();
  
  // Função para verificar se usuário tem permissão para visualizar uma aba
  const podeVisualizarAba = (aba: string): boolean => {
    if (!permissoesRelatorios) return false;
    const permissao = permissoesRelatorios.find((p: any) => p.aba === aba);
    return permissao?.visualizar === true;
  };
  
  // Query para relatório de execução
  const { data: execucoesFormando, isLoading: loadingExecucoes } = trpc.execucaoFormando.listByEvento.useQuery(
    { eventoId: filterEventoExecucao !== "all" ? parseInt(filterEventoExecucao) : 0 },
    { enabled: filterEventoExecucao !== "all" }
  );
  
  // Query para relatório de maquiagem
  const { data: relatorioMaquiagem, isLoading: loadingMaquiagem } = trpc.servicosExecucao.relatorioMaquiagem.useQuery({
    dataInicio: filterPeriodoInicioServicos ? new Date(filterPeriodoInicioServicos) : undefined,
    dataFim: filterPeriodoFimServicos ? new Date(filterPeriodoFimServicos + "T23:59:59") : undefined,
    turmaId: undefined, // Filtro removido, usar busca no frontend
  });
  
  // Query para relatório de cabelo
  const { data: relatorioCabelo, isLoading: loadingCabelo } = trpc.servicosExecucao.relatorioCabelo.useQuery({
    dataInicio: filterPeriodoInicioServicos ? new Date(filterPeriodoInicioServicos) : undefined,
    dataFim: filterPeriodoFimServicos ? new Date(filterPeriodoFimServicos + "T23:59:59") : undefined,
    turmaId: undefined, // Filtro removido, usar busca no frontend
  });
  
  // Query para relatório de compensação bancária
  const { data: compensacaoBancaria, isLoading: loadingCompensacao } = trpc.vendas.compensacaoBancaria.useQuery();



  // Função para exportar despesas para Excel
  const exportarDespesasExcel = () => {
    if (!filteredDespesas || filteredDespesas.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    
    const data = filteredDespesas.map((despesa: any) => {
      const fornecedor = fornecedores?.find((f: any) => f.id === despesa.fornecedorId);
      const turmasVinculadas = despesa.turmasVinculadas || [];
      const turmasCodigos = turmasVinculadas.map((tv: any) => {
        // tv.turma já vem do backend com dados completos
        return tv.turma ? formatTurmaCompleta(tv.turma) : "";
      }).filter(Boolean).join(", ");
      
      return {
        "Nº CI": despesa.numeroCi || "-",
        "Tipo": despesa.tipoDespesa === "operacional" ? "Operacional" : "Administrativa",
        "Setor": despesa.setorSolicitante || "-",
        "Turma": turmasCodigos || "-",
        "Evento": despesa.tipoEvento || "-",
        "Mês Serviço": despesa.mesServico || "-",
        "Fornecedor": fornecedor?.nome || "-",
        "Serviço": despesa.tipoServico || "-",
        "Valor": formatCurrency(despesa.valorTotal || 0),
        "Data Limite": formatDate(despesa.dataLimitePagamento),
        "Status": STATUS_LABELS[despesa.status] || despesa.status,
        "Pagamento": despesa.status === "liquidado" ? "Sim" : "Não",
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Despesas");
    XLSX.writeFile(wb, `relatorio_despesas_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Relatório exportado com sucesso!");
  };
  
  // Função para exportar despesas para PDF
  const exportarDespesasPDF = () => {
    if (!filteredDespesas || filteredDespesas.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    
    // Criar conteúdo HTML para o PDF
    const rows = filteredDespesas.map((despesa: any) => {
      const fornecedor = fornecedores?.find((f: any) => f.id === despesa.fornecedorId);
      const turmasVinculadas = despesa.turmasVinculadas || [];
      const turmasCodigos = turmasVinculadas.map((tv: any) => {
        // tv.turma já vem do backend com dados completos
        return tv.turma ? formatTurmaCompleta(tv.turma) : "";
      }).filter(Boolean).join(", ");
      
      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 6px; font-size: 10px;">${despesa.numeroCi || "-"}</td>
          <td style="border: 1px solid #ddd; padding: 6px; font-size: 10px;">${despesa.tipoDespesa === "operacional" ? "Op." : "Adm."}</td>
          <td style="border: 1px solid #ddd; padding: 6px; font-size: 10px;">${turmasCodigos || "-"}</td>
          <td style="border: 1px solid #ddd; padding: 6px; font-size: 10px;">${despesa.mesServico || "-"}</td>
          <td style="border: 1px solid #ddd; padding: 6px; font-size: 10px;">${fornecedor?.nome || "-"}</td>
          <td style="border: 1px solid #ddd; padding: 6px; font-size: 10px;">${despesa.tipoServico || "-"}</td>
          <td style="border: 1px solid #ddd; padding: 6px; font-size: 10px; text-align: right;">${formatCurrency(despesa.valorTotal || 0)}</td>
          <td style="border: 1px solid #ddd; padding: 6px; font-size: 10px;">${formatDate(despesa.dataLimitePagamento)}</td>
          <td style="border: 1px solid #ddd; padding: 6px; font-size: 10px;">${STATUS_LABELS[despesa.status] || despesa.status}</td>
        </tr>
      `;
    }).join("");
    
    // Calcular totais
    const total = filteredDespesas.reduce((acc: number, d: any) => acc + (d.valorTotal || 0), 0);
    const totalPago = filteredDespesas.filter((d: any) => d.status === "liquidado").reduce((acc: number, d: any) => acc + (d.valorTotal || 0), 0);
    const totalPendente = total - totalPago;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Despesas</title>
        <style>
          @page { size: landscape; margin: 15mm; }
          body { font-family: Arial, sans-serif; font-size: 12px; }
          .header { display: flex; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .logo { width: 120px; height: auto; margin-right: 20px; }
          .title { font-size: 18px; font-weight: bold; }
          .subtitle { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #f5f5f5; border: 1px solid #ddd; padding: 8px; font-size: 10px; text-align: left; }
          .totals { margin-top: 20px; display: flex; gap: 30px; }
          .total-box { padding: 10px; border-radius: 5px; }
          .total-geral { background-color: #e3f2fd; }
          .total-pago { background-color: #e8f5e9; }
          .total-pendente { background-color: #ffebee; }
          .footer { margin-top: 30px; font-size: 10px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${LOGO_BASE64}" class="logo" alt="Logo" />
          <div>
            <div class="title">Relatório de Despesas</div>
            <div class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
          </div>
        </div>
        
        <div class="totals">
          <div class="total-box total-geral">
            <strong>Total Geral:</strong> ${formatCurrency(total)}
          </div>
          <div class="total-box total-pago">
            <strong>Total Pago:</strong> ${formatCurrency(totalPago)}
          </div>
          <div class="total-box total-pendente">
            <strong>Total Pendente:</strong> ${formatCurrency(totalPendente)}
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Nº CI</th>
              <th>Tipo</th>
              <th>Turma</th>
              <th>Mês</th>
              <th>Fornecedor</th>
              <th>Serviço</th>
              <th>Valor</th>
              <th>Data Limite</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        
        <div class="footer">
          Estúdio Super A Formaturas - Relatório de Despesas - ${filteredDespesas.length} registro(s)
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    toast.success("PDF gerado com sucesso!");
  };

  // Função para exportar dados de maquiagem para Excel
  const exportarMaquiagemExcel = () => {
    if (!relatorioMaquiagem?.resumoPorFornecedor || relatorioMaquiagem.resumoPorFornecedor.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    
    // Função para formatar valor com vírgula (padrão brasileiro)
    const formatValorBR = (valor: number) => (valor / 100).toFixed(2).replace('.', ',');
    
    // Criar dados para a planilha de resumo
    const resumoData = relatorioMaquiagem.resumoPorFornecedor.map((r: any) => ({
      'Maquiadora': r.fornecedorNome,
      'Qtd Make Formando': r.qtdMakeFormando,
      'Qtd Make Família': r.qtdMakeFamilia,
      'A Pagar (R$)': formatValorBR(r.totalPagar),
      'A Receber (R$)': formatValorBR(r.totalReceber),
      'Saldo (R$)': formatValorBR(r.saldo),
    }));
    
    // Criar dados para a planilha de detalhes
    const detalhesData = relatorioMaquiagem.servicos?.map((s: any) => ({
      'Formando': s.formandoNome || '-',
      'Turma': formatTurmaCompleta(s),
      'Tipo': s.tipoServico === 'make_formando' ? 'Formando' : 'Família',
      'Tipo Make': s.tipoMake === 'masc' ? 'Masc.' : s.tipoMake === 'fem' ? 'Fem.' : '-',
      'Maquiadora': s.fornecedorNome || '-',
      'Quantidade': s.quantidade,
      'Valor (R$)': formatValorBR(s.valorTotal || 0),
      'Fluxo': s.fluxo === 'pagar' ? 'Super A Paga' : 'Super A Recebe',
      'Data': s.dataRealizacao ? new Date(s.dataRealizacao).toLocaleDateString('pt-BR') : '-',
    })) || [];
    
    // Criar workbook com duas planilhas
    const wb = XLSX.utils.book_new();
    const wsResumo = XLSX.utils.json_to_sheet(resumoData);
    const wsDetalhes = XLSX.utils.json_to_sheet(detalhesData);
    
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo por Maquiadora');
    XLSX.utils.book_append_sheet(wb, wsDetalhes, 'Detalhes Serviços');
    
    // Gerar arquivo e fazer download
    const dataAtual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `relatorio-maquiagem-${dataAtual}.xlsx`);
    toast.success("Relatório exportado com sucesso!");
  };
  
  // Função para exportar dados de cabelo para Excel
  const exportarCabeloExcel = () => {
    if (!relatorioCabelo?.servicos || relatorioCabelo.servicos.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    
    // Função para formatar valor com vírgula (padrão brasileiro)
    const formatValorBR = (valor: number) => (valor / 100).toFixed(2).replace('.', ',');
    
    const data = relatorioCabelo.servicos.map((s: any) => ({
      'Formando': s.formandoNome || '-',
      'Turma': formatTurmaCompleta(s),
      'Tipo': s.tipoServico === 'cabelo_simples' ? 'Simples' : 'Combinado',
      'Cabeleireira': s.fornecedorNome || '-',
      'Valor Serviço (R$)': formatValorBR(s.valorTotal || 0),
      'Comissão 20% (R$)': formatValorBR((s.valorTotal || 0) * 0.2),
      'Data': s.dataRealizacao ? new Date(s.dataRealizacao).toLocaleDateString('pt-BR') : '-',
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Serviços de Cabelo');
    
    const dataAtual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `relatorio-cabelo-${dataAtual}.xlsx`);
    toast.success("Relatório exportado com sucesso!");
  };

  // Filtrar vendas para NF
  const filteredVendas = vendas?.filter((v: any) => {
    const evento = eventos?.find((e: any) => e.id === v.eventoId);
    const turma = evento ? turmas?.find((t: any) => t.id === evento.turmaId) : null;
    
    const searchLower = searchNF.toLowerCase();
    
    // Busca por nome do formando OU dados da turma
    const turmaCompleta = turma ? formatTurmaCompleta(turma) : '';
    const matchesSearch = !searchNF || 
      (v.formandoNome || '').toLowerCase().includes(searchLower) ||
      turmaCompleta.toLowerCase().includes(searchLower);
    
    const vendaDate = new Date(v.dataVenda);
    const matchesPeriodo = 
      (!filterPeriodoInicio || vendaDate >= new Date(filterPeriodoInicio)) &&
      (!filterPeriodoFim || vendaDate <= new Date(filterPeriodoFim + "T23:59:59"));
    
    return matchesSearch && matchesPeriodo;
  }) || [];
  
  // Calcular total de vendas
  const totalVendas = filteredVendas.reduce((acc: number, v: any) => acc + (v.valorTotal || 0), 0);
  
  // Calcular total de ajustes
  const totalAjustesNF = filteredVendas.reduce((sum: number, v: any) => {
    if (!v.itens) return sum;
    return sum + v.itens.reduce((s: number, item: any) => s + (item.ajusteValor || 0), 0);
  }, 0);
  
  // Função para exportar NF para Excel
  const exportarNFExcel = () => {
    if (!filteredVendas || filteredVendas.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    
    const formatValorBR = (valor: number) => (valor / 100).toFixed(2).replace('.', ',');
    
    // Função para obter ajuste total e justificativas dos itens
    const getAjusteInfo = (venda: any) => {
      if (!venda.itens || venda.itens.length === 0) return { ajusteTotal: 0, justificativas: '' };
      const ajusteTotal = venda.itens.reduce((sum: number, item: any) => sum + (item.ajusteValor || 0), 0);
      const justificativas = venda.itens
        .filter((item: any) => item.justificativa)
        .map((item: any) => `${item.produto}: ${item.justificativa}`)
        .join('; ');
      return { ajusteTotal, justificativas };
    };
    
    const data = filteredVendas.map((v: any) => {
      const evento = eventos?.find((e: any) => e.id === v.eventoId);
      const tipoEvento = evento ? tiposEvento?.find((t: any) => t.codigo === evento.tipoEvento) : null;
      const { ajusteTotal, justificativas } = getAjusteInfo(v);
      
      return {
        'Nome Formando': v.formandoNome || '-',
        'CPF': v.formandoCpf || '-',
        'E-mail': v.formandoEmail || '-',
        'Turma': formatTurmaVenda(v),
        'Evento': tipoEvento?.nome || evento?.tipoEvento?.replace(/_/g, " ") || '-',
        'Mês Evento': getMesEvento(v.eventoData),
        'Data Evento': v.eventoData ? new Date(v.eventoData).toLocaleDateString('pt-BR') : '-',
        'Data Venda': new Date(v.dataVenda).toLocaleDateString('pt-BR'),
        'Ajuste (R$)': ajusteTotal !== 0 ? formatValorBR(ajusteTotal) : '-',
        'Justificativa': justificativas || '-',
        'Valor Total (R$)': formatValorBR(v.valorTotal || 0),
      };
    });
    
    // Calcular total de ajustes
    const totalAjustes = filteredVendas.reduce((sum: number, v: any) => {
      if (!v.itens) return sum;
      return sum + v.itens.reduce((s: number, item: any) => s + (item.ajusteValor || 0), 0);
    }, 0);
    
    // Adicionar linha de total
    data.push({
      'Nome Formando': 'TOTAL',
      'CPF': '',
      'E-mail': '',
      'Turma': '',
      'Evento': '',
      'Mês Evento': '',
      'Data Evento': '',
      'Data Venda': '',
      'Ajuste (R$)': totalAjustes !== 0 ? formatValorBR(totalAjustes) : '-',
      'Justificativa': '',
      'Valor Total (R$)': formatValorBR(totalVendas),
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Emissão de Nota Fiscal');
    
    const dataAtual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `relatorio-nf-${dataAtual}.xlsx`);
    toast.success("Relatório exportado com sucesso!");
  };
  
  // Função para exportar NF para PDF (usando HTML para imprimir)
  const exportarNFPDF = () => {
    if (!filteredVendas || filteredVendas.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    
    const formatValorBR = (valor: number) => (valor / 100).toFixed(2).replace('.', ',');
    
    // Função para obter ajuste total e justificativas dos itens
    const getAjusteInfo = (venda: any) => {
      if (!venda.itens || venda.itens.length === 0) return { ajusteTotal: 0, justificativas: '' };
      const ajusteTotal = venda.itens.reduce((sum: number, item: any) => sum + (item.ajusteValor || 0), 0);
      const justificativas = venda.itens
        .filter((item: any) => item.justificativa)
        .map((item: any) => `${item.produto}: ${item.justificativa}`)
        .join('; ');
      return { ajusteTotal, justificativas };
    };
    
    // Calcular total de ajustes
    const totalAjustes = filteredVendas.reduce((sum: number, v: any) => {
      if (!v.itens) return sum;
      return sum + v.itens.reduce((s: number, item: any) => s + (item.ajusteValor || 0), 0);
    }, 0);
    
    // Logo em base64 (Estúdio Super A)
    const logoUrl = LOGO_BASE64;
    
    let html = `
      <html>
      <head>
        <title>Relatório de Emissão de Nota Fiscal</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
          .header { display: flex; align-items: center; margin-bottom: 20px; }
          .logo { height: 50px; margin-right: 20px; }
          .header-text { flex: 1; }
          h1 { color: #333; font-size: 16px; margin: 0; }
          .subtitle { color: #666; font-size: 12px; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background-color: #f5f5f5; font-size: 10px; }
          .total-row { font-weight: bold; background-color: #e8f5e9; }
          .valor { text-align: right; }
          .ajuste-positivo { color: #16a34a; }
          .ajuste-negativo { color: #dc2626; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoUrl}" alt="Estúdio Super A" class="logo" onerror="this.style.display='none'" />
          <div class="header-text">
            <h1>Relatório de Emissão de Nota Fiscal</h1>
            <p class="subtitle">Data de geração: ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nome Formando</th>
              <th>CPF</th>
              <th>E-mail</th>
              <th>Turma</th>
              <th>Evento</th>
              <th>Mês Evento</th>
              <th>Data Evento</th>
              <th>Data Venda</th>
              <th>Ajuste</th>
              <th>Justificativa</th>
              <th>Valor Total</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    filteredVendas.forEach((v: any) => {
      const evento = eventos?.find((e: any) => e.id === v.eventoId);
      const tipoEvento = evento ? tiposEvento?.find((t: any) => t.codigo === evento.tipoEvento) : null;
      const { ajusteTotal, justificativas } = getAjusteInfo(v);
      const ajusteClass = ajusteTotal > 0 ? 'ajuste-positivo' : ajusteTotal < 0 ? 'ajuste-negativo' : '';
      
      html += `
        <tr>
          <td>${v.formandoNome || '-'}</td>
          <td>${v.formandoCpf || '-'}</td>
          <td>${v.formandoEmail || '-'}</td>
          <td>${formatTurmaVenda(v)}</td>
          <td>${tipoEvento?.nome || evento?.tipoEvento?.replace(/_/g, " ") || '-'}</td>
          <td>${getMesEvento(v.eventoData)}</td>
          <td>${v.eventoData ? new Date(v.eventoData).toLocaleDateString('pt-BR') : '-'}</td>
          <td>${new Date(v.dataVenda).toLocaleDateString('pt-BR')}</td>
          <td class="valor ${ajusteClass}">${ajusteTotal !== 0 ? 'R$ ' + formatValorBR(ajusteTotal) : '-'}</td>
          <td>${justificativas || '-'}</td>
          <td class="valor">R$ ${formatValorBR(v.valorTotal || 0)}</td>
        </tr>
      `;
    });
    
    const ajusteTotalClass = totalAjustes > 0 ? 'ajuste-positivo' : totalAjustes < 0 ? 'ajuste-negativo' : '';
    
    html += `
            <tr class="total-row">
              <td colspan="8">TOTAL</td>
              <td class="valor ${ajusteTotalClass}">${totalAjustes !== 0 ? 'R$ ' + formatValorBR(totalAjustes) : '-'}</td>
              <td></td>
              <td class="valor">R$ ${formatValorBR(totalVendas)}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
    toast.success("PDF gerado - use Ctrl+P para salvar!");
  };

  // Filtrar despesas (despesasV2)
  const filteredDespesas = despesas?.filter((d: any) => {
    const fornecedor = fornecedores?.find((f: any) => f.id === d.fornecedorId);
    // Turmas vinculadas para despesasV2
    const turmasVinculadas = d.turmasVinculadas || [];
    const turmasCodigos = turmasVinculadas.map((tv: any) => {
      const t = turmas?.find((turma: any) => turma.id === tv.turmaId);
      return t?.codigo || "";
    }).join(", ");
    
    const searchLower = search.toLowerCase();
    
    const matchesSearch = 
      (d.numeroCi || "").toLowerCase().includes(searchLower) ||
      (fornecedor?.nome || "").toLowerCase().includes(searchLower) ||
      turmasCodigos.toLowerCase().includes(searchLower) ||
      (d.detalhamento || "").toLowerCase().includes(searchLower);
    
    const matchesStatus = filterStatus === "all" || d.status === filterStatus;
    const matchesTipoDespesa = filterTipoDespesa === "all" || d.tipoDespesa === filterTipoDespesa;
    const matchesSetor = filterSetor === "all" || d.setorSolicitante === filterSetor;
    // Para despesasV2, verificar se está liquidado
    const isLiquidado = d.status === "liquidado";
    const matchesPago = filterPago === "all" || 
      (filterPago === "sim" && isLiquidado) || 
      (filterPago === "nao" && !isLiquidado);
    
    // Filtro de período de eventos (baseado nas datas de realização)
    let matchesPeriodoEvento = true;
    if (filterPeriodoEventoInicio || filterPeriodoEventoFim) {
      const datasRealizacao = d.datasRealizacao || [];
      if (datasRealizacao.length === 0) {
        matchesPeriodoEvento = false;
      } else {
        const periodoInicio = filterPeriodoEventoInicio ? new Date(filterPeriodoEventoInicio) : null;
        const periodoFim = filterPeriodoEventoFim ? new Date(filterPeriodoEventoFim + "T23:59:59") : null;
        
        matchesPeriodoEvento = datasRealizacao.some((dr: any) => {
          const dataRealizacao = new Date(dr.dataRealizacao);
          const afterInicio = !periodoInicio || dataRealizacao >= periodoInicio;
          const beforeFim = !periodoFim || dataRealizacao <= periodoFim;
          return afterInicio && beforeFim;
        });
      }
    }
    
    return matchesSearch && matchesStatus && matchesTipoDespesa && matchesSetor && matchesPago && matchesPeriodoEvento;
  });

  // Calcular totais
  const totalValor = filteredDespesas?.reduce((acc: number, d: any) => acc + d.valorTotal, 0) || 0;
  const totalPago = filteredDespesas?.filter((d: any) => d.status === "liquidado").reduce((acc: number, d: any) => acc + d.valorTotal, 0) || 0;
  const totalPendente = totalValor - totalPago;
  
  // Função para calcular status de compensação
  const getStatusCompensacao = (dataCompensacao: Date | string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataComp = new Date(dataCompensacao);
    dataComp.setHours(0, 0, 0, 0);
    
    if (dataComp < hoje) {
      return { label: 'Compensado', color: 'bg-green-100 text-green-800 border-green-200' };
    } else if (dataComp.getTime() === hoje.getTime()) {
      return { label: 'A Compensar Hoje', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    } else {
      return { label: 'A Compensar', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    }
  };

  // Função para alternar ordenação de Compensação Bancária
  const handleSortCompensacao = (column: string) => {
    if (sortColumnCompensacao === column) {
      setSortDirectionCompensacao(sortDirectionCompensacao === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumnCompensacao(column);
      setSortDirectionCompensacao('asc');
    }
  };

  // Filtrar dados de compensação bancária
  const filteredCompensacao = compensacaoBancaria?.filter((item: any) => {
    const searchLower = searchCompensacao.toLowerCase();
    
    // Busca por nome do formando OU dados da turma
    const turmaCompleta = formatTurmaCompleta({
      codigo: item.turmaCodigo,
      cursos: item.turmaCursos,
      instituicoes: item.turmaInstituicoes,
      numeroTurma: item.turmaNumero,
      anos: item.turmaAno,
      periodos: item.turmaPeriodo
    });
    
    const matchesSearch = !searchCompensacao || 
      (item.formandoNome || "").toLowerCase().includes(searchLower) ||
      turmaCompleta.toLowerCase().includes(searchLower) ||
      (item.turmaCodigo || "").toString().includes(searchCompensacao);
    
    // Filtro por turma removido - agora usa apenas busca unificada
    
    // Filtro por tipo de pagamento
    const matchesTipoPagamento = filterTipoPagamento === "all" || 
      item.pagamentoTipo === filterTipoPagamento;
    
    // Filtro por período de venda
    const vendaDate = new Date(item.dataVenda);
    const matchesPeriodo = 
      (!filterPeriodoInicioCompensacao || vendaDate >= new Date(filterPeriodoInicioCompensacao)) &&
      (!filterPeriodoFimCompensacao || vendaDate <= new Date(filterPeriodoFimCompensacao + "T23:59:59"));
    
    return matchesSearch && matchesTipoPagamento && matchesPeriodo;
  }) || [];

  // Ordenar dados de compensação bancária
  const sortedCompensacao = [...filteredCompensacao].sort((a: any, b: any) => {
    if (!sortColumnCompensacao) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortColumnCompensacao) {
      case 'nome':
        aValue = (a.formandoNome || '').toLowerCase();
        bValue = (b.formandoNome || '').toLowerCase();
        break;
      case 'dataVenda':
        aValue = new Date(a.dataVenda).getTime();
        bValue = new Date(b.dataVenda).getTime();
        break;
      case 'dataCompensacao':
        aValue = new Date(a.dataCompensacao).getTime();
        bValue = new Date(b.dataCompensacao).getTime();
        break;
      case 'valor':
        aValue = a.valorLiquido || 0;
        bValue = b.valorLiquido || 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirectionCompensacao === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirectionCompensacao === 'asc' ? 1 : -1;
    return 0;
  });
  
  // Calcular total de compensação
  // Só calcular se houver algum filtro ativo (busca, tipo de pagamento ou período)
  const hasActiveFilters = searchCompensacao || filterTipoPagamento !== "all" || filterPeriodoInicioCompensacao || filterPeriodoFimCompensacao;
  const totalCompensacao = hasActiveFilters 
    ? filteredCompensacao.reduce((acc: number, item: any) => acc + (item.valorLiquido || 0), 0)
    : 0;
  
  // Função para exportar Compensação Bancária para Excel
  const exportarCompensacaoExcel = () => {
    if (!filteredCompensacao || filteredCompensacao.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    
    const formatValorBR = (valor: number) => (valor / 100).toFixed(2).replace('.', ',');
    
    const data = filteredCompensacao.map((item: any) => {
      const turmaFormatada = formatTurmaCompleta({
        codigo: item.turmaCodigo,
        cursos: item.turmaCursos,
        instituicoes: item.turmaInstituicoes,
        numeroTurma: item.turmaNumero,
        anos: item.turmaAno,
        periodos: item.turmaPeriodo
      });
      
      let tipoPagamento = '';
      if (item.pagamentoTipo === 'credito') {
        tipoPagamento = `Crédito${item.pagamentoBandeira ? ` - ${item.pagamentoBandeira}` : ''}${item.pagamentoParcelas > 1 ? ` (${item.pagamentoParcelas}x)` : ''}`;
      } else if (item.pagamentoTipo === 'debito') {
        tipoPagamento = `Débito${item.pagamentoBandeira ? ` - ${item.pagamentoBandeira}` : ''}`;
      } else if (item.pagamentoTipo === 'pix') {
        tipoPagamento = 'PIX';
      } else if (item.pagamentoTipo === 'dinheiro') {
        tipoPagamento = 'Dinheiro';
      } else if (item.pagamentoTipo === 'incluso_pacote') {
        tipoPagamento = 'Incluso no Pacote';
      }
      
      return {
        'Nome do Formando': item.formandoNome || '-',
        'Turma': turmaFormatada,
        'Evento': formatTipoEvento(item.eventoTipo || ''),
        'Data da Venda': formatDate(item.dataVenda),
        'Tipo de Pagamento': tipoPagamento,
        'Data da Compensação': formatDate(item.dataCompensacao),
        'Valor Líquido (R$)': formatValorBR(item.valorLiquido || 0),
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compensação Bancária');
    XLSX.writeFile(wb, `relatorio_compensacao_bancaria_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Relatório exportado com sucesso!");
  };
  
  // Função para exportar Compensação Bancária para PDF
  const exportarCompensacaoPDF = () => {
    if (!filteredCompensacao || filteredCompensacao.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    
    const rows = filteredCompensacao.map((item: any) => {
      const turmaFormatada = formatTurmaCompleta({
        codigo: item.turmaCodigo,
        cursos: item.turmaCursos,
        instituicoes: item.turmaInstituicoes,
        numeroTurma: item.turmaNumero,
        anos: item.turmaAno,
        periodos: item.turmaPeriodo
      });
      
      let tipoPagamento = '';
      if (item.pagamentoTipo === 'credito') {
        tipoPagamento = `Crédito${item.pagamentoBandeira ? ` - ${item.pagamentoBandeira}` : ''}${item.pagamentoParcelas > 1 ? ` (${item.pagamentoParcelas}x)` : ''}`;
      } else if (item.pagamentoTipo === 'debito') {
        tipoPagamento = `Débito${item.pagamentoBandeira ? ` - ${item.pagamentoBandeira}` : ''}`;
      } else if (item.pagamentoTipo === 'pix') {
        tipoPagamento = 'PIX';
      } else if (item.pagamentoTipo === 'dinheiro') {
        tipoPagamento = 'Dinheiro';
      } else if (item.pagamentoTipo === 'incluso_pacote') {
        tipoPagamento = 'Incluso no Pacote';
      }
      
      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.formandoNome || '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${turmaFormatada}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${formatTipoEvento(item.eventoTipo || '')}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${formatDate(item.dataVenda)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${tipoPagamento}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${formatDate(item.dataCompensacao)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(item.valorLiquido || 0)}</td>
        </tr>
      `;
    }).join('');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Compensação Bancária</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { width: 120px; height: auto; margin-bottom: 10px; }
          h1 { color: #333; font-size: 24px; margin: 10px 0; }
          .info { color: #666; font-size: 14px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th { background-color: #4F46E5; color: white; padding: 10px; text-align: left; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          .total { font-weight: bold; background-color: #e0e7ff !important; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${LOGO_BASE64}" alt="Logo" class="logo" />
          <h1>Relatório de Compensação Bancária</h1>
          <div class="info">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
          <div class="info">Total de registros: ${filteredCompensacao.length} | Valor total: ${formatCurrency(totalCompensacao)}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nome do Formando</th>
              <th>Turma</th>
              <th>Evento</th>
              <th>Data da Venda</th>
              <th>Tipo de Pagamento</th>
              <th>Data da Compensação</th>
              <th style="text-align: right;">Valor Líquido</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total">
              <td colspan="6" style="text-align: right; padding: 10px;">TOTAL:</td>
              <td style="text-align: right; padding: 10px;">${formatCurrency(totalCompensacao)}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <p>Estúdio - Super A Formaturas</p>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-500" />
            Relatórios
          </h1>
          <p className="text-slate-500 mt-1">Visualize e exporte relatórios do sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button 
          variant={activeTab === "dashboard" ? "default" : "outline"}
          onClick={() => setActiveTab("dashboard")}
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Dashboard
        </Button>
        {/* Aba Despesas ocultada - cards movidos para página Despesas */}
        {/* {podeVisualizarAba("despesas") && (
          <Button 
            variant={activeTab === "despesas" ? "default" : "outline"}
            onClick={() => setActiveTab("despesas")}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Despesas
          </Button>
        )} */}
        {podeVisualizarAba("emissao_nf") && (
          <Button 
            variant={activeTab === "nf" ? "default" : "outline"}
            onClick={() => setActiveTab("nf")}
            className="gap-2"
          >
            <Receipt className="h-4 w-4" />
            Emissão de Nota Fiscal
          </Button>
        )}
        {podeVisualizarAba("servicos_make_cabelo") && (
          <Button 
            variant={activeTab === "servicos" ? "default" : "outline"}
            onClick={() => setActiveTab("servicos")}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Serviços Make/Cabelo
          </Button>
        )}
        {podeVisualizarAba("execucao") && (
          <Button 
            variant={activeTab === "execucao" ? "default" : "outline"}
            onClick={() => setActiveTab("execucao")}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Execução
          </Button>
        )}
             {podeVisualizarAba("compensacao") && (
          <Button 
            variant={activeTab === "compensacao" ? "default" : "outline"}
            onClick={() => setActiveTab("compensacao")}
            className="gap-2"
          >
            <DollarSign className="h-4 w-4" />
            Compensação Bancária
          </Button>
        )}
        {podeVisualizarAba("vendas_excluidas") && (
          <Button 
            variant={activeTab === "vendas_excluidas" ? "default" : "outline"}
            onClick={() => setActiveTab("vendas_excluidas")}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Alterações de Vendas
          </Button>
        )}
        {/* Fechamentos Mensais movido para seção Financeiro */}
        {/* {podeVisualizarAba("fechamentos_mensais") && (
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/fechamentos-mensais'}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Fechamentos Mensais
          </Button>
        )} */}
        {podeVisualizarAba("observacoes") && (
          <Button 
            variant="outline"
            onClick={() => window.location.href = "/relatorios/observacoes"}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Observações
          </Button>
        )}
      </div>

      {/* Dashboard */}
      {activeTab === "dashboard" && <RelatoriosDashboard />}

      {/* Relatório de Despesas */}
      {activeTab === "despesas" && (
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-red-500" />
              Relatório de Despesas
            </CardTitle>
            <CardDescription>
              {filteredDespesas?.length || 0} despesas encontradas
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={exportarDespesasPDF}>
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportarDespesasExcel}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Filtros */}
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div className="col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por número CI, fornecedor ou turma..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="apto">Apto</SelectItem>
                  <SelectItem value="pendente_nf">Pendente NF</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={filterTipoDespesa} onValueChange={setFilterTipoDespesa}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="operacional">Operacional</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={filterPago} onValueChange={setFilterPago}>
                <SelectTrigger>
                  <SelectValue placeholder="Pagamento" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sim">Pago</SelectItem>
                  <SelectItem value="nao">Não Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Filtro de Período dos Eventos */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="col-span-2 flex items-center gap-2">
              <Label className="text-sm text-slate-600 whitespace-nowrap">Período dos Eventos:</Label>
              <Input
                type="date"
                value={filterPeriodoEventoInicio}
                onChange={(e) => setFilterPeriodoEventoInicio(e.target.value)}
                className="flex-1"
              />
              <span className="text-slate-400">até</span>
              <Input
                type="date"
                value={filterPeriodoEventoFim}
                onChange={(e) => setFilterPeriodoEventoFim(e.target.value)}
                className="flex-1"
              />
            </div>
            {(filterPeriodoEventoInicio || filterPeriodoEventoFim) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterPeriodoEventoInicio("");
                  setFilterPeriodoEventoFim("");
                }}
              >
                Limpar Período
              </Button>
            )}
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-xl font-bold text-slate-800">
                {(search || filterStatus !== "all" || filterTipoDespesa !== "all" || filterPago !== "all" || filterPeriodoEventoInicio || filterPeriodoEventoFim) 
                  ? formatCurrency(totalValor) 
                  : 'R$ 0,00'}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600">Pago</p>
              <p className="text-xl font-bold text-green-700">
                {(search || filterStatus !== "all" || filterTipoDespesa !== "all" || filterPago !== "all" || filterPeriodoEventoInicio || filterPeriodoEventoFim) 
                  ? formatCurrency(totalPago) 
                  : 'R$ 0,00'}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-red-600">Pendente</p>
              <p className="text-xl font-bold text-red-700">
                {(search || filterStatus !== "all" || filterTipoDespesa !== "all" || filterPago !== "all" || filterPeriodoEventoInicio || filterPeriodoEventoFim) 
                  ? formatCurrency(totalPendente) 
                  : 'R$ 0,00'}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                  <TableRow className="bg-white">
                    <TableHead>Data</TableHead>
                    <TableHead>Mês Serviço</TableHead>
                    <TableHead>Nº CI</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Tipo Evento</TableHead>
                    <TableHead>Data Realização</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Tipo Serviço</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Dados Pgto</TableHead>
                    <TableHead>Comprov. Fiscal</TableHead>
                    <TableHead>Data Limite</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Docs</TableHead>
                    <TableHead>Comprov.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDespesas?.map((despesa: any) => {
                    const fornecedor = fornecedores?.find((f: any) => f.id === despesa.fornecedorId);
                    // Turmas vinculadas para despesasV2 - Lógica copiada de DespesasV2.tsx
                    const turmasVinculadas = despesa.turmasVinculadas || [];
                    const turmasCodigos = turmasVinculadas.length === 0 ? "-" : turmasVinculadas.map((tv: any) => {
                      // tv.turma já vem do backend com dados completos
                      return tv.turma ? formatTurmaCompleta(tv.turma) : String(tv.turmaId);
                    }).join(", ");
                    // Tipos de evento das turmas vinculadas
                    const tiposEventoDisplay = turmasVinculadas.map((tv: any) => tv.tipoEvento || "").filter(Boolean).join(", ");
                    // Datas de realização
                    const datasRealizacao = despesa.datasRealizacao || [];
                    const datasDisplay = datasRealizacao.map((dr: any) => formatDate(dr.dataRealizacao)).join(", ");
                    
                    // Separar anexos por tipo
                    const anexosDocs = despesa.anexos?.filter((a: any) => a.tipoAnexo === 'documento') || [];
                    const anexosComprovante = despesa.anexos?.filter((a: any) => a.tipoAnexo === 'comprovante_fiscal' || a.tipoAnexo === 'comprovante_liquidacao') || [];
                    
                    return (
                      <TableRow key={despesa.id}>
                        {/* 1. Data (Data do Lançamento) */}
                        <TableCell>{formatDate(despesa.createdAt)}</TableCell>
                        {/* 2. Mês do Serviço */}
                        <TableCell className="capitalize">{despesa.mesServico || "-"}</TableCell>
                        {/* 3. Número da CI */}
                        <TableCell className="font-mono font-medium">{despesa.numeroCi}</TableCell>
                        {/* 4. Turma (Administrativo se for administrativa) */}
                        <TableCell>{despesa.tipoDespesa === "administrativa" ? "Administrativo" : turmasCodigos || "-"}</TableCell>
                        {/* 5. Tipo de Evento */}
                        <TableCell>{despesa.tipoDespesa === "administrativa" ? "-" : tiposEventoDisplay || "-"}</TableCell>
                        {/* 6. Data de Realização */}
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            {datasDisplay ? datasDisplay.split(", ").map((d: string, i: number) => (
                              <span key={i}>{d}</span>
                            )) : "-"}
                          </div>
                        </TableCell>
                        {/* 7. Fornecedor */}
                        <TableCell>{fornecedor?.nome || "-"}</TableCell>
                        {/* 8. Tipo de Serviço/Compra */}
                        <TableCell>{despesa.tipoServicoCompra || "-"}</TableCell>
                        {/* 9. Valor total */}
                        <TableCell className="font-medium text-green-600">{formatCurrency(despesa.valorTotal)}</TableCell>
                        {/* 10. Dados para Pagamento */}
                        <TableCell className="text-xs max-w-[200px] break-words">
                          <div className="whitespace-normal">{despesa.dadosPagamento || "-"}</div>
                        </TableCell>
                        {/* 11. Tipo de comprovante fiscal */}
                        <TableCell className="text-xs">
                          <div className="whitespace-normal">{despesa.tipoComprovanteFiscal?.replace("_", " ") || "-"}</div>
                        </TableCell>
                        {/* 12. Data limite para pagamento */}
                        <TableCell>{formatDate(despesa.dataLimitePagamento)}</TableCell>
                        {/* 13. Status */}
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[despesa.status] || "bg-gray-100 text-gray-700"}`}>
                            {STATUS_LABELS[despesa.status] || despesa.status}
                          </span>
                        </TableCell>
                        {/* 14. Documentos */}
                        <TableCell>
                          {anexosDocs.length > 0 ? (
                            <div className="flex items-center gap-1">
                              {anexosDocs.map((anexo: any, idx: number) => (
                                <a
                                  key={idx}
                                  href={anexo.urlArquivo || anexo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-slate-100 rounded text-blue-600"
                                  title="Ver documento"
                                >
                                  <Eye className="h-4 w-4" />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </TableCell>
                        {/* 15. Comprovante Fiscal */}
                        <TableCell>
                          {anexosComprovante.length > 0 ? (
                            <div className="flex items-center gap-1">
                              {anexosComprovante.map((anexo: any, idx: number) => (
                                <a
                                  key={idx}
                                  href={anexo.urlArquivo || anexo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-slate-100 rounded text-blue-600"
                                  title="Ver comprovante"
                                >
                                  <Eye className="h-4 w-4" />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!filteredDespesas || filteredDespesas.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center py-8 text-slate-500">
                        Nenhuma despesa encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Relatório de Emissão de Nota Fiscal */}
      {activeTab === "nf" && (
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5 text-emerald-500" />
              Relatório de Emissão de Nota Fiscal
            </CardTitle>
            <CardDescription>
              Vendas para emissão de nota fiscal
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={exportarNFExcel}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportarNFPDF}>
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Boxes de Totalizadores */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-600 mb-1">Valor Total</p>
                    <p className="text-3xl font-bold text-emerald-700">
                      {(searchNF || filterPeriodoInicio || filterPeriodoFim) ? formatCurrency(totalVendas) : 'R$ 0,00'}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Receipt className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 mb-1">Total de Ajustes</p>
                    <p className="text-3xl font-bold text-blue-700">
                      {(searchNF || filterPeriodoInicio || filterPeriodoFim) ? formatCurrency(totalAjustesNF) : 'R$ 0,00'}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por formando ou turma..."
                value={searchNF}
                onChange={(e) => setSearchNF(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <Input
                type="date"
                placeholder="Data Início"
                value={filterPeriodoInicio}
                onChange={(e) => setFilterPeriodoInicio(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="date"
                placeholder="Data Fim"
                value={filterPeriodoFim}
                onChange={(e) => setFilterPeriodoFim(e.target.value)}
              />
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                <TableRow className="bg-white">
                  <TableHead>Nome Formando</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Data Venda</TableHead>
                  <TableHead>Ajuste</TableHead>
                  <TableHead>Justificativa</TableHead>
                  <TableHead>Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendas.map((venda: any) => {
                  const evento = eventos?.find((e: any) => e.id === venda.eventoId);
                  const tipoEvento = evento ? tiposEvento?.find((t: any) => t.codigo === evento.tipoEvento) : null;
                  
                  // Calcular ajuste total e justificativas dos itens
                  const ajusteTotal = venda.itens?.reduce((sum: number, item: any) => sum + (item.ajusteValor || 0), 0) || 0;
                  const justificativas = venda.itens?.filter((item: any) => item.justificativa).map((item: any) => item.justificativa).join('; ') || '-';
                  
                  return (
                    <TableRow key={venda.id}>
                      <TableCell className="font-medium">{venda.formandoNome || "-"}</TableCell>
                      <TableCell className="text-xs text-slate-500">{venda.formandoCpf || "-"}</TableCell>
                      <TableCell className="text-xs text-slate-500">{venda.formandoEmail || "-"}</TableCell>
                      <TableCell className="text-xs">{formatTurmaVenda(venda)}</TableCell>
                      <TableCell>
                        {tipoEvento?.nome || evento?.tipoEvento?.replace(/_/g, " ") || "-"}
                        {evento?.dataEvento && (
                          <span className="text-xs text-slate-500 ml-2">
                            ({formatDate(evento.dataEvento)})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(venda.dataVenda)}</TableCell>
                      <TableCell className={ajusteTotal !== 0 ? (ajusteTotal > 0 ? 'text-emerald-600' : 'text-red-600') : 'text-slate-400'}>
                        {ajusteTotal !== 0 ? formatCurrency(ajusteTotal) : '-'}
                      </TableCell>
                      <TableCell className="text-xs whitespace-normal break-words" title={justificativas !== '-' ? justificativas : undefined}>
                        {justificativas}
                      </TableCell>
                      <TableCell className="font-medium text-emerald-600">
                        {formatCurrency(venda.valorTotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredVendas.length > 0 && (
                  <TableRow className="bg-emerald-50 font-bold">
                    <TableCell colSpan={8} className="text-right">TOTAL</TableCell>
                    <TableCell className="text-emerald-700">
                      {formatCurrency(totalVendas)}
                    </TableCell>
                  </TableRow>
                )}
                {filteredVendas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                      Nenhuma venda encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Relatório de Serviços Make/Cabelo */}
      {activeTab === "servicos" && (
        <div className="space-y-6">
          {/* Filtros */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5 text-slate-500" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Buscar Turma</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Buscar turma..."
                      value={searchTurmaServicos}
                      onChange={(e) => setSearchTurmaServicos(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Data Início</Label>
                  <Input
                    type="date"
                    value={filterPeriodoInicioServicos}
                    onChange={(e) => setFilterPeriodoInicioServicos(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Data Fim</Label>
                  <Input
                    type="date"
                    value={filterPeriodoFimServicos}
                    onChange={(e) => setFilterPeriodoFimServicos(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFilterTurmaServicos("all");
                      setFilterPeriodoInicioServicos("");
                      setFilterPeriodoFimServicos("");
                    }}
                    className="gap-2"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumo por Maquiadora */}
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-pink-500" />
                  Resumo por Maquiadora
                </CardTitle>
                <CardDescription>
                  Balanço de valores a pagar e receber por fornecedora
                </CardDescription>
              </div>
              <Button variant="outline" className="gap-2" onClick={exportarMaquiagemExcel}>
                <FileSpreadsheet className="h-4 w-4" />
                Exportar Excel
              </Button>
            </CardHeader>
            <CardContent>
              {loadingMaquiagem ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                    <TableRow className="bg-white">
                      <TableHead>Maquiadora</TableHead>
                      <TableHead className="text-center">Qtd Make Formando</TableHead>
                      <TableHead className="text-center">Qtd Make Família</TableHead>
                      <TableHead className="text-right">A Pagar (Make Formando)</TableHead>
                      <TableHead className="text-right">A Receber (Make Família)</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorioMaquiagem?.resumoPorFornecedor?.filter((resumo: any) => {
                      if (!searchTurmaServicos) return true;
                      // Filtrar por nome da maquiadora
                      return (resumo.fornecedorNome || '').toLowerCase().includes(searchTurmaServicos.toLowerCase());
                    }).map((resumo: any) => (
                      <TableRow key={resumo.fornecedorId}>
                        <TableCell className="font-medium">{resumo.fornecedorNome}</TableCell>
                        <TableCell className="text-center">{resumo.qtdMakeFormando}</TableCell>
                        <TableCell className="text-center">{resumo.qtdMakeFamilia}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(resumo.totalPagar)}
                        </TableCell>
                        <TableCell className="text-right text-emerald-600">
                          {formatCurrency(resumo.totalReceber)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${
                          resumo.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {resumo.saldo >= 0 ? '+' : ''}{formatCurrency(resumo.saldo)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!relatorioMaquiagem?.resumoPorFornecedor || relatorioMaquiagem.resumoPorFornecedor.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                          Nenhum serviço de maquiagem encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
              
              {/* Totais */}
              {relatorioMaquiagem?.resumoPorFornecedor && relatorioMaquiagem.resumoPorFornecedor.length > 0 && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-slate-500">Total a Pagar</p>
                      <p className="text-xl font-bold text-red-600">
                        {formatCurrency(relatorioMaquiagem.resumoPorFornecedor.reduce((acc: number, r: any) => acc + r.totalPagar, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Total a Receber</p>
                      <p className="text-xl font-bold text-emerald-600">
                        {formatCurrency(relatorioMaquiagem.resumoPorFornecedor.reduce((acc: number, r: any) => acc + r.totalReceber, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Saldo Total</p>
                      <p className={`text-xl font-bold ${
                        relatorioMaquiagem.resumoPorFornecedor.reduce((acc: number, r: any) => acc + r.saldo, 0) >= 0 
                          ? 'text-emerald-600' 
                          : 'text-red-600'
                      }`}>
                        {formatCurrency(relatorioMaquiagem.resumoPorFornecedor.reduce((acc: number, r: any) => acc + r.saldo, 0))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Relatório de Cabelo */}
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Scissors className="h-5 w-5 text-amber-500" />
                  Comissões de Cabelo
                </CardTitle>
                <CardDescription>
                  Comissões a receber (20% do valor do serviço)
                </CardDescription>
              </div>
              <Button variant="outline" className="gap-2" onClick={exportarCabeloExcel}>
                <FileSpreadsheet className="h-4 w-4" />
                Exportar Excel
              </Button>
            </CardHeader>
            <CardContent>
              {loadingCabelo ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto max-h-[500px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                        <TableRow className="bg-white">
                        <TableHead>Formando</TableHead>
                        <TableHead>Turma</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Cabeleireira</TableHead>
                        <TableHead className="text-right">Valor Serviço</TableHead>
                        <TableHead className="text-right">Comissão (20%)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                      {relatorioCabelo?.servicos?.filter((servico: any) => {
                        if (!searchTurmaServicos) return true;
                        const turmaCompleta = formatTurmaCompleta(servico);
                        return turmaCompleta.toLowerCase().includes(searchTurmaServicos.toLowerCase()) ||
                               (servico.formandoNome || '').toLowerCase().includes(searchTurmaServicos.toLowerCase());
                      }).map((servico: any) => (
                        <TableRow key={servico.id}>
                          <TableCell className="font-medium">{servico.formandoNome || '-'}</TableCell>
                          <TableCell className="whitespace-normal break-words" title={formatTurmaCompleta(servico)}>{formatTurmaCompleta(servico)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              servico.tipoServico === 'cabelo_simples' 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {servico.tipoServico === 'cabelo_simples' ? 'Simples' : 'Combinado'}
                            </span>
                          </TableCell>
                          <TableCell>{servico.fornecedorNome || '-'}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(servico.valorTotal || 0)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 font-medium">
                            {formatCurrency((servico.valorTotal || 0) * 0.2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!relatorioCabelo?.servicos || relatorioCabelo.servicos.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                            Nenhum serviço de cabelo encontrado
                          </TableCell>
                        </TableRow>
                      )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Total de Comissões */}
                  {relatorioCabelo?.servicos && relatorioCabelo.servicos.length > 0 && (
                    <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-emerald-700">Total de Comissões a Receber</p>
                        <p className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(relatorioCabelo.totalComissao || 0)}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Detalhes dos Serviços de Make */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-purple-500" />
                Detalhes dos Serviços de Make
              </CardTitle>
              <CardDescription>
                Lista completa de serviços de maquiagem registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[400px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                    <TableRow className="bg-white">
                      <TableHead>Formando</TableHead>
                      <TableHead>Turma</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Tipo Make</TableHead>
                      <TableHead>Maquiadora</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Fluxo</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorioMaquiagem?.servicos?.filter((servico: any) => {
                      if (!searchTurmaServicos) return true;
                      const turmaCompleta = formatTurmaCompleta(servico);
                      return turmaCompleta.toLowerCase().includes(searchTurmaServicos.toLowerCase()) ||
                             (servico.formandoNome || '').toLowerCase().includes(searchTurmaServicos.toLowerCase());
                    }).map((servico: any) => (
                      <TableRow key={servico.id}>
                        <TableCell className="font-medium">{servico.formandoNome || '-'}</TableCell>
                        <TableCell className="whitespace-normal break-words" title={formatTurmaCompleta(servico)}>{formatTurmaCompleta(servico)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            servico.tipoServico === 'make_formando' 
                              ? 'bg-pink-100 text-pink-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {servico.tipoServico === 'make_formando' ? 'Formando' : 'Família'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {servico.tipoMake ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              servico.tipoMake === 'masc' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                              {servico.tipoMake === 'masc' ? 'Masc.' : 'Fem.'}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{servico.fornecedorNome || '-'}</TableCell>
                        <TableCell className="text-center">{servico.quantidade}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(servico.valorTotal || 0)}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            servico.fluxo === 'pagar' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {servico.fluxo === 'pagar' ? 'Super A Paga' : 'Super A Recebe'}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(servico.dataRealizacao)}</TableCell>
                      </TableRow>
                    ))}
                    {(!relatorioMaquiagem?.servicos || relatorioMaquiagem.servicos.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                          Nenhum serviço de maquiagem encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Relatório de Execução */}
      {activeTab === "execucao" && (
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-blue-500" />
                Relatório de Execução
              </CardTitle>
              <CardDescription>
                Visualize as execuções de fotos e serviços por evento
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Filtros */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Turma</Label>
                <Popover open={openTurmaCombobox} onOpenChange={setOpenTurmaCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openTurmaCombobox}
                      className="w-full justify-between h-9 font-normal"
                    >
                      {filterTurmaExecucao === "all" ? (
                        "Todas as Turmas"
                      ) : (
                        (() => {
                          const t = turmas?.find((turma: any) => turma.id.toString() === filterTurmaExecucao);
                          if (!t) return "Selecione a turma";
                          const codigo = t.codigo || '';
                          const cursos = parseJsonArray(t.cursos).join(', ');
                          const instituicoes = parseJsonArray(t.instituicoes).join(', ');
                          const numero = t.numeroTurma || '';
                          const anos = parseJsonArray(t.anos).join(', ');
                          const periodos = parseJsonArray(t.periodos).join(', ');
                          let turmaStr = codigo;
                          if (cursos) turmaStr += ` - ${cursos}`;
                          if (instituicoes) turmaStr += ` ${instituicoes}`;
                          if (numero) turmaStr += ` ${numero}`;
                          if (anos && periodos) turmaStr += ` ${anos}.${periodos}`;
                          return turmaStr;
                        })()
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar turma..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma turma encontrada.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setFilterTurmaExecucao("all");
                              setFilterEventoExecucao("all");
                              setOpenTurmaCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filterTurmaExecucao === "all" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Todas as Turmas
                          </CommandItem>
                          {turmas?.map((t: any) => {
                            const codigo = t.codigo || '';
                            const cursos = parseJsonArray(t.cursos).join(', ');
                            const instituicoes = parseJsonArray(t.instituicoes).join(', ');
                            const numero = t.numeroTurma || '';
                            const anos = parseJsonArray(t.anos).join(', ');
                            const periodos = parseJsonArray(t.periodos).join(', ');
                            let turmaStr = codigo;
                            if (cursos) turmaStr += ` - ${cursos}`;
                            if (instituicoes) turmaStr += ` ${instituicoes}`;
                            if (numero) turmaStr += ` ${numero}`;
                            if (anos && periodos) turmaStr += ` ${anos}.${periodos}`;
                            return (
                              <CommandItem
                                key={t.id}
                                value={turmaStr}
                                onSelect={() => {
                                  setFilterTurmaExecucao(t.id.toString());
                                  setFilterEventoExecucao("all");
                                  setOpenTurmaCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    filterTurmaExecucao === t.id.toString() ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {turmaStr}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Evento</Label>
                <Select 
                  value={filterEventoExecucao} 
                  onValueChange={setFilterEventoExecucao}
                  disabled={filterTurmaExecucao === "all"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o evento" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="all">Todos os Eventos</SelectItem>
                    {eventos?.filter((e: any) => filterTurmaExecucao === "all" || e.turmaId?.toString() === filterTurmaExecucao)
                      .map((e: any) => {
                        const tipoEvento = tiposEvento?.find((t: any) => t.id === e.tipoEventoId);
                        const nomeEvento = tipoEvento?.nome || formatTipoEvento(e.tipoEvento || "");
                        return (
                          <SelectItem key={e.id} value={e.id.toString()}>
                            {nomeEvento} - {formatDate(e.dataEvento)}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Label className="text-xs text-slate-500 mb-1 block">Buscar</Label>
                <Search className="absolute left-3 top-[calc(50%+4px)] transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por formando..."
                  value={searchExecucao}
                  onChange={(e) => setSearchExecucao(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Observações</Label>
                <Select value={filterComObservacoes} onValueChange={setFilterComObservacoes}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar observações" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="com">Com Observações</SelectItem>
                    <SelectItem value="sem">Sem Observações</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filterEventoExecucao === "all" ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>Selecione uma turma e um evento para visualizar as execuções</p>
              </div>
            ) : loadingExecucoes ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                    <TableRow className="bg-white">
                      <TableHead>Formando</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Execução</TableHead>
                      <TableHead>Arquivo</TableHead>
                      <TableHead className="max-w-[300px]">Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {execucoesFormando
                      ?.filter((exec: any) => {
                        const matchesSearch = !searchExecucao || 
                          exec.formandoNome?.toLowerCase().includes(searchExecucao.toLowerCase());
                        const matchesObs = filterComObservacoes === "all" ||
                          (filterComObservacoes === "com" && exec.observacoes) ||
                          (filterComObservacoes === "sem" && !exec.observacoes);
                        return matchesSearch && matchesObs;
                      })
                      .map((exec: any) => (
                        <TableRow key={exec.id}>
                          <TableCell className="font-medium">{exec.formandoNome || '-'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              exec.status === 'apto' ? 'bg-green-100 text-green-700' :
                              exec.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {exec.status === 'apto' ? 'Apto' : exec.status === 'pendente' ? 'Pendente' : exec.status || '-'}
                            </span>
                          </TableCell>
                          <TableCell>{exec.dataExecucao ? formatDate(exec.dataExecucao) : '-'}</TableCell>
                          <TableCell>
                            {exec.arquivoEntregue ? (
                              <span className="text-green-600 text-sm">Sim</span>
                            ) : (
                              <span className="text-slate-400 text-sm">Não</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            {exec.observacoes ? (
                              <p className="text-sm text-slate-600 whitespace-normal break-words" title={exec.observacoes}>
                                {exec.observacoes}
                              </p>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    {(!execucoesFormando || execucoesFormando.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                          Nenhuma execução encontrada para este evento
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Relatório de Compensação Bancária */}
      {activeTab === "compensacao" && (
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-green-500" />
                Relatório de Compensação Bancária
              </CardTitle>
              <CardDescription>
                {filteredCompensacao.length} pagamento(s) encontrado(s) | Total: {formatCurrency(totalCompensacao)}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportarCompensacaoPDF}
                className="gap-2"
                disabled={!filteredCompensacao || filteredCompensacao.length === 0}
              >
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportarCompensacaoExcel}
                className="gap-2"
                disabled={!filteredCompensacao || filteredCompensacao.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Box de Valor Total Líquido */}
            <div className="grid grid-cols-1 mb-6">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 mb-1">Valor Total Líquido</p>
                      <p className="text-3xl font-bold text-green-700">
                        {filteredCompensacao.length > 0 ? formatCurrency(totalCompensacao) : 'R$ 0,00'}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <Label htmlFor="searchCompensacao" className="text-sm font-medium mb-2 block">
                  <Search className="h-4 w-4 inline mr-1" />
                  Buscar Formando ou Turma
                </Label>
                <Input
                  id="searchCompensacao"
                  placeholder="Nome do formando ou turma..."
                  value={searchCompensacao}
                  onChange={(e) => setSearchCompensacao(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <Label htmlFor="filterTipoPagamento" className="text-sm font-medium mb-2 block">
                  <Filter className="h-4 w-4 inline mr-1" />
                  Tipo de Pagamento
                </Label>
                <Select value={filterTipoPagamento} onValueChange={setFilterTipoPagamento}>
                  <SelectTrigger id="filterTipoPagamento">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="incluso_pacote">Incluso no Pacote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="filterPeriodoInicioCompensacao" className="text-sm font-medium mb-2 block">
                  Período de Venda (Início)
                </Label>
                <Input
                  id="filterPeriodoInicioCompensacao"
                  type="date"
                  value={filterPeriodoInicioCompensacao}
                  onChange={(e) => setFilterPeriodoInicioCompensacao(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <Label htmlFor="filterPeriodoFimCompensacao" className="text-sm font-medium mb-2 block">
                  Período de Venda (Fim)
                </Label>
                <Input
                  id="filterPeriodoFimCompensacao"
                  type="date"
                  value={filterPeriodoFimCompensacao}
                  onChange={(e) => setFilterPeriodoFimCompensacao(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            {loadingCompensacao ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] relative">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortCompensacao('nome')}
                      >
                        <div className="flex items-center gap-1">
                          Nome do Formando
                          {sortColumnCompensacao === 'nome' && (
                            sortDirectionCompensacao === 'asc' ? 
                              <ChevronUp className="h-4 w-4" /> : 
                              <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Turma</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortCompensacao('dataVenda')}
                      >
                        <div className="flex items-center gap-1">
                          Data da Venda
                          {sortColumnCompensacao === 'dataVenda' && (
                            sortDirectionCompensacao === 'asc' ? 
                              <ChevronUp className="h-4 w-4" /> : 
                              <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Tipo Pagamento</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortCompensacao('dataCompensacao')}
                      >
                        <div className="flex items-center gap-1">
                          Data da Compensação
                          {sortColumnCompensacao === 'dataCompensacao' && (
                            sortDirectionCompensacao === 'asc' ? 
                              <ChevronUp className="h-4 w-4" /> : 
                              <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortCompensacao('valor')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Valor Líquido
                          {sortColumnCompensacao === 'valor' && (
                            sortDirectionCompensacao === 'asc' ? 
                              <ChevronUp className="h-4 w-4" /> : 
                              <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {sortedCompensacao && sortedCompensacao.length > 0 ?
                       sortedCompensacao.map((item: any, index: number) => {
                         // Formatar turma completa
                         const turmaFormatada = formatTurmaCompleta({
                           turmaCodigo: item.turmaCodigo,
                           turmaCursos: item.turmaCursos,
                           turmaInstituicoes: item.turmaInstituicoes,
                           turmaNumero: item.turmaNumero,
                           turmaAno: item.turmaAno,
                           turmaPeriodo: item.turmaPeriodo
                         });
                         
                         return (
                           <TableRow key={index}>
                             <TableCell className="font-medium">{item.formandoNome}</TableCell>
                             <TableCell>{turmaFormatada}</TableCell>
                            <TableCell>{formatTipoEvento(item.eventoTipo || '')}</TableCell>
                            <TableCell>{formatDate(item.dataVenda)}</TableCell>
                            <TableCell>
                              <span className="capitalize">
                                {item.pagamentoTipo === 'credito' && `Crédito${item.pagamentoBandeira ? ` - ${item.pagamentoBandeira}` : ''}${item.pagamentoParcelas > 1 ? ` (${item.pagamentoParcelas}x)` : ''}`}
                                {item.pagamentoTipo === 'debito' && `Débito${item.pagamentoBandeira ? ` - ${item.pagamentoBandeira}` : ''}`}
                                {item.pagamentoTipo === 'pix' && 'PIX'}
                                {item.pagamentoTipo === 'dinheiro' && 'Dinheiro'}
                                {item.pagamentoTipo === 'incluso_pacote' && 'Incluso no Pacote'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold">{formatDate(item.dataCompensacao)}</span>
                                {(() => {
                                  const status = getStatusCompensacao(item.dataCompensacao);
                                  return (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${status.color}`}>
                                      {status.label}
                                    </span>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              {formatCurrency(item.valorLiquido || 0)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          Nenhum pagamento encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Relatório de Vendas Excluídas */}
      {activeTab === "vendas_excluidas" && (
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-500" />
                Vendas Manipuladas
              </CardTitle>
              <CardDescription>Histórico de vendas excluídas e editadas</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <VendasExcluidasTab />
          </CardContent>
        </Card>
      )}

    </div>
  );
}
