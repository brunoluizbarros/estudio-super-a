import { useState, useMemo, useEffect } from "react";
import ConfiguracoesUsuarios from "./ConfiguracoesUsuarios";
import PermissoesCerimoniais from "./PermissoesCerimoniais";
import { trpc } from "@/lib/trpc";
import { usePermissoes, type AbaConfiguracao } from "@/hooks/usePermissoes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CreditCard, 
  Plus, 
  Edit, 
  Trash2,
  Package,
  Building2,
  GraduationCap,
  MapPin,
  MapPinned,
  AlertTriangle,
  CalendarCheck,
  Search,
  ArrowUpDown,
  Users,
  Wrench,
  DollarSign,
  Sparkles,
  Shield,
  Download,
  Database
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Componente para a aba de Backup
function BackupTab() {
  const [isLoading, setIsLoading] = useState(false);
  const enviarBackupMutation = trpc.backup.enviarTeste.useMutation();
  
  const handleEnviarBackup = async () => {
    setIsLoading(true);
    try {
      const resultado = await enviarBackupMutation.mutateAsync();
      if (resultado.success) {
        toast.success("Backup enviado com sucesso!", {
          description: resultado.message
        });
      } else {
        toast.error("Erro ao enviar backup", {
          description: resultado.message
        });
      }
    } catch (error) {
      toast.error("Erro ao enviar backup", {
        description: error instanceof Error ? error.message : "Erro desconhecido"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Backup do Sistema
        </CardTitle>
        <CardDescription>
          Gere e envie um backup completo do banco de dados por e-mail
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Como funciona?</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>O backup inclui todas as tabelas do banco de dados</li>
            <li>O arquivo é gerado em formato JSON</li>
            <li>O arquivo é enviado como anexo por e-mail</li>
            <li>Uma cópia também é salva no armazenamento S3</li>
          </ul>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleEnviarBackup}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Gerando e enviando backup...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Enviar Backup por E-mail
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            O backup será enviado para: <strong>{process.env.OWNER_EMAIL || "suporteplataforma@superaformaturas.com.br"}</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

const BANDEIRAS = ["VISA", "MASTER", "ELO", "HIPERCARD", "AMERICAN EXPRESS", "DINERS"];
const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function Configuracoes() {
  const { podeAcessarConfiguracao, isAdmin } = usePermissoes();
  const [activeTab, setActiveTab] = useState("");
  
  // Definir abas disponíveis baseado em permissões
  const abasDisponiveis = useMemo(() => {
    const abas = [
      { value: "instituicoes", label: "Instituições", icon: Building2, permissao: "instituicoes" as AbaConfiguracao },
      { value: "cursos", label: "Cursos", icon: GraduationCap, permissao: "cursos" as AbaConfiguracao },
      { value: "cidades", label: "Cidades", icon: MapPin, permissao: "cidades" as AbaConfiguracao },
      { value: "locais", label: "Locais", icon: MapPinned, permissao: "locais" as AbaConfiguracao },
      { value: "tiposEvento", label: "Tipos Evento", icon: CalendarCheck, permissao: "tipos_evento" as AbaConfiguracao },
      { value: "tiposServico", label: "Tipos Serviço", icon: Wrench, permissao: "tipos_servico" as AbaConfiguracao },
      { value: "fornecedores", label: "Fornecedores", icon: Users, permissao: "fornecedores" as AbaConfiguracao },
      { value: "tabelaPreco", label: "Preços", icon: DollarSign, permissao: "tabela_preco" as AbaConfiguracao },
      { value: "taxas", label: "Taxas", icon: CreditCard, permissao: "taxas_cartao" as AbaConfiguracao },
      { value: "produtos", label: "Produtos", icon: Package, permissao: "produtos" as AbaConfiguracao },
      { value: "maquiagem", label: "Maquiagem", icon: Sparkles, permissao: "maquiagem" as AbaConfiguracao },
    ];
    
    // Adicionar abas apenas para Admin
    if (isAdmin) {
      abas.push({ value: "tiposUsuario", label: "Tipos de Usuário", icon: Users, permissao: "instituicoes" as AbaConfiguracao });
      abas.push({ value: "permissoesCerimoniais", label: "Permissões Cerimoniais", icon: Shield, permissao: "instituicoes" as AbaConfiguracao });
      abas.push({ value: "backup", label: "Backup", icon: Database, permissao: "instituicoes" as AbaConfiguracao });
    }
    
    // Filtrar abas baseado em permissões
    return abas.filter(aba => podeAcessarConfiguracao(aba.permissao));
  }, [podeAcessarConfiguracao]);
  
  // Definir primeira aba acessível como aba ativa inicial
  useEffect(() => {
    if (!activeTab && abasDisponiveis.length > 0) {
      setActiveTab(abasDisponiveis[0].value);
    }
  }, [abasDisponiveis, activeTab]);
  
  // Estados para modais
  const [isOpenTaxa, setIsOpenTaxa] = useState(false);
  const [isOpenProduto, setIsOpenProduto] = useState(false);
  const [isOpenInstituicao, setIsOpenInstituicao] = useState(false);
  const [isOpenCurso, setIsOpenCurso] = useState(false);
  const [isOpenCidade, setIsOpenCidade] = useState(false);
  const [isOpenLocal, setIsOpenLocal] = useState(false);
  
  // Estados para edição
  const [editingTaxa, setEditingTaxa] = useState<any>(null);
  const [editingProduto, setEditingProduto] = useState<any>(null);
  const [editingInstituicao, setEditingInstituicao] = useState<any>(null);
  const [editingCurso, setEditingCurso] = useState<any>(null);
  const [editingCidade, setEditingCidade] = useState<any>(null);
  
  // Estados para Locais
  const [novoLocalNome, setNovoLocalNome] = useState("");
  const [locaisSimilares, setLocaisSimilares] = useState<string[]>([]);
  const [showSimilarAlert, setShowSimilarAlert] = useState(false);
  
  // Estados para Tipos de Evento
  const [isOpenTipoEvento, setIsOpenTipoEvento] = useState(false);
  const [editingTipoEvento, setEditingTipoEvento] = useState<any>(null);
  const [editingLocal, setEditingLocal] = useState<any>(null);
  
  // Estados para busca em cada aba
  const [searchInstituicoes, setSearchInstituicoes] = useState("");
  const [searchCursos, setSearchCursos] = useState("");
  const [searchCidades, setSearchCidades] = useState("");
  const [searchLocais, setSearchLocais] = useState("");
  const [searchTiposEvento, setSearchTiposEvento] = useState("");
  const [searchTaxas, setSearchTaxas] = useState("");
  const [searchProdutos, setSearchProdutos] = useState("");
  const [searchFornecedores, setSearchFornecedores] = useState("");
  const [searchTiposServico, setSearchTiposServico] = useState("");
  
  // Estados para Fornecedores
  const [isOpenFornecedor, setIsOpenFornecedor] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<any>(null);
  const [tipoPessoaFornecedor, setTipoPessoaFornecedor] = useState<"PF" | "PJ" | "">("PF");
  const [tiposServicoSelecionados, setTiposServicoSelecionados] = useState<number[]>([]);
  const [chavesPix, setChavesPix] = useState<string[]>([""]); // Múltiplas chaves Pix
  
  // Estados para Tipos de Serviço
  const [isOpenTipoServico, setIsOpenTipoServico] = useState(false);
  const [editingTipoServico, setEditingTipoServico] = useState<any>(null);
  
  // Estados para Tipos de Usuário
  const [isOpenTipoUsuario, setIsOpenTipoUsuario] = useState(false);
  const [editingTipoUsuario, setEditingTipoUsuario] = useState<any>(null);
  const [searchTiposUsuario, setSearchTiposUsuario] = useState("");
  
  // Estados para Tabela de Preço Fornecedores
  const [isOpenTabelaPreco, setIsOpenTabelaPreco] = useState(false);
  const [editingTabelaPreco, setEditingTabelaPreco] = useState<any>(null);
  const [searchTabelaPreco, setSearchTabelaPreco] = useState("");
  
  // Estados para Maquiagem
  const [isOpenMaquiagem, setIsOpenMaquiagem] = useState(false);
  const [editingMaquiagem, setEditingMaquiagem] = useState<any>(null);
  const [searchMaquiagem, setSearchMaquiagem] = useState("");
  const [selectedTurmaMaquiagem, setSelectedTurmaMaquiagem] = useState<number | null>(null);
  const [selectedMaquiagemIds, setSelectedMaquiagemIds] = useState<number[]>([]);
  const [isOpenEdicaoMassa, setIsOpenEdicaoMassa] = useState(false);
  const [sortColumnMaquiagem, setSortColumnMaquiagem] = useState<string | null>(null);
  const [sortDirectionMaquiagem, setSortDirectionMaquiagem] = useState<'asc' | 'desc'>('asc');

  // Estados para ordenação (crescente/decrescente)
  type SortDirection = 'asc' | 'desc' | null;
  type SortConfig = { column: string; direction: SortDirection };
  
  const [sortInstituicoes, setSortInstituicoes] = useState<SortConfig>({ column: '', direction: null });
  const [sortCursos, setSortCursos] = useState<SortConfig>({ column: '', direction: null });
  const [sortCidades, setSortCidades] = useState<SortConfig>({ column: '', direction: null });
  const [sortLocais, setSortLocais] = useState<SortConfig>({ column: '', direction: null });
  const [sortTiposEvento, setSortTiposEvento] = useState<SortConfig>({ column: '', direction: null });
  const [sortTiposServico, setSortTiposServico] = useState<SortConfig>({ column: '', direction: null });
  const [sortFornecedores, setSortFornecedores] = useState<SortConfig>({ column: '', direction: null });
  const [sortTabelaPreco, setSortTabelaPreco] = useState<SortConfig>({ column: '', direction: null });
  const [sortTaxas, setSortTaxas] = useState<SortConfig>({ column: '', direction: null });
  const [sortProdutos, setSortProdutos] = useState<SortConfig>({ column: '', direction: null });
  const [sortTiposUsuario, setSortTiposUsuario] = useState<SortConfig>({ column: '', direction: null });

  // Função genérica para alternar ordenação
  const toggleSort = (column: string, currentSort: SortConfig, setSort: (s: SortConfig) => void) => {
    if (currentSort.column !== column) {
      setSort({ column, direction: 'asc' });
    } else if (currentSort.direction === 'asc') {
      setSort({ column, direction: 'desc' });
    } else {
      setSort({ column: '', direction: null });
    }
  };

  // Função genérica para ordenar dados
  const sortData = <T extends Record<string, any>>(data: T[] | undefined, sortConfig: SortConfig): T[] => {
    if (!data || !sortConfig.column || !sortConfig.direction) return data || [];
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.column];
      const bVal = b[sortConfig.column];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const comparison = String(aVal).localeCompare(String(bVal), 'pt-BR', { numeric: true });
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  };

  // Componente de cabeçalho de coluna com ordenação
  const SortableHeader = ({ column, label, sortConfig, onSort, className = '' }: {
    column: string;
    label: string;
    sortConfig: SortConfig;
    onSort: () => void;
    className?: string;
  }) => (
    <TableHead className={`cursor-pointer hover:bg-slate-100 select-none ${className}`} onClick={onSort}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortConfig.column === column ? 'text-amber-600' : 'text-slate-400'}`} />
        {sortConfig.column === column && (
          <span className="text-xs text-amber-600">
            {sortConfig.direction === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </TableHead>
  );

  // Queries
  const { data: taxas, isLoading: loadingTaxas, refetch: refetchTaxas } = trpc.taxasCartao.list.useQuery();
  const { data: produtos, isLoading: loadingProdutos, refetch: refetchProdutos } = trpc.produtos.list.useQuery();
  const { data: instituicoes, isLoading: loadingInstituicoes, refetch: refetchInstituicoes } = trpc.instituicoes.list.useQuery();
  const { data: cursos, isLoading: loadingCursos, refetch: refetchCursos } = trpc.cursosCadastro.list.useQuery();
  const { data: cidades, isLoading: loadingCidades, refetch: refetchCidades } = trpc.cidades.list.useQuery();
  const { data: locais, isLoading: loadingLocais, refetch: refetchLocais } = trpc.locais.list.useQuery();
  const { data: tiposEvento, isLoading: loadingTiposEvento, refetch: refetchTiposEvento } = trpc.tiposEvento.list.useQuery();
  const { data: fornecedores, isLoading: loadingFornecedores, refetch: refetchFornecedores } = trpc.fornecedores.list.useQuery();
  const { data: tiposServico, isLoading: loadingTiposServico, refetch: refetchTiposServico } = trpc.tiposServico.list.useQuery();
  const { data: tiposUsuario, isLoading: loadingTiposUsuario, refetch: refetchTiposUsuario } = trpc.tiposUsuario.list.useQuery();
  const { data: tabelaPrecos, isLoading: loadingTabelaPrecos, refetch: refetchTabelaPrecos } = trpc.tabelaPrecoFornecedores.list.useQuery();
  const { data: configMaquiagemTurmas, isLoading: loadingMaquiagem, refetch: refetchMaquiagem } = trpc.configMaquiagemTurma.list.useQuery();
  const { data: turmasParaMaquiagem } = trpc.turmas.list.useQuery();
  
  // Ordenar configurações de maquiagem
  const configMaquiagemOrdenadas = useMemo(() => {
    if (!configMaquiagemTurmas) return [];
    
    const configs = [...configMaquiagemTurmas];
    
    if (!sortColumnMaquiagem) return configs;
    
    return configs.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      if (sortColumnMaquiagem === 'turma') {
        const turmaA = turmasParaMaquiagem?.find((t: any) => t.id === a.turmaId);
        const turmaB = turmasParaMaquiagem?.find((t: any) => t.id === b.turmaId);
        aValue = turmaA?.codigo || '';
        bValue = turmaB?.codigo || '';
      } else if (sortColumnMaquiagem === 'valorMasculino') {
        aValue = a.valorMasculino;
        bValue = b.valorMasculino;
      } else if (sortColumnMaquiagem === 'valorFeminino') {
        aValue = a.valorFeminino;
        bValue = b.valorFeminino;
      } else if (sortColumnMaquiagem === 'valorFamilia') {
        aValue = a.valorFamilia;
        bValue = b.valorFamilia;
      }
      
      if (aValue < bValue) return sortDirectionMaquiagem === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirectionMaquiagem === 'asc' ? 1 : -1;
      return 0;
    });
  }, [configMaquiagemTurmas, turmasParaMaquiagem, sortColumnMaquiagem, sortDirectionMaquiagem]);
  
  // Função para ordenar maquiagem
  const handleSortMaquiagem = (column: string) => {
    if (sortColumnMaquiagem === column) {
      setSortDirectionMaquiagem(sortDirectionMaquiagem === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumnMaquiagem(column);
      setSortDirectionMaquiagem('asc');
    }
  };
  
  // Mutations - Maquiagem por Turma
  const createMaquiagemMutation = trpc.configMaquiagemTurma.create.useMutation({
    onSuccess: () => { toast.success("Configuração de maquiagem cadastrada!"); setIsOpenMaquiagem(false); refetchMaquiagem(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateMaquiagemMutation = trpc.configMaquiagemTurma.update.useMutation({
    onSuccess: () => { toast.success("Configuração de maquiagem atualizada!"); setEditingMaquiagem(null); refetchMaquiagem(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const deleteMaquiagemMutation = trpc.configMaquiagemTurma.delete.useMutation({
    onSuccess: () => { toast.success("Configuração de maquiagem excluída!"); refetchMaquiagem(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateMultipleMaquiagemMutation = trpc.configMaquiagemTurma.updateMultiple.useMutation({
    onSuccess: (data) => { 
      toast.success(`${data.count} configurações atualizadas com sucesso!`); 
      setIsOpenEdicaoMassa(false); 
      setSelectedMaquiagemIds([]); 
      refetchMaquiagem(); 
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // Mutations - Taxas
  const createTaxaMutation = trpc.taxasCartao.create.useMutation({
    onSuccess: () => { toast.success("Taxa cadastrada!"); setIsOpenTaxa(false); refetchTaxas(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateTaxaMutation = trpc.taxasCartao.update.useMutation({
    onSuccess: () => { toast.success("Taxa atualizada!"); setEditingTaxa(null); refetchTaxas(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const deleteTaxaMutation = trpc.taxasCartao.delete.useMutation({
    onSuccess: () => { toast.success("Taxa excluída!"); refetchTaxas(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // Mutations - Produtos
  const createProdutoMutation = trpc.produtos.create.useMutation({
    onSuccess: () => { toast.success("Produto cadastrado!"); setIsOpenProduto(false); refetchProdutos(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateProdutoMutation = trpc.produtos.update.useMutation({
    onSuccess: () => { toast.success("Produto atualizado!"); setEditingProduto(null); refetchProdutos(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const deleteProdutoMutation = trpc.produtos.delete.useMutation({
    onSuccess: () => { toast.success("Produto excluído!"); refetchProdutos(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // Mutations - Instituições
  const createInstituicaoMutation = trpc.instituicoes.create.useMutation({
    onSuccess: () => { toast.success("Instituição cadastrada!"); setIsOpenInstituicao(false); refetchInstituicoes(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateInstituicaoMutation = trpc.instituicoes.update.useMutation({
    onSuccess: () => { toast.success("Instituição atualizada!"); setEditingInstituicao(null); refetchInstituicoes(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const deleteInstituicaoMutation = trpc.instituicoes.delete.useMutation({
    onSuccess: () => { toast.success("Instituição excluída!"); refetchInstituicoes(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // Mutations - Cursos
  const createCursoMutation = trpc.cursosCadastro.create.useMutation({
    onSuccess: () => { toast.success("Curso cadastrado!"); setIsOpenCurso(false); refetchCursos(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateCursoMutation = trpc.cursosCadastro.update.useMutation({
    onSuccess: () => { toast.success("Curso atualizado!"); setEditingCurso(null); refetchCursos(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const deleteCursoMutation = trpc.cursosCadastro.delete.useMutation({
    onSuccess: () => { toast.success("Curso excluído!"); refetchCursos(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // Mutations - Cidades
  const createCidadeMutation = trpc.cidades.create.useMutation({
    onSuccess: () => { toast.success("Cidade cadastrada!"); setIsOpenCidade(false); refetchCidades(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateCidadeMutation = trpc.cidades.update.useMutation({
    onSuccess: () => { toast.success("Cidade atualizada!"); setEditingCidade(null); refetchCidades(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const deleteCidadeMutation = trpc.cidades.delete.useMutation({
    onSuccess: () => { toast.success("Cidade excluída!"); refetchCidades(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // Mutations - Locais
  const createLocalMutation = trpc.locais.create.useMutation({
    onSuccess: () => { 
      toast.success("Local cadastrado!"); 
      setIsOpenLocal(false); 
      setNovoLocalNome("");
      refetchLocais(); 
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const deleteLocalMutation = trpc.locais.delete.useMutation({
    onSuccess: () => { toast.success("Local excluído!"); refetchLocais(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateLocalMutation = trpc.locais.update.useMutation({
    onSuccess: () => { toast.success("Local atualizado!"); refetchLocais(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // Mutations - Tipos de Evento
  const createTipoEventoMutation = trpc.tiposEvento.create.useMutation({
    onSuccess: () => { toast.success("Tipo de evento cadastrado!"); setIsOpenTipoEvento(false); refetchTiposEvento(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateTipoEventoMutation = trpc.tiposEvento.update.useMutation({
    onSuccess: () => { toast.success("Tipo de evento atualizado!"); setEditingTipoEvento(null); refetchTiposEvento(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const deleteTipoEventoMutation = trpc.tiposEvento.delete.useMutation({
    onSuccess: () => { toast.success("Tipo de evento excluído!"); refetchTiposEvento(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // Mutations - Tipos de Usuário
  const createTipoUsuarioMutation = trpc.tiposUsuario.create.useMutation({
    onSuccess: () => { toast.success("Tipo de usuário cadastrado!"); setIsOpenTipoUsuario(false); refetchTiposUsuario(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateTipoUsuarioMutation = trpc.tiposUsuario.update.useMutation({
    onSuccess: () => { toast.success("Tipo de usuário atualizado!"); setEditingTipoUsuario(null); refetchTiposUsuario(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const deleteTipoUsuarioMutation = trpc.tiposUsuario.delete.useMutation({
    onSuccess: () => { toast.success("Tipo de usuário excluído!"); refetchTiposUsuario(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // Mutations - Fornecedores
  const createFornecedorMutation = trpc.fornecedores.create.useMutation({
    onSuccess: () => { 
      toast.success("Fornecedor cadastrado!"); 
      setIsOpenFornecedor(false); 
      setTipoPessoaFornecedor("PF");
      setTiposServicoSelecionados([]);
      refetchFornecedores(); 
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateFornecedorMutation = trpc.fornecedores.update.useMutation({
    onSuccess: () => { 
      toast.success("Fornecedor atualizado!"); 
      setEditingFornecedor(null); 
      setTipoPessoaFornecedor("PF");
      setTiposServicoSelecionados([]);
      refetchFornecedores(); 
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const deleteFornecedorMutation = trpc.fornecedores.delete.useMutation({
    onSuccess: () => { toast.success("Fornecedor excluído!"); refetchFornecedores(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // Mutations - Tipos de Serviço
  const createTipoServicoMutation = trpc.tiposServico.create.useMutation({
    onSuccess: () => { toast.success("Tipo de serviço cadastrado!"); setIsOpenTipoServico(false); refetchTiposServico(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateTipoServicoMutation = trpc.tiposServico.update.useMutation({
    onSuccess: () => { toast.success("Tipo de serviço atualizado!"); setEditingTipoServico(null); refetchTiposServico(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const deleteTipoServicoMutation = trpc.tiposServico.delete.useMutation({
    onSuccess: () => { toast.success("Tipo de serviço excluído!"); refetchTiposServico(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // Mutations - Tabela de Preço Fornecedores
  const createTabelaPrecoMutation = trpc.tabelaPrecoFornecedores.create.useMutation({
    onSuccess: () => { toast.success("Preço cadastrado!"); setIsOpenTabelaPreco(false); refetchTabelaPrecos(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateTabelaPrecoMutation = trpc.tabelaPrecoFornecedores.update.useMutation({
    onSuccess: () => { toast.success("Preço atualizado!"); setEditingTabelaPreco(null); refetchTabelaPrecos(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const deleteTabelaPrecoMutation = trpc.tabelaPrecoFornecedores.delete.useMutation({
    onSuccess: () => { toast.success("Preço excluído!"); refetchTabelaPrecos(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // Função para encontrar locais similares
  const findSimilarLocais = (nome: string): string[] => {
    if (!nome.trim() || !locais) return [];
    const nomeNormalizado = nome.toLowerCase().trim();
    const palavras = nomeNormalizado.split(/\s+/).filter(p => p.length > 2);
    
    return locais
      .filter((local: any) => {
        const localNome = local.nome.toLowerCase();
        // Verifica se alguma palavra do novo nome está contida no local existente ou vice-versa
        return palavras.some(palavra => 
          localNome.includes(palavra) || palavra.includes(localNome.split(/\s+/).find((p: string) => p.length > 2) || '')
        );
      })
      .map((local: any) => local.nome);
  };

  // Handler para submeter novo local
  const handleSubmitLocal = () => {
    const nome = novoLocalNome.trim().toUpperCase();
    if (!nome) {
      toast.error("Digite o nome do local");
      return;
    }
    
    // Verifica duplicado exato
    const duplicadoExato = locais?.some((local: any) => 
      local.nome.toLowerCase() === nome.toLowerCase()
    );
    if (duplicadoExato) {
      toast.error("Já existe um local com este nome!");
      return;
    }
    
    // Verifica similares
    const similares = findSimilarLocais(nome);
    if (similares.length > 0) {
      setLocaisSimilares(similares);
      setShowSimilarAlert(true);
      return;
    }
    
    // Se não houver similares, cadastra direto
    createLocalMutation.mutate({ nome });
  };

  // Handler para confirmar cadastro mesmo com similares
  const handleConfirmLocalWithSimilar = () => {
    const nome = novoLocalNome.trim().toUpperCase();
    setShowSimilarAlert(false);
    setLocaisSimilares([]);
    createLocalMutation.mutate({ nome });
  };

  // Handler para editar local
  const handleSubmitEditLocal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nome = (formData.get("nome") as string).trim().toUpperCase();
    
    // Validação de duplicado
    const duplicado = locais?.some((local: any) => 
      local.nome.toLowerCase() === nome.toLowerCase() && local.id !== editingLocal?.id
    );
    if (duplicado) {
      toast.error("Já existe um local com este nome!");
      return;
    }
    
    updateLocalMutation.mutate({ id: editingLocal.id, nome });
    setEditingLocal(null);
  };

  // Handlers
  const handleSubmitTaxa = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      bandeira: formData.get("bandeira") as string,
      tipoPagamento: formData.get("tipoPagamento") as "debito" | "credito",
      parcelas: parseInt(formData.get("parcelas") as string),
      taxaPercentual: Math.round(parseFloat(formData.get("taxaPercentual") as string) * 100),
    };
    if (editingTaxa) updateTaxaMutation.mutate({ id: editingTaxa.id, ...data });
    else createTaxaMutation.mutate(data);
  };

  const handleSubmitProduto = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nome: formData.get("nome") as string,
      descricao: formData.get("descricao") as string || undefined,
      preco: Math.round(parseFloat(formData.get("preco") as string) * 100),
      ativo: true,
    };
    if (editingProduto) updateProdutoMutation.mutate({ id: editingProduto.id, ...data });
    else createProdutoMutation.mutate(data);
  };

  const handleSubmitInstituicao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nome: formData.get("nome") as string,
      sigla: formData.get("sigla") as string || undefined,
    };
    if (editingInstituicao) updateInstituicaoMutation.mutate({ id: editingInstituicao.id, ...data });
    else createInstituicaoMutation.mutate(data);
  };

  const handleSubmitCurso = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = { nome: formData.get("nome") as string };
    if (editingCurso) updateCursoMutation.mutate({ id: editingCurso.id, ...data });
    else createCursoMutation.mutate(data);
  };

  const handleSubmitCidade = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nome: formData.get("nome") as string,
      estado: formData.get("estado") as string,
    };
    if (editingCidade) updateCidadeMutation.mutate({ id: editingCidade.id, ...data });
    else createCidadeMutation.mutate(data);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  };

  // Handler para Fornecedor
  const handleSubmitFornecedor = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Filtrar chaves Pix vazias
    const chavesPixFiltradas = chavesPix.filter(c => c.trim() !== "");
    
    // Validar que pelo menos uma chave Pix foi informada
    if (chavesPixFiltradas.length === 0) {
      toast.error("Informe pelo menos uma Chave Pix");
      return;
    }
    
    const cpfCnpjValue = formData.get("cpfCnpj") as string;
    const data = {
      tipoPessoa: tipoPessoaFornecedor || undefined,
      cpfCnpj: cpfCnpjValue ? cpfCnpjValue.replace(/\D/g, "") : undefined,
      nome: formData.get("nome") as string,
      email: formData.get("email") as string || undefined,
      telefone: formData.get("telefone") as string || undefined,
      tiposServico: JSON.stringify(tiposServicoSelecionados),
      cep: formData.get("cep") as string || undefined,
      logradouro: formData.get("logradouro") as string || undefined,
      bairro: formData.get("bairro") as string || undefined,
      cidade: formData.get("cidade") as string || undefined,
      estado: formData.get("estado") as string || undefined,
      banco: formData.get("banco") as string || undefined,
      agencia: formData.get("agencia") as string || undefined,
      conta: formData.get("conta") as string || undefined,
      pix: chavesPixFiltradas[0] || undefined, // Campo legado
      chavesPix: JSON.stringify(chavesPixFiltradas), // Múltiplas chaves Pix
    };
    
    if (editingFornecedor) {
      updateFornecedorMutation.mutate({ id: editingFornecedor.id, ...data });
    } else {
      createFornecedorMutation.mutate(data);
    }
  };

  // Handler para Tabela de Preço Fornecedores
  const handleSubmitTabelaPreco = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Validações
    const fornecedorIdStr = formData.get("fornecedorId") as string;
    const tipoServicoIdStr = formData.get("tipoServicoId") as string;
    const tipoEventoIdStr = formData.get("tipoEventoId") as string;
    const valorStr = formData.get("valor") as string;
    
    if (!fornecedorIdStr || isNaN(parseInt(fornecedorIdStr))) {
      toast.error("Selecione um fornecedor");
      return;
    }
    if (!tipoServicoIdStr || isNaN(parseInt(tipoServicoIdStr))) {
      toast.error("Selecione um tipo de serviço");
      return;
    }
    if (!tipoEventoIdStr || isNaN(parseInt(tipoEventoIdStr))) {
      toast.error("Selecione um tipo de evento");
      return;
    }
    if (!valorStr || isNaN(parseFloat(valorStr))) {
      toast.error("Informe o valor");
      return;
    }
    
    const data = {
      fornecedorId: parseInt(fornecedorIdStr),
      tipoServicoId: parseInt(tipoServicoIdStr),
      tipoEventoId: parseInt(tipoEventoIdStr),
      valor: Math.round(parseFloat(valorStr) * 100),
    };
    
    if (editingTabelaPreco) {
      updateTabelaPrecoMutation.mutate({ id: editingTabelaPreco.id, ...data });
    } else {
      createTabelaPrecoMutation.mutate(data);
    }
  };

  // Handler para Tipo de Serviço
  const handleSubmitTipoServico = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nome = (formData.get("nome") as string).trim();
    
    // Validação de duplicado
    const duplicado = tiposServico?.some((t: any) => 
      t.nome.toLowerCase() === nome.toLowerCase() && t.id !== editingTipoServico?.id
    );
    if (duplicado) {
      toast.error("Já existe um tipo de serviço com este nome!");
      return;
    }
    
    if (editingTipoServico) {
      updateTipoServicoMutation.mutate({ id: editingTipoServico.id, nome });
    } else {
      createTipoServicoMutation.mutate({ nome });
    }
  };

  // Handler para Tipo de Usuário
  const handleSubmitTipoUsuario = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nome = (formData.get("nome") as string).trim();
    
    // Validação de duplicado
    const duplicado = tiposUsuario?.some((t: any) => 
      t.nome.toLowerCase() === nome.toLowerCase() && t.id !== editingTipoUsuario?.id
    );
    if (duplicado) {
      toast.error("Já existe um tipo de usuário com este nome!");
      return;
    }
    
    if (editingTipoUsuario) {
      updateTipoUsuarioMutation.mutate({ id: editingTipoUsuario.id, nome });
    } else {
      createTipoUsuarioMutation.mutate({ nome });
    }
  };

  // Handler para Tipo de Evento
  const handleSubmitTipoEvento = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nome = (formData.get("nome") as string).trim();
    const codigo = (formData.get("codigo") as string).trim().toLowerCase().replace(/\s+/g, "_");
    const cor = formData.get("cor") as string;
    
    // Validação de duplicado
    const duplicado = tiposEvento?.some((t: any) => 
      t.nome.toLowerCase() === nome.toLowerCase() && t.id !== editingTipoEvento?.id
    );
    if (duplicado) {
      toast.error("Já existe um tipo de evento com este nome!");
      return;
    }
    
    if (editingTipoEvento) {
      updateTipoEventoMutation.mutate({ id: editingTipoEvento.id, nome, codigo, cor });
    } else {
      createTipoEventoMutation.mutate({ nome, codigo, cor });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 mt-1">Gerencie cadastros auxiliares e configurações do sistema</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 w-full h-auto p-1">
          {abasDisponiveis.map((aba) => (
            <TabsTrigger key={aba.value} value={aba.value} className="flex items-center gap-2">
              <aba.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{aba.label}</span>
            </TabsTrigger>
          ))}
          {isAdmin && (
            <TabsTrigger value="usuarios" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Instituições */}
        <TabsContent value="instituicoes">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  Instituições
                </CardTitle>
                <CardDescription>Cadastre as instituições de ensino</CardDescription>
              </div>
              <Dialog open={isOpenInstituicao || !!editingInstituicao} onOpenChange={(open) => {
                setIsOpenInstituicao(open);
                if (!open) setEditingInstituicao(null);
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Instituição
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingInstituicao ? "Editar Instituição" : "Nova Instituição"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitInstituicao} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input name="nome" required defaultValue={editingInstituicao?.nome} placeholder="Ex: Universidade Federal de Pernambuco" />
                    </div>
                    <div className="space-y-2">
                      <Label>Sigla</Label>
                      <Input name="sigla" defaultValue={editingInstituicao?.sigla} placeholder="Ex: UFPE" />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => { setIsOpenInstituicao(false); setEditingInstituicao(null); }}>Cancelar</Button>
                      <Button type="submit" className="bg-gradient-to-r from-blue-500 to-blue-600">
                        {editingInstituicao ? "Salvar" : "Cadastrar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {/* Campo de busca */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar instituição..."
                    value={searchInstituicoes}
                    onChange={(e) => setSearchInstituicoes(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {loadingInstituicoes ? <Skeleton className="h-32 w-full" /> : instituicoes?.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma instituição cadastrada</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                      <TableRow className="bg-white">
                        <SortableHeader column="nome" label="Nome" sortConfig={sortInstituicoes} onSort={() => toggleSort('nome', sortInstituicoes, setSortInstituicoes)} />
                        <SortableHeader column="sigla" label="Sigla" sortConfig={sortInstituicoes} onSort={() => toggleSort('sigla', sortInstituicoes, setSortInstituicoes)} />
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortData(instituicoes?.filter((inst) => 
                        inst.nome.toLowerCase().includes(searchInstituicoes.toLowerCase()) ||
                        (inst.sigla && inst.sigla.toLowerCase().includes(searchInstituicoes.toLowerCase()))
                      ), sortInstituicoes).map((inst) => (
                        <TableRow key={inst.id}>
                          <TableCell className="font-medium">{inst.nome}</TableCell>
                          <TableCell className="text-slate-500">{inst.sigla || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setEditingInstituicao(inst)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => confirm("Excluir?") && deleteInstituicaoMutation.mutate({ id: inst.id })} className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cursos */}
        <TabsContent value="cursos">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="h-5 w-5 text-amber-500" />
                  Cursos
                </CardTitle>
                <CardDescription>Cadastre os cursos de graduação</CardDescription>
              </div>
              <Dialog open={isOpenCurso || !!editingCurso} onOpenChange={(open) => {
                setIsOpenCurso(open);
                if (!open) setEditingCurso(null);
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-amber-500 to-orange-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Curso
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCurso ? "Editar Curso" : "Novo Curso"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitCurso} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input name="nome" required defaultValue={editingCurso?.nome} placeholder="Ex: Medicina" />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => { setIsOpenCurso(false); setEditingCurso(null); }}>Cancelar</Button>
                      <Button type="submit" className="bg-gradient-to-r from-amber-500 to-orange-600">
                        {editingCurso ? "Salvar" : "Cadastrar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {/* Campo de busca */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar curso..."
                    value={searchCursos}
                    onChange={(e) => setSearchCursos(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {loadingCursos ? <Skeleton className="h-32 w-full" /> : cursos?.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum curso cadastrado</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                      <TableRow className="bg-white">
                        <SortableHeader column="nome" label="Nome" sortConfig={sortCursos} onSort={() => toggleSort('nome', sortCursos, setSortCursos)} />
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortData(cursos?.filter((curso) => 
                        curso.nome.toLowerCase().includes(searchCursos.toLowerCase())
                      ), sortCursos).map((curso) => (
                        <TableRow key={curso.id}>
                          <TableCell className="font-medium">{curso.nome}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setEditingCurso(curso)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => confirm("Excluir?") && deleteCursoMutation.mutate({ id: curso.id })} className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cidades */}
        <TabsContent value="cidades">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-emerald-500" />
                  Cidades
                </CardTitle>
                <CardDescription>Cadastre as cidades de atuação</CardDescription>
              </div>
              <Dialog open={isOpenCidade || !!editingCidade} onOpenChange={(open) => {
                setIsOpenCidade(open);
                if (!open) setEditingCidade(null);
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-emerald-500 to-green-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Cidade
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCidade ? "Editar Cidade" : "Nova Cidade"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitCidade} className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label>Cidade *</Label>
                        <Input name="nome" required defaultValue={editingCidade?.nome} placeholder="Ex: Recife" />
                      </div>
                      <div className="space-y-2">
                        <Label>Estado *</Label>
                        <Select name="estado" defaultValue={editingCidade?.estado}>
                          <SelectTrigger>
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent>
                            {ESTADOS.map((uf) => (
                              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => { setIsOpenCidade(false); setEditingCidade(null); }}>Cancelar</Button>
                      <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-green-600">
                        {editingCidade ? "Salvar" : "Cadastrar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {/* Campo de busca */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar cidade..."
                    value={searchCidades}
                    onChange={(e) => setSearchCidades(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {loadingCidades ? <Skeleton className="h-32 w-full" /> : cidades?.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma cidade cadastrada</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                      <TableRow className="bg-white">
                        <SortableHeader column="nome" label="Cidade" sortConfig={sortCidades} onSort={() => toggleSort('nome', sortCidades, setSortCidades)} />
                        <SortableHeader column="estado" label="Estado" sortConfig={sortCidades} onSort={() => toggleSort('estado', sortCidades, setSortCidades)} />
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortData(cidades?.filter((cidade) => 
                        cidade.nome.toLowerCase().includes(searchCidades.toLowerCase()) ||
                        cidade.estado.toLowerCase().includes(searchCidades.toLowerCase())
                      ), sortCidades).map((cidade) => (
                        <TableRow key={cidade.id}>
                          <TableCell className="font-medium">{cidade.nome}</TableCell>
                          <TableCell className="text-slate-500">{cidade.estado}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setEditingCidade(cidade)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => confirm("Excluir?") && deleteCidadeMutation.mutate({ id: cidade.id })} className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locais */}
        <TabsContent value="locais">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPinned className="h-5 w-5 text-orange-500" />
                  Locais
                </CardTitle>
                <CardDescription>Gerencie os locais de eventos fotográficos</CardDescription>
              </div>
              <Dialog open={isOpenLocal} onOpenChange={(open) => {
                setIsOpenLocal(open);
                if (!open) setNovoLocalNome("");
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-orange-500 to-amber-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Local
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Local</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome do Local *</Label>
                      <Input 
                        value={novoLocalNome}
                        onChange={(e) => setNovoLocalNome(e.target.value.toUpperCase())}
                        placeholder="Ex: FACULDADE UNIFACISA" 
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => { setIsOpenLocal(false); setNovoLocalNome(""); }}>Cancelar</Button>
                      <Button 
                        onClick={handleSubmitLocal}
                        className="bg-gradient-to-r from-orange-500 to-amber-600"
                        disabled={createLocalMutation.isPending}
                      >
                        {createLocalMutation.isPending ? "Cadastrando..." : "Cadastrar"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {/* Campo de busca */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar local..."
                    value={searchLocais}
                    onChange={(e) => setSearchLocais(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {loadingLocais ? <Skeleton className="h-32 w-full" /> : locais?.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <MapPinned className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum local cadastrado</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                      <TableRow className="bg-white">
                        <SortableHeader column="nome" label="Nome do Local" sortConfig={sortLocais} onSort={() => toggleSort('nome', sortLocais, setSortLocais)} />
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortData(locais?.filter((local: any) => 
                        local.nome.toLowerCase().includes(searchLocais.toLowerCase())
                      ), sortLocais).map((local: any) => (
                        <TableRow key={local.id}>
                          <TableCell className="font-medium">{local.nome}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEditingLocal(local)} 
                              className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => confirm("Tem certeza que deseja excluir este local?") && deleteLocalMutation.mutate({ id: local.id })} 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {/* Modal de edição de local */}
              <Dialog open={!!editingLocal} onOpenChange={(open) => !open && setEditingLocal(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Local</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitEditLocal} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome do Local *</Label>
                      <Input 
                        name="nome"
                        defaultValue={editingLocal?.nome}
                        placeholder="Ex: FACULDADE UNIFACISA" 
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setEditingLocal(null)}>Cancelar</Button>
                      <Button 
                        type="submit"
                        className="bg-gradient-to-r from-orange-500 to-amber-600"
                        disabled={updateLocalMutation.isPending}
                      >
                        {updateLocalMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tipos de Evento */}
        <TabsContent value="tiposEvento">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarCheck className="h-5 w-5 text-indigo-500" />
                  Tipos de Evento
                </CardTitle>
                <CardDescription>Gerencie os tipos de eventos fotográficos</CardDescription>
              </div>
              <Dialog open={isOpenTipoEvento || !!editingTipoEvento} onOpenChange={(open) => {
                setIsOpenTipoEvento(open);
                if (!open) setEditingTipoEvento(null);
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Tipo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingTipoEvento ? "Editar Tipo de Evento" : "Novo Tipo de Evento"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitTipoEvento} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input 
                        name="nome" 
                        required 
                        defaultValue={editingTipoEvento?.nome} 
                        placeholder="Ex: Foto Estúdio" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Código *</Label>
                      <Input 
                        name="codigo" 
                        required 
                        defaultValue={editingTipoEvento?.codigo} 
                        placeholder="Ex: foto_estudio" 
                      />
                      <p className="text-xs text-slate-500">Identificador único (sem espaços, use underline)</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Cor</Label>
                      <div className="flex gap-2">
                        <Input 
                          name="cor" 
                          type="color"
                          defaultValue={editingTipoEvento?.cor || "#3b82f6"} 
                          className="w-16 h-10 p-1"
                        />
                        <span className="text-sm text-slate-500 self-center">Cor para exibição no calendário</span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => { setIsOpenTipoEvento(false); setEditingTipoEvento(null); }}>Cancelar</Button>
                      <Button type="submit" className="bg-gradient-to-r from-indigo-500 to-purple-600">
                        {editingTipoEvento ? "Salvar" : "Cadastrar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {/* Campo de busca */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar tipo de evento..."
                    value={searchTiposEvento}
                    onChange={(e) => setSearchTiposEvento(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {loadingTiposEvento ? <Skeleton className="h-32 w-full" /> : tiposEvento?.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum tipo de evento cadastrado</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                      <TableRow className="bg-white">
                        <TableHead>Cor</TableHead>
                        <SortableHeader column="nome" label="Nome" sortConfig={sortTiposEvento} onSort={() => toggleSort('nome', sortTiposEvento, setSortTiposEvento)} />
                        <SortableHeader column="codigo" label="Código" sortConfig={sortTiposEvento} onSort={() => toggleSort('codigo', sortTiposEvento, setSortTiposEvento)} />
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortData(tiposEvento?.filter((tipo: any) => 
                        tipo.nome.toLowerCase().includes(searchTiposEvento.toLowerCase()) ||
                        tipo.codigo.toLowerCase().includes(searchTiposEvento.toLowerCase())
                      ), sortTiposEvento).map((tipo: any) => (
                        <TableRow key={tipo.id}>
                          <TableCell>
                            <div 
                              className="w-6 h-6 rounded-full border" 
                              style={{ backgroundColor: tipo.cor || '#3b82f6' }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{tipo.nome}</TableCell>
                          <TableCell className="text-slate-500 font-mono text-sm">{tipo.codigo}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEditingTipoEvento(tipo)} 
                              className="text-slate-500 hover:text-slate-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => confirm("Tem certeza que deseja excluir este tipo de evento?") && deleteTipoEventoMutation.mutate({ id: tipo.id })} 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
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
        </TabsContent>

        {/* Tipos de Serviço */}
        <TabsContent value="tiposServico">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wrench className="h-5 w-5 text-orange-500" />
                  Tipos de Serviço
                </CardTitle>
                <CardDescription>Gerencie os tipos de serviço/compra dos fornecedores</CardDescription>
              </div>
              <Dialog open={isOpenTipoServico} onOpenChange={setIsOpenTipoServico}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="h-4 w-4 mr-2" /> Novo Tipo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Tipo de Serviço</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitTipoServico} className="space-y-4">
                    <div>
                      <Label htmlFor="nome">Nome *</Label>
                      <Input id="nome" name="nome" required placeholder="Ex: Maquiagem, Transporte, Buffet" />
                    </div>
                    <Button type="submit" className="w-full">Cadastrar</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar tipo de serviço..."
                  value={searchTiposServico}
                  onChange={(e) => setSearchTiposServico(e.target.value)}
                  className="pl-10"
                />
              </div>
              {loadingTiposServico ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                      <TableRow className="bg-white">
                        <SortableHeader column="nome" label="Nome" sortConfig={sortTiposServico} onSort={() => toggleSort('nome', sortTiposServico, setSortTiposServico)} />
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortData(tiposServico?.filter((tipo: any) => 
                        tipo.nome.toLowerCase().includes(searchTiposServico.toLowerCase())
                      ), sortTiposServico).map((tipo: any) => (
                        <TableRow key={tipo.id}>
                          <TableCell className="font-medium">{tipo.nome}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEditingTipoServico(tipo)} 
                              className="text-slate-500 hover:text-slate-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => confirm("Tem certeza que deseja excluir este tipo de serviço?") && deleteTipoServicoMutation.mutate({ id: tipo.id })} 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
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
        </TabsContent>

        {/* Fornecedores */}
        <TabsContent value="fornecedores">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-purple-500" />
                  Fornecedores
                </CardTitle>
                <CardDescription>Gerencie os fornecedores de serviços e produtos</CardDescription>
              </div>
              <Dialog open={isOpenFornecedor} onOpenChange={(open) => {
                setIsOpenFornecedor(open);
                if (open) {
                  // Limpar campos ao ABRIR o modal
                  setTipoPessoaFornecedor("");
                  setTiposServicoSelecionados([]);
                  setChavesPix([""]);
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-500 hover:bg-purple-600">
                    <Plus className="h-4 w-4 mr-2" /> Novo Fornecedor
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Novo Fornecedor</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitFornecedor} className="space-y-4">
                    <div>
                      <Label htmlFor="nome">Nome / Razão Social *</Label>
                      <Input id="nome" name="nome" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo de Pessoa</Label>
                        <Select value={tipoPessoaFornecedor} onValueChange={(v: "PF" | "PJ" | "") => setTipoPessoaFornecedor(v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PF">Pessoa Física (CPF)</SelectItem>
                            <SelectItem value="PJ">Pessoa Jurídica (CNPJ)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="cpfCnpj">{tipoPessoaFornecedor === "PJ" ? "CNPJ" : "CPF"}</Label>
                        <Input id="cpfCnpj" name="cpfCnpj" placeholder={tipoPessoaFornecedor === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">E-mail</Label>
                        <Input id="email" name="email" type="email" />
                      </div>
                      <div>
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input id="telefone" name="telefone" />
                      </div>
                    </div>
                    <div>
                      <Label>Tipos de Serviço/Compra</Label>
                      <div className="flex flex-wrap gap-2 mt-2 p-3 border rounded-md bg-slate-50">
                        {tiposServico?.map((tipo: any) => (
                          <Button
                            key={tipo.id}
                            type="button"
                            variant={tiposServicoSelecionados.includes(tipo.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              if (tiposServicoSelecionados.includes(tipo.id)) {
                                setTiposServicoSelecionados(tiposServicoSelecionados.filter(id => id !== tipo.id));
                              } else {
                                setTiposServicoSelecionados([...tiposServicoSelecionados, tipo.id]);
                              }
                            }}
                          >
                            {tipo.nome}
                          </Button>
                        ))}
                        {(!tiposServico || tiposServico.length === 0) && (
                          <p className="text-sm text-slate-500">Nenhum tipo de serviço cadastrado. Cadastre na aba "Tipos Serviço".</p>
                        )}
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Endereço</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="cep">CEP</Label>
                          <Input id="cep" name="cep" placeholder="00000-000" />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="logradouro">Logradouro</Label>
                          <Input id="logradouro" name="logradouro" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div>
                          <Label htmlFor="bairro">Bairro</Label>
                          <Input id="bairro" name="bairro" />
                        </div>
                        <div>
                          <Label htmlFor="cidade">Cidade</Label>
                          <Input id="cidade" name="cidade" />
                        </div>
                        <div>
                          <Label htmlFor="estado">Estado</Label>
                          <Select name="estado">
                            <SelectTrigger>
                              <SelectValue placeholder="UF" />
                            </SelectTrigger>
                            <SelectContent>
                              {ESTADOS.map((uf) => (
                                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Dados Bancários</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="banco">Banco</Label>
                          <Input id="banco" name="banco" />
                        </div>
                        <div>
                          <Label htmlFor="agencia">Agência</Label>
                          <Input id="agencia" name="agencia" />
                        </div>
                        <div>
                          <Label htmlFor="conta">Conta</Label>
                          <Input id="conta" name="conta" />
                        </div>
                      </div>
                      <div className="mt-3">
                        <Label>Chaves Pix *</Label>
                        <div className="space-y-2">
                          {chavesPix.map((chave, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                value={chave}
                                onChange={(e) => {
                                  const novasChaves = [...chavesPix];
                                  novasChaves[index] = e.target.value;
                                  setChavesPix(novasChaves);
                                }}
                                placeholder="CPF, CNPJ, E-mail, Telefone ou Chave aleatória"
                              />
                              {chavesPix.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    setChavesPix(chavesPix.filter((_, i) => i !== index));
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setChavesPix([...chavesPix, ""])}
                          >
                            <Plus className="h-4 w-4 mr-2" /> Adicionar Chave Pix
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button type="submit" className="w-full">Cadastrar</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar fornecedor..."
                  value={searchFornecedores}
                  onChange={(e) => setSearchFornecedores(e.target.value)}
                  className="pl-10"
                />
              </div>
              {loadingFornecedores ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                      <TableRow className="bg-white">
                        <SortableHeader column="tipoPessoa" label="Tipo" sortConfig={sortFornecedores} onSort={() => toggleSort('tipoPessoa', sortFornecedores, setSortFornecedores)} />
                        <SortableHeader column="cpfCnpj" label="CPF/CNPJ" sortConfig={sortFornecedores} onSort={() => toggleSort('cpfCnpj', sortFornecedores, setSortFornecedores)} />
                        <SortableHeader column="nome" label="Nome" sortConfig={sortFornecedores} onSort={() => toggleSort('nome', sortFornecedores, setSortFornecedores)} />
                        <SortableHeader column="telefone" label="Telefone" sortConfig={sortFornecedores} onSort={() => toggleSort('telefone', sortFornecedores, setSortFornecedores)} />
                        <TableHead>Serviços</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortData(fornecedores?.filter((f: any) => 
                        f.nome.toLowerCase().includes(searchFornecedores.toLowerCase()) ||
                        (f.cpfCnpj && f.cpfCnpj.includes(searchFornecedores))
                      ), sortFornecedores).map((fornecedor: any) => {
                        const servicosIds = fornecedor.tiposServico ? JSON.parse(fornecedor.tiposServico) : [];
                        const servicosNomes = tiposServico?.filter((t: any) => servicosIds.includes(t.id)).map((t: any) => t.nome).join(", ") || "-";
                        return (
                          <TableRow key={fornecedor.id}>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${fornecedor.tipoPessoa === "PF" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                                {fornecedor.tipoPessoa}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{fornecedor.cpfCnpj}</TableCell>
                            <TableCell className="font-medium">{fornecedor.nome}</TableCell>
                            <TableCell>{fornecedor.telefone || "-"}</TableCell>
                            <TableCell className="whitespace-normal break-words" title={servicosNomes}>{servicosNomes}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => {
                                    setEditingFornecedor(fornecedor);
                                    setTipoPessoaFornecedor(fornecedor.tipoPessoa || "");
                                    setTiposServicoSelecionados(fornecedor.tiposServico ? JSON.parse(fornecedor.tiposServico) : []);
                                    // Carregar chaves Pix (prioriza chavesPix, fallback para pix legado)
                                    const chavesExistentes = fornecedor.chavesPix 
                                      ? JSON.parse(fornecedor.chavesPix) 
                                      : (fornecedor.pix ? [fornecedor.pix] : [""]);
                                    setChavesPix(chavesExistentes.length > 0 ? chavesExistentes : [""]);
                                    setIsOpenFornecedor(true); // Abrir o Dialog
                                  }} 
                                  className="text-slate-500 hover:text-slate-700 flex-shrink-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => confirm("Tem certeza que deseja excluir este fornecedor?") && deleteFornecedorMutation.mutate({ id: fornecedor.id })} 
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tabela de Preço Fornecedores */}
        <TabsContent value="tabelaPreco">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Tabela de Preços - Fornecedores
                </CardTitle>
                <CardDescription>Defina os preços por fornecedor, tipo de serviço e tipo de evento</CardDescription>
              </div>
              <Dialog open={isOpenTabelaPreco} onOpenChange={setIsOpenTabelaPreco}>
                <DialogTrigger asChild>
                  <Button className="bg-green-500 hover:bg-green-600">
                    <Plus className="h-4 w-4 mr-2" /> Novo Preço
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Preço</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitTabelaPreco} className="space-y-4">
                    <div>
                      <Label htmlFor="fornecedorId">Fornecedor *</Label>
                      <Select name="fornecedorId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o fornecedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {fornecedores?.map((f: any) => (
                            <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tipoServicoId">Tipo de Serviço *</Label>
                      <Select name="tipoServicoId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposServico?.map((t: any) => (
                            <SelectItem key={t.id} value={t.id.toString()}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tipoEventoId">Tipo de Evento *</Label>
                      <Select name="tipoEventoId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de evento" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposEvento?.map((t: any) => (
                            <SelectItem key={t.id} value={t.id.toString()}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="valor">Valor (R$) *</Label>
                      <Input id="valor" name="valor" type="number" step="0.01" min="0" required placeholder="0,00" />
                    </div>
                    <Button type="submit" className="w-full">Cadastrar</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por fornecedor..."
                  value={searchTabelaPreco}
                  onChange={(e) => setSearchTabelaPreco(e.target.value)}
                  className="pl-10"
                />
              </div>
              {loadingTabelaPrecos ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                      <TableRow className="bg-white">
                        <SortableHeader column="fornecedorId" label="Fornecedor" sortConfig={sortTabelaPreco} onSort={() => toggleSort('fornecedorId', sortTabelaPreco, setSortTabelaPreco)} />
                        <SortableHeader column="tipoServicoId" label="Tipo de Serviço" sortConfig={sortTabelaPreco} onSort={() => toggleSort('tipoServicoId', sortTabelaPreco, setSortTabelaPreco)} />
                        <SortableHeader column="tipoEventoId" label="Tipo de Evento" sortConfig={sortTabelaPreco} onSort={() => toggleSort('tipoEventoId', sortTabelaPreco, setSortTabelaPreco)} />
                        <SortableHeader column="valor" label="Valor" sortConfig={sortTabelaPreco} onSort={() => toggleSort('valor', sortTabelaPreco, setSortTabelaPreco)} />
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortData(tabelaPrecos?.filter((item: any) => {
                        const fornecedor = fornecedores?.find((f: any) => f.id === item.fornecedorId);
                        return fornecedor?.nome.toLowerCase().includes(searchTabelaPreco.toLowerCase());
                      }), sortTabelaPreco).map((item: any) => {
                        const fornecedor = fornecedores?.find((f: any) => f.id === item.fornecedorId);
                        const tipoServico = tiposServico?.find((t: any) => t.id === item.tipoServicoId);
                        const tipoEvento = tiposEvento?.find((t: any) => t.id === item.tipoEventoId);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{fornecedor?.nome || "-"}</TableCell>
                            <TableCell>{tipoServico?.nome || "-"}</TableCell>
                            <TableCell>{tipoEvento?.nome || "-"}</TableCell>
                            <TableCell className="font-medium text-green-600">{formatCurrency(item.valor)}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setEditingTabelaPreco(item)} 
                                className="text-slate-500 hover:text-slate-700"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => confirm("Tem certeza que deseja excluir este preço?") && deleteTabelaPrecoMutation.mutate({ id: item.id })} 
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
        </TabsContent>

        {/* AlertDialog para nomes similares */}
        <AlertDialog open={showSimilarAlert} onOpenChange={setShowSimilarAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Nomes Similares Encontrados
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  <p className="mb-3">Foram encontrados locais com nomes similares ao que você está tentando cadastrar:</p>
                  <ul className="list-disc list-inside space-y-1 bg-slate-50 p-3 rounded-lg">
                    {locaisSimilares.map((nome, idx) => (
                      <li key={idx} className="text-slate-700 font-medium">{nome}</li>
                    ))}
                  </ul>
                  <p className="mt-3">Deseja cadastrar mesmo assim?</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setShowSimilarAlert(false); setLocaisSimilares([]); }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmLocalWithSimilar}
                className="bg-gradient-to-r from-orange-500 to-amber-600"
              >
                Cadastrar Mesmo Assim
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Taxas de Cartão */}
        <TabsContent value="taxas">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5 text-violet-500" />
                  Taxas de Cartão
                </CardTitle>
                <CardDescription>Configure as taxas por bandeira e parcelas</CardDescription>
              </div>
              <Dialog open={isOpenTaxa || !!editingTaxa} onOpenChange={(open) => {
                setIsOpenTaxa(open);
                if (!open) setEditingTaxa(null);
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-violet-500 to-purple-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Taxa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingTaxa ? "Editar Taxa" : "Nova Taxa"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitTaxa} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Bandeira</Label>
                        <Select name="bandeira" defaultValue={editingTaxa?.bandeira}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {BANDEIRAS.map((b) => (<SelectItem key={b} value={b}>{b}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select name="tipoPagamento" defaultValue={editingTaxa?.tipoPagamento || "credito"}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="credito">Crédito</SelectItem>
                            <SelectItem value="debito">Débito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Parcelas</Label>
                        <Select name="parcelas" defaultValue={editingTaxa?.parcelas?.toString() || "1"}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((p) => (<SelectItem key={p} value={p.toString()}>{p}x</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Taxa (%)</Label>
                        <Input name="taxaPercentual" type="number" step="0.01" required defaultValue={editingTaxa ? (editingTaxa.taxaPercentual / 100).toFixed(2) : ""} placeholder="2.99" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => { setIsOpenTaxa(false); setEditingTaxa(null); }}>Cancelar</Button>
                      <Button type="submit" className="bg-gradient-to-r from-violet-500 to-purple-600">{editingTaxa ? "Salvar" : "Cadastrar"}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {/* Campo de busca */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar taxa..."
                    value={searchTaxas}
                    onChange={(e) => setSearchTaxas(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {loadingTaxas ? <Skeleton className="h-32 w-full" /> : taxas?.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma taxa cadastrada</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                      <TableRow className="bg-white">
                        <SortableHeader column="bandeira" label="Bandeira" sortConfig={sortTaxas} onSort={() => toggleSort('bandeira', sortTaxas, setSortTaxas)} />
                        <SortableHeader column="tipoPagamento" label="Tipo" sortConfig={sortTaxas} onSort={() => toggleSort('tipoPagamento', sortTaxas, setSortTaxas)} />
                        <SortableHeader column="parcelas" label="Parcelas" sortConfig={sortTaxas} onSort={() => toggleSort('parcelas', sortTaxas, setSortTaxas)} />
                        <SortableHeader column="taxaPercentual" label="Taxa (%)" sortConfig={sortTaxas} onSort={() => toggleSort('taxaPercentual', sortTaxas, setSortTaxas)} className="text-right" />
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortData(taxas?.filter((taxa) => 
                        taxa.bandeira.toLowerCase().includes(searchTaxas.toLowerCase()) ||
                        taxa.tipoPagamento.toLowerCase().includes(searchTaxas.toLowerCase())
                      ), sortTaxas).map((taxa) => (
                        <TableRow key={taxa.id}>
                          <TableCell className="font-medium">{taxa.bandeira}</TableCell>
                          <TableCell className="capitalize">{taxa.tipoPagamento}</TableCell>
                          <TableCell>{taxa.parcelas}x</TableCell>
                          <TableCell className="text-right font-mono">{(taxa.taxaPercentual / 100).toFixed(2)}%</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setEditingTaxa(taxa)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => confirm("Excluir?") && deleteTaxaMutation.mutate({ id: taxa.id })} className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Produtos */}
        <TabsContent value="produtos">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-pink-500" />
                  Produtos
                </CardTitle>
                <CardDescription>Gerencie os produtos disponíveis para venda</CardDescription>
              </div>
              <Dialog open={isOpenProduto || !!editingProduto} onOpenChange={(open) => {
                setIsOpenProduto(open);
                if (!open) setEditingProduto(null);
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-pink-500 to-rose-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Produto
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingProduto ? "Editar Produto" : "Novo Produto"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitProduto} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome *</Label>
                        <Input name="nome" required defaultValue={editingProduto?.nome} placeholder="Nome do produto" />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço (R$) *</Label>
                        <Input name="preco" type="number" step="0.01" required defaultValue={editingProduto ? (editingProduto.preco / 100).toFixed(2) : ""} placeholder="99.90" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Input name="descricao" defaultValue={editingProduto?.descricao} placeholder="Categoria do produto" />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => { setIsOpenProduto(false); setEditingProduto(null); }}>Cancelar</Button>
                      <Button type="submit" className="bg-gradient-to-r from-pink-500 to-rose-600">{editingProduto ? "Salvar" : "Cadastrar"}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {/* Campo de busca */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar produto..."
                    value={searchProdutos}
                    onChange={(e) => setSearchProdutos(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {loadingProdutos ? <Skeleton className="h-32 w-full" /> : produtos?.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum produto cadastrado</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                      <TableRow className="bg-white">
                        <SortableHeader column="id" label="ID" sortConfig={sortProdutos} onSort={() => toggleSort('id', sortProdutos, setSortProdutos)} />
                        <SortableHeader column="nome" label="Nome" sortConfig={sortProdutos} onSort={() => toggleSort('nome', sortProdutos, setSortProdutos)} />
                        <SortableHeader column="descricao" label="Categoria" sortConfig={sortProdutos} onSort={() => toggleSort('descricao', sortProdutos, setSortProdutos)} />
                        <SortableHeader column="preco" label="Preço" sortConfig={sortProdutos} onSort={() => toggleSort('preco', sortProdutos, setSortProdutos)} className="text-right" />
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortData(produtos?.filter((produto) => 
                        produto.nome.toLowerCase().includes(searchProdutos.toLowerCase()) ||
                        (produto.descricao && produto.descricao.toLowerCase().includes(searchProdutos.toLowerCase()))
                      ), sortProdutos).map((produto) => (
                        <TableRow key={produto.id}>
                          <TableCell className="font-mono">#{produto.id.toString().padStart(3, '0')}</TableCell>
                          <TableCell className="font-medium">{produto.nome}</TableCell>
                          <TableCell className="text-slate-500">{produto.descricao || "-"}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(produto.preco)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setEditingProduto(produto)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => confirm("Excluir?") && deleteProdutoMutation.mutate({ id: produto.id })} className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maquiagem por Turma */}
        <TabsContent value="maquiagem">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
              <div>
                <CardTitle className="text-lg">Configuração de Maquiagem por Turma</CardTitle>
                <CardDescription>Defina os valores de maquiagem para cada turma (valores padrão de Recife já estão configurados)</CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedMaquiagemIds.length > 0 && (
                  <Button variant="outline" onClick={() => setIsOpenEdicaoMassa(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar {selectedMaquiagemIds.length} selecionadas
                  </Button>
                )}
                <Dialog open={isOpenMaquiagem} onOpenChange={setIsOpenMaquiagem}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4 mr-2" />Nova Configuração</Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Configuração de Maquiagem</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const turmaId = parseInt(formData.get("turmaId") as string);
                    const semServicoFormando = formData.get("semServicoFormando") === "on";
                    const semServicoFamilia = formData.get("semServicoFamilia") === "on";
                    
                    // Se "Sem Serviço Formando" está marcado, enviar 0 para ambos os valores
                    const valorMascRaw = formData.get("valorMasculino") as string;
                    const valorFemRaw = formData.get("valorFeminino") as string;
                    const valorFamRaw = formData.get("valorFamilia") as string;
                    const valorMasculino = semServicoFormando ? 0 : Math.round((parseFloat(valorMascRaw) || 0) * 100);
                    const valorFeminino = semServicoFormando ? 0 : Math.round((parseFloat(valorFemRaw) || 0) * 100);
                    const valorFamilia = semServicoFamilia ? 0 : Math.round((parseFloat(valorFamRaw) || 0) * 100);
                    
                    createMaquiagemMutation.mutate({ turmaId, valorMasculino, valorFeminino, valorFamilia, semServicoFormando, semServicoFamilia });
                  }} className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="semServicoFormando"
                          name="semServicoFormando"
                          className="h-4 w-4 rounded border-gray-300"
                          onChange={(e) => {
                            const formandoChecked = e.target.checked;
                            const familiaCheckbox = document.getElementById('semServicoFamilia') as HTMLInputElement;
                            const valorMascInput = document.getElementsByName('valorMasculino')[0] as HTMLInputElement;
                            const valorFemInput = document.getElementsByName('valorFeminino')[0] as HTMLInputElement;
                            const valorFamInput = document.getElementsByName('valorFamilia')[0] as HTMLInputElement;
                            
                            if (formandoChecked) {
                              // Marcar família e bloquear todos os campos
                              if (familiaCheckbox) familiaCheckbox.checked = true;
                              if (valorMascInput) { valorMascInput.disabled = true; valorMascInput.value = '0'; }
                              if (valorFemInput) { valorFemInput.disabled = true; valorFemInput.value = '0'; }
                              if (valorFamInput) { valorFamInput.disabled = true; valorFamInput.value = '0'; }
                            } else {
                              // Desbloquear campos
                              if (valorMascInput) { valorMascInput.disabled = false; valorMascInput.value = ''; }
                              if (valorFemInput) { valorFemInput.disabled = false; valorFemInput.value = ''; }
                              if (valorFamInput) { valorFamInput.disabled = false; valorFamInput.value = ''; }
                            }
                          }}
                        />
                        <Label htmlFor="semServicoFormando" className="cursor-pointer font-normal">
                          Sem Serviço de Maquiagem Formando
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="semServicoFamilia"
                          name="semServicoFamilia"
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="semServicoFamilia" className="cursor-pointer font-normal">
                          Sem Serviço de Maquiagem Família
                        </Label>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Turma *</Label>
                      <Input
                        placeholder="Buscar turma..."
                        value={searchMaquiagem}
                        onChange={(e) => setSearchMaquiagem(e.target.value)}
                        className="mb-2"
                      />
                      <select
                        name="turmaId"
                        required
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Selecione uma turma...</option>
                        {turmasParaMaquiagem
                          ?.filter((t: any) => 
                            !searchMaquiagem || 
                            t.codigo?.toLowerCase().includes(searchMaquiagem.toLowerCase()) ||
                            t.cursos?.toLowerCase().includes(searchMaquiagem.toLowerCase()) ||
                            t.instituicoes?.toLowerCase().includes(searchMaquiagem.toLowerCase())
                          )
                          .map((turma: any) => {
                            // Formatar turma: Código Curso Instituição Nº Ano.Período
                            const cursos = typeof turma.cursos === 'string' ? JSON.parse(turma.cursos) : turma.cursos;
                            const instituicoes = typeof turma.instituicoes === 'string' ? JSON.parse(turma.instituicoes) : turma.instituicoes;
                            const anos = typeof turma.anos === 'string' ? JSON.parse(turma.anos) : turma.anos;
                            const periodos = typeof turma.periodos === 'string' ? JSON.parse(turma.periodos) : turma.periodos;
                            
                            const partes = [];
                            if (turma.codigo) partes.push(turma.codigo);
                            if (cursos && cursos[0]) partes.push(cursos[0]);
                            if (instituicoes && instituicoes[0]) partes.push(instituicoes[0]);
                            if (turma.numeroTurma) partes.push(turma.numeroTurma);
                            if (anos && anos[0] && periodos && periodos[0]) partes.push(`${anos[0]}.${periodos[0]}`);
                            
                            return (
                              <option key={turma.id} value={turma.id}>
                                {partes.join(' ')}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Valor Masculino (R$) *</Label>
                        <Input name="valorMasculino" type="number" step="0.01" placeholder="18,15" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor Feminino (R$) *</Label>
                        <Input name="valorFeminino" type="number" step="0.01" placeholder="30,80" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor Família (R$) *</Label>
                        <Input name="valorFamilia" type="number" step="0.01" placeholder="30,00" required />
                      </div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                      <strong>Nota:</strong> Turmas de Recife usam valores padrão (Masc: R$18,15 / Fem: R$30,80). Configure aqui apenas turmas de outras cidades.
                    </div>
                    <Button type="submit" className="w-full" disabled={createMaquiagemMutation.isPending}>
                      {createMaquiagemMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {loadingMaquiagem ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                      <TableRow className="bg-white">
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedMaquiagemIds.length === configMaquiagemTurmas?.length && configMaquiagemTurmas?.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMaquiagemIds(configMaquiagemTurmas?.map((c: any) => c.id) || []);
                              } else {
                                setSelectedMaquiagemIds([]);
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-slate-100 select-none" onClick={() => handleSortMaquiagem('turma')}>
                          <div className="flex items-center gap-1">
                            Turma
                            <ArrowUpDown className={`h-3 w-3 ${sortColumnMaquiagem === 'turma' ? 'text-amber-600' : 'text-slate-400'}`} />
                            {sortColumnMaquiagem === 'turma' && (
                              <span className="text-xs text-amber-600">
                                {sortDirectionMaquiagem === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="text-right cursor-pointer hover:bg-slate-100 select-none" onClick={() => handleSortMaquiagem('valorMasculino')}>
                          <div className="flex items-center justify-end gap-1">
                            Valor Masculino
                            <ArrowUpDown className={`h-3 w-3 ${sortColumnMaquiagem === 'valorMasculino' ? 'text-amber-600' : 'text-slate-400'}`} />
                            {sortColumnMaquiagem === 'valorMasculino' && (
                              <span className="text-xs text-amber-600">
                                {sortDirectionMaquiagem === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="text-right cursor-pointer hover:bg-slate-100 select-none" onClick={() => handleSortMaquiagem('valorFeminino')}>
                          <div className="flex items-center justify-end gap-1">
                            Valor Feminino
                            <ArrowUpDown className={`h-3 w-3 ${sortColumnMaquiagem === 'valorFeminino' ? 'text-amber-600' : 'text-slate-400'}`} />
                            {sortColumnMaquiagem === 'valorFeminino' && (
                              <span className="text-xs text-amber-600">
                                {sortDirectionMaquiagem === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="text-right cursor-pointer hover:bg-slate-100 select-none" onClick={() => handleSortMaquiagem('valorFamilia')}>
                          <div className="flex items-center justify-end gap-1">
                            Valor Família
                            <ArrowUpDown className={`h-3 w-3 ${sortColumnMaquiagem === 'valorFamilia' ? 'text-amber-600' : 'text-slate-400'}`} />
                            {sortColumnMaquiagem === 'valorFamilia' && (
                              <span className="text-xs text-amber-600">
                                {sortDirectionMaquiagem === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Linha padrão de Recife */}
                      <TableRow className="bg-blue-50">
                        <TableCell></TableCell>
                        <TableCell className="font-medium">Recife (Padrão)</TableCell>
                        <TableCell className="text-right">R$ 18,15</TableCell>
                        <TableCell className="text-right">R$ 30,80</TableCell>
                        <TableCell className="text-right text-slate-400 text-sm">Valor fixo</TableCell>
                      </TableRow>
                      {configMaquiagemOrdenadas?.map((config: any) => {
                        const turma = turmasParaMaquiagem?.find((t: any) => t.id === config.turmaId);
                        
                        // Formatar turma: Código Curso Instituição Nº Ano.Período
                        let turmaFormatada = `Turma ID: ${config.turmaId}`;
                        if (turma) {
                          const cursos = typeof turma.cursos === 'string' ? JSON.parse(turma.cursos) : turma.cursos;
                          const instituicoes = typeof turma.instituicoes === 'string' ? JSON.parse(turma.instituicoes) : turma.instituicoes;
                          const anos = typeof turma.anos === 'string' ? JSON.parse(turma.anos) : turma.anos;
                          const periodos = typeof turma.periodos === 'string' ? JSON.parse(turma.periodos) : turma.periodos;
                          
                          const partes = [];
                          if (turma.codigo) partes.push(turma.codigo);
                          if (cursos && cursos[0]) partes.push(cursos[0]);
                          if (instituicoes && instituicoes[0]) partes.push(instituicoes[0]);
                          if (turma.numeroTurma) partes.push(turma.numeroTurma);
                          if (anos && anos[0] && periodos && periodos[0]) partes.push(`${anos[0]}.${periodos[0]}`);
                          
                          turmaFormatada = partes.join(' ');
                        }
                        
                        return (
                          <TableRow key={config.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedMaquiagemIds.includes(config.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMaquiagemIds([...selectedMaquiagemIds, config.id]);
                                  } else {
                                    setSelectedMaquiagemIds(selectedMaquiagemIds.filter(id => id !== config.id));
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {turmaFormatada}
                            </TableCell>
                            <TableCell className="text-right">R$ {(config.valorMasculino / 100).toFixed(2).replace('.', ',')}</TableCell>
                            <TableCell className="text-right">R$ {(config.valorFeminino / 100).toFixed(2).replace('.', ',')}</TableCell>
                            <TableCell className="text-right">R$ {(config.valorFamilia / 100).toFixed(2).replace('.', ',')}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setEditingMaquiagem(config)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => confirm("Excluir configuração?") && deleteMaquiagemMutation.mutate({ id: config.id })} 
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
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
              )}
            </CardContent>
          </Card>

          {/* Modal de Edição */}
          <Dialog open={!!editingMaquiagem} onOpenChange={(open) => !open && setEditingMaquiagem(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Configuração de Maquiagem</DialogTitle>
              </DialogHeader>
              {editingMaquiagem && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const valorMasculino = Math.round(parseFloat(formData.get("valorMasculino") as string) * 100);
                  const valorFeminino = Math.round(parseFloat(formData.get("valorFeminino") as string) * 100);
                  const valorFamRaw = formData.get("valorFamilia") as string;
                  const valorFamilia = Math.round((parseFloat(valorFamRaw) || 0) * 100);
                  const semServicoFormando = formData.get("semServicoFormando") === "on";
                  const semServicoFamilia = formData.get("semServicoFamilia") === "on";
                  updateMaquiagemMutation.mutate({ id: editingMaquiagem.id, valorMasculino, valorFeminino, valorFamilia, semServicoFormando, semServicoFamilia });
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor Masculino (R$) *</Label>
                      <Input 
                        name="valorMasculino" 
                        type="number" 
                        step="0.01" 
                        defaultValue={(editingMaquiagem.valorMasculino / 100).toFixed(2)} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Feminino (R$) *</Label>
                      <Input 
                        name="valorFeminino" 
                        type="number" 
                        step="0.01" 
                        defaultValue={(editingMaquiagem.valorFeminino / 100).toFixed(2)} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Família (R$) *</Label>
                      <Input 
                        name="valorFamilia" 
                        type="number" 
                        step="0.01" 
                        defaultValue={(editingMaquiagem.valorFamilia / 100).toFixed(2)} 
                        required 
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={updateMaquiagemMutation.isPending}>
                    {updateMaquiagemMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
          
          {/* Modal de Edição em Massa */}
          <Dialog open={isOpenEdicaoMassa} onOpenChange={setIsOpenEdicaoMassa}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar {selectedMaquiagemIds.length} Configurações em Massa</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const valorMascRaw = formData.get("valorMasculino") as string;
                const valorFemRaw = formData.get("valorFeminino") as string;
                const valorFamRaw = formData.get("valorFamilia") as string;
                
                const data: any = { ids: selectedMaquiagemIds };
                
                // Apenas adicionar valores que foram preenchidos
                if (valorMascRaw && valorMascRaw.trim() !== "") {
                  data.valorMasculino = Math.round(parseFloat(valorMascRaw) * 100);
                }
                if (valorFemRaw && valorFemRaw.trim() !== "") {
                  data.valorFeminino = Math.round(parseFloat(valorFemRaw) * 100);
                }
                if (valorFamRaw && valorFamRaw.trim() !== "") {
                  data.valorFamilia = Math.round(parseFloat(valorFamRaw) * 100);
                }
                
                updateMultipleMaquiagemMutation.mutate(data);
              }} className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                  <strong>Atenção:</strong> Os valores preenchidos abaixo serão aplicados a todas as {selectedMaquiagemIds.length} configurações selecionadas. Deixe em branco os campos que não deseja alterar.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor Masculino (R$)</Label>
                    <Input 
                      name="valorMasculino" 
                      type="number" 
                      step="0.01" 
                      placeholder="Deixe vazio para não alterar"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Feminino (R$)</Label>
                    <Input 
                      name="valorFeminino" 
                      type="number" 
                      step="0.01" 
                      placeholder="Deixe vazio para não alterar"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Família (R$)</Label>
                    <Input 
                      name="valorFamilia" 
                      type="number" 
                      step="0.01" 
                      placeholder="Deixe vazio para não alterar"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpenEdicaoMassa(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={updateMultipleMaquiagemMutation.isPending}>
                    {updateMultipleMaquiagemMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Tipos de Usuário */}
        <TabsContent value="tiposUsuario">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-indigo-500" />
                  Tipos de Usuário
                </CardTitle>
                <CardDescription>Gerencie os tipos de usuário do sistema</CardDescription>
              </div>
              <Dialog open={isOpenTipoUsuario || !!editingTipoUsuario} onOpenChange={(open) => {
                setIsOpenTipoUsuario(open);
                if (!open) setEditingTipoUsuario(null);
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Tipo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingTipoUsuario ? "Editar Tipo de Usuário" : "Novo Tipo de Usuário"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitTipoUsuario} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input 
                        name="nome" 
                        required 
                        defaultValue={editingTipoUsuario?.nome} 
                        placeholder="Ex: Vendedor" 
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => { setIsOpenTipoUsuario(false); setEditingTipoUsuario(null); }}>Cancelar</Button>
                      <Button type="submit" className="bg-gradient-to-r from-indigo-500 to-purple-600">
                        {editingTipoUsuario ? "Salvar" : "Cadastrar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {/* Campo de busca */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar tipo de usuário..."
                    value={searchTiposUsuario}
                    onChange={(e) => setSearchTiposUsuario(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {loadingTiposUsuario ? <Skeleton className="h-32 w-full" /> : tiposUsuario?.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum tipo de usuário cadastrado</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                      <TableRow className="bg-white">
                        <SortableHeader column="nome" label="Nome" sortConfig={sortTiposUsuario} onSort={() => toggleSort('nome', sortTiposUsuario, setSortTiposUsuario)} />
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortData(tiposUsuario?.filter((tipo: any) => 
                        tipo.nome.toLowerCase().includes(searchTiposUsuario.toLowerCase())
                      ), sortTiposUsuario).map((tipo: any) => (
                        <TableRow key={tipo.id}>
                          <TableCell className="font-medium">{tipo.nome}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEditingTipoUsuario(tipo)} 
                              className="text-slate-500 hover:text-slate-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => confirm("Tem certeza que deseja excluir este tipo de usuário?") && deleteTipoUsuarioMutation.mutate({ id: tipo.id })} 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
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
        </TabsContent>

        {/* Permissões Cerimoniais */}
        <TabsContent value="permissoesCerimoniais">
          <PermissoesCerimoniais />
        </TabsContent>

        {/* Usuários */}
        <TabsContent value="usuarios">
          <ConfiguracoesUsuarios />
        </TabsContent>

        {/* Backup */}
        <TabsContent value="backup">
          <BackupTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
