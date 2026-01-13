import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { LOGO_BASE64 } from "@/lib/logo";
import { formatTurmaVenda } from "@/lib/formatTurma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingCart, Search, Eye, DollarSign, Calendar, FileSpreadsheet, FileText, ArrowUpDown, Filter, X } from "lucide-react";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR");
}

// Função movida para @/lib/formatTurma.ts
// Usar formatTurmaVenda(venda) para formatar dados de turmas

function formatTipoPagamento(pagamentos: any[]): string {
  if (!pagamentos || pagamentos.length === 0) return "-";
  
  return pagamentos.map(pag => {
    if (pag.tipo === "credito") {
      return `Crédito ${pag.parcelas}x ${pag.bandeira || ""}`.trim();
    } else if (pag.tipo === "debito") {
      return `Débito ${pag.bandeira || ""}`.trim();
    } else if (pag.tipo === "pix") {
      return "PIX";
    } else {
      return "Dinheiro";
    }
  }).join(", ");
}

function getDataCompensacao(pagamentos: any[], dataVenda?: Date | string): string {
  if (!pagamentos || pagamentos.length === 0) return "-";
  
  // Pegar a maior data de compensação
  const datas = pagamentos
    .filter(p => p.dataCompensacao)
    .map(p => new Date(p.dataCompensacao));
  
  if (datas.length === 0) {
    // Se não tem data de compensação, apenas dinheiro é mesmo dia
    const temDinheiro = pagamentos.some(p => p.tipo === "dinheiro");
    if (temDinheiro) {
      return dataVenda ? formatDate(dataVenda) : formatDate(new Date());
    }
    return "-";
  }
  
  const maiorData = new Date(Math.max(...datas.map(d => d.getTime())));
  return formatDate(maiorData);
}

function getCvNsu(pagamentos: any[]): string {
  if (!pagamentos || pagamentos.length === 0) return "-";
  
  const cvNsus = pagamentos
    .filter(p => p.cvNsu)
    .map(p => p.cvNsu);
  
  return cvNsus.length > 0 ? cvNsus.join(", ") : "-";
}

const STATUS_VENDA = [
  { value: "pendente", label: "Pendente", color: "bg-amber-100 text-amber-700" },
  { value: "pago", label: "Pago", color: "bg-emerald-100 text-emerald-700" },
  { value: "cancelada", label: "Cancelada", color: "bg-red-100 text-red-700" },
  { value: "excluido", label: "Excluído", color: "bg-slate-100 text-slate-700" },
];

const TIPOS_PAGAMENTO_FILTRO = [
  { value: "", label: "Todos" },
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "credito_1x", label: "Crédito 1x" },
  { value: "credito_2x", label: "Crédito 2x" },
  { value: "credito_3x", label: "Crédito 3x" },
  { value: "credito_4x", label: "Crédito 4x" },
];

type SortDirection = 'asc' | 'desc' | null;
type SortConfig = { column: string; direction: SortDirection };

