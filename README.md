
# direito.love (MVP PWA)

- Paleta usada: #A7C584, #6B8A47, #EAE3C0, #F6C915
- Fluxo do Prompt: digitar tema → **Buscar** → marcar opções → **Gerar Prompt** → Copiar/Compartilhar.
- Catálogo: páginas com **pesquisa + filtro** e itens **texto + botão** (Copiar/Abrir). Paginação por "Carregar mais".
- PWA: `manifest.json` + `service-worker.js` (HTML network-first; assets/JSON cache-first).

## Como testar localmente (rapidez)
1. Suba estes arquivos no GitHub Pages (raiz do repositório).
2. Abra `/index.html` e gere um prompt.
3. Visite as páginas **Artigos**, **Súmulas**, **Jurisprudência**, **Livros**, **Vídeos**, **Notícias**.
4. Instale como app (banner PWA) e teste offline (deve abrir `offline.html` quando necessário).

Tudo foi montado com dependências zero (HTML/CSS/JS vanilla).
