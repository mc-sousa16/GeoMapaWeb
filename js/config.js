/*
 * config.js: CADASTRO DE CAMADAS E PONTOS DE CUSTOMIZAÇÃO
 *
 * Este é o arquivo que um novo aluno do laboratório mais vai editar.
 * Para uma nova camada aparecer no site:
 *   1. Exporte o GeoJSON no QGIS em EPSG:4326 (WGS 84).
 *   2. Salve o arquivo em data/geologico/ ou data/costeiro/.
 *   3. Copie um dos blocos de camada abaixo e troque o caminho (arquivo) e o nome.
 * Nada mais precisa ser alterado: menus, filtros, legendas e gráficos se montam sozinhos.
 */
window.GeoMAPA = window.GeoMAPA || {};

GeoMAPA.config = {

    // --- PONTO DE CUSTOMIZAÇÃO: MAPAS DE FUNDO --- //
    // Aparecem no seletor de mapa de fundo (canto superior direito de cada mapa).
    mapasBase: [
        {
            nome: 'OpenStreetMap',
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        },
        {
            nome: 'Satélite (Esri)',
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: 'Imagens &copy; Esri, Maxar, Earthstar Geographics'
        },
        {
            nome: 'Topográfico (OpenTopoMap)',
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attribution: '&copy; OpenStreetMap contributors, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
            maxZoom: 17
        }
    ],

    // =====================================================================
    // ABA SUSCETIBILIDADE GEOLÓGICA
    // =====================================================================
    suscetibilidade: {
        // --- PONTO DE CUSTOMIZAÇÃO: VISTA INICIAL --- //
        centro: [-23.56, -46.04],
        zoom: 11,

        // --- PONTO DE CUSTOMIZAÇÃO: CLASSES E CORES --- //
        // Ordem da mais grave para a menos grave. Usada em filtros, legenda e gráficos.
        classes: [
            { nome: 'Muito Alta', cor: '#B71C1C' },
            { nome: 'Alta', cor: '#E57373' },
            { nome: 'Média', cor: '#FFB74D' },
            { nome: 'Baixa', cor: '#81C784' }
        ],
        // Classes somadas no indicador "área de risco" da aba Gestão.
        classesDeRisco: ['Muito Alta', 'Alta'],

        // --- PONTO DE CUSTOMIZAÇÃO: CAMADAS DE SUSCETIBILIDADE --- //
        // arquivo: caminho do GeoJSON a partir da raiz do site.
        // municipio: nome usado no seletor de município. Se o GeoJSON tiver vários
        //            municípios, informe a coluna em campoMunicipio.
        // campoClasse: coluna do GeoJSON com o grau de suscetibilidade.
        // mapeamentoClasse: converte o valor da coluna no nome da classe
        //                   (apague se a coluna já vier escrita como "Alta", "Média"...).
        camadas: [
            {
                id: 'biritiba_mirim_suscetibilidade',
                nome: 'Suscetibilidade a escorregamentos',
                arquivo: 'data/geologico/biritiba_mirim_suscetibilidade.geojson',
                municipio: 'Biritiba Mirim',
                campoMunicipio: null,
                campoClasse: 'value',
                mapeamentoClasse: { 1: 'Baixa', 2: 'Média', 3: 'Alta', 4: 'Muito Alta' }
            }
            // Exemplo de nova camada:
            // {
            //     id: 'diadema_suscetibilidade',
            //     nome: 'Suscetibilidade a escorregamentos',
            //     arquivo: 'data/geologico/diadema_suscetibilidade.geojson',
            //     municipio: 'Diadema',
            //     campoClasse: 'classe'
            // }
        ]
    },

    // =====================================================================
    // ABA RISCO COSTEIRO E INUNDAÇÃO
    // =====================================================================
    costeiro: {
        // --- PONTO DE CUSTOMIZAÇÃO: VISTA INICIAL --- //
        centro: [-10.95, -37.07], // Aracaju-SE
        zoom: 12,
        corInundacao: '#1E88E5',

        // --- PONTO DE CUSTOMIZAÇÃO: CENÁRIOS DE ELEVAÇÃO DO NÍVEL DO MAR --- //
        // Um arquivo GeoJSON por cenário, com os polígonos da área inundada.
        // campoPopulacao (opcional): coluna com a população residente em cada polígono,
        // usada na estimativa de população exposta da aba Gestão.
        cenarios: [
            {
                id: 'aracaju_0_5m',
                nome: '+0,5 m',
                descricao: 'Elevação de 0,5 m do nível médio do mar',
                arquivo: 'data/costeiro/aracaju_inundacao_0_5m.geojson',
                campoPopulacao: 'populacao'
            },
            {
                id: 'aracaju_1_0m',
                nome: '+1,0 m',
                descricao: 'Elevação de 1,0 m do nível médio do mar',
                arquivo: 'data/costeiro/aracaju_inundacao_1_0m.geojson',
                campoPopulacao: 'populacao'
            }
        ],

        // --- PONTO DE CUSTOMIZAÇÃO: EQUIPAMENTOS PÚBLICOS --- //
        // GeoJSON de pontos. campoTipo é a coluna que diz se é escola, saúde ou abrigo,
        // e campoNome a coluna com o nome exibido no popup.
        equipamentos: {
            arquivo: 'data/costeiro/aracaju_equipamentos.geojson',
            campoTipo: 'tipo',
            campoNome: 'nome',
            tipos: [
                { valor: 'escola', nome: 'Escolas', cor: '#6A1B9A' },
                { valor: 'saude', nome: 'Postos de Saúde', cor: '#C62828' },
                { valor: 'abrigo', nome: 'Abrigos', cor: '#2E7D32' }
            ]
        }
    },

    // =====================================================================
    // ABA GESTÃO E TOMADA DE DECISÃO
    // =====================================================================
    // --- PONTO DE CUSTOMIZAÇÃO: AÇÕES RECOMENDADAS --- //
    // Texto exibido para cada classe. Revise com a equipe do laboratório.
    acoesPorClasse: {
        'Muito Alta': 'Vistoria imediata, cadastro de moradias expostas e inclusão prioritária no plano de contingência da Defesa Civil.',
        'Alta': 'Vistoria de campo, monitoramento em períodos chuvosos e restrição a novas ocupações.',
        'Média': 'Monitorar sinais de instabilidade (trincas, surgências) e exigir estudo geotécnico para novas obras.',
        'Baixa': 'Manter fiscalização do uso do solo e boas práticas de drenagem.'
    },

    // =====================================================================
    // ABA REPOSITÓRIO DE DADOS
    // =====================================================================
    // --- PONTO DE CUSTOMIZAÇÃO: DADOS DO REPOSITÓRIO --- //
    // Links para os arquivos de cada município.
    databaseData: {
        "Biritiba Mirim": {
            "Litologia": { type: "link", url: "#", description: "Mapa de litologia do município." },
            "Uso do Solo": { type: "link", url: "#", description: "Mapa de uso e ocupação do solo." },
            "Declividade": { type: "link", url: "#", description: "Mapa de declividade do terreno." },
            "Suscetibilidade (Dados)": { type: "data", url: "data/geologico/biritiba_mirim_suscetibilidade.geojson", description: "Dados vetoriais da carta de suscetibilidade (GeoJSON)." },
            "Carta de Suscetibilidade (PDF)": { type: "pdf", url: "https://storage.googleapis.com/files-maker-in-prod/2024/8/29/CARTA-sus-biritiba_mirim-2025.pdf_1724959114674_0.pdf", description: "Versão final da carta para download." }
        },
        "Mogi das Cruzes (Exemplo)": {
            "Litologia": { type: "link", url: "#", description: "Dados indisponíveis." },
            "Uso do Solo": { type: "link", url: "#", description: "Dados indisponíveis." }
        }
    }
};
