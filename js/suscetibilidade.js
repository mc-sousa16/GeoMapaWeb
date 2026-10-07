/*
 * suscetibilidade.js: ABA SUSCETIBILIDADE GEOLÓGICA
 *
 * Mapa dos polígonos de suscetibilidade (classes S1, S2 e S3 da metodologia
 * Soares Jr. et al., 2022) com seletor de município, filtro por classe,
 * transparência, equipamentos públicos, legenda e gráfico de área por classe.
 * As camadas, classes e cores são cadastradas em config.js.
 */
(function () {
    const config = GeoMAPA.config.suscetibilidade;
    const layers = GeoMAPA.layers;
    const { opcao, marcados, fmt, mostrarVazio, esc } = GeoMAPA.ui;
    const cores = Object.fromEntries(config.classes.map(c => [c.nome, c.cor]));

    let mapa;
    let camada;
    let camadaEquipamentos;
    let grafico;

    /**
     * Soma a área (km²), a população e conta os polígonos por classe de estabilidade.
     * @param {Array<Object>} features Feições de suscetibilidade.
     * @returns {Object<string, {area: number, poligonos: number, populacao: number}>} Totais por classe.
     */
    function resumoPorClasse(features) {
        const resumo = {};
        config.classes.forEach(c => { resumo[c.nome] = { area: 0, poligonos: 0, populacao: 0 }; });
        features.forEach(f => {
            const r = resumo[f.properties.classe];
            if (r) { r.area += f.properties.area_km2; r.poligonos++; r.populacao += f.properties.populacao_estimada; }
        });
        return resumo;
    }

    /**
     * Monta o texto do popup de um polígono de suscetibilidade.
     * @param {Object} p Propriedades do polígono.
     * @returns {string} HTML do popup.
     */
    function popupZona(p) {
        const camadaCfg = config.camadas.find(c => c.id === p.camada) || {};
        const is = camadaCfg.campoIS ? p[camadaCfg.campoIS] : null;
        return `<b>Município:</b> ${esc(p.municipio)}` +
            `<br><b>Classe de estabilidade:</b> ${esc(p.classe)}` +
            (p.grau ? `<br><b>Grau de risco:</b> ${esc(p.grau)}` : '') +
            (is != null && is !== '' ? `<br><b>Índice de Suscetibilidade (IS):</b> ${esc(is)}` : '') +
            (p.populacao_estimada ? `<br><b>População:</b> ${fmt(p.populacao_estimada, 0)}` : '') +
            `<br><b>Área:</b> ${fmt(p.area_km2, 3)} km²`;
    }

    /**
     * Monta o texto do popup de um equipamento público.
     * @param {Object} p Propriedades do equipamento.
     * @returns {string} HTML do popup.
     */
    function popupEquipamento(p) {
        const emRisco = p.classe && layers.ehRisco(p);
        return `<b>${esc(p.nome)}</b><br>${esc(p.tipo || p.categoria)} (${esc(p.categoria)})` +
            (p.endereco ? `<br>${esc(p.endereco)}` : '') +
            `<br><b>Classe no local:</b> ${p.classe ? esc(p.classe) : 'fora das áreas mapeadas'}` +
            (p.fonte ? `<br><b>Fonte:</b> ${esc(p.fonte)}` : '') +
            (emRisco ? '<br><b style="color:#B71C1C">Equipamento em área de risco</b>' : '');
    }

    /**
     * Redesenha os polígonos e os equipamentos no mapa conforme os filtros atuais.
     * @param {boolean} [enquadrar=false] Aproxima o mapa dos polígonos desenhados.
     * @returns {void}
     */
    function desenhar(enquadrar = false) {
        if (camada) mapa.removeLayer(camada);
        camada = L.geoJSON(layers.suscetibilidadeFiltrada(), {
            style: f => ({
                fillColor: cores[f.properties.classe] || '#999999',
                weight: 1, color: 'white', opacity: 1,
                fillOpacity: layers.estado.opacidade
            }),
            onEachFeature: (f, l) => l.bindPopup(popupZona(f.properties))
        }).addTo(mapa);

        // Equipamentos: contorno preto quando estão numa área das classes de risco ativas.
        if (camadaEquipamentos) mapa.removeLayer(camadaEquipamentos);
        camadaEquipamentos = L.geoJSON(layers.equipamentosFiltrados(), {
            pointToLayer: (f, latlng) => {
                const emRisco = f.properties.classe && layers.ehRisco(f.properties);
                return L.circleMarker(latlng, {
                    radius: emRisco ? 8 : 6,
                    color: emRisco ? '#000000' : 'white',
                    weight: emRisco ? 3 : 1.5,
                    fillColor: f.properties.cor,
                    fillOpacity: 1
                });
            },
            onEachFeature: (f, l) => l.bindPopup(popupEquipamento(f.properties))
        }).addTo(mapa);

        GeoMAPA.map.enquadrar(mapa, [camada], enquadrar);
    }

    /**
     * Atualiza o gráfico de rosca com a área por classe.
     * @returns {void}
     */
    function atualizarGrafico() {
        const resumo = resumoPorClasse(layers.suscetibilidadeFiltrada());
        const classes = config.classes.filter(c => resumo[c.nome].area > 0);
        grafico.data.labels = classes.map(c => c.nome);
        grafico.data.datasets[0].data = classes.map(c => +resumo[c.nome].area.toFixed(3));
        grafico.data.datasets[0].backgroundColor = classes.map(c => c.cor);
        grafico.update();
        mostrarVazio('grafico-suscetibilidade', classes.length === 0);
    }

    /**
     * Monta o seletor de município, os filtros de classe e de equipamentos e o controle de transparência.
     * @returns {void}
     */
    function montarFiltros() {
        const seletor = document.getElementById('filtro-municipio');
        layers.municipios.forEach(m => seletor.add(new Option(m, m)));
        seletor.addEventListener('change', () => {
            layers.definir('municipio', seletor.value);
            desenhar(true);
        });

        const classes = document.getElementById('filtro-classes');
        config.classes.forEach(c => classes.appendChild(opcao({
            type: 'checkbox', value: c.nome, label: `${c.nome} (${c.graus.join(' / ')})`, checked: true, cor: c.cor
        })));
        classes.addEventListener('change', () => layers.definir('classes', marcados(classes)));

        const equipamentos = document.getElementById('filtro-equipamentos');
        layers.categorias.forEach(c => equipamentos.appendChild(opcao({ type: 'checkbox', value: c.nome, label: c.nome, checked: true, cor: c.cor })));
        equipamentos.addEventListener('change', () => layers.definir('categorias', marcados(equipamentos)));

        const opacidade = document.getElementById('opacidade-suscetibilidade');
        opacidade.value = layers.estado.opacidade;
        opacidade.addEventListener('input', () => layers.definir('opacidade', parseFloat(opacidade.value)));

        document.getElementById('limpar-filtros').addEventListener('click', () => {
            seletor.value = 'todos';
            document.querySelectorAll('#filtro-classes input, #filtro-equipamentos input').forEach(i => { i.checked = true; });
            layers.estado.municipio = 'todos';
            layers.estado.categorias = layers.categorias.map(c => c.nome);
            layers.definir('classes', config.classes.map(c => c.nome));
            desenhar(true);
        });
    }

    GeoMAPA.suscetibilidade = {
        resumoPorClasse,

        /**
         * Cria o mapa, os filtros e o gráfico da aba. Chamada uma vez, depois de carregar os dados.
         * @returns {void}
         */
        init() {
            mapa = GeoMAPA.map.criarMapa('mapa-suscetibilidade', config.centro, config.zoom);
            GeoMAPA.map.criarPainel(mapa, 'bottomright').innerHTML =
                GeoMAPA.map.htmlLegenda('Classe de estabilidade', config.classes.map(c => ({ nome: `${c.nome} <small>(${c.faixa})</small>`, cor: c.cor }))) +
                GeoMAPA.map.htmlLegenda('Equipamentos', layers.categorias.map(c => ({ nome: c.nome, cor: c.cor, redondo: true }))) +
                '<div class="text-xs mt-1">Contorno preto = em área de risco</div>' +
                '<div class="text-xs">Metodologia: Soares Jr. et al. (2022)</div>';

            grafico = new Chart(document.getElementById('grafico-suscetibilidade'), {
                type: 'doughnut',
                data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderColor: '#FFFAFA', borderWidth: 3 }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${fmt(ctx.parsed)} km²` } }
                    }
                }
            });

            montarFiltros();
            layers.aoMudar(() => { desenhar(); atualizarGrafico(); });
            desenhar();
            atualizarGrafico();
        },

        /**
         * Chamada quando a aba aparece: ajusta o tamanho do mapa e enquadra os dados.
         * @returns {void}
         */
        aoMostrar() {
            GeoMAPA.map.atualizarTamanho(() => GeoMAPA.map.enquadrar(mapa, [camada]));
        }
    };
})();
