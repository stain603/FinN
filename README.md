# Finn

Sistema de gestão comercial para controle de empréstimos, contratos, cobranças e recebimentos. Desenvolvido para operadores que precisam acompanhar clientes, parcelas, vencimentos e fluxo de caixa de forma simples, rápida e acessível em mobile e web.

![Expo](https://img.shields.io/badge/Expo-56-black?style=flat-square&logo=expo)
![React Native](https://img.shields.io/badge/React%20Native-0.85-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat-square&logo=supabase)

---

## Sobre o projeto

O **Finn** nasceu para centralizar a operação comercial de negócios com cobranças recorrentes: empréstimos com parcelas, controle de inadimplência, registro de pagamentos e visão consolidada da carteira.

A proposta é ser **direto ao ponto**: cadastrar contrato, acompanhar vencimentos, registrar pagamento e enxergar o resultado financeiro sem complexidade desnecessária.

Hoje o sistema funciona como:

- **App mobile** (Android/iOS via Expo)
- **PWA / Web** instalável no navegador
- **Deploy web** compatível com Vercel

---

## Funcionalidades

### Autenticação e perfil

- Cadastro com e-mail e senha (Supabase Auth)
- Login com sessão persistente
- Confirmação de e-mail (quando habilitada no Supabase)
- Alteração de nome e senha
- Logout seguro
- Perfil com estatísticas da operação

### Gestão de clientes e contratos

- Cadastro de clientes com nome, telefone, endereço e observações
- Criação de contratos com:
  - Valor emprestado
  - Valor total a receber
  - Valor da parcela
  - Parcelas já pagas (para contratos importados/migrados)
  - Frequência: Diário, Semanal, Mensal ou Anual
- Edição completa do contrato
- Edição manual da próxima data de vencimento
- Exclusão de contratos (com cascade de cobranças e pagamentos)
- Busca por nome, telefone ou observação
- Filtros por status: Ativo, Atrasado, Quitado

### Controle financeiro

- Cálculo automático de:
  - Lucro esperado
  - Parcelas totais, pagas e restantes
  - Valor recebido
  - Saldo devedor (`total - pagamentos`)
  - Próximo vencimento
  - Status do contrato (ativo, atrasado, quitado)
- Registro de pagamentos sem bloqueio por data, enquanto houver saldo ou parcelas pendentes
- Avanço automático do vencimento conforme a periodicidade após cada pagamento
- Validações de integridade financeira (total ≥ emprestado, parcelas coerentes, etc.)

### Cobranças

- Geração automática de cobranças pendentes com base no próximo vencimento
- Dashboard com filtros: Hoje, Amanhã, Atrasadas, Esta semana
- Contador de cobranças pendentes e vencidas
- Destaque visual para inadimplência
- Marcação rápida como pago
- Integração com WhatsApp para lembretes

### Pagamentos

- Histórico global agrupado por mês
- Histórico individual por cliente
- Totais: hoje, mês atual e últimos 30 dias
- Resumo financeiro expandido no modal de detalhes

### Dashboard

- Carteira total e lucro esperado
- Capital emprestado e valor a receber
- Clientes ativos, quitados, cobranças pendentes e vencidas
- Listas operacionais:
  - Clientes atrasados
  - Pagamentos de hoje
  - Cobranças da semana
  - Pagos hoje
  - Contratos concluídos
- Indicadores de tendência e adimplência

### Produtividade

- Copiar telefone e endereço
- Abrir WhatsApp com mensagem pré-preenchida
- Ações rápidas nos cards de contrato
- Feedback visual e háptico após salvar ou registrar pagamento
- Estados vazios e loaders consistentes

### Backup e migração

- Exportação de dados via clipboard (JSON)
- Restauração manual de backup
- Migração automática de dados locais (AsyncStorage) para Supabase no primeiro login

### Internacionalização

- Português
- Inglês
- Espanhol

---

## Stack tecnológica

| Camada | Tecnologia |
|--------|------------|
| Framework | Expo 56 + React Native 0.85 |
| Linguagem | TypeScript 6 |
| Roteamento | Expo Router 56 |
| Backend / Auth | Supabase (Auth + PostgreSQL + RLS) |
| Estado global | React Context |
| Animações / UI | Reanimated, Expo Blur, Linear Gradient, SVG, Skia |
| Persistência local | AsyncStorage (idioma + migração legada) |
| Deploy Web | Vercel (export estático Expo) |

---

## Arquitetura

```
src/
├── app/                    # Telas (Expo Router)
│   ├── index.tsx           # Login / Cadastro
│   ├── (first)/            # Dashboard (Home)
│   ├── (second)/           # Clientes / Contratos
│   └── (third)/            # Perfil / Configurações
├── components/             # UI reutilizável
│   ├── base/               # Loading, dialogs, tabs, feedback
│   ├── card-client/        # Card de contrato
│   ├── organisms/          # Bento grid, animações
│   └── payment-*-modal/    # Modais de pagamento
├── contexts/               # Estado global
├── services/
│   ├── financialMetrics.ts # Regras de negócio financeiras
│   ├── storageService.ts   # CRUD Supabase
│   └── supabase.ts         # Cliente Supabase
├── types/                  # Modelos TypeScript
├── utils/                  # Helpers (telefone, clipboard, SSR, etc.)
├── hooks/                  # Hooks customizados
└── i18n/                   # Traduções
```

### Fluxo de dados

1. **AuthContext** gerencia sessão Supabase
2. **AppContext** carrega clientes, cobranças e pagamentos via `storageService`
3. **financialMetrics** calcula métricas, status e vencimentos
4. Cobranças são geradas e sincronizadas automaticamente a partir dos contratos ativos
5. Pagamentos atualizam contrato, saldo e próximo vencimento

### Modelo de domínio

| Entidade | Descrição |
|----------|-----------|
| `Client` | Contrato de empréstimo (cliente + dados financeiros) |
| `Charge` | Cobrança pendente ou paga vinculada a um contrato |
| `Payment` | Pagamento registrado |
| `Profile` | Perfil do operador (Supabase) |

---

## Banco de dados (Supabase)

Schema em `supabase/schema.sql`:

- `profiles` — perfil do usuário
- `clients` — contratos
- `charges` — cobranças
- `payments` — pagamentos

Recursos:

- Row Level Security (RLS) por `user_id`
- Triggers de `updated_at`
- Cascade delete entre entidades relacionadas
- Índices para consultas por usuário, cliente e vencimento

---

## Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Supabase (projeto criado)
- Expo Go (opcional, para testes mobile)

---

## Instalação e execução

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/finn.git
cd finn
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha o arquivo `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

### 4. Configurar o banco

No painel Supabase, execute o script:

```
supabase/schema.sql
```

### 5. Executar localmente

```bash
# Desenvolvimento
npm start

# Web
npm run web

# Android
npm run android

# iOS
npm run ios
```

### 6. Build para produção (Web)

```bash
npm run build:web
```

Saída em `dist/`, pronta para deploy.

---

## Deploy na Vercel

O projeto inclui `vercel.json` configurado para:

- **Build Command:** `npx expo export --platform web`
- **Output Directory:** `dist`

Variáveis obrigatórias na Vercel:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm start` | Inicia o Expo Dev Server |
| `npm run web` | Abre no navegador |
| `npm run android` | Abre no emulador/dispositivo Android |
| `npm run ios` | Abre no simulador/dispositivo iOS |
| `npm run build:web` | Gera build estático para web |
| `npm run test:metrics` | Executa testes das regras financeiras |

---

## Testes

Testes unitários das regras financeiras (parcelas, saldo, valor em trânsito):

```bash
npm run test:metrics
```

---

## Telas principais

| Rota | Tela | Função |
|------|------|--------|
| `/` | Login | Autenticação |
| `/(first)` | Home | Dashboard operacional |
| `/(second)` | Clientes | Contratos e cobranças |
| `/(third)` | Perfil | Configurações, backup, idioma |

---

## Regras de negócio (resumo)

- **Carteira total** = soma de `valorTotalReceber` de todos os contratos
- **Capital investido** = soma de `valorEmprestado`
- **Valor a receber** = soma dos saldos devedores de contratos ativos
- **Valor recebido** = parcelas iniciais + pagamentos registrados no app
- **Saldo devedor** = `valorTotalReceber - valorRecebido`
- **Próximo vencimento** = data oficial da próxima cobrança; avança +1 período após pagamento
- Contrato **quitado** quando saldo = 0 ou parcelas restantes = 0

---

## Roadmap

### Em evolução

- Notificações push de vencimento
- Exportação PDF / Excel
- Relatórios avançados por período
- App nativo publicado (Play Store / App Store)

### Concluído

- Autenticação Supabase
- Persistência em nuvem com RLS
- Dashboard operacional
- Cobranças automáticas
- Deploy web (PWA + Vercel)
- Internacionalização (PT/EN/ES)
- Edição manual de vencimento
- Pagamentos sequenciais sem bloqueio por data

---

## Screenshots

<img width="230" height="512" alt="image" src="https://github.com/user-attachments/assets/abd770aa-101b-4c40-8ffe-6c3f0cb35de3" />
<img width="230" height="512" alt="image" src="https://github.com/user-attachments/assets/d61071fc-381a-47ba-8c64-7006104fabbc" />
<img width="230" height="512" alt="image" src="https://github.com/user-attachments/assets/6bb2a85e-32dc-4f50-a548-28951afa5a29" />
<img width="230" height="512" alt="image" src="https://github.com/user-attachments/assets/2ad3d6c4-915f-4035-a3e9-ce2d5b7c4a42" />


---

## Contribuindo

1. Faça um fork do projeto
2. Crie uma branch (`git checkout -b feature/minha-feature`)
3. Commit suas alterações (`git commit -m 'feat: minha feature'`)
4. Push para a branch (`git push origin feature/minha-feature`)
5. Abra um Pull Request

---

## Licença

Este projeto é privado. Todos os direitos reservados.

---

## Autor

**Pablo Dias**  
Desenvolvedor de Software — Front-End, Mobile e Produtos Digitais

- GitHub: [github.com/stain603](https://github.com/stain603)
- LinkedIn: [linkedin.com/in/devpablodias](https://www.linkedin.com/in/devpablodias)

---

Desenvolvido para resolver necessidades reais de gestão comercial com simplicidade, eficiência e escalabilidade.
