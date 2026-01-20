# CodeCraft Gen-Z - Documentacao do Fluxo de Dados

## 1. Visao Geral do Sistema

O CodeCraft Gen-Z e uma plataforma web desenvolvida para gerenciamento de projetos, desafios e marketplace de aplicativos. O sistema utiliza as seguintes tecnologias:

- Frontend: React 18 com Vite
- Backend: Express com TypeScript
- Banco de Dados: MySQL com Prisma ORM
- Pagamentos: Mercado Pago

---

## 2. Fluxo de Navegacao entre Paginas

### 2.1 Paginas Publicas

A navegacao do sistema inicia pela pagina inicial (Home), que serve como ponto central de acesso. A partir dela, o usuario pode acessar as seguintes secoes:

**Desafios** - Exibe a lista de desafios disponiveis para os crafters participarem. Cada desafio possui pontuacao, prazo e recompensa.

**Projetos** - Mostra os projetos em desenvolvimento pela equipe, com informacoes sobre progresso, mentor responsavel e tecnologias utilizadas.

**Mentoria** - Apresenta informacoes sobre o programa de mentoria, incluindo mentores disponiveis e suas especialidades.

**Ranking** - Exibe a classificacao dos crafters baseada em pontos acumulados atraves de desafios e contribuicoes.

**Feedbacks** - Secao de avaliacoes e comentarios sobre a plataforma e os aplicativos.

**Aplicativos** - Marketplace onde os usuarios podem visualizar e adquirir aplicativos desenvolvidos pela equipe.

### 2.2 Fluxo de Compra

Quando o usuario deseja comprar um aplicativo, ele segue o seguinte caminho:

1. Acessa a pagina de Aplicativos
2. Seleciona o aplicativo desejado
3. E direcionado para a pagina de Compra
4. Realiza o pagamento via Mercado Pago
5. Apos confirmacao, e redirecionado para a pagina de Sucesso
6. A licenca fica disponivel na area Minha Conta

### 2.3 Paginas de Autenticacao

O sistema possui as seguintes paginas relacionadas a autenticacao:

**Login** - Permite que usuarios existentes acessem suas contas informando email e senha.

**Registro** - Permite criar uma nova conta informando nome, email e senha.

**Esqueci Minha Senha** - Envia um link de recuperacao para o email do usuario.

**Redefinir Senha** - Permite criar uma nova senha atraves do link recebido por email.

### 2.4 Paginas Protegidas

**Minha Conta** - Disponivel para usuarios logados, exibe o historico de compras e informacoes do perfil.

**Painel Administrativo** - Restrito a administradores e editores, permite gerenciar usuarios, projetos, apps, desafios, financas e configuracoes do sistema.

---

## 3. Consumo de Dados no Frontend

### 3.1 Camada de Servicos

O frontend utiliza uma funcao centralizada chamada apiRequest para todas as comunicacoes com o backend. Esta funcao e responsavel por:

- Adicionar automaticamente os headers necessarios (Authorization e Content-Type)
- Incluir o token JWT nas requisicoes autenticadas
- Enviar a requisicao para o servidor
- Tratar erros e retornar os dados no formato padrao

A partir desta funcao central, existem servicos especializados para cada dominio:

**userAPI** - Gerencia operacoes de usuarios como login, registro, logout e recuperacao de senha.

**projectsAPI** - Gerencia operacoes de projetos como listagem, criacao, atualizacao e exclusao.

**appsAPI** - Gerencia operacoes do marketplace como listagem de apps, criacao de pagamentos e upload de executaveis.

**mentorAPI** - Gerencia operacoes relacionadas a mentores.

**rankingAPI** - Gerencia operacoes do sistema de ranking e pontuacao.

### 3.2 Gerenciamento de Autenticacao

O sistema utiliza o Context API do React para gerenciar o estado de autenticacao globalmente. O AuthContext mantem as seguintes informacoes:

**Estado:**
- user: objeto com dados do usuario logado (id, nome, email, role)
- isAuthenticated: indica se o usuario esta autenticado
- loading: indica se a verificacao de autenticacao esta em andamento

**Funcoes:**
- login: recebe email e senha, autentica o usuario e armazena o token
- logout: remove o token e limpa os dados do usuario
- hasRole: verifica se o usuario possui determinada permissao

### 3.3 Armazenamento Local

O sistema utiliza o armazenamento do navegador para persistir dados entre sessoes:

**localStorage** - Armazena o token JWT sob a chave "cc_session". Este token e enviado em todas as requisicoes autenticadas.

**sessionStorage** - Armazena cache dos dados do usuario para evitar requisicoes desnecessarias ao backend.

---

## 4. Processamento no Backend

### 4.1 Arquitetura em Camadas

O backend segue uma arquitetura em camadas bem definida, onde cada camada tem responsabilidades especificas:

