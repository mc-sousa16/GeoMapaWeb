/*
 * layers.js: CARREGAMENTO DOS GEOJSON E CÁLCULOS ESPACIAIS
 *
 * Lê os arquivos cadastrados em config.js, acrescenta a cada feição as
 * propriedades que o site usa (classe, municipio, area_km2) e guarda o estado
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
     * Carrega todas as camadas cadastradas em config.js e prepara suas propriedades.
     * @returns {Promise<void>} Resolve quando todos os arquivos foram lidos.
     */
    async function carregar() {
        const s = config.suscetibilidade;
        const c = config.costeiro;

        const [suscetibilidade, cenarios, equipamentos] = await Promise.all([
            Promise.all(s.camadas.map(camada => baixarGeoJSON(camada.arquivo))),
            Promise.all(c.cenarios.map(cenario => baixarGeoJSON(cenario.arquivo))),
            baixarGeoJSON(c.equipamentos.arquivo)
        ]);

        // Suscetibilidade: classe, município e área de cada polígono.
        s.camadas.forEach((camada, i) => {
            suscetibilidade[i].features.forEach(f => {
                const p = f.properties = f.properties || {};
                const valor = p[camada.campoClasse];
                p.classe = camada.mapeamentoClasse ? camada.mapeamentoClasse[valor] : valor;
                p.municipio = (camada.campoMunicipio && p[camada.campoMunicipio]) || camada.municipio;
                p.area_km2 = areaKm2(f.geometry);
                p.camada = camada.id;
            });
        });
        GeoMAPA.layers.suscetibilidade = suscetibilidade.flatMap(g => g.features);

        // Inundação: área e população de cada polígono, por cenário.
        GeoMAPA.layers.cenarios = {};
        c.cenarios.forEach((cenario, i) => {
            cenarios[i].features.forEach(f => {
                const p = f.properties = f.properties || {};
                p.area_km2 = areaKm2(f.geometry);
                p.populacao_exposta = Number(p[cenario.campoPopulacao]) || 0;
            });
            GeoMAPA.layers.cenarios[cenario.id] = cenarios[i].features;
        });

        // Equipamentos: tipo e nome padronizados.
        GeoMAPA.layers.equipamentos = equipamentos.features.filter(f => f.geometry && f.geometry.type === 'Point');
        GeoMAPA.layers.equipamentos.forEach(f => {
            f.properties.tipo = String(f.properties[c.equipamentos.campoTipo] || '').toLowerCase();
            f.properties.nome = f.properties[c.equipamentos.campoNome] || 'Equipamento';
        });

        GeoMAPA.layers.municipios = [...new Set(GeoMAPA.layers.suscetibilidade.map(f => f.properties.municipio))].sort();
    }

    // Estado compartilhado entre as abas, com aviso para quem quiser reagir a mudanças.
    const ouvintes = [];
    const estado = {
        municipio: 'todos',
        classes: config.suscetibilidade.classes.map(c => c.nome),
        opacidade: 0.7,
        cenario: config.costeiro.cenarios.length ? config.costeiro.cenarios[0].id : null,
        tiposEquipamento: config.costeiro.equipamentos.tipos.map(t => t.valor)
    };

    GeoMAPA.layers = {
        avisos: [],
        suscetibilidade: [],
        cenarios: {},
        equipamentos: [],
        municipios: [],
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
         * @param {string} nome Chave do estado (municipio, classes, opacidade, cenario, tiposEquipamento).
         * @param {*} valor Novo valor.
         * @returns {void}
         */
        definir(nome, valor) {
            estado[nome] = valor;
            ouvintes.forEach(fn => fn(estado));
        },

        /**
         * Polígonos de suscetibilidade que passam pelos filtros de município e classe.
         * @returns {Array<Object>} Feições GeoJSON.
         */
        suscetibilidadeFiltrada() {
            return this.suscetibilidade.filter(f =>
                estado.classes.includes(f.properties.classe) &&
                (estado.municipio === 'todos' || f.properties.municipio === estado.municipio));
        },

        /**
         * Equipamentos públicos dentro da área inundada de um cenário.
         * @param {string} cenarioId Identificador do cenário em config.js.
         * @returns {Array<Object>} Feições de ponto atingidas.
         */
        equipamentosAtingidos(cenarioId) {
            const poligonos = this.cenarios[cenarioId] || [];
            return this.equipamentos.filter(e =>
                poligonos.some(p => pontoNaGeometria(e.geometry.coordinates, p.geometry)));
        },

        /**
         * Soma área e população exposta de um cenário de inundação.
         * @param {string} cenarioId Identificador do cenário em config.js.
         * @returns {{area: number, populacao: number, temPopulacao: boolean}} Totais do cenário.
         */
        resumoCenario(cenarioId) {
            const fs = this.cenarios[cenarioId] || [];
            return {
                area: fs.reduce((t, f) => t + f.properties.area_km2, 0),
                populacao: fs.reduce((t, f) => t + f.properties.populacao_exposta, 0),
                temPopulacao: fs.some(f => f.properties.populacao_exposta > 0)
            };
        }
    };
})();
