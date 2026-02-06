# Guia Completo: Do PC para a Nuvem ☁️

Você pediu um guia **"do zero"**, então aqui está! Vamos levar seu site do computador local até a internet, para você acessar de qualquer lugar.

O processo tem 5 passos simples:

---

## Passo 0: Salvar Atualizações (Commit) 💾
Antes de tudo, precisamos salvar as alterações que fizemos (como o botão mágico) no histórico do Git.
> **Ação:** Aprove o comando que eu deixei pronto na mensagem abaixo deste guia.

---

## Passo 1: Criar o "Cofre" no GitHub 🐱
O GitHub é onde vamos guardar seu código na nuvem.

1.  Acesse [github.com](https://github.com) e faça login (ou crie conta).
2.  No canto superior direito, clique no **+** e selecione **New repository**.
3.  **Repository name:** Digite `movie-pwa` (ou o nome que preferir).
4.  Deixe como **Public** (mais fácil) ou **Private**.
5.  **Não marque** nada (README, .gitignore, license). Deixe tudo vazio.
6.  Clique no botão verde **Create repository**.
7.  Mantenha a página que abriu, vamos usar os códigos dela logo mais.

---

## Passo 2: Conectar e Enviar 🔗
Agora vamos conectar seu PC ao cofre que você acabou de criar.

> **Importante:** Você precisa ter o Git instalado. Se der erro de comando não encontrado, avise.

Abra seu terminal na pasta do projeto e rode comando por comando (copie e cole):

1.  **Conectar ao GitHub:**
    (Substitua o link pelo que apareceu na tela do GitHub no Passo 1)
    ```bash
    git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
    ```
    *Dica: Se der erro dizendo "remote origin already exists", use:* `git remote set-url origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git`

2.  **Renomear ramo principal (boa prática):**
    ```bash
    git branch -M main
    ```

3.  **Enviar o código (Push):**
    ```bash
    git push -u origin main
    ```
    *Se ele pedir login, siga as instruções na tela.*

---

## Passo 3: Colocar no Ar (Vercel) ▲
A Vercel pega o código do GitHub e transforma num site real.

1.  Acesse [vercel.com](https://vercel.com) e faça login com sua conta **GitHub**.
2.  Clique em **Add New...** -> **Project**.
3.  Ele vai listar seus repositórios. Encontre o `movie-pwa` e clique em **Import**.
4.  Nas configurações, deixe tudo padrão.
5.  **Environment Variables (Variáveis de Ambiente):**
    *   Clique para expandir.
    *   Adicione `VITE_TMDB_API_KEY` com o valor da sua chave (copie do `.env`).
6.  Clique em **Deploy**.
6.  Espere os fogos de artifício 🎉. Quando terminar, você terá um link (ex: `movie-pwa-xyz.vercel.app`).
    *   🛑 **CALMA! Não faça login ainda.** Vai dar erro. Vá para o Passo 4.

---

## Passo 4: Autorizar no Google (Crítico) 🔐
O Google Login é chato com segurança. Ele bloqueia o site novo até você dizer que é confiável.

1.  Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2.  Certifique-se de estar no projeto certo (onde pegou a API Key).
3.  Menu lateral -> **APIs e Serviços** -> **Credenciais**.
4.  Em "IDs do cliente OAuth 2.0", clique no lápis ✏️ para editar.
5.  Role até **"Origens JavaScript autorizadas"**:
    *   Clique em **Adicionar URI**.
    *   Cole o link do seu site na Vercel (sem a barra `/` no final).
    *   Exemplo: `https://movie-pwa-seu-nome.vercel.app`
6.  Em **"URIs de redirecionamento autorizados"**:
    *   Adicione o mesmo link.
7.  Clique em **SALVAR**.

---

## Passo 5: Teste Final 📱
1.  Pegue seu celular (desligue o Wi-Fi se quiser testar pra valer).
2.  Entre no link da Vercel.
3.  Faça login com Google.
4.  No Android (Chrome) ou iOS (Safari), clique em "Compartilhar" -> **Adicionar à Tela de Início**.
5.  Agora ele funciona como um App nativo! 🎬

Boa sorte! Se travar em algum passo, me chame.

---

## Passo 6: Ativando a "Mente" (IA do Gemini) 🧠
Para que o botão de "Sugestão Inteligente" use Inteligência Artificial de verdade:

1.  Acesse o [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Faça login e clique em **"Create API Key"**.
3.  Copie a chave gerada.
4.  No painel da **Vercel**:
    *   Vá em **Settings** -> **Environment Variables**.
    *   Key: `VITE_GEMINI_API_KEY`
    *   Value: `sua_chave_aqui`
    *   Clique em **Save**.
5.  Vá em **Deployments**, clique nos 3 pontinhos do último deploy e escolha **Redeploy**.

Pronto! Agora o app vai justificar as escolhas de filmes com texto gerado por IA. ✨
