/*
 * costeiro.js: ABA RISCO COSTEIRO E INUNDAÇÃO
 *
 * Mostra a área inundada em cada cenário de elevação do nível do mar e os
 * equipamentos públicos (escolas, saúde, abrigos). A legenda calcula na hora
 * a área vulnerável e quantos equipamentos ficam dentro dela.
 * Cenários e equipamentos são cadastrados em config.js.
 */
(function () {
    const config = GeoMAPA.config.costeiro;
    const layers = GeoMAPA.layers;
    const { opcao, marcados, fmt } = GeoMAPA.ui;
    const tipos = Object.fromEntries(config.equipamentos.tipos.map(t => [t.valor, t]));

    let mapa;
    let camadaInundacao;
    let camadaEquipamentos;
    let legenda;
    let opacidade = 0.5;

    /**
     * Desenha a mancha de inundação do cenário escolhido e os equipamentos visíveis.
     * @returns {void}
     */
    function desenhar() {
        const { cenario, tiposEquipamento } = layers.estado;
        if (camadaInundacao) mapa.removeLayer(camadaInundacao);
        if (camadaEquipamentos) mapa.removeLayer(camadaEquipamentos);

        camadaInundacao = L.geoJSON(layers.cenarios[cenario] || [], {
            style: { color: config.corInundacao, weight: 1, fillColor: config.corInundacao, fillOpacity: opacidade },
            onEachFeature: (f, l) => l.bindPopup(`<b>Área inundada</b><br>${fmt(f.properties.area_km2, 3)} km²`)
        }).addTo(mapa);

        const atingidos = new Set(layers.equipamentosAtingidos(cenario));
        camadaEquipamentos = L.geoJSON(layers.equipamentos.filter(e => tiposEquipamento.includes(e.properties.tipo)), {
            pointToLayer: (f, latlng) => L.circleMarker(latlng, {
                radius: atingidos.has(f) ? 8 : 6,
                color: atingidos.has(f) ? '#000000' : 'white',
                weight: atingidos.has(f) ? 3 : 1.5,
                fillColor: (tipos[f.properties.tipo] || {}).cor || '#555555',
                fillOpacity: 1
            }),
            onEachFeature: (f, l) => l.bindPopup(
                `<b>${f.properties.nome}</b><br>${(tipos[f.properties.tipo] || {}).nome || f.properties.tipo}` +
                (atingidos.has(f) ? '<br><b style="color:#C62828">Dentro da área inundada neste cenário</b>' : ''))
        }).addTo(mapa);

        atualizarLegenda(atingidos);
        GeoMAPA.map.enquadrar(mapa, [camadaInundacao, camadaEquipamentos]);
    }

    /**
     * Reescreve a legenda dinâmica com área vulnerável e equipamentos atingidos do cenário.
     * @param {Set<Object>} atingidos Equipamentos dentro da área inundada.
     * @returns {void}
     */
    function atualizarLegenda(atingidos) {
        const cenario = config.cenarios.find(c => c.id === layers.estado.cenario);
        if (!cenario) { legenda.innerHTML = '<strong>Nenhum cenário cadastrado</strong>'; return; }
        const resumo = layers.resumoCenario(cenario.id);
        const porTipo = config.equipamentos.tipos.map(t =>
            `<div><span style="background:${t.cor};border-radius:50%"></span>${t.nome}: ${[...atingidos].filter(e => e.properties.tipo === t.valor).length} atingido(s)</div>`).join('');
        legenda.innerHTML = `
            <strong>Cenário ${cenario.nome}</strong>
            <div class="text-xs mb-1">${cenario.descricao}</div>
            <div><span style="background:${config.corInundacao}"></span>Área vulnerável: <b>${fmt(resumo.area)} km²</b></div>
            ${resumo.temPopulacao ? `<div>População exposta: <b>${fmt(resumo.populacao, 0)}</b></div>` : ''}
            ${porTipo}
            <div class="text-xs mt-1">Contorno preto = equipamento atingido</div>`;
    }

    /**
     * Monta o seletor de cenário, os filtros de equipamentos e o controle de transparência.
     * @returns {void}
     */
    function montarFiltros() {
        const cenarios = document.getElementById('filtro-cenario');
        config.cenarios.forEach(c => cenarios.appendChild(opcao({
            type: 'radio', name: 'cenario', value: c.id, label: `${c.nome}: ${c.descricao}`, checked: c.id === layers.estado.cenario
        })));
        cenarios.addEventListener('change', e => layers.definir('cenario', e.target.value));

        const equipamentos = document.getElementById('filtro-equipamentos');
        config.equipamentos.tipos.forEach(t => equipamentos.appendChild(opcao({ type: 'checkbox', value: t.valor, label: t.nome, checked: true, cor: t.cor })));
        equipamentos.addEventListener('change', () => layers.definir('tiposEquipamento', marcados(equipamentos)));

        const slider = document.getElementById('opacidade-costeiro');
        slider.value = opacidade;
        slider.addEventListener('input', () => {
            opacidade = parseFloat(slider.value);
            camadaInundacao.setStyle({ fillOpacity: opacidade });
        });
    }

    GeoMAPA.costeiro = {
        /**
         * Cria o mapa, os filtros e a legenda da aba. Chamada uma vez, depois de carregar os dados.
         * @returns {void}
         */
        init() {
            mapa = GeoMAPA.map.criarMapa('mapa-costeiro', config.centro, config.zoom);
            legenda = GeoMAPA.map.criarPainel(mapa, 'bottomright');
            montarFiltros();
            layers.aoMudar(desenhar);
            desenhar();
        },

        /**
         * Chamada quando a aba aparece: ajusta o tamanho do mapa e enquadra os dados.
         * @returns {void}
         */
        aoMostrar() {
            GeoMAPA.map.atualizarTamanho(() => GeoMAPA.map.enquadrar(mapa, [camadaInundacao, camadaEquipamentos]));
        }
    };
})();
