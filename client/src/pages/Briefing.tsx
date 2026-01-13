import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { LOGO_BASE64 } from "@/lib/logo";
import { formatTurmaCompleta } from "@/lib/formatTurma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Users, Calendar, Clock, FileSpreadsheet, FileText, Search, Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";

export default function Briefing() {
  const [selectedTurmaId, setSelectedTurmaId] = useState<number | null>(null);
  const [selectedEventoId, setSelectedEventoId] = useState<number | null>(null);
  const [selectedTipoEvento, setSelectedTipoEvento] = useState<string | null>(null);
  const [searchTurma, setSearchTurma] = useState("");
  const [showEventoSelector, setShowEventoSelector] = useState(false);
  const [showAddGrupoDialog, setShowAddGrupoDialog] = useState(false);
  const [showAddFormandoDialog, setShowAddFormandoDialog] = useState(false);
  const [selectedGrupoId, setSelectedGrupoId] = useState<number | null>(null);
  const [searchFormando, setSearchFormando] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Popup de confirmação para formando em múltiplos grupos
  const [showConfirmMultiGrupoDialog, setShowConfirmMultiGrupoDialog] = useState(false);
  const [pendingFormandoId, setPendingFormandoId] = useState<number | null>(null);
  const [pendingFormandoNome, setPendingFormandoNome] = useState("");

  // Novo grupo
  const [novoGrupoNumero, setNovoGrupoNumero] = useState(1);
  const [novoGrupoData, setNovoGrupoData] = useState("");
  const [novoGrupoHorario, setNovoGrupoHorario] = useState("");
  const [novoGrupoLimite, setNovoGrupoLimite] = useState(10);
  const [medidasBecaAtivo, setMedidasBecaAtivo] = useState(false);

  // Função para formatar nome do tipo de evento
  const formatTipoEvento = (tipo: string) => {
    const labels: Record<string, string> = {
      'foto_estudio': 'Foto Estúdio',
      'foto_descontrada': 'Foto Descontraída',
      'foto_oficial': 'Foto Oficial',
      'foto_50': 'Foto 50%',
      'colacao': 'Colação',
      'baile': 'Baile',
      'missa': 'Missa',
      'culto': 'Culto',
      'jantar': 'Jantar',
      'aula_saudade': 'Aula da Saudade',
    };
    return labels[tipo] || tipo;
  };

  // Queries
  const { data: turmas = [] } = trpc.turmas.list.useQuery();
  const { data: eventos = [] } = trpc.eventos.list.useQuery();
  const { data: turmasComBriefing = [] } = trpc.briefing.listTurmasComBriefing.useQuery();
  
  // Briefings existentes da turma (eventos que já têm grupos)
  const { data: briefingsExistentes = [] } = trpc.briefing.listBriefingsByTurma.useQuery(
    { turmaId: selectedTurmaId! },
    { enabled: !!selectedTurmaId }
  );
  
  // Buscar grupos e formandos por turma + tipo de evento
  const { data: grupos = [], refetch: refetchGrupos } = trpc.briefing.listGruposByTurmaETipo.useQuery(
    { turmaId: selectedTurmaId!, tipoEvento: selectedTipoEvento! },
    { enabled: !!selectedTurmaId && !!selectedTipoEvento }
  );
  const { data: formandosBriefing = [], refetch: refetchFormandos } = trpc.briefing.listFormandosByTurmaETipo.useQuery(
    { turmaId: selectedTurmaId!, tipoEvento: selectedTipoEvento! },
    { enabled: !!selectedTurmaId && !!selectedTipoEvento }
  );

  // Formandos da turma para adicionar
  const { data: formandosTurma = [] } = trpc.formandos.listByTurma.useQuery(
    { turmaId: selectedTurmaId! },
    { enabled: !!selectedTurmaId }
  );

  // Mutations
  const createGrupo = trpc.briefing.createGrupo.useMutation({
    onSuccess: () => {
      toast.success("Grupo criado com sucesso!");
      refetchGrupos();
      setShowAddGrupoDialog(false);
      resetNovoGrupo();
    },
    onError: (error) => {
      toast.error("Erro ao criar grupo: " + error.message);
    }
  });

  const updateGrupo = trpc.briefing.updateGrupo.useMutation({
    onSuccess: () => {
      toast.success("Grupo atualizado!");
      refetchGrupos();
    }
  });

  const deleteGrupo = trpc.briefing.deleteGrupo.useMutation({
    onSuccess: () => {
      toast.success("Grupo excluído!");
      refetchGrupos();
      refetchFormandos();
    }
  });

  const addFormando = trpc.briefing.addFormando.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Formando adicionado ao grupo!");
        refetchFormandos();
        setShowAddFormandoDialog(false);
        setSearchFormando("");
      } else {
        toast.error(result.error || "Erro ao adicionar formando");
      }
    }
  });

  const updateFormando = trpc.briefing.updateFormando.useMutation({
    onSuccess: () => {
      refetchFormandos();
    }
  });

  const importarPlanilha = trpc.briefing.importarPlanilha.useMutation({
    onSuccess: (resultado) => {
      // Verificar se é sucesso ou erro de validação
      if ('success' in resultado && !resultado.success) {
        // Erro de validação
        toast.error("Erro ao validar planilha");
        if (resultado.erros && resultado.erros.length > 0) {
          resultado.erros.forEach(erro => toast.error(erro));
        }
      } else if ('sucesso' in resultado) {
        // Resultado da importação
        if (resultado.sucesso) {
          toast.success(
            `Importação concluída! ${resultado.gruposCriados} grupos e ${resultado.formandosVinculados} formandos importados.`
          );
          if (resultado.formandosNaoEncontrados && resultado.formandosNaoEncontrados.length > 0) {
            toast.warning(
              `${resultado.formandosNaoEncontrados.length} formandos não foram encontrados na turma.`
            );
          }
          refetchGrupos();
          refetchFormandos();
          setShowImportDialog(false);
          setImportFile(null);
        } else {
          toast.error((resultado as any).erro || "Erro ao importar planilha");
        }
      }
      setImporting(false);
    },
    onError: (error) => {
      toast.error("Erro ao importar: " + error.message);
      setImporting(false);
    }
  });

  const removeFormando = trpc.briefing.removeFormando.useMutation({
    onSuccess: () => {
      toast.success("Formando removido do grupo!");
      refetchFormandos();
    }
  });

  const excluirBriefingMutation = trpc.briefing.excluirBriefingCompleto.useMutation({
    onSuccess: () => {
      refetchGrupos();
      refetchFormandos();
      // Recarregar lista de turmas com briefing
      trpc.useUtils().briefing.listTurmasComBriefing.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao excluir briefing: " + error.message);
    }
  });

  // Filtros
  const turmasFiltradas = useMemo(() => {
    if (!searchTurma) return turmas;
    const search = searchTurma.toLowerCase();
    return turmas.filter(t => 
      t.codigo?.toLowerCase().includes(search) ||
      (Array.isArray(t.cursos) ? t.cursos.some(c => String(c).toLowerCase().includes(search)) : false) ||
      (Array.isArray(t.instituicoes) ? t.instituicoes.some(i => String(i).toLowerCase().includes(search)) : false)
    );
  }, [turmas, searchTurma]);

  const eventosDaTurma = useMemo(() => {
    if (!selectedTurmaId) return [];
    return eventos.filter(e => e.turmaId === selectedTurmaId);
  }, [eventos, selectedTurmaId]);

  // Tipos de evento únicos da turma (sem duplicatas)
  const tiposEventoUnicos = useMemo(() => {
    if (!selectedTurmaId) return [];
    const tiposMap = new Map<string, typeof eventosDaTurma[0]>();
    eventosDaTurma.forEach(e => {
      if (e.tipoEvento && !tiposMap.has(e.tipoEvento)) {
        tiposMap.set(e.tipoEvento, e);
      }
    });
    return Array.from(tiposMap.values());
  }, [eventosDaTurma, selectedTurmaId]);

  const selectedTurma = turmas.find(t => t.id === selectedTurmaId);
  const selectedEvento = eventos.find(e => e.id === selectedEventoId);

  // Formandos disponíveis para adicionar (todos os formandos da turma)
  const formandosDisponiveis = useMemo(() => {
    if (!selectedTurmaId) return [];
    return formandosTurma
      .filter((f: typeof formandosTurma[0]) => f.turmaId === selectedTurmaId)
      .filter((f: typeof formandosTurma[0]) => {
        if (!searchFormando) return true;
        return f.nome?.toLowerCase().includes(searchFormando.toLowerCase()) ||
               f.cpf?.includes(searchFormando);
      });
  }, [formandosTurma, selectedTurmaId, searchFormando]);

  // Verificar se formando já está em algum grupo
  const formandoJaEmGrupo = (formandoId: number) => {
    return formandosBriefing.some((f: typeof formandosBriefing[0]) => f.formandoId === formandoId);
  };

  // Formandos por grupo
  const formandosPorGrupo = useMemo(() => {
    const map: Record<number, typeof formandosBriefing> = {};
    grupos.forEach(g => {
      map[g.id] = formandosBriefing.filter(f => f.grupoId === g.id);
    });
    return map;
  }, [grupos, formandosBriefing]);

  const turmasComBriefingAgrupadas = useMemo(() => {
    const map: Record<number, any[]> = {};
    turmasComBriefing.forEach((item: any) => {
      if (!map[item.turmaId]) {
        map[item.turmaId] = [];
      }
      map[item.turmaId].push(item);
    });
    return map;
  }, [turmasComBriefing]);

  const resetNovoGrupo = () => {
    const nextNumero = grupos.length > 0 ? Math.max(...grupos.map(g => g.numero)) + 1 : 1;
    setNovoGrupoNumero(nextNumero);
    setNovoGrupoData("");
    setNovoGrupoHorario("");
    setNovoGrupoLimite(10);
  };

  const handleCreateGrupo = () => {
    if (!selectedEventoId) return;
    // Criar data em UTC para evitar problemas de timezone
    let dataGrupoUTC: Date | undefined;
    if (novoGrupoData) {
      const [year, month, day] = novoGrupoData.split('-').map(Number);
      dataGrupoUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
    createGrupo.mutate({
      eventoId: selectedEventoId,
      numero: novoGrupoNumero,
      dataGrupo: dataGrupoUTC,
      horarioFormandos: novoGrupoHorario || undefined,
      limiteFormandos: novoGrupoLimite,
    });
  };

  const handleAddFormando = (formandoId: number, formandoNome: string) => {
    if (!selectedGrupoId || !selectedEventoId) return;
    
    // Verificar se formando já está em algum grupo
    if (formandoJaEmGrupo(formandoId)) {
      // Mostrar popup de confirmação
      setPendingFormandoId(formandoId);
      setPendingFormandoNome(formandoNome);
      setShowConfirmMultiGrupoDialog(true);
      return;
    }
    
    // Adicionar normalmente
    addFormando.mutate({
      grupoId: selectedGrupoId,
      eventoId: selectedEventoId,
      formandoId,
    });
  };

  const handleConfirmMultiGrupo = (realizaFotoGrupo: boolean) => {
    if (!selectedGrupoId || !selectedEventoId || !pendingFormandoId) return;
    
    if (realizaFotoGrupo) {
      // Adicionar com "Só Grupo" marcado
      addFormando.mutate({
        grupoId: selectedGrupoId,
        eventoId: selectedEventoId,
        formandoId: pendingFormandoId,
        somenteGrupo: true,
      });
    }
    // Se NÃO, apenas fecha o popup e volta para a tela
    
    // Limpar estados
    setShowConfirmMultiGrupoDialog(false);
    setPendingFormandoId(null);
    setPendingFormandoNome("");
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    // Corrigir bug de timezone: usar UTC para evitar mudança de dia
    const d = new Date(date);
    // Adicionar offset do timezone para compensar
    const utcDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return utcDate.toLocaleDateString("pt-BR");
  };

  // Função movida para @/lib/formatTurma.ts
  const formatTurmaLabel = formatTurmaCompleta;

  const exportarExcel = () => {
    if (!selectedEvento || grupos.length === 0) {
      toast.error("Selecione um evento com grupos para exportar");
      return;
    }

    const data: Record<string, string | number | boolean>[] = [];
    
    grupos.forEach(grupo => {
      const formandosDoGrupo = formandosPorGrupo[grupo.id] || [];
      formandosDoGrupo.forEach(f => {
        data.push({
          "Grupo": grupo.numero,
          "Data do Grupo": formatDate(grupo.dataGrupo),
          "Horário Formandos": grupo.horarioFormandos || "-",
          "Formando": f.formandoNome || "-",
          "Pacote": f.formandoPacote || "-",
          "Horário Família Sem Serviço": f.horarioFamiliaSemServico || "-",
          "Horário Família com Serviço": f.horarioFamiliaComServico || "-",
          "Maquiagem Formando": f.makeFormando ? "Sim" : "Não",
          "Maquiagem Família/Convidados": f.qtdMakeFamilia || 0,
          "Cabelo Simples": f.qtdCabeloSimples || 0,
          "Cabelo Combinado": f.qtdCabeloCombinado || 0,
          "Quantidade de Família/Convidados": f.qtdFamilia || 0,
          "Quantidade de Pets": f.qtdPets || 0,
          "Só Grupo": f.somenteGrupo ? "Sim" : "Não",
        });
      });
    });

    if (data.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Briefing");
    
    const fileName = `Briefing_${selectedTurma?.codigo || "turma"}_${selectedEvento?.tipoEvento || "evento"}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Arquivo Excel exportado com sucesso!");
  };

  // Função para exportar PDF (usando impressão do navegador)
  const handleExportPDF = () => {
    if (!selectedEvento || grupos.length === 0) {
      toast.error("Selecione um evento com grupos para exportar");
      return;
    }

    // Criar conteúdo HTML para impressão
    let htmlContent = `
      <html>
      <head>
        <title>Briefing - ${selectedTurma?.codigo || ""} - ${selectedEvento?.tipoEvento || ""}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
          .logo { height: 60px; width: auto; }
          h1 { font-size: 18px; margin: 0 0 5px 0; }
          h2 { font-size: 14px; color: #666; margin: 0; }
          h3 { font-size: 14px; margin: 15px 0 10px; background: #f0f0f0; padding: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background: #f5f5f5; font-weight: bold; }
          .info { display: flex; gap: 20px; margin-bottom: 10px; font-size: 12px; }
          .info span { background: #f0f0f0; padding: 4px 8px; border-radius: 4px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${LOGO_BASE64}" class="logo" />
          <div>
            <h1>Briefing do Evento</h1>
            <h2>Turma: ${selectedTurma?.codigo || "-"} | Evento: ${selectedEvento?.tipoEvento || "-"} - ${formatDate(selectedEvento?.dataEvento)}</h2>
          </div>
        </div>
    `;

    grupos.forEach(grupo => {
      const formandosDoGrupo = formandosPorGrupo[grupo.id] || [];
      htmlContent += `
        <h3>Grupo ${grupo.numero}</h3>
        <div class="info">
          <span>Data: ${formatDate(grupo.dataGrupo)}</span>
          <span>Horário Formandos: ${grupo.horarioFormandos || "-"}</span>
          <span>Limite: ${grupo.limiteFormandos || 10} formandos</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Formando</th>
              <th>Pacote</th>
              <th>Hr Fam. S/Serv.</th>
              <th>Hr Fam. Serv.</th>
              <th>Make Form.</th>
              <th>Make Fam.</th>
              <th>Cab. Simples</th>
              <th>Cab. Comb.</th>
              <th>Qtd Fam.</th>
              <th>Pets</th>
              <th>Só Grupo</th>
            </tr>
          </thead>
          <tbody>
      `;

      if (formandosDoGrupo.length === 0) {
        htmlContent += `<tr><td colspan="11" style="text-align: center; color: #999;">Nenhum formando neste grupo</td></tr>`;
      } else {
        formandosDoGrupo.forEach(f => {
          htmlContent += `
            <tr>
              <td>${f.formandoNome || "-"}</td>
              <td>${f.formandoPacote || "-"}</td>
              <td>${f.horarioFamiliaSemServico || "-"}</td>
              <td>${f.horarioFamiliaComServico || "-"}</td>
              <td>${f.makeFormando ? "Sim" : "Não"}</td>
              <td>${f.qtdMakeFamilia || 0}</td>
              <td>${f.qtdCabeloSimples || 0}</td>
              <td>${f.qtdCabeloCombinado || 0}</td>
              <td>${f.qtdFamilia || 0}</td>
              <td>${f.qtdPets || 0}</td>
              <td>${f.somenteGrupo ? "Sim" : "Não"}</td>
            </tr>
          `;
        });
      }

      htmlContent += `</tbody></table>`;
    });

    htmlContent += `</body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      toast.error("Não foi possível abrir a janela de impressão");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Briefing do Evento</h1>
          <p className="text-muted-foreground">Gerencie os grupos e formandos por evento</p>
        </div>
      </div>

      {/* Box: Turmas com Briefing Criado */}
      {turmasComBriefing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Turmas com Briefing Criado ({turmasComBriefing.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turma</TableHead>
                    <TableHead>Tipo de Evento</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turmasComBriefing.map((item: any, idx: number) => {
                    const turmaNome = item.turmaCodigo ? item.turmaCodigo : 'Turma';
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{turmaNome}</TableCell>
                        <TableCell>{formatTipoEvento(item.tipoEvento)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                toast.info(`Abrindo briefing...`);
                                
                                // Buscar turma pelo ID
                                const turma = turmas.find(t => t.id === item.turmaId);
                                
                                if (!turma) {
                                  toast.error(`Turma ID ${item.turmaId} não encontrada`);
                                  return;
                                }
                                
                                setSelectedTurmaId(turma.id);
                                
                                // Buscar evento correspondente
                                const evento = eventos.find(e => e.turmaId === turma.id && e.tipoEvento === item.tipoEvento);
                                
                                if (!evento) {
                                  toast.error(`Evento ${formatTipoEvento(item.tipoEvento)} não encontrado`);
                                  return;
                                }
                                
                                setSelectedEventoId(evento.id);
                                toast.success(`Briefing carregado!`);
                              }}
                            >
                              Abrir
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (!confirm(`Tem certeza que deseja excluir o briefing da turma ${turmaNome} - ${formatTipoEvento(item.tipoEvento)}? Esta ação não pode ser desfeita.`)) {
                                  return;
                                }
                                
                                try {
                                  // Buscar evento correspondente
                                  const evento = eventos.find(e => e.turmaId === item.turmaId && e.tipoEvento === item.tipoEvento);
                                  
                                  if (!evento) {
                                    toast.error(`Evento não encontrado`);
                                    return;
                                  }
                                  
                                  await excluirBriefingMutation.mutateAsync({
                                    eventoId: evento.id,
                                    turmaId: item.turmaId,
                                  });
                                  
                                  toast.success(`Briefing excluído com sucesso!`);
                                } catch (error: any) {
                                  toast.error(error.message || 'Erro ao excluir briefing');
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Busca de Turma */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar turma por código ou curso..."
            value={searchTurma}
            onChange={(e) => setSearchTurma(e.target.value)}
            className="pl-10 w-full max-w-2xl"
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
                  setSelectedEventoId(null);
                  setSelectedTipoEvento(null);
                  setShowEventoSelector(true);
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
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {formatTurmaLabel(turmas.find(t => t.id === selectedTurmaId)!)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTurmaId(null);
                setSelectedEventoId(null);
                setSelectedTipoEvento(null);
                setSearchTurma("");
              }}
            >
              Limpar
            </Button>
          </div>
        )}
      </div>

      {/* Seleção de Evento (tipos únicos sem datas) */}
      {selectedTurmaId && !selectedTipoEvento && (
        <div className="mb-6">
          <Label className="text-sm font-medium mb-3 block">Selecione o Tipo de Evento</Label>
          <div className="flex flex-wrap gap-3">
            {tiposEventoUnicos.map((evento) => {
              const briefingExistente = briefingsExistentes.find(b => b.tipoEvento === evento.tipoEvento);
              return (
                <Card 
                  key={evento.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    briefingExistente ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''
                  }`}
                  onClick={() => {
                    setSelectedEventoId(evento.id);
                    setSelectedTipoEvento(evento.tipoEvento);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="font-medium">{formatTipoEvento(evento.tipoEvento)}</div>
                    {briefingExistente && (
                      <div className="text-xs text-green-600 mt-1">
                        {briefingExistente.qtdGrupos} grupos · {briefingExistente.qtdFormandos} formandos
                      </div>
                    )}
                    {!briefingExistente && (
                      <div className="text-xs text-muted-foreground mt-1">Novo briefing</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Informações da Turma e Evento selecionados */}
      {selectedTurma && selectedTipoEvento && (
        <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
          <span>Turma: <strong>{selectedTurma.codigo}</strong></span>
          <span>Evento: <strong>{formatTipoEvento(selectedTipoEvento)}</strong></span>
          <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50" onClick={() => {
            setSelectedEventoId(null);
            setSelectedTipoEvento(null);
          }}>
            Trocar Evento
          </Button>
        </div>
      )}

      {/* Grupos */}
      {selectedEventoId && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Grupos ({grupos.length})
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportarExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Planilha
              </Button>
              <Button onClick={() => { resetNovoGrupo(); setShowAddGrupoDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Grupo
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {grupos.map((grupo) => (
              <Card key={grupo.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Grupo {grupo.numero}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {formandosPorGrupo[grupo.id]?.length || 0}/{grupo.limiteFormandos || 10}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          if (confirm("Excluir este grupo e todos os formandos?")) {
                            deleteGrupo.mutate({ id: grupo.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Campos do Admin */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Data do Grupo</Label>
                      <Input
                        type="date"
                        value={grupo.dataGrupo ? (() => {
                          const d = new Date(grupo.dataGrupo);
                          // Compensar timezone para exibir data correta
                          const utcDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
                          return utcDate.toISOString().split("T")[0];
                        })() : ""}
                        onChange={(e) => {
                          if (e.target.value) {
                            // Criar data em UTC para evitar problemas de timezone
                            const [year, month, day] = e.target.value.split('-').map(Number);
                            const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
                            updateGrupo.mutate({
                              id: grupo.id,
                              dataGrupo: utcDate,
                            });
                          } else {
                            updateGrupo.mutate({
                              id: grupo.id,
                              dataGrupo: null,
                            });
                          }
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Horário Formandos</Label>
                      <Input
                        type="text"
                        placeholder=""
                        value={grupo.horarioFormandos || ""}
                        onChange={(e) => {
                          // Aceita formato com ou sem dois pontos (830 ou 08:00)
                          let value = e.target.value;
                          // Remove caracteres não numéricos exceto dois pontos
                          value = value.replace(/[^0-9:]/g, '');
                          // Limita a 5 caracteres (00:00)
                          if (value.length > 5) value = value.slice(0, 5);
                          updateGrupo.mutate({
                            id: grupo.id,
                            horarioFormandos: value || null,
                          });
                        }}
                        className="h-8 text-sm w-24"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Limite</Label>
                      <Input
                        type="number"
                        value={grupo.limiteFormandos || 10}
                        onChange={(e) => updateGrupo.mutate({
                          id: grupo.id,
                          limiteFormandos: Number(e.target.value),
                        })}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Tabela de Formandos */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                        <TableRow className="bg-white">
                          <TableHead className="text-xs py-2">Formando</TableHead>
                          <TableHead className="text-xs py-2 w-20">Pacote</TableHead>
                          <TableHead className="text-xs py-2 w-32">Horário Família Sem Serviço</TableHead>
                          <TableHead className="text-xs py-2 w-32">Horário Família com Serviço</TableHead>
                          <TableHead className="text-xs py-2 w-32 text-center">Maquiagem Formando</TableHead>
                          <TableHead className="text-xs py-2 w-32 text-center">Maquiagem Família/Convidados</TableHead>
                          <TableHead className="text-xs py-2 w-32 text-center">Cabelo Simples</TableHead>
                          <TableHead className="text-xs py-2 w-32 text-center">Cabelo Combinado</TableHead>
                          <TableHead className="text-xs py-2 w-32 text-center">Quantidade de Família/Convidados</TableHead>
                          <TableHead className="text-xs py-2 w-32 text-center">Quantidade de Pets</TableHead>
                          {medidasBecaAtivo && (
                            <>
                              <TableHead className="text-xs py-2 w-20 text-center">Peso</TableHead>
                              <TableHead className="text-xs py-2 w-20 text-center">Altura</TableHead>
                            </>
                          )}
                          <TableHead className="text-xs py-2 w-24 text-center">Só Grupo</TableHead>
                          <TableHead className="text-xs py-2 w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formandosPorGrupo[grupo.id]?.map((f: typeof formandosBriefing[0]) => (
                          <TableRow key={f.id}>
                            <TableCell className="py-1 text-xs font-medium">{f.formandoNome}</TableCell>
                            <TableCell className="py-1 text-xs">{f.formandoPacote || "-"}</TableCell>
                            <TableCell className="py-1">
                              <Input
                                type="text"
                                placeholder=""
                                value={f.horarioFamiliaSemServico || ""}
                                onChange={(e) => {
                                  let value = e.target.value;
                                  // Remove tudo exceto números e ":"
                                  value = value.replace(/[^0-9:]/g, '');
                                  
                                  // Se não tem ":", formata automaticamente
                                  if (!value.includes(':') && value.length >= 3) {
                                    // Ex: "830" → "08:30", "930" → "09:30"
                                    const hours = value.slice(0, -2).padStart(2, '0');
                                    const minutes = value.slice(-2);
                                    value = `${hours}:${minutes}`;
                                  }
                                  
                                  // Limita a 5 caracteres (HH:MM)
                                  value = value.slice(0, 5);
                                  
                                  updateFormando.mutate({
                                    id: f.id,
                                    horarioFamiliaSemServico: value || null,
                                  });
                                }}
                                className="h-6 text-xs w-20"
                              />
                            </TableCell>
                            <TableCell className="py-1">
                              <Input
                                type="text"
                                placeholder=""
                                value={f.horarioFamiliaComServico || ""}
                                onChange={(e) => {
                                  let value = e.target.value;
                                  // Remove tudo exceto números e ":"
                                  value = value.replace(/[^0-9:]/g, '');
                                  
                                  // Se não tem ":", formata automaticamente
                                  if (!value.includes(':') && value.length >= 3) {
                                    // Ex: "830" → "08:30", "930" → "09:30"
                                    const hours = value.slice(0, -2).padStart(2, '0');
                                    const minutes = value.slice(-2);
                                    value = `${hours}:${minutes}`;
                                  }
                                  
                                  // Limita a 5 caracteres (HH:MM)
                                  value = value.slice(0, 5);
                                  
                                  updateFormando.mutate({
                                    id: f.id,
                                    horarioFamiliaComServico: value || null,
                                  });
                                }}
                                className="h-6 text-xs w-20"
                              />
                            </TableCell>
                            <TableCell className="py-1 text-center">
                              <Checkbox
                                checked={f.makeFormando || false}
                                onCheckedChange={(v) => updateFormando.mutate({
                                  id: f.id,
                                  makeFormando: !!v,
                                })}
                              />
                            </TableCell>
                            <TableCell className="py-1 text-center">
                              <Select
                                value={String(f.qtdMakeFamilia || 0)}
                                onValueChange={(v) => updateFormando.mutate({
                                  id: f.id,
                                  qtdMakeFamilia: Number(v),
                                })}
                              >
                                <SelectTrigger className="h-6 text-xs w-16">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(n => (
                                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="py-1 text-center">
                              <Select
                                value={String(f.qtdCabeloSimples || 0)}
                                onValueChange={(v) => updateFormando.mutate({
                                  id: f.id,
                                  qtdCabeloSimples: Number(v),
                                })}
                              >
                                <SelectTrigger className="h-6 text-xs w-16">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(n => (
                                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="py-1 text-center">
                              <Select
                                value={String(f.qtdCabeloCombinado || 0)}
                                onValueChange={(v) => updateFormando.mutate({
                                  id: f.id,
                                  qtdCabeloCombinado: Number(v),
                                })}
                              >
                                <SelectTrigger className="h-6 text-xs w-16">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(n => (
                                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="py-1 text-center">
                              <Select
                                value={String(f.qtdFamilia || 0)}
                                onValueChange={(v) => updateFormando.mutate({
                                  id: f.id,
                                  qtdFamilia: Number(v),
                                })}
                              >
                                <SelectTrigger className="h-6 text-xs w-16">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(n => (
                                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="py-1 text-center">
                              <Select
                                value={String(f.qtdPets || 0)}
                                onValueChange={(v) => updateFormando.mutate({
                                  id: f.id,
                                  qtdPets: Number(v),
                                })}
                              >
                                <SelectTrigger className="h-6 text-xs w-16">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(n => (
                                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            {medidasBecaAtivo && (
                              <>
                                <TableCell className="py-1">
                                  <Input
                                    type="text"
                                    placeholder="Ex: 70kg"
                                    value={f.peso || ""}
                                    onChange={(e) => updateFormando.mutate({
                                      id: f.id,
                                      peso: e.target.value || null,
                                    })}
                                    className="h-6 text-xs w-20"
                                  />
                                </TableCell>
                                <TableCell className="py-1">
                                  <Input
                                    type="text"
                                    placeholder="Ex: 1.75m"
                                    value={f.altura || ""}
                                    onChange={(e) => updateFormando.mutate({
                                      id: f.id,
                                      altura: e.target.value || null,
                                    })}
                                    className="h-6 text-xs w-20"
                                  />
                                </TableCell>
                              </>
                            )}
                            <TableCell className="py-1 text-center">
                              <Checkbox
                                checked={f.somenteGrupo || false}
                                onCheckedChange={(v) => updateFormando.mutate({
                                  id: f.id,
                                  somenteGrupo: !!v,
                                })}
                              />
                            </TableCell>
                            <TableCell className="py-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => removeFormando.mutate({ id: f.id })}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!formandosPorGrupo[grupo.id] || formandosPorGrupo[grupo.id].length === 0) && (
                          <TableRow>
                            <TableCell colSpan={11} className="text-center text-muted-foreground py-4 text-sm">
                              Nenhum formando neste grupo
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Botão adicionar formando */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedGrupoId(grupo.id);
                      setShowAddFormandoDialog(true);
                    }}
                    disabled={(formandosPorGrupo[grupo.id]?.length || 0) >= (grupo.limiteFormandos || 10)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Formando
                  </Button>
                </CardContent>
              </Card>
            ))}

            {grupos.length === 0 && (
              <Card className="col-span-2">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mb-4" />
                  <p>Nenhum grupo criado para este evento</p>
                  <Button className="mt-4" onClick={() => { resetNovoGrupo(); setShowAddGrupoDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Grupo
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Dialog Adicionar Grupo */}
      <Dialog open={showAddGrupoDialog} onOpenChange={setShowAddGrupoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número do Grupo</Label>
                <Input
                  type="number"
                  value={novoGrupoNumero}
                  onChange={(e) => setNovoGrupoNumero(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Limite de Formandos</Label>
                <Input
                  type="number"
                  value={novoGrupoLimite}
                  onChange={(e) => setNovoGrupoLimite(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data do Grupo</Label>
              <Input
                type="date"
                value={novoGrupoData}
                onChange={(e) => setNovoGrupoData(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Horário dos Formandos</Label>
              <Input
                placeholder=""
                value={novoGrupoHorario}
                onChange={(e) => {
                  // Aceita formato com ou sem dois pontos
                  let value = e.target.value;
                  value = value.replace(/[^0-9:]/g, '');
                  if (value.length > 5) value = value.slice(0, 5);
                  setNovoGrupoHorario(value);
                }}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="medidas-beca"
                checked={medidasBecaAtivo}
                onCheckedChange={(checked) => setMedidasBecaAtivo(!!checked)}
              />
              <Label htmlFor="medidas-beca" className="cursor-pointer">Medidas Beca</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGrupoDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGrupo} disabled={createGrupo.isPending}>
              {createGrupo.isPending ? "Criando..." : "Criar Grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar Formando */}
      <Dialog open={showAddFormandoDialog} onOpenChange={setShowAddFormandoDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Adicionar Formando ao Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar formando por nome ou CPF..."
                value={searchFormando}
                onChange={(e) => setSearchFormando(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                  <TableRow className="bg-white">
                    <TableHead className="w-[45%] py-3">Nome</TableHead>
                    <TableHead className="w-[20%] py-3">CPF</TableHead>
                    <TableHead className="w-[15%] py-3">Pacote</TableHead>
                    <TableHead className="w-[20%] py-3 text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formandosDisponiveis.map((f: typeof formandosTurma[0]) => (
                    <TableRow key={f.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium py-3">{f.nome}</TableCell>
                      <TableCell className="py-3 text-muted-foreground">{f.cpf}</TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="font-normal">
                          {f.pacote || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleAddFormando(f.id, f.nome || '')}
                          disabled={addFormando.isPending}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {formandosDisponiveis.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                        {searchFormando ? "Nenhum formando encontrado" : "Todos os formandos já estão em grupos"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFormandoDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Importação de Planilha */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Planilha de Briefing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selecione o arquivo Excel (.xlsx)</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setImportFile(file);
                }}
                disabled={importing}
              />
            </div>
            {importFile && (
              <div className="text-sm text-muted-foreground">
                Arquivo selecionado: <strong>{importFile.name}</strong>
              </div>
            )}
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Atenção:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>A planilha deve conter as colunas corretas</li>
                <li>Os nomes dos formandos devem estar exatamente como cadastrados</li>
                <li>Grupos e formandos serão criados automaticamente</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportFile(null);
              }}
              disabled={importing}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!importFile || !selectedEventoId || !selectedTurmaId) {
                  toast.error("Selecione um arquivo e um evento");
                  return;
                }
                
                setImporting(true);
                
                try {
                  // Processar arquivo Excel diretamente no frontend
                  const arrayBuffer = await importFile.arrayBuffer();
                  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
                  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                  
                  // Converter para JSON
                  const dados: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });
                  
                  if (dados.length === 0) {
                    toast.error("Planilha vazia ou sem dados");
                    setImporting(false);
                    return;
                  }
                  
                  // Enviar dados processados para o backend
                  importarPlanilha.mutate({
                    eventoId: selectedEventoId,
                    turmaId: selectedTurmaId,
                    dados: dados,
                  });
                } catch (error: any) {
                  toast.error("Erro ao ler arquivo: " + error.message);
                  setImporting(false);
                }
              }}
              disabled={!importFile || importing}
            >
              {importing ? "Importando..." : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação para formando em múltiplos grupos */}
      <Dialog open={showConfirmMultiGrupoDialog} onOpenChange={setShowConfirmMultiGrupoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Formando já cadastrado</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              O formando(a) <strong>{pendingFormandoNome}</strong> já está cadastrado em um grupo.
            </p>
            <p className="text-sm font-medium">
              O formando(a) irá realizar foto de grupo?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => handleConfirmMultiGrupo(false)}
            >
              NÃO
            </Button>
            <Button 
              onClick={() => handleConfirmMultiGrupo(true)}
            >
              SIM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
