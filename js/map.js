// Mapa Leaflet: mapas de fundo, camadas temáticas e legenda.
(function () {
    const config = GeoMAPA.config;
    const data = GeoMAPA.data;

    let map;
    let baseAtual;
    const basesLeaflet = {};
    const camadasLeaflet = {};
    let jaEnquadrou = false;

    function estiloSuscetibilidade(f) {
        return {
            fillColor: config.riskColors[f.properties.risco] || '#999999',
            weight: 1, opacity: 1, color: 'white',
            fillOpacity: data.state.filtros.opacidade
        };
    }

    function popupSuscetibilidade(f) {
        const p = f.properties;
        return `<b>Município:</b> ${p.municipio}<br><b>Risco:</b> ${p.risco}<br><b>Área:</b> ${p.area_km2.toFixed(3)} km²`;
    }

    function criarLegenda() {
        const legenda = L.control({ position: 'bottomright' });
        legenda.onAdd = () => {
            const div = L.DomUtil.create('div', 'map-legend');
            div.innerHTML = '<strong>Suscetibilidade</strong>' + config.classesRisco.map(classe =>
                `<div><span style="background:${config.riskColors[classe]}"></span>${classe}</div>`
            ).join('');
            return div;
        };
        legenda.addTo(map);
    }

    function init() {
        map = L.map('map-rmsp').setView(config.mapa.centro, config.mapa.zoom);
        config.mapasBase.forEach(base => {
            basesLeaflet[base.id] = L.tileLayer(base.url, { attribution: base.attribution, maxZoom: 19 });
        });
        setMapaBase(config.mapasBase[0].id);
        L.control.scale({ imperial: false }).addTo(map);
        criarLegenda();

        const algumaForaDoPadrao = data.camadas.some(c => !c.coordenadasOk);
        document.getElementById('map-warning').classList.toggle('hidden', !algumaForaDoPadrao);

        data.onChange(render);
        render();
    }

    function setMapaBase(id) {
        if (baseAtual) map.removeLayer(baseAtual);
        baseAtual = basesLeaflet[id].addTo(map);
        baseAtual.bringToBack();
    }

    function render() {
        const { filtros } = data.state;

        data.camadas.forEach(camada => {
            if (camadasLeaflet[camada.id]) {
                map.removeLayer(camadasLeaflet[camada.id]);
                delete camadasLeaflet[camada.id];
            }
            if (!filtros.camadas.includes(camada.id) || !camada.coordenadasOk) return;

            let layer;
            if (camada.tipo === 'suscetibilidade') {
                layer = L.geoJSON(camada.geojson, {
                    filter: f => filtros.risco.includes(f.properties.risco) && filtros.municipio.includes(f.properties.municipio),
                    style: estiloSuscetibilidade,
                    onEachFeature: (f, l) => l.bindPopup(popupSuscetibilidade(f))
                });
            } else {
                layer = L.geoJSON(camada.geojson, {
                    style: { color: camada.cor || '#2F4F4F', weight: 2, fillOpacity: 0.1 },
                    onEachFeature: (f, l) => l.bindPopup(`<b>${camada.nome}</b>`)
                });
            }
            camadasLeaflet[camada.id] = layer.addTo(map);
        });

        enquadrar();
    }

    // Enquadra os dados só na primeira vez, para não tirar o usuário do lugar a cada clique de filtro.
    // Com a aba escondida o mapa tem tamanho zero, então espera ela aparecer.
    function enquadrar() {
        if (jaEnquadrou || map.getSize().x === 0) return;
        const visiveis = Object.values(camadasLeaflet);
        if (!visiveis.length) return;
        const limites = L.featureGroup(visiveis).getBounds();
        if (limites.isValid()) {
            map.fitBounds(limites.pad(0.01));
            jaEnquadrou = true;
        }
    }

    GeoMAPA.map = {
        init,
        setMapaBase,
        // O Leaflet precisa recalcular o tamanho quando a aba do mapa volta a aparecer.
        invalidateSize() {
            if (!map) return;
            setTimeout(() => { map.invalidateSize(); enquadrar(); }, 10);
        }
    };
})();
