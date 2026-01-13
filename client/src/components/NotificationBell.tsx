import { Bell, Check, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useLocation } from "wouter";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Buscar notificações (últimas 10)
  const { data: notificacoes = [] } = trpc.notificacoes.list.useQuery(
    { limit: 10 },
    { refetchInterval: 30000 } // Atualizar a cada 30 segundos
  );

  // Contar não lidas
  const { data: countNaoLidas = 0 } = trpc.notificacoes.countNaoLidas.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

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
      setIsOpen(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deletarNotificacao.mutate({ id });
  };

  const handleMarcarTodasLidas = () => {
    marcarTodasLidas.mutate();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg hover:bg-slate-800"
        >
          <Bell className="h-5 w-5 text-slate-300" />
          {countNaoLidas > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {countNaoLidas > 9 ? "9+" : countNaoLidas}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] p-0">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {countNaoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarcarTodasLidas}
              className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Lista de notificações */}
        <div className="max-h-[500px] overflow-y-auto">
          {notificacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-12 w-12 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Nenhuma notificação</p>
            </div>
          ) : (
            notificacoes.map((notificacao) => (
              <div
                key={notificacao.id}
                onClick={() => handleNotificationClick(notificacao)}
                className={`relative border-b px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 ${
                  !notificacao.lida ? "bg-slate-50" : "bg-white"
                }`}
              >
                {/* Botão deletar no canto superior direito */}
                <button
                  onClick={(e) => handleDelete(e, notificacao.id)}
                  className="absolute top-3 right-3 p-1 rounded hover:bg-slate-200 transition-colors"
                  title="Excluir notificação"
                >
                  <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                </button>

                {/* Conteúdo da notificação */}
                <div className="pr-8">
                  <h4 className="font-medium text-sm text-slate-900 mb-1">
                    {notificacao.titulo}
                  </h4>
                  <p className="text-xs text-slate-600 mb-2">
                    {notificacao.mensagem}
                  </p>
                  
                  {/* Linha inferior com tempo e status de lida */}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {formatDistanceToNow(new Date(notificacao.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                    {notificacao.lida && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Check className="h-3 w-3" />
                        <span>Lido</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé */}
        {notificacoes.length > 0 && (
          <div className="border-t px-4 py-2 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLocation("/notificacoes");
                setIsOpen(false);
              }}
              className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              Ver todas as notificações
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
