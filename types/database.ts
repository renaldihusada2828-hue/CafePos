// MelekCafe POS — Database Types
// Mirrors the Supabase PostgreSQL schema exactly.

export type UserRole = "admin" | "cashier";
export type PaymentMethod = "cash" | "qris" | "transfer";
export type PaymentStatus = "paid" | "pending" | "cancelled";
export type SaleStatus = "completed" | "voided";
export type StockMovementType =
  | "sale"
  | "restock"
  | "adjustment"
  | "void_return"
  | "initial";

// profiles
export interface Profile {
  id: string;
  login_id: string;
  auth_email: string;
  role: UserRole;
  display_name: string;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

// products
export interface Product {
  id: string;
  name: string;
  category: string;
  price: string; // numeric comes as string from Supabase
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// raw_materials
export interface RawMaterial {
  id: string;
  name: string;
  base_unit: string;
  stock_quantity: string;
  minimum_stock: string;
  cost_per_unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// recipes
export interface Recipe {
  id: string;
  product_id: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// recipe_items
export interface RecipeItem {
  id: string;
  recipe_id: string;
  raw_material_id: string;
  quantity: string;
  unit: string;
  created_at: string;
}

// sales
export interface Sale {
  id: string;
  receipt_number: string;
  cashier_id: string;
  total_amount: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  amount_received: string | null;
  status: SaleStatus;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
}

// sale_items
export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  created_at: string;
}

// stock_movements
export interface StockMovement {
  id: number;
  raw_material_id: string;
  movement_type: StockMovementType;
  quantity_change: string;
  quantity_before: string;
  quantity_after: string;
  reference_id: string | null;
  note: string | null;
  actor_id: string | null;
  created_at: string;
}

// audit_log
export interface AuditLog {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

// Joined types used in views
export interface SaleWithItems extends Sale {
  sale_items: SaleItem[];
  profiles?: Pick<Profile, "display_name" | "login_id"> | null;
}

export interface RecipeWithDetails extends Recipe {
  products?: Pick<Product, "name" | "category"> | null;
  recipe_items?: (RecipeItem & {
    raw_materials?: Pick<RawMaterial, "name" | "base_unit"> | null;
  })[];
}

export interface ProfileWithStats extends Profile {
  // extended if needed
}
