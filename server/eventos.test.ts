import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Eventos', () => {
  it('deve retornar eventos da turma 1061', async () => {
    const eventos = await db.getEventosByTurma(1061);
    console.log('Eventos da turma 1061:', eventos.length);
    eventos.forEach(e => {
      console.log('  -', e.id, e.turmaId, e.tipoEvento, e.dataEvento);
    });
    expect(eventos).toBeDefined();
  });
  
  it('deve retornar eventos com dataEvento da turma 1061', async () => {
    const eventos = await db.getEventosByTurma(1061);
    const eventosComData = eventos.filter(e => e.dataEvento);
    console.log('Eventos com dataEvento:', eventosComData.length);
    eventosComData.forEach(e => {
      console.log('  -', e.id, e.turmaId, e.tipoEvento, e.dataEvento);
    });
    expect(eventosComData.length).toBeGreaterThan(0);
  });
});
