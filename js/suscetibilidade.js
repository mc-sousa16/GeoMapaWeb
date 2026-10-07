/*
 * suscetibilidade.js: ABA SUSCETIBILIDADE GEOLÓGICA
 *
 * Mapa dos polígonos de suscetibilidade com seletor de município, filtro por
 * grau, transparência, equipamentos públicos, legenda e gráfico de área por classe.
 * As camadas e as cores são cadastradas em config.js.
 */
(function () {
    const config = GeoMAPA.config.suscetibilidade;
    const layers = GeoMAPA.layers;
    const { opcao, marcados, fmt, mostrarVazio } = GeoMAPA.ui;
    const cores = Object.fromEntries(config.classes.map(c => [c.nome, c.cor]));
    const tipos = Object.fromEntries(config.equipamentos.tipos.map(t => [t.valor, t]));

    let mapa;
    let camada;
    let camadaEquipamentos;
    let grafico;

    /**
     * Soma a área (km²) e conta os polígonos por classe de suscetibilidade.
     * @param {Array<Object>} features Feições de suscetibilidade.
     * @returns {Object<string, {area: number, poligonos: number}>} Totais por classe.
     */
    function resumoPorClasse(features) {
        const resumo = {};
        config.classes.forEach(c => { resumo[c.nome] = { area: 0, poligonos: 0 }; });
        features.forEach(f => {
            const r = resumo[f.properties.classe];
            if (r) { r.area += f.properties.area_km2; r.poligonos++; }
        });
        return resumo;
    }

    /**
     * Redesenha os polígonos no mapa conforme os filtros atuais.
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
            onEachFeature: (f, l) => l.bindPopup(
                `<b>Município:</b> ${f.properties.municipio}<br><b>Suscetibilidade:</b> ${f.properties.classe || 'Sem classe'}<br><b>Área:</b> ${fmt(f.properties.area_km2, 3)} km²`)
        }).addTo(mapa);

        // Equipamentos: contorno preto quando estão numa área das classesDeRisco.
        if (camadaEquipamentos) mapa.removeLayer(camadaEquipamentos);
        camadaEquipamentos = L.geoJSON(layers.equipamentosFiltrados(), {
            pointToLayer: (f, latlng) => L.circleMarker(latlng, {
                radius: f.properties.atingido ? 8 : 6,
                color: f.properties.atingido ? '#000000' : 'white',
                weight: f.properties.atingido ? 3 : 1.5,
                fillColor: (tipos[f.properties.tipo] || {}).cor || '#555555',
                fillOpacity: 1
            }),
            onEachFeature: (f, l) => l.bindPopup(
                `<b>${f.properties.nome}</b><br>${(tipos[f.properties.tipo] || {}).nome || f.properties.tipo}` +
                `<br><b>Suscetibilidade no local:</b> ${f.properties.classe || 'fora das áreas mapeadas'}` +
                (f.properties.atingido ? '<br><b style="color:#B71C1C">Equipamento em área de risco</b>' : ''))
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
     * Monta o seletor de município, os filtros de grau e o controle de transparência.
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
        config.classes.forEach(c => classes.appendChild(opcao({ type: 'checkbox', value: c.nome, label: c.nome, checked: true, cor: c.cor })));
        classes.addEventListener('change', () => layers.definir('classes', marcados(classes)));

        const equipamentos = document.getElementById('filtro-equipamentos');
        config.equipamentos.tipos.forEach(t => equipamentos.appendChild(opcao({ type: 'checkbox', value: t.valor, label: t.nome, checked: true, cor: t.cor })));
        equipamentos.addEventListener('change', () => layers.definir('tiposEquipamento', marcados(equipamentos)));

        const opacidade = document.getElementById('opacidade-suscetibilidade');
        opacidade.value = layers.estado.opacidade;
        opacidade.addEventListener('input', () => layers.definir('opacidade', parseFloat(opacidade.value)));

        document.getElementById('limpar-filtros').addEventListener('click', () => {
            seletor.value = 'todos';
            classes.querySelectorAll('input').forEach(i => { i.checked = true; });
            layers.estado.municipio = 'todos';
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
                GeoMAPA.map.htmlLegenda('Suscetibilidade', config.classes) +
                GeoMAPA.map.htmlLegenda('Equipamentos', config.equipamentos.tipos.map(t => ({ nome: t.nome, cor: t.cor, redondo: true }))) +
                '<div class="text-xs mt-1">Contorno preto = em área de risco</div>';

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
