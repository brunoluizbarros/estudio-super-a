import { useState } from "react";
import { trpc } from "@/lib/trpc";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Scissors, Sparkles, Plus, DollarSign, Calculator } from "lucide-react";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export default function Servicos() {
  const [isOpenMaquiagem, setIsOpenMaquiagem] = useState(false);
  const [calculoMaquiagem, setCalculoMaquiagem] = useState<{genero: string; cidade: string} | null>(null);
  const [calculoCabelo, setCalculoCabelo] = useState<string | null>(null);

  const { data: configMaquiagem, isLoading: loadingMaquiagem, refetch: refetchMaquiagem } = trpc.configMaquiagem.list.useQuery();
  
  const { data: valorMaquiagem } = trpc.calculos.maquiagemFormando.useQuery(
    { genero: calculoMaquiagem?.genero as any, cidade: calculoMaquiagem?.cidade || "" },
    { enabled: !!calculoMaquiagem }
  );

  const { data: valorCabelo } = trpc.calculos.comissaoCabelo.useQuery(
    { tipoServico: calculoCabelo as any },
    { enabled: !!calculoCabelo }
  );

  const createConfigMutation = trpc.configMaquiagem.create.useMutation({
    onSuccess: () => {
      toast.success("Configuração criada com sucesso!");
      setIsOpenMaquiagem(false);
      refetchMaquiagem();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCreateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createConfigMutation.mutate({
      cidade: formData.get("cidade") as string,
      valorMasculino: Math.round(parseFloat(formData.get("valorMasculino") as string) * 100),
      valorFeminino: Math.round(parseFloat(formData.get("valorFeminino") as string) * 100),
      valorComissaoFamilia: Math.round(parseFloat(formData.get("valorComissaoFamilia") as string) * 100),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Serviços</h1>
        <p className="text-slate-500 mt-1">
          Gerencie os serviços de maquiagem e cabelo
        </p>
      </div>

      <Tabs defaultValue="maquiagem" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="maquiagem" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Maquiagem
          </TabsTrigger>
          <TabsTrigger value="cabelo" className="flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            Cabelo
          </TabsTrigger>
          <TabsTrigger value="calculadora" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Calculadora
          </TabsTrigger>
        </TabsList>

        {/* Tab Maquiagem */}
        <TabsContent value="maquiagem" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-pink-500" />
                Configuração de Valores por Cidade
              </CardTitle>
              <Dialog open={isOpenMaquiagem} onOpenChange={setIsOpenMaquiagem}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-pink-500 to-rose-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Cidade
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configurar Valores de Maquiagem</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateConfig} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade *</Label>
                      <Input id="cidade" name="cidade" required placeholder="Ex: Recife RMR" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="valorMasculino">Valor Masculino (R$)</Label>
                        <Input
                          id="valorMasculino"
                          name="valorMasculino"
                          type="number"
                          step="0.01"
                          required
                          placeholder="18.15"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="valorFeminino">Valor Feminino (R$)</Label>
                        <Input
                          id="valorFeminino"
                          name="valorFeminino"
                          type="number"
                          step="0.01"
                          required
                          placeholder="30.80"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valorComissaoFamilia">Comissão Maq. Família (R$)</Label>
                      <Input
                        id="valorComissaoFamilia"
                        name="valorComissaoFamilia"
                        type="number"
                        step="0.01"
                        defaultValue="30.00"
                        placeholder="30.00"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsOpenMaquiagem(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-gradient-to-r from-pink-500 to-rose-600" disabled={createConfigMutation.isPending}>
                        Salvar
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingMaquiagem ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : configMaquiagem?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Sparkles className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">Nenhuma configuração cadastrada</p>
                  <p className="text-xs mt-1">Adicione configurações de valores por cidade</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Cidade</TableHead>
                        <TableHead className="text-right">Masculino</TableHead>
                        <TableHead className="text-right">Feminino</TableHead>
                        <TableHead className="text-right">Comissão Família</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configMaquiagem?.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell className="font-medium">{config.cidade}</TableCell>
                          <TableCell className="text-right">{formatCurrency(config.valorMasculino)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(config.valorFeminino)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(config.valorComissaoFamilia ?? 3000)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="mt-6 p-4 bg-pink-50 rounded-lg">
                <h4 className="font-medium text-pink-900 mb-2">Regras de Maquiagem</h4>
                <ul className="text-sm text-pink-800 space-y-1">
                  <li>• <strong>Maquiagem Formando:</strong> A empresa paga à maquiadora</li>
                  <li>• <strong>Maquiagem Família:</strong> Cliente paga à maquiadora, ela repassa comissão à empresa</li>
                  <li>• <strong>Valores padrão Recife RMR:</strong> Masculino R$ 18,15 | Feminino R$ 30,80</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Cabelo */}
        <TabsContent value="cabelo" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Scissors className="h-5 w-5 text-violet-500" />
                Serviços de Cabelo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">Cabelo Simples</h3>
                      <DollarSign className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Valor do Serviço:</span>
                        <span className="font-medium">R$ 40,00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Comissão (20%):</span>
                        <span className="font-medium text-emerald-600">R$ 8,00</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">Cabelo Combinado</h3>
                      <DollarSign className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Valor do Serviço:</span>
                        <span className="font-medium">R$ 80,00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Comissão (20%):</span>
                        <span className="font-medium text-emerald-600">R$ 16,00</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 p-4 bg-violet-50 rounded-lg">
                <h4 className="font-medium text-violet-900 mb-2">Regras de Cabelo</h4>
                <ul className="text-sm text-violet-800 space-y-1">
                  <li>• O formando paga diretamente à cabeleireira</li>
                  <li>• A cabeleireira repassa 20% de comissão à empresa</li>
                  <li>• Comissões são recebidas via depósito</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Calculadora */}
        <TabsContent value="calculadora" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-pink-500" />
                  Calcular Maquiagem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    placeholder="Ex: Recife RMR"
                    onChange={(e) => setCalculoMaquiagem(prev => ({ ...prev, cidade: e.target.value, genero: prev?.genero || "masculino" }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gênero</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={calculoMaquiagem?.genero === "masculino" ? "default" : "outline"}
                      onClick={() => setCalculoMaquiagem(prev => ({ ...prev, genero: "masculino", cidade: prev?.cidade || "" }))}
                      className={calculoMaquiagem?.genero === "masculino" ? "bg-blue-500" : ""}
                    >
                      Masculino
                    </Button>
                    <Button
                      variant={calculoMaquiagem?.genero === "feminino" ? "default" : "outline"}
                      onClick={() => setCalculoMaquiagem(prev => ({ ...prev, genero: "feminino", cidade: prev?.cidade || "" }))}
                      className={calculoMaquiagem?.genero === "feminino" ? "bg-pink-500" : ""}
                    >
                      Feminino
                    </Button>
                  </div>
                </div>
                {valorMaquiagem && (
                  <div className="p-4 bg-pink-50 rounded-lg">
                    <p className="text-sm text-pink-600">Valor a pagar:</p>
                    <p className="text-2xl font-bold text-pink-700">{valorMaquiagem.valorFormatado}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Scissors className="h-5 w-5 text-violet-500" />
                  Calcular Cabelo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de Serviço</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={calculoCabelo === "simples" ? "default" : "outline"}
                      onClick={() => setCalculoCabelo("simples")}
                      className={calculoCabelo === "simples" ? "bg-violet-500" : ""}
                    >
                      Simples
                    </Button>
                    <Button
                      variant={calculoCabelo === "combinado" ? "default" : "outline"}
                      onClick={() => setCalculoCabelo("combinado")}
                      className={calculoCabelo === "combinado" ? "bg-violet-500" : ""}
                    >
                      Combinado
                    </Button>
                  </div>
                </div>
                {valorCabelo && (
                  <div className="p-4 bg-violet-50 rounded-lg space-y-2">
                    <div>
                      <p className="text-sm text-violet-600">Valor do serviço:</p>
                      <p className="text-xl font-bold text-violet-700">{valorCabelo.valorServicoFormatado}</p>
                    </div>
                    <div>
                      <p className="text-sm text-emerald-600">Comissão a receber (20%):</p>
                      <p className="text-xl font-bold text-emerald-700">{valorCabelo.comissaoFormatada}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
