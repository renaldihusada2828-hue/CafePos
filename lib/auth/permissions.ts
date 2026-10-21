import type { UserRole } from "@/types/database";

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

export function isCashier(role: UserRole | null | undefined): boolean {
  return role === "cashier";
}

export function canAccessPOS(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "cashier";
}

export function canManageProducts(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

export function canManageInventory(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

export function canManageRecipes(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

export function canManageUsers(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

export function canViewReports(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

export function canVoidSales(role: UserRole | null | undefined): boolean {
  return role === "admin";
}