**Camada de Rotas (Routes):** Define os endpoints da API e quais middlewares devem ser aplicados. Por exemplo, a rota POST /api/projetos aplica os middlewares de autenticacao, autorizacao de admin e validacao antes de chamar o controller.

**Camada de Middlewares:** Executa validacoes e verificacoes antes de processar a requisicao:
- authenticate: extrai e valida o token JWT do header Authorization
- authorizeAdmin: verifica se o usuario possui role de administrador
- validate: valida os dados da requisicao usando schemas Zod

**Camada de Controllers:** Recebe a requisicao HTTP, extrai os dados ja validados, chama o service apropriado e formata a resposta HTTP.

**Camada de Services:** Contem toda a logica de negocio da aplicacao. Valida regras de negocio, orquestra operacoes complexas e lanca erros especificos quando necessario.

**Camada de Repositories:** Responsavel exclusivamente pelo acesso ao banco de dados. Utiliza o Prisma ORM para executar as operacoes de CRUD.

### 4.2 Principais Endpoints

O backend disponibiliza os seguintes endpoints principais:

**Autenticacao:**
- POST /api/auth/login - Autentica o usuario e retorna o token JWT
- POST /api/auth/register - Cria uma nova conta de usuario
- GET /api/auth/me - Retorna os dados do usuario autenticado
- POST /api/auth/forgot-password - Envia email de recuperacao de senha
- POST /api/auth/reset-password - Redefine a senha com o token recebido

**Projetos:**
- GET /api/projetos - Lista todos os projetos
- GET /api/projetos/:id - Retorna um projeto especifico
- POST /api/projetos - Cria um novo projeto (requer admin)
- PUT /api/projetos/:id - Atualiza um projeto (requer admin)
- DELETE /api/projetos/:id - Remove um projeto (requer admin)

**Aplicativos:**
- GET /api/apps - Lista todos os aplicativos publicos
- GET /api/apps/:id - Retorna detalhes de um aplicativo
- POST /api/apps - Cria um novo aplicativo (requer admin)
- POST /api/payments/preference/:appId - Cria preferencia de pagamento no Mercado Pago

**Licencas:**
- GET /api/licenses/user - Retorna as licencas do usuario autenticado

---

## 5. Comunicacao com o Banco de Dados

### 5.1 Prisma ORM

O sistema utiliza o Prisma como ORM (Object-Relational Mapping) para comunicacao com o banco de dados MySQL. O Prisma oferece:

- Geracao automatica de tipos TypeScript baseados no schema
- Query builder type-safe que previne erros em tempo de compilacao
- Migracao automatica do schema para o banco de dados
- Cliente otimizado para performance

O fluxo de uma consulta ao banco segue o seguinte caminho: o Repository chama um metodo do Prisma Client, que converte a chamada em SQL, executa no MySQL e retorna os dados ja mapeados para objetos TypeScript.

### 5.2 Estrutura do Banco de Dados

O banco de dados esta organizado nas seguintes areas:

**Usuarios e Autenticacao:**
A tabela users armazena todos os usuarios do sistema, incluindo id, email, nome, hash da senha, role (admin, editor, viewer), status (ativo, inativo) e flag isGuest para usuarios criados automaticamente em compras sem login.

A tabela password_resets armazena os tokens de recuperacao de senha com data de expiracao.

**Marketplace:**
A tabela apps armazena os aplicativos disponiveis para venda, incluindo nome, descricao, preco, categoria, URL do executavel, versao e status de publicacao.

A tabela app_payments registra todas as tentativas de pagamento, incluindo o ID da preferencia do Mercado Pago, status, valor, email e nome do pagador.

A tabela user_licenses armazena as licencas adquiridas pelos usuarios, vinculando o usuario ao aplicativo comprado e incluindo a chave de licenca gerada.

**Projetos:**
A tabela projetos armazena os projetos em desenvolvimento com nome, descricao, preco, progresso e mentor responsavel.

A tabela mentores armazena os dados dos mentores disponiveis.

A tabela inscricoes registra as inscricoes de interessados nos projetos.

**Gamificacao:**
A tabela crafters armazena os participantes do programa de gamificacao com seus pontos acumulados.

A tabela equipes organiza os crafters em times.

A tabela desafios define os desafios disponiveis com pontuacao base e prazo.

A tabela challenge_submissions registra as entregas dos crafters nos desafios.

---

## 6. Retorno de Respostas

### 6.1 Formato Padrao

Todas as respostas da API seguem um formato padronizado para facilitar o tratamento no frontend.

**Resposta de Sucesso:**
O servidor retorna um objeto JSON contendo o campo "success" com valor true e o campo "data" contendo os dados solicitados. Por exemplo, ao buscar um usuario, o retorno seria: success true e data contendo id, nome, email e role do usuario.

