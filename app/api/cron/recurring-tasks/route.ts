import { NextResponse } from "next/server";
import { generateRecurringTasksAction } from "@/lib/actions/tasks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await generateRecurringTasksAction();

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}
