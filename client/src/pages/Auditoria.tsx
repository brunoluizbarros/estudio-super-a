import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MESES = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

function LinhaValor({ 
  label, 
  valorSistema, 
  valorBanco, 
  divergencia 
}: { 
  label: string; 
  valorSistema: number; 
  valorBanco: number; 
  divergencia: number;
}) {
  const temDivergencia = Math.abs(divergencia) > 0.01; // Tolerância de 1 centavo
  
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <span className="font-medium text-sm">{label}</span>
      <div className="flex items-center gap-2">
        {temDivergencia && (
          <div className="flex items-center gap-1 text-xs">
            {divergencia > 0 ? (
              <TrendingUp className="h-3 w-3 text-yellow-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span className={divergencia > 0 ? "text-yellow-600" : "text-red-600"}>
              {formatarMoeda(Math.abs(divergencia))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Auditoria() {
  const dataAtual = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(dataAtual.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(dataAtual.getFullYear());

  const { data, isLoading, error } = trpc.auditoriaFinanceira.getLancamentos.useQuery({
    mes: mesSelecionado,
    ano: anoSelecionado,
  });

  // Gerar lista de anos (últimos 5 anos + próximos 2)
  const anos = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    const anos = [];
    for (let i = anoAtual - 5; i <= anoAtual + 2; i++) {
      anos.push(i);
    }
    return anos;
  }, []);

  const mesLabel = MESES.find(m => m.value === mesSelecionado)?.label || "";
  
  const temDivergenciaSignificativa = data && (
    Math.abs(data.divergencias.cartoes) > 0.01 ||
    Math.abs(data.divergencias.pix) > 0.01 ||
    Math.abs(data.divergencias.dinheiro) > 0.01
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auditoria Financeira</h1>
          <p className="text-muted-foreground mt-1">
            Comparação entre lançamentos do sistema e fechamento bancário
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione o período para auditoria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Mês</label>
              <Select
                value={mesSelecionado.toString()}
                onValueChange={(value) => setMesSelecionado(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value.toString()}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Ano</label>
              <Select
                value={anoSelecionado.toString()}
                onValueChange={(value) => setAnoSelecionado(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((ano) => (
                    <SelectItem key={ano} value={ano.toString()}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar dados: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de divergência */}
      {data && temDivergenciaSignificativa && (
        <Alert variant="default" className="border-yellow-600 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Atenção:</strong> Foram detectadas divergências entre os lançamentos do sistema e o fechamento bancário.
            Verifique os valores abaixo.
          </AlertDescription>
        </Alert>
      )}

      {/* Boxes de comparação */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Box 1: Lançamentos Sistema */}
          <Card>
            <CardHeader className="bg-blue-50 border-b">
              <CardTitle className="text-lg">Lançamentos Sistema - Compensação</CardTitle>
              <CardDescription>
                Valores registrados nas vendas do sistema em {mesLabel}/{anoSelecionado}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="font-medium">Cartões</span>
                  <span className="text-lg font-semibold">
                    {formatarMoeda(data.sistema.cartoes)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="font-medium">PIX</span>
                  <span className="text-lg font-semibold">
                    {formatarMoeda(data.sistema.pix)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="font-medium">Dinheiro</span>
                  <span className="text-lg font-semibold">
                    {formatarMoeda(data.sistema.dinheiro)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 bg-blue-50 px-4 rounded-md mt-4">
                  <span className="font-bold text-base">TOTAL</span>
                  <span className="text-xl font-bold text-blue-700">
                    {formatarMoeda(data.sistema.total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Box 2: Lançamentos Banco */}
          <Card>
            <CardHeader className="bg-green-50 border-b">
              <CardTitle className="text-lg">Lançamentos Banco - Fechamento Mensal</CardTitle>
              <CardDescription>
                Valores registrados no fechamento bancário de {mesLabel}/{anoSelecionado}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {!data.banco.encontrado ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhum fechamento mensal encontrado para {mesLabel}/{anoSelecionado}.
                    Registre o fechamento na seção Financeiro.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="font-medium">Cartões</span>
                    <span className="text-lg font-semibold">
                      {formatarMoeda(data.banco.cartoes)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="font-medium">PIX</span>
                    <span className="text-lg font-semibold">
                      {formatarMoeda(data.banco.pix)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="font-medium">Dinheiro</span>
                    <span className="text-lg font-semibold">
                      {formatarMoeda(data.banco.dinheiro)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 bg-green-50 px-4 rounded-md mt-4">
                    <span className="font-bold text-base">TOTAL</span>
                    <span className="text-xl font-bold text-green-700">
                      {formatarMoeda(data.banco.total)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Card de Divergências */}
      {data && data.banco.encontrado && temDivergenciaSignificativa && (
        <Card className="border-yellow-600">
          <CardHeader className="bg-yellow-50 border-b border-yellow-600">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Divergências Detectadas
            </CardTitle>
            <CardDescription>
              Diferenças entre sistema e banco (Sistema - Banco)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <LinhaValor
                label="Cartões"
                valorSistema={data.sistema.cartoes}
                valorBanco={data.banco.cartoes}
                divergencia={data.divergencias.cartoes}
              />
              <LinhaValor
                label="PIX"
                valorSistema={data.sistema.pix}
                valorBanco={data.banco.pix}
                divergencia={data.divergencias.pix}
              />
              <LinhaValor
                label="Dinheiro"
                valorSistema={data.sistema.dinheiro}
                valorBanco={data.banco.dinheiro}
                divergencia={data.divergencias.dinheiro}
              />
              <div className="flex items-center justify-between py-3 bg-yellow-50 px-4 rounded-md mt-4 border border-yellow-200">
                <span className="font-bold text-base">DIVERGÊNCIA TOTAL</span>
                <span className={`text-xl font-bold ${
                  data.divergencias.total > 0 ? 'text-yellow-700' : 'text-red-700'
                }`}>
                  {formatarMoeda(data.divergencias.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem de sucesso quando não há divergências */}
      {data && data.banco.encontrado && !temDivergenciaSignificativa && (
        <Alert className="border-green-600 bg-green-50">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Perfeito!</strong> Os valores do sistema e do fechamento bancário estão em conformidade.
            Não foram detectadas divergências para {mesLabel}/{anoSelecionado}.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
