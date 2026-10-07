// Funções de agregação e o gráfico de rosca ao lado do mapa.
(function () {
    const config = GeoMAPA.config;
    const data = GeoMAPA.data;

    // Soma área (km²) e número de polígonos por classe de risco.
    function resumoPorClasse(features) {
        const resumo = {};
        config.classesRisco.forEach(c => { resumo[c] = { area: 0, poligonos: 0 }; });
        features.forEach(f => {
            const r = resumo[f.properties.risco];
            if (r) { r.area += f.properties.area_km2; r.poligonos++; }
        });
        return resumo;
    }

    function mostrarVazio(canvasId, vazio) {
        const canvas = document.getElementById(canvasId);
        canvas.classList.toggle('hidden', vazio);
        const aviso = canvas.parentElement.querySelector('.chart-empty');
        if (aviso) aviso.classList.toggle('hidden', !vazio);
    }

    let mapChart;

    function atualizarMapChart() {
        const resumo = resumoPorClasse(data.featuresFiltradas());
        const labels = config.classesRisco.filter(c => resumo[c].area > 0);
        mapChart.data.labels = labels;
        mapChart.data.datasets[0].data = labels.map(c => +resumo[c].area.toFixed(3));
        mapChart.data.datasets[0].backgroundColor = labels.map(c => config.riskColors[c]);
        mapChart.update();
        mostrarVazio('rmspChart', labels.length === 0);
    }

    GeoMAPA.charts = {
        resumoPorClasse,
        mostrarVazio,

        init() {
            mapChart = new Chart(document.getElementById('rmspChart'), {
                type: 'doughnut',
                data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderColor: '#FFFAFA', borderWidth: 4 }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed.toFixed(2)} km²` } }
                    }
                }
            });
            data.onChange(atualizarMapChart);
            atualizarMapChart();
        }
    };
})();
