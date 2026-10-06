import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Encerra a sessão e volta para o login.
 *
 * Existe para o usuário desativado: o login dele no Auth continua válido, e
 * só uma rota consegue apagar o cookie — um componente de página não pode.
 * Sem isso, middleware e página ficavam se devolvendo a pessoa para sempre.
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const url = new URL("/login", request.url);
  // Só um motivo conhecido passa adiante: o texto exibido não vem da URL.
  if (request.nextUrl.searchParams.get("motivo") === "desativado") {
    url.searchParams.set("motivo", "desativado");
  }

  return NextResponse.redirect(url);
}
