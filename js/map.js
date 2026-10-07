/*
 * map.js: FUNÇÕES COMUNS DOS MAPAS LEAFLET
 *
 * Cria os mapas das abas com o seletor de mapa de fundo, a escala e os
 * painéis de legenda. A aba Suscetibilidade (suscetibilidade.js) usa estas funções.
 */
(function () {
    const config = GeoMAPA.config;
    const mapas = [];

    /**
     * Cria um mapa Leaflet com os mapas de fundo de config.js e a barra de escala.
     * @param {string} elementoId id da <div> que receberá o mapa.
     * @param {Array<number>} centro [latitude, longitude] da vista inicial.
     * @param {number} zoom Nível de zoom inicial.
     * @returns {L.Map} Mapa criado.
     */
    function criarMapa(elementoId, centro, zoom) {
        const mapa = L.map(elementoId).setView(centro, zoom);
        const bases = {};
        config.mapasBase.forEach((base, i) => {
            const camada = L.tileLayer(base.url, { attribution: base.attribution, maxZoom: base.maxZoom || 19 });
            bases[base.nome] = camada;
            if (i === 0) camada.addTo(mapa);
        });
        L.control.layers(bases, null, { position: 'topright', collapsed: false }).addTo(mapa);
        L.control.scale({ imperial: false }).addTo(mapa);
        mapa._jaEnquadrado = false;
        mapas.push(mapa);
        return mapa;
    }

    /**
     * Adiciona ao mapa um painel (ex.: legenda) cujo conteúdo pode ser trocado depois.
     * @param {L.Map} mapa Mapa que recebe o painel.
     * @param {string} posicao 'topleft', 'topright', 'bottomleft' ou 'bottomright'.
     * @returns {HTMLElement} Elemento do painel; altere seu innerHTML para atualizar.
     */
    function criarPainel(mapa, posicao) {
        const controle = L.control({ position: posicao });
        const div = L.DomUtil.create('div', 'map-legend');
        controle.onAdd = () => div;
        controle.addTo(mapa);
        L.DomEvent.disableClickPropagation(div);
        return div;
    }

    /**
     * Monta o HTML de uma legenda com quadradinhos coloridos.
     * @param {string} titulo Título da legenda.
     * @param {Array<{nome: string, cor: string, redondo: boolean}>} itens Classes exibidas
     *        (redondo = true desenha um círculo, para pontos).
     * @returns {string} HTML da legenda.
     */
    function htmlLegenda(titulo, itens) {
        return `<strong>${titulo}</strong>` + itens.map(i =>
            `<div><span style="background:${i.cor}${i.redondo ? ';border-radius:50%' : ''}"></span>${i.nome}</div>`).join('');
    }

    /**
     * Aproxima o mapa das camadas visíveis. Só age uma vez e só com a aba aparecendo,
     * porque um mapa escondido tem tamanho zero.
     * @param {L.Map} mapa Mapa a enquadrar.
     * @param {Array<L.Layer>} camadas Camadas cujos limites serão usados.
     * @param {boolean} [forcar=false] Enquadra mesmo que já tenha enquadrado antes.
     * @returns {void}
     */
    function enquadrar(mapa, camadas, forcar = false) {
        if ((mapa._jaEnquadrado && !forcar) || mapa.getSize().x === 0) return;
        const limites = L.featureGroup(camadas).getBounds();
        if (limites.isValid()) {
            mapa.fitBounds(limites.pad(0.02));
            mapa._jaEnquadrado = true;
        }
    }

    GeoMAPA.map = {
        criarMapa,
        criarPainel,
        htmlLegenda,
        enquadrar,

        /**
         * Recalcula o tamanho dos mapas quando uma aba volta a aparecer.
         * @param {Function} [depois] Função chamada em seguida (ex.: enquadrar os dados).
         * @returns {void}
         */
        atualizarTamanho(depois) {
            setTimeout(() => {
                mapas.forEach(m => m.invalidateSize());
                if (depois) depois();
            }, 10);
        }
    };
})();
