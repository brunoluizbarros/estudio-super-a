import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { Plus, ArrowLeft, Users, Edit, Trash2, Search, Download, Upload } from "lucide-react";
import { useLocation, useParams } from "wouter";

// Helper para parsear JSON com fallback
const parseJsonArray = (value: string | null | undefined): string[] => {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

const parseJsonNumberArray = (value: string | null | undefined): number[] => {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

export default function TurmaDetalhes() {
  const params = useParams<{ id: string }>();
  const turmaId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingFormando, setEditingFormando] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: turma, isLoading: loadingTurma } = trpc.turmas.getById.useQuery({ id: turmaId });
  const { data: formandos, isLoading: loadingFormandos, refetch } = trpc.formandos.listByTurma.useQuery({ turmaId });

  const createMutation = trpc.formandos.create.useMutation({
    onSuccess: () => {
      toast.success("Formando cadastrado com sucesso!");
      setIsOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar formando: ${error.message}`);
    },
  });

  const updateMutation = trpc.formandos.update.useMutation({
    onSuccess: () => {
      toast.success("Formando atualizado com sucesso!");
      setEditingFormando(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar formando: ${error.message}`);
    },
  });

  const deleteMutation = trpc.formandos.delete.useMutation({
    onSuccess: () => {
      toast.success("Formando excluído com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir formando: ${error.message}`);
    },
  });

  const filteredFormandos = formandos?.filter(
    (f) =>
      f.nome.toLowerCase().includes(search.toLowerCase()) ||
      f.codigoFormando.toLowerCase().includes(search.toLowerCase()) ||
      f.cpf?.includes(search)
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const statusValue = formData.get("status") as string;
    const generoValue = formData.get("genero") as string;
    const data = {
      turmaId,
      codigoFormando: formData.get("codigoFormando") as string,
      nome: formData.get("nome") as string,
      cpf: formData.get("cpf") as string || undefined,
      telefone: formData.get("telefone") as string || undefined,
      email: formData.get("email") as string || undefined,
      genero: generoValue && generoValue !== "" ? (generoValue as "masculino" | "feminino") : undefined,
      pacote: formData.get("pacote") as string || undefined,
      status: statusValue && statusValue !== "" ? (statusValue as "apto" | "inapto" | "migracao") : undefined,
      eComissao: formData.get("eComissao") === "true",
    };

    if (editingFormando) {
      updateMutation.mutate({ id: editingFormando.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este formando?")) {
      deleteMutation.mutate({ id });
    }
  };

  // Função para baixar modelo de planilha
  const handleDownloadModelo = () => {
    // Criar CSV com as colunas especificadas
    const headers = ["Nome", "CPF", "E-mail", "Telefone", "Pacote", "Status", "Gênero", "Comissão"];
    const csvContent = headers.join(";") + "\n";
    
    // Criar blob e fazer download
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_formandos.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Modelo de planilha baixado!");
  };

  // Função para processar upload de planilha
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let rows: string[][] = [];
      const fileName = file.name.toLowerCase();
      
      // Verificar tipo de arquivo e processar adequadamente
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Processar arquivo Excel
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
        rows = jsonData.map(row => row.map(cell => String(cell ?? '').trim()));
      } else {
        // Processar arquivo CSV/TXT
        const text = await file.text();
        const lines = text.split("\n").filter(line => line.trim());
        rows = lines.map(line => line.split(";").map(col => col.trim().replace(/^"|"$/g, "")));
      }
      
      if (rows.length < 2) {
        toast.error("Planilha vazia ou sem dados");
        return;
      }

      // Pular cabeçalho e processar linhas
      const dataRows = rows.slice(1);
      let successCount = 0;
      let errorCount = 0;

      for (const columns of dataRows) {
        const [nome, cpf, email, telefone, pacote, statusRaw] = columns;

        if (!nome) continue;

        // Mapear status da planilha para o enum do sistema
        let statusMapped: "apto" | "inapto" | "migracao" | undefined = undefined;
        if (statusRaw) {
          const statusLower = statusRaw.toLowerCase().trim();
          if (statusLower === "apto") statusMapped = "apto";
          else if (statusLower === "inapto") statusMapped = "inapto";
          else if (statusLower === "migração" || statusLower === "migracao") statusMapped = "migracao";
        }

        try {
          await createMutation.mutateAsync({
            turmaId,
            codigoFormando: `F${Date.now()}${Math.random().toString(36).substr(2, 4)}`.toUpperCase(),
            nome: nome.trim(),
            cpf: cpf?.trim() || undefined,
            email: email?.trim() || undefined,
            telefone: telefone?.trim() || undefined,
            pacote: pacote?.trim() || undefined,
            status: statusMapped,
          });
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} formando(s) importado(s) com sucesso!`);
        refetch();
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} formando(s) não puderam ser importados`);
      }
    } catch (error) {
      toast.error("Erro ao processar planilha");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (loadingTurma) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!turma) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-slate-500">Turma não encontrada</p>
        <Button variant="link" onClick={() => setLocation("/turmas")}>
          Voltar para turmas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/turmas")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{parseJsonArray(turma.cursos).join(", ")}</h1>
          <p className="text-slate-500 mt-1">
            {turma.codigo} • {parseJsonArray(turma.instituicoes).join(", ")} • {turma.cidade}/{turma.estado} • {parseJsonNumberArray(turma.anos).join(", ")}/{parseJsonArray(turma.periodos).join(", ")}
          </p>
        </div>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" />
            Formandos ({formandos?.length || 0})
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={handleDownloadModelo}>
              <Download className="h-4 w-4 mr-2" />
              Modelo Planilha
            </Button>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Importando..." : "Upload Dados Formando"}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
            />
            <Dialog open={isOpen || !!editingFormando} onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) setEditingFormando(null);
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-amber-500 to-orange-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Formando
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingFormando ? "Editar Formando" : "Novo Formando"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigoFormando">Código *</Label>
                    <Input
                      id="codigoFormando"
                      name="codigoFormando"
                      required
                      defaultValue={editingFormando?.codigoFormando}
                      placeholder="Ex: F001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      name="nome"
                      required
                      defaultValue={editingFormando?.nome}
                      placeholder="Nome completo"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      name="cpf"
                      defaultValue={editingFormando?.cpf}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      name="telefone"
                      defaultValue={editingFormando?.telefone}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editingFormando?.email}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="genero">Gênero</Label>
                    <Select name="genero" defaultValue={editingFormando?.genero || "masculino"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pacote">Pacote</Label>
                    <Input
                      id="pacote"
                      name="pacote"
                      defaultValue={editingFormando?.pacote}
                      placeholder="Ex: Premium"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={editingFormando?.status || "sem_status"}>                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_status">Sem status</SelectItem>
                        <SelectItem value="apto">Apto</SelectItem>
                        <SelectItem value="inapto">Inapto</SelectItem>
                        <SelectItem value="migracao">Migração</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eComissao">Membro da Comissão?</Label>
                    <Select name="eComissao" defaultValue={editingFormando?.eComissao ? "true" : "false"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">Não</SelectItem>
                        <SelectItem value="true">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsOpen(false);
                      setEditingFormando(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-amber-500 to-orange-600"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingFormando ? "Salvar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar formandos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loadingFormandos ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredFormandos?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Users className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">Nenhum formando encontrado</p>
              <p className="text-xs mt-1">Cadastre formandos para esta turma</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Telefone</TableHead>
                    <TableHead className="hidden lg:table-cell">Pacote</TableHead>
                    <TableHead className="hidden lg:table-cell">Comissão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFormandos?.map((formando) => (
                    <TableRow key={formando.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div>
                          <p>{formando.nome}</p>
                          <p className="text-xs text-slate-400">{formando.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-slate-500">
                        {formando.telefone || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-slate-500">
                        {formando.pacote || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formando.eComissao ? (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            Comissão
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingFormando(formando)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(formando.id)}
                            title="Excluir"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </div>
  );
}
