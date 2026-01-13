import { useState, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Upload, Calculator, Save, AlertCircle, Edit2, Trash2, History, FileDown, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Função auxiliar para formatar valores monetários
const formatarValor = (valor: number) => {
  return valor.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

export default function FechamentosMensais() {
  const [tipoFechamento, setTipoFechamento] = useState<'vendas' | 'conta_bancaria'>('conta_bancaria');
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  
  // Estados de receita
  const [receitaCartoesLiquido, setReceitaCartoesLiquido] = useState(0); // Valor líquido do Itaú
  const [receitaCartoesTarifa, setReceitaCartoesTarifa] = useState(0); // Tarifa da Rede
  const [receitaCartoes, setReceitaCartoes] = useState(0); // Valor bruto (calculado)
  const [receitaPix, setReceitaPix] = useState(0);
  const [receitaDinheiro, setReceitaDinheiro] = useState(0);
  const [receitaRendimento, setReceitaRendimento] = useState(0);
  const [receitaPlataforma, setReceitaPlataforma] = useState(0);
  const [receitaPagseguro, setReceitaPagseguro] = useState(0);
  const [receitaSantander, setReceitaSantander] = useState(0);
  
  // Estados de despesa
  const [despesaTarifaCartao, setDespesaTarifaCartao] = useState(0);
  const [despesaOutrasTarifas, setDespesaOutrasTarifas] = useState(0);
  const [despesaMaquiadora, setDespesaMaquiadora] = useState(0);
  const [despesaOperacaoFora, setDespesaOperacaoFora] = useState(0);
  const [despesaInvestimentos, setDespesaInvestimentos] = useState(0);
  const [despesaEstorno, setDespesaEstorno] = useState(0);
  const [despesaTransfSantander, setDespesaTransfSantander] = useState(0);
  
  // Estados de impostos
  const [impostosIss, setImpostosIss] = useState(0);
  const [impostosPis, setImpostosPis] = useState(0);
  const [impostosCofins, setImpostosCofins] = useState(0);
  const [impostosCsll, setImpostosCsll] = useState(0);
  const [impostosIrpj, setImpostosIrpj] = useState(0);
  const [aliquotaIrpjEstimada, setAliquotaIrpjEstimada] = useState(0);
  const [aliquotaIrpjReal, setAliquotaIrpjReal] = useState(0);
  
  const [fechamentoId, setFechamentoId] = useState<number | undefined>();
  const [modoEdicao, setModoEdicao] = useState(false);
  const [permitirCarregamento, setPermitirCarregamento] = useState(false);
  
  // Estados para controlar uploads obrigatórios
  const [uploadItauEntrada, setUploadItauEntrada] = useState(false);
  const [uploadItauSaida, setUploadItauSaida] = useState(false);
  const [uploadRedeCartoes, setUploadRedeCartoes] = useState(false);
  
  // Queries
  const { data: dadosSistema } = trpc.fechamentoMensal.getDadosSistema.useQuery({ mes, ano });
  const { data: fechamentoExistente } = trpc.fechamentoMensal.get.useQuery({ mes, ano, tipo: tipoFechamento });
  
  // Mutations
  const processarExtrato = trpc.fechamentoMensal.processarExtrato.useMutation();
  const salvarFechamento = trpc.fechamentoMensal.salvar.useMutation({
    onSuccess: (data) => {
      toast.success(modoEdicao ? 'Fechamento atualizado com sucesso!' : 'Fechamento salvo com sucesso!');
      if (data.despesaIrpjCriada && data.valorDespesa) {
        toast.info(`Despesa de IRPJ criada automaticamente: R$ ${formatarValor(data.valorDespesa)}`, {
          duration: 8000
        });
      }
      setFechamentoId(data.id);
      setModoEdicao(false);
      setPermitirCarregamento(false); // Bloquear carregamento automático
      // Limpar formulário após salvar
      limparFormulario();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    }
  });
  
  // Carregar dados do sistema ao mudar mês/ano
  useEffect(() => {
    if (dadosSistema) {
      setReceitaDinheiro(dadosSistema.dinheiro);
      setDespesaMaquiadora(dadosSistema.maquiadora);
      setDespesaOperacaoFora(dadosSistema.operacaoFora || 0);
      setDespesaInvestimentos(dadosSistema.investimentos);
      setDespesaTransfSantander(dadosSistema.transfSantander || 0);
      
      // Calcular impostos automaticamente
      if (dadosSistema.valorBruto > 0) {
        calcularImpostos(dadosSistema.valorBruto);
      }
    }
  }, [dadosSistema]);
  
  // Calcular valor bruto de cartões automaticamente
  useEffect(() => {
    const valorBruto = receitaCartoesLiquido + receitaCartoesTarifa;
    setReceitaCartoes(valorBruto);
  }, [receitaCartoesLiquido, receitaCartoesTarifa]);
  
  // useEffect para carregar fechamento existente (apenas em modo edição)
  useEffect(() => {
    if (fechamentoExistente && permitirCarregamento) {
      setFechamentoId(fechamentoExistente.id);
      setReceitaCartoes(parseFloat(fechamentoExistente.receitaCartoes));
      setReceitaPix(parseFloat(fechamentoExistente.receitaPix));
      setReceitaDinheiro(parseFloat(fechamentoExistente.receitaDinheiro));
      setReceitaRendimento(parseFloat(fechamentoExistente.receitaRendimento));
      setReceitaPlataforma(parseFloat(fechamentoExistente.receitaPlataforma));
      setReceitaPagseguro(parseFloat(fechamentoExistente.receitaPagseguro));
      setReceitaSantander(parseFloat(fechamentoExistente.receitaSantander));
      
      setDespesaTarifaCartao(parseFloat(fechamentoExistente.despesaTarifaCartao));
      setDespesaOutrasTarifas(parseFloat(fechamentoExistente.despesaOutrasTarifas));
      setDespesaMaquiadora(parseFloat(fechamentoExistente.despesaMaquiadora));
      setDespesaOperacaoFora(parseFloat(fechamentoExistente.despesaOperacaoFora));
      setDespesaInvestimentos(parseFloat(fechamentoExistente.despesaInvestimentos));
      setDespesaEstorno(parseFloat(fechamentoExistente.despesaEstorno));
      setDespesaTransfSantander(parseFloat(fechamentoExistente.despesaTransfSantander));
      
      setImpostosIss(parseFloat(fechamentoExistente.impostosIss));
      setImpostosPis(parseFloat(fechamentoExistente.impostosPis));
      setImpostosCofins(parseFloat(fechamentoExistente.impostosCofins));
      setImpostosCsll(parseFloat(fechamentoExistente.impostosCsll));
      setImpostosIrpj(parseFloat(fechamentoExistente.impostosIrpj));
      setAliquotaIrpjEstimada(parseFloat(fechamentoExistente.aliquotaIrpjEstimada));
      setAliquotaIrpjReal(parseFloat(fechamentoExistente.aliquotaIrpjReal));
    }
  }, [fechamentoExistente, permitirCarregamento]);
  
  const limparFormulario = () => {
    setFechamentoId(undefined);
    setReceitaCartoesLiquido(0);
    setReceitaCartoesTarifa(0);
    setReceitaCartoes(0);
    setReceitaPix(0);
    setReceitaDinheiro(0);
    setReceitaRendimento(0);
    setReceitaPlataforma(0);
    setReceitaPagseguro(0);
    setReceitaSantander(0);
    setDespesaTarifaCartao(0);
    setDespesaOutrasTarifas(0);
    setDespesaMaquiadora(0);
    setDespesaOperacaoFora(0);
    setDespesaInvestimentos(0);
    setDespesaEstorno(0);
    setDespesaTransfSantander(0);
    setImpostosIss(0);
    setImpostosPis(0);
    setImpostosCofins(0);
    setImpostosCsll(0);
    setImpostosIrpj(0);
    setAliquotaIrpjEstimada(0);
    setAliquotaIrpjReal(0);
  };
  
  const handleEditarFechamento = (fechamento: any) => {
    setModoEdicao(true);
    setPermitirCarregamento(true); // Permitir carregamento em modo edição
    setFechamentoId(fechamento.id);
    setMes(fechamento.mes);
    setAno(fechamento.ano);
    setTipoFechamento(fechamento.tipo);
    
    // Carregar todos os valores
    setReceitaCartoes(parseFloat(fechamento.receitaCartoes));
    setReceitaPix(parseFloat(fechamento.receitaPix));
    setReceitaDinheiro(parseFloat(fechamento.receitaDinheiro));
    setReceitaRendimento(parseFloat(fechamento.receitaRendimento));
    setReceitaPlataforma(parseFloat(fechamento.receitaPlataforma));
    setReceitaPagseguro(parseFloat(fechamento.receitaPagseguro));
    setReceitaSantander(parseFloat(fechamento.receitaSantander));
    
    setDespesaTarifaCartao(parseFloat(fechamento.despesaTarifaCartao));
    setDespesaOutrasTarifas(parseFloat(fechamento.despesaOutrasTarifas));
    setDespesaMaquiadora(parseFloat(fechamento.despesaMaquiadora));
    setDespesaOperacaoFora(parseFloat(fechamento.despesaOperacaoFora));
    setDespesaInvestimentos(parseFloat(fechamento.despesaInvestimentos));
    setDespesaEstorno(parseFloat(fechamento.despesaEstorno));
    setDespesaTransfSantander(parseFloat(fechamento.despesaTransfSantander));
    
    setImpostosIss(parseFloat(fechamento.impostosIss));
    setImpostosPis(parseFloat(fechamento.impostosPis));
    setImpostosCofins(parseFloat(fechamento.impostosCofins));
    setImpostosCsll(parseFloat(fechamento.impostosCsll));
    setImpostosIrpj(parseFloat(fechamento.impostosIrpj));
    setAliquotaIrpjEstimada(parseFloat(fechamento.aliquotaIrpjEstimada));
    setAliquotaIrpjReal(parseFloat(fechamento.aliquotaIrpjReal));
    
    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info('Fechamento carregado para edição');
  };
  
  const calcularImpostos = (valorBruto: number) => {
    const iss = valorBruto * 0.05;
    const pis = valorBruto * 0.0065;
    const cofins = valorBruto * 0.03;
    const csll = valorBruto * 0.0288;
    const irpj = valorBruto * (aliquotaIrpjEstimada / 100);
    
    setImpostosIss(iss);
    setImpostosPis(pis);
    setImpostosCofins(cofins);
    setImpostosCsll(csll);
    setImpostosIrpj(irpj);
  };
  
  const handleUploadExtrato = async (tipo: string, file: File) => {
    try {
      // Se for arquivo Rede, processar no frontend
      if (tipo === 'rede') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            // Aba "pagamentos"
            const sheetName = 'pagamentos';
            if (!workbook.SheetNames.includes(sheetName)) {
              toast.error(`Aba "${sheetName}" não encontrada`);
              return;
            }
            
            const worksheet = workbook.Sheets[sheetName];
            const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Somar coluna G (índice 6) - "valor MDR descontado"
            let total = 0;
            let count = 0;
            
            for (let i = 1; i < data.length; i++) { // Pular cabeçalho
              const row = data[i];
              if (row && row[6]) { // Coluna G
                const valor = parseFloat(String(row[6]).replace(',', '.'));
                if (!isNaN(valor) && valor > 0) {
                  total += valor;
                  count++;
                }
              }
            }
            
            // Arredondar para 2 casas decimais
            const totalArredondado = Math.round(total * 100) / 100;
            
            // Atualizar tarifa (para despesa) e tarifa de cartões (para cálculo do bruto)
            setDespesaTarifaCartao(totalArredondado);
            setReceitaCartoesTarifa(totalArredondado);
            setUploadRedeCartoes(true); // Marcar upload como completo
            toast.success(`Tarifa Rede: R$ ${formatarValor(totalArredondado)} | ${count} lançamentos`);
            console.log(`[FRONTEND REDE] Tarifa: R$ ${totalArredondado.toFixed(2)} em ${count} lançamentos`);
          } catch (error: any) {
            toast.error(`Erro ao processar: ${error.message}`);
          }
        };
        reader.readAsArrayBuffer(file);
        return;
      }
      
      // Para outros tipos, usar backend
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result?.toString().split(',')[1];
        if (!base64) {
          toast.error('Erro ao ler arquivo');
          return;
        }
        
        const resultado = await processarExtrato.mutateAsync({
          tipo: tipo as any,
          mes,
          ano,
          nomeArquivo: file.name,
          base64
        });
        
        if (resultado.sucesso) {
          toast.success(`Processado: R$ ${formatarValor(resultado.valor)}`);
          
          // Atualizar campo correspondente
          if (tipo === 'itau_entrada_cartoes') {
            setReceitaCartoesLiquido(resultado.valor); // Valor líquido
            setUploadItauEntrada(true); // Marcar upload como completo
            toast.success(`Cartões (líquido): R$ ${formatarValor(resultado.valor)}`);
          }
          else if (tipo === 'itau_entrada_pix') setReceitaPix(resultado.valor);
          else if (tipo === 'itau_entrada_rendimento') setReceitaRendimento(resultado.valor);
          else if (tipo === 'itau_saida') {
            setDespesaOutrasTarifas(resultado.valor);
            setUploadItauSaida(true); // Marcar upload como completo
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };
  
  const handleSalvar = () => {
    // Validar uploads obrigatórios
    if (!uploadItauEntrada) {
      toast.error('Upload do Extrato Itaú Entrada é obrigatório!');
      return;
    }
    if (!uploadItauSaida) {
      toast.error('Upload do Extrato Itaú Saída é obrigatório!');
      return;
    }
    if (!uploadRedeCartoes) {
      toast.error('Upload do Relatório Cartões Rede é obrigatório!');
      return;
    }
    
    // Validar campo obrigatório Alíquota IRPJ
    if (!aliquotaIrpjEstimada || aliquotaIrpjEstimada <= 0) {
      toast.error('Alíquota IRPJ - Estimada (%) é obrigatória!');
      return;
    }
    
    const totalImpostos = impostosIss + impostosPis + impostosCofins + impostosCsll + impostosIrpj;
    
    salvarFechamento.mutate({
      id: fechamentoId,
      mes,
      ano,
      tipo: tipoFechamento,
      receita: {
        cartoes: receitaCartoes,
        pix: receitaPix,
        dinheiro: receitaDinheiro,
        rendimento: receitaRendimento,
        plataforma: receitaPlataforma,
        pagseguro: receitaPagseguro,
        santander: receitaSantander
      },
      despesa: {
        tarifaCartao: despesaTarifaCartao,
        outrasTarifas: despesaOutrasTarifas,
        impostos: totalImpostos,
        maquiadora: despesaMaquiadora,
        operacaoFora: despesaOperacaoFora,
        investimentos: despesaInvestimentos,
        estorno: despesaEstorno,
        transfSantander: despesaTransfSantander
      },
      impostos: {
        iss: impostosIss,
        pis: impostosPis,
        cofins: impostosCofins,
        csll: impostosCsll,
        irpj: impostosIrpj
      },
      aliquotaIrpjEstimada,
      aliquotaIrpjReal
    });
  };
  
  const totalReceita = receitaCartoes + receitaPix + receitaDinheiro + receitaRendimento + 
                       receitaPlataforma + receitaPagseguro + receitaSantander;
  
  const totalImpostos = impostosIss + impostosPis + impostosCofins + impostosCsll + impostosIrpj;
  
  // Garantir que todos os valores sejam números válidos
  const totalDespesa = (
    (Number(despesaTarifaCartao) || 0) + 
    (Number(despesaOutrasTarifas) || 0) + 
    (Number(totalImpostos) || 0) + 
    (Number(despesaMaquiadora) || 0) + 
    (Number(despesaOperacaoFora) || 0) + 
    (Number(despesaInvestimentos) || 0) + 
    (Number(despesaEstorno) || 0) + 
    (Number(despesaTransfSantander) || 0)
  );
  
  const isFimTrimestre = [3, 6, 9, 12].includes(mes);
  
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fechamentos Mensais</h1>
        <p className="text-muted-foreground">Gerencie os fechamentos mensais de receitas e despesas</p>
      </div>
      
      <Tabs defaultValue="fechamento" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fechamento">Novo Fechamento</TabsTrigger>
          <TabsTrigger value="comparacao">Comparação entre Períodos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="fechamento" className="space-y-6">
      
      {/* Seleção de Período e Tipo */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração do Fechamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Mês</Label>
              <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                    <SelectItem key={m} value={m.toString()}>
                      {new Date(2025, m - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Ano</Label>
              <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(a => (
                    <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Tipo de Fechamento</Label>
              <Select value={tipoFechamento} onValueChange={(v: any) => setTipoFechamento(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conta_bancaria">Conta Bancária</SelectItem>
                  <SelectItem value="vendas">Vendas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isFimTrimestre && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este é o último mês do trimestre. O sistema calculará automaticamente o saldo de IRPJ se necessário.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {tipoFechamento === 'conta_bancaria' && (
        <>
          {/* RECEITA */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">💰 Receita</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Itaú Entrada */}
              <div className="flex gap-2">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Upload Extrato Itaú Entrada</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Processar para cartões, pix e rendimento
                        handleUploadExtrato('itau_entrada_cartoes', file);
                        handleUploadExtrato('itau_entrada_pix', file);
                        handleUploadExtrato('itau_entrada_rendimento', file);
                      }
                    }}
                  />
                </Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cartões (Bruto = Líquido + Tarifa)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={receitaCartoes}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                    title="Calculado automaticamente: Líquido (Itaú) + Tarifa (Rede)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Líquido: R$ {formatarValor(receitaCartoesLiquido)} + Tarifa: R$ {formatarValor(receitaCartoesTarifa)}
                  </p>
                </div>
                
                <div>
                  <Label>PIX</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={receitaPix}
                    onChange={(e) => setReceitaPix(parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div>
                  <Label>Dinheiro (Sistema)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={receitaDinheiro}
                    onChange={(e) => setReceitaDinheiro(parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div>
                  <Label>Rendimento</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={receitaRendimento}
                    onChange={(e) => setReceitaRendimento(parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div>
                  <Label>Plataforma</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={receitaPlataforma}
                    onChange={(e) => setReceitaPlataforma(parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div>
                  <Label>Pagseguro</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={receitaPagseguro}
                    onChange={(e) => setReceitaPagseguro(parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div>
                  <Label>Santander</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={receitaSantander}
                    onChange={(e) => setReceitaSantander(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>TOTAL RECEITA:</span>
                  <span className="text-green-600">R$ {formatarValor(totalReceita)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* DESPESA */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">📤 Despesa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Uploads */}
              <div className="flex gap-4">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Upload Extrato Itaú Saída</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadExtrato('itau_saida', file);
                    }}
                  />
                </Label>
                
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Upload Relatório Cartões Rede</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadExtrato('rede', file);
                    }}
                  />
                </Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tarifa Cartão (Rede)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={despesaTarifaCartao}
                    onChange={(e) => setDespesaTarifaCartao(parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div>
                  <Label>Outras Tarifas (Itaú)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={despesaOutrasTarifas}
                    onChange={(e) => setDespesaOutrasTarifas(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              
              {/* IMPOSTOS - Detalhado */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Impostos</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => dadosSistema && calcularImpostos(dadosSistema.valorBruto)}
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Recalcular
                  </Button>
                </div>
                
                <div className="flex justify-between py-2 border-b font-medium">
                  <span>Faturamento:</span>
                  <span className="font-mono">R$ {(dadosSistema?.valorBruto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span>ISS (5%):</span>
                    <span className="font-mono">R$ {formatarValor(impostosIss)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PIS (0,65%):</span>
                    <span className="font-mono">R$ {formatarValor(impostosPis)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>COFINS (3%):</span>
                    <span className="font-mono">R$ {formatarValor(impostosCofins)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CSLL (2,88%):</span>
                    <span className="font-mono">R$ {formatarValor(impostosCsll)}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Alíquota IRPJ - Estimada (%) <span className="text-red-600">*</span></Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={aliquotaIrpjEstimada}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setAliquotaIrpjEstimada(val);
                        if (dadosSistema) {
                          setImpostosIrpj(dadosSistema.valorBruto * (val / 100));
                        }
                      }}
                      className={!aliquotaIrpjEstimada || aliquotaIrpjEstimada <= 0 ? 'border-red-300' : ''}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Alíquota IRPJ - Real (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={aliquotaIrpjReal}
                      onChange={(e) => setAliquotaIrpjReal(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between pt-2 border-t text-sm">
                  <span>IRPJ:</span>
                  <span className="font-mono">R$ {formatarValor(impostosIrpj)}</span>
                </div>
                
                <div className="flex justify-between pt-2 border-t font-bold text-base">
                  <span>TOTAL IMPOSTOS:</span>
                  <span className="font-mono">R$ {formatarValor(totalImpostos)}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Maquiadora (Sistema)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={despesaMaquiadora}
                    onChange={(e) => setDespesaMaquiadora(parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div>
                  <Label>Operação Fora da Plataforma (Sistema)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={despesaOperacaoFora}
                    onChange={(e) => setDespesaOperacaoFora(parseFloat(e.target.value) || 0)}
                    className="bg-blue-50"
                  />
                </div>
                
                <div>
                  <Label>Investimentos (Sistema)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={despesaInvestimentos}
                    onChange={(e) => setDespesaInvestimentos(parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div>
                  <Label>Estorno</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={despesaEstorno}
                    onChange={(e) => setDespesaEstorno(parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div>
                  <Label>Transferência Santander</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={despesaTransfSantander}
                    onChange={(e) => setDespesaTransfSantander(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>TOTAL DESPESA:</span>
                  <span className="text-red-600">R$ {formatarValor(totalDespesa)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* SALDO */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center text-2xl font-bold">
                <span>SALDO:</span>
                <span className={totalReceita - totalDespesa >= 0 ? 'text-green-600' : 'text-red-600'}>
                  R$ {formatarValor(totalReceita - totalDespesa)}
                </span>
              </div>
            </CardContent>
          </Card>
          
          {/* Botão Salvar */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleSalvar}
              disabled={salvarFechamento.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {salvarFechamento.isPending ? 'Salvando...' : 'Salvar Fechamento'}
            </Button>
          </div>
          
          {/* HISTÓRICO DE FECHAMENTOS */}
          <HistoricoFechamentos onEditar={handleEditarFechamento} />
        </>
      )}
      
      {tipoFechamento === 'vendas' && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Fechamento Mensal - Vendas será implementado em breve.</p>
          </CardContent>
        </Card>
      )}
        </TabsContent>
        
        <TabsContent value="comparacao">
          <ComparacaoFechamentos />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente de Histórico de Fechamentos
function HistoricoFechamentos({ onEditar }: { onEditar: (fechamento: any) => void }) {
  const utils = trpc.useUtils();
  const { data: fechamentos, isLoading } = trpc.fechamentoMensal.list.useQuery();
  
  // Estados de filtro
  const [filtroMesAno, setFiltroMesAno] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const deleteFechamento = trpc.fechamentoMensal.delete.useMutation({
    onSuccess: () => {
      toast.success('Fechamento excluído com sucesso!');
      utils.fechamentoMensal.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  });
  
  const handleExcluir = (id: number) => {
    deleteFechamento.mutate({ id });
  };
  
  const formatarMesAno = (mes: number, ano: number) => {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${meses[mes - 1]}/${ano}`;
  };
  
  const formatarData = (data: Date) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Função de exportação Excel
  const exportarExcel = (fechamento: any) => {
    const wb = XLSX.utils.book_new();
    
    // Função para garantir valores numéricos válidos
    const safe = (val: any) => parseFloat(val) || 0;
    
    // Dados de Receita (usando números puros, não strings)
    const receitaData = [
      ['RECEITA', ''],
      ['Cartões', safe(fechamento.receitaCartoes)],
      ['PIX', safe(fechamento.receitaPix)],
      ['Dinheiro', safe(fechamento.receitaDinheiro)],
      ['Rendimento', safe(fechamento.receitaRendimento)],
      ['Plataforma', safe(fechamento.receitaPlataforma)],
      ['Pagseguro', safe(fechamento.receitaPagseguro)],
      ['Santander', safe(fechamento.receitaSantander)],
      ['', ''],
      ['TOTAL RECEITA', (safe(fechamento.receitaCartoes) + safe(fechamento.receitaPix) + safe(fechamento.receitaDinheiro) + safe(fechamento.receitaRendimento) + safe(fechamento.receitaPlataforma) + safe(fechamento.receitaPagseguro) + safe(fechamento.receitaSantander))]
    ];
    
    // Dados de Despesa (usando números puros)
    const despesaData = [
      ['DESPESA', ''],
      ['Tarifa Cartão (Rede)', safe(fechamento.despesaTarifaCartao)],
      ['Outras Tarifas (Itaú)', safe(fechamento.despesaOutrasTarifas)],
      ['Maquiadora (Sistema)', safe(fechamento.despesaMaquiadora)],
      ['Operações Fora Plataforma', safe(fechamento.despesaOperacaoFora)],
      ['Investimentos (Sistema)', safe(fechamento.despesaInvestimentos)],
      ['Estorno', safe(fechamento.despesaEstorno)],
      ['Transferência Santander', safe(fechamento.despesaTransfSantander)],
      ['', ''],
      ['TOTAL DESPESA', (safe(fechamento.despesaTarifaCartao) + safe(fechamento.despesaOutrasTarifas) + safe(fechamento.despesaMaquiadora) + safe(fechamento.despesaOperacaoFora) + safe(fechamento.despesaInvestimentos) + safe(fechamento.despesaEstorno) + safe(fechamento.despesaTransfSantander))]
    ];
    
    // Dados de Impostos (usando números puros)
    const impostosData = [
      ['IMPOSTOS', ''],
      ['ISS (5%)', safe(fechamento.impostosIss)],
      ['PIS (0,65%)', safe(fechamento.impostosPis)],
      ['COFINS (3%)', safe(fechamento.impostosCofins)],
      ['CSLL (2,88%)', safe(fechamento.impostosCsll)],
      ['IRPJ', safe(fechamento.impostosIrpj)],
      ['', ''],
      ['TOTAL IMPOSTOS', (safe(fechamento.impostosIss) + safe(fechamento.impostosPis) + safe(fechamento.impostosCofins) + safe(fechamento.impostosCsll) + safe(fechamento.impostosIrpj))]
    ];
    
    const wsReceita = XLSX.utils.aoa_to_sheet(receitaData);
    const wsDespesa = XLSX.utils.aoa_to_sheet(despesaData);
    const wsImpostos = XLSX.utils.aoa_to_sheet(impostosData);
    
    // Formatar células de valores como número com 2 casas decimais
    const formatarColunaValores = (ws: any, ultimaLinha: number) => {
      for (let i = 2; i <= ultimaLinha; i++) {
        const cellRef = `B${i}`;
        if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
          ws[cellRef].t = 'n'; // Tipo número
          ws[cellRef].z = '#,##0.00'; // Formato com 2 casas decimais
        }
      }
    };
    
    formatarColunaValores(wsReceita, receitaData.length);
    formatarColunaValores(wsDespesa, despesaData.length);
    formatarColunaValores(wsImpostos, impostosData.length);
    
    XLSX.utils.book_append_sheet(wb, wsReceita, 'Receita');
    XLSX.utils.book_append_sheet(wb, wsDespesa, 'Despesa');
    XLSX.utils.book_append_sheet(wb, wsImpostos, 'Impostos');
    
    XLSX.writeFile(wb, `Fechamento_${formatarMesAno(fechamento.mes, fechamento.ano).replace('/', '_')}.xlsx`);
    toast.success('Excel exportado com sucesso!');
  };
  
  // Função de exportação PDF
  const exportarPDF = (fechamento: any) => {
    const mesAno = formatarMesAno(fechamento.mes, fechamento.ano);
    
    // Garantir que todos os valores sejam números válidos (proteger contra null/undefined)
    const safe = (val: any) => parseFloat(val) || 0;
    
    const totalReceita = (safe(fechamento.receitaCartoes) + safe(fechamento.receitaPix) + safe(fechamento.receitaDinheiro) + safe(fechamento.receitaRendimento) + safe(fechamento.receitaPlataforma) + safe(fechamento.receitaPagseguro) + safe(fechamento.receitaSantander));
    const totalDespesa = (safe(fechamento.despesaTarifaCartao) + safe(fechamento.despesaOutrasTarifas) + safe(fechamento.despesaMaquiadora) + safe(fechamento.despesaOperacaoFora) + safe(fechamento.despesaInvestimentos) + safe(fechamento.despesaEstorno) + safe(fechamento.despesaTransfSantander));
    const totalImpostos = (safe(fechamento.impostosIss) + safe(fechamento.impostosPis) + safe(fechamento.impostosCofins) + safe(fechamento.impostosCsll) + safe(fechamento.impostosIrpj));
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 5mm; }
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 10mm; }
          .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header img { height: 50px; }
          .header-info { text-align: right; }
          .header-info h1 { margin: 0; font-size: 18px; }
          .header-info p { margin: 2px 0; font-size: 10px; color: #666; }
          .section { margin-bottom: 20px; }
          .section h2 { background: #333; color: white; padding: 8px; margin: 0 0 10px 0; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 5px; border-bottom: 1px solid #ddd; }
          td:first-child { font-weight: bold; }
          td:last-child { text-align: right; }
          .total { font-weight: bold; background: #f0f0f0; }
          .footer { text-align: center; font-size: 10px; color: #666; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${window.location.origin}/logo-estudio-supera.png" alt="Estúdio Super A" />
          <div class="header-info">
            <h1>Fechamento Mensal - ${mesAno}</h1>
            <p>Tipo: Conta Bancária</p>
            <p>Data de Criação: ${formatarData(fechamento.createdAt)}</p>
            <p>Criado por: ${fechamento.criadoPorNome}</p>
          </div>
        </div>
        
        <div class="section">
          <h2>RECEITA</h2>
          <table>
            <tr><td>Cartões</td><td>R$ ${formatarValor(safe(fechamento.receitaCartoes))}</td></tr>
            <tr><td>PIX</td><td>R$ ${formatarValor(safe(fechamento.receitaPix))}</td></tr>
            <tr><td>Dinheiro</td><td>R$ ${formatarValor(safe(fechamento.receitaDinheiro))}</td></tr>
            <tr><td>Rendimento</td><td>R$ ${formatarValor(safe(fechamento.receitaRendimento))}</td></tr>
            <tr><td>Plataforma</td><td>R$ ${formatarValor(safe(fechamento.receitaPlataforma))}</td></tr>
            <tr><td>Pagseguro</td><td>R$ ${formatarValor(safe(fechamento.receitaPagseguro))}</td></tr>
            <tr><td>Santander</td><td>R$ ${formatarValor(safe(fechamento.receitaSantander))}</td></tr>
            <tr class="total"><td>TOTAL RECEITA</td><td>R$ ${formatarValor(totalReceita)}</td></tr>
          </table>
        </div>
        
        <div class="section">
          <h2>DESPESA</h2>
          <table>
            <tr><td>Tarifa Cartão</td><td>R$ ${formatarValor(safe(fechamento.despesaTarifaCartao))}</td></tr>
            <tr><td>Outras Tarifas</td><td>R$ ${formatarValor(safe(fechamento.despesaOutrasTarifas))}</td></tr>
            <tr><td>Impostos</td><td>R$ ${formatarValor(totalImpostos)}</td></tr>
            <tr><td>Maquiadora</td><td>R$ ${formatarValor(safe(fechamento.despesaMaquiadora))}</td></tr>
            <tr><td>Operações Fora</td><td>R$ ${formatarValor(safe(fechamento.despesaOperacaoFora))}</td></tr>
            <tr><td>Investimentos</td><td>R$ ${formatarValor(safe(fechamento.despesaInvestimentos))}</td></tr>
            <tr><td>Estorno</td><td>R$ ${formatarValor(safe(fechamento.despesaEstorno))}</td></tr>
            <tr><td>Transferência Santander</td><td>R$ ${formatarValor(safe(fechamento.despesaTransfSantander))}</td></tr>
            <tr class="total"><td>TOTAL DESPESA</td><td>R$ ${formatarValor(totalDespesa + totalImpostos)}</td></tr>
          </table>
        </div>
        
        <div class="section">
          <table>
            <tr class="total" style="background: #e8f5e9;"><td>SALDO</td><td>R$ ${formatarValor(totalReceita - (totalDespesa + totalImpostos))}</td></tr>
          </table>
        </div>
        
        <div class="footer">
          Estúdio Super A Formaturas - Fechamento Mensal ${mesAno}<br>
          Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        URL.revokeObjectURL(url);
      };
    } else {
      toast.error('Bloqueador de pop-up ativado. Por favor, permita pop-ups para este site.');
    }
  };
  
  // Aplicar filtros
  const fechamentosFiltrados = useMemo(() => {
    if (!fechamentos) return [];
    
    return fechamentos.filter((fechamento) => {
      // Filtro por mês/ano
      if (filtroMesAno) {
        const mesAnoFormatado = formatarMesAno(fechamento.mes, fechamento.ano).toLowerCase();
        if (!mesAnoFormatado.includes(filtroMesAno.toLowerCase())) {
          return false;
        }
      }
      
      // Filtro por tipo
      if (filtroTipo !== 'todos' && fechamento.tipo !== filtroTipo) {
        return false;
      }
      
      return true;
    });
  }, [fechamentos, filtroMesAno, filtroTipo]);
  
  if (isLoading) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Fechamentos Realizados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!fechamentos || fechamentos.length === 0) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Fechamentos Realizados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">Nenhum fechamento salvo ainda.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Fechamentos Realizados
          <span className="text-sm font-normal text-muted-foreground ml-auto">
            ({fechamentosFiltrados.length} {fechamentosFiltrados.length === 1 ? 'resultado' : 'resultados'})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Label htmlFor="filtro-mes-ano">Buscar por Mês/Ano</Label>
            <Input
              id="filtro-mes-ano"
              placeholder="Ex: Janeiro/2025, 01/2025, Janeiro..."
              value={filtroMesAno}
              onChange={(e) => setFiltroMesAno(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-64">
            <Label htmlFor="filtro-tipo">Tipo de Fechamento</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger id="filtro-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="conta_bancaria">Conta Bancária</SelectItem>
                <SelectItem value="vendas">Vendas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês/Ano</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fechamentosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum fechamento encontrado com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                fechamentosFiltrados.map((fechamento) => (
                <TableRow key={fechamento.id}>
                  <TableCell className="font-medium">
                    {formatarMesAno(fechamento.mes, fechamento.ano)}
                  </TableCell>
                  <TableCell>
                    {fechamento.tipo === 'conta_bancaria' ? 'Conta Bancária' : 'Vendas'}
                  </TableCell>
                  <TableCell>
                    {formatarData(fechamento.createdAt)}
                  </TableCell>
                  <TableCell>
                    {fechamento.criadoPorNome}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportarExcel(fechamento)}
                        title="Exportar Excel"
                      >
                        <FileDown className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportarPDF(fechamento)}
                        title="Exportar PDF"
                      >
                        <FileText className="w-4 h-4 text-red-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditar(fechamento)}
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o fechamento de {formatarMesAno(fechamento.mes, fechamento.ano)}?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleExcluir(fechamento.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Funções de exportação para Comparação
const exportarComparacaoExcel = (f1: any, f2: any) => {
  const wb = XLSX.utils.book_new();
  const safe = (val: any) => (val || 0);
  
  const formatarMesAno = (mes: number, ano: number) => {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${meses[mes - 1]}/${ano}`;
  };
  
  // Dados de Receita
  const receitaData = [
    ['RECEITA', formatarMesAno(f1.mes, f1.ano), formatarMesAno(f2.mes, f2.ano), 'Variação (%)'],
    ['Cartões', safe(f1.receitaCartoes) / 100, safe(f2.receitaCartoes) / 100, ((safe(f1.receitaCartoes) - safe(f2.receitaCartoes)) / safe(f2.receitaCartoes) * 100).toFixed(1)],
    ['PIX', safe(f1.receitaPix) / 100, safe(f2.receitaPix) / 100, ((safe(f1.receitaPix) - safe(f2.receitaPix)) / safe(f2.receitaPix) * 100).toFixed(1)],
    ['Dinheiro', safe(f1.receitaDinheiro) / 100, safe(f2.receitaDinheiro) / 100, ((safe(f1.receitaDinheiro) - safe(f2.receitaDinheiro)) / safe(f2.receitaDinheiro) * 100).toFixed(1)],
    ['Rendimento', safe(f1.receitaRendimento) / 100, safe(f2.receitaRendimento) / 100, ((safe(f1.receitaRendimento) - safe(f2.receitaRendimento)) / safe(f2.receitaRendimento) * 100).toFixed(1)],
    ['Plataforma', safe(f1.receitaPlataforma) / 100, safe(f2.receitaPlataforma) / 100, ((safe(f1.receitaPlataforma) - safe(f2.receitaPlataforma)) / safe(f2.receitaPlataforma) * 100).toFixed(1)],
    ['Pagseguro', safe(f1.receitaPagseguro) / 100, safe(f2.receitaPagseguro) / 100, ((safe(f1.receitaPagseguro) - safe(f2.receitaPagseguro)) / safe(f2.receitaPagseguro) * 100).toFixed(1)],
    ['Santander', safe(f1.receitaSantander) / 100, safe(f2.receitaSantander) / 100, ((safe(f1.receitaSantander) - safe(f2.receitaSantander)) / safe(f2.receitaSantander) * 100).toFixed(1)],
    ['', '', '', ''],
    ['TOTAL RECEITA', 
      (safe(f1.receitaCartoes) + safe(f1.receitaPix) + safe(f1.receitaDinheiro) + safe(f1.receitaRendimento) + safe(f1.receitaPlataforma) + safe(f1.receitaPagseguro) + safe(f1.receitaSantander)) / 100,
      (safe(f2.receitaCartoes) + safe(f2.receitaPix) + safe(f2.receitaDinheiro) + safe(f2.receitaRendimento) + safe(f2.receitaPlataforma) + safe(f2.receitaPagseguro) + safe(f2.receitaSantander)) / 100,
      ''
    ]
  ];
  
  // Dados de Despesa
  const despesaData = [
    ['DESPESA', formatarMesAno(f1.mes, f1.ano), formatarMesAno(f2.mes, f2.ano), 'Variação (%)'],
    ['Tarifa Cartão', safe(f1.despesaTarifaCartao) / 100, safe(f2.despesaTarifaCartao) / 100, ((safe(f1.despesaTarifaCartao) - safe(f2.despesaTarifaCartao)) / safe(f2.despesaTarifaCartao) * 100).toFixed(1)],
    ['Outras Tarifas', safe(f1.despesaOutrasTarifas) / 100, safe(f2.despesaOutrasTarifas) / 100, ((safe(f1.despesaOutrasTarifas) - safe(f2.despesaOutrasTarifas)) / safe(f2.despesaOutrasTarifas) * 100).toFixed(1)],
    ['Maquiadora', safe(f1.despesaMaquiadora) / 100, safe(f2.despesaMaquiadora) / 100, ((safe(f1.despesaMaquiadora) - safe(f2.despesaMaquiadora)) / safe(f2.despesaMaquiadora) * 100).toFixed(1)],
    ['Operações Fora', safe(f1.despesaOperacaoFora) / 100, safe(f2.despesaOperacaoFora) / 100, ((safe(f1.despesaOperacaoFora) - safe(f2.despesaOperacaoFora)) / safe(f2.despesaOperacaoFora) * 100).toFixed(1)],
    ['Investimentos', safe(f1.despesaInvestimentos) / 100, safe(f2.despesaInvestimentos) / 100, ((safe(f1.despesaInvestimentos) - safe(f2.despesaInvestimentos)) / safe(f2.despesaInvestimentos) * 100).toFixed(1)],
    ['Estorno', safe(f1.despesaEstorno) / 100, safe(f2.despesaEstorno) / 100, ((safe(f1.despesaEstorno) - safe(f2.despesaEstorno)) / safe(f2.despesaEstorno) * 100).toFixed(1)],
    ['Transferência Santander', safe(f1.despesaTransfSantander) / 100, safe(f2.despesaTransfSantander) / 100, ((safe(f1.despesaTransfSantander) - safe(f2.despesaTransfSantander)) / safe(f2.despesaTransfSantander) * 100).toFixed(1)],
    ['', '', '', ''],
    ['TOTAL DESPESA',
      (safe(f1.despesaTarifaCartao) + safe(f1.despesaOutrasTarifas) + safe(f1.despesaMaquiadora) + safe(f1.despesaOperacaoFora) + safe(f1.despesaInvestimentos) + safe(f1.despesaEstorno) + safe(f1.despesaTransfSantander)) / 100,
      (safe(f2.despesaTarifaCartao) + safe(f2.despesaOutrasTarifas) + safe(f2.despesaMaquiadora) + safe(f2.despesaOperacaoFora) + safe(f2.despesaInvestimentos) + safe(f2.despesaEstorno) + safe(f2.despesaTransfSantander)) / 100,
      ''
    ]
  ];
  
  // Dados de Impostos
  const impostosData = [
    ['IMPOSTOS', formatarMesAno(f1.mes, f1.ano), formatarMesAno(f2.mes, f2.ano), 'Variação (%)'],
    ['ISS (5%)', safe(f1.impostosIss) / 100, safe(f2.impostosIss) / 100, ((safe(f1.impostosIss) - safe(f2.impostosIss)) / safe(f2.impostosIss) * 100).toFixed(1)],
    ['PIS (0,65%)', safe(f1.impostosPis) / 100, safe(f2.impostosPis) / 100, ((safe(f1.impostosPis) - safe(f2.impostosPis)) / safe(f2.impostosPis) * 100).toFixed(1)],
    ['COFINS (3%)', safe(f1.impostosCofins) / 100, safe(f2.impostosCofins) / 100, ((safe(f1.impostosCofins) - safe(f2.impostosCofins)) / safe(f2.impostosCofins) * 100).toFixed(1)],
    ['CSLL (2,88%)', safe(f1.impostosCsll) / 100, safe(f2.impostosCsll) / 100, ((safe(f1.impostosCsll) - safe(f2.impostosCsll)) / safe(f2.impostosCsll) * 100).toFixed(1)],
    ['IRPJ', safe(f1.impostosIrpj) / 100, safe(f2.impostosIrpj) / 100, ((safe(f1.impostosIrpj) - safe(f2.impostosIrpj)) / safe(f2.impostosIrpj) * 100).toFixed(1)],
    ['', '', '', ''],
    ['TOTAL IMPOSTOS',
      (safe(f1.impostosIss) + safe(f1.impostosPis) + safe(f1.impostosCofins) + safe(f1.impostosCsll) + safe(f1.impostosIrpj)) / 100,
      (safe(f2.impostosIss) + safe(f2.impostosPis) + safe(f2.impostosCofins) + safe(f2.impostosCsll) + safe(f2.impostosIrpj)) / 100,
      ''
    ]
  ];
  
  const wsReceita = XLSX.utils.aoa_to_sheet(receitaData);
  const wsDespesa = XLSX.utils.aoa_to_sheet(despesaData);
  const wsImpostos = XLSX.utils.aoa_to_sheet(impostosData);
  
  // Formatar células de valores como número
  const formatarColunas = (ws: any, ultimaLinha: number) => {
    for (let i = 2; i <= ultimaLinha; i++) {
      ['B', 'C'].forEach(col => {
        const cellRef = `${col}${i}`;
        if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
          ws[cellRef].t = 'n';
          ws[cellRef].z = '#,##0.00';
        }
      });
    }
  };
  
  formatarColunas(wsReceita, receitaData.length);
  formatarColunas(wsDespesa, despesaData.length);
  formatarColunas(wsImpostos, impostosData.length);
  
  XLSX.utils.book_append_sheet(wb, wsReceita, 'Receita');
  XLSX.utils.book_append_sheet(wb, wsDespesa, 'Despesa');
  XLSX.utils.book_append_sheet(wb, wsImpostos, 'Impostos');
  
  XLSX.writeFile(wb, `Comparacao_${formatarMesAno(f1.mes, f1.ano).replace('/', '_')}_vs_${formatarMesAno(f2.mes, f2.ano).replace('/', '_')}.xlsx`);
  toast.success('Excel de comparação exportado com sucesso!');
};

const exportarComparacaoPDF = (f1: any, f2: any) => {
  const safe = (val: any) => (val || 0);
  const formatarMesAno = (mes: number, ano: number) => {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${meses[mes - 1]}/${ano}`;
  };
  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const totalReceita1 = (safe(f1.receitaCartoes) + safe(f1.receitaPix) + safe(f1.receitaDinheiro) + safe(f1.receitaRendimento) + safe(f1.receitaPlataforma) + safe(f1.receitaPagseguro) + safe(f1.receitaSantander)) / 100;
  const totalReceita2 = (safe(f2.receitaCartoes) + safe(f2.receitaPix) + safe(f2.receitaDinheiro) + safe(f2.receitaRendimento) + safe(f2.receitaPlataforma) + safe(f2.receitaPagseguro) + safe(f2.receitaSantander)) / 100;
  const totalDespesa1 = (safe(f1.despesaTarifaCartao) + safe(f1.despesaOutrasTarifas) + safe(f1.despesaMaquiadora) + safe(f1.despesaOperacaoFora) + safe(f1.despesaInvestimentos) + safe(f1.despesaEstorno) + safe(f1.despesaTransfSantander)) / 100;
  const totalDespesa2 = (safe(f2.despesaTarifaCartao) + safe(f2.despesaOutrasTarifas) + safe(f2.despesaMaquiadora) + safe(f2.despesaOperacaoFora) + safe(f2.despesaInvestimentos) + safe(f2.despesaEstorno) + safe(f2.despesaTransfSantander)) / 100;
  const totalImpostos1 = (safe(f1.impostosIss) + safe(f1.impostosPis) + safe(f1.impostosCofins) + safe(f1.impostosCsll) + safe(f1.impostosIrpj)) / 100;
  const totalImpostos2 = (safe(f2.impostosIss) + safe(f2.impostosPis) + safe(f2.impostosCofins) + safe(f2.impostosCsll) + safe(f2.impostosIrpj)) / 100;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4 landscape; margin: 5mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 10mm; }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header img { height: 40px; }
        .header-info { text-align: right; }
        .header-info h1 { margin: 0; font-size: 16px; }
        .header-info p { margin: 2px 0; font-size: 10px; color: #666; }
        .section { margin-bottom: 15px; }
        .section h2 { background: #333; color: white; padding: 6px; margin: 0 0 8px 0; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 4px; border-bottom: 1px solid #ddd; font-size: 10px; }
        td:first-child { font-weight: bold; width: 30%; }
        td:nth-child(2), td:nth-child(3) { text-align: right; width: 25%; }
        td:nth-child(4) { text-align: right; width: 20%; }
        .total { font-weight: bold; background: #f0f0f0; }
        .footer { text-align: center; font-size: 9px; color: #666; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${window.location.origin}/logo-estudio-supera.png" alt="Estúdio Super A" />
        <div class="header-info">
          <h1>Comparação entre Períodos</h1>
          <p>${formatarMesAno(f1.mes, f1.ano)} vs ${formatarMesAno(f2.mes, f2.ano)}</p>
        </div>
      </div>
      
      <div class="section">
        <h2>RECEITA</h2>
        <table>
          <tr><td>Item</td><td>${formatarMesAno(f1.mes, f1.ano)}</td><td>${formatarMesAno(f2.mes, f2.ano)}</td><td>Variação</td></tr>
          <tr><td>Cartões</td><td>R$ ${formatarValor(safe(f1.receitaCartoes) / 100)}</td><td>R$ ${formatarValor(safe(f2.receitaCartoes) / 100)}</td><td>${((safe(f1.receitaCartoes) - safe(f2.receitaCartoes)) / safe(f2.receitaCartoes) * 100).toFixed(1)}%</td></tr>
          <tr><td>PIX</td><td>R$ ${formatarValor(safe(f1.receitaPix) / 100)}</td><td>R$ ${formatarValor(safe(f2.receitaPix) / 100)}</td><td>${((safe(f1.receitaPix) - safe(f2.receitaPix)) / safe(f2.receitaPix) * 100).toFixed(1)}%</td></tr>
          <tr><td>Dinheiro</td><td>R$ ${formatarValor(safe(f1.receitaDinheiro) / 100)}</td><td>R$ ${formatarValor(safe(f2.receitaDinheiro) / 100)}</td><td>${((safe(f1.receitaDinheiro) - safe(f2.receitaDinheiro)) / safe(f2.receitaDinheiro) * 100).toFixed(1)}%</td></tr>
          <tr><td>Rendimento</td><td>R$ ${formatarValor(safe(f1.receitaRendimento) / 100)}</td><td>R$ ${formatarValor(safe(f2.receitaRendimento) / 100)}</td><td>${((safe(f1.receitaRendimento) - safe(f2.receitaRendimento)) / safe(f2.receitaRendimento) * 100).toFixed(1)}%</td></tr>
          <tr><td>Plataforma</td><td>R$ ${formatarValor(safe(f1.receitaPlataforma) / 100)}</td><td>R$ ${formatarValor(safe(f2.receitaPlataforma) / 100)}</td><td>${((safe(f1.receitaPlataforma) - safe(f2.receitaPlataforma)) / safe(f2.receitaPlataforma) * 100).toFixed(1)}%</td></tr>
          <tr><td>Pagseguro</td><td>R$ ${formatarValor(safe(f1.receitaPagseguro) / 100)}</td><td>R$ ${formatarValor(safe(f2.receitaPagseguro) / 100)}</td><td>${((safe(f1.receitaPagseguro) - safe(f2.receitaPagseguro)) / safe(f2.receitaPagseguro) * 100).toFixed(1)}%</td></tr>
          <tr><td>Santander</td><td>R$ ${formatarValor(safe(f1.receitaSantander) / 100)}</td><td>R$ ${formatarValor(safe(f2.receitaSantander) / 100)}</td><td>${((safe(f1.receitaSantander) - safe(f2.receitaSantander)) / safe(f2.receitaSantander) * 100).toFixed(1)}%</td></tr>
          <tr class="total"><td>TOTAL RECEITA</td><td>R$ ${formatarValor(totalReceita1)}</td><td>R$ ${formatarValor(totalReceita2)}</td><td></td></tr>
        </table>
      </div>
      
      <div class="section">
        <h2>DESPESA</h2>
        <table>
          <tr><td>Item</td><td>${formatarMesAno(f1.mes, f1.ano)}</td><td>${formatarMesAno(f2.mes, f2.ano)}</td><td>Variação</td></tr>
          <tr><td>Tarifa Cartão</td><td>R$ ${formatarValor(safe(f1.despesaTarifaCartao) / 100)}</td><td>R$ ${formatarValor(safe(f2.despesaTarifaCartao) / 100)}</td><td>${((safe(f1.despesaTarifaCartao) - safe(f2.despesaTarifaCartao)) / safe(f2.despesaTarifaCartao) * 100).toFixed(1)}%</td></tr>
          <tr><td>Outras Tarifas</td><td>R$ ${formatarValor(safe(f1.despesaOutrasTarifas) / 100)}</td><td>R$ ${formatarValor(safe(f2.despesaOutrasTarifas) / 100)}</td><td>${((safe(f1.despesaOutrasTarifas) - safe(f2.despesaOutrasTarifas)) / safe(f2.despesaOutrasTarifas) * 100).toFixed(1)}%</td></tr>
          <tr><td>Maquiadora</td><td>R$ ${formatarValor(safe(f1.despesaMaquiadora) / 100)}</td><td>R$ ${formatarValor(safe(f2.despesaMaquiadora) / 100)}</td><td>${((safe(f1.despesaMaquiadora) - safe(f2.despesaMaquiadora)) / safe(f2.despesaMaquiadora) * 100).toFixed(1)}%</td></tr>
          <tr><td>Operações Fora</td><td>R$ ${formatarValor(safe(f1.despesaOperacaoFora) / 100)}</td><td>R$ ${formatarValor(safe(f2.despesaOperacaoFora) / 100)}</td><td>${((safe(f1.despesaOperacaoFora) - safe(f2.despesaOperacaoFora)) / safe(f2.despesaOperacaoFora) * 100).toFixed(1)}%</td></tr>
          <tr><td>Investimentos</td><td>R$ ${formatarValor(safe(f1.despesaInvestimentos) / 100)}</td><td>R$ ${formatarValor(safe(f2.despesaInvestimentos) / 100)}</td><td>${((safe(f1.despesaInvestimentos) - safe(f2.despesaInvestimentos)) / safe(f2.despesaInvestimentos) * 100).toFixed(1)}%</td></tr>
          <tr><td>Estorno</td><td>R$ ${formatarValor(safe(f1.despesaEstorno) / 100)}</td><td>R$ ${formatarValor(safe(f2.despesaEstorno) / 100)}</td><td>${((safe(f1.despesaEstorno) - safe(f2.despesaEstorno)) / safe(f2.despesaEstorno) * 100).toFixed(1)}%</td></tr>
          <tr><td>Transferência Santander</td><td>R$ ${formatarValor(safe(f1.despesaTransfSantander) / 100)}</td><td>R$ ${formatarValor(safe(f2.despesaTransfSantander) / 100)}</td><td>${((safe(f1.despesaTransfSantander) - safe(f2.despesaTransfSantander)) / safe(f2.despesaTransfSantander) * 100).toFixed(1)}%</td></tr>
          <tr class="total"><td>TOTAL DESPESA</td><td>R$ ${formatarValor(totalDespesa1)}</td><td>R$ ${formatarValor(totalDespesa2)}</td><td></td></tr>
        </table>
      </div>
      
      <div class="section">
        <h2>IMPOSTOS</h2>
        <table>
          <tr><td>Item</td><td>${formatarMesAno(f1.mes, f1.ano)}</td><td>${formatarMesAno(f2.mes, f2.ano)}</td><td>Variação</td></tr>
          <tr><td>ISS (5%)</td><td>R$ ${formatarValor(safe(f1.impostosIss) / 100)}</td><td>R$ ${formatarValor(safe(f2.impostosIss) / 100)}</td><td>${((safe(f1.impostosIss) - safe(f2.impostosIss)) / safe(f2.impostosIss) * 100).toFixed(1)}%</td></tr>
          <tr><td>PIS (0,65%)</td><td>R$ ${formatarValor(safe(f1.impostosPis) / 100)}</td><td>R$ ${formatarValor(safe(f2.impostosPis) / 100)}</td><td>${((safe(f1.impostosPis) - safe(f2.impostosPis)) / safe(f2.impostosPis) * 100).toFixed(1)}%</td></tr>
          <tr><td>COFINS (3%)</td><td>R$ ${formatarValor(safe(f1.impostosCofins) / 100)}</td><td>R$ ${formatarValor(safe(f2.impostosCofins) / 100)}</td><td>${((safe(f1.impostosCofins) - safe(f2.impostosCofins)) / safe(f2.impostosCofins) * 100).toFixed(1)}%</td></tr>
          <tr><td>CSLL (2,88%)</td><td>R$ ${formatarValor(safe(f1.impostosCsll) / 100)}</td><td>R$ ${formatarValor(safe(f2.impostosCsll) / 100)}</td><td>${((safe(f1.impostosCsll) - safe(f2.impostosCsll)) / safe(f2.impostosCsll) * 100).toFixed(1)}%</td></tr>
          <tr><td>IRPJ</td><td>R$ ${formatarValor(safe(f1.impostosIrpj) / 100)}</td><td>R$ ${formatarValor(safe(f2.impostosIrpj) / 100)}</td><td>${((safe(f1.impostosIrpj) - safe(f2.impostosIrpj)) / safe(f2.impostosIrpj) * 100).toFixed(1)}%</td></tr>
          <tr class="total"><td>TOTAL IMPOSTOS</td><td>R$ ${formatarValor(totalImpostos1)}</td><td>R$ ${formatarValor(totalImpostos2)}</td><td></td></tr>
        </table>
      </div>
      
      <div class="footer">
        Estúdio Super A Formaturas - Comparação entre Períodos<br>
        Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
      </div>
    </body>
    </html>
  `;
  
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
      URL.revokeObjectURL(url);
    };
  } else {
    toast.error('Bloqueador de pop-up ativado. Por favor, permita pop-ups para este site.');
  }
};

// Componente de Comparação entre Fechamentos
function ComparacaoFechamentos() {
  const [fechamento1Id, setFechamento1Id] = useState<number | undefined>();
  const [fechamento2Id, setFechamento2Id] = useState<number | undefined>();
  
  const { data: fechamentos } = trpc.fechamentoMensal.list.useQuery();
  const { data: fechamento1 } = trpc.fechamentoMensal.getById.useQuery(
    { id: fechamento1Id! },
    { enabled: !!fechamento1Id }
  );
  const { data: fechamento2 } = trpc.fechamentoMensal.getById.useQuery(
    { id: fechamento2Id! },
    { enabled: !!fechamento2Id }
  );
  
  const formatarMesAno = (mes: number, ano: number) => {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${meses[mes - 1]}/${ano}`;
  };
  
  const calcularVariacao = (valor1: number, valor2: number) => {
    if (valor2 === 0) return { percentual: 0, direcao: 'neutro' as const };
    const variacao = ((valor1 - valor2) / valor2) * 100;
    return {
      percentual: Math.abs(variacao),
      direcao: variacao > 0 ? 'alta' : variacao < 0 ? 'baixa' : 'neutro' as const
    };
  };
  
  const LinhaComparacao = ({ 
    label, 
    valor1, 
    valor2 
  }: { 
    label: string; 
    valor1: number; 
    valor2: number; 
  }) => {
    const { percentual, direcao } = calcularVariacao(valor1, valor2);
    const isSignificativo = percentual > 10; // Variação acima de 10% é destacada
    
    return (
      <TableRow className={isSignificativo ? 'bg-amber-50' : ''}>
        <TableCell className="font-medium">{label}</TableCell>
        <TableCell className="text-right">R$ {formatarValor(valor1 / 100)}</TableCell>
        <TableCell className="text-right">R$ {formatarValor(valor2 / 100)}</TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            {direcao === 'alta' && <span className="text-green-600">↑</span>}
            {direcao === 'baixa' && <span className="text-red-600">↓</span>}
            <span className={`font-medium ${
              direcao === 'alta' ? 'text-green-600' : 
              direcao === 'baixa' ? 'text-red-600' : 
              'text-gray-500'
            }`}>
              {percentual.toFixed(1)}%
            </span>
          </div>
        </TableCell>
      </TableRow>
    );
  };
  
  if (!fechamentos || fechamentos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>Nenhum fechamento disponível para comparação.</p>
          <p className="text-sm mt-2">Crie pelo menos 2 fechamentos para usar esta funcionalidade.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Selecione os Períodos para Comparar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="periodo1">Período 1</Label>
              <Select 
                value={fechamento1Id?.toString()} 
                onValueChange={(v) => setFechamento1Id(parseInt(v))}
              >
                <SelectTrigger id="periodo1">
                  <SelectValue placeholder="Selecione o primeiro período" />
                </SelectTrigger>
                <SelectContent>
                  {fechamentos.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {formatarMesAno(f.mes, f.ano)} - {f.tipo === 'conta_bancaria' ? 'Conta Bancária' : 'Vendas'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="periodo2">Período 2</Label>
              <Select 
                value={fechamento2Id?.toString()} 
                onValueChange={(v) => setFechamento2Id(parseInt(v))}
              >
                <SelectTrigger id="periodo2">
                  <SelectValue placeholder="Selecione o segundo período" />
                </SelectTrigger>
                <SelectContent>
                  {fechamentos.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {formatarMesAno(f.mes, f.ano)} - {f.tipo === 'conta_bancaria' ? 'Conta Bancária' : 'Vendas'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {fechamento1 && fechamento2 && (
        <div className="space-y-6">
          {/* Botões de Exportação */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => exportarComparacaoExcel(fechamento1, fechamento2)}
            >
              <FileDown className="w-4 h-4 mr-2 text-green-600" />
              Exportar Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => exportarComparacaoPDF(fechamento1, fechamento2)}
            >
              <FileText className="w-4 h-4 mr-2 text-red-600" />
              Exportar PDF
            </Button>
          </div>
          
          {/* Comparação de Receita */}
          <Card>
            <CardHeader>
              <CardTitle>Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">{formatarMesAno(fechamento1.mes, fechamento1.ano)}</TableHead>
                      <TableHead className="text-right">{formatarMesAno(fechamento2.mes, fechamento2.ano)}</TableHead>
                      <TableHead className="text-right">Variação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <LinhaComparacao label="Cartões" valor1={Number(fechamento1.receitaCartoes)} valor2={Number(fechamento2.receitaCartoes)} />
                    <LinhaComparacao label="PIX" valor1={Number(fechamento1.receitaPix)} valor2={Number(fechamento2.receitaPix)} />
                    <LinhaComparacao label="Dinheiro" valor1={Number(fechamento1.receitaDinheiro)} valor2={Number(fechamento2.receitaDinheiro)} />
                    <LinhaComparacao label="Rendimento" valor1={Number(fechamento1.receitaRendimento)} valor2={Number(fechamento2.receitaRendimento)} />
                    <LinhaComparacao label="Plataforma" valor1={Number(fechamento1.receitaPlataforma)} valor2={Number(fechamento2.receitaPlataforma)} />
                    <LinhaComparacao label="Pagseguro" valor1={Number(fechamento1.receitaPagseguro)} valor2={Number(fechamento2.receitaPagseguro)} />
                    <LinhaComparacao label="Santander" valor1={Number(fechamento1.receitaSantander)} valor2={Number(fechamento2.receitaSantander)} />
                    <TableRow className="bg-slate-100 font-bold">
                      <TableCell>TOTAL RECEITA</TableCell>
                      <TableCell className="text-right">
                        R$ {formatarValor((Number(fechamento1.receitaCartoes) + Number(fechamento1.receitaPix) + Number(fechamento1.receitaDinheiro) + Number(fechamento1.receitaRendimento) + Number(fechamento1.receitaPlataforma) + Number(fechamento1.receitaPagseguro) + Number(fechamento1.receitaSantander)) / 100)}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {formatarValor((Number(fechamento2.receitaCartoes) + Number(fechamento2.receitaPix) + Number(fechamento2.receitaDinheiro) + Number(fechamento2.receitaRendimento) + Number(fechamento2.receitaPlataforma) + Number(fechamento2.receitaPagseguro) + Number(fechamento2.receitaSantander)) / 100)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(() => {
                          const total1 = Number(fechamento1.receitaCartoes) + Number(fechamento1.receitaPix) + Number(fechamento1.receitaDinheiro) + Number(fechamento1.receitaRendimento) + Number(fechamento1.receitaPlataforma) + Number(fechamento1.receitaPagseguro) + Number(fechamento1.receitaSantander);
                          const total2 = Number(fechamento2.receitaCartoes) + Number(fechamento2.receitaPix) + Number(fechamento2.receitaDinheiro) + Number(fechamento2.receitaRendimento) + Number(fechamento2.receitaPlataforma) + Number(fechamento2.receitaPagseguro) + Number(fechamento2.receitaSantander);
                          const { percentual, direcao } = calcularVariacao(total1, total2);
                          return (
                            <div className="flex items-center justify-end gap-2">
                              {direcao === 'alta' && <span className="text-green-600">↑</span>}
                              {direcao === 'baixa' && <span className="text-red-600">↓</span>}
                              <span className={`font-medium ${
                                direcao === 'alta' ? 'text-green-600' : 
                                direcao === 'baixa' ? 'text-red-600' : 
                                'text-gray-500'
                              }`}>
                                {percentual.toFixed(1)}%
                              </span>
                            </div>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          {/* Comparação de Despesa */}
          <Card>
            <CardHeader>
              <CardTitle>Despesa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">{formatarMesAno(fechamento1.mes, fechamento1.ano)}</TableHead>
                      <TableHead className="text-right">{formatarMesAno(fechamento2.mes, fechamento2.ano)}</TableHead>
                      <TableHead className="text-right">Variação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <LinhaComparacao label="Tarifa Cartão" valor1={Number(fechamento1.despesaTarifaCartao)} valor2={Number(fechamento2.despesaTarifaCartao)} />
                    <LinhaComparacao label="Outras Tarifas" valor1={Number(fechamento1.despesaOutrasTarifas)} valor2={Number(fechamento2.despesaOutrasTarifas)} />
                    <LinhaComparacao label="Maquiadora" valor1={Number(fechamento1.despesaMaquiadora)} valor2={Number(fechamento2.despesaMaquiadora)} />
                    <LinhaComparacao label="Operações Fora" valor1={Number(fechamento1.despesaOperacaoFora)} valor2={Number(fechamento2.despesaOperacaoFora)} />
                    <LinhaComparacao label="Investimentos" valor1={Number(fechamento1.despesaInvestimentos)} valor2={Number(fechamento2.despesaInvestimentos)} />
                    <LinhaComparacao label="Estorno" valor1={Number(fechamento1.despesaEstorno)} valor2={Number(fechamento2.despesaEstorno)} />
                    <LinhaComparacao label="Transferência Santander" valor1={Number(fechamento1.despesaTransfSantander)} valor2={Number(fechamento2.despesaTransfSantander)} />
                    <TableRow className="bg-slate-100 font-bold">
                      <TableCell>TOTAL DESPESA</TableCell>
                      <TableCell className="text-right">
                        R$ {formatarValor((Number(fechamento1.despesaTarifaCartao) + Number(fechamento1.despesaOutrasTarifas) + Number(fechamento1.despesaMaquiadora) + Number(fechamento1.despesaOperacaoFora) + Number(fechamento1.despesaInvestimentos) + Number(fechamento1.despesaEstorno) + Number(fechamento1.despesaTransfSantander)) / 100)}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {formatarValor((Number(fechamento2.despesaTarifaCartao) + Number(fechamento2.despesaOutrasTarifas) + Number(fechamento2.despesaMaquiadora) + Number(fechamento2.despesaOperacaoFora) + Number(fechamento2.despesaInvestimentos) + Number(fechamento2.despesaEstorno) + Number(fechamento2.despesaTransfSantander)) / 100)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(() => {
                          const total1 = Number(fechamento1.despesaTarifaCartao) + Number(fechamento1.despesaOutrasTarifas) + Number(fechamento1.despesaMaquiadora) + Number(fechamento1.despesaOperacaoFora) + Number(fechamento1.despesaInvestimentos) + Number(fechamento1.despesaEstorno) + Number(fechamento1.despesaTransfSantander);
                          const total2 = Number(fechamento2.despesaTarifaCartao) + Number(fechamento2.despesaOutrasTarifas) + Number(fechamento2.despesaMaquiadora) + Number(fechamento2.despesaOperacaoFora) + Number(fechamento2.despesaInvestimentos) + Number(fechamento2.despesaEstorno) + Number(fechamento2.despesaTransfSantander);
                          const { percentual, direcao } = calcularVariacao(total1, total2);
                          return (
                            <div className="flex items-center justify-end gap-2">
                              {direcao === 'alta' && <span className="text-red-600">↑</span>}
                              {direcao === 'baixa' && <span className="text-green-600">↓</span>}
                              <span className={`font-medium ${
                                direcao === 'baixa' ? 'text-green-600' : 
                                direcao === 'alta' ? 'text-red-600' : 
                                'text-gray-500'
                              }`}>
                                {percentual.toFixed(1)}%
                              </span>
                            </div>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          {/* Comparação de Impostos */}
          <Card>
            <CardHeader>
              <CardTitle>Impostos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">{formatarMesAno(fechamento1.mes, fechamento1.ano)}</TableHead>
                      <TableHead className="text-right">{formatarMesAno(fechamento2.mes, fechamento2.ano)}</TableHead>
                      <TableHead className="text-right">Variação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <LinhaComparacao label="ISS (5%)" valor1={Number(fechamento1.impostosIss)} valor2={Number(fechamento2.impostosIss)} />
                    <LinhaComparacao label="PIS (0,65%)" valor1={Number(fechamento1.impostosPis)} valor2={Number(fechamento2.impostosPis)} />
                    <LinhaComparacao label="COFINS (3%)" valor1={Number(fechamento1.impostosCofins)} valor2={Number(fechamento2.impostosCofins)} />
                    <LinhaComparacao label="CSLL (2,88%)" valor1={Number(fechamento1.impostosCsll)} valor2={Number(fechamento2.impostosCsll)} />
                    <LinhaComparacao label="IRPJ" valor1={Number(fechamento1.impostosIrpj)} valor2={Number(fechamento2.impostosIrpj)} />
                    <TableRow className="bg-slate-100 font-bold">
                      <TableCell>TOTAL IMPOSTOS</TableCell>
                      <TableCell className="text-right">
                        R$ {formatarValor((Number(fechamento1.impostosIss) + Number(fechamento1.impostosPis) + Number(fechamento1.impostosCofins) + Number(fechamento1.impostosCsll) + Number(fechamento1.impostosIrpj)) / 100)}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {formatarValor((Number(fechamento2.impostosIss) + Number(fechamento2.impostosPis) + Number(fechamento2.impostosCofins) + Number(fechamento2.impostosCsll) + Number(fechamento2.impostosIrpj)) / 100)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(() => {
                          const total1 = Number(fechamento1.impostosIss) + Number(fechamento1.impostosPis) + Number(fechamento1.impostosCofins) + Number(fechamento1.impostosCsll) + Number(fechamento1.impostosIrpj);
                          const total2 = Number(fechamento2.impostosIss) + Number(fechamento2.impostosPis) + Number(fechamento2.impostosCofins) + Number(fechamento2.impostosCsll) + Number(fechamento2.impostosIrpj);
                          const { percentual, direcao } = calcularVariacao(total1, total2);
                          return (
                            <div className="flex items-center justify-end gap-2">
                              {direcao === 'alta' && <span className="text-red-600">↑</span>}
                              {direcao === 'baixa' && <span className="text-green-600">↓</span>}
                              <span className={`font-medium ${
                                direcao === 'baixa' ? 'text-green-600' : 
                                direcao === 'alta' ? 'text-red-600' : 
                                'text-gray-500'
                              }`}>
                                {percentual.toFixed(1)}%
                              </span>
                            </div>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
