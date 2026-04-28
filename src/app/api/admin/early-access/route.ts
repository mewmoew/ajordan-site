import { getUsers, getAccount } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = req.headers.get("x-admin-secret");
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const users = getUsers().filter(u => u.earlyAccess);
  const result = users
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((u, i) => {
      const account = getAccount(u.id);
      return {
        rank: i + 1,
        username: u.username,
        email: u.email ?? null,
        points: account.points,
        createdAt: u.createdAt,
      };
    });

  return Response.json({ count: result.length, users: result });
}
