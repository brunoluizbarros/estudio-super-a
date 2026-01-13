import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  LabelList,
} from "recharts";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// Formatador de valores sem R$
const formatarValor = (valor: number) => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor / 100);
};

// Componente customizado para rótulos de dados
const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  // Não renderizar se valor for zero ou undefined
  if (!value || value === 0) return null;
  
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill="#666"
      textAnchor="middle"
      fontSize={11}
      fontWeight={500}
    >
      {formatarValor(value)}
    </text>
  );
};

export default function RelatoriosDashboard() {
  const anoAtual = new Date().getFullYear();
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual);

  // Buscar dados de vendas
  const { data: dadosVendas, isLoading: loadingVendas } =
    trpc.dashboard.vendasMensais.useQuery({ ano: anoSelecionado });

  // Buscar dados de despesas
  const { data: dadosDespesas, isLoading: loadingDespesas } =
    trpc.dashboard.despesasMensais.useQuery({ ano: anoSelecionado });

  // Formatar dados para os gráficos
  const dadosGraficoVendas = useMemo(() => {
    if (!dadosVendas) return [];
    return dadosVendas.map((item) => ({
      mes: MESES[item.mes - 1],
      valor: item.totalBruto,
    }));
  }, [dadosVendas]);

  // Calcular total de vendas
  const totalVendas = useMemo(() => {
    if (!dadosVendas) return 0;
    return dadosVendas.reduce((acc, item) => acc + item.totalBruto, 0);
  }, [dadosVendas]);

  const dadosGraficoDespesas = useMemo(() => {
    if (!dadosDespesas) return [];
    return dadosDespesas.map((item) => ({
      mes: MESES[item.mes - 1],
      fotografia: item.fotografia,
      estudio: item.estudio,
      becas: item.becas,
    }));
  }, [dadosDespesas]);

  // Calcular total de despesas
  const totalDespesas = useMemo(() => {
    if (!dadosDespesas) return 0;
    return dadosDespesas.reduce(
      (acc, item) => acc + item.fotografia + item.estudio + item.becas,
      0
    );
  }, [dadosDespesas]);

  // Gerar opções de anos (últimos 5 anos + próximos 2 anos)
  const anosDisponiveis = useMemo(() => {
    const anos = [];
    for (let i = anoAtual - 5; i <= anoAtual + 2; i++) {
      anos.push(i);
    }
    return anos;
  }, [anoAtual]);

  const isLoading = loadingVendas || loadingDespesas;

  return (
    <div className="space-y-6">
      {/* Filtro de Ano */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              Dashboard de Relatórios
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="ano-select" className="text-sm font-medium">
                Ano:
              </Label>
              <Select
                value={String(anoSelecionado)}
                onValueChange={(value) => setAnoSelecionado(Number(value))}
              >
                <SelectTrigger id="ano-select" className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anosDisponiveis.map((ano) => (
                    <SelectItem key={ano} value={String(ano)}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Vendas Mensais */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Vendas Mensais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dadosGraficoVendas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => formatarValor(value)}
                  />
                  <Tooltip
                    formatter={(value: number) => formatarValor(value)}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar dataKey="valor" fill="#4F46E5" radius={[4, 4, 0, 0]}>
                    <LabelList content={<CustomLabel />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="text-center mt-4 pt-3 border-t border-slate-200">
                <div className="text-xs text-slate-500 mb-1">Venda Bruta</div>
                <div className="text-lg font-bold text-indigo-600">
                  R$ {formatarValor(totalVendas)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Despesas Mensais */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Despesas Mensais por Setor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={dadosGraficoDespesas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => formatarValor(value)}
                  />
                  <Tooltip
                    formatter={(value: number) => formatarValor(value)}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px" }}
                    iconType="line"
                  />
                  <Bar
                    dataKey="fotografia"
                    fill="#3B82F6"
                    name="Fotografia"
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList content={<CustomLabel />} />
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="estudio"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Estúdio"
                    dot={{ r: 4, fill: "#10B981" }}
                  >
                    <LabelList
                      position="top"
                      formatter={(value: number) => formatarValor(value)}
                      style={{ fontSize: 11, fontWeight: 500, fill: "#666" }}
                    />
                  </Line>
                  <Line
                    type="monotone"
                    dataKey="becas"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    name="Becas"
                    dot={{ r: 4, fill: "#F59E0B" }}
                  >
                    <LabelList
                      position="top"
                      formatter={(value: number) => formatarValor(value)}
                      style={{ fontSize: 11, fontWeight: 500, fill: "#666" }}
                    />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
              <div className="text-center mt-4 pt-3 border-t border-slate-200">
                <div className="text-xs text-slate-500 mb-1">Total de Despesas</div>
                <div className="text-lg font-bold text-red-600">
                  R$ {formatarValor(totalDespesas)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
