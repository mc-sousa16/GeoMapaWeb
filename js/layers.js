/*
 * layers.js: CARREGAMENTO DOS GEOJSON E CÁLCULOS ESPACIAIS
 *
 * Lê os arquivos cadastrados em config.js, acrescenta a cada feição as
 * propriedades que o site usa (classe, municipio, area_km2, atingido) e guarda o estado
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
     * Descobre em qual polígono de suscetibilidade cai um ponto. Se cair em mais de um,
     * fica com o de grau mais grave.
     * @param {Array<number>} ponto [longitude, latitude].
     * @param {Array<Object>} poligonos Feições de suscetibilidade já preparadas.
     * @returns {Object|null} Feição de suscetibilidade, ou null se o ponto estiver fora de todas.
     */
    function poligonoDoPonto([x, y], poligonos) {
        const ordem = config.suscetibilidade.classes.map(c => c.nome);
        let escolhido = null;
        poligonos.forEach(f => {
            const [x0, y0, x1, y1] = f.properties._caixa;
            if (x < x0 || x > x1 || y < y0 || y > y1) return;
            if (!pontoNaGeometria([x, y], f.geometry)) return;
            if (!escolhido || ordem.indexOf(f.properties.classe) < ordem.indexOf(escolhido.properties.classe)) escolhido = f;
        });
        return escolhido;
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

        // Suscetibilidade: classe, município, área e população de cada polígono.
        s.camadas.forEach((camada, i) => {
            colecoes[i].features.forEach(f => {
                const p = f.properties = f.properties || {};
                const valor = p[camada.campoClasse];
                p.classe = camada.mapeamentoClasse ? camada.mapeamentoClasse[valor] : valor;
                p.municipio = (camada.campoMunicipio && p[camada.campoMunicipio]) || camada.municipio;
                p.area_km2 = areaKm2(f.geometry);
                p.populacao_estimada = Number(p[camada.campoPopulacao]) || 0;
                p.camada = camada.id;
                p._caixa = retangulo(f.geometry);
            });
        });
        GeoMAPA.layers.suscetibilidade = colecoes.flatMap(g => g.features);
        GeoMAPA.layers.municipios = [...new Set(GeoMAPA.layers.suscetibilidade.map(f => f.properties.municipio))].sort();
        GeoMAPA.layers.temPopulacao = GeoMAPA.layers.suscetibilidade.some(f => f.properties.populacao_estimada > 0);

        // Equipamentos públicos: tipo, nome e o grau de suscetibilidade do local onde estão.
        GeoMAPA.layers.equipamentos = equipamentos.features.filter(f => f.geometry && f.geometry.type === 'Point');
        GeoMAPA.layers.equipamentos.forEach(f => {
            const p = f.properties = f.properties || {};
            p.tipo = String(p[s.equipamentos.campoTipo] || '').toLowerCase();
            p.nome = p[s.equipamentos.campoNome] || 'Equipamento';
            const poligono = poligonoDoPonto(f.geometry.coordinates, GeoMAPA.layers.suscetibilidade);
            p.classe = poligono ? poligono.properties.classe : null;
            p.municipio = poligono ? poligono.properties.municipio : null;
            p.atingido = !!poligono && s.classesDeRisco.includes(p.classe);
        });
    }

    // Estado compartilhado entre as abas, com aviso para quem quiser reagir a mudanças.
    const ouvintes = [];
    const estado = {
        municipio: 'todos',
        classes: config.suscetibilidade.classes.map(c => c.nome),
        opacidade: 0.7,
        tiposEquipamento: config.suscetibilidade.equipamentos.tipos.map(t => t.valor)
    };

    GeoMAPA.layers = {
        avisos: [],
        suscetibilidade: [],
        equipamentos: [],
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
         * @param {string} nome Chave do estado (municipio, classes, opacidade, tiposEquipamento).
         * @param {*} valor Novo valor.
         * @returns {void}
         */
        definir(nome, valor) {
            estado[nome] = valor;
            ouvintes.forEach(fn => fn(estado));
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
         * Polígonos de suscetibilidade que passam pelos filtros de município e grau.
         * @returns {Array<Object>} Feições GeoJSON.
         */
        suscetibilidadeFiltrada() {
            return this.suscetibilidade.filter(f => estado.classes.includes(f.properties.classe) && this.noMunicipio(f));
        },

        /**
         * Equipamentos públicos dos tipos marcados, no município escolhido.
         * Equipamentos fora de qualquer polígono só aparecem com "Todos os municípios".
         * @returns {Array<Object>} Feições de ponto.
         */
        equipamentosFiltrados() {
            return this.equipamentos.filter(f => estado.tiposEquipamento.includes(f.properties.tipo) &&
                (estado.municipio === 'todos' || f.properties.municipio === estado.municipio));
        }
    };
})();