export default function Vendas() {
  const [search, setSearch] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroTipoPagamento, setFiltroTipoPagamento] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'dataVenda', direction: 'desc' });
  const [showDetalhes, setShowDetalhes] = useState<any>(null);

  const { data: vendas, isLoading } = trpc.vendas.list.useQuery();

  const getStatusBadge = (status: string | null, excluido?: boolean) => {
    // Se está excluído, sempre mostrar tag Excluído
    if (excluido) {
      const s = STATUS_VENDA.find((st) => st.value === "excluido");
      return <Badge className={`${s!.color} hover:${s!.color}`}>{s!.label}</Badge>;
    }
    
    const s = STATUS_VENDA.find((st) => st.value === status);
    return s ? (
      <Badge className={`${s.color} hover:${s.color}`}>{s.label}</Badge>
    ) : (
      <Badge variant="outline">-</Badge>
    );
  };

  // Função para alternar ordenação
  const toggleSort = (column: string) => {
    if (sortConfig.column !== column) {
      setSortConfig({ column, direction: 'asc' });
    } else if (sortConfig.direction === 'asc') {
      setSortConfig({ column, direction: 'desc' });
    } else if (sortConfig.direction === 'desc') {
      setSortConfig({ column: '', direction: null });
    } else {
      setSortConfig({ column, direction: 'asc' });
    }
  };

  // Filtrar e ordenar vendas
  const vendasFiltradas = useMemo(() => {
    if (!vendas) return [];
    
    let resultado = vendas.filter((v: any) => {
      // Filtro de busca (formando ou turma)
      const searchLower = search.toLowerCase();
      const matchSearch = !search || 
        (v.formandoNome?.toLowerCase().includes(searchLower)) ||
        (v.turmaCodigo?.toLowerCase().includes(searchLower)) ||
        formatTurmaVenda(v).toLowerCase().includes(searchLower);
      
      // Filtro de período
      const dataVenda = new Date(v.dataVenda);
      const matchDataInicio = !filtroDataInicio || dataVenda >= new Date(filtroDataInicio);
      const matchDataFim = !filtroDataFim || dataVenda <= new Date(filtroDataFim + 'T23:59:59');
      
      // Filtro de tipo de pagamento
      let matchTipoPagamento = true;
      if (filtroTipoPagamento && v.pagamentos) {
        if (filtroTipoPagamento.startsWith('credito_')) {
          const parcelas = parseInt(filtroTipoPagamento.split('_')[1]);
          matchTipoPagamento = v.pagamentos.some((p: any) => 
            p.tipo === 'credito' && p.parcelas === parcelas
          );
        } else {
          matchTipoPagamento = v.pagamentos.some((p: any) => 
            p.tipo === filtroTipoPagamento
          );
        }
      }
      
      return matchSearch && matchDataInicio && matchDataFim && matchTipoPagamento;
    });
    
    // Ordenar
    if (sortConfig.column && sortConfig.direction) {
      resultado = [...resultado].sort((a: any, b: any) => {
        let aVal, bVal;
        
        switch (sortConfig.column) {
          case 'dataVenda':
            aVal = new Date(a.dataVenda).getTime();
            bVal = new Date(b.dataVenda).getTime();
            break;
          case 'formando':
            aVal = a.formandoNome || '';
            bVal = b.formandoNome || '';
            break;
          case 'turma':
            aVal = formatTurmaVenda(a);
            bVal = formatTurmaVenda(b);
            break;
          case 'valorBruto':
            aVal = a.valorTotal;
            bVal = b.valorTotal;
            break;
          case 'valorLiquido':
            aVal = a.valorLiquido || a.valorTotal;
            bVal = b.valorLiquido || b.valorTotal;
            break;
          default:
            return 0;
        }
        
        if (typeof aVal === 'string') {
          return sortConfig.direction === 'asc' 
            ? aVal.localeCompare(bVal) 
            : bVal.localeCompare(aVal);
        }
        
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    
    return resultado;
  }, [vendas, search, filtroDataInicio, filtroDataFim, filtroTipoPagamento, sortConfig]);

  // Calcular totais (excluindo vendas excluídas)
  const totais = vendasFiltradas?.reduce(
    (acc: any, v: any) => {
      if (v.status === "pago" && !v.excluido) {
        acc.totalVendas += v.valorTotal;
        acc.totalLiquido += v.valorLiquido || v.valorTotal;
        acc.quantidade++;
      }
      return acc;
    },
    { totalVendas: 0, totalLiquido: 0, quantidade: 0 }
  );

  // Exportar para Excel
  const handleExportExcel = () => {
    if (!vendasFiltradas || vendasFiltradas.length === 0) return;
    
    const headers = ["Data", "Turma", "Formando", "Tipo Pagamento", "CV/NSU", "Valor Bruto", "Valor Líquido", "Data Compensação", "Status"];
    
    // Gerar linhas (uma por pagamento quando há múltiplos)
    const rows: string[][] = [];
    vendasFiltradas.forEach((v: any) => {
      const pagamentos = v.pagamentos || [];
      if (pagamentos.length <= 1) {
        const pag = pagamentos[0];
        rows.push([
          formatDate(v.dataVenda),
          formatTurmaVenda(v),
          v.formandoNome || "-",
          formatTipoPagamento(pagamentos),
          pag?.cvNsu || "-",
          ((pag?.valor || v.valorTotal) / 100).toFixed(2).replace('.', ','),
          ((pag?.valorLiquido || pag?.valor || v.valorTotal) / 100).toFixed(2).replace('.', ','),
             pag.dataCompensacao ? formatDate(pag.dataCompensacao) : (pag.tipo === "dinheiro") ? formatDate(v.dataVenda) : "-",
          v.status || "-"
        ]);
      } else {
        pagamentos.forEach((pag: any, index: number) => {
          const tipoPag = pag.tipo === "credito" ? `Crédito ${pag.parcelas}x ${pag.bandeira || ""}`.trim() :
                         pag.tipo === "debito" ? `Débito ${pag.bandeira || ""}`.trim() :
                         pag.tipo === "pix" ? "PIX" : "Dinheiro";
          rows.push([
            index === 0 ? formatDate(v.dataVenda) : "",
            index === 0 ? formatTurmaVenda(v) : "",
            index === 0 ? (v.formandoNome || "-") : "",
            tipoPag,
            pag.cvNsu || "-",
            (pag.valor / 100).toFixed(2).replace('.', ','),
            ((pag.valorLiquido || pag.valor) / 100).toFixed(2).replace('.', ','),
            pag.dataCompensacao ? formatDate(pag.dataCompensacao) : (pag.tipo === "dinheiro") ? formatDate(v.dataVenda) : "-",
            index === 0 ? (v.status || "-") : ""
          ]);
        });
      }
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Exportar para PDF
  const handleExportPDF = async () => {
    if (!vendasFiltradas || vendasFiltradas.length === 0) return;
    
    // Gerar linhas do PDF (uma linha por pagamento quando há múltiplos)
    const gerarLinhasPDF = () => {
      let linhas = '';
      let totalBruto = 0;
      let totalLiquido = 0;
      let totalVendas = 0;
      
      vendasFiltradas.forEach((v: any) => {
        const pagamentos = v.pagamentos || [];
        
        if (pagamentos.length <= 1) {
          const pag = pagamentos[0];
          const valorBruto = pag?.valor || v.valorTotal;
          const valorLiquido = pag?.valorLiquido || pag?.valor || v.valorTotal;
          totalBruto += valorBruto;
          totalLiquido += valorLiquido;
          totalVendas++;
          
          const dataComp = pag?.dataCompensacao ? formatDate(pag.dataCompensacao) : 
                          (pag?.tipo === 'dinheiro') ? formatDate(v.dataVenda) : '-';
          
          linhas += `
            <tr>
              <td>${formatDate(v.dataVenda)}</td>
              <td>${formatTurmaVenda(v)}</td>
              <td>${v.formandoNome || '-'}</td>
              <td>${formatTipoPagamento(pagamentos)}</td>
              <td>${pag?.cvNsu || '-'}</td>
              <td class="text-right">${formatCurrency(valorBruto)}</td>
              <td class="text-right">${formatCurrency(valorLiquido)}</td>
              <td>${dataComp}</td>
              <td class="status-${v.status}">${v.status || '-'}</td>
            </tr>
          `;
        } else {
          pagamentos.forEach((pag: any, index: number) => {
            totalBruto += pag.valor;
            totalLiquido += pag.valorLiquido || pag.valor;
            if (index === 0) totalVendas++;
            
            const tipoPag = pag.tipo === 'credito' ? `Crédito ${pag.parcelas}x ${pag.bandeira || ''}`.trim() :
                           pag.tipo === 'debito' ? `Débito ${pag.bandeira || ''}`.trim() :
                           pag.tipo === 'pix' ? 'PIX' : 'Dinheiro';
            
            const dataComp = pag.dataCompensacao ? formatDate(pag.dataCompensacao) : 
                            (pag.tipo === 'dinheiro') ? formatDate(v.dataVenda) : '-';
            
            linhas += `
              <tr>
                <td>${index === 0 ? formatDate(v.dataVenda) : ''}</td>
                <td>${index === 0 ? formatTurmaVenda(v) : ''}</td>
                <td>${index === 0 ? (v.formandoNome || '-') : ''}</td>
                <td>${tipoPag}</td>
                <td>${pag.cvNsu || '-'}</td>
                <td class="text-right">${formatCurrency(pag.valor)}</td>
                <td class="text-right">${formatCurrency(pag.valorLiquido || pag.valor)}</td>
                <td>${dataComp}</td>
                <td class="status-${v.status}">${index === 0 ? (v.status || '-') : ''}</td>
              </tr>
            `;
          });
        }
      });
      
      return { linhas, totalBruto, totalLiquido, totalVendas };
    };
    
    const { linhas, totalBruto, totalLiquido, totalVendas } = gerarLinhasPDF();
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { display: flex; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .logo { height: 60px; margin-right: 20px; }
          .title { font-size: 24px; font-weight: bold; }
          .subtitle { color: #666; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background-color: #f0f0f0; }
          .status-pago { color: #059669; }
          .status-pendente { color: #d97706; }
          .status-cancelada { color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${LOGO_BASE64}" class="logo" />
          <div>
            <div class="title">Relatório de Vendas</div>
            <div class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Turma</th>
              <th>Formando</th>
              <th>Tipo Pagamento</th>
              <th>CV/NSU</th>
              <th class="text-right">Valor Bruto</th>
              <th class="text-right">Valor Líquido</th>
              <th>Data Compensação</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${linhas}
            <tr class="total-row">
              <td colspan="5">TOTAL (${totalVendas} vendas)</td>
              <td class="text-right">${formatCurrency(totalBruto)}</td>
              <td class="text-right">${formatCurrency(totalLiquido)}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const limparFiltros = () => {
    setSearch("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setFiltroTipoPagamento("");
  };

  const temFiltrosAtivos = search || filtroDataInicio || filtroDataFim || filtroTipoPagamento;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vendas</h1>
        <p className="text-slate-500 mt-1">Gerencie as vendas diretas aos formandos</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total de Vendas</p>
                <p className="text-2xl font-bold text-slate-900">
                  {totais?.quantidade || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Valor Bruto</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(totais?.totalVendas || 0)}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Valor Líquido</p>
                <p className="text-2xl font-bold text-violet-600">
                  {formatCurrency(totais?.totalLiquido || 0)}
                </p>
              </div>
              <div className="p-3 bg-violet-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5 text-amber-500" />
                Histórico de Vendas
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
            
            {/* Filtros */}
            <div className="grid gap-3 md:grid-cols-5">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por formando ou turma..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
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
              <select
                value={filtroTipoPagamento}
                onChange={(e) => setFiltroTipoPagamento(e.target.value)}
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {TIPOS_PAGAMENTO_FILTRO.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
            </div>
            
            {temFiltrosAtivos && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-500">
                  {vendasFiltradas.length} resultado(s) encontrado(s)
                </span>
                <Button variant="ghost" size="sm" onClick={limparFiltros} className="h-7 px-2">
                  <X className="h-3 w-3 mr-1" />
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : vendasFiltradas?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <ShoppingCart className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">Nenhuma venda encontrada</p>
              <p className="text-xs mt-1">
                {temFiltrosAtivos ? "Tente ajustar os filtros" : "As vendas aparecerão aqui após serem realizadas"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-100"
                        onClick={() => toggleSort('dataVenda')}
                      >
                        <div className="flex items-center gap-1">
                          Data
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-100"
                        onClick={() => toggleSort('turma')}
                      >
                        <div className="flex items-center gap-1">
                          Turma
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-100"
                        onClick={() => toggleSort('formando')}
                      >
                        <div className="flex items-center gap-1">
                          Formando
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Tipo Pagamento</TableHead>
                      <TableHead>CV/NSU</TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-slate-100"
                        onClick={() => toggleSort('valorBruto')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Valor Bruto
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-slate-100"
                        onClick={() => toggleSort('valorLiquido')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Valor Líquido
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Data Compensação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasFiltradas?.flatMap((venda: any) => {
                      const pagamentos = venda.pagamentos || [];
                      // Se não tem pagamentos ou só tem um, mostra uma linha
                      if (pagamentos.length <= 1) {
                        return (
                          <TableRow key={venda.id} className="hover:bg-slate-50/50">
                            <TableCell>
                              <div className="flex items-center gap-2 text-slate-600">
                                <Calendar className="h-4 w-4" />
                                {formatDate(venda.dataVenda)}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-normal break-words" title={formatTurmaVenda(venda)}>
                              {formatTurmaVenda(venda)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {venda.formandoNome || "-"}
                            </TableCell>
                            <TableCell className="whitespace-normal break-words" title={formatTipoPagamento(pagamentos)}>
                              {formatTipoPagamento(pagamentos)}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {getCvNsu(pagamentos)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(pagamentos[0]?.valor || venda.valorTotal)}
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              {formatCurrency(pagamentos[0]?.valorLiquido || pagamentos[0]?.valor || venda.valorTotal)}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {pagamentos[0]?.dataCompensacao ? formatDate(pagamentos[0].dataCompensacao) : 
                               (pagamentos[0]?.tipo === "dinheiro") ? formatDate(venda.dataVenda) : "-"}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(venda.status, venda.excluido)}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {venda.criadoPorNome || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setShowDetalhes(venda)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      // Se tem múltiplos pagamentos, mostra uma linha para cada
                      return pagamentos.map((pag: any, index: number) => (
                        <TableRow key={`${venda.id}-${index}`} className="hover:bg-slate-50/50">
                          <TableCell>
                            {index === 0 ? (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Calendar className="h-4 w-4" />
                                {formatDate(venda.dataVenda)}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="whitespace-normal break-words" title={formatTurmaVenda(venda)}>
                            {index === 0 ? formatTurmaVenda(venda) : null}
                          </TableCell>
                          <TableCell className="font-medium">
                            {index === 0 ? (venda.formandoNome || "-") : null}
                          </TableCell>
                          <TableCell className="max-w-[150px]">
                            {pag.tipo === "credito" ? `Crédito ${pag.parcelas}x ${pag.bandeira || ""}`.trim() :
                             pag.tipo === "debito" ? `Débito ${pag.bandeira || ""}`.trim() :
                             pag.tipo === "pix" ? "PIX" : "Dinheiro"}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {pag.cvNsu || "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(pag.valor)}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {formatCurrency(pag.valorLiquido || pag.valor)}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {pag.dataCompensacao ? formatDate(pag.dataCompensacao) : 
                             (pag.tipo === "dinheiro") ? formatDate(venda.dataVenda) : "-"}
                          </TableCell>
                          <TableCell>
                            {index === 0 ? getStatusBadge(venda.status, venda.excluido) : null}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {index === 0 ? (venda.criadoPorNome || "-") : null}
                          </TableCell>
                          <TableCell className="text-right">
                            {index === 0 ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setShowDetalhes(venda)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Detalhes
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ));
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={!!showDetalhes} onOpenChange={(open) => !open && setShowDetalhes(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-500" />
              Detalhes da Venda
            </DialogTitle>
          </DialogHeader>
          
          {showDetalhes && (
            <div className="space-y-6">
              {/* Informações Gerais */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Data da Venda</p>
                  <p className="font-medium">{formatDate(showDetalhes.dataVenda)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Formando</p>
                  <p className="font-medium">{showDetalhes.formandoNome || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Turma</p>
                  <p className="font-medium">{formatTurmaVenda(showDetalhes)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  {getStatusBadge(showDetalhes.status, showDetalhes.excluido)}
                </div>
              </div>

              {/* Itens da Venda */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Itens da Venda
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                      <TableRow className="bg-white">
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Valor Unit.</TableHead>
                        <TableHead className="text-right">Ajuste</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {showDetalhes.itens?.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.produto}</p>
                              {item.categoria && (
                                <p className="text-xs text-slate-500">{item.categoria}</p>
                              )}
                              {item.justificativa && (
                                <p className="text-xs text-amber-600 mt-1">
                                  Justificativa: {item.justificativa}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{item.quantidade}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.valorUnitario)}</TableCell>
                          <TableCell className="text-right">
                            {item.ajusteValor !== 0 && (
                              <span className={item.ajusteValor > 0 ? "text-emerald-600" : "text-red-600"}>
                                {item.ajusteValor > 0 ? "+" : ""}{formatCurrency(item.ajusteValor)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency((item.valorUnitario * item.quantidade) + (item.ajusteValor || 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagamentos */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pagamentos
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                      <TableRow className="bg-white">
                        <TableHead>Tipo</TableHead>
                        <TableHead>CV (NSU)</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Valor Líquido</TableHead>
                        <TableHead>Data Compensação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {showDetalhes.pagamentos?.map((pag: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            {pag.tipo === "credito" ? `Crédito ${pag.parcelas}x - ${pag.bandeira}` :
                             pag.tipo === "debito" ? `Débito - ${pag.bandeira}` :
                             pag.tipo === "pix" ? "PIX" : "Dinheiro"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {pag.cvNsu || "-"}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(pag.valor)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(pag.valorLiquido || pag.valor)}</TableCell>
                          <TableCell>
                            {pag.dataCompensacao ? formatDate(pag.dataCompensacao) : 
                             pag.tipo === "dinheiro" ? "Mesmo dia" : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totais */}
              <div className="flex justify-end gap-6 p-4 bg-slate-50 rounded-lg">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Valor Bruto</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(showDetalhes.valorTotal)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Valor Líquido</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(showDetalhes.valorLiquido || showDetalhes.valorTotal)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
