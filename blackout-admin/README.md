# BLACKOUT Admin

Aplicação web administrativa independente da BLACKOUT INFOR GAMES. Usa o mesmo projeto Supabase do site público, com autenticação, autorização em `admin_users` e políticas RLS.

## Desenvolvimento

1. Copie `.env.example` para `.env` e preencha apenas as chaves públicas.
2. Execute `npm install`.
3. Execute `npm run dev`.

## Produção

Execute `npm run build`. O resultado estático fica em `dist/`.

Na Vercel, importe este repositório usando `blackout-admin` como **Root Directory** e configure `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `PUBLIC_SITE_URL`.

`PUBLIC_SITE_URL` deve apontar para o site público da BLACKOUT e só é usado para visualizar imagens antigas salvas como caminhos relativos. Novos uploads continuam no Supabase Storage.
