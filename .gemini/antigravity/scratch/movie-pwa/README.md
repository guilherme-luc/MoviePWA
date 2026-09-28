# Movie Collection PWA

Gerenciador de coleções de DVD e VHS com React, TypeScript, Vite e Google Sheets.

## Executar localmente

Requer Node.js 24 ou superior para os comandos de teste.

1. Execute `npm ci`.
2. Copie `.env.example` para `.env.local` e configure as credenciais.
3. Execute `npm run dev`.

O projeto Google Cloud precisa das APIs Google Sheets e Google Drive habilitadas, de uma chave de API e de um cliente OAuth web. Autorize `http://localhost:5173` e o endereço de produção nas origens JavaScript do cliente OAuth. Configure a tela de consentimento e os usuários de teste quando aplicável.

`VITE_GOOGLE_CLIENT_ID` identifica o cliente OAuth; `VITE_GOOGLE_API_KEY` é a chave Google usada no navegador. TMDB e OMDb são opcionais para obter metadados.

O aplicativo procura ou cria as planilhas `MoviePWA DVD Collection` e `MoviePWA VHS Collection`. Cada gênero ocupa uma aba; o serviço gerencia os 22 campos e a atualização dos cabeçalhos. Evite alterar manualmente a estrutura ou a ordem das linhas enquanto houver edições em andamento no aplicativo.

## Recomendações

- Status de assistido, duração e clima são filtrados localmente. Sem correspondência, os critérios só mudam após uma escolha explícita do usuário. Duração desconhecida não passa por um filtro de tempo.
- A coleção filtrada é classificada por estilo (palavras em gênero, tags e sinopse), nota pessoal, feedback e histórico recente. Até 20 candidatos chegam ao Gemini, em ordem de afinidade; não há amostragem aleatória.
- São enviados título, ano, gênero, duração, sinopse (até 700 caracteres), até oito tags, diretor e nota pessoal. Códigos de barras são substituídos por IDs exclusivos da consulta. Imagens e identificadores internos das planilhas não são enviados.
- A resposta deve identificar um desses candidatos. Ela é validada no servidor e no navegador. Falhas não geram sorteios: a tela oferece tentar novamente ou usar uma sugestão local identificada como tal.
- O histórico guarda até 100 recomendações por coleção neste navegador. Gostei/Não combinou altera a classificação daquele filme. Isso não treina o Gemini nem cria um perfil entre dispositivos. O feedback e o histórico não são enviados ao Google. A tela permite apagá-los.
- Fechar a janela cancela a consulta no navegador e impede que um resultado atrasado apareça ou entre no histórico.

## Chave e servidor da IA

Configure `GEMINI_API_KEY` **apenas no servidor**, sem o prefixo `VITE_`. A variável antiga `VITE_GEMINI_API_KEY` não é mais usada. Configure também `GOOGLE_CLIENT_ID` com o mesmo cliente OAuth usado pelo aplicativo (o servidor aceita `VITE_GOOGLE_CLIENT_ID` como alternativa).

Se uma chave já esteve em uma versão pública do frontend, revogue-a e configure uma nova no servidor. Não envie a chave em mensagens nem a inclua no repositório.

O endpoint `/api/recommend` funciona no desenvolvimento e preview do Vite e possui uma função Node em `api/recommend.ts` para a Vercel. Em outra hospedagem, é necessário executar esse servidor; publicar apenas `dist` mantém somente as sugestões locais. Na Vercel, use esta pasta `movie-pwa` como raiz do projeto. A configuração de rotas preserva `/api/` para funções.

Cada consulta exige uma sessão Google válida para este cliente OAuth. O servidor limita o corpo a 64 KiB, o conjunto a 20 filmes e aplica limites de três consultas por sessão por minuto e vinte por instância por minuto. Esses limites ficam em memória: reinícios e múltiplas instâncias não compartilham os contadores. Para publicação com vários usuários/instâncias, use um limitador persistente e configure também as cotas do provedor.

Mantido o modelo `gemini-2.5-flash`, sem tentativas automáticas em outros modelos. Um erro de cota encerra a consulta. O código não habilita faturamento; o uso gratuito depende da conta e das cotas do Google. Para custo zero, utilize um projeto Gemini sem faturamento pago. Sem credenciais, a sugestão local funciona sem chamadas à IA.

O endpoint de disponibilidade confirma apenas a configuração do servidor. A validade da chave e a disponibilidade do modelo são verificadas pela chamada real; uma falha é informada na interface.

## Verificações

- `npm test`: filtros, ranking, validação, histórico, autenticação, limites, adaptador HTTP e interações do questionário. Google e Gemini são simulados; os testes não consomem cotas.
- `npm run build`: TypeScript e build de produção.
- `npm run lint`: análise estática global. Existem pendências anteriores fora do módulo de recomendações.

## PWA e offline

O service worker guarda o aplicativo, mas a coleção ainda não possui persistência offline completa. A recomendação local usa os filmes já carregados; não garante reabertura da coleção sem internet.
