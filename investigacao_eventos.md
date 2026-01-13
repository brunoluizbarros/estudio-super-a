# Investigação: Formulário de Eventos

## Problema Reportado
O formulário de eventos não estava carregando os dados salvos (cenários, fotógrafos) ao editar.

## Investigação
1. Verifiquei o código de carregamento no onOpenChange do Dialog
2. A lógica de carregamento está correta - faz JSON.parse dos campos cenarios, fotografos, etc.
3. Testei abrindo o modal de edição do evento 902

## Descobertas
- O modal está abrindo corretamente
- Os campos Turma, Tipo de Evento, Período e Local estão carregando corretamente
- Os campos de Cenários e Fotógrafos NÃO estão marcados (checkboxes não estão checked)
- O box de Maquiadoras foi adicionado e está funcionando

## Causa Provável
Os dados de cenarios, fotografos, cerimoniais, coordenadores, producao podem estar:
1. NULL no banco de dados (não foram salvos anteriormente)
2. Em formato diferente do esperado

## Próximos Passos
1. Verificar se os dados estão salvos no banco
2. Se não estiverem, o problema é no salvamento, não no carregamento
3. Testar salvando novos dados e verificando se são carregados

## Status
- [x] Box Maquiadora adicionado ao formulário
- [ ] Verificar se dados estão sendo salvos corretamente
- [ ] Adicionar scroll vertical ao modal
