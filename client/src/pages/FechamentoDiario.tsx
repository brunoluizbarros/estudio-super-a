import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Calendar, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Ghost,
  DollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  ThumbsUp,
  Edit3,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Download
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Helper para formatar valores em centavos para reais
function formatarValor(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "R$ 0,00";
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}

// Helper para formatar data
function formatarData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function FechamentoDiario() {

  const [dataSelecionada, setDataSelecionada] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [arquivoCSV, setArquivoCSV] = useState<File | null>(null);
  const [modalResolucao, setModalResolucao] = useState<{
    aberto: boolean;
    divergenciaId: number | null;
    acao: "aprovado" | "corrigido" | "ignorado" | null;
  }>({ aberto: false, divergenciaId: null, acao: null });
  const [justificativa, setJustificativa] = useState("");
  
  // Estados para reconciliação em lote
  const [divergenciasSelecionadas, setDivergenciasSelecionadas] = useState<number[]>([]);
  const [modalLote, setModalLote] = useState<{
    aberto: boolean;
    acao: "aprovado" | "corrigido" | "ignorado" | null;
  }>({ aberto: false, acao: null });
  const [justificativaLote, setJustificativaLote] = useState("");

  // Queries
  const { data: fechamento, refetch: refetchFechamento, isLoading: isLoadingFechamento, error: errorFechamento } = trpc.fechamentoDiario.buscarOuCriarFechamento.useQuery(
    { data: dataSelecionada },
    { enabled: !!dataSelecionada }
  );

  const { data: detalhes, refetch: refetchDetalhes } = trpc.fechamentoDiario.detalhesFechamento.useQuery(
    { data: dataSelecionada },
    { enabled: !!fechamento }
  );

  // Mutations
  const uploadMutation = trpc.fechamentoDiario.uploadExtratoRede.useMutation({
    onSuccess: (resultado) => {
      toast.success(`Upload concluído! ${resultado.transacoesProcessadas} transações processadas. ${resultado.matches} OK, ${resultado.divergencias} divergências.`);
      refetchFechamento();
      refetchDetalhes();
      setArquivoCSV(null);
    },
    onError: (error) => {
      toast.error(`Erro no upload: ${error.message}`);
    },
  });

  const resolverMutation = trpc.fechamentoDiario.resolverDivergencia.useMutation({
    onSuccess: () => {
      toast.success("Divergência resolvida com sucesso!");
      refetchFechamento();
      refetchDetalhes();
      setModalResolucao({ aberto: false, divergenciaId: null, acao: null });
      setJustificativa("");
    },
    onError: (error) => {
      toast.error(`Erro ao resolver divergência: ${error.message}`);
    },
  });
  
  const resolverLoteMutation = trpc.fechamentoDiario.resolverDivergenciasEmLote.useMutation({
    onSuccess: (resultado) => {
      toast.success(`${resultado.quantidadeResolvida} divergência(s) resolvida(s) com sucesso!`);
      refetchFechamento();
      refetchDetalhes();
      setModalLote({ aberto: false, acao: null });
      setJustificativaLote("");
      setDivergenciasSelecionadas([]);
    },
    onError: (error) => {
      toast.error(`Erro ao resolver divergências: ${error.message}`);
    },
  });
  
  const limparDadosMutation = trpc.fechamentoDiario.limparDadosDia.useMutation({
    onSuccess: () => {
      toast.success("Dados do dia removidos com sucesso!");
      refetchFechamento();
      refetchDetalhes();
      setArquivoCSV(null);
    },
    onError: (error) => {
      toast.error(`Erro ao limpar dados: ${error.message}`);
    },
  });

  const handleUploadCSV = async () => {
    if (!arquivoCSV) {
      toast.error("Selecione um arquivo CSV da Rede para fazer o upload.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      const csvContent = e.target?.result as string;
      uploadMutation.mutate({
        data: dataSelecionada,
        csvContent,
      });
    };
    if (arquivoCSV) {
      reader.readAsText(arquivoCSV);
    }
  };

  const abrirModalResolucao = (divergenciaId: number, acao: "aprovado" | "corrigido" | "ignorado") => {
    setModalResolucao({ aberto: true, divergenciaId, acao });
    setJustificativa("");
  };

  const handleResolverDivergencia = () => {
    if (!modalResolucao.divergenciaId || !modalResolucao.acao) return;
    
    if (justificativa.length < 10) {
      toast.error("A justificativa deve ter no mínimo 10 caracteres.");
      return;
    }

    resolverMutation.mutate({
      divergenciaId: modalResolucao.divergenciaId,
      statusResolucao: modalResolucao.acao,
      justificativa,
    });
  };
  
  const handleResolverLote = () => {
    if (divergenciasSelecionadas.length === 0 || !modalLote.acao) return;
    
    if (justificativaLote.length < 10) {
      toast.error("A justificativa deve ter no mínimo 10 caracteres.");
      return;
    }
    
    resolverLoteMutation.mutate({
      divergenciaIds: divergenciasSelecionadas,
      statusResolucao: modalLote.acao,
      justificativa: justificativaLote,
    });
  };
  
  const toggleDivergencia = (id: number) => {
    setDivergenciasSelecionadas(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };
  
  const toggleTodasDivergencias = () => {
    if (!detalhes?.divergencias) return;
    const divergenciasPendentes = detalhes.divergencias
      .filter(d => d.statusResolucao === "pendente")
      .map(d => d.id);
    
    if (divergenciasSelecionadas.length === divergenciasPendentes.length) {
      setDivergenciasSelecionadas([]);
    } else {
      setDivergenciasSelecionadas(divergenciasPendentes);
    }
  };
  
  const abrirModalLote = (acao: "aprovado" | "corrigido" | "ignorado") => {
    if (divergenciasSelecionadas.length === 0) {
      toast.error("Selecione pelo menos uma divergência");
      return;
    }
    setModalLote({ aberto: true, acao });
  };
  
  const handleLimparDados = () => {
    if (!dataSelecionada) return;
    
    if (confirm("Tem certeza que deseja remover todos os dados do fechamento deste dia? Esta ação não pode ser desfeita.")) {
      limparDadosMutation.mutate({ data: dataSelecionada });
    }
  };
  
  // Funções de exportação
  const exportarExcel = () => {
    if (!fechamento || !detalhes) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    
    // Preparar dados do resumo
    const resumo = [
      ["FECHAMENTO DIÁRIO - " + formatarData(dataSelecionada)],
      [],
      ["RESUMO DO DIA"],
      ["Dinheiro", formatarValor(fechamento.totalDinheiro)],
      ["PIX", formatarValor(fechamento.totalPix)],
      ["Débito", formatarValor(fechamento.totalDebito)],
      ["Crédito à Vista", formatarValor(fechamento.totalCreditoVista)],
      ["Crédito Parcelado", formatarValor(fechamento.totalCreditoParcelado)],
      ["Total Sistema", formatarValor(fechamento.totalSistema)],
      ["Total Rede", formatarValor(fechamento.totalRede)],
      ["Status", fechamento.status],
      [],
      ["ESTATÍSTICAS"],
      ["Vendas OK", fechamento.quantidadeVendasOk || 0],
      ["Divergências", fechamento.quantidadeDivergencias || 0],
      ["Não Lançadas", fechamento.quantidadeNaoLancadas || 0],
      ["Fantasma", fechamento.quantidadeFantasma || 0],
      [],
    ];
    
    // Preparar dados das transações
    const transacoesData = [
      ["TRANSAÇÕES DA REDE"],
      ["Status", "CV/NSU", "Bandeira", "Modalidade", "Parcelas", "Valor Original", "Valor Líquido"],
      ...detalhes.transacoes.map(t => [
        t.statusMatching || "nao_lancado",
        t.nsuCv,
        t.bandeira,
        t.modalidade,
        `${t.numeroParcelas}x`,
        (t.valorOriginal || 0) / 100,
        (t.valorLiquido || 0) / 100,
      ]),
      [],
    ];
    
    // Preparar dados das divergências
    const divergenciasData = [
      ["DIVERGÊNCIAS"],
      ["Tipo", "Descrição", "CV/NSU", "Diferença", "Status", "Justificativa"],
      ...detalhes.divergencias.map(d => [
        d.tipoDivergencia,
        d.descricao,
        d.cvNsu || "-",
        d.diferenca ? (d.diferenca / 100) : "-",
        d.statusResolucao,
        d.justificativa || "-",
      ]),
    ];
    
    // Criar workbook
    const wb = XLSX.utils.book_new();
    const wsData = [...resumo, ...transacoesData, ...divergenciasData];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    XLSX.utils.book_append_sheet(wb, ws, "Fechamento");
    XLSX.writeFile(wb, `fechamento_${dataSelecionada}.xlsx`);
    
    toast.success("Relatório Excel exportado com sucesso!");
  };
  
  const exportarPDF = () => {
    if (!fechamento || !detalhes) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text("FECHAMENTO DIÁRIO", 14, 15);
    doc.setFontSize(12);
    doc.text(formatarData(dataSelecionada), 14, 22);
    
    // Resumo
    doc.setFontSize(14);
    doc.text("Resumo do Dia", 14, 32);
    
    autoTable(doc, {
      startY: 36,
      head: [["Forma de Pagamento", "Valor"]],
      body: [
        ["Dinheiro", formatarValor(fechamento.totalDinheiro)],
        ["PIX", formatarValor(fechamento.totalPix)],
        ["Débito", formatarValor(fechamento.totalDebito)],
        ["Crédito à Vista", formatarValor(fechamento.totalCreditoVista)],
        ["Crédito Parcelado", formatarValor(fechamento.totalCreditoParcelado)],
        ["Total Sistema", formatarValor(fechamento.totalSistema)],
        ["Total Rede", formatarValor(fechamento.totalRede)],
      ],
    });
    
    // Estatísticas
    const finalY1 = (doc as any).lastAutoTable.finalY || 36;
    doc.setFontSize(14);
    doc.text("Estatísticas", 14, finalY1 + 10);
    
    autoTable(doc, {
      startY: finalY1 + 14,
      head: [["Métrica", "Quantidade"]],
      body: [
        ["Vendas OK", String(fechamento.quantidadeVendasOk || 0)],
        ["Divergências", String(fechamento.quantidadeDivergencias || 0)],
        ["Não Lançadas", String(fechamento.quantidadeNaoLancadas || 0)],
        ["Fantasma", String(fechamento.quantidadeFantasma || 0)],
      ],
    });
    
    // Divergências
    if (detalhes.divergencias.length > 0) {
      const finalY2 = (doc as any).lastAutoTable.finalY || finalY1 + 14;
      doc.setFontSize(14);
      doc.text("Divergências", 14, finalY2 + 10);
      
      autoTable(doc, {
        startY: finalY2 + 14,
        head: [["Tipo", "CV/NSU", "Diferença", "Status"]],
        body: detalhes.divergencias.map(d => [
          d.tipoDivergencia,
          d.cvNsu || "-",
          d.diferenca ? formatarValor(d.diferenca) : "-",
          d.statusResolucao,
        ]),
      });
    }
    
    doc.save(`fechamento_${dataSelecionada}.pdf`);
    toast.success("Relatório PDF exportado com sucesso!");
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline">Pendente</Badge>;
      case "conciliado":
        return <Badge className="bg-green-500">Conciliado</Badge>;
      case "com_divergencia":
        return <Badge variant="destructive">Com Divergências</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const statusMatchingIcon = (status: string) => {
    switch (status) {
      case "ok":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "divergencia_valor":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "nao_lancado":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Ghost className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Seleção de Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Fechamento Diário
          </CardTitle>
          <CardDescription>
            Selecione a data para visualizar ou criar o fechamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={dataSelecionada}
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="max-w-xs"
              />
            </div>
            {fechamento && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {statusBadge(fechamento.status)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo do Dia */}
      {isLoadingFechamento && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">Carregando fechamento...</div>
          </CardContent>
        </Card>
      )}
      
      {errorFechamento && (
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar fechamento: {errorFechamento.message}
          </AlertDescription>
        </Alert>
      )}
      
      {fechamento && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dinheiro</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatarValor(fechamento.totalDinheiro)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PIX</CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatarValor(fechamento.totalPix)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Débito</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatarValor(fechamento.totalDebito)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Crédito</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatarValor(
                  (fechamento.totalCreditoVista || 0) + 
                  (fechamento.totalCreditoParcelado || 0)
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sistema</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatarValor(fechamento.totalSistema)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload do Extrato da Rede */}
      {fechamento && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Extrato da Rede
            </CardTitle>
            <CardDescription>
              Faça upload do arquivo CSV exportado da Rede para comparar com as vendas do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor="csv">Arquivo CSV</Label>
                  <Input
                    id="csv"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setArquivoCSV(e.target.files?.[0] || null)}
                  />
                </div>
                <Button 
                  onClick={handleUploadCSV} 
                  disabled={!arquivoCSV || uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? "Processando..." : "Processar"}
                </Button>
              </div>
              
              {detalhes && detalhes.transacoes.length > 0 && (
                <div className="flex justify-end">
                  <Button 
                    variant="outline"
                    onClick={handleLimparDados}
                    disabled={limparDadosMutation.isPending}
                    className="text-red-600 hover:bg-red-50"
                  >
                    {limparDadosMutation.isPending ? "Limpando..." : "Limpar Dados do Dia"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado da Conciliação */}
      {detalhes && detalhes.transacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado da Conciliação</CardTitle>
            <CardDescription>
              Comparação entre vendas do sistema e transações da Rede
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{fechamento?.quantidadeVendasOk || 0}</div>
                  <div className="text-sm text-muted-foreground">OK</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold">{fechamento?.quantidadeDivergencias || 0}</div>
                  <div className="text-sm text-muted-foreground">Divergências</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">{fechamento?.quantidadeNaoLancadas || 0}</div>
                  <div className="text-sm text-muted-foreground">Não Lançadas</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Ghost className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="text-2xl font-bold">{fechamento?.quantidadeFantasma || 0}</div>
                  <div className="text-sm text-muted-foreground">Fantasma</div>
                </div>
              </div>
            </div>

            {/* Tabela de Transações */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>CV/NSU</TableHead>
                    <TableHead>Bandeira</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Parcelas</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Valor Líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalhes.transacoes.filter(t => {
                    // Filtrar apenas transações do dia selecionado
                    if (!t.dataVenda) return true;
                    const dataTransacao = new Date(t.dataVenda).toISOString().split('T')[0];
                    return dataTransacao === dataSelecionada;
                  }).map((transacao) => (
                    <TableRow key={transacao.id}>
                      <TableCell>
                        {statusMatchingIcon(transacao.statusMatching || "nao_lancado")}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {transacao.nsuCv}
                      </TableCell>
                      <TableCell>{transacao.bandeira}</TableCell>
                      <TableCell className="capitalize">{transacao.modalidade}</TableCell>
                      <TableCell>{transacao.numeroParcelas}x</TableCell>
                      <TableCell className="text-right">
                        {formatarValor(transacao.valorOriginal)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatarValor(transacao.valorLiquido)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Divergências Detalhadas */}
      {detalhes && detalhes.divergencias.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-red-600">Divergências Encontradas</CardTitle>
                <CardDescription>
                  Transações que precisam de atenção
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportarExcel}
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportarPDF}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Barra de Ações em Lote */}
            {detalhes.divergencias.some(d => d.statusResolucao === "pendente") && (
              <div className="mb-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={divergenciasSelecionadas.length === detalhes.divergencias.filter(d => d.statusResolucao === "pendente").length}
                        onCheckedChange={toggleTodasDivergencias}
                      />
                      <Label htmlFor="select-all" className="cursor-pointer">
                        Selecionar todas pendentes
                      </Label>
                    </div>
                    {divergenciasSelecionadas.length > 0 && (
                      <Badge variant="secondary">
                        {divergenciasSelecionadas.length} selecionada(s)
                      </Badge>
                    )}
                  </div>
                  {divergenciasSelecionadas.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:bg-green-50"
                        onClick={() => abrirModalLote("aprovado")}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Aprovar Selecionadas
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 hover:bg-blue-50"
                        onClick={() => abrirModalLote("corrigido")}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Corrigir Selecionadas
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-gray-600 hover:bg-gray-50"
                        onClick={() => abrirModalLote("ignorado")}
                      >
                        <EyeOff className="h-4 w-4 mr-1" />
                        Ignorar Selecionadas
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {detalhes.divergencias.map((div) => (
                <Alert key={div.id} variant={div.tipoDivergencia === "valor_diferente" ? "default" : "destructive"}>
                  <AlertDescription>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {div.statusResolucao === "pendente" && (
                            <Checkbox
                              checked={divergenciasSelecionadas.includes(div.id)}
                              onCheckedChange={() => toggleDivergencia(div.id)}
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">
                                {div.tipoDivergencia === "valor_diferente" && "⚠️ Divergência de Valor"}
                                {div.tipoDivergencia === "nao_lancado" && "❌ Transação Não Lançada"}
                                {div.tipoDivergencia === "venda_fantasma" && "👻 Venda Fantasma"}
                              </span>
                              {div.statusResolucao === "pendente" && (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                  Pendente
                                </Badge>
                              )}
                              {div.statusResolucao === "aprovado" && (
                                <Badge className="bg-green-500 text-white">
                                  Aprovado
                                </Badge>
                              )}
                              {div.statusResolucao === "corrigido" && (
                                <Badge className="bg-blue-500 text-white">
                                  Corrigido
                                </Badge>
                              )}
                              {div.statusResolucao === "ignorado" && (
                                <Badge className="bg-gray-500 text-white">
                                  Ignorado
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm">{div.descricao}</div>
                            {div.cvNsu && (
                              <div className="text-sm text-muted-foreground mt-1">
                                CV/NSU: <span className="font-mono">{div.cvNsu}</span>
                              </div>
                            )}
                            {div.justificativa && (
                              <div className="text-sm mt-2 p-2 bg-muted rounded">
                                <span className="font-semibold">Justificativa:</span> {div.justificativa}
                                <div className="text-xs text-muted-foreground mt-1">
                                  Resolvido por {div.resolvidoPorNome} em {div.resolvidoEm ? new Date(div.resolvidoEm).toLocaleString('pt-BR') : ''}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        {div.diferenca && (
                          <Badge variant="outline" className="ml-2">
                            Diferença: {formatarValor(div.diferenca)}
                          </Badge>
                        )}
                      </div>
                      
                      {div.statusResolucao === "pendente" && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => abrirModalResolucao(div.id, "aprovado")}
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 hover:bg-blue-50"
                            onClick={() => abrirModalResolucao(div.id, "corrigido")}
                          >
                            <Edit3 className="h-4 w-4 mr-1" />
                            Corrigir
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-gray-600 hover:bg-gray-50"
                            onClick={() => abrirModalResolucao(div.id, "ignorado")}
                          >
                            <EyeOff className="h-4 w-4 mr-1" />
                            Ignorar
                          </Button>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado vazio */}
      {!fechamento && (
        <Alert>
          <AlertDescription>
            Selecione uma data para visualizar ou criar o fechamento diário.
          </AlertDescription>
        </Alert>
      )}

      {/* Modal de Justificativa */}
      <Dialog open={modalResolucao.aberto} onOpenChange={(aberto) => setModalResolucao({ ...modalResolucao, aberto })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalResolucao.acao === "aprovado" && "Aprovar Divergência"}
              {modalResolucao.acao === "corrigido" && "Marcar como Corrigido"}
              {modalResolucao.acao === "ignorado" && "Ignorar Divergência"}
            </DialogTitle>
            <DialogDescription>
              Informe a justificativa para esta ação (mínimo 10 caracteres).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="justificativa">Justificativa *</Label>
              <Textarea
                id="justificativa"
                placeholder="Descreva o motivo desta resolução..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {justificativa.length} / 10 caracteres mínimos
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalResolucao({ aberto: false, divergenciaId: null, acao: null })}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResolverDivergencia}
              disabled={justificativa.length < 10 || resolverMutation.isPending}
            >
              {resolverMutation.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Reconciliação em Lote */}
      <Dialog open={modalLote.aberto} onOpenChange={(aberto) => setModalLote({ ...modalLote, aberto })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalLote.acao === "aprovado" && "Aprovar Divergências em Lote"}
              {modalLote.acao === "corrigido" && "Marcar como Corrigido em Lote"}
              {modalLote.acao === "ignorado" && "Ignorar Divergências em Lote"}
            </DialogTitle>
            <DialogDescription>
              Você está prestes a resolver {divergenciasSelecionadas.length} divergência(s) com a mesma justificativa.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="justificativa-lote">Justificativa *</Label>
              <Textarea
                id="justificativa-lote"
                placeholder="Descreva o motivo desta resolução para todas as divergências selecionadas..."
                value={justificativaLote}
                onChange={(e) => setJustificativaLote(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {justificativaLote.length} / 10 caracteres mínimos
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalLote({ aberto: false, acao: null })}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResolverLote}
              disabled={justificativaLote.length < 10 || resolverLoteMutation.isPending}
            >
              {resolverLoteMutation.isPending ? "Processando..." : `Confirmar (${divergenciasSelecionadas.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
