# GeoMAPAWeb - Manual de Manutenção e Atualização

Este documento serve como um guia para futuros mantenedores da plataforma GeoMAPAWeb, do Laboratório de Geoprocessamento, Modelagem e Análise de Processos Ambientais (GeoMAPA) da UNIFESP - Campus Diadema.

## Visão Geral do Projeto
O GeoMAPAWeb é uma plataforma web de código aberto para visualizar riscos ambientais (suscetibilidade geológica e risco de inundação costeira) e apoiar a tomada de decisão no planejamento territorial. Usa HTML, CSS e JavaScript puro, com Leaflet.js, Chart.js e Tailwind carregados por CDN. Não há etapa de build nem `npm install`.

### Abas
1. **Início**: apresentação do projeto, guia rápido e equipe.
2. **Suscetibilidade**: mapa de escorregamentos com seletor de município, filtro por grau (Baixa, Média, Alta, Muito Alta), transparência e mapas de fundo (OpenStreetMap, Satélite Esri, Topográfico).
3. **Risco Costeiro**: cenários de elevação do nível do mar em Aracaju-SE, equipamentos públicos (escolas, saúde, abrigos) e legenda com área vulnerável e equipamentos atingidos.
4. **Gestão**: indicadores, gráficos Chart.js, tabelas exportáveis em CSV e impressão/PDF.
5. **Guia do Estudante**: passo a passo para publicar uma nova camada.
6. **Repositório**: links para os arquivos de cada município.

### Estrutura dos arquivos
```text
/
├── index.html              estrutura das abas
├── css/style.css           estilos próprios
├── js/
│   ├── config.js           PONTOS DE CUSTOMIZAÇÃO: camadas, cenários, cores, textos
│   ├── layers.js           carrega os GeoJSON, calcula áreas e guarda os filtros
│   ├── ui.js               funções de interface comuns
│   ├── map.js              criação dos mapas Leaflet, mapas de fundo e legendas
│   ├── suscetibilidade.js  aba Suscetibilidade
│   ├── costeiro.js         aba Risco Costeiro
│   ├── gestao.js           aba Gestão
│   ├── repositorio.js      aba Repositório
│   ├── gemini.js           Análise Inteligente (API Gemini)
│   └── app.js              navegação e inicialização
├── data/
│   ├── geologico/          GeoJSON de suscetibilidade
│   └── costeiro/           GeoJSON de inundação e equipamentos
└── assets/                 imagens e logos
```

## Como Atualizar a Plataforma

A plataforma está hospedada no GitHub Pages e é atualizada automaticamente sempre que uma nova alteração é enviada para o repositório.

1. **Edite os arquivos:** na maior parte das vezes, só `js/config.js` e a pasta `data/` mudam.
2. **Teste localmente:** o navegador não lê os GeoJSON se o `index.html` for aberto com dois cliques. Use a extensão *Live Server* do VS Code ou rode `python -m http.server` na pasta do projeto e abra `http://localhost:8000`. No GitHub Codespaces, rode o mesmo comando e abra a porta 8000.
3. **Envie as alterações:** faça o commit no GitHub. O site é atualizado em poucos minutos.

Se algum arquivo não carregar, um aviso amarelo aparece no topo do site dizendo qual.

## Editando o Conteúdo

As atualizações são feitas em locais marcados com o comentário `PONTO DE CUSTOMIZAÇÃO`, quase todos em `js/config.js`.

### 1. Para adicionar uma camada de suscetibilidade
* Exporte o GeoJSON no QGIS em **EPSG:4326 - WGS 84**.
* Salve em `data/geologico/`, com nome sem espaços nem acentos.
* Em `js/config.js`, copie um bloco da lista `suscetibilidade.camadas` e troque `id`, `arquivo`, `municipio` e `campoClasse` (coluna do grau). Se a coluna tiver números, use `mapeamentoClasse` para convertê-los em Baixa, Média, Alta e Muito Alta.

### 2. Para adicionar um cenário de inundação costeira
* Salve o GeoJSON da área inundada em `data/costeiro/`.
* Em `js/config.js`, copie um bloco de `costeiro.cenarios`. Se o GeoJSON tiver uma coluna com a população de cada polígono, informe-a em `campoPopulacao` para a aba Gestão estimar a população exposta.
* Os equipamentos públicos ficam em `data/costeiro/aracaju_equipamentos.geojson` (pontos com as colunas `tipo` e `nome`; os tipos aceitos estão em `costeiro.equipamentos.tipos`).

### 3. Para atualizar o Repositório de Dados (PDFs, links)
* Faça o upload do arquivo para algum lugar online (Google Drive ou o próprio GitHub).
* Edite `databaseData` em `js/config.js`.

### 4. Para ajustar a aba Gestão
* As ações recomendadas para cada grau ficam em `acoesPorClasse`.
* As classes somadas no indicador "área de risco" ficam em `suscetibilidade.classesDeRisco`.

### 5. Para alterar a aparência (textos, imagens, logos)
* Textos da página inicial, equipe, logos e o Guia do Estudante podem ser alterados diretamente no `index.html`.
* Cores das classes ficam em `suscetibilidade.classes` e os mapas de fundo em `mapasBase`, no `js/config.js`.

## Contato
- **Desenvolvedora Original:** Millena de Castro Sousa
- **Orientador:** Prof. Dr. Adilson V. Soares Junior
