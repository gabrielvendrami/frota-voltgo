# VoltGo Frota — gestão da frota elétrica

Painel administrativo para gerenciar a frota de veículos elétricos (BYD),
motoristas, vínculos, quilometragem, cobrança via Pix e geração de contrato.
Feito em Next.js para publicar na Vercel com banco Postgres (Neon).

## Módulos

1. **Veículos** — placa, modelo, cor, ano, chassi, Renavam, valor semanal de
   **locação** e de **seguro** (separados, como no contrato), status.
2. **Motoristas** — nome, e-mail, CPF, CNH, endereço, data de nascimento,
   telefone/WhatsApp.
3. **Vínculos** — liga um motorista a um veículo disponível (um vínculo ativo por vez
   para cada um); encerrar libera o veículo para um novo vínculo.
4. **Quilometragem** — registra a leitura do hodômetro por veículo/data. É a partir
   dessas leituras que o sistema calcula o KM rodado no mês.
   - Cada veículo tem um **link público de envio** (`/km/<placa>`, sem login) que
     você manda pelo WhatsApp do motorista. Nele, uma vez por semana, o motorista
     digita a quilometragem atual e tira uma foto do painel do hodômetro — bem
     simples, pensado pra quem não tem tanta intimidade com celular.
   - Na tela de Quilometragem do admin, cada veículo mostra um selo **"✅ Enviou
     essa semana"** ou **"⏳ Pendente essa semana"**, e dá pra copiar o link com um
     toque. O histórico mostra se cada leitura veio do motorista ou foi lançada
     manualmente, com link pra ver a foto enviada.
   - Se o motorista digitar uma quilometragem menor que a última registrada, o
     sistema recusa e pede pra conferir o hodômetro (evita erro de digitação).
5. **Cobrança** — escolhe um vínculo ativo, informa o valor semanal (vem pré-preenchido
   com a soma de locação + seguro do veículo, mas pode ajustar), e o sistema:
   - calcula o KM rodado no mês atual (última leitura do mês menos a última leitura
     anterior ao mês);
   - se passar de **8.000 km/mês** (configurável), cobra **R$ 0,70/km** excedente
     (configurável — ver observação sobre o valor logo abaixo);
   - gera uma mensagem pronta para o WhatsApp com o resumo e o **código Pix copia e
     cola** já embutido;
   - abre direto no WhatsApp do motorista (usa o telefone cadastrado) ou permite
     copiar a mensagem/código separadamente;
   - fica salva no histórico, podendo ser marcada como paga.
6. **Contrato** — a partir de um vínculo ativo, gera e baixa o **.docx** do contrato
   oficial (modelo que você enviou) já preenchido com os dados do motorista e do
   veículo: nome, CPF, CNH, endereço, placa, cor, chassi, valor de locação, valor de
   seguro, valor total (por extenso), franquia de KM, valor do km excedente (por
   extenso), franquia do sinistro e data.

> **Sobre o valor do km excedente:** no pedido original você mencionou R$ 0,75/km,
> mas o modelo de contrato que você enviou (cláusula 2.5) está escrito com
> **R$ 0,70/km**. Deixei **R$ 0,70** como padrão, por ser o valor que está no
> documento assinado — ajuste pela variável `VALOR_KM_EXCEDENTE` se R$ 0,75 for o
> valor correto (ela alimenta tanto a cobrança quanto o texto do contrato, então
> ajustar a variável já corrige os dois lugares, sem precisar editar o .docx).

Pensado para uso fácil no celular: botões grandes, uma ação por tela, textos diretos.

## Login

```
usuário: admin
senha:   admin
```

Troque em `ADMIN_USER` / `ADMIN_PASSWORD` (variáveis de ambiente) antes de usar com a
equipe — hoje é um login único compartilhado, sem usuários/senhas individuais.

## Banco de dados

Postgres via `pg`, compatível com o Postgres/Neon oferecido pela Vercel. As tabelas
são criadas automaticamente (`CREATE TABLE IF NOT EXISTS`) na primeira requisição que
tocar o banco — não precisa rodar nenhum script manual.

## Pix (cobrança)

O código "copia e cola" é gerado localmente (sem depender de nenhum serviço externo
ou gateway), seguindo o padrão oficial do Banco Central (BR Code / EMV). Configure
pelas variáveis de ambiente:

- `PIX_KEY` — a chave Pix que recebe (já veio preenchida com o CNPJ informado:
  `06914540000167`).
- `PIX_MERCHANT_NAME` — "EDINALDO ALVES RIBEIRO"
- `PIX_MERCHANT_CITY` — "BAURU SP"

Esses mesmos valores também aparecem no texto do contrato (nome/CNPJ da locadora e
cidade do foro) — ajuste-os antes de gerar contratos de verdade.

## Fotos do hodômetro (Vercel Blob)

As fotos enviadas pelo motorista em `/km/<placa>` são guardadas no **Vercel Blob**
(armazenamento de arquivos da própria Vercel). Pra habilitar:

1. No projeto na Vercel, aba **Storage** → **Create Database** → **Blob**.
2. Na hora de criar, escolha **Private** (não Public) — essa escolha não pode ser
   trocada depois. O sistema já está preparado pra isso: a foto nunca fica
   acessível por link direto, só por quem está logado no painel (a tela de
   Quilometragem busca a foto através de `/admin/fotos/<id>`, que exige login e
   busca o conteúdo no Blob usando o token no servidor).
