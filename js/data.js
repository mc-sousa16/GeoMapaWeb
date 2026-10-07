// Prepara os dados das camadas e guarda o estado compartilhado dos filtros.
// Mapa, gráficos e aba Gestão leem daqui e são avisados quando os filtros mudam.
(function () {
    const config = GeoMAPA.config;
    const RAIO_TERRA = 6378137; // metros

    // Área geodésica aproximada de um anel [lon, lat], em m².
    function areaAnel(coords) {
        let area = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            const [lon1, lat1] = coords[i];
            const [lon2, lat2] = coords[i + 1];
            area += (lon2 - lon1) * Math.PI / 180 *
                (2 + Math.sin(lat1 * Math.PI / 180) + Math.sin(lat2 * Math.PI / 180));
        }
        return Math.abs(area * RAIO_TERRA * RAIO_TERRA / 2);
    }

    function areaPoligono(aneis) {
        // Primeiro anel é o contorno, os demais são buracos.
        return aneis.reduce((total, anel, i) => total + (i === 0 ? 1 : -1) * areaAnel(anel), 0);
    }

    function areaKm2(geometry) {
        if (!geometry) return 0;
        if (geometry.type === 'Polygon') return areaPoligono(geometry.coordinates) / 1e6;
        if (geometry.type === 'MultiPolygon') return geometry.coordinates.reduce((t, p) => t + areaPoligono(p), 0) / 1e6;
        return 0;
    }

    function primeiraCoordenada(geometry) {
        let c = geometry && geometry.coordinates;
        while (Array.isArray(c) && Array.isArray(c[0])) c = c[0];
        return c;
    }

    // Confere se o GeoJSON está em graus (EPSG:4326) e não em metros (UTM etc.).
    function estaEmWGS84(geojson) {
        const feature = geojson.features.find(f => f.geometry);
        if (!feature) return true;
        const [lon, lat] = primeiraCoordenada(feature.geometry) || [];
        return Math.abs(lon) <= 180 && Math.abs(lat) <= 90;
    }

    const camadas = config.camadas.map(camada => {
        const geojson = (window.GEODATA || {})[camada.id] || { type: 'FeatureCollection', features: [] };
        if (camada.tipo === 'suscetibilidade') {
            geojson.features.forEach(f => {
                f.properties = f.properties || {};
                f.properties.municipio = f.properties.municipio || camada.municipio;
                f.properties.risco = camada.mapeamentoRisco[f.properties[camada.campoRisco]] || 'Indefinido';
                f.properties.area_km2 = areaKm2(f.geometry);
            });
        }
        return { ...camada, geojson, coordenadasOk: estaEmWGS84(geojson) };
    });

    const municipios = [...new Set(
        camadas.filter(c => c.tipo === 'suscetibilidade')
            .flatMap(c => c.geojson.features.map(f => f.properties.municipio))
    )].sort();

    const state = {
        filtros: {
            risco: [...config.classesRisco],
            municipio: [...municipios],
            camadas: camadas.filter(c => c.visivel).map(c => c.id),
            opacidade: 0.7
        }
    };

    const ouvintes = [];

    GeoMAPA.data = {
        camadas,
        municipios,
        state,

        onChange(fn) { ouvintes.push(fn); },

        setFiltro(nome, valor) {
            state.filtros[nome] = valor;
            ouvintes.forEach(fn => fn(state));
        },

        // Feições de suscetibilidade que passam pelos filtros de risco, município e camada visível.
        featuresFiltradas() {
            const { risco, municipio, camadas: visiveis } = state.filtros;
            return camadas
                .filter(c => c.tipo === 'suscetibilidade' && visiveis.includes(c.id))
                .flatMap(c => c.geojson.features)
                .filter(f => risco.includes(f.properties.risco) && municipio.includes(f.properties.municipio));
        }
    };
})();
