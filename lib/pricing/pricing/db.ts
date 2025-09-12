// lib/pricing/db.ts
// ⚠️ Placeholder in-memory store. Vervang met echte DB (Postgres/Prisma) in productie.
import { randomUUID } from "crypto";
import type { Product, Customer, CustomerDiscount } from "./types";

const store = {
  products: new Map<string, Product>(),
  customers: new Map<string, Customer>(),
  discounts: new Map<string, CustomerDiscount>(),
};

export const db = {
  async upsertProducts(rows: Omit<Product, "id">[]) {
    rows.forEach((r) => {
      const existing = [...store.products.values()].find((p) => p.sku === r.sku);
      if (existing) {
        store.products.set(existing.id, { ...existing, ...r });
      } else {
        const id = randomUUID();
        store.products.set(id, { id, ...r });
      }
    });
    return [...store.products.values()];
  },

  async listProducts() {
    return [...store.products.values()];
  },

  async listCustomers() {
    return [...store.customers.values()];
  },

  async upsertCustomers(rows: { name: string; code?: string }[]) {
    rows.forEach((r) => {
      const ex = [...store.customers.values()].find((c) => c.name === r.name);
      if (ex) store.customers.set(ex.id, { ...ex, ...r });
      else store.customers.set(r.name, { id: randomUUID(), ...r });
    });
    return [...store.customers.values()];
  },

  async setCustomerDiscount(customerId: string, discount_pct: number) {
    const id = randomUUID();
    const rec: CustomerDiscount = {
      id,
      customer_id: customerId,
      discount_pct,
      valid_from: new Date().toISOString().slice(0, 10),
    };
    store.discounts.set(id, rec);
    return rec;
  },

  async getLatestDiscount(customerId: string) {
    const all = [...store.discounts.values()].filter((d) => d.customer_id === customerId);
    return all.sort((a, b) => (a.valid_from > b.valid_from ? -1 : 1))[0] || null;
  },
};
