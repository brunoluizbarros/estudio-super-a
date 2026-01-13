# Configuração do Cron Job - Lembretes de Eventos

Este documento explica como configurar o sistema de lembretes automáticos de eventos.

## 📋 **O que faz:**

O script `server/cron-lembretes-eventos.ts` envia notificações in-app para o setor Financeiro:
- **5 dias antes** do primeiro dia do evento
- **2 dias antes** do primeiro dia do evento

## ⏰ **Horário de Execução:**

Diariamente às **07:00 (horário de Recife/PE - UTC-3)**

---

## 🚀 **Opção 1: Usar o Manus Schedule (Recomendado)**

O Manus possui um sistema de agendamento integrado que pode executar tarefas automaticamente.

### Passos:

1. Acesse o painel de agendamento do Manus
2. Crie uma nova tarefa agendada com:
   - **Nome:** Lembretes de Eventos
   - **Tipo:** Cron
   - **Expressão Cron:** `0 10 * * *` (10:00 UTC = 07:00 UTC-3)
   - **Comando:** `cd /home/ubuntu/estudio-super-a && pnpm tsx server/cron-lembretes-eventos.ts`

---

## 🖥️ **Opção 2: Usar Crontab do Sistema (Servidor Próprio)**

Se você estiver hospedando em servidor próprio, pode usar o crontab do Linux.

### Passos:

1. Abra o crontab:
```bash
crontab -e
```

2. Adicione a seguinte linha:
```bash
# Lembretes de eventos - Diariamente às 07:00 (Recife/PE)
0 10 * * * cd /home/ubuntu/estudio-super-a && pnpm tsx server/cron-lembretes-eventos.ts >> /home/ubuntu/logs/lembretes-eventos.log 2>&1
```

**Nota:** `0 10 * * *` significa 10:00 UTC, que equivale a 07:00 UTC-3 (Recife).

3. Salve e feche o editor

4. Verifique se o cron foi adicionado:
```bash
crontab -l
```

---

## 🧪 **Testar Manualmente:**

Para testar o script sem esperar o horário agendado:

```bash
cd /home/ubuntu/estudio-super-a
pnpm tsx server/cron-lembretes-eventos.ts
```

Verifique os logs no console para confirmar que as notificações foram enviadas.

---

## 📝 **Logs:**

Os logs do script aparecem no console com o prefixo `[Lembretes]`:

```
[Lembretes] Iniciando verificação de eventos - 2025-12-23T10:00:00.000Z
[Lembretes] Eventos em 5 dias: 2
[Lembretes] Notificação enviada (5 dias): Evento 123
[Lembretes] Eventos em 2 dias: 1
[Lembretes] Notificação enviada (2 dias): Evento 456
[Lembretes] Verificação concluída com sucesso
```

---

## ⚠️ **Importante:**

1. **Timezone:** O servidor deve estar configurado para UTC ou você deve ajustar o horário do cron conforme o timezone do servidor.

2. **Role Financeiro:** Atualmente, as notificações são enviadas para usuários com `role="financeiro"` ou `role="administrador"`. Se você criar um role específico "financeiro", atualize a função `notificarFinanceiro` em `server/db-notificacoes-helper.ts`.

3. **Eventos sem data:** Eventos sem `dataEvento` definida são ignorados automaticamente.

4. **Eventos com múltiplos dias:** O sistema considera apenas o **primeiro dia** do evento (`dataEvento`), ignorando `dataEventoFim`.

---

## 🔧 **Troubleshooting:**

### O script não está executando:
- Verifique se o cron está ativo: `systemctl status cron`
- Verifique os logs do cron: `grep CRON /var/log/syslog`

### Notificações não aparecem:
- Execute o script manualmente e verifique os logs
- Confirme que existem eventos nas datas corretas (5 ou 2 dias no futuro)
- Verifique se existem usuários com role "financeiro" ou "administrador"

### Erro de permissão:
- Certifique-se de que o usuário do cron tem permissão para acessar o diretório do projeto
- Verifique as variáveis de ambiente (DATABASE_URL, etc.)
