// Configuração central da plataforma. Quase toda atualização de conteúdo acontece aqui.
window.GeoMAPA = window.GeoMAPA || {};

GeoMAPA.config = {

    // --- PONTO DE CUSTOMIZAÇÃO: VISTA INICIAL DO MAPA --- //
    mapa: {
        centro: [-23.56, -46.04], // Biritiba Mirim
        zoom: 12
    },

    // --- PONTO DE CUSTOMIZAÇÃO: CORES DA PLATAFORMA --- //
    riskColors: { 'Alto': '#E57373', 'Médio': '#FFB74D', 'Baixo': '#81C784' },
    // Ordem em que as classes aparecem em filtros, legendas e gráficos.
    classesRisco: ['Alto', 'Médio', 'Baixo'],

    // --- PONTO DE CUSTOMIZAÇÃO: MAPAS DE FUNDO --- //
    mapasBase: [
        {
            id: 'claro',
            nome: 'Claro (CARTO)',
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        },
        {
            id: 'osm',
            nome: 'OpenStreetMap',
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        },
        {
            id: 'satelite',
            nome: 'Satélite (Esri)',
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: 'Imagens &copy; Esri, Maxar, Earthstar Geographics'
        }
    ],

    // --- PONTO DE CUSTOMIZAÇÃO: CAMADAS TEMÁTICAS --- //
    // Para adicionar uma camada:
    //   1. Crie um arquivo em data/ (copie data/biritiba-mirim-suscetibilidade.js como modelo).
    //   2. Inclua esse arquivo com uma tag <script> no index.html, antes de js/config.js.
    //   3. Adicione uma entrada nesta lista.
    // tipo 'suscetibilidade': polígonos coloridos por classe de risco, entram nos filtros e na aba Gestão.
    // tipo 'tematica': polígonos ou linhas com cor fixa (ex.: limites, drenagem, litologia).
    camadas: [
        {
            id: 'biritiba-mirim-suscetibilidade',
            nome: 'Suscetibilidade a escorregamentos',
            municipio: 'Biritiba Mirim',
            tipo: 'suscetibilidade',
            // Nome da coluna do GeoJSON com a classe e como converter seus valores.
            campoRisco: 'value',
            mapeamentoRisco: { 1: 'Baixo', 2: 'Médio', 3: 'Alto' },
            visivel: true
        }
        // Exemplo de camada temática:
        // { id: 'biritiba-mirim-limite', nome: 'Limite municipal', municipio: 'Biritiba Mirim',
        //   tipo: 'tematica', cor: '#2F4F4F', visivel: true }
    ],

    // --- PONTO DE CUSTOMIZAÇÃO: GESTÃO E TOMADA DE DECISÃO --- //
    // Ações sugeridas por classe, exibidas na aba Gestão. Ajuste com a equipe do laboratório.
    acoesPorClasse: {
        'Alto': 'Priorizar vistoria de campo, mapeamento de moradias expostas e inclusão no plano de contingência da Defesa Civil.',
        'Médio': 'Monitorar sinais de instabilidade (trincas, surgências) e restringir novas ocupações sem estudo geotécnico.',
        'Baixo': 'Manter fiscalização do uso do solo e boas práticas de drenagem nas novas ocupações.'
    },

    // --- PONTO DE CUSTOMIZAÇÃO: DADOS DO REPOSITÓRIO --- //
    // Adicione aqui os links para os arquivos de cada município.
    databaseData: {
        "Biritiba Mirim": {
            "Litologia": { type: "link", url: "#", description: "Mapa de litologia do município." },
            "Uso do Solo": { type: "link", url: "#", description: "Mapa de uso e ocupação do solo." },
            "Declividade": { type: "link", url: "#", description: "Mapa de declividade do terreno." },
            "Suscetibilidade (Dados)": { type: "data", url: "#", description: "Dados vetoriais da carta de suscetibilidade (GeoJSON)." },
            "Carta de Suscetibilidade (PDF)": { type: "pdf", url: "https://storage.googleapis.com/files-maker-in-prod/2024/8/29/CARTA-sus-biritiba_mirim-2025.pdf_1724959114674_0.pdf", description: "Versão final da carta para download." }
        },
        "Mogi das Cruzes (Exemplo)": {
            "Litologia": { type: "link", url: "#", description: "Dados indisponíveis." },
            "Uso do Solo": { type: "link", url: "#", description: "Dados indisponíveis." }
        }
    }
};
