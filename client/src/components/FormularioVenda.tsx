import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ShoppingCart, Plus, Trash2, Sparkles, Clock, Edit } from "lucide-react";

interface FormularioVendaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: number;
  formandoId: number;
  formandoNome: string;
  agendamentoId?: number;
  reuniaoId?: number; // Novo: para vendas de reuniões
  onSuccess?: () => void;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function FormularioVenda({
  open,
  onOpenChange,
  eventoId,
  formandoId,
  formandoNome,
  agendamentoId,
  reuniaoId,
  onSuccess,
}: FormularioVendaProps) {
  const utils = trpc.useUtils();
  
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split("T")[0]);
  const [itensVenda, setItensVenda] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [editandoVenda, setEditandoVenda] = useState<any>(null);
  
  // Buscar produtos
  const { data: produtos } = trpc.produtos.list.useQuery();
  
  // Buscar histórico de vendas do formando
  const { data: historicoVendas } = trpc.vendas.listByFormando.useQuery(
    { formandoId },
    { enabled: open }
  );
  
  // Mutation para criar venda
  const createVendaMutation = trpc.vendas.create.useMutation({
    onSuccess: () => {
      toast.success("Venda registrada com sucesso!");
      utils.vendas.listByFormando.invalidate({ formandoId });
      onOpenChange(false);
      onSuccess?.();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao registrar venda: ${error.message}`);
    },
  });
  
  // Mutation para atualizar venda
  const updateVendaMutation = trpc.vendas.update.useMutation({
    onSuccess: async () => {
      toast.success("Venda atualizada com sucesso!");
      // Aguardar refetch antes de limpar estado para evitar dados antigos
      await utils.vendas.listByFormando.invalidate({ formandoId });
      await utils.vendas.list.invalidate();
      setEditandoVenda(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar venda: ${error.message}`);
    },
  });
  
  // Mutation para deletar venda
  const deleteVendaMutation = trpc.vendas.delete.useMutation({
    onSuccess: () => {
      toast.success("Venda excluída com sucesso!");
      utils.vendas.listByFormando.invalidate({ formandoId });
    },
    onError: (error) => {
      toast.error(`Erro ao excluir venda: ${error.message}`);
    },
  });
  
  const resetForm = () => {
    setDataVenda(new Date().toISOString().split("T")[0]);
    setItensVenda([]);
    setPagamentos([]);
    setEditandoVenda(null);
  };
  
  // Agrupar produtos por categoria
  const produtosPorCategoria = produtos?.reduce((acc: any, produto) => {
    const categoria = (produto as any).categoria || "Outros";
    if (!acc[categoria]) acc[categoria] = [];
    acc[categoria].push(produto);
    return acc;
  }, {}) || {};
  
  const adicionarItem = (produto: any) => {
    const itemExistente = itensVenda.find((i) => i.produtoId === produto.id);
    if (itemExistente) {
      setItensVenda(
        itensVenda.map((i) =>
          i.produtoId === produto.id
            ? { ...i, quantidade: i.quantidade + 1 }
            : i
        )
      );
    } else {
      setItensVenda([
        ...itensVenda,
        {
          produtoId: produto.id,
          produto: produto.nome,
          categoria: (produto as any).categoria,
          quantidade: 1,
          valorUnitario: produto.preco,
          ajusteValor: 0,
          justificativa: "",
        },
      ]);
    }
  };
  
  const removerItem = (produtoId: number) => {
    setItensVenda(itensVenda.filter((i) => i.produtoId !== produtoId));
  };
  
  const adicionarPagamento = () => {
    setPagamentos([
      ...pagamentos,
      {
        tipo: "pix",
        valor: 0,
        bandeira: "",
        parcelas: 1,
        cvNsu: "",
      },
    ]);
  };
  
  const removerPagamento = (index: number) => {
    setPagamentos(pagamentos.filter((_, i) => i !== index));
  };
  
  const calcularTotal = () => {
    return itensVenda.reduce(
      (sum, item) =>
        sum + item.valorUnitario * item.quantidade + (item.ajusteValor || 0),
      0
    );
  };
  
  const calcularTotalPagamentos = () => {
    return pagamentos.reduce((sum, pag) => sum + (pag.valor || 0), 0);
  };
  
  const handleSalvar = () => {
    if (itensVenda.length === 0) {
      toast.error("Adicione pelo menos um produto");
      return;
    }
    
    if (pagamentos.length === 0) {
      toast.error("Adicione pelo menos uma forma de pagamento");
      return;
    }
    
    const total = calcularTotal();
    const totalPagamentos = calcularTotalPagamentos();
    
    if (Math.abs(total - totalPagamentos) > 1) {
      toast.error(
        `Total de pagamentos (${formatCurrency(totalPagamentos)}) diferente do total da venda (${formatCurrency(total)})`
      );
      return;
    }
    
    if (editandoVenda) {
      updateVendaMutation.mutate({
        id: editandoVenda.id,
        itens: itensVenda,
        pagamentos,
      });
    } else {
      createVendaMutation.mutate({
        eventoId,
        agendamentoId,
        formandoId,
        dataVenda: new Date(dataVenda),
        itens: itensVenda,
        pagamentos,
      });
    }
  };
  
  // Carregar dados da venda ao editar
  useEffect(() => {
    if (editandoVenda) {
      setItensVenda(editandoVenda.itens || []);
      setPagamentos(editandoVenda.pagamentos || []);
      setDataVenda(
        new Date(editandoVenda.dataVenda).toISOString().split("T")[0]
      );
    }
  }, [editandoVenda]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-500" />
            {editandoVenda ? "Editar Venda" : "Nova Venda"} - {formandoNome}
          </DialogTitle>
        </DialogHeader>
        
        {/* Histórico de Vendas */}
        {historicoVendas && historicoVendas.length > 0 && !editandoVenda && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border">
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Histórico de Vendas ({historicoVendas.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {historicoVendas.map((venda: any) => (
                <div
                  key={venda.id}
                  className="flex items-center justify-between text-xs p-2 bg-white rounded border hover:bg-slate-50"
                >
                  <div className="flex-1">
                    <span className="font-medium">
                      {new Date(venda.dataVenda).toLocaleDateString("pt-BR")}
                    </span>
                    {venda.itens && venda.itens.length > 0 && (
                      <span className="text-slate-400 ml-2">
                        ({venda.itens.map((i: any) => i.produto).join(", ")})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(venda.valorTotal || 0)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setEditandoVenda(venda)}
                      title="Editar venda"
                    >
                      <Edit className="h-3 w-3 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        const motivo = prompt("Por favor, informe o motivo da exclusão:");
                        if (motivo !== null && motivo.trim() !== "") {
                          deleteVendaMutation.mutate({ id: venda.id, motivoExclusao: motivo });
                        } else if (motivo !== null) {
                          alert("É obrigatório informar o motivo da exclusão.");
                        }
                      }}
                      title="Excluir venda"
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Campo Data da Venda */}
        <div className="mb-4">
          <Label className="text-sm font-medium">Data da Venda</Label>
          <Input
            type="date"
            value={dataVenda}
            onChange={(e) => setDataVenda(e.target.value)}
            className="w-48 mt-1"
          />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Produtos por Categoria */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Produtos</h3>
            {Object.entries(produtosPorCategoria).map(([categoria, prods]) => (
              <div key={categoria} className="space-y-2">
                <h4 className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {categoria}
                </h4>
                <div className="grid gap-2">
                  {(prods as any[]).map((produto) => (
                    <Button
                      key={produto.id}
                      variant="outline"
                      size="sm"
                      onClick={() => adicionarItem(produto)}
                      className="justify-between h-auto py-2"
                    >
                      <span className="text-left flex-1">{produto.nome}</span>
                      <span className="text-emerald-600 font-semibold ml-2">
                        {formatCurrency(produto.preco)}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Itens da Venda */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Itens da Venda</h3>
            {itensVenda.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Selecione produtos à esquerda
              </p>
            ) : (
              <div className="space-y-2">
                {itensVenda.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg bg-slate-50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{item.produto}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removerItem(item.produtoId)}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={(e) =>
                            setItensVenda(
                              itensVenda.map((i, idx) =>
                                idx === index
                                  ? {
                                      ...i,
                                      quantidade: parseInt(e.target.value) || 1,
                                    }
                                  : i
                              )
                            )
                          }
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Valor Unit.</Label>
                        <Input
                          type="number"
                          value={item.valorUnitario / 100}
                          onChange={(e) =>
                            setItensVenda(
                              itensVenda.map((i, idx) =>
                                idx === index
                                  ? {
                                      ...i,
                                      valorUnitario:
                                        parseFloat(e.target.value) * 100 || 0,
                                    }
                                  : i
                              )
                            )
                          }
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-emerald-600">
                      Subtotal:{" "}
                      {formatCurrency(item.valorUnitario * item.quantidade)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span className="text-emerald-600">
                  {formatCurrency(calcularTotal())}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Pagamentos */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Formas de Pagamento</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={adicionarPagamento}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
          
          {pagamentos.map((pag, index) => (
            <div key={index} className="p-3 border rounded-lg bg-slate-50">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={pag.tipo}
                    onValueChange={(value) =>
                      setPagamentos(
                        pagamentos.map((p, idx) =>
                          idx === index ? { ...p, tipo: value, valor: value === "incluso_contrato" ? 0 : p.valor } : p
                        )
                      )
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="debito">Débito</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                      <SelectItem value="plataforma">Plataforma</SelectItem>
                      <SelectItem value="incluso_contrato">Incluso no Contrato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pag.tipo === "incluso_contrato" ? 0 : pag.valor / 100}
                    disabled={pag.tipo === "incluso_contrato"}
                    onChange={(e) =>
                      setPagamentos(
                        pagamentos.map((p, idx) =>
                          idx === index
                            ? {
                                ...p,
                                valor: parseFloat(e.target.value) * 100 || 0,
                              }
                            : p
                        )
                      )
                    }
                    className="h-8"
                  />
                </div>
                
                {(pag.tipo === "credito" || pag.tipo === "debito") && (
                  <>
                    <div>
                      <Label className="text-xs">Bandeira</Label>
                      <Select
                        value={pag.bandeira}
                        onValueChange={(value) =>
                          setPagamentos(
                            pagamentos.map((p, idx) =>
                              idx === index ? { ...p, bandeira: value } : p
                            )
                          )
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VISA">Visa</SelectItem>
                          <SelectItem value="MASTERCARD">Mastercard</SelectItem>
                          <SelectItem value="ELO">Elo</SelectItem>
                          <SelectItem value="AMEX">Amex</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {pag.tipo === "credito" && (
                      <div>
                        <Label className="text-xs">Parcelas</Label>
                        <Input
                          type="number"
                          min="1"
                          max="4"
                          value={pag.parcelas}
                          onChange={(e) =>
                            setPagamentos(
                              pagamentos.map((p, idx) =>
                                idx === index
                                  ? {
                                      ...p,
                                      parcelas: parseInt(e.target.value) || 1,
                                    }
                                  : p
                              )
                            )
                          }
                          className="h-8"
                        />
                      </div>
                    )}
                  </>
                )}
                
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removerPagamento(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {pagamentos.length > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span>Total Pagamentos:</span>
              <span
                className={
                  Math.abs(calcularTotal() - calcularTotalPagamentos()) > 1
                    ? "text-red-600 font-semibold"
                    : "text-emerald-600 font-semibold"
                }
              >
                {formatCurrency(calcularTotalPagamentos())}
              </span>
            </div>
          )}
        </div>
        
        {/* Botões de Ação */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={
              createVendaMutation.isPending || updateVendaMutation.isPending
            }
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {editandoVenda ? "Atualizar" : "Finalizar Venda"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
