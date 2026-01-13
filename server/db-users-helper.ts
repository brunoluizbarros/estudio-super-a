import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Busca usuários por role
 */
export async function getUsersByRole(role: string) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(users)
    .where(eq(users.role, role as any));
  
  return result;
}

/**
 * Busca todos os gestores (role = "gestor")
 */
export async function getGestores() {
  return getUsersByRole('gestor');
}

/**
 * Busca todos os administradores (role = "administrador")
 */
export async function getAdministradores() {
  return getUsersByRole('administrador');
}

/**
 * Busca usuário por ID
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

/**
 * Busca todos os usuários
 */
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(users);
  return result;
}
