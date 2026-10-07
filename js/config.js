/*
 * config.js: CADASTRO DE CAMADAS E PONTOS DE CUSTOMIZAÇÃO
 *
 * Este é o arquivo que um novo aluno do laboratório mais vai editar.
 * Para uma nova camada aparecer no site:
 *   1. Exporte o GeoJSON no QGIS em EPSG:4326 (WGS 84).
 *   2. Salve o arquivo em data/geologico/ (ou data/, no caso dos equipamentos públicos).
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
        // O mapa se aproxima sozinho dos dados carregados; esta é só a vista antes disso.
        centro: [-23.45, -46.55], // Região Metropolitana de São Paulo
        zoom: 9,

        // --- PONTO DE CUSTOMIZAÇÃO: CLASSES DE ESTABILIDADE (Soares Jr. et al., 2022) --- //
        // O Índice de Suscetibilidade é IS = Σ (Ri × Pij): declividade 40%, litologia 20%,
        // uso do solo 20%, curvatura vertical 10% e densidade de lineamentos 10%.
        // O IS (1,0 a 5,0) é agrupado em 3 classes consolidadas (Crozier, 1986 / GeoMAPA):
        //   isMinimo: menor valor de IS da classe (a classe vai até o isMinimo da próxima).
        //   graus: graus de risco que pertencem à classe (coluna grau_risco do GeoJSON).
        // Ordem da mais grave para a menos grave. Usada em filtros, legenda e gráficos.
        classes: [
            { nome: 'S3: Instável', graus: ['Alto', 'Muito Alto'], isMinimo: 3.53, cor: '#C62828', faixa: 'IS ≥ 3,53' },
            { nome: 'S2: Pouco Estável', graus: ['Moderado'], isMinimo: 2.99, cor: '#FFB74D', faixa: '2,99 ≤ IS < 3,53' },
            { nome: 'S1: Estável', graus: ['Muito Baixo', 'Baixo'], isMinimo: -Infinity, cor: '#81C784', faixa: 'IS < 2,99' }
        ],

        // --- PONTO DE CUSTOMIZAÇÃO: CLASSES DE RISCO CRÍTICO --- //
        // Uma área é "de risco" quando sua classe de estabilidade OU seu grau de risco está nesta lista.
        // Ela define a área de risco, os equipamentos atingidos e a população exposta da aba Gestão.
        classesDeRisco: ['S3: Instável', 'Alto', 'Muito Alto'],
        // Classes que o usuário pode incluir na conta pelo seletor da aba Gestão.
        classesDeRiscoOpcionais: ['S2: Pouco Estável', 'Moderado'],

        // --- PONTO DE CUSTOMIZAÇÃO: CAMADAS DE SUSCETIBILIDADE --- //
        // arquivo: caminho do GeoJSON a partir da raiz do site.
        // Os campo* dizem o nome de cada coluna no GeoJSON. Se uma coluna não existir, use null:
        //   campoClasse: classe de estabilidade ("S3: Instável"). Se faltar, o site usa campoIS.
        //   campoIS: valor do Índice de Suscetibilidade (is_valor). Se faltar também, usa campoGrau.
        //   campoGrau: grau de risco ("Baixo", "Moderado", "Alto"...).
        //   campoMunicipio: município de cada polígono. Se a camada for de um município só,
        //                   use null e escreva o nome em "municipio".
        //   campoPopulacao: população residente (IBGE), usada na população exposta.
        camadas: [
            {
                id: 'suscetibilidade_sp',
                nome: 'Suscetibilidade a escorregamentos (SP)',
                arquivo: 'data/geologico/suscetibilidade_sp.geojson',
                municipio: null,
                campoMunicipio: 'municipio',
                campoClasse: 'classe_estabilidade',
                campoIS: 'is_valor',
                campoGrau: 'grau_risco',
                campoPopulacao: 'populacao'
            }
            // Exemplo de camada de um município só, com outras colunas:
            // {
            //     id: 'diadema_suscetibilidade',
            //     nome: 'Suscetibilidade a escorregamentos',
            //     arquivo: 'data/geologico/diadema_suscetibilidade.geojson',
            //     municipio: 'Diadema',
            //     campoMunicipio: null,
            //     campoClasse: null,
            //     campoIS: 'IS',
            //     campoGrau: null,
            //     campoPopulacao: null
            // }
        ],

        // --- PONTO DE CUSTOMIZAÇÃO: EQUIPAMENTOS PÚBLICOS --- //
        // GeoJSON de pontos com as colunas id, nome, tipo, municipio, endereco e fonte.
        // Um equipamento é "atingido" quando cai numa área cuja classe ou grau está em classesDeRisco.
        // categorias: agrupa os valores da coluna "tipo" (maiúsculas e acentos não importam).
        // Tipos que não estão em nenhuma categoria aparecem como "Outros".
        equipamentos: {
            arquivo: 'data/equipamentos_publicos.geojson',
            categorias: [
                { nome: 'Educação', cor: '#6A1B9A', tipos: ['Escola', 'Creche', 'EMEF', 'EMEI', 'CEI', 'ETEC'] },
                { nome: 'Saúde', cor: '#1565C0', tipos: ['UBS', 'UPA', 'Hospital', 'Posto de Saúde', 'AMA', 'Pronto-Socorro'] },
                { nome: 'Assistência Social', cor: '#2E7D32', tipos: ['Centro de Acolhida', 'Abrigo', 'CRAS', 'CREAS'] }
            ],
            corOutros: '#616161'
        }
    },

    // =====================================================================
    // ABA GESTÃO E TOMADA DE DECISÃO
    // =====================================================================
    // --- PONTO DE CUSTOMIZAÇÃO: AÇÕES RECOMENDADAS --- //
    // Texto exibido para cada classe. Revise com a equipe do laboratório.
    acoesPorClasse: {
        'S3: Instável': 'Vistoria imediata, cadastro de moradias e equipamentos expostos e inclusão prioritária no plano de contingência da Defesa Civil.',
        'S2: Pouco Estável': 'Monitorar sinais de instabilidade (trincas, surgências), sobretudo em períodos chuvosos, e exigir estudo geotécnico para novas obras.',
        'S1: Estável': 'Manter fiscalização do uso do solo e boas práticas de drenagem nas novas ocupações.'
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
            "Suscetibilidade (Dados)": { type: "data", url: "data/geologico/suscetibilidade_sp.geojson", description: "Dados vetoriais da carta de suscetibilidade (GeoJSON)." },
            "Carta de Suscetibilidade (PDF)": { type: "pdf", url: "https://storage.googleapis.com/files-maker-in-prod/2024/8/29/CARTA-sus-biritiba_mirim-2025.pdf_1724959114674_0.pdf", description: "Versão final da carta para download." }
        },
        "Mogi das Cruzes (Exemplo)": {
            "Litologia": { type: "link", url: "#", description: "Dados indisponíveis." },
            "Uso do Solo": { type: "link", url: "#", description: "Dados indisponíveis." }
        }
    }
};
