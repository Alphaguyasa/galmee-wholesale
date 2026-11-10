import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ItemRowDTO = {
  id: string;
  name: string;
  unit: string;
  price: number;
  cost: number;
  onHand: number;
  reorderLevel: number;
};

type Locale = "am" | "om" | "en";

function pickName(row: { name_en: string; name_am: string | null; name_om: string | null }, locale: Locale): string {
  if (locale === "am" && row.name_am) return row.name_am;
  if (locale === "om" && row.name_om) return row.name_om;
  return row.name_en;
}

/** Active items with quantity on hand. Low stock first, then by name. `query` is already sanitised. */
export async function listItems(query: string, locale: Locale): Promise<ItemRowDTO[]> {
  const supabase = await createClient();
  let request = supabase
    .from("items")
    .select("id, name_en, name_am, name_om, unit, price, cost, reorder_level")
    .eq("active", true)
    .order("name_en")
    .limit(300);
  if (query) request = request.or(`name_en.ilike.*${query}*,name_am.ilike.*${query}*,name_om.ilike.*${query}*,sku.ilike.*${query}*`);

  const { data: items, error } = await request;
  if (error) throw new Error("items_load_failed");
  if (items.length === 0) return [];

  const { data: stock, error: stockError } = await supabase
    .from("item_stock")
    .select("item_id, qty_on_hand")
    .in(
      "item_id",
      items.map((i) => i.id),
    );
  if (stockError) throw new Error("stock_load_failed");
  const onHand = new Map(stock.map((s) => [s.item_id, s.qty_on_hand ?? 0]));

  return items
    .map((row) => ({
      id: row.id,
      name: pickName(row, locale),
      unit: row.unit,
      price: row.price,
      cost: row.cost,
      onHand: onHand.get(row.id) ?? 0,
      reorderLevel: row.reorder_level,
    }))
    .sort((a, b) => Number(b.onHand <= b.reorderLevel) - Number(a.onHand <= a.reorderLevel));
}

export async function getItem(id: string, locale: Locale): Promise<ItemRowDTO | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id, name_en, name_am, name_om, unit, price, cost, reorder_level")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("item_load_failed");
  if (!data) return null;
  const { data: stock } = await supabase.from("item_stock").select("qty_on_hand").eq("item_id", id).maybeSingle();
  return {
    id: data.id,
    name: pickName(data, locale),
    unit: data.unit,
    price: data.price,
    cost: data.cost,
    onHand: stock?.qty_on_hand ?? 0,
    reorderLevel: data.reorder_level,
  };
}

/** New stock batch and an "in" movement, written together by the core RPC. */
export async function receiveStock(input: { item: string; qty: number; cost: number; batch: string | undefined }): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("receive_stock", {
    p_item: input.item,
    p_qty: input.qty,
    p_cost: input.cost,
    p_batch: input.batch,
  });
  return { ok: !error };
}
