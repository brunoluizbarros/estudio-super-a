import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/_core/hooks/useAuth";
import { Trash2, Plus, Download, FileText, FileSpreadsheet, Loader2, AlertTriangle } from "lucide-react";

interface ObservationEntry {
  timestamp: string;
  userName: string;
  text: string;
  isCritical?: boolean; // Marcador de observação crítica
}

interface ObservationFieldProps {
  value: string; // String serializada com todas as observações
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  isSaving?: boolean; // Indicador de salvamento em progresso
  onCriticalObservation?: (observation: { timestamp: string; userName: string; text: string }) => void; // Callback para observações críticas
}

/**
 * Componente de campo de observações com registro automático
 * Formato: [DD/MM/YYYY HH:MM - Nome do Usuário] Texto da observação
 * 
 * Regras:
 * - Novas observações são sempre adicionadas ao final (append-only)
 * - Usuários comuns podem apenas adicionar novas observações
 * - Apenas administradores podem editar/excluir observações existentes
 */
export function ObservationField({
  value,
  onChange,
  label = "Observações",
  placeholder = "Digite sua observação...",
  disabled = false,
  isSaving = false,
  onCriticalObservation,
}: ObservationFieldProps) {
  const { user } = useAuth();
  const [newObservation, setNewObservation] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  // Parse observações existentes
  const parseObservations = (text: string): ObservationEntry[] => {
    if (!text || text.trim() === "") return [];
    
    const entries: ObservationEntry[] = [];
    // Regex corrigida: captura cada observação até encontrar outra ou fim da string
    // Formato: [DD/MM/YYYY HH:MM - Nome] [CRITICA] Texto ou [DD/MM/YYYY HH:MM - Nome] Texto
    const regex = /\[(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}) - ([^\]]+)\]\s*(\[CRITICA\])?\s*([\s\S]+?)(?=\n\[|$)/gm;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      entries.push({
        timestamp: match[1],
        userName: match[2],
        isCritical: !!match[3],
        text: match[4].trim(),
      });
    }
    
    return entries;
  };

  // Serializar observações para string
  const serializeObservations = (entries: ObservationEntry[]): string => {
    return entries.map(e => {
      const criticalTag = e.isCritical ? " [CRITICA]" : "";
      return `[${e.timestamp} - ${e.userName}]${criticalTag} ${e.text}`;
    }).join("\n");
  };

  const observations = parseObservations(value);
  const isAdmin = user?.role === "administrador";

  // Filtrar observações por busca
  const filteredObservations = useMemo(() => {
    if (!searchQuery.trim()) return observations;
    const query = searchQuery.toLowerCase();
    return observations.filter(obs => 
      obs.text.toLowerCase().includes(query) ||
      obs.userName.toLowerCase().includes(query) ||
      obs.timestamp.includes(query)
    );
  }, [observations, searchQuery]);

  // Adicionar nova observação
  const handleAddObservation = async () => {
    if (!newObservation.trim() || !user) return;

    setIsAdding(true);
    
    // Simula pequeno delay para feedback visual
    await new Promise(resolve => setTimeout(resolve, 300));

    const now = new Date();
    const timestamp = now.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const newEntry: ObservationEntry = {
      timestamp,
      userName: user.name || "Usuário",
      text: newObservation.trim(),
      isCritical,
    };

    const updatedObservations = [...observations, newEntry];
    const serialized = serializeObservations(updatedObservations);
    console.log("[DEBUG ObservationField] Chamando onChange com:", serialized);
    onChange(serialized);
    
    // Chamar callback se for observação crítica
    if (isCritical && onCriticalObservation) {
      onCriticalObservation({
        timestamp,
        userName: user.name || "Usuário",
        text: newObservation.trim(),
      });
    }
    
    setNewObservation("");
    setIsCritical(false);
    setIsAdding(false);
  };

  // Remover observação (apenas admin)
  const handleRemoveObservation = (index: number) => {
    if (!isAdmin) return;
    
    const updatedObservations = observations.filter((_, i) => i !== index);
    onChange(serializeObservations(updatedObservations));
  };

  // Exportar para Excel (CSV)
  const handleExportExcel = () => {
    if (observations.length === 0) return;
    
    const csvContent = [
      ["Data/Hora", "Usuário", "Observação"],
      ...observations.map(obs => [obs.timestamp, obs.userName, obs.text])
    ].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `observacoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Exportar para PDF (texto formatado)
  const handleExportPDF = () => {
    if (observations.length === 0) return;
    
    const content = observations.map(obs => 
      `[${obs.timestamp} - ${obs.userName}]\n${obs.text}\n`
    ).join("\n");
    
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `observacoes_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>

      {/* Campo para nova observação */}
      <div className="space-y-2">
        <Textarea
          value={newObservation}
          onChange={(e) => setNewObservation(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[80px] resize-none"
        />
        
        {/* Checkbox de observação crítica */}
        {onCriticalObservation && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="critical-observation"
              checked={isCritical}
              onCheckedChange={(checked) => setIsCritical(checked as boolean)}
              disabled={disabled || isAdding || isSaving}
            />
            <Label
              htmlFor="critical-observation"
              className="text-sm font-normal cursor-pointer flex items-center gap-1"
            >
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Marcar como crítica (enviar notificação por email)
            </Label>
          </div>
        )}
        
        <Button
          type="button"
          onClick={handleAddObservation}
          disabled={!newObservation.trim() || disabled || isAdding || isSaving}
          size="sm"
          className="w-full sm:w-auto"
        >
          {isAdding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adicionando...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Observação
            </>
          )}
        </Button>
        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Salvando alterações...</span>
          </div>
        )}
      </div>

      {/* Histórico de observações */}
      {observations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Label className="text-xs text-muted-foreground">Histórico</Label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-[150px] text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={observations.length === 0}
                className="h-8 px-2"
                title="Exportar para Excel"
              >
                <FileSpreadsheet className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={observations.length === 0}
                className="h-8 px-2"
                title="Exportar para TXT"
              >
                <FileText className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {filteredObservations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma observação encontrada</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredObservations.map((obs, index) => (
                <Card key={index} className={`p-3 ${obs.isCritical ? 'bg-amber-50 border-amber-200' : 'bg-muted/50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                      <span>{obs.timestamp} - {obs.userName}</span>
                      {obs.isCritical && (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-xs font-semibold">
                          <AlertTriangle className="h-3 w-3" />
                          CRÍTICA
                        </span>
                      )}
                    </div>
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {obs.text}
                    </div>
                  </div>
                  {isAdmin && !disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveObservation(index)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
