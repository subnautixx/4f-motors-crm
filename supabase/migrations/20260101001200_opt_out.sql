-- =============================================================================
-- Opt-out: o cliente responde SAIR e o CRM para de enviar
-- =============================================================================
-- A política de privacidade publicada promete: "Responda SAIR na conversa do
-- WhatsApp. Registramos o pedido e paramos de enviar mensagens para aquele
-- número." Até aqui nada tratava o pedido — e, quando era a primeira resposta
-- do cliente, o SAIR ainda era gravado como consentimento.

alter table public.contacts
  add column opt_out_at     timestamptz,
  add column opt_out_source text;

comment on column public.contacts.opt_out_at is
  'Quando o cliente pediu para não receber mensagens (respondeu SAIR). Enquanto preenchido, nenhum envio sai pelo CRM.';

/**
 * A mensagem inteira precisa ser o pedido. "Vou sair agora, falo depois" não
 * é opt-out; "SAIR", "Sair." e "stop" são. Pontuação, espaço e caixa não
 * contam.
 */
create or replace function public.is_opt_out_message(p_content text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(
    lower(regexp_replace(p_content, '[^[:alpha:]]', '', 'g'))
      in ('sair', 'parar', 'pare', 'stop', 'descadastrar'),
    false
  );
$$;

/**
 * Consentimento e opt-out vêm do mesmo lugar: o que o cliente escreve.
 *
 * - SAIR registra o pedido e não conta como consentimento.
 * - Qualquer outra mensagem grava o consentimento na primeira vez (a data mais
 *   antiga é a que vale, como antes).
 * - Escrever de novo depois do SAIR é o cliente retomando a conversa, e o
 *   bloqueio sai. Só vale para mensagem mais nova que o pedido: a Meta entrega
 *   fora de ordem, e uma mensagem antiga chegando atrasada não pode desfazer
 *   um SAIR.
 */
create or replace function public.record_opt_in_from_inbound()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_at timestamptz := coalesce(new.wa_timestamp, new.created_at);
begin
  if new.direction <> 'inbound' then
    return new;
  end if;

  if public.is_opt_out_message(new.content) then
    update public.contacts
    set opt_out_at = v_at,
        opt_out_source = 'resposta_sair'
    where id = new.contact_id
      and (opt_out_at is null or opt_out_at < v_at);

    return new;
  end if;

  update public.contacts
  set opt_in_at = v_at,
      opt_in_source = 'resposta_do_cliente'
  where id = new.contact_id
    and opt_in_at is null;

  update public.contacts
  set opt_out_at = null,
      opt_out_source = null
  where id = new.contact_id
    and opt_out_at is not null
    and opt_out_at < v_at;

  return new;
end;
$$;

/**
 * Trava no banco: mensagem de saída para quem pediu SAIR não é gravada.
 *
 * A rota de envio já recusa antes (com uma mensagem que se entende); isto é a
 * garantia de que nenhum caminho novo — template, mídia, reenvio — esqueça a
 * regra. Toda mensagem de saída nasce no CRM (há uma constraint exigindo quem
 * enviou), então o webhook nunca esbarra aqui.
 */
create or replace function public.block_outbound_after_opt_out()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.direction = 'outbound' and exists (
    select 1 from public.contacts
    where id = new.contact_id
      and opt_out_at is not null
  ) then
    raise exception 'O cliente pediu para não receber mensagens.'
      using errcode = 'P0001', hint = 'contact_opted_out';
  end if;

  return new;
end;
$$;

create trigger messages_block_after_opt_out before insert on public.messages
  for each row execute function public.block_outbound_after_opt_out();
