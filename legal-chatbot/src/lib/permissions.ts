import { Profile } from './supabase'

export type UserRole = 'admin' | 'editor' | 'user'

export type Permission = 
  | 'view_laws'
  | 'upload_laws'
  | 'edit_laws'
  | 'delete_laws'
  | 'view_all_queries'
  | 'view_own_queries'
  | 'manage_users'
  | 'manage_roles'
  | 'ban_users'
  | 'manage_backups'
  | 'view_system_logs'
  | 'manage_system'

/**
 * Permission mapping for each role
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'view_laws',
    'upload_laws',
    'edit_laws',
    'delete_laws',
    'view_all_queries',
    'view_own_queries',
    'manage_users',
    'manage_roles',
    'ban_users',
    'manage_backups',
    'view_system_logs',
    'manage_system',
  ],
  editor: [
    'view_laws',
    'upload_laws',
    'edit_laws',
    'view_all_queries',
    'view_own_queries',
  ],
  user: [
    'view_laws',
    'view_own_queries',
  ],
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(profile: Profile | null, permission: Permission): boolean {
  if (!profile || !profile.role) {
    return false
  }
  
  const role = profile.role as UserRole
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/**
 * Check if user is admin
 */
export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === 'admin'
}

/**
 * Check if user is editor
 */
export function isEditor(profile: Profile | null): boolean {
  return profile?.role === 'editor'
}

/**
 * Check if user is admin or editor
 */
export function isAdminOrEditor(profile: Profile | null): boolean {
  return isAdmin(profile) || isEditor(profile)
}

/**
 * Check if user can manage laws (admin or editor)
 */
export function canManageLaws(profile: Profile | null): boolean {
  return hasPermission(profile, 'upload_laws') || hasPermission(profile, 'edit_laws')
}

/**
 * Check if user can delete laws (only admin)
 */
export function canDeleteLaws(profile: Profile | null): boolean {
  return hasPermission(profile, 'delete_laws')
}

/**
 * Check if user can manage users (only admin)
 */
export function canManageUsers(profile: Profile | null): boolean {
  return hasPermission(profile, 'manage_users')
}

/**
 * Get role display name in Vietnamese
 */
export function getRoleDisplayName(role: UserRole | string): string {
  const roleMap: Record<UserRole, string> = {
    admin: 'Quản trị viên',
    editor: 'Biên tập viên',
    user: 'Người dùng',
  }
  return roleMap[role as UserRole] || role
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: UserRole | string): string {
  const colorMap: Record<UserRole, string> = {
    admin: 'bg-red-600 text-white',
    editor: 'bg-blue-600 text-white',
    user: 'bg-gray-600 text-white',
  }
  return colorMap[role as UserRole] || 'bg-gray-600 text-white'
}

