/*
 * gestao.js: ABA GESTÃO E TOMADA DE DECISÃO
 *
 * Painel com indicadores (KPIs), gráficos Chart.js e tabelas calculados a
 * partir dos mesmos GeoJSON dos mapas. Segue os filtros escolhidos nas abas
 * de mapa e permite imprimir/salvar em PDF ou exportar as tabelas em CSV.
 */
(function () {
    const config = GeoMAPA.config;
    const layers = GeoMAPA.layers;
    const { fmt, mostrarVazio } = GeoMAPA.ui;
    const { resumoPorClasse } = GeoMAPA.suscetibilidade;

    let graficoMunicipios;
    let graficoCenarios;
    // Linhas atuais das tabelas, guardadas para a exportação em CSV.
    let linhasPrioridade = [];
    let linhasCenarios = [];

    /**
     * Agrupa os polígonos de suscetibilidade por município.
     * @param {Array<Object>} features Feições filtradas.
     * @returns {Array<{municipio: string, resumo: Object, total: number, risco: number}>}
     *          Totais por município (risco = soma das classes de risco de config.js).
     */
    function porMunicipio(features) {
        const grupos = {};
        features.forEach(f => { (grupos[f.properties.municipio] = grupos[f.properties.municipio] || []).push(f); });
        return Object.entries(grupos).map(([municipio, fs]) => {
            const resumo = resumoPorClasse(fs);
            const total = Object.values(resumo).reduce((t, r) => t + r.area, 0);
            const risco = config.suscetibilidade.classesDeRisco.reduce((t, c) => t + (resumo[c] ? resumo[c].area : 0), 0);
            return { municipio, resumo, total, risco };
        }).sort((a, b) => b.risco - a.risco);
    }

    /**
     * Escreve o texto de um indicador.
     * @param {string} id id do elemento.
     * @param {string} texto Valor exibido.
     * @returns {void}
     */
    function kpi(id, texto) {
        document.getElementById(id).textContent = texto;
    }

    /**
     * Atualiza os cinco indicadores do topo do painel.
     * @param {Array<Object>} municipios Resultado de porMunicipio().
     * @returns {void}
     */
    function atualizarIndicadores(municipios) {
        const total = municipios.reduce((t, m) => t + m.total, 0);
        const risco = municipios.reduce((t, m) => t + m.risco, 0);
        kpi('kpi-area-risco', `${fmt(risco)} km²`);
        kpi('kpi-pct-risco', total > 0 ? `${fmt(risco / total * 100, 1)}% da área mapeada` : 'Sem dados de suscetibilidade');

        const cenario = config.costeiro.cenarios.find(c => c.id === layers.estado.cenario);
        const resumo = cenario ? layers.resumoCenario(cenario.id) : { area: 0, populacao: 0, temPopulacao: false };
        const nomeCenario = cenario ? `Cenário ${cenario.nome}` : 'Nenhum cenário';
        kpi('kpi-area-inundavel', `${fmt(resumo.area)} km²`);
        kpi('kpi-area-inundavel-cenario', nomeCenario);
        kpi('kpi-equipamentos', cenario ? String(layers.equipamentosAtingidos(cenario.id).length) : '0');
        kpi('kpi-equipamentos-cenario', nomeCenario);
        kpi('kpi-populacao', resumo.temPopulacao ? fmt(resumo.populacao, 0) : '–');
        kpi('kpi-populacao-nota', resumo.temPopulacao ? nomeCenario : 'Sem coluna de população no GeoJSON');
    }

    /**
     * Atualiza o gráfico de área por classe em cada município e a tabela de prioridades.
     * @param {Array<Object>} municipios Resultado de porMunicipio().
     * @returns {void}
     */
    function atualizarSuscetibilidade(municipios) {
        graficoMunicipios.data.labels = municipios.map(m => m.municipio);
        graficoMunicipios.data.datasets = config.suscetibilidade.classes.map(c => ({
            label: c.nome, backgroundColor: c.cor,
            data: municipios.map(m => +m.resumo[c.nome].area.toFixed(3))
        }));
        graficoMunicipios.update();
        mostrarVazio('grafico-gestao-municipios', municipios.length === 0);

        linhasPrioridade = municipios.map((m, i) => ({
            'Prioridade': `${i + 1}º`,
            'Município': m.municipio,
            'Área de risco (km²)': m.risco,
            'Área mapeada (km²)': m.total,
            '% em risco': m.total > 0 ? m.risco / m.total * 100 : 0
        }));
        preencherTabela('tabela-prioridades', linhasPrioridade, 'Nenhum dado de suscetibilidade carregado ou selecionado nos filtros.');
    }

    /**
     * Atualiza o gráfico de equipamentos atingidos e a tabela de comparação de cenários.
     * @returns {void}
     */
    function atualizarCenarios() {
        const cenarios = config.costeiro.cenarios;
        const tipos = config.costeiro.equipamentos.tipos;
        const atingidosPorCenario = cenarios.map(c => layers.equipamentosAtingidos(c.id));

        graficoCenarios.data.labels = cenarios.map(c => c.nome);
        graficoCenarios.data.datasets = tipos.map(t => ({
            label: t.nome, backgroundColor: t.cor,
            data: atingidosPorCenario.map(lista => lista.filter(e => e.properties.tipo === t.valor).length)
        }));
        graficoCenarios.update();
        const temDados = cenarios.some(c => (layers.cenarios[c.id] || []).length > 0);
        mostrarVazio('grafico-gestao-cenarios', !temDados);

        linhasCenarios = cenarios.map((c, i) => {
            const resumo = layers.resumoCenario(c.id);
            return {
                'Cenário': c.nome,
                'Área inundável (km²)': resumo.area,
                'Equipamentos atingidos': atingidosPorCenario[i].length,
                'População exposta': resumo.temPopulacao ? resumo.populacao : '–'
            };
        });
        preencherTabela('tabela-cenarios', linhasCenarios, 'Nenhum cenário cadastrado.');
    }

    /**
     * Preenche um <tbody> a partir de uma lista de objetos (uma chave por coluna).
     * @param {string} id id do <tbody>.
     * @param {Array<Object>} linhas Linhas da tabela.
     * @param {string} mensagemVazia Texto exibido quando não há linhas.
     * @returns {void}
     */
    function preencherTabela(id, linhas, mensagemVazia) {
        const tbody = document.getElementById(id);
        tbody.innerHTML = '';
        if (linhas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-3 text-secundaria text-sm">${mensagemVazia}</td></tr>`;
            return;
        }
        linhas.forEach(linha => {
            const tr = document.createElement('tr');
            tr.className = 'border-t';
            Object.values(linha).forEach((valor, i) => {
                const td = document.createElement('td');
                td.className = 'p-3' + (i > 1 || typeof valor === 'number' ? ' text-right' : '');
                td.textContent = typeof valor === 'number' ? fmt(valor, Number.isInteger(valor) ? 0 : 2) : valor;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    /**
     * Baixa uma tabela como CSV (separador ";" e vírgula decimal, que o Excel em português abre direto).
     * @param {Array<Object>} linhas Linhas da tabela.
     * @param {string} nomeArquivo Nome do arquivo baixado.
     * @returns {void}
     */
    function exportarCSV(linhas, nomeArquivo) {
        if (!linhas.length) return;
        const celula = v => {
            const texto = typeof v === 'number' ? fmt(v, Number.isInteger(v) ? 0 : 2) : String(v);
            return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
        };
        const csv = [Object.keys(linhas[0]).map(celula).join(';')]
            .concat(linhas.map(l => Object.values(l).map(celula).join(';'))).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nomeArquivo;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    /**
     * Lista as ações recomendadas para cada classe de suscetibilidade.
     * @returns {void}
     */
    function montarAcoes() {
        const lista = document.getElementById('gestao-acoes');
        config.suscetibilidade.classes.forEach(classe => {
            const li = document.createElement('li');
            li.className = 'flex items-start space-x-3';
            li.innerHTML = `<span class="mt-1 h-3 w-3 rounded-full flex-shrink-0" style="background:${classe.cor}"></span><div><p class="font-semibold"></p><p class="text-sm text-secundaria"></p></div>`;
            li.querySelector('.font-semibold').textContent = `Suscetibilidade ${classe.nome}`;
            li.querySelector('.text-sm').textContent = config.acoesPorClasse[classe.nome] || '';
            lista.appendChild(li);
        });
    }

    /**
     * Recalcula todo o painel.
     * @returns {void}
     */
    function atualizar() {
        const municipios = porMunicipio(layers.suscetibilidadeFiltrada());
        atualizarIndicadores(municipios);
        atualizarSuscetibilidade(municipios);
        atualizarCenarios();
    }

    /**
     * Opções comuns dos gráficos de barras empilhadas.
     * @param {string} tituloY Título do eixo vertical.
     * @param {boolean} [contagem=false] true para eixo só com números inteiros.
     * @returns {Object} Opções do Chart.js.
     */
    function opcoesBarras(tituloY, contagem = false) {
        return {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: contagem ? { precision: 0 } : {}, title: { display: true, text: tituloY } } },
            plugins: { legend: { position: 'bottom' } }
        };
    }

    GeoMAPA.gestao = {
        /**
         * Cria gráficos, botões e tabelas do painel. Chamada uma vez, depois de carregar os dados.
         * @returns {void}
         */
        init() {
            graficoMunicipios = new Chart(document.getElementById('grafico-gestao-municipios'), {
                type: 'bar', data: { labels: [], datasets: [] }, options: opcoesBarras('Área (km²)')
            });
            graficoCenarios = new Chart(document.getElementById('grafico-gestao-cenarios'), {
                type: 'bar', data: { labels: [], datasets: [] }, options: opcoesBarras('Equipamentos atingidos', true)
            });
            montarAcoes();
            document.getElementById('exportar-prioridades').addEventListener('click', () => exportarCSV(linhasPrioridade, 'geomapaweb_prioridades.csv'));
            document.getElementById('exportar-cenarios').addEventListener('click', () => exportarCSV(linhasCenarios, 'geomapaweb_cenarios.csv'));
            document.getElementById('imprimir-relatorio').addEventListener('click', () => window.print());
            layers.aoMudar(atualizar);
            atualizar();
        }
    };
})();
