import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const result = await prisma.trade.deleteMany();
    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("[reset-trades] Failed to clear trades", error);
    return NextResponse.json({ error: "Failed to clear trades" }, { status: 500 });
  }
}

