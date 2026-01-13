# Agendamento Automático - Despesas de Maquiadoras

## 📋 Descrição

Script automatizado que cria despesas mensais para maquiadoras no primeiro dia de cada mês às 07:00 (horário de Recife/PE - UTC-3).

## 🎯 Funcionalidade

- **Execução**: Todo dia 1º de cada mês às 07:00
- **Processamento**: Serviços de maquiagem do mês anterior
- **Criação**: Uma despesa para cada combinação maquiadora + turma
- **Notificações**: Sino (in-app) + E-mail para Logística, Gestor e Administrador

## 📊 Lógica de Cálculo

Para cada maquiadora em cada turma:

```
Valor da Despesa = Total a Pagar - Total a Receber
```

Onde:
- **Total a Pagar**: Soma de todos os serviços "Make Formando" da maquiadora naquela turma
- **Total a Receber**: Soma de todos os serviços "Make Família" da maquiadora naquela turma

## 📝 Campos da Despesa Criada

- **Tipo de Despesa**: Operacional
- **Mês do Serviço**: Mês anterior (ex: Dezembro se executar em 01/Janeiro)
- **Setor Solicitante**: Estúdio
- **Fornecedor**: Nome da maquiadora
- **Turma**: Turma específica vinculada
- **Detalhamento**: "Serviço de Maquiagem referente ao mês de [Nome do Mês]"
- **Tipo de Pagamento**: PIX
- **Dados para Pagamento**: Primeira chave PIX cadastrada do fornecedor
- **Status**: Aguardando Aprovação do Gestor
- **Número CI**: Gerado automaticamente (formato: 001/2025)

## 🔔 Notificações

### In-App (Sino)
- Enviado para usuários com roles: **Logística**, **Gestor** e **Administrador**
- Título: "Despesas de Maquiadoras - [Mês]"
- Mensagem: "[N] despesa(s) de maquiagem foram criadas automaticamente..."

### E-mail
- Destinatários: **Logística**, **Gestor** e **Administrador**
- Assunto: "Despesas de Maquiadoras - [Mês]"
- Conteúdo: Total de despesas criadas e link para revisão

## 🚀 Configuração do Cron Job

### Opção 1: Crontab do Sistema (Recomendado para Produção)

```bash
# Editar crontab
crontab -e

# Adicionar linha (executa dia 1º de cada mês às 07:00 UTC-3)
0 10 1 * * cd /home/ubuntu/estudio-super-a && node --loader tsx server/cron-despesas-maquiadoras.ts >> /var/log/cron-despesas-maquiadoras.log 2>&1
```

**Nota**: O horário no cron é em UTC. Para executar às 07:00 em Recife/PE (UTC-3), configure para 10:00 UTC.

### Opção 2: PM2 (Alternativa)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Criar arquivo de configuração PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'cron-despesas-maquiadoras',
    script: 'server/cron-despesas-maquiadoras.ts',
    cron_restart: '0 10 1 * *', // Dia 1º de cada mês às 10:00 UTC (07:00 Recife)
    autorestart: false,
    watch: false
  }]
};
EOF

# Iniciar com PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Opção 3: Node-Cron (Já Implementado no Servidor)

O script já está preparado para ser executado manualmente ou via cron externo. Para integração no servidor Express, adicione em `server/index.ts`:

```typescript
import cron from 'node-cron';
import { processarDespesasMaquiadoras } from './cron-despesas-maquiadoras.js';

// Agendar para dia 1º de cada mês às 07:00 (Recife/PE - UTC-3)
cron.schedule('0 10 1 * *', async () => {
  console.log('[CRON] Iniciando processamento de despesas de maquiadoras...');
  try {
    await processarDespesasMaquiadoras();
  } catch (error) {
    console.error('[CRON] Erro ao processar despesas:', error);
  }
}, {
  timezone: 'America/Recife'
});
```

## 🧪 Teste Manual

Para testar o script manualmente sem aguardar o agendamento:

```bash
cd /home/ubuntu/estudio-super-a
node --loader tsx server/cron-despesas-maquiadoras.ts
```

## 📂 Arquivos Relacionados

- **Script Principal**: `server/cron-despesas-maquiadoras.ts`
- **Funções de Banco**: `server/db.ts` (getServicosMaquiagemMesAnterior, createDespesaMaquiadora, getUsuariosByRoles)
- **Notificações**: `server/db-notificacoes.ts` (createNotificacao)
- **E-mail**: `server/_core/email.ts` (sendEmail)

## 📊 Logs

Os logs do script incluem:

- Mês/ano sendo processado
- Quantidade de serviços encontrados
- Quantidade de despesas criadas
- Detalhes de cada despesa (maquiadora, turma, valor)
- Erros (se houver)

Exemplo de log:

```
[CRON] Iniciando processamento de despesas de maquiadoras...
[CRON] Processando serviços de Dezembro/2024
[CRON] 45 serviços encontrados
[CRON] 12 despesas serão criadas
[CRON] Despesa criada: Maria Silva - Turma 820 - R$ 450.00
[CRON] Despesa criada: João Santos - Turma 902 - R$ 320.00
...
[CRON] 12 despesas criadas com sucesso
[CRON] Notificações enviadas para 5 usuários
[CRON] Processamento concluído com sucesso
```

## ⚠️ Observações Importantes

1. **Valores Positivos**: Apenas despesas com valor final positivo (há valor a pagar) são criadas
2. **Maquiadoras sem ID**: Serviços sem fornecedor/maquiadora vinculado são ignorados
3. **Serviços Válidos**: Apenas serviços do tipo "make_formando" e "make_familia" são processados
4. **Timezone**: Certifique-se de configurar o timezone correto (America/Recife) no cron
5. **Credenciais Gmail**: Verifique se as variáveis GMAIL_USER e GMAIL_APP_PASSWORD estão configuradas para envio de e-mails

## 🔧 Troubleshooting

### Script não executa no horário agendado
- Verifique se o cron está ativo: `systemctl status cron`
- Verifique logs do cron: `grep CRON /var/log/syslog`
- Confirme timezone do sistema: `timedatectl`

### Despesas não são criadas
- Execute manualmente para ver logs detalhados
- Verifique se existem serviços de maquiagem no mês anterior
- Confirme se as maquiadoras têm fornecedorId válido

### Notificações não são enviadas
- Verifique se existem usuários com roles Logística, Gestor ou Administrador
- Confirme credenciais do Gmail nas variáveis de ambiente
- Verifique logs de erro no console

## 📞 Suporte

Para dúvidas ou problemas, consulte os logs do sistema ou execute o script manualmente para diagnóstico detalhado.
