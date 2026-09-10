import { createAdminClient } from "@/lib/supabase/admin";

// Chamado a partir de reviewFoodShare/reviewMenuItem quando a aprovação já
// vem com um dia definido — cria sozinho o item na Agenda, marcado como
// auto_created, sem precisar que ninguém abra a aba Agenda pra registrar.
export async function autoScheduleCooking(params: {
  day: string;
  createdBy: string;
  foodShareId?: string;
  menuItemId?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("agenda_items").insert({
    day: params.day,
    activity_type: "cozinhar",
    created_by: params.createdBy,
    food_share_id: params.foodShareId ?? null,
    menu_item_id: params.menuItemId ?? null,
    auto_created: true,
  });
}