**Resposta de Erro:**
Em caso de erro, o servidor retorna um objeto JSON contendo o campo "success" com valor false e o campo "error" contendo o codigo do erro e uma mensagem descritiva. Por exemplo: success false, error com code "NOT_FOUND" e message "Usuario nao encontrado".

### 6.2 Codigos de Status HTTP

O sistema utiliza os seguintes codigos HTTP:

**200 OK** - Requisicao processada com sucesso. Usado para GET, PUT e DELETE bem-sucedidos.

**201 Created** - Recurso criado com sucesso. Usado apos POST que cria um novo registro.

**400 Bad Request** - Dados da requisicao invalidos. Retornado quando a validacao falha.

**401 Unauthorized** - Token ausente ou invalido. Retornado quando a autenticacao falha.

**403 Forbidden** - Usuario sem permissao. Retornado quando o usuario nao tem a role necessaria.

**404 Not Found** - Recurso nao encontrado. Retornado quando o ID solicitado nao existe.

**500 Internal Server Error** - Erro interno do servidor. Retornado em caso de excecoes nao tratadas.

---

## 7. Fluxos Detalhados

### 7.1 Fluxo de Login

O processo de login ocorre da seguinte forma:

1. O usuario acessa a pagina de login e informa seu email e senha.

2. O frontend envia uma requisicao POST para /api/auth/login com os dados informados.

3. O backend recebe a requisicao e o controller repassa para o authService.

4. O authService consulta o banco de dados buscando um usuario com o email informado.

5. Se o usuario existe, o sistema compara a senha informada com o hash armazenado usando bcrypt.

6. Se a senha esta correta, o sistema gera um token JWT contendo id, email, role e nome do usuario.

7. O backend retorna o token e os dados basicos do usuario para o frontend.

8. O frontend armazena o token no localStorage e atualiza o estado global de autenticacao.

9. O usuario e redirecionado para a pagina inicial ja autenticado.

### 7.2 Fluxo de Compra de Aplicativo

O processo de compra de um aplicativo ocorre da seguinte forma:

1. O usuario acessa a pagina do aplicativo e clica em Comprar.

2. O frontend exibe o formulario de pagamento. Se o usuario nao esta logado, aparece um banner incentivando o login, mas permitindo continuar como guest.

3. O usuario seleciona o metodo de pagamento (cartao, PIX ou boleto) e preenche os dados necessarios.

4. O frontend envia uma requisicao para o backend criar a preferencia de pagamento no Mercado Pago.

5. O backend se comunica com a API do Mercado Pago e recebe um ID de preferencia e URL de redirecionamento.

6. O backend registra o pagamento no banco de dados com status "pending".

7. O usuario e redirecionado para o ambiente do Mercado Pago para concluir o pagamento.

8. Apos o pagamento, o Mercado Pago envia um webhook para o backend informando o resultado.

9. O backend atualiza o status do pagamento no banco de dados.

10. Se o pagamento foi aprovado, o sistema cria uma licenca vinculando o usuario ao aplicativo.

11. O usuario e redirecionado para a pagina de sucesso e pode acessar sua licenca na area Minha Conta.

### 7.3 Fluxo de Compra como Guest

Quando o usuario compra sem fazer login:

1. O sistema cria automaticamente um usuario com flag isGuest = true usando o email informado na compra.

2. A licenca e vinculada a este usuario guest.

3. Se posteriormente o usuario criar uma conta com o mesmo email, o sistema automaticamente vincula as compras anteriores a nova conta.

4. Se o usuario ja possui uma conta e fizer login, o sistema faz merge das compras do usuario guest para a conta principal.

---

## 8. Resumo da Arquitetura

O sistema CodeCraft Gen-Z segue uma arquitetura moderna de separacao entre frontend e backend, comunicando-se atraves de uma API RESTful.

**Frontend (React):** Responsavel pela interface do usuario, navegacao entre paginas e gerenciamento de estado local e global. Utiliza lazy loading para otimizar o carregamento.

**Camada de Servicos (API):** Abstrai as chamadas HTTP, adiciona headers de autenticacao e trata erros de forma padronizada.

**Backend (Express):** Processa as requisicoes seguindo uma arquitetura em camadas clara: Routes definem os endpoints, Controllers tratam HTTP, Services contem logica de negocio e Repositories acessam dados.

**ORM (Prisma):** Mapeia objetos TypeScript para tabelas MySQL, garantindo type-safety e facilitando migriacoes.

**Banco de Dados (MySQL):** Persiste todos os dados da aplicacao de forma relacional e consistente.

**Pagamentos (Mercado Pago):** Processa transacoes financeiras de forma segura, notificando o sistema via webhooks.

Os principios que guiam a arquitetura sao: separacao de responsabilidades entre camadas, autenticacao stateless via JWT, validacao em multiplas camadas para seguranca, respostas padronizadas para facilitar integracao e cache no frontend para otimizar performance.
