# Configuração Gmail API para Notificações por E-mail

Este documento explica como configurar as credenciais do Google Workspace (Gmail API) para que o sistema possa enviar notificações automáticas por e-mail.

## Pré-requisitos

- Conta Google Workspace ativa (gestao@superaformaturas.com.br)
- Acesso ao Google Cloud Console
- Permissões de administrador no Workspace

---

## Passo 1: Criar Projeto no Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Faça login com sua conta Google Workspace
3. Clique em **"Select a project"** no topo → **"New Project"**
4. Nome do projeto: `Estudio Super A - Email Notifications`
5. Clique em **"Create"**

---

## Passo 2: Ativar Gmail API

1. No menu lateral, vá em: **APIs & Services** → **Library**
2. Busque por: `Gmail API`
3. Clique em **Gmail API** nos resultados
4. Clique no botão **"Enable"** (Ativar)

---

## Passo 3: Configurar OAuth Consent Screen

1. No menu lateral: **APIs & Services** → **OAuth consent screen**
2. Escolha: **Internal** (uso interno do Workspace)
3. Clique em **"Create"**

**Preencha os campos:**
- **App name**: `Estúdio Super A - Sistema de Gestão`
- **User support email**: `gestao@superaformaturas.com.br`
- **Developer contact email**: `gestao@superaformaturas.com.br`

4. Clique em **"Save and Continue"**

**Scopes (Escopos):**
5. Clique em **"Add or Remove Scopes"**
6. Busque e adicione: `https://www.googleapis.com/auth/gmail.send`
7. Clique em **"Update"** → **"Save and Continue"**

8. Na tela de resumo, clique em **"Back to Dashboard"**

---

## Passo 4: Criar Credenciais OAuth 2.0

1. No menu lateral: **APIs & Services** → **Credentials**
2. Clique em **"+ Create Credentials"** → **"OAuth client ID"**
3. Application type: **Desktop app**
4. Name: `Estudio Super A Email Service`
5. Clique em **"Create"**

**⚠️ IMPORTANTE:** Uma janela aparecerá com:
- **Client ID**: Algo como `123456789-abc...apps.googleusercontent.com`
- **Client Secret**: Algo como `GOCSPX-abc...`

**Copie e guarde esses valores!** Você precisará deles no próximo passo.

---

## Passo 5: Gerar Refresh Token

Agora você precisa gerar um **Refresh Token** usando suas credenciais.

### Opção A: Usar OAuth 2.0 Playground (Recomendado)

1. Acesse: https://developers.google.com/oauthplayground/
2. Clique no ícone de **engrenagem** (⚙️) no canto superior direito
3. Marque: **"Use your own OAuth credentials"**
4. Cole:
   - **OAuth Client ID**: (do Passo 4)
   - **OAuth Client Secret**: (do Passo 4)
5. Feche as configurações

**Autorizar:**
6. No lado esquerdo, em **"Step 1"**, busque: `Gmail API v1`
7. Expanda e marque: `https://www.googleapis.com/auth/gmail.send`
8. Clique em **"Authorize APIs"**
9. Faça login com: `gestao@superaformaturas.com.br`
10. Clique em **"Allow"** (Permitir)

**Obter Token:**
11. Clique em **"Exchange authorization code for tokens"**
12. Copie o **"Refresh token"** que aparece

---

## Passo 6: Configurar Variáveis de Ambiente no Sistema

Agora você tem 4 valores:

1. **GMAIL_USER**: `gestao@superaformaturas.com.br` (ou outro e-mail que você quer usar como remetente)
2. **GMAIL_CLIENT_ID**: (do Passo 4)
3. **GMAIL_CLIENT_SECRET**: (do Passo 4)
4. **GMAIL_REFRESH_TOKEN**: (do Passo 5)

**Você fornecerá esses valores quando eu solicitar via ferramenta de secrets.**

---

## Resumo dos Valores Necessários

```
GMAIL_USER=gestao@superaformaturas.com.br
GMAIL_CLIENT_ID=123456789-abc...apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-abc...
GMAIL_REFRESH_TOKEN=1//abc...
```

---

## Testando a Configuração

Após configurar as credenciais no sistema:

1. Crie uma nova despesa no sistema
2. Verifique se o gestor recebeu o e-mail de notificação
3. Se não receber, verifique os logs do servidor para erros

---

## Solução de Problemas

### Erro: "invalid_grant"
- O Refresh Token expirou ou é inválido
- Repita o Passo 5 para gerar um novo token

### Erro: "insufficient_permissions"
- Verifique se o scope `gmail.send` foi adicionado corretamente
- Repita os Passos 3 e 5

### E-mails não chegam
- Verifique a pasta de SPAM
- Confirme que o e-mail remetente está correto
- Verifique os logs do servidor

---

## Segurança

⚠️ **NUNCA compartilhe suas credenciais publicamente!**

- As credenciais são armazenadas de forma segura como variáveis de ambiente
- Apenas o servidor tem acesso a elas
- Os usuários finais nunca veem essas informações

---

## Suporte

Se tiver dúvidas durante a configuração, me avise no chat!
