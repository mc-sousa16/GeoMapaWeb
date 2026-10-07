/*
 * layers.js: CARREGAMENTO DOS GEOJSON E CÁLCULOS ESPACIAIS
 *
 * Lê os arquivos cadastrados em config.js, acrescenta a cada feição as
 * propriedades que o site usa (classe, grau, municipio, area_km2, categoria) e guarda o estado
 * dos filtros que as abas compartilham. Normalmente não precisa ser editado.
 */
(function () {
    const config = GeoMAPA.config;
    const RAIO_TERRA = 6378137; // metros

    /**
     * Calcula a área geodésica aproximada de um anel de coordenadas.
     * @param {Array<Array<number>>} anel Lista de pontos [longitude, latitude].
     * @returns {number} Área em m².
     */
    function areaAnel(anel) {
        let area = 0;
        for (let i = 0; i < anel.length - 1; i++) {
            const [lon1, lat1] = anel[i];
            const [lon2, lat2] = anel[i + 1];
            area += (lon2 - lon1) * Math.PI / 180 *
                (2 + Math.sin(lat1 * Math.PI / 180) + Math.sin(lat2 * Math.PI / 180));
        }
        return Math.abs(area * RAIO_TERRA * RAIO_TERRA / 2);
    }

    /**
     * Calcula a área de um polígono, descontando os buracos.
     * @param {Array} aneis Primeiro anel é o contorno; os demais são buracos.
     * @returns {number} Área em m².
     */
    function areaPoligono(aneis) {
        return aneis.reduce((total, anel, i) => total + (i === 0 ? 1 : -1) * areaAnel(anel), 0);
    }

    /**
     * Calcula a área de uma geometria GeoJSON.
     * @param {Object} geometry Geometria Polygon ou MultiPolygon (outros tipos valem 0).
     * @returns {number} Área em km².
     */
    function areaKm2(geometry) {
        if (!geometry) return 0;
        if (geometry.type === 'Polygon') return areaPoligono(geometry.coordinates) / 1e6;
        if (geometry.type === 'MultiPolygon') return geometry.coordinates.reduce((t, p) => t + areaPoligono(p), 0) / 1e6;
        return 0;
    }

    /**
     * Verifica se um ponto está dentro de um anel (algoritmo ray casting).
     * @param {Array<number>} ponto [longitude, latitude].
     * @param {Array<Array<number>>} anel Lista de pontos do anel.
     * @returns {boolean} true se o ponto estiver dentro.
     */
    function pontoNoAnel([x, y], anel) {
        let dentro = false;
        for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
            const [xi, yi] = anel[i];
            const [xj, yj] = anel[j];
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) dentro = !dentro;
        }
        return dentro;
    }

    /**
     * Verifica se um ponto está dentro de uma geometria Polygon ou MultiPolygon.
     * @param {Array<number>} ponto [longitude, latitude].
     * @param {Object} geometry Geometria GeoJSON.
     * @returns {boolean} true se o ponto estiver dentro (fora dos buracos).
     */
    function pontoNaGeometria(ponto, geometry) {
        if (!geometry) return false;
        const poligonos = geometry.type === 'Polygon' ? [geometry.coordinates]
            : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
        return poligonos.some(aneis => pontoNoAnel(ponto, aneis[0]) && !aneis.slice(1).some(b => pontoNoAnel(ponto, b)));
    }

    /**
     * Confere se o GeoJSON está em graus (EPSG:4326) e não em metros (UTM etc.).
     * @param {Object} geojson FeatureCollection carregada.
     * @returns {boolean} true se a primeira coordenada parecer longitude/latitude.
     */
    function estaEmWGS84(geojson) {
        const feature = geojson.features.find(f => f.geometry);
        if (!feature) return true;
        let c = feature.geometry.coordinates;
        while (Array.isArray(c) && Array.isArray(c[0])) c = c[0];
        return Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90;
    }

    /**
     * Baixa um arquivo GeoJSON. Em caso de erro devolve uma coleção vazia e registra o problema.
     * @param {string} caminho Caminho do arquivo a partir da raiz do site.
     * @returns {Promise<Object>} FeatureCollection.
     */
    async function baixarGeoJSON(caminho) {
        try {
            const resposta = await fetch(caminho);
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
            const geojson = await resposta.json();
            if (estaEmWGS84(geojson)) return geojson;
            GeoMAPA.layers.avisos.push(`${caminho} não está em EPSG:4326 (WGS 84). Reprojete a camada no QGIS.`);
            return { type: 'FeatureCollection', features: [] };
        } catch (erro) {
            console.error(`Não foi possível carregar ${caminho}:`, erro);
            GeoMAPA.layers.avisos.push(`Não foi possível carregar ${caminho}.`);
            return { type: 'FeatureCollection', features: [] };
        }
    }

    /**
     * Calcula o retângulo envolvente de uma geometria, para descartar rápido pontos distantes.
     * @param {Object} geometry Geometria Polygon ou MultiPolygon.
     * @returns {Array<number>} [lonMin, latMin, lonMax, latMax].
     */
    function retangulo(geometry) {
        const caixa = [Infinity, Infinity, -Infinity, -Infinity];
        const percorrer = c => {
            if (typeof c[0] === 'number') {
                caixa[0] = Math.min(caixa[0], c[0]); caixa[1] = Math.min(caixa[1], c[1]);
                caixa[2] = Math.max(caixa[2], c[0]); caixa[3] = Math.max(caixa[3], c[1]);
            } else c.forEach(percorrer);
        };
        if (geometry) percorrer(geometry.coordinates);
        return caixa;
    }

    /**
     * Remove acentos e passa para minúsculas, para comparar textos digitados de jeitos diferentes.
     * @param {*} texto Valor qualquer.
     * @returns {string} Texto normalizado (ex.: "Saúde" -> "saude").
     */
    function normalizar(texto) {
        return String(texto == null ? '' : texto).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
    }

    /**
     * Descobre a classe de estabilidade (S1, S2 ou S3) de um polígono, na ordem:
     * coluna de classe -> valor de IS -> grau de risco.
     * @param {Object} p Propriedades do polígono.
     * @param {Object} camada Cadastro da camada em config.js.
     * @returns {Object|null} Classe de config.suscetibilidade.classes, ou null se não der para classificar.
     */
    function classificar(p, camada) {
        const classes = config.suscetibilidade.classes;
        const texto = camada.campoClasse ? normalizar(p[camada.campoClasse]) : '';
        if (texto) {
            // Aceita "S3: Instável", "S3 - Instavel", "s3" ou só "Instável".
            const porCodigo = classes.find(c => texto.startsWith(normalizar(c.nome.split(':')[0])));
            const porNome = classes.find(c => texto.includes(normalizar(c.nome.split(':')[1])));
            if (porCodigo || porNome) return porCodigo || porNome;
        }
        const is = camada.campoIS ? parseFloat(String(p[camada.campoIS]).replace(',', '.')) : NaN;
        if (!isNaN(is)) return classes.find(c => is >= c.isMinimo) || null;
        const grau = camada.campoGrau ? normalizar(p[camada.campoGrau]) : '';
        if (grau) return classes.find(c => c.graus.some(g => normalizar(g) === grau)) || null;
        return null;
    }

    /**
     * Descobre o grau de risco de um polígono: usa a coluna de grau se existir,
     * senão o primeiro grau da classe de estabilidade.
     * @param {Object} p Propriedades do polígono.
     * @param {Object} camada Cadastro da camada em config.js.
     * @param {Object|null} classe Classe já descoberta por classificar().
     * @returns {string} Grau de risco (ex.: "Alto"), ou "" se desconhecido.
     */
    function grauDeRisco(p, camada, classe) {
        const valor = camada.campoGrau ? p[camada.campoGrau] : null;
        if (valor) {
            const conhecido = config.suscetibilidade.classes.flatMap(c => c.graus).find(g => normalizar(g) === normalizar(valor));
            return conhecido || String(valor);
        }
        return classe ? classe.graus.join(' / ') : '';
    }

    /**
     * Encontra a categoria (Educação, Saúde...) de um tipo de equipamento.
     * @param {string} tipo Valor da coluna "tipo" do GeoJSON.
     * @returns {{nome: string, cor: string}} Categoria de config.js, ou "Outros".
     */
    function categoriaDoTipo(tipo) {
        const eq = config.suscetibilidade.equipamentos;
        const t = normalizar(tipo);
        return eq.categorias.find(c => c.tipos.some(v => normalizar(v) === t))
            || { nome: 'Outros', cor: eq.corOutros };
    }

    /**
     * Lista os polígonos de suscetibilidade que contêm um ponto.
     * @param {Array<number>} ponto [longitude, latitude].
     * @param {Array<Object>} poligonos Feições de suscetibilidade já preparadas.
     * @returns {Array<Object>} Feições que contêm o ponto (normalmente uma só).
     */
    function poligonosDoPonto([x, y], poligonos) {
        return poligonos.filter(f => {
            const [x0, y0, x1, y1] = f.properties._caixa;
            return x >= x0 && x <= x1 && y >= y0 && y <= y1 && pontoNaGeometria([x, y], f.geometry);
        });
    }

    /**
     * Carrega todas as camadas cadastradas em config.js e prepara suas propriedades.
     * @returns {Promise<void>} Resolve quando todos os arquivos foram lidos.
     */
    async function carregar() {
        const s = config.suscetibilidade;
        const [colecoes, equipamentos] = await Promise.all([
            Promise.all(s.camadas.map(camada => baixarGeoJSON(camada.arquivo))),
            baixarGeoJSON(s.equipamentos.arquivo)
        ]);

        // Suscetibilidade: classe, grau, município, área e população de cada polígono.
        s.camadas.forEach((camada, i) => {
            colecoes[i].features.forEach(f => {
                const p = f.properties = f.properties || {};
                const classe = classificar(p, camada);
                p.classe = classe ? classe.nome : 'Sem classe';
                p.grau = grauDeRisco(p, camada, classe);
                p.municipio = (camada.campoMunicipio && p[camada.campoMunicipio]) || camada.municipio || 'Sem município';
                p.area_km2 = areaKm2(f.geometry);
                p.populacao_estimada = Number(camada.campoPopulacao && p[camada.campoPopulacao]) || 0;
                p.camada = camada.id;
                p._caixa = retangulo(f.geometry);
            });
        });
        GeoMAPA.layers.suscetibilidade = colecoes.flatMap(g => g.features);
        const semClasse = GeoMAPA.layers.suscetibilidade.filter(f => f.properties.classe === 'Sem classe').length;
        if (semClasse) GeoMAPA.layers.avisos.push(`${semClasse} polígono(s) sem classe de estabilidade, IS ou grau de risco reconhecível. Confira os campo* da camada em js/config.js.`);
        GeoMAPA.layers.municipios = [...new Set(GeoMAPA.layers.suscetibilidade.map(f => f.properties.municipio))].sort();
        GeoMAPA.layers.temPopulacao = GeoMAPA.layers.suscetibilidade.some(f => f.properties.populacao_estimada > 0);

        // Equipamentos públicos: categoria e polígonos de suscetibilidade onde estão (spatial join).
        // Se o ponto cair em mais de um polígono, fica o mais grave (ordem de config.classes).
        const ordem = s.classes.map(c => c.nome);
        GeoMAPA.layers.equipamentos = equipamentos.features.filter(f => f.geometry && f.geometry.type === 'Point');
        GeoMAPA.layers.equipamentos.forEach(f => {
            const p = f.properties = f.properties || {};
            const categoria = categoriaDoTipo(p.tipo);
            p.categoria = categoria.nome;
            p.cor = categoria.cor;
            p.nome = p.nome || 'Equipamento sem nome';
            const zona = poligonosDoPonto(f.geometry.coordinates, GeoMAPA.layers.suscetibilidade)
                .sort((a, b) => ordem.indexOf(a.properties.classe) - ordem.indexOf(b.properties.classe))[0];
            p.classe = zona ? zona.properties.classe : null;
            p.grau = zona ? zona.properties.grau : null;
            p.municipio = p.municipio || (zona ? zona.properties.municipio : null);
        });
        GeoMAPA.layers.categorias = [...s.equipamentos.categorias];
        if (GeoMAPA.layers.equipamentos.some(e => e.properties.categoria === 'Outros')) {
            GeoMAPA.layers.categorias.push({ nome: 'Outros', cor: s.equipamentos.corOutros });
        }
    }

    // Estado compartilhado entre as abas, com aviso para quem quiser reagir a mudanças.
    const ouvintes = [];
    const estado = {
        municipio: 'todos',
        classes: config.suscetibilidade.classes.map(c => c.nome),
        opacidade: 0.7,
        categorias: config.suscetibilidade.equipamentos.categorias.map(c => c.nome).concat('Outros'),
        incluirOpcionais: false
    };

    GeoMAPA.layers = {
        avisos: [],
        suscetibilidade: [],
        equipamentos: [],
        categorias: [],
        municipios: [],
        temPopulacao: false,
        estado,
        carregar,
        areaKm2,
        pontoNaGeometria,

        /**
         * Registra uma função chamada sempre que um filtro muda.
         * @param {Function} fn Recebe o objeto de estado.
         * @returns {void}
         */
        aoMudar(fn) { ouvintes.push(fn); },

        /**
         * Altera um filtro e avisa as abas.
         * @param {string} nome Chave do estado (municipio, classes, opacidade, categorias, incluirOpcionais).
         * @param {*} valor Novo valor.
         * @returns {void}
         */
        definir(nome, valor) {
            estado[nome] = valor;
            ouvintes.forEach(fn => fn(estado));
        },

        /**
         * Classes e graus que contam como risco agora (classesDeRisco + opcionais, se o seletor estiver marcado).
         * @returns {Array<string>} Nomes de classes e graus.
         */
        classesDeRiscoAtivas() {
            const s = config.suscetibilidade;
            return estado.incluirOpcionais ? s.classesDeRisco.concat(s.classesDeRiscoOpcionais) : s.classesDeRisco;
        },

        /**
         * Informa se uma área (ou equipamento) está em classe de risco ativa,
         * pela classe de estabilidade ou pelo grau de risco.
         * @param {Object} p Propriedades com "classe" e "grau".
         * @returns {boolean} true se for de risco.
         */
        ehRisco(p) {
            const ativas = this.classesDeRiscoAtivas().map(normalizar);
            const graus = String(p.grau || '').split('/').map(normalizar);
            return ativas.includes(normalizar(p.classe)) || graus.some(g => ativas.includes(g));
        },

        /**
         * Informa se uma feição pertence ao município escolhido no seletor.
         * @param {Object} f Feição GeoJSON com properties.municipio.
         * @returns {boolean} true se passar pelo filtro de município.
         */
        noMunicipio(f) {
            return estado.municipio === 'todos' || f.properties.municipio === estado.municipio;
        },

        /**
         * Polígonos de suscetibilidade que passam pelos filtros de município e classe (mapa).
         * @returns {Array<Object>} Feições GeoJSON.
         */
        suscetibilidadeFiltrada() {
            return this.suscetibilidade.filter(f => estado.classes.includes(f.properties.classe) && this.noMunicipio(f));
        },

        /**
         * Polígonos do município escolhido que estão nas classes de risco ativas (aba Gestão).
         * @returns {Array<Object>} Feições GeoJSON.
         */
        areasDeRisco() {
            return this.suscetibilidade.filter(f => this.noMunicipio(f) && this.ehRisco(f.properties));
        },

        /**
         * Equipamentos públicos das categorias marcadas, no município escolhido.
         * @returns {Array<Object>} Feições de ponto.
         */
        equipamentosFiltrados() {
            return this.equipamentos.filter(f => estado.categorias.includes(f.properties.categoria) && this.noMunicipio(f));
        },

        /**
         * Equipamentos filtrados que estão em área de risco ativa (equipamentos atingidos).
         * @returns {Array<Object>} Feições de ponto.
         */
        equipamentosAtingidos() {
            return this.equipamentosFiltrados().filter(f => f.properties.classe && this.ehRisco(f.properties));
        }
    };
})();
