import { NextResponse } from "next/server";
import { getTransferSearchResults, parseTransferSearchParams } from "@/lib/transfers/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const result = await getTransferSearchResults(parseTransferSearchParams(searchParams));
  return NextResponse.json(result);
}
