import { Bell, Check, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Notificacoes() {
  const [, setLocation] = useLocation();
  const [filtroStatus, setFiltroStatus] = useState<"todas" | "lidas" | "nao_lidas">("todas");
  const utils = trpc.useUtils();

  // Buscar todas as notificações
  const { data: todasNotificacoes = [], isLoading } = trpc.notificacoes.list.useQuery({});

  // Filtrar notificações
  const notificacoes = todasNotificacoes.filter((n) => {
    if (filtroStatus === "lidas") return n.lida;
    if (filtroStatus === "nao_lidas") return !n.lida;
    return true;
  });

  // Marcar como lida
  const marcarLida = trpc.notificacoes.marcarLida.useMutation({
    onSuccess: () => {
      utils.notificacoes.list.invalidate();
      utils.notificacoes.countNaoLidas.invalidate();
    },
  });

  // Marcar todas como lidas
  const marcarTodasLidas = trpc.notificacoes.marcarTodasLidas.useMutation({
    onSuccess: () => {
      utils.notificacoes.list.invalidate();
      utils.notificacoes.countNaoLidas.invalidate();
    },
  });

  // Deletar notificação
  const deletarNotificacao = trpc.notificacoes.delete.useMutation({
    onSuccess: () => {
      utils.notificacoes.list.invalidate();
      utils.notificacoes.countNaoLidas.invalidate();
    },
  });

  const handleNotificationClick = (notificacao: typeof notificacoes[0]) => {
    // Marcar como lida
    if (!notificacao.lida) {
      marcarLida.mutate({ id: notificacao.id });
    }

    // Redirecionar para a despesa se houver despesaId
    if (notificacao.despesaId) {
      setLocation(`/despesas?id=${notificacao.despesaId}`);
    }
  };

  const handleDelete = (id: number) => {
    deletarNotificacao.mutate({ id });
  };

  const handleMarcarTodasLidas = () => {
    marcarTodasLidas.mutate();
  };

  const countNaoLidas = todasNotificacoes.filter((n) => !n.lida).length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notificações</h1>
          <p className="text-sm text-slate-500 mt-1">
            {countNaoLidas > 0
              ? `Você tem ${countNaoLidas} notificação${countNaoLidas > 1 ? "ões" : ""} não lida${countNaoLidas > 1 ? "s" : ""}`
              : "Nenhuma notificação não lida"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filtro */}
          <Select value={filtroStatus} onValueChange={(v: any) => setFiltroStatus(v)}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="nao_lidas">Não lidas</SelectItem>
              <SelectItem value="lidas">Lidas</SelectItem>
            </SelectContent>
          </Select>

          {countNaoLidas > 0 && (
            <Button
              onClick={handleMarcarTodasLidas}
              variant="outline"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Check className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {/* Lista de notificações */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : notificacoes.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Bell className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {filtroStatus === "todas"
                ? "Nenhuma notificação"
                : filtroStatus === "lidas"
                ? "Nenhuma notificação lida"
                : "Nenhuma notificação não lida"}
            </h3>
            <p className="text-sm text-slate-500">
              {filtroStatus === "todas"
                ? "Você não tem notificações no momento"
                : filtroStatus === "lidas"
                ? "Você não tem notificações lidas"
                : "Você não tem notificações não lidas"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {notificacoes.map((notificacao) => (
            <Card
              key={notificacao.id}
              onClick={() => handleNotificationClick(notificacao)}
              className={`relative p-4 cursor-pointer transition-all hover:shadow-md ${
                !notificacao.lida ? "bg-blue-50 border-blue-200" : "bg-white"
              }`}
            >
              {/* Botão deletar no canto superior direito */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(notificacao.id);
                }}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-200 transition-colors"
                title="Excluir notificação"
              >
                <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
              </button>

              {/* Conteúdo da notificação */}
              <div className="pr-12">
                <h3 className="font-semibold text-slate-900 mb-2">
                  {notificacao.titulo}
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  {notificacao.mensagem}
                </p>

                {/* Linha inferior com tempo e status de lida */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {formatDistanceToNow(new Date(notificacao.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                  {notificacao.lida && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Check className="h-3.5 w-3.5" />
                      <span>Lido</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
