import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { LOGO_BASE64 } from "@/lib/logo";
import { formatTurmaCompleta } from "@/lib/formatTurma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

export default function Becas() {
  const [selectedTurmaId, setSelectedTurmaId] = useState<number | null>(null);
  const [searchTurma, setSearchTurma] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Queries
  const { data: turmas = [] } = trpc.turmas.list.useQuery();
  const { data: formandosComBecas = [], refetch } = trpc.becas.listByTurma.useQuery(
    { turmaId: selectedTurmaId! },
    { enabled: !!selectedTurmaId }
  );

  // Mutations
  const updateObservacoes = trpc.briefing.updateTurmaObservacoesBeca.useMutation({
    onSuccess: () => {
      toast.success("Observações salvas com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar observações: " + error.message);
    }
  });

  const updateBecaEvento = trpc.becas.updateBecaEvento.useMutation({
    onSuccess: () => {
      toast.success("Beca atualizada com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar beca: " + error.message);
    }
  });

  // Filtro de turmas
  const turmasFiltradas = useMemo(() => {
    if (!searchTurma) return turmas;
    const search = searchTurma.toLowerCase();
    return turmas.filter(t => 
      t.codigo?.toLowerCase().includes(search) ||
      (Array.isArray(t.cursos) ? t.cursos.some(c => String(c).toLowerCase().includes(search)) : false) ||
      (Array.isArray(t.instituicoes) ? t.instituicoes.some(i => String(i).toLowerCase().includes(search)) : false)
    );
  }, [turmas, searchTurma]);

  // Função movida para @/lib/formatTurma.ts
  const formatTurmaLabel = formatTurmaCompleta;

  // Handler para atualizar beca do evento
  const handleBecaEventoChange = (formandoId: number, value: string) => {
    updateBecaEvento.mutate({
      formandoId,
      becaEvento: value || null,
    });
  };

  // Carregar observações quando turma for selecionada
  useEffect(() => {
    if (selectedTurmaId) {
      const turma = turmas.find(t => t.id === selectedTurmaId);
      setObservacoes(turma?.observacoesBeca || "");
    } else {
      setObservacoes("");
    }
  }, [selectedTurmaId, turmas]);

  // Handler para salvar observações
  const handleSaveObservacoes = () => {
    if (!selectedTurmaId) return;
    updateObservacoes.mutate({
      turmaId: selectedTurmaId,
      observacoesBeca: observacoes,
    });
  };

  // Exportar para Excel
  const handleExportExcel = () => {
    if (!selectedTurmaId || formandosComBecas.length === 0) {
      toast.error("Selecione uma turma com formandos para exportar");
      return;
    }

    const turma = turmas.find(t => t.id === selectedTurmaId);
    const turmaLabel = turma ? formatTurmaLabel(turma) : "Turma";

    const data = formandosComBecas.map(f => ({
      "Turma": turma?.codigo || "",
      "Formando": f.formandoNome,
      "Status": f.formandoStatus === "apto" ? "Apto" : f.formandoStatus === "inapto" ? "Inapto" : "Migração",
      "Beca - Estúdio": f.becaEstudio || "-",
      "Beca - Evento": f.becaEvento || "-",
      "Peso": f.peso || "-",
      "Altura": f.altura || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Becas");
    XLSX.writeFile(wb, `Becas_${turmaLabel.replace(/ /g, "_")}.xlsx`);
    toast.success("Excel exportado com sucesso!");
  };

  // Exportar para PDF
  const handleExportPDF = () => {
    if (!selectedTurmaId || formandosComBecas.length === 0) {
      toast.error("Selecione uma turma com formandos para exportar");
      return;
    }

    const turma = turmas.find(t => t.id === selectedTurmaId);
    const turmaLabel = turma ? formatTurmaLabel(turma) : "Turma";

    // Criar janela de impressão
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Bloqueador de pop-up ativado. Permita pop-ups para exportar PDF.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatório de Becas</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 8px; }
            .header { display: flex; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .logo { width: 100px; height: auto; margin-right: 15px; }
            .header-text h1 { margin: 0; font-size: 16px; }
            .header-text p { margin: 5px 0 0 0; font-size: 10px; color: #666; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 5px; text-align: left; font-size: 12px; }
            th { background-color: #f4f4f4; font-weight: bold; }
            .observacoes { margin-top: 15px; padding: 8px; background-color: #f9f9f9; border-left: 3px solid #333; font-size: 8px; }
            .observacoes h3 { margin: 0 0 5px 0; font-size: 9px; }
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
              <h1>Relatório de Becas</h1>
              <p>${turmaLabel} | Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} | Total: ${formandosComBecas.length} formandos</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Turma</th>
                <th>Formando</th>
                <th>Status</th>
                <th>Beca - Estúdio</th>
                <th>Beca - Evento</th>
                <th>Peso</th>
                <th>Altura</th>
              </tr>
            </thead>
            <tbody>
              ${formandosComBecas.map(f => `
                <tr>
                  <td>${turma?.codigo || ""}</td>
                  <td>${f.formandoNome}</td>
                  <td class="status-${f.formandoStatus}">${f.formandoStatus === "apto" ? "Apto" : f.formandoStatus === "inapto" ? "Inapto" : "Migração"}</td>
                  <td>${f.becaEstudio || "-"}</td>
                  <td>${f.becaEvento || "-"}</td>
                  <td>${f.peso || "-"}</td>
                  <td>${f.altura || "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          ${observacoes ? `
            <div class="observacoes">
              <h3>Observações</h3>
              <p>${observacoes.replace(/\n/g, "<br>")}</p>
            </div>
          ` : ""}
          <div class="footer">
            Estúdio Super A Formaturas - Relatório de Becas
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Formatar status
  const formatStatus = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      apto: { label: "Apto", className: "bg-green-100 text-green-700 hover:bg-green-100" },
      inapto: { label: "Inapto", className: "bg-red-100 text-red-700 hover:bg-red-100" },
      migracao: { label: "Migração", className: "bg-gray-100 text-gray-700 hover:bg-gray-100" },
    };
    return statusMap[status] || { label: status, className: "bg-gray-100 text-gray-700 hover:bg-gray-100" };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Becas</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gerencie as becas dos formandos do evento Foto Oficial</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={!selectedTurmaId || formandosComBecas.length === 0}
            className="flex-1 sm:flex-initial"
          >
            <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={!selectedTurmaId || formandosComBecas.length === 0}
            className="flex-1 sm:flex-initial"
          >
            <FileDown className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>

      {/* Busca de Turma */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar turma por código ou curso..."
            value={searchTurma}
            onChange={(e) => setSearchTurma(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        
        {searchTurma && turmasFiltradas.length > 0 && (
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            {turmasFiltradas.map((turma) => (
              <div
                key={turma.id}
                className={`p-3 cursor-pointer hover:bg-accent transition-colors border-b last:border-b-0 ${
                  selectedTurmaId === turma.id ? 'bg-accent' : ''
                }`}
                onClick={() => {
                  setSelectedTurmaId(turma.id);
                  setSearchTurma("");
                }}
              >
                <div className="font-medium">{formatTurmaLabel(turma)}</div>
              </div>
            ))}
          </div>
        )}
        
        {searchTurma && turmasFiltradas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma turma encontrada
          </div>
        )}
        
        {selectedTurmaId && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Badge variant="secondary" className="text-xs sm:text-sm break-words max-w-full">
              {formatTurmaLabel(turmas.find(t => t.id === selectedTurmaId)!)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTurmaId(null);
                setSearchTurma("");
              }}
              className="w-full sm:w-auto"
            >
              Limpar
            </Button>
          </div>
        )}
      </div>

      {/* Tabela de Formandos com Becas */}
      {selectedTurmaId && (
        <Card>
          <CardHeader>
            <CardTitle>Formandos - Evento Foto Oficial</CardTitle>
          </CardHeader>
          <CardContent>
            {formandosComBecas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum formando encontrado para o evento Foto Oficial desta turma
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                    <TableRow className="bg-white">
                      <TableHead className="min-w-[80px]">Turma</TableHead>
                      <TableHead className="min-w-[150px]">Formando</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[120px]">Beca - Estúdio</TableHead>
                      <TableHead className="min-w-[120px]">Beca - Evento</TableHead>
                      <TableHead className="min-w-[80px]">Peso</TableHead>
                      <TableHead className="min-w-[80px]">Altura</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formandosComBecas.map((item) => {
                      const turma = turmas.find(t => t.id === selectedTurmaId);
                      const statusInfo = formatStatus(item.formandoStatus || "apto");
                      
                      return (
                        <TableRow key={item.formandoId}>
                          <TableCell className="font-medium">
                            {turma?.codigo}
                          </TableCell>
                          <TableCell>{item.formandoNome}</TableCell>
                          <TableCell>
                            <Badge className={statusInfo.className}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {item.becaEstudio || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.becaEvento || "none"}
                              onValueChange={(value) => handleBecaEventoChange(item.formandoId, value === "none" ? "" : value)}
                            >
                              <SelectTrigger className="w-20 sm:w-24">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-</SelectItem>
                                <SelectItem value="PPP">PPP</SelectItem>
                                <SelectItem value="PP">PP</SelectItem>
                                <SelectItem value="P">P</SelectItem>
                                <SelectItem value="M">M</SelectItem>
                                <SelectItem value="G">G</SelectItem>
                                <SelectItem value="GG">GG</SelectItem>
                                <SelectItem value="GGG">GGG</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {item.peso || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {item.altura || "-"}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Campo de Observações Geral da Turma */}
      {selectedTurmaId && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Digite observações gerais sobre as becas desta turma..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
              className="w-full"
            />
            <Button
              onClick={handleSaveObservacoes}
              disabled={updateObservacoes.isPending}
              className="w-full sm:w-auto"
            >
              {updateObservacoes.isPending ? "Salvando..." : "Salvar Observações"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
