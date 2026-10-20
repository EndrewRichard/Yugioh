# Yugioh — Arena Clássica

Protótipo responsivo para catálogo de cartas, gerenciamento de decks por conta e duelos clássicos em desenvolvimento. O formato exclui Sincro, Xyz, Link e Pêndulo; o foco é o jogo antigo, incluindo Rituais e Fusões no catálogo.

## Rodar localmente

1. Instale Node.js 18 ou superior.
2. Abra um terminal nesta pasta (`outputs`).
3. Execute `npm start`.
4. Acesse `http://localhost:3000`.

Localmente, o projeto usa arquivos JSON e não precisa de serviços externos. Depois de alterações no código, reinicie o processo `npm start` para carregá-las.

## O que funciona

- Cadastro, login, logout e gerenciamento de conta; senhas protegidas por `scrypt` com salt individual.
- Catálogo em português obtido da API comunitária YGOPRODeck, com cache local JSON.
- Cópias de listas oficiais da Konami para Yugi, Kaiba e Joey, obtidas por produto; cartas de Sincro, Xyz, Link e Pêndulo são removidas do formato.
- Visualização ampliada das cartas no catálogo e no editor; imagens são baixadas sob demanda e guardadas em `public/assets/cards/`.
- Criar, editar, duplicar e excluir decks por conta. Cada cópia é independente.
- Salas de duelo por código, escolha de decks válidos de 40–60 cartas, compra inicial, turnos, fases, invocações normais e tributos, combate, Pontos de Vida e janelas para ativar ou passar alguns efeitos suportados.
- Layout responsivo para celular e computador.

## Armazenamento dos dados

Sem variáveis Supabase, os dados ficam em `data/*.json`. Em hospedagem, configure `SUPABASE_URL` e `SUPABASE_SECRET_KEY` para usar a tabela `public.app_state` no Supabase. A aplicação mantém a camada de modelos existente e salva as coleções de usuários, decks, duelos e cartas como JSONB.

Os produtos e códigos oficiais disponíveis ficam em `src/data/characterDecks.json`. Ao importar, o servidor busca os dados do produto na API YGOPRODeck e cria uma cópia privada na conta. O editor mantém o Deck Principal e o Deck Extra de Fusões em listas separadas. Alguns personagens do anime, como Mai, não têm um deck completo de produto oficial compatível com esse catálogo; por isso o site não apresenta listas inventadas como oficiais.

Os decks continuam vinculados à conta autenticada; cada cópia tem seu próprio registro. Usuários ficam na coleção `users`, decks em `decks`, salas em `duels` e cache em `cards`. Imagens são baixadas sob demanda e guardadas em `public/assets/cards/`; no Render gratuito, esse cache pode ser perdido em reinícios ou publicações e baixado novamente. Sessões ficam em memória, então cada jogador talvez precise entrar novamente após reinício do servidor.

## Publicar no Render com Supabase

1. Crie um projeto Supabase e rode `supabase/schema.sql` no SQL Editor.
2. Envie o repositório ao GitHub e crie um Blueprint no Render apontando para ele. O `render.yaml` configura o serviço Node e solicita as variáveis secretas `SUPABASE_URL` e `SUPABASE_SECRET_KEY`.
3. No Supabase, copie a URL do projeto e uma chave secreta (`sb_secret_...`). Cadastre ambas no Render. Nunca exponha a chave em `public/` ou no Git.
4. Para copiar dados locais existentes, configure as duas variáveis no terminal e execute `npm run migrate:supabase` uma vez. Faça uma cópia da pasta `data/` antes da migração.

O plano gratuito do Render pode desligar a aplicação quando fica sem tráfego. O Supabase Free tem limites de uso e pode pausar projetos inativos; mantenha cópias dos dados importantes e consulte os limites atuais antes de abrir o site para mais pessoas.

## Estrutura MVC

```text
src/
  controllers/   Contas, decks, cartas, modelos de personagem e duelos
  middleware/    Leitura JSON e autenticação de sessão
  models/        Regras de dados e persistência JSON/Supabase
  routes/        Rotas HTTP da API
  utils/         Resposta JSON compartilhada
  data/          Modelos iniciais de decks
  server.js      Servidor HTTP e arquivos estáticos
public/          Interface responsiva
data/            Arquivos JSON de execução
supabase/        SQL para criar a tabela de estado
scripts/         Migração inicial de JSON para Supabase
```

## Limites atuais da batalha

Esta é uma primeira estrutura jogável para duas pessoas na mesma instância do servidor, com atualização periódica da sala. Implementa fluxo Draw/Standby/Main 1/Battle/Main 2/End, invocação normal/baixar, tributos, combate básico e janelas opcionais para um conjunto pequeno e explícito de cartas. Não é ainda uma implementação completa das regras oficiais: efeitos não cadastrados não são processados, e regras de cadeia, dano e timing têm exceções não cobertas. Rituais e Fusões ainda não têm procedimento de invocação implementado. Para duelar, use decks completos de 40–60 cartas.

## API

| Método | Caminho | Uso |
|---|---|---|
| `POST` | `/api/account/register` | Criar conta |
| `POST` | `/api/account/login` | Entrar |
| `GET`, `POST` | `/api/decks` | Listar/criar decks próprios |
| `POST` | `/api/decks/:id/copy` | Duplicar deck próprio |
| `GET` | `/api/decks/templates` | Listar modelos de personagem |
| `POST` | `/api/decks/templates/:id` | Copiar modelo para a conta |
| `GET`, `PUT`, `DELETE` | `/api/decks/:id` | Consultar/editar/excluir deck próprio |
| `GET` | `/api/cards` | Obter catálogo em cache ou buscar cartas |
| `GET`, `POST` | `/api/duels/open`, `/api/duels` | Listar salas/criar sala |
| `POST` | `/api/duels/join` | Entrar por código |
| `GET`, `POST` | `/api/duels/:id`, `/api/duels/:id/actions` | Ver sala e executar ações |

## Origem dos dados

Não foi encontrada uma API pública oficial da Konami para integração. As informações de cartas e imagens vêm da API comunitária YGOPRODeck (v7). Os cinco modelos disponíveis correspondem a produtos da Konami: três decks de *Legendary Decks II* (Yugi, Kaiba e Joey) e dois Structure Decks de Yugi e Kaiba. Outros personagens famosos não têm decks completos publicados pela Konami nesse formato de produto; eles não são simulados aqui. O catálogo comum continua filtrado por lançamento TCG de 2000–2005; a importação dos produtos oficiais carrega as cartas da lista diretamente.

- [Guia da API comunitária YGOPRODeck](https://ygoprodeck.com/api-guide/)
- [Decks de anime da comunidade YGOPRODeck](https://ygoprodeck.com/category/format.php?format=anime+decks)
- [Legendary Decks II — produto oficial Konami](https://www.yugioh-card.com/en/products/past_products/legendary_decks_2/)
- [Structure Deck: Yugi Muto e Structure Deck: Seto Kaiba — produtos oficiais Konami](https://www.yugioh-card.com/en/products/past_products/sdmy-sdks/)
- [Banco de cartas da Konami](https://www.db.yugioh-card.com/yugiohdb/TCG/)
