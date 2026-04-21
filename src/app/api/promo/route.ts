import { getPromoCode } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim();
  if (!code) return Response.json({ valid: false, reason: "No code provided" });

  const promo = getPromoCode(code);
  if (!promo || !promo.active) return Response.json({ valid: false, reason: "Invalid code" });
  if (promo.maxUses !== null && promo.uses >= promo.maxUses)
    return Response.json({ valid: false, reason: "Code limit reached" });

  return Response.json({ valid: true, xpBonus: promo.xpBonus, description: promo.description });
}
