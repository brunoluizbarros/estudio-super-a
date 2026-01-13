import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { User, Lock, ArrowRight } from "lucide-react";

export default function ClienteLogin() {
  const [, setLocation] = useLocation();
  const [cpf, setCpf] = useState("");
  const [codigoTurma, setCodigoTurma] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginCliente = trpc.cliente.login.useMutation({
    onSuccess: (data) => {
      if (data.success && data.formando) {
        // Salvar dados do cliente no sessionStorage
        sessionStorage.setItem("cliente", JSON.stringify(data.formando));
        sessionStorage.setItem("clienteTurma", JSON.stringify(data.formando.turma));
        toast.success(`Bem-vindo(a), ${data.formando.nome}!`);
        setLocation("/cliente/briefing");
      } else {
        toast.error(data.error || "CPF ou código da turma inválidos");
      }
      setIsLoading(false);
    },
    onError: (error) => {
      toast.error("Erro ao fazer login: " + error.message);
      setIsLoading(false);
    },
  });

  // Formatar CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) {
      toast.error("CPF deve ter 11 dígitos");
      return;
    }
    
    if (!codigoTurma.trim()) {
      toast.error("Informe o código da turma");
      return;
    }

    setIsLoading(true);
    loginCliente.mutate({ cpf: cpfLimpo, codigoTurma: codigoTurma.trim() });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src="/logo-estudio-supera.png" 
              alt="Estúdio Super A" 
              className="h-20 object-contain"
            />
          </div>
          <div>
            <CardTitle className="text-2xl">Área da Comissão</CardTitle>
            <CardDescription className="mt-2">
              Acesse para preencher o briefing do evento da sua turma
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="cpf" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                CPF
              </Label>
              <Input
                id="cpf"
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCPFChange}
                maxLength={14}
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigoTurma" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Código da Turma
              </Label>
              <Input
                id="codigoTurma"
                type="text"
                placeholder="Ex: 902"
                value={codigoTurma}
                onChange={(e) => setCodigoTurma(e.target.value)}
                className="text-lg"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-orange-500 hover:bg-orange-600"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                "Entrando..."
              ) : (
                <>
                  Entrar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Não sabe seu código da turma?</p>
            <p>Entre em contato com a comissão de formatura.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
