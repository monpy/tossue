import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "This is a simulated server error for testing Tossue" },
    { status: 500 }
  );
}
