/*
 * gestao.js: ABA GESTÃO E TOMADA DE DECISÃO
 *
 * Painel com indicadores (KPIs), gráficos Chart.js e tabelas calculados a
 * partir dos mesmos GeoJSON do mapa. Segue os filtros escolhidos na aba
 * Suscetibilidade e permite imprimir/salvar em PDF ou exportar as tabelas em CSV.
 */
(function () {
    const config = GeoMAPA.config.suscetibilidade;
    const acoesPorClasse = GeoMAPA.config.acoesPorClasse;
    const layers = GeoMAPA.layers;
    const { fmt, mostrarVazio } = GeoMAPA.ui;
    const { resumoPorClasse } = GeoMAPA.suscetibilidade;
    const tipos = Object.fromEntries(config.equipamentos.tipos.map(t => [t.valor, t]));

    let graficoMunicipios;
    let graficoEquipamentos;
    // Linhas atuais das tabelas, guardadas para a exportação em CSV.
    let linhasPrioridade = [];
    let linhasEquipamentos = [];

    /**
     * Informa se uma classe entra na conta de risco (classesDeRisco em config.js).
     * @param {string} classe Nome da classe.
     * @returns {boolean} true se for classe de risco.
     */
    function ehRisco(classe) {
        return config.classesDeRisco.includes(classe);
    }

    /**
     * Equipamentos atingidos que passam pelos filtros (tipo, município e grau marcados).
     * @returns {Array<Object>} Feições de ponto.
     */
    function equipamentosAtingidos() {
        return layers.equipamentosFiltrados().filter(e => e.properties.atingido && layers.estado.classes.includes(e.properties.classe));
    }

    /**
     * Agrupa polígonos e equipamentos por município e calcula os totais de cada um.
     * @param {Array<Object>} features Polígonos de suscetibilidade filtrados.
     * @param {Array<Object>} atingidos Equipamentos atingidos filtrados.
     * @returns {Array<{municipio: string, resumo: Object, total: number, risco: number, populacao: number, equipamentos: number}>}
     *          Totais por município, do maior para o menor risco.
     */
    function porMunicipio(features, atingidos) {
        const grupos = {};
        features.forEach(f => { (grupos[f.properties.municipio] = grupos[f.properties.municipio] || []).push(f); });
        return Object.entries(grupos).map(([municipio, fs]) => {
            const resumo = resumoPorClasse(fs);
            const deRisco = fs.filter(f => ehRisco(f.properties.classe));
            return {
                municipio,
                resumo,
                total: fs.reduce((t, f) => t + f.properties.area_km2, 0),
                risco: deRisco.reduce((t, f) => t + f.properties.area_km2, 0),
                populacao: deRisco.reduce((t, f) => t + f.properties.populacao_estimada, 0),
                equipamentos: atingidos.filter(e => e.properties.municipio === municipio).length
            };
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
     * Atualiza os quatro indicadores do topo do painel.
     * @param {Array<Object>} municipios Resultado de porMunicipio().
     * @param {Array<Object>} atingidos Equipamentos atingidos filtrados.
     * @returns {void}
     */
    function atualizarIndicadores(municipios, atingidos) {
        const total = municipios.reduce((t, m) => t + m.total, 0);
        const risco = municipios.reduce((t, m) => t + m.risco, 0);
        const populacao = municipios.reduce((t, m) => t + m.populacao, 0);
        const classes = config.classesDeRisco.join(' e ');

        kpi('kpi-area-risco', `${fmt(risco)} km²`);
        kpi('kpi-area-risco-nota', total > 0 ? `${fmt(risco / total * 100, 1)}% da área mapeada (${classes})` : 'Sem dados de suscetibilidade');
        kpi('kpi-area-total', `${fmt(total)} km²`);
        kpi('kpi-equipamentos', atingidos.length.toLocaleString('pt-BR'));
        kpi('kpi-equipamentos-nota', layers.equipamentos.length ? `de ${layers.equipamentosFiltrados().length} cadastrados, em áreas ${classes}` : 'Nenhum equipamento cadastrado');
        kpi('kpi-populacao', layers.temPopulacao ? fmt(populacao, 0) : '–');
        kpi('kpi-populacao-nota', layers.temPopulacao ? `Residentes em áreas ${classes}` : 'Sem coluna de população no GeoJSON');
    }

    /**
     * Atualiza os dois gráficos.
     * @param {Array<Object>} municipios Resultado de porMunicipio().
     * @returns {void}
     */
    function atualizarGraficos(municipios) {
        graficoMunicipios.data.labels = municipios.map(m => m.municipio);
        graficoMunicipios.data.datasets = config.classes.map(c => ({
            label: c.nome, backgroundColor: c.cor,
            data: municipios.map(m => +m.resumo[c.nome].area.toFixed(3))
        }));
        graficoMunicipios.update();
        mostrarVazio('grafico-gestao-municipios', municipios.length === 0);

        // Equipamentos por grau de suscetibilidade do local, empilhados por tipo.
        const equipamentos = layers.equipamentosFiltrados().filter(e => e.properties.classe && layers.estado.classes.includes(e.properties.classe));
        graficoEquipamentos.data.labels = config.classes.map(c => c.nome);
        graficoEquipamentos.data.datasets = config.equipamentos.tipos.map(t => ({
            label: t.nome, backgroundColor: t.cor,
            data: config.classes.map(c => equipamentos.filter(e => e.properties.tipo === t.valor && e.properties.classe === c.nome).length)
        }));
        graficoEquipamentos.update();
        mostrarVazio('grafico-gestao-equipamentos', equipamentos.length === 0);
    }

    /**
     * Atualiza as tabelas de prioridade por município e de equipamentos em área de risco.
     * @param {Array<Object>} municipios Resultado de porMunicipio().
     * @param {Array<Object>} atingidos Equipamentos atingidos filtrados.
     * @returns {void}
     */
    function atualizarTabelas(municipios, atingidos) {
        linhasPrioridade = municipios.map((m, i) => ({
            'Prioridade': `${i + 1}º`,
            'Município': m.municipio,
            'Área de risco (km²)': m.risco,
            '% em risco': m.total > 0 ? m.risco / m.total * 100 : 0,
            'Equipamentos atingidos': m.equipamentos,
            'População exposta': layers.temPopulacao ? m.populacao : '–'
        }));
        preencherTabela('tabela-prioridades', linhasPrioridade, 'Nenhum dado de suscetibilidade carregado ou selecionado nos filtros.');

        const ordem = config.classes.map(c => c.nome);
        linhasEquipamentos = atingidos
            .slice().sort((a, b) => ordem.indexOf(a.properties.classe) - ordem.indexOf(b.properties.classe))
            .map(e => ({
                'Equipamento': e.properties.nome,
                'Tipo': (tipos[e.properties.tipo] || {}).nome || e.properties.tipo,
                'Município': e.properties.municipio,
                'Suscetibilidade': e.properties.classe
            }));
        preencherTabela('tabela-equipamentos', linhasEquipamentos, 'Nenhum equipamento público em área de risco com os filtros atuais.');
    }

    /**
     * Preenche um <tbody> a partir de uma lista de objetos (uma chave por coluna).
     * Números ficam alinhados à direita e no formato brasileiro.
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
            Object.values(linha).forEach(valor => {
                const td = document.createElement('td');
                td.className = 'p-3' + (typeof valor === 'number' || valor === '–' ? ' text-right' : '');
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
     * Lista as ações recomendadas para cada grau de suscetibilidade.
     * @returns {void}
     */
    function montarAcoes() {
        const lista = document.getElementById('gestao-acoes');
        config.classes.forEach(classe => {
            const li = document.createElement('li');
            li.className = 'flex items-start space-x-3';
            li.innerHTML = `<span class="mt-1 h-3 w-3 rounded-full flex-shrink-0" style="background:${classe.cor}"></span><div><p class="font-semibold"></p><p class="text-sm text-secundaria"></p></div>`;
            li.querySelector('.font-semibold').textContent = `Suscetibilidade ${classe.nome}`;
            li.querySelector('.text-sm').textContent = acoesPorClasse[classe.nome] || '';
            lista.appendChild(li);
        });
    }

    /**
     * Recalcula todo o painel.
     * @returns {void}
     */
    function atualizar() {
        const atingidos = equipamentosAtingidos();
        const municipios = porMunicipio(layers.suscetibilidadeFiltrada(), atingidos);
        atualizarIndicadores(municipios, atingidos);
        atualizarGraficos(municipios);
        atualizarTabelas(municipios, atingidos);
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
            graficoEquipamentos = new Chart(document.getElementById('grafico-gestao-equipamentos'), {
                type: 'bar', data: { labels: [], datasets: [] }, options: opcoesBarras('Equipamentos', true)
            });
            montarAcoes();
            document.getElementById('exportar-prioridades').addEventListener('click', () => exportarCSV(linhasPrioridade, 'geomapaweb_prioridades.csv'));
            document.getElementById('exportar-equipamentos').addEventListener('click', () => exportarCSV(linhasEquipamentos, 'geomapaweb_equipamentos_em_risco.csv'));
            document.getElementById('imprimir-relatorio').addEventListener('click', () => window.print());
            layers.aoMudar(atualizar);
            atualizar();
        }
    };
})();