3. Conecte o Blob ao projeto (injeta `BLOB_READ_WRITE_TOKEN` automaticamente,
   igual ao Postgres) e faça o redeploy.

Sem essa variável configurada, o envio de foto falha em produção com uma mensagem
pedindo pra conectar o Blob. Rodando localmente (`npm run dev`), as fotos caem num
fallback em `public/uploads/` só pra facilitar o teste.

## Franquia de quilometragem

- `KM_FRANQUIA_MENSAL` (padrão 8000)
- `VALOR_KM_EXCEDENTE` (padrão 0.70, em reais por km — ver observação acima sobre
  0,70 vs. 0,75)
- `FRANQUIA_SINISTRO_VALOR` (padrão 8845, franquia do seguro em caso de sinistro —
  cláusula 3.2 do contrato)

## Contrato — modelo

O arquivo `templates/contrato-modelo.docx` **é o modelo oficial que você enviou**
(`Contrato_Locacao_Veiculo_Eletrico_V6.docx`), com o texto jurídico e a formatação
originais preservados. As únicas mudanças foram inserir, nos campos em branco do
próprio documento, as tags entre chaves que o sistema preenche automaticamente ao
gerar cada contrato:

`{nome_motorista}` `{cpf_motorista}` `{cnh_motorista}` `{telefone_motorista}`
`{endereco_motorista}` `{modelo_veiculo}` `{cor_veiculo}` `{placa_veiculo}`
`{chassi_veiculo}` `{data_inicio_vinculo}` `{valor_total_semanal_fmt}`
`{valor_total_semanal_extenso}` `{valor_locacao_semanal_fmt}`
`{valor_seguro_semanal_fmt}` `{km_franquia_mensal_fmt}` `{valor_km_excedente_fmt}`
`{valor_km_excedente_extenso}` `{franquia_sinistro_fmt}` `{pix_key}`
`{data_contrato_extenso}`

Os dados da **locadora** (razão social, CNPJ, endereço) ficaram como texto fixo no
documento, exatamente como no modelo enviado — são dados fixos da empresa, não do
motorista/veículo, então não há necessidade de parametrizar.

Se precisar trocar o modelo no futuro (nova versão do contrato, cláusulas
diferentes etc.), é só repetir o processo: abrir o novo .docx no Word, inserir essas
mesmas tags nos lugares certos, salvar como `templates/contrato-modelo.docx`
(substituindo o atual) e fazer o deploy de novo.

## Como colocar no ar (Vercel)

1. Suba esta pasta para um repositório no GitHub (ou GitLab/Bitbucket).
2. Na Vercel, **Add New → Project** e importe o repositório.
3. Aba **Storage** do projeto → **Create Database** → **Postgres** (Neon) → conecte
   ao projeto (injeta `POSTGRES_URL` / `DATABASE_URL` automaticamente).
3.1. Ainda em **Storage** → **Create Database** → **Blob** (escolha **Private**) →
   conecte ao projeto também (injeta `BLOB_READ_WRITE_TOKEN`) — é o que guarda as
   fotos do hodômetro enviadas pelos motoristas. Veja a seção "Fotos do hodômetro"
   mais abaixo.
4. Em **Settings → Environment Variables**, adicione:
   - `SESSION_SECRET` — string aleatória (ex.: `openssl rand -hex 32`).
   - `ADMIN_USER` / `ADMIN_PASSWORD` — opcional, senão fica `admin` / `admin`.
   - `PIX_KEY`, `PIX_MERCHANT_NAME`, `PIX_MERCHANT_CITY` — ver seção Pix acima.
   - `KM_FRANQUIA_MENSAL`, `VALOR_KM_EXCEDENTE`, `FRANQUIA_SINISTRO_VALOR` — se
     quiser mudar os padrões.
5. Deploy.
6. Acesse `/admin`, entre com o login e comece cadastrando os 7 veículos e os
   motoristas.

## Rodando localmente

```bash
npm install
vercel env pull .env.local   # puxa as variáveis (banco, etc.) do projeto na Vercel
npm run dev
```

## Próximos passos sugeridos

- **Controle financeiro / despesas**: dá pra evoluir a tabela `cobrancas` (já existe)
  somando também custos (manutenção, recarga, multas) por veículo, e construir um
  relatório de resultado por carro/motorista.
- **Múltiplos usuários no painel**: hoje é um único usuário/senha fixo via variável
  de ambiente. Se mais de uma pessoa for usar com login próprio, vale evoluir para
  uma tabela de usuários com senha criptografada (bcrypt).
- **Confirmação automática do Pix**: hoje "marcar como paga" é manual. Para
  confirmar automaticamente, seria necessário integrar com a API de um banco/PSP que
  notifique pagamentos recebidos (webhook) — o CNPJ/chave sozinhos não permitem isso.
- **Histórico de vínculos por motorista**: já fica registrado quando um vínculo é
  encerrado (tabela `vinculos`), então dá pra montar uma tela de histórico completo
  por motorista ou por veículo depois.
