import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, DollarSign, FileSearch } from "lucide-react";
import FechamentoDiario from "./FechamentoDiario";
import FechamentosMensais from "./FechamentosMensais";
import Auditoria from "./Auditoria";

export default function Financeiro() {
  const [abaAtiva, setAbaAtiva] = useState("diario");

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground mt-2">
          Gestão financeira e controles do sistema
        </p>
      </div>

      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="diario" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Fechamento Diário
          </TabsTrigger>
          <TabsTrigger value="mensal" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Fechamento Mensal
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="flex items-center gap-2">
            <FileSearch className="h-4 w-4" />
            Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diario">
          <FechamentoDiario />
        </TabsContent>

        <TabsContent value="mensal">
          <FechamentosMensais />
        </TabsContent>

        <TabsContent value="auditoria">
          <Auditoria />
        </TabsContent>
      </Tabs>
    </div>
  );
}
