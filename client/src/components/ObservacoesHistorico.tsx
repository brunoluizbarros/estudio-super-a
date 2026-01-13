import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquarePlus, User, Clock } from "lucide-react";
import { parseObservacoes, formatarTimestamp, type ObservacoesJSON } from "../../../shared/observacoes";

interface ObservacoesHistoricoProps {
  observacoesJSON: string | null;
  onAdicionar: (texto: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  maxHeight?: string;
}

export function ObservacoesHistorico({
  observacoesJSON,
  onAdicionar,
  disabled = false,
  placeholder = "Digite sua observação...",
  maxHeight = "400px",
}: ObservacoesHistoricoProps) {
  const [novaObservacao, setNovaObservacao] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const observacoes = parseObservacoes(observacoesJSON);

  const handleAdicionar = async () => {
    if (!novaObservacao.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAdicionar(novaObservacao.trim());
      setNovaObservacao("");
    } catch (error) {
      console.error("Erro ao adicionar observação:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Histórico de Observações */}
      {observacoes.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            Histórico de Observações
          </h4>
          <ScrollArea style={{ maxHeight }} className="pr-4">
            <div className="space-y-3">
              {observacoes.map((obs, index) => (
                <div
                  key={index}
                  className="border-l-2 border-blue-200 pl-3 py-2 bg-slate-50 rounded-r"
                >
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-1">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="font-medium">{obs.usuario}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatarTimestamp(obs.timestamp)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{obs.texto}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Campo para Nova Observação */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          {observacoes.length > 0 ? "Adicionar Nova Observação" : "Observações"}
        </label>
        <Textarea
          value={novaObservacao}
          onChange={(e) => setNovaObservacao(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleAdicionar}
            disabled={!novaObservacao.trim() || disabled || isSubmitting}
            size="sm"
          >
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            {isSubmitting ? "Adicionando..." : "Adicionar Observação"}
          </Button>
        </div>
      </div>
    </div>
  );
}
