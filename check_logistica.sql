-- Verificar tipos de usuário
SELECT * FROM tipos_usuario WHERE nome LIKE '%ogist%';

-- Verificar permissões com role logistica
SELECT * FROM permissoes WHERE role = 'logistica';

-- Verificar se há usuários com role logistica
SELECT id, name, email, role, tipoUsuarioId FROM users WHERE role = 'logistica';
