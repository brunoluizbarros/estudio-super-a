import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  History, 
  Search, 
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// Helper para formatar valores em centavos para reais
function formatarValor(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "R$ 0,00";
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}

// Helper para formatar data
function formatarData(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

export default function HistoricoFechamentos() {
  const [, setLocation] = useLocation();
  
  // Estados de filtros
  const [dataInicio, setDataInicio] = useState(() => {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return primeiroDiaMes.toISOString().split("T")[0];
  });
  
  const [dataFim, setDataFim] = useState(
    new Date().toISOString().split("T")[0]
  );
  
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

  // Query para buscar fechamentos
  const { data: fechamentos, isLoading, refetch } = trpc.fechamentoDiario.listarFechamentos.useQuery(
    {
      dataInicio,
      dataFim,
    },
    {
      enabled: !!dataInicio && !!dataFim,
    }
  );

  // Filtrar por status
  const fechamentosFiltrados = fechamentos?.filter((f) => {
    if (filtroStatus === "todos") return true;
    return f.status === filtroStatus;
  }) || [];

  const statusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case "conciliado":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Conciliado
          </Badge>
        );
      case "com_divergencia":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Com Divergências
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleVerDetalhes = (data: Date) => {
    const dataStr = new Date(data).toISOString().split("T")[0];
    setLocation(`/financeiro/fechamento-diario?data=${dataStr}`);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Fechamentos
          </CardTitle>
          <CardDescription>
            Visualize e consulte fechamentos diários anteriores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data Início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dataFim">Data Fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="conciliado">Conciliado</SelectItem>
                    <SelectItem value="com_divergencia">Com Divergências</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button onClick={() => refetch()} className="w-full">
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>
            {fechamentosFiltrados.length} fechamento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : fechamentosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum fechamento encontrado para o período selecionado.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Total Sistema</TableHead>
                    <TableHead className="text-right">Total Rede</TableHead>
                    <TableHead className="text-center">Divergências</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fechamentosFiltrados.map((fechamento) => (
                    <TableRow key={fechamento.id}>
                      <TableCell className="font-medium">
                        {formatarData(fechamento.data)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatarValor(fechamento.totalSistema)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fechamento.totalRede 
                          ? formatarValor(fechamento.totalRede)
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold text-red-600">
                            {fechamento.quantidadeDivergencias || 0}
                          </span>
                          {(fechamento.quantidadeNaoLancadas || 0) > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({fechamento.quantidadeNaoLancadas} não lançadas)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {statusBadge(fechamento.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerDetalhes(fechamento.data)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
