// Aba Gestão / Tomada de Decisão: indicadores, gráficos por município e tabela de prioridades.
// Usa os mesmos filtros do mapa, para que o gestor veja os números da área que está analisando.
(function () {
    const config = GeoMAPA.config;
    const data = GeoMAPA.data;
    const { resumoPorClasse, mostrarVazio } = GeoMAPA.charts;

    let chartMunicipios;
    let chartProporcao;

    const fmt = n => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function porMunicipio(features) {
        const grupos = {};
        features.forEach(f => {
            (grupos[f.properties.municipio] = grupos[f.properties.municipio] || []).push(f);
        });
        return Object.entries(grupos).map(([municipio, fs]) => {
            const resumo = resumoPorClasse(fs);
            const total = config.classesRisco.reduce((t, c) => t + resumo[c].area, 0);
            return { municipio, resumo, total };
        });
    }

    function atualizarIndicadores(features, resumo) {
        const total = config.classesRisco.reduce((t, c) => t + resumo[c].area, 0);
        const alto = resumo['Alto'] ? resumo['Alto'].area : 0;
        document.getElementById('kpi-area-total').textContent = `${fmt(total)} km²`;
        document.getElementById('kpi-area-alto').textContent = `${fmt(alto)} km²`;
        document.getElementById('kpi-pct-alto').textContent = total > 0 ? `${fmt(alto / total * 100)}%` : '–';
        document.getElementById('kpi-poligonos').textContent = features.length.toLocaleString('pt-BR');
    }

    function atualizarGraficos(resumo, municipios) {
        chartMunicipios.data.labels = municipios.map(m => m.municipio);
        chartMunicipios.data.datasets = config.classesRisco.map(classe => ({
            label: classe,
            data: municipios.map(m => +m.resumo[classe].area.toFixed(3)),
            backgroundColor: config.riskColors[classe]
        }));
        chartMunicipios.update();
        mostrarVazio('gestaoMunicipiosChart', municipios.length === 0);

        const labels = config.classesRisco.filter(c => resumo[c].area > 0);
        chartProporcao.data.labels = labels;
        chartProporcao.data.datasets[0].data = labels.map(c => +resumo[c].area.toFixed(3));
        chartProporcao.data.datasets[0].backgroundColor = labels.map(c => config.riskColors[c]);
        chartProporcao.update();
        mostrarVazio('gestaoProporcaoChart', labels.length === 0);
    }

    function atualizarPrioridades(municipios) {
        const tbody = document.getElementById('gestao-prioridades');
        tbody.innerHTML = '';
        if (municipios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-secundaria text-sm">Nenhum dado de suscetibilidade carregado ou selecionado nos filtros.</td></tr>';
            return;
        }
        // Prioridade: maior área de risco alto primeiro, desempate pela de risco médio.
        municipios
            .sort((a, b) => (b.resumo['Alto'].area - a.resumo['Alto'].area) || (b.resumo['Médio'].area - a.resumo['Médio'].area))
            .forEach((m, i) => {
                const pctAlto = m.total > 0 ? m.resumo['Alto'].area / m.total * 100 : 0;
                const tr = document.createElement('tr');
                tr.className = 'border-t';
                tr.innerHTML = `
                    <td class="p-3 font-bold">${i + 1}º</td>
                    <td class="p-3"></td>
                    <td class="p-3 text-right">${fmt(m.resumo['Alto'].area)}</td>
                    <td class="p-3 text-right">${fmt(m.resumo['Médio'].area)}</td>
                    <td class="p-3 text-right">${fmt(pctAlto)}%</td>`;
                tr.children[1].textContent = m.municipio;
                tbody.appendChild(tr);
            });
    }

    function montarAcoes() {
        const lista = document.getElementById('gestao-acoes');
        config.classesRisco.forEach(classe => {
            const li = document.createElement('li');
            li.className = 'flex items-start space-x-3';
            li.innerHTML = `<span class="mt-1 h-3 w-3 rounded-full flex-shrink-0" style="background:${config.riskColors[classe]}"></span><div><p class="font-semibold"></p><p class="text-sm text-secundaria"></p></div>`;
            li.querySelector('.font-semibold').textContent = `Risco ${classe}`;
            li.querySelector('.text-sm').textContent = config.acoesPorClasse[classe] || '';
            lista.appendChild(li);
        });
    }

    function atualizar() {
        const features = data.featuresFiltradas();
        const resumo = resumoPorClasse(features);
        const municipios = porMunicipio(features);
        atualizarIndicadores(features, resumo);
        atualizarGraficos(resumo, municipios);
        atualizarPrioridades(municipios);
    }

    GeoMAPA.gestao = {
        init() {
            chartMunicipios = new Chart(document.getElementById('gestaoMunicipiosChart'), {
                type: 'bar',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: 'Área (km²)' } } },
                    plugins: { legend: { position: 'bottom' } }
                }
            });
            chartProporcao = new Chart(document.getElementById('gestaoProporcaoChart'), {
                type: 'pie',
                data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderColor: '#FFFAFA', borderWidth: 2 }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: ctx => {
                                    const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                    return `${ctx.label}: ${fmt(ctx.parsed)} km² (${fmt(ctx.parsed / total * 100)}%)`;
                                }
                            }
                        }
                    }
                }
            });
            montarAcoes();
            data.onChange(atualizar);
            atualizar();
        }
    };
})();
