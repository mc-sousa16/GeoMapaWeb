# GeoMAPAweb - Manual de Manutenção e Atualização

Este documento serve como um guia para futuros mantenedores da plataforma GeoMAPAweb.

## Visão Geral do Projeto
O GeoMAPAweb é uma plataforma de código aberto para visualização de mapas de suscetibilidade geológica. O projeto usa HTML, JavaScript puro e as bibliotecas Leaflet.js e Chart.js, sem etapa de build: basta abrir o `index.html` no navegador.

### Estrutura dos arquivos
* `index.html`: estrutura das abas (Início, Mapa Interativo, Gestão, Repositório de Dados).
* `css/styles.css`: estilos próprios da plataforma.
* `data/`: um arquivo `.js` por camada GeoJSON.
* `js/config.js`: **pontos de customização** (camadas, cores, mapas de fundo, ações por classe de risco, links do repositório).
* `js/data.js`: prepara os dados (classe de risco, área em km²) e guarda os filtros compartilhados.
* `js/map.js`: mapa Leaflet, mapas de fundo, camadas e legenda.
* `js/filters.js`: seletor de camadas e painel de filtros da barra lateral.
* `js/charts.js`: gráfico ao lado do mapa.
* `js/gestao.js`: aba Gestão / Tomada de Decisão (indicadores, gráficos e prioridade por município).
* `js/repositorio.js`, `js/gemini.js`, `js/app.js`: repositório de dados, análise com IA e navegação.

## Como Atualizar a Plataforma

A plataforma está hospedada no GitHub Pages e é atualizada automaticamente sempre que uma nova alteração é enviada para o repositório.

**O fluxo de trabalho é:**
1.  **Clone o repositório:** Baixe a versão mais recente do projeto para o seu computador.
2.  **Edite os arquivos:** Na maior parte das vezes, só `js/config.js` e a pasta `data/` precisam mudar.
3.  **Teste localmente:** Salve o arquivo e abra-o diretamente no seu navegador para ver se as mudanças funcionaram.
4.  **Envie as alterações:** Use o Git para enviar os arquivos alterados de volta para o GitHub. A plataforma online será atualizada em minutos.

## Editando o Conteúdo

As principais atualizações são feitas em locais marcados com o comentário `PONTO DE CUSTOMIZAÇÃO`, quase todos em `js/config.js`.

### 1. Para Adicionar Novos Dados Geoespaciais (Mapas):
* **Atenção:** Os dados (Shapefiles) precisam ser convertidos para o formato **GeoJSON** com o sistema de coordenadas **EPSG:4326 - WGS 84** usando o QGIS.
* Para atualizar a carta de Biritiba Mirim, abra `data/biritiba-mirim-suscetibilidade.js` e cole o conteúdo do GeoJSON no lugar do objeto `FeatureCollection`.
* Para uma **nova camada** (outro município ou outro tema):
  1. Copie `data/biritiba-mirim-suscetibilidade.js` para um novo arquivo em `data/`, trocando o identificador entre colchetes.
  2. Inclua o novo arquivo com uma tag `<script>` no `index.html`, junto da já existente.
  3. Adicione uma entrada em `camadas`, no `js/config.js`. Camadas do tipo `suscetibilidade` entram nos filtros e na aba Gestão; informe em `campoRisco` o nome da coluna da classe no GeoJSON e em `mapeamentoRisco` como converter seus valores.

### 2. Para Atualizar o Repositório de Dados (PDFs, Links):
* Faça o upload do novo arquivo (ex: um PDF) para algum lugar online (como Google Drive, ou o próprio GitHub).
* Procure pela seção: `// --- PONTO DE CUSTOMIZAÇÃO: DADOS DO REPOSITÓRIO --- //`
* Edite `databaseData` em `js/config.js`, adicionando ou alterando os links e descrições dos arquivos para o município correspondente.

### 3. Para Ajustar a Aba Gestão:
* As ações recomendadas para cada classe de risco ficam em `acoesPorClasse`, no `js/config.js`.

### 4. Para Alterar a Aparência (Textos, Imagens, Logos):
* Os textos da página inicial, informações da equipe e logos podem ser alterados diretamente no HTML, na seção `<section id="home">`.
* As cores das classes de risco ficam em `riskColors` e os mapas de fundo em `mapasBase`, no `js/config.js`.

## Contato
- **Desenvolvedora Original:** Millena de Castro Sousa
- **Orientador:** Prof. Dr. Adilson V. Soares Junior
