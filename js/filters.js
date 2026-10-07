// Barra lateral do mapa: seletor de camadas e painel de filtros.
(function () {
    const config = GeoMAPA.config;
    const data = GeoMAPA.data;

    function opcao({ type, name, value, label, checked, cor }) {
        const el = document.createElement('label');
        el.className = 'flex items-center space-x-2 cursor-pointer';
        const input = document.createElement('input');
        Object.assign(input, { type, name, value, checked });
        input.className = 'h-4 w-4 rounded';
        if (cor) input.style.accentColor = cor;
        const span = document.createElement('span');
        span.className = 'text-principal';
        span.textContent = label;
        el.append(input, span);
        return el;
    }

    function marcados(container) {
        return Array.from(container.querySelectorAll('input:checked')).map(i => i.value);
    }

    function montarMapasBase() {
        const container = document.getElementById('basemap-selector');
        config.mapasBase.forEach((base, i) => {
            container.appendChild(opcao({ type: 'radio', name: 'mapa-base', value: base.id, label: base.nome, checked: i === 0 }));
        });
        container.addEventListener('change', e => GeoMAPA.map.setMapaBase(e.target.value));
    }

    function montarCamadas() {
        const container = document.getElementById('layer-selector');
        data.camadas.forEach(camada => {
            container.appendChild(opcao({
                type: 'checkbox', value: camada.id,
                label: `${camada.nome} (${camada.municipio})`,
                checked: data.state.filtros.camadas.includes(camada.id)
            }));
        });
        container.addEventListener('change', () => data.setFiltro('camadas', marcados(container)));
    }

    function montarRisco() {
        const container = document.getElementById('filters-risco');
        config.classesRisco.forEach(classe => {
            container.appendChild(opcao({ type: 'checkbox', value: classe, label: `Risco ${classe}`, checked: true, cor: config.riskColors[classe] }));
        });
        container.addEventListener('change', () => data.setFiltro('risco', marcados(container)));
    }

    function montarMunicipios() {
        const container = document.getElementById('municipio-filter-container');
        if (data.municipios.length === 0) {
            container.innerHTML = '<p class="text-xs text-secundaria">Nenhum dado de município carregado.</p>';
            return;
        }
        data.municipios.forEach(m => container.appendChild(opcao({ type: 'checkbox', value: m, label: m, checked: true })));
        container.addEventListener('change', () => data.setFiltro('municipio', marcados(container)));
    }

    function montarOpacidade() {
        const input = document.getElementById('opacity-slider');
        input.value = data.state.filtros.opacidade;
        input.addEventListener('input', () => data.setFiltro('opacidade', parseFloat(input.value)));
    }

    function limpar() {
        document.querySelectorAll('#filters-risco input, #municipio-filter-container input').forEach(i => { i.checked = true; });
        data.state.filtros.risco = [...config.classesRisco];
        data.setFiltro('municipio', [...data.municipios]);
    }

    GeoMAPA.filters = {
        init() {
            montarMapasBase();
            montarCamadas();
            montarRisco();
            montarMunicipios();
            montarOpacidade();
            document.getElementById('reset-filters').addEventListener('click', limpar);
        }
    };
})();
