import { trpc } from "@/lib/trpc";

export default function DebugObservacoes() {
  const { data, isLoading } = trpc.eventos.debugObservacoes.useQuery();

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">DEBUG: Últimos 5 Eventos</h1>
      <div className="space-y-4">
        {data?.map((evento) => (
          <div key={evento.id} className="border p-4 rounded">
            <p><strong>ID:</strong> {evento.id}</p>
            <p><strong>Turma ID:</strong> {evento.turmaId}</p>
            <p><strong>Tipo:</strong> {evento.tipoEvento}</p>
            <p><strong>Observação:</strong> {evento.observacao || "(vazio)"}</p>
            <p><strong>Criado em:</strong> {new Date(evento.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
