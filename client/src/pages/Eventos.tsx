import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { formatTurmaCompleta, parseJsonArray as parseJsonArrayUtil } from "@/lib/formatTurma";
import { usePermissoes } from "@/hooks/usePermissoes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

import { Plus, Calendar, List, Check, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, ChevronsUpDown, Search, Trash2, MapPin } from "lucide-react";
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

// Helper movido para @/lib/formatTurma.ts
const parseJsonArray = parseJsonArrayUtil;

const TIPOS_EVENTO = [
  { value: "foto_estudio", label: "Foto Estúdio", short: "Estúdio" },
  { value: "foto_50", label: "Foto 50%", short: "50%" },
  { value: "foto_descontrada", label: "Foto Descontraída", short: "Descontraída" },
  { value: "foto_oficial", label: "Foto Oficial", short: "Oficial" },
  { value: "foto_bloco", label: "Foto Bloco", short: "Bloco" },
  { value: "foto_samu", label: "Foto Samu", short: "Samu" },
  { value: "foto_consultorio", label: "Foto Consultório", short: "Consultório" },
];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

type SortField = "codigo" | "cidade" | "curso" | null;
type SortDirection = "asc" | "desc" | null;

// Função movida para @/lib/formatTurma.ts
const formatDadosTurma = formatTurmaCompleta;

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

// Cria uma data local a partir de componentes UTC
function createLocalFromUTC(date: Date | string): Date {
  const parts = getLocalDateParts(date);
  return new Date(parts.year, parts.month, parts.day, 12, 0, 0);
}

// Formata período de datas (usando UTC para evitar problemas de timezone)
function formatPeriodoDatas(dataInicio: Date | null, dataFim: Date | null): string {
  if (!dataInicio) return "";
  
  const inicioP = getLocalDateParts(dataInicio);
  const diaInicio = inicioP.day.toString().padStart(2, "0");
  const mesInicio = (inicioP.month + 1).toString().padStart(2, "0");
  const anoInicio = inicioP.year;
  
  if (!dataFim) {
    return `${diaInicio}/${mesInicio}/${anoInicio}`;
  }
  
  const fimP = getLocalDateParts(dataFim);
  const diaFim = fimP.day.toString().padStart(2, "0");
  const mesFim = (fimP.month + 1).toString().padStart(2, "0");
  const anoFim = fimP.year;
  
  // Se são datas sequenciais ou mesmo mês/ano
  if (mesInicio === mesFim && anoInicio === anoFim) {
    if (diaInicio === diaFim) {
      return `${diaInicio}/${mesInicio}/${anoInicio}`;
    }
    return `${diaInicio} a ${diaFim}/${mesInicio}/${anoInicio}`;
  }
  
  return `${diaInicio}/${mesInicio}/${anoInicio} a ${diaFim}/${mesFim}/${anoFim}`;
}

