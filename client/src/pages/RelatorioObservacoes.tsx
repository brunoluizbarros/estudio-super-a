import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, Calendar } from "lucide-react";
import * as XLSX from "xlsx";

const TIPOS_EVENTO_LABELS: Record<string, string> = {
  foto_estudio: "Estúdio",
  foto_50: "Foto 50",
  foto_descontrada: "Descontraída",
  foto_oficial: "Oficial",
  foto_samu: "SAMU",
  foto_bloco: "Bloco",
  foto_consultorio: "Consultório",
};

export default function RelatorioObservacoes() {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Buscar histórico de observações
  const { data: historico, isLoading, refetch } = trpc.historicoObservacoes.list.useQuery({
    dataInicio: dataInicio ? new Date(dataInicio) : undefined,
    dataFim: dataFim ? new Date(dataFim) : undefined,
  });

  // Buscar turmas para exibir informações completas
  const { data: turmas } = trpc.turmas.list.useQuery();

  const getTurmaNome = (turmaId: number) => {
    const turma = turmas?.find((t) => t.id === turmaId);
    if (!turma) return `Turma ${turmaId}`;
    return `${turma.codigo || turmaId}`;
  };

  const formatDateTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleExportExcel = () => {
    if (!historico || historico.length === 0) {
      alert("Não há dados para exportar");
      return;
    }

    const dados = historico.map((item) => ({
      "Data/Hora": formatDateTime(item.createdAt),
      "Usuário": item.usuario?.name || "Desconhecido",
      "Email": item.usuario?.email || "",
      "Turma": getTurmaNome(item.evento?.turmaId || 0),
      "Tipo de Evento": TIPOS_EVENTO_LABELS[item.evento?.tipoEvento || ""] || item.evento?.tipoEvento || "",
      "Data do Evento": item.evento?.dataEvento ? new Date(item.evento.dataEvento).toLocaleDateString("pt-BR") : "",
      "Observação": item.observacao,
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Observações");

    // Ajustar largura das colunas
    ws["!cols"] = [
      { wch: 18 }, // Data/Hora
      { wch: 25 }, // Usuário
      { wch: 30 }, // Email
      { wch: 15 }, // Turma
      { wch: 18 }, // Tipo de Evento
      { wch: 15 }, // Data do Evento
      { wch: 50 }, // Observação
    ];

    XLSX.writeFile(wb, `observacoes_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleLimparFiltros = () => {
    setDataInicio("");
    setDataFim("");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Relatório de Observações</h1>
          <p className="text-muted-foreground">
            Histórico completo de observações registradas em eventos
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                type="date"
                id="dataInicio"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                type="date"
                id="dataFim"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => refetch()} className="flex-1">
                Aplicar Filtros
              </Button>
              <Button onClick={handleLimparFiltros} variant="outline">
                Limpar
              </Button>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleExportExcel}
                variant="outline"
                className="w-full"
                disabled={!historico || historico.length === 0}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Observações */}
      <Card>
        <CardHeader>
          <CardTitle>
            Observações Registradas
            {historico && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({historico.length} {historico.length === 1 ? "registro" : "registros"})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !historico || historico.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">Nenhuma observação encontrada</p>
              <p className="text-sm">
                Observações registradas em eventos aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Data/Hora</TableHead>
                    <TableHead className="w-[200px]">Usuário</TableHead>
                    <TableHead className="w-[120px]">Turma</TableHead>
                    <TableHead className="w-[150px]">Tipo de Evento</TableHead>
                    <TableHead className="w-[120px]">Data do Evento</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {formatDateTime(item.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.usuario?.name || "Desconhecido"}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.usuario?.email || ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getTurmaNome(item.evento?.turmaId || 0)}</TableCell>
                      <TableCell>
                        {TIPOS_EVENTO_LABELS[item.evento?.tipoEvento || ""] ||
                          item.evento?.tipoEvento ||
                          "-"}
                      </TableCell>
                      <TableCell>
                        {item.evento?.dataEvento
                          ? new Date(item.evento.dataEvento).toLocaleDateString("pt-BR")
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="whitespace-pre-wrap break-words">{item.observacao}</p>
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
