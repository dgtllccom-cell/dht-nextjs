// Temporary diagnostic endpoint disabled
export async function GET() {
  return new Response("Disabled", { status: 404 });
}