export default function Eventos() {
  const [activeTab, setActiveTab] = useState("calendario");
  const [calendarView, setCalendarView] = useState<"calendar" | "list">("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<any>(null);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>("");
  const [selectedTipoEvento, setSelectedTipoEvento] = useState<string>("");
  const [turmaPopoverOpen, setTurmaPopoverOpen] = useState(false);
  const [turmaBusca, setTurmaBusca] = useState("");
  const [localPopoverOpen, setLocalPopoverOpen] = useState(false);
  const [localBusca, setLocalBusca] = useState("");
  const [selectedLocal, setSelectedLocal] = useState<string>("");
  const [cenariosSelecionados, setCenariosSelecionados] = useState<number[]>([]);
  const [fotografosSelecionados, setFotografosSelecionados] = useState<number[]>([]);
  const [cerimoniaisSelecionados, setCerimoniaisSelecionados] = useState<number[]>([]);
  const [coordenadoresSelecionados, setCoordenadoresSelecionados] = useState<number[]>([]);
  const [producaoSelecionados, setProducaoSelecionados] = useState<number[]>([]);
  const [maquiadorasSelecionadas, setMaquiadorasSelecionadas] = useState<number[]>([]);
  const [buscaTurma, setBuscaTurma] = useState("");
  const [todosMeses, setTodosMeses] = useState(false);
  const [todosAnos, setTodosAnos] = useState(false);
  const [buscaFotografo, setBuscaFotografo] = useState("");
  const [buscaCerimonial, setBuscaCerimonial] = useState("");
  const [buscaCoordenacao, setBuscaCoordenacao] = useState("");
  const [buscaProducao, setBuscaProducao] = useState("");
  const [buscaMaquiadora, setBuscaMaquiadora] = useState("");
  const [observacao, setObservacao] = useState("");
  const [horarioPadrao, setHorarioPadrao] = useState("");
  const [usarHorarioPadrao, setUsarHorarioPadrao] = useState(true);
  const [horariosIndividuais, setHorariosIndividuais] = useState<{[data: string]: string}>({});
  


  // Permissões
  const { temPermissao } = usePermissoes();
  const podeInserir = temPermissao("eventos", "inserir");
  const podeExcluir = temPermissao("eventos", "excluir");

  const { data: eventos, isLoading, refetch } = trpc.eventos.list.useQuery();
  const { data: turmas } = trpc.turmas.list.useQuery();
  const { data: locais, refetch: refetchLocais } = trpc.locais.list.useQuery();
  const { data: fornecedores } = trpc.fornecedores.list.useQuery();
  const { data: tiposCenario } = trpc.tiposCenario.list.useQuery();
  const { data: tiposServicoData } = trpc.tiposServico.list.useQuery();
  const { data: configsMaquiagem } = trpc.configMaquiagemTurma.list.useQuery();
  
  // Encontrar os IDs dos tipos de serviço relacionados a fotógrafo
  const tiposFotografoIds = tiposServicoData?.filter((t: any) => {
    const nome = t.nome?.toLowerCase() || '';
    // Buscar especificamente "Mão de Obra - Fotógrafo" ou variações
    return nome.includes('fotógrafo') || nome.includes('fotografo');
  }).map((t: any) => t.id) || [];
  
  // Encontrar os IDs dos tipos de serviço relacionados a cerimonial
  const tiposCerimonialIds = tiposServicoData?.filter((t: any) => {
    const nome = t.nome?.toLowerCase() || '';
    return nome.includes('cerimonial');
  }).map((t: any) => t.id) || [];
  
  // Filtrar apenas fotógrafos (fornecedores com tipo de serviço contendo o ID do tipo Fotógrafo)
  const fotografos = fornecedores?.filter((f: any) => {
    const tiposServico = f.tiposServico ? JSON.parse(f.tiposServico) : [];
    // Verificar se algum dos IDs corresponde ao tipo Fotógrafo
    return tiposServico.some((t: any) => {
      const tipoId = typeof t === 'string' ? parseInt(t) : t;
      // Verificar pelo ID ou pelo nome (para compatibilidade)
      if (tiposFotografoIds.includes(tipoId)) return true;
      // Verificar se é string e contém "fotógrafo"
      if (typeof t === 'string' && isNaN(parseInt(t))) {
        return t.toLowerCase().includes('fotógrafo') || t.toLowerCase().includes('fotografo');
      }
      return false;
    });
  }) || [];
  
  // Filtrar apenas cerimoniais (fornecedores com tipo de serviço contendo o ID do tipo Cerimonial)
  const cerimoniais = fornecedores?.filter((f: any) => {
    const tiposServico = f.tiposServico ? JSON.parse(f.tiposServico) : [];
    return tiposServico.some((t: any) => {
      const tipoId = typeof t === 'string' ? parseInt(t) : t;
      if (tiposCerimonialIds.includes(tipoId)) return true;
      if (typeof t === 'string' && isNaN(parseInt(t))) {
        return t.toLowerCase().includes('cerimonial');
      }
      return false;
    });
  }) || [];
  
  // Encontrar os IDs dos tipos de serviço relacionados a coordenação
  const tiposCoordenacaoIds = tiposServicoData?.filter((t: any) => {
    const nome = t.nome?.toLowerCase() || '';
    return nome.includes('coordenação') || nome.includes('coordenacao');
  }).map((t: any) => t.id) || [];
  
  // Encontrar os IDs dos tipos de serviço relacionados a produção
  const tiposProducaoIds = tiposServicoData?.filter((t: any) => {
    const nome = t.nome?.toLowerCase() || '';
    return nome.includes('produção') || nome.includes('producao');
  }).map((t: any) => t.id) || [];
  
  // Filtrar apenas coordenadores (fornecedores com tipo de serviço contendo o ID do tipo Coordenação)
  const coordenadores = fornecedores?.filter((f: any) => {
    const tiposServico = f.tiposServico ? JSON.parse(f.tiposServico) : [];
    return tiposServico.some((t: any) => {
      const tipoId = typeof t === 'string' ? parseInt(t) : t;
      if (tiposCoordenacaoIds.includes(tipoId)) return true;
      if (typeof t === 'string' && isNaN(parseInt(t))) {
        return t.toLowerCase().includes('coordenação') || t.toLowerCase().includes('coordenacao');
      }
      return false;
    });
  }) || [];
  
  // Filtrar apenas produção (fornecedores com tipo de serviço contendo o ID do tipo Produção)
  const producao = fornecedores?.filter((f: any) => {
    const tiposServico = f.tiposServico ? JSON.parse(f.tiposServico) : [];
    return tiposServico.some((t: any) => {
      const tipoId = typeof t === 'string' ? parseInt(t) : t;
      if (tiposProducaoIds.includes(tipoId)) return true;
      if (typeof t === 'string' && isNaN(parseInt(t))) {
        return t.toLowerCase().includes('produção') || t.toLowerCase().includes('producao');
      }
      return false;
    });
  }) || [];
  
  // Encontrar os IDs dos tipos de serviço relacionados a maquiagem
  const tiposMaquiagemIds = tiposServicoData?.filter((t: any) => {
    const nome = t.nome?.toLowerCase() || '';
    return nome.includes('maquiagem') || nome.includes('maquiadora') || nome.includes('make');
  }).map((t: any) => t.id) || [];
  
  // Filtrar apenas maquiadoras (fornecedores com tipo de serviço contendo o ID do tipo Maquiagem)
  const maquiadoras = fornecedores?.filter((f: any) => {
    const tiposServico = f.tiposServico ? JSON.parse(f.tiposServico) : [];
    return tiposServico.some((t: any) => {
      const tipoId = typeof t === 'string' ? parseInt(t) : t;
      if (tiposMaquiagemIds.includes(tipoId)) return true;
      if (typeof t === 'string' && isNaN(parseInt(t))) {
        return t.toLowerCase().includes('maquiagem') || t.toLowerCase().includes('maquiadora') || t.toLowerCase().includes('make');
      }
      return false;
    });
  }) || [];

  const createMutation = trpc.eventos.create.useMutation({
    onSuccess: () => {
      toast.success("Evento criado com sucesso!");
      setIsOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar evento: ${error.message}`);
    },
  });

  const updateMutation = trpc.eventos.update.useMutation({
    onSuccess: () => {
      toast.success("Evento atualizado com sucesso!");
      setEditingEvento(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar evento: ${error.message}`);
    },
  });

  const deleteMutation = trpc.eventos.delete.useMutation({
    onSuccess: () => {
      toast.success("Evento excluído com sucesso!");
      setEditingEvento(null);
      setIsOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir evento: ${error.message}`);
    },
  });

  const createLocalMutation = trpc.locais.create.useMutation({
    onSuccess: () => {
      toast.success("Local criado com sucesso!");
      refetchLocais();
    },
    onError: (error) => {
      toast.error(`Erro ao criar local: ${error.message}`);
    },
  });

  const handleCreateLocal = (nome: string) => {
    if (!nome.trim()) return;
    createLocalMutation.mutate({ nome: nome.trim() }, {
      onSuccess: () => {
        setSelectedLocal(nome.trim());
        setLocalPopoverOpen(false);
        setLocalBusca("");
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este evento?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dataInicioStr = formData.get("dataInicio") as string;
    const dataFimStr = formData.get("dataFim") as string;
    
    const turmaIdValue = selectedTurmaId || editingEvento?.turmaId?.toString();
    if (!turmaIdValue) {
      toast.error("Selecione uma turma");
      return;
    }
    
    const tipoEventoValue = selectedTipoEvento || editingEvento?.tipoEvento;
    if (!tipoEventoValue) {
      toast.error("Selecione o tipo de evento");
      return;
    }
    
    // Ao criar Date a partir de "YYYY-MM-DD", o JavaScript interpreta como UTC meia-noite
    // Precisamos criar a data no fuso horário local para evitar o problema de "um dia antes"
    const parseLocalDate = (dateStr: string): Date | undefined => {
      if (!dateStr) return undefined;
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day, 12, 0, 0); // Meio-dia para evitar problemas de timezone
    };
    
    const data = {
      turmaId: parseInt(turmaIdValue),
      tipoEvento: tipoEventoValue as any,
      dataEvento: formData.get("dataInicio") ? parseLocalDate(formData.get("dataInicio") as string) : undefined,
      dataEventoFim: formData.get("dataFim") ? parseLocalDate(formData.get("dataFim") as string) : undefined,
      local: selectedLocal || undefined,
      cenarios: cenariosSelecionados.length > 0 ? JSON.stringify(cenariosSelecionados) : undefined,
      fotografos: fotografosSelecionados.length > 0 ? JSON.stringify(fotografosSelecionados) : undefined,
      cerimoniais: cerimoniaisSelecionados.length > 0 ? JSON.stringify(cerimoniaisSelecionados) : undefined,
      coordenadores: coordenadoresSelecionados.length > 0 ? JSON.stringify(coordenadoresSelecionados) : undefined,
      producao: producaoSelecionados.length > 0 ? JSON.stringify(producaoSelecionados) : undefined,
      maquiadoras: maquiadorasSelecionadas.length > 0 ? JSON.stringify(maquiadorasSelecionadas) : undefined,
      horariosInicio: (() => {
        if (!dataInicioStr) return undefined;
        
        const horarios: {data: string, horario: string}[] = [];
        const inicio = parseLocalDate(dataInicioStr);
        const fim = dataFimStr ? parseLocalDate(dataFimStr) : inicio;
        
        if (!inicio || !fim) return undefined;
        
        // Gerar lista de datas do período
        const currentDate = new Date(inicio);
        while (currentDate <= fim) {
          const dataStr = currentDate.toISOString().split('T')[0];
          const horario = usarHorarioPadrao ? horarioPadrao : (horariosIndividuais[dataStr] || "");
          if (horario) {
            horarios.push({ data: dataStr, horario });
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return horarios.length > 0 ? JSON.stringify(horarios) : undefined;
      })(),
      observacao: observacao || "",
      status: formData.get("status") as any || "agendado",
    };




    if (editingEvento) {
      updateMutation.mutate({ id: editingEvento.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getTipoLabel = (tipo: string) => {
    return TIPOS_EVENTO.find((t) => t.value === tipo)?.label || tipo;
  };

  const getTurmaById = (turmaId: number) => {
    return turmas?.find((t) => t.id === turmaId);
  };

  const getConfigMaquiagemByTurma = (turmaId: number) => {
    return configsMaquiagem?.find((c: any) => c.turmaId === turmaId);
  };

  const getAvisoMaquiagem = (turmaId: number | undefined) => {
    if (!turmaId) return null;
    const config = getConfigMaquiagemByTurma(turmaId);
    if (!config) return null;
    
    if (config.semServicoFormando) {
      return "Sem Serviço de Maquiagem";
    }
    if (config.semServicoFamilia) {
      return (<span>Sem serviço de Maquiagem <strong>Família</strong></span>);
    }
    return null;
  };

  // Eventos agrupados por turma para consolidado
  const eventosPorTurma = useMemo(() => {
    if (!eventos || !turmas) return [];
    
    const turmaMap = new Map<number, {
      turma: any;
      eventos: Map<string, any>;
    }>();
    
    turmas.forEach(turma => {
      turmaMap.set(turma.id, {
        turma,
        eventos: new Map()
      });
    });
    
    eventos.forEach(evento => {
      const turmaData = turmaMap.get(evento.turmaId);
      if (turmaData) {
        turmaData.eventos.set(evento.tipoEvento, evento);
      }
    });
    
    let result = Array.from(turmaMap.values()).filter(t => t.eventos.size > 0);
    
    // Ordenação
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        let valA = "";
        let valB = "";
        
        if (sortField === "codigo") {
          valA = a.turma.codigo;
          valB = b.turma.codigo;
        } else if (sortField === "cidade") {
          valA = `${a.turma.cidade} (${a.turma.estado})`;
          valB = `${b.turma.cidade} (${b.turma.estado})`;
        } else if (sortField === "curso") {
          valA = parseJsonArray(a.turma.cursos)[0] || "";
          valB = parseJsonArray(b.turma.cursos)[0] || "";
        }
        
        const cmp = valA.localeCompare(valB, "pt-BR");
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    
    return result;
  }, [eventos, turmas, sortField, sortDirection]);

  // Eventos com data para calendário (filtrados por busca de turma)
  const eventosComData = useMemo(() => {
    if (!eventos) return [];
    let filtrados = eventos.filter(e => e.dataEvento);
    
    // Filtrar por busca de turma, tipo de evento, cidade, local ou horário
    if (buscaTurma.trim()) {
      const termoBusca = buscaTurma.toLowerCase().trim();
      filtrados = filtrados.filter(e => {
        // Buscar em dados da turma
        const turma = turmas?.find(t => t.id === e.turmaId);
        if (turma) {
          const dadosTurma = formatDadosTurma(turma).toLowerCase();
          if (dadosTurma.includes(termoBusca)) return true;
          
          // Buscar em cidade
          const cidade = turma.cidade?.toLowerCase() || '';
          if (cidade.includes(termoBusca)) return true;
        }
        
        // Buscar em tipo de evento
        const tipoEvento = TIPOS_EVENTO.find(t => t.value === e.tipoEvento);
        if (tipoEvento) {
          const labelEvento = tipoEvento.label.toLowerCase();
          const shortEvento = tipoEvento.short.toLowerCase();
          if (labelEvento.includes(termoBusca) || shortEvento.includes(termoBusca)) return true;
        }
        
        // Buscar em local
        const local = e.local?.toLowerCase() || '';
        if (local.includes(termoBusca)) return true;
        
        // Buscar em horário
        if (e.horariosInicio) {
          try {
            const horarios = JSON.parse(e.horariosInicio);
            if (Array.isArray(horarios)) {
              const temHorario = horarios.some((h: any) => 
                h.horario?.toLowerCase().includes(termoBusca)
              );
              if (temHorario) return true;
            }
          } catch { /* ignore */ }
        }
        
        return false;
      });
    }
    
    // Filtrar por período (Todos os Meses ou Todos os Anos)
    // Se houver busca ativa, ignorar filtro de período e mostrar todos os resultados
    if (!buscaTurma.trim() && (todosMeses || todosAnos)) {
      const anoAtual = currentMonth.getFullYear();
      filtrados = filtrados.filter(e => {
        if (!e.dataEvento) return false;
        const eventDate = createLocalFromUTC(e.dataEvento);
        
        if (todosAnos) {
          // Mostrar todos os eventos independente do ano
          return true;
        } else if (todosMeses) {
          // Mostrar eventos do ano corrente
          return eventDate.getFullYear() === anoAtual;
        }
        
        return false;
      });
    }
    
    return filtrados;
  }, [eventos, turmas, buscaTurma, todosMeses, todosAnos, currentMonth]);

  // Dias do mês atual
  const diasDoMes = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const days: { date: Date | null; eventos: any[] }[] = [];
    
    // Dias vazios antes do primeiro dia
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: null, eventos: [] });
    }
    
    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const eventosNoDia = eventosComData.filter(e => {
        if (!e.dataEvento) return false;
        // Usar createLocalFromUTC para converter datas UTC do banco para local
        const eventStart = createLocalFromUTC(e.dataEvento);
        eventStart.setHours(0, 0, 0, 0);
        const eventEnd = e.dataEventoFim ? createLocalFromUTC(e.dataEventoFim) : new Date(eventStart);
        eventEnd.setHours(23, 59, 59, 999);
        const currentDate = new Date(year, month, day);
        currentDate.setHours(12, 0, 0, 0);
        return currentDate >= eventStart && currentDate <= eventEnd;
      });
      days.push({ date, eventos: eventosNoDia });
    }
    
    return days;
  }, [currentMonth, eventosComData]);

  // Eventos do mês atual (expandidos por dia)
  const eventosDoMes = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const eventosExpandidos: { evento: any; dataExibicao: Date }[] = [];
    
    eventosComData.forEach(e => {
      if (!e.dataEvento) return;
      
      // Usar createLocalFromUTC para converter datas UTC do banco para local
      const eventStart = createLocalFromUTC(e.dataEvento);
      eventStart.setHours(0, 0, 0, 0);
      const eventEnd = e.dataEventoFim ? createLocalFromUTC(e.dataEventoFim) : new Date(eventStart);
      eventEnd.setHours(23, 59, 59, 999);
      
      // Iterar por cada dia do evento
      const currentDate = new Date(eventStart);
      while (currentDate <= eventEnd) {
        // Lógica de filtro baseada nos checkboxes
        let incluirEvento = false;
        
        if (todosAnos) {
          // Todos os Anos: mostrar todos os eventos
          incluirEvento = true;
        } else if (todosMeses) {
          // Todos os Meses: mostrar eventos do ano corrente
          incluirEvento = currentDate.getFullYear() === year;
        } else {
          // Padrão: mostrar apenas eventos do mês atual (mesmo com busca ativa)
          incluirEvento = currentDate.getMonth() === month && currentDate.getFullYear() === year;
        }
        
        if (incluirEvento) {
          eventosExpandidos.push({
            evento: e,
            dataExibicao: new Date(currentDate)
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    
    // Ordenar por data de exibição
    return eventosExpandidos.sort((a, b) => a.dataExibicao.getTime() - b.dataExibicao.getTime());
  }, [currentMonth, eventosComData, todosMeses, todosAnos, buscaTurma]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4 ml-1" />;
    return <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Eventos</h1>
          <p className="text-slate-500 mt-1">Gerencie os eventos fotográficos</p>
        </div>
        <Dialog open={isOpen || !!editingEvento} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingEvento(null);
            setSelectedTurmaId("");
            setSelectedTipoEvento("");
            setSelectedLocal("");
            setTurmaPopoverOpen(false);
            setLocalPopoverOpen(false);
            setCenariosSelecionados([]);
            setFotografosSelecionados([]);
            setCerimoniaisSelecionados([]);
            setCoordenadoresSelecionados([]);
            setProducaoSelecionados([]);
            setBuscaFotografo("");
            setBuscaCerimonial("");
            setBuscaCoordenacao("");
            setBuscaProducao("");
            setObservacao("");
            setHorarioPadrao("");
            setUsarHorarioPadrao(true);
            setHorariosIndividuais({});
          } else if (editingEvento) {
            setSelectedTurmaId(editingEvento.turmaId?.toString() || "");
            setSelectedLocal(editingEvento.local || "");
            setSelectedTipoEvento(editingEvento.tipoEvento || "");
            // Carregar cenários existentes
            if (editingEvento.cenarios) {
              try {
                const parsed = JSON.parse(editingEvento.cenarios);
                // Suportar formato antigo (array de objetos) e novo (array de IDs)
                if (Array.isArray(parsed)) {
                  if (parsed.length > 0 && typeof parsed[0] === 'object') {
                    // Formato antigo: [{nome, fotografoId}] - ignorar
                    setCenariosSelecionados([]);
                  } else {
                    // Formato novo: [id1, id2, ...]
                    setCenariosSelecionados(parsed);
                  }
                } else {
                  setCenariosSelecionados([]);
                }
              } catch {
                setCenariosSelecionados([]);
              }
            } else {
              setCenariosSelecionados([]);
            }
            // Carregar fotógrafos existentes
            if (editingEvento.fotografos) {
              try {
                const parsed = JSON.parse(editingEvento.fotografos);
                if (Array.isArray(parsed)) {
                  setFotografosSelecionados(parsed);
                } else {
                  setFotografosSelecionados([]);
                }
              } catch {
                setFotografosSelecionados([]);
              }
            } else {
              setFotografosSelecionados([]);
            }
            // Carregar cerimoniais existentes
            if (editingEvento.cerimoniais) {
              try {
                const parsed = JSON.parse(editingEvento.cerimoniais);
                if (Array.isArray(parsed)) {
                  setCerimoniaisSelecionados(parsed);
                } else {
                  setCerimoniaisSelecionados([]);
                }
              } catch {
                setCerimoniaisSelecionados([]);
              }
            } else {
              setCerimoniaisSelecionados([]);
            }
            // Carregar coordenadores existentes
            if (editingEvento.coordenadores) {
              try {
                const parsed = JSON.parse(editingEvento.coordenadores);
                if (Array.isArray(parsed)) {
                  setCoordenadoresSelecionados(parsed);
                } else {
                  setCoordenadoresSelecionados([]);
                }
              } catch {
                setCoordenadoresSelecionados([]);
              }
            } else {
              setCoordenadoresSelecionados([]);
            }
            // Carregar produção existente
            if (editingEvento.producao) {
              try {
                const parsed = JSON.parse(editingEvento.producao);
                if (Array.isArray(parsed)) {
                  setProducaoSelecionados(parsed);
                } else {
                  setProducaoSelecionados([]);
                }
              } catch {
                setProducaoSelecionados([]);
              }
            } else {
              setProducaoSelecionados([]);
            }
            // Carregar maquiadoras existentes
            if (editingEvento.maquiadoras) {
              try {
                const parsed = JSON.parse(editingEvento.maquiadoras);
                if (Array.isArray(parsed)) {
                  setMaquiadorasSelecionadas(parsed);
                } else {
                  setMaquiadorasSelecionadas([]);
                }
              } catch {
                setMaquiadorasSelecionadas([]);
              }
            } else {
              setMaquiadorasSelecionadas([]);
            }
            // Carregar observação existente
            setObservacao(editingEvento.observacao || "");
            // Carregar horários existentes
            if (editingEvento.horariosInicio) {
              try {
                const parsed = JSON.parse(editingEvento.horariosInicio);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  // Verificar se todos os horários são iguais (horário padrão)
                  const primeiroHorario = parsed[0].horario;
                  const todosIguais = parsed.every((h: any) => h.horario === primeiroHorario);
                  if (todosIguais) {
                    setHorarioPadrao(primeiroHorario);
                    setUsarHorarioPadrao(true);
                    setHorariosIndividuais({});
                  } else {
                    setUsarHorarioPadrao(false);
                    const horariosObj: {[data: string]: string} = {};
                    parsed.forEach((h: any) => {
                      horariosObj[h.data] = h.horario;
                    });
                    setHorariosIndividuais(horariosObj);
                    setHorarioPadrao("");
                  }
                } else {
                  setHorarioPadrao("");
                  setUsarHorarioPadrao(true);
                  setHorariosIndividuais({});
                }
              } catch {
                setHorarioPadrao("");
                setUsarHorarioPadrao(true);
                setHorariosIndividuais({});
              }
            } else {
              setHorarioPadrao("");
              setUsarHorarioPadrao(true);
              setHorariosIndividuais({});
            }
          }
        }}>
          {podeInserir && (
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                onClick={() => {
                  setEditingEvento(null);
                  setSelectedTurmaId("");
                  setSelectedTipoEvento("");
                  setSelectedLocal("");
                  setCenariosSelecionados([]);
                  setFotografosSelecionados([]);
                  setCerimoniaisSelecionados([]);
                  setCoordenadoresSelecionados([]);
                  setProducaoSelecionados([]);
                  setMaquiadorasSelecionadas([]);
                  setObservacao("");
                  setHorarioPadrao("");
                  setUsarHorarioPadrao(true);
                  setHorariosIndividuais({});
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>
                {editingEvento ? "Editar Evento" : "Novo Evento"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Turma *</Label>
                <Popover open={turmaPopoverOpen} modal={false} onOpenChange={(open) => {
                  setTurmaPopoverOpen(open);
                  if (open) {
                    setTurmaBusca("");
                  }
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={turmaPopoverOpen}
                      className="w-full justify-between font-normal text-left h-auto min-h-9 py-2"
                    >
                      <span className="whitespace-normal break-words">
                        {selectedTurmaId
                          ? (() => {
                              const turma = turmas?.find((t) => t.id.toString() === selectedTurmaId);
                              return turma ? formatDadosTurma(turma) : "Selecione uma turma...";
                            })()
                          : "Selecione uma turma..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Buscar turma por código..." 
                        value={turmaBusca}
                        onValueChange={setTurmaBusca}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhuma turma encontrada.</CommandEmpty>
                        <CommandGroup>
                          {turmas
                            ?.filter((turma) => {
                              if (!turmaBusca) return true;
                              const searchLower = turmaBusca.toLowerCase();
                              const codigo = turma.codigo?.toLowerCase() || "";
                              const cursos = parseJsonArray(turma.cursos).join(" ").toLowerCase();
                              const instituicoes = parseJsonArray(turma.instituicoes).join(" ").toLowerCase();
                              return codigo.includes(searchLower) || 
                                     cursos.includes(searchLower) || 
                                     instituicoes.includes(searchLower);
                            })
                            .map((turma) => (
                            <CommandItem
                              key={turma.id}
                              value={turma.id.toString()}
                              onSelect={() => {
                                setSelectedTurmaId(turma.id.toString());
                                setTurmaPopoverOpen(false);
                                setTurmaBusca("");
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 flex-shrink-0 ${selectedTurmaId === turma.id.toString() ? "opacity-100" : "opacity-0"}`}
                              />
                              <span className="whitespace-normal break-words">{formatDadosTurma(turma)}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipoEvento">Tipo de Evento *</Label>
                <Select 
                  value={selectedTipoEvento || editingEvento?.tipoEvento || ""}
                  onValueChange={(value) => setSelectedTipoEvento(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_EVENTO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataInicio">Período - Início</Label>
                  <Input
                    type="date"
                    name="dataInicio"
                    defaultValue={editingEvento?.dataEvento ? (() => {
                      const p = getLocalDateParts(editingEvento.dataEvento);
                      return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
                    })() : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataFim">Período - Fim</Label>
                  <Input
                    type="date"
                    name="dataFim"
                    defaultValue={editingEvento?.dataEventoFim ? (() => {
                      const p = getLocalDateParts(editingEvento.dataEventoFim);
                      return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
                    })() : ""}
                  />
                </div>
              </div>
              
              {/* Horário de Início */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Horário de Início</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="horarioPadrao"
                      checked={usarHorarioPadrao}
                      onCheckedChange={(checked) => setUsarHorarioPadrao(!!checked)}
                    />
                    <label
                      htmlFor="horarioPadrao"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Horário Padrão
                    </label>
                  </div>
                </div>
                
                {usarHorarioPadrao ? (
                  <div className="space-y-2">
                    <Label htmlFor="horarioPadrao">Horário para todas as datas</Label>
                    <Input
                      type="time"
                      id="horarioPadrao"
                      value={horarioPadrao}
                      onChange={(e) => setHorarioPadrao(e.target.value)}
                      placeholder="HH:MM"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Horários por data</Label>
                    <div className="max-h-48 overflow-y-auto space-y-2 p-3 border rounded-lg bg-slate-50">
                      {(() => {
                        const dataInicioInput = document.querySelector('input[name="dataInicio"]') as HTMLInputElement;
                        const dataFimInput = document.querySelector('input[name="dataFim"]') as HTMLInputElement;
                        
                        if (!dataInicioInput?.value) {
                          return <p className="text-sm text-slate-500">Selecione o período primeiro</p>;
                        }
                        
                        const inicio = new Date(dataInicioInput.value + 'T12:00:00');
                        const fim = dataFimInput?.value ? new Date(dataFimInput.value + 'T12:00:00') : inicio;
                        const datas: Date[] = [];
                        const currentDate = new Date(inicio);
                        
                        while (currentDate <= fim) {
                          datas.push(new Date(currentDate));
                          currentDate.setDate(currentDate.getDate() + 1);
                        }
                        
                        return datas.map((data) => {
                          const dataStr = data.toISOString().split('T')[0];
                          const dataFormatada = data.toLocaleDateString('pt-BR');
                          
                          return (
                            <div key={dataStr} className="flex items-center gap-2">
                              <Label className="min-w-[100px] text-sm">{dataFormatada}</Label>
                              <Input
                                type="time"
                                value={horariosIndividuais[dataStr] || ""}
                                onChange={(e) => {
                                  setHorariosIndividuais({
                                    ...horariosIndividuais,
                                    [dataStr]: e.target.value
                                  });
                                }}
                                placeholder="HH:MM"
                                className="flex-1"
                              />
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="local">Local</Label>
                <input type="hidden" name="local" value={selectedLocal} />
                <Popover open={localPopoverOpen} modal={false} onOpenChange={(open) => setLocalPopoverOpen(open)}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={localPopoverOpen}
                      className="w-full justify-between font-normal"
                    >
                      {selectedLocal || "Selecione o local..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Buscar local..."
                        value={localBusca}
                        onValueChange={setLocalBusca}
                      />
                      <CommandList>
                        {(() => {
                          const locaisFiltrados = locais?.filter((local: any) => 
                            local.nome.toLowerCase().includes(localBusca.toLowerCase())
                          ) || [];
                          const localExiste = locais?.some((local: any) => 
                            local.nome.toLowerCase() === localBusca.toLowerCase().trim()
                          );
                          return (
                            <>
                              {locaisFiltrados.length === 0 && !localBusca.trim() && (
                                <CommandEmpty>Nenhum local encontrado.</CommandEmpty>
                              )}
                              {localBusca.trim() && !localExiste && (
                                <CommandGroup heading="Criar novo local">
                                  <CommandItem
                                    value={`criar-${localBusca}`}
                                    onSelect={() => handleCreateLocal(localBusca)}
                                    className="text-primary"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Criar "{localBusca.trim()}"
                                  </CommandItem>
                                </CommandGroup>
                              )}
                              <CommandGroup heading={locaisFiltrados.length > 0 ? "Locais existentes" : undefined}>
                                {locaisFiltrados.map((local: any) => (
                                  <CommandItem
                                    key={local.id}
                                    value={local.nome}
                                    onSelect={() => {
                                      setSelectedLocal(local.nome);
                                      setLocalPopoverOpen(false);
                                      setLocalBusca("");
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${selectedLocal === local.nome ? "opacity-100" : "opacity-0"}`}
                                    />
                                    {local.nome}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </>
                          );
                        })()}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Cenários */}
              <div className="space-y-2">
                <Label>Cenários</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-slate-50">
                  {tiposCenario?.map((cenario: any) => (
                    <div key={cenario.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cenario-${cenario.id}`}
                        checked={cenariosSelecionados.includes(cenario.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCenariosSelecionados([...cenariosSelecionados, cenario.id]);
                          } else {
                            setCenariosSelecionados(cenariosSelecionados.filter(id => id !== cenario.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={`cenario-${cenario.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {cenario.nome}
                      </label>
                    </div>
                  ))}
                </div>
                {cenariosSelecionados.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {cenariosSelecionados.length} cenário(s) selecionado(s)
                  </p>
                )}
              </div>
              
              {/* Fotógrafos */}
              <div className="space-y-2">
                <Label>Fotógrafo</Label>
                <div className="border rounded-lg bg-slate-50">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Buscar fotógrafo..."
                        value={buscaFotografo}
                        onChange={(e) => setBuscaFotografo(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3 max-h-32 overflow-y-auto">
                    {fotografos?.filter((f: any) => 
                      f.nome.toLowerCase().includes(buscaFotografo.toLowerCase())
                    ).map((fotografo: any) => (
                      <div key={fotografo.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`fotografo-${fotografo.id}`}
                          checked={fotografosSelecionados.includes(fotografo.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFotografosSelecionados([...fotografosSelecionados, fotografo.id]);
                            } else {
                              setFotografosSelecionados(fotografosSelecionados.filter(id => id !== fotografo.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`fotografo-${fotografo.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {fotografo.nome}
                        </label>
                      </div>
                    ))}
                    {(!fotografos || fotografos.length === 0) && (
                      <p className="text-sm text-slate-500 col-span-2">Nenhum fotógrafo cadastrado</p>
                    )}
                  </div>
                </div>
                {fotografosSelecionados.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {fotografosSelecionados.length} fotógrafo(s) selecionado(s)
                  </p>
                )}
              </div>
              
              {/* Cerimoniais */}
              <div className="space-y-2">
                <Label>Cerimonial</Label>
                <div className="border rounded-lg bg-slate-50">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Buscar cerimonial..."
                        value={buscaCerimonial}
                        onChange={(e) => setBuscaCerimonial(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3 max-h-32 overflow-y-auto">
                    {cerimoniais?.filter((c: any) => 
                      c.nome.toLowerCase().includes(buscaCerimonial.toLowerCase())
                    ).map((cerimonial: any) => (
                      <div key={cerimonial.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cerimonial-${cerimonial.id}`}
                          checked={cerimoniaisSelecionados.includes(cerimonial.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCerimoniaisSelecionados([...cerimoniaisSelecionados, cerimonial.id]);
                            } else {
                              setCerimoniaisSelecionados(cerimoniaisSelecionados.filter(id => id !== cerimonial.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`cerimonial-${cerimonial.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {cerimonial.nome}
                        </label>
                      </div>
                    ))}
                    {(!cerimoniais || cerimoniais.length === 0) && (
                      <p className="text-sm text-slate-500 col-span-2">Nenhum cerimonial cadastrado</p>
                    )}
                  </div>
                </div>
                {cerimoniaisSelecionados.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {cerimoniaisSelecionados.length} cerimonial(is) selecionado(s)
                  </p>
                )}
              </div>
              
              {/* Coordenação */}
              <div className="space-y-2">
                <Label>Coordenação</Label>
                <div className="border rounded-lg bg-slate-50">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Buscar coordenação..."
                        value={buscaCoordenacao}
                        onChange={(e) => setBuscaCoordenacao(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3 max-h-32 overflow-y-auto">
                    {coordenadores?.filter((c: any) => 
                      c.nome.toLowerCase().includes(buscaCoordenacao.toLowerCase())
                    ).map((coordenador: any) => (
                      <div key={coordenador.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`coordenador-${coordenador.id}`}
                          checked={coordenadoresSelecionados.includes(coordenador.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCoordenadoresSelecionados([...coordenadoresSelecionados, coordenador.id]);
                            } else {
                              setCoordenadoresSelecionados(coordenadoresSelecionados.filter(id => id !== coordenador.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`coordenador-${coordenador.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {coordenador.nome}
                        </label>
                      </div>
                    ))}
                    {(!coordenadores || coordenadores.length === 0) && (
                      <p className="text-sm text-slate-500 col-span-2">Nenhum coordenador cadastrado</p>
                    )}
                  </div>
                </div>
                {coordenadoresSelecionados.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {coordenadoresSelecionados.length} coordenador(es) selecionado(s)
                  </p>
                )}
              </div>
              
              {/* Produção */}
              <div className="space-y-2">
                <Label>Produção</Label>
                <div className="border rounded-lg bg-slate-50">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Buscar produção..."
                        value={buscaProducao}
                        onChange={(e) => setBuscaProducao(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3 max-h-32 overflow-y-auto">
                    {producao?.filter((p: any) => 
                      p.nome.toLowerCase().includes(buscaProducao.toLowerCase())
                    ).map((prod: any) => (
                      <div key={prod.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`producao-${prod.id}`}
                          checked={producaoSelecionados.includes(prod.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setProducaoSelecionados([...producaoSelecionados, prod.id]);
                            } else {
                              setProducaoSelecionados(producaoSelecionados.filter(id => id !== prod.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`producao-${prod.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {prod.nome}
                        </label>
                      </div>
                    ))}
                    {(!producao || producao.length === 0) && (
                      <p className="text-sm text-slate-500 col-span-2">Nenhuma produção cadastrada</p>
                    )}
                  </div>
                </div>
                {producaoSelecionados.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {producaoSelecionados.length} produção(s) selecionada(s)
                  </p>
                )}
              </div>
              
              {/* Maquiadoras */}
              <div className="space-y-2">
                <Label>Maquiadoras</Label>
                <div className="border rounded-lg bg-slate-50">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Buscar maquiadora..."
                        value={buscaMaquiadora}
                        onChange={(e) => setBuscaMaquiadora(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3 max-h-32 overflow-y-auto">
                    {maquiadoras?.filter((m: any) => 
                      m.nome.toLowerCase().includes(buscaMaquiadora.toLowerCase())
                    ).map((maquiadora: any) => (
                      <div key={maquiadora.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`maquiadora-${maquiadora.id}`}
                          checked={maquiadorasSelecionadas.includes(maquiadora.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setMaquiadorasSelecionadas([...maquiadorasSelecionadas, maquiadora.id]);
                            } else {
                              setMaquiadorasSelecionadas(maquiadorasSelecionadas.filter(id => id !== maquiadora.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`maquiadora-${maquiadora.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {maquiadora.nome}
                        </label>
                      </div>
                    ))}
                    {(!maquiadoras || maquiadoras.length === 0) && (
                      <p className="text-sm text-slate-500 col-span-2">Nenhuma maquiadora cadastrada</p>
                    )}
                  </div>
                </div>
                {maquiadorasSelecionadas.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {maquiadorasSelecionadas.length} maquiadora(s) selecionada(s)
                  </p>
                )}
              </div>

              {/* Campo de Observações */}
              <div className="space-y-2">
                <Label htmlFor="observacao">Observações</Label>
                <Textarea
                  id="observacao"
                  value={observacao}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObservacao(e.target.value)}
                  placeholder="Observações sobre o evento..."
                  rows={4}
                  className="resize-none"
                />
                {editingEvento && getAvisoMaquiagem(editingEvento.turmaId) && (
                  <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    {getAvisoMaquiagem(editingEvento.turmaId)}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={editingEvento?.status || "agendado"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between pt-4">
                {editingEvento && podeExcluir ? (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={() => handleDelete(editingEvento.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
                  </Button>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsOpen(false);
                    setEditingEvento(null);
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-amber-500 to-orange-600">
                    {editingEvento ? "Salvar" : "Criar"}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="calendario" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendário
          </TabsTrigger>
          <TabsTrigger value="consolidado" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Consolidado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="mt-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 pb-2 sticky top-0 bg-white z-10 border-b">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-3">
                <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 w-full sm:w-auto">
                  <Button variant="outline" size="icon" onClick={prevMonth} className="shrink-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {!todosMeses && !todosAnos && (
                    <div className="text-center flex-1 sm:flex-initial">
                      <CardTitle className="text-base sm:text-lg">
                        {MESES[currentMonth.getMonth()]}
                      </CardTitle>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {currentMonth.getFullYear()}
                      </div>
                    </div>
                  )}
                  {(todosMeses || todosAnos) && (
                    <CardTitle className="text-base sm:text-lg text-center flex-1 sm:flex-initial">
                      {todosAnos ? 'Todos os Anos' : `Todos os Meses de ${currentMonth.getFullYear()}`}
                    </CardTitle>
                  )}
                  <Button variant="outline" size="icon" onClick={nextMonth} className="shrink-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant={calendarView === "calendar" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarView("calendar")}
                  className="flex-1 sm:flex-initial"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Calendário
                </Button>
                <Button
                  variant={calendarView === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarView("list")}
                  className="flex-1 sm:flex-initial"
                >
                  <List className="h-4 w-4 mr-1" />
                  Lista
                </Button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por turma, cidade, local ou horário..."
                    value={buscaTurma}
                    onChange={(e) => setBuscaTurma(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {calendarView === "list" && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="todosMeses"
                        checked={todosMeses}
                        onCheckedChange={(checked) => {
                          setTodosMeses(checked as boolean);
                          if (checked) setTodosAnos(false);
                        }}
                      />
                      <Label htmlFor="todosMeses" className="text-sm cursor-pointer">
                        Todos os Meses
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="todosAnos"
                        checked={todosAnos}
                        onCheckedChange={(checked) => {
                          setTodosAnos(checked as boolean);
                          if (checked) setTodosMeses(false);
                        }}
                      />
                      <Label htmlFor="todosAnos" className="text-sm cursor-pointer">
                        Todos os Anos
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {calendarView === "calendar" ? (
                <div className="grid grid-cols-7 gap-1">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dia) => (
                    <div key={dia} className="text-center text-sm font-medium text-slate-500 py-2">
                      {dia}
                    </div>
                  ))}
                  {diasDoMes.map((dia, idx) => (
                    <div
                      key={idx}
                      className={`min-h-24 p-1 border rounded-lg ${
                        dia.date ? "bg-white" : "bg-slate-50"
                      } ${dia.eventos.length > 0 ? "border-amber-200" : "border-slate-100"}`}
                    >
                      {dia.date && (
                        <>
                          <div className="text-sm font-medium text-slate-700 mb-1">
                            {dia.date.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dia.eventos.slice(0, 3).map((evento) => {
                              const turma = getTurmaById(evento.turmaId);
                              return (
                                <div
                                  key={evento.id}
                                  className={`text-xs p-1 rounded bg-amber-100 text-amber-800 whitespace-normal break-words ${podeInserir ? 'cursor-pointer hover:bg-amber-200' : 'cursor-default'} transition-colors`}
                                  title={`${formatDadosTurma(turma)} - ${getTipoLabel(evento.tipoEvento)}`}
                                  onClick={() => {
                                    if (!podeInserir) return;
                                    setEditingEvento(evento);
                                    setSelectedTurmaId(evento.turmaId?.toString() || "");
                                    setSelectedTipoEvento(evento.tipoEvento || "");
                                    setSelectedLocal(evento.local || "");
                                    // Carregar cenários
                                    if (evento.cenarios) {
                                      try {
                                        const parsed = JSON.parse(evento.cenarios);
                                        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] !== 'object') {
                                          setCenariosSelecionados(parsed);
                                        } else {
                                          setCenariosSelecionados([]);
                                        }
                                      } catch { setCenariosSelecionados([]); }
                                    } else { setCenariosSelecionados([]); }
                                    // Carregar fotógrafos
                                    if (evento.fotografos) {
                                      try {
                                        const parsed = JSON.parse(evento.fotografos);
                                        if (Array.isArray(parsed)) setFotografosSelecionados(parsed);
                                        else setFotografosSelecionados([]);
                                      } catch { setFotografosSelecionados([]); }
                                    } else { setFotografosSelecionados([]); }
                                    // Carregar cerimoniais
                                    if (evento.cerimoniais) {
                                      try {
                                        const parsed = JSON.parse(evento.cerimoniais);
                                        if (Array.isArray(parsed)) setCerimoniaisSelecionados(parsed);
                                        else setCerimoniaisSelecionados([]);
                                      } catch { setCerimoniaisSelecionados([]); }
                                    } else { setCerimoniaisSelecionados([]); }
                                    // Carregar coordenadores
                                    if (evento.coordenadores) {
                                      try {
                                        const parsed = JSON.parse(evento.coordenadores);
                                        if (Array.isArray(parsed)) setCoordenadoresSelecionados(parsed);
                                        else setCoordenadoresSelecionados([]);
                                      } catch { setCoordenadoresSelecionados([]); }
                                    } else { setCoordenadoresSelecionados([]); }
                                    // Carregar produção
                                    if (evento.producao) {
                                      try {
                                        const parsed = JSON.parse(evento.producao);
                                        if (Array.isArray(parsed)) setProducaoSelecionados(parsed);
                                        else setProducaoSelecionados([]);
                                      } catch { setProducaoSelecionados([]); }
                                    } else { setProducaoSelecionados([]); }
                                    // Carregar maquiadoras
                                    if (evento.maquiadoras) {
                                      try {
                                        const parsed = JSON.parse(evento.maquiadoras);
                                        if (Array.isArray(parsed)) setMaquiadorasSelecionadas(parsed);
                                        else setMaquiadorasSelecionadas([]);
                                      } catch { setMaquiadorasSelecionadas([]); }
                                    } else { setMaquiadorasSelecionadas([]); }
                                    // Carregar observação
                                    setObservacao(evento.observacao || "");
                                  }}
                                >
                                  {turma?.codigo} - {TIPOS_EVENTO.find(t => t.value === evento.tipoEvento)?.short}
                                </div>
                              );
                            })}
                            {dia.eventos.length > 3 && (
                              <div className="text-xs text-slate-500">
                                +{dia.eventos.length - 3} mais
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {eventosDoMes.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      Nenhum evento agendado para este mês
                    </div>
                  ) : (
                    eventosDoMes.map(({ evento, dataExibicao }, idx) => {
                      const turma = getTurmaById(evento.turmaId);
                      if (!turma) return null;
                      return (
                        <div
                          key={`${evento.id}-${dataExibicao.getTime()}`}
                          className={`flex items-center gap-4 p-3 rounded-lg border border-slate-200 ${podeInserir ? 'hover:border-amber-200 cursor-pointer' : 'cursor-default'} transition-colors`}
                          onClick={() => {
                            if (!podeInserir) return;
                            setEditingEvento(evento);
                            setSelectedTurmaId(evento.turmaId?.toString() || "");
                            setSelectedTipoEvento(evento.tipoEvento || "");
                            setSelectedLocal(evento.local || "");
                            // Carregar cenários
                            if (evento.cenarios) {
                              try {
                                const parsed = JSON.parse(evento.cenarios);
                                if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] !== 'object') {
                                  setCenariosSelecionados(parsed);
                                } else {
                                  setCenariosSelecionados([]);
                                }
                              } catch { setCenariosSelecionados([]); }
                            } else { setCenariosSelecionados([]); }
                            // Carregar fotógrafos
                            if (evento.fotografos) {
                              try {
                                const parsed = JSON.parse(evento.fotografos);
                                if (Array.isArray(parsed)) setFotografosSelecionados(parsed);
                                else setFotografosSelecionados([]);
                              } catch { setFotografosSelecionados([]); }
                            } else { setFotografosSelecionados([]); }
                            // Carregar cerimoniais
                            if (evento.cerimoniais) {
                              try {
                                const parsed = JSON.parse(evento.cerimoniais);
                                if (Array.isArray(parsed)) setCerimoniaisSelecionados(parsed);
                                else setCerimoniaisSelecionados([]);
                              } catch { setCerimoniaisSelecionados([]); }
                            } else { setCerimoniaisSelecionados([]); }
                            // Carregar coordenadores
                            if (evento.coordenadores) {
                              try {
                                const parsed = JSON.parse(evento.coordenadores);
                                if (Array.isArray(parsed)) setCoordenadoresSelecionados(parsed);
                                else setCoordenadoresSelecionados([]);
                              } catch { setCoordenadoresSelecionados([]); }
                            } else { setCoordenadoresSelecionados([]); }
                            // Carregar produção
                            if (evento.producao) {
                              try {
                                const parsed = JSON.parse(evento.producao);
                                if (Array.isArray(parsed)) setProducaoSelecionados(parsed);
                                else setProducaoSelecionados([]);
                              } catch { setProducaoSelecionados([]); }
                            } else { setProducaoSelecionados([]); }
                            // Carregar maquiadoras
                            if (evento.maquiadoras) {
                              try {
                                const parsed = JSON.parse(evento.maquiadoras);
                                if (Array.isArray(parsed)) setMaquiadorasSelecionadas(parsed);
                                else setMaquiadorasSelecionadas([]);
                              } catch { setMaquiadorasSelecionadas([]); }
                            } else { setMaquiadorasSelecionadas([]); }
                            // Carregar observação
                            setObservacao(evento.observacao || "");
                            // Carregar horários
                            if (evento.horariosInicio) {
                              try {
                                const parsed = JSON.parse(evento.horariosInicio);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                  const primeiroHorario = parsed[0].horario;
                                  const todosIguais = parsed.every((h: any) => h.horario === primeiroHorario);
                                  if (todosIguais) {
                                    setHorarioPadrao(primeiroHorario);
                                    setUsarHorarioPadrao(true);
                                    setHorariosIndividuais({});
                                  } else {
                                    setUsarHorarioPadrao(false);
                                    const horariosObj: {[data: string]: string} = {};
                                    parsed.forEach((h: any) => { horariosObj[h.data] = h.horario; });
                                    setHorariosIndividuais(horariosObj);
                                    setHorarioPadrao("");
                                  }
                                } else {
                                  setHorarioPadrao(""); setUsarHorarioPadrao(true); setHorariosIndividuais({});
                                }
                              } catch {
                                setHorarioPadrao(""); setUsarHorarioPadrao(true); setHorariosIndividuais({});
                              }
                            } else {
                              setHorarioPadrao(""); setUsarHorarioPadrao(true); setHorariosIndividuais({});
                            }
                          }}
                        >
                          <div className="text-center min-w-16">
                            <div className="text-2xl font-bold text-amber-600">
                              {dataExibicao.getDate()}
                            </div>
                            <div className="text-xs text-slate-500">
                              {MESES[dataExibicao.getMonth()].slice(0, 3)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {dataExibicao.getFullYear()}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">
                              {formatDadosTurma(turma)}
                            </div>
                            <div className="text-sm text-slate-500">
                              {turma.cidade} ({turma.estado})
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline">
                                {getTipoLabel(evento.tipoEvento)}
                              </Badge>
                              {evento.local && (
                                <Badge variant="secondary" className="text-xs">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {evento.local}
                                </Badge>
                              )}
                              {/* Horário de Início */}
                              {evento.horariosInicio && (() => {
                                try {
                                  const horarios = JSON.parse(evento.horariosInicio);
                                  if (Array.isArray(horarios) && horarios.length > 0) {
                                    // Buscar horário da data de exibição
                                    const dataStr = dataExibicao.toISOString().split('T')[0];
                                    const horarioDoDia = horarios.find((h: any) => h.data === dataStr);
                                    if (horarioDoDia?.horario) {
                                      return (
                                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                                          Início: {horarioDoDia.horario}
                                        </Badge>
                                      );
                                    }
                                  }
                                } catch { return null; }
                                return null;
                              })()}
                            </div>
                            {/* Fotógrafos do evento */}
                            {evento.fotografos && (() => {
                              try {
                                const fotografoIds = JSON.parse(evento.fotografos);
                                if (Array.isArray(fotografoIds) && fotografoIds.length > 0) {
                                  const nomesFotografos = fotografoIds
                                    .map((id: number) => fornecedores?.find((f: any) => f.id === id)?.nome)
                                    .filter(Boolean);
                                  if (nomesFotografos.length > 0) {
                                    return (
                                      <div className="text-xs text-slate-600 mt-1">
                                        <span className="font-medium text-amber-600">Fotógrafos:</span> {nomesFotografos.join(", ")}
                                      </div>
                                    );
                                  }
                                }
                              } catch { return null; }
                              return null;
                            })()}
                            {/* Cerimoniais do evento */}
                            {evento.cerimoniais && (() => {
                              try {
                                const cerimonialIds = JSON.parse(evento.cerimoniais);
                                if (Array.isArray(cerimonialIds) && cerimonialIds.length > 0) {
                                  const nomesCerimoniais = cerimonialIds
                                    .map((id: number) => fornecedores?.find((f: any) => f.id === id)?.nome)
                                    .filter(Boolean);
                                  if (nomesCerimoniais.length > 0) {
                                    return (
                                      <div className="text-xs text-slate-600 mt-1">
                                        <span className="font-medium text-purple-600">Cerimonial:</span> {nomesCerimoniais.join(", ")}
                                      </div>
                                    );
                                  }
                                }
                              } catch { return null; }
                              return null;
                            })()}
                            {/* Aviso de Maquiagem */}
                            {getAvisoMaquiagem(evento.turmaId) && (
                              <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded mt-2 inline-block">
                                {getAvisoMaquiagem(evento.turmaId)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consolidado" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white z-50 shadow-sm">
                    <tr className="border-b">
                      <th 
                        className="text-left p-3 font-medium text-slate-700 cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort("codigo")}
                      >
                        <div className="flex items-center">
                          Dados da Turma
                          {getSortIcon("codigo")}
                        </div>
                      </th>
                      <th 
                        className="text-left p-3 font-medium text-slate-700 cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort("cidade")}
                      >
                        <div className="flex items-center">
                          Cidade (Estado)
                          {getSortIcon("cidade")}
                        </div>
                      </th>
                      <th className="text-center p-3 font-medium text-slate-700 min-w-24">50%</th>
                      <th className="text-center p-3 font-medium text-slate-700 min-w-24">Estúdio</th>
                      <th className="text-center p-3 font-medium text-slate-700 min-w-24">Descontraída</th>
                      <th className="text-center p-3 font-medium text-slate-700 min-w-24">Oficial</th>
                      <th className="text-center p-3 font-medium text-slate-700 min-w-24">Bloco</th>
                      <th className="text-center p-3 font-medium text-slate-700 min-w-24">Samu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventosPorTurma.map(({ turma, eventos: eventosMap }) => (
                      <tr key={turma.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 text-sm">
                          {formatDadosTurma(turma)}
                        </td>
                        <td className="p-3 text-sm text-slate-600">
                          {turma.cidade} ({turma.estado})
                        </td>
                        {["foto_50", "foto_estudio", "foto_descontrada", "foto_oficial", "foto_bloco", "foto_samu"].map((tipo) => {
                          const evento = eventosMap.get(tipo);
                          return (
                            <td key={tipo} className="p-3 text-center">
                              {evento ? (
                                <div className="flex flex-col items-center gap-1">
                                  <Check className="h-5 w-5 text-emerald-500" />
                                  {evento.dataEvento && (
                                    <span className="text-xs text-slate-500">
                                      {formatPeriodoDatas(evento.dataEvento, evento.dataEventoFim)}
                                    </span>
                                  )}
                                </div>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {eventosPorTurma.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  Nenhum evento cadastrado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
