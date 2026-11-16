import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getContent } from "@/lib/content-data";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> },
) {
  const { locale } = await context.params;
  return NextResponse.json(getContent(locale));
}
