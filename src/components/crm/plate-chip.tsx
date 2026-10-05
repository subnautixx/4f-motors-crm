/**
 * Placa no desenho Mercosul: fundo claro, faixa azul no topo, letra preta.
 *
 * É dado, não enfeite — e é o dado que todo mundo numa loja de carro
 * reconhece antes de ler. O banco já guardava a placa desde o começo; ela só
 * não aparecia em lugar nenhum.
 */
export function PlateChip({ plate }: { plate: string }) {
  const text = plate.trim().toUpperCase();

  return (
    <span className="inline-flex flex-col overflow-hidden rounded-[4px] bg-zinc-100 leading-none ring-1 ring-inset ring-black/25">
      <span aria-hidden className="h-[5px] bg-[#1f4aa8]" />
      <span className="px-2 pb-1 pt-[3px] font-mono text-[13px] font-bold tracking-[0.14em] text-zinc-900">
        <span className="sr-only">Placa </span>
        {text}
      </span>
    </span>
  );
}
