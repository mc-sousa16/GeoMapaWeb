# GeoMAPAweb - Manual de Manutenção e Atualização

Este documento serve como um guia para futuros mantenedores da plataforma GeoMAPAweb.

## Visão Geral do Projeto
O GeoMAPAweb é uma plataforma de código aberto para visualização de mapas de suscetibilidade geológica. O projeto foi desenvolvido em um único arquivo HTML, utilizando JavaScript puro e as bibliotecas Leaflet.js e Chart.js.

## Como Atualizar a Plataforma

A plataforma está hospedada no GitHub Pages e é atualizada automaticamente sempre que uma nova alteração é enviada para o repositório.

**O fluxo de trabalho é:**
1.  **Clone o repositório:** Baixe a versão mais recente do projeto para o seu computador.
2.  **Edite o arquivo `index.html`:** Abra o arquivo em um editor de texto para fazer as alterações.
3.  **Teste localmente:** Salve o arquivo e abra-o diretamente no seu navegador para ver se as mudanças funcionaram.
4.  **Envie as alterações:** Use o Git para enviar o arquivo `index.html` atualizado de volta para o GitHub. A plataforma online será atualizada em minutos.

## Editando o Conteúdo

As principais atualizações são feitas em locais específicos dentro do arquivo `index.html`, marcados com comentários.

### 1. Para Adicionar Novos Dados Geoespaciais (Mapas):
* **Atenção:** Os dados (Shapefiles) precisam ser convertidos para o formato **GeoJSON** com o sistema de coordenadas **EPSG:4326 - WGS 84** usando o QGIS.
* Abra o `index.html` e procure pela seção: `// --- PONTO DE CUSTOMIZAÇÃO: CARREGAMENTO DE DADOS --- //`
* Apague o conteúdo antigo e cole o conteúdo do novo arquivo GeoJSON dentro da variável `geojsonData`.

### 2. Para Atualizar o Repositório de Dados (PDFs, Links):
* Faça o upload do novo arquivo (ex: um PDF) para algum lugar online (como Google Drive, ou o próprio GitHub).
* Procure pela seção: `// --- PONTO DE CUSTOMIZAÇÃO: DADOS DO REPOSITÓRIO --- //`
* Edite a variável `databaseData`, adicionando ou alterando os links e descrições dos arquivos para o município correspondente.

### 3. Para Alterar a Aparência (Textos, Imagens, Logos):
* Os textos da página inicial, informações da equipe e logos podem ser alterados diretamente no HTML, na seção `<section id="home">`.
* As cores da plataforma podem ser ajustadas na seção `// --- PONTO DE CUSTOMIZAÇÃO: CORES DA PLATAFORMA --- //`.

## Contato
- **Desenvolvedora Original:** Millena de Castro Sousa
- **Orientador:** Prof. Dr. Adilson V. Soares Junior
