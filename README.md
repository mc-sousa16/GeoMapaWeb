# GeoMAPAWeb - Manual de Manutenção e Atualização

Este documento serve como um guia para futuros mantenedores da plataforma GeoMAPAWeb, do Laboratório de Geoprocessamento, Modelagem e Análise de Processos Ambientais (GeoMAPA) da UNIFESP - Campus Diadema.

## Visão Geral do Projeto
O GeoMAPAWeb é uma plataforma web de código aberto para visualizar a suscetibilidade geológica a escorregamentos e apoiar a tomada de decisão no planejamento territorial. Usa HTML, CSS e JavaScript puro, com Leaflet.js, Chart.js e Tailwind carregados por CDN. Não há etapa de build nem `npm install`.

### Abas
1. **Início**: apresentação do projeto, guia rápido e equipe.
2. **Suscetibilidade**: mapa de escorregamentos com seletor de município, filtro por classe de estabilidade (S1 Estável, S2 Pouco Estável, S3 Instável), transparência, equipamentos públicos (escolas, saúde, abrigos) e mapas de fundo (OpenStreetMap, Satélite Esri, Topográfico).
3. **Gestão**: área de risco, equipamentos atingidos, população exposta, gráficos Chart.js, tabelas exportáveis em CSV e impressão/PDF.
4. **Guia do Estudante**: passo a passo para publicar uma nova camada.
5. **Repositório**: links para os arquivos de cada município.

### Estrutura dos arquivos
```text
/
├── index.html              estrutura das abas
├── css/style.css           estilos próprios
├── js/
│   ├── config.js           PONTOS DE CUSTOMIZAÇÃO: camadas, equipamentos, cores, textos
│   ├── layers.js           carrega os GeoJSON, calcula áreas e guarda os filtros
│   ├── ui.js               funções de interface comuns
│   ├── map.js              criação dos mapas Leaflet, mapas de fundo e legendas
│   ├── suscetibilidade.js  aba Suscetibilidade
│   ├── gestao.js           aba Gestão
│   ├── repositorio.js      aba Repositório
│   ├── gemini.js           Análise Inteligente (API Gemini)
│   └── app.js              navegação e inicialização
├── data/
│   ├── geologico/suscetibilidade_sp.geojson   polígonos de suscetibilidade
│   └── equipamentos_publicos.geojson   pontos de escolas, saúde e abrigos
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
* Colunas esperadas: `id_zona`, `municipio`, `is_valor`, `classe_estabilidade`, `grau_risco`, `populacao`, `fonte_risco`, `fonte_populacao`.
* Em `js/config.js`, copie um bloco da lista `suscetibilidade.camadas` e troque `id`, `arquivo` e `municipio`. Se as colunas tiverem outros nomes, ajuste `campoClasse`, `campoIS`, `campoGrau`, `campoPopulacao` e `campoMunicipio`.
* A classe de cada polígono é lida de `classe_estabilidade`. Se essa coluna faltar, o site usa `is_valor` e, por último, `grau_risco`.

#### Metodologia (Soares Jr. et al., 2022)
Índice de Suscetibilidade: IS = Σ(Ri × Pij), com pesos declividade 0,40, litologia 0,20, uso do solo 0,20, curvatura 0,10 e lineamentos 0,10.

| Classe | Faixa de IS | Grau de risco |
|---|---|---|
| S1: Estável | IS < 2,99 | Muito Baixo / Baixo |
| S2: Pouco Estável | 2,99 ≤ IS < 3,53 | Moderado |
| S3: Instável | IS ≥ 3,53 | Alto / Muito Alto |

### 2. Para atualizar os equipamentos públicos
* Substitua `data/equipamentos_publicos.geojson` por um GeoJSON de pontos com as colunas `id`, `nome`, `tipo` (ex.: "Escola", "UBS", "Centro de Acolhida"), `municipio`, `endereco` e `fonte`.
* Os tipos são agrupados nas categorias Educação, Saúde e Assistência Social, definidas em `suscetibilidade.equipamentos.categorias`. Tipos não listados aparecem como "Outros".
* Um equipamento é contado como atingido quando está dentro de uma zona cuja `classe_estabilidade` ou `grau_risco` esteja nas classes de risco ativas.

### 3. Para atualizar o Repositório de Dados (PDFs, links)
* Faça o upload do arquivo para algum lugar online (Google Drive ou o próprio GitHub).
* Edite `databaseData` em `js/config.js`.

### 4. Para ajustar a aba Gestão
* As ações recomendadas para cada classe ficam em `acoesPorClasse`.
* As classes de risco padrão ficam em `suscetibilidade.classesDeRisco` (`S3: Instável`, `Alto`, `Muito Alto`). Na aba Gestão, um seletor inclui também `S2: Pouco Estável` / `Moderado` (lista `classesDeRiscoOpcionais`).
* A população exposta soma a coluna `populacao` só dos polígonos nas classes de risco ativas.

### 5. Para alterar a aparência (textos, imagens, logos)
* Textos da página inicial, equipe, logos e o Guia do Estudante podem ser alterados diretamente no `index.html`.
* Cores das classes ficam em `suscetibilidade.classes` e os mapas de fundo em `mapasBase`, no `js/config.js`.

## Contato
- **Desenvolvedora Original:** Millena de Castro Sousa
- **Orientador:** Prof. Dr. Adilson V. Soares Junior
