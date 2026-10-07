/*
 * gestao.js: ABA GESTÃO E TOMADA DE DECISÃO
 *
 * Painel com indicadores (KPIs), gráficos Chart.js e tabelas calculados a
 * partir dos mesmos GeoJSON do mapa. As contas de risco usam as classes de
 * risco ativas (classesDeRisco em config.js, mais S2/Moderado se o seletor
 * estiver marcado) e o município escolhido na aba Suscetibilidade.
 * Permite imprimir/salvar em PDF e exportar as tabelas em CSV.
 */
(function () {
    const config = GeoMAPA.config.suscetibilidade;
    const acoesPorClasse = GeoMAPA.config.acoesPorClasse;
    const layers = GeoMAPA.layers;
    const { fmt, mostrarVazio } = GeoMAPA.ui;
    const { resumoPorClasse } = GeoMAPA.suscetibilidade;

    let graficoMunicipios;
    let graficoEquipamentos;
    // Linhas atuais das tabelas, guardadas para a exportação em CSV.
    let linhasPrioridade = [];
    let linhasEquipamentos = [];

    /**
     * Soma uma propriedade numérica de uma lista de feições.
     * @param {Array<Object>} features Feições GeoJSON.
     * @param {string} campo Nome da propriedade (ex.: 'area_km2').
     * @returns {number} Soma.
     */
    function somar(features, campo) {
        return features.reduce((t, f) => t + (f.properties[campo] || 0), 0);
    }

    /**
     * Calcula os totais de cada município: área mapeada, área de risco, população exposta e equipamentos atingidos.
     * @param {Array<Object>} atingidos Equipamentos atingidos filtrados.
     * @returns {Array<Object>} Totais por município, do maior para o menor risco.
     */
    function porMunicipio(atingidos) {
        const grupos = {};
        layers.suscetibilidade.filter(f => layers.noMunicipio(f)).forEach(f => {
            (grupos[f.properties.municipio] = grupos[f.properties.municipio] || []).push(f);
        });
        return Object.entries(grupos).map(([municipio, fs]) => {
            const deRisco = fs.filter(f => layers.ehRisco(f.properties));
            return {
                municipio,
                resumo: resumoPorClasse(fs.filter(f => layers.estado.classes.includes(f.properties.classe))),
                total: somar(fs, 'area_km2'),
                risco: somar(deRisco, 'area_km2'),
                populacao: somar(deRisco, 'populacao_estimada'),
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
     * Atualiza os quatro indicadores do topo do painel e o texto das classes de risco ativas.
     * @param {Array<Object>} municipios Resultado de porMunicipio().
     * @param {Array<Object>} atingidos Equipamentos atingidos filtrados.
     * @returns {void}
     */
    function atualizarIndicadores(municipios, atingidos) {
        const total = municipios.reduce((t, m) => t + m.total, 0);
        const risco = municipios.reduce((t, m) => t + m.risco, 0);
        const populacao = municipios.reduce((t, m) => t + m.populacao, 0);

        kpi('classes-risco-ativas', layers.classesDeRiscoAtivas().join(', '));
        kpi('kpi-area-risco', `${fmt(risco)} km²`);
        kpi('kpi-area-risco-nota', total > 0 ? `${fmt(risco / total * 100, 1)}% da área mapeada` : 'Sem dados de suscetibilidade');
        kpi('kpi-area-total', `${fmt(total)} km²`);
        kpi('kpi-equipamentos', atingidos.length.toLocaleString('pt-BR'));
        kpi('kpi-equipamentos-nota', layers.equipamentos.length ? `de ${layers.equipamentosFiltrados().length} equipamentos cadastrados` : 'Nenhum equipamento cadastrado');
        kpi('kpi-populacao', layers.temPopulacao ? fmt(populacao, 0) : '–');
        kpi('kpi-populacao-nota', layers.temPopulacao ? 'Residentes nas áreas de risco (IBGE)' : 'Sem coluna de população no GeoJSON');
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

        // Equipamentos por classe de estabilidade do local, empilhados por categoria.
        const equipamentos = layers.equipamentosFiltrados().filter(e => e.properties.classe);
        graficoEquipamentos.data.labels = config.classes.map(c => c.nome);
        graficoEquipamentos.data.datasets = layers.categorias.map(cat => ({
            label: cat.nome, backgroundColor: cat.cor,
            data: config.classes.map(c => equipamentos.filter(e => e.properties.categoria === cat.nome && e.properties.classe === c.nome).length)
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
        preencherTabela('tabela-prioridades', linhasPrioridade, 'Nenhum dado de suscetibilidade carregado para o município escolhido.');

        const ordem = config.classes.map(c => c.nome);
        linhasEquipamentos = atingidos
            .slice().sort((a, b) => ordem.indexOf(a.properties.classe) - ordem.indexOf(b.properties.classe))
            .map(e => ({
                'Nome': e.properties.nome,
                'Tipo': e.properties.tipo || e.properties.categoria,
                'Município': e.properties.municipio || '–',
                'Classe de Estabilidade': e.properties.classe,
                'Grau de Risco': e.properties.grau || '–',
                'Fonte': e.properties.fonte || '–'
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
                td.className = 'p-3' + (typeof valor === 'number' ? ' text-right' : '');
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
     * Lista as ações recomendadas para cada classe de estabilidade.
     * @returns {void}
     */
    function montarAcoes() {
        const lista = document.getElementById('gestao-acoes');
        config.classes.forEach(classe => {
            const li = document.createElement('li');
            li.className = 'flex items-start space-x-3';
            li.innerHTML = `<span class="mt-1 h-3 w-3 rounded-full flex-shrink-0" style="background:${classe.cor}"></span><div><p class="font-semibold"></p><p class="text-sm text-secundaria"></p></div>`;
            li.querySelector('.font-semibold').textContent = `${classe.nome} (${classe.graus.join(' / ')})`;
            li.querySelector('.text-sm').textContent = acoesPorClasse[classe.nome] || '';
            lista.appendChild(li);
        });
    }

    /**
     * Liga o seletor que inclui S2: Pouco Estável / Moderado nas classes de risco.
     * @returns {void}
     */
    function montarSeletorRisco() {
        const seletor = document.getElementById('incluir-opcionais');
        document.getElementById('rotulo-opcionais').textContent = `Incluir ${config.classesDeRiscoOpcionais.join(' / ')} nas classes de risco`;
        seletor.checked = layers.estado.incluirOpcionais;
        seletor.addEventListener('change', () => layers.definir('incluirOpcionais', seletor.checked));
    }

    /**
     * Recalcula todo o painel.
     * @returns {void}
     */
    function atualizar() {
        const atingidos = layers.equipamentosAtingidos();
        const municipios = porMunicipio(atingidos);
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
            montarSeletorRisco();
            document.getElementById('exportar-prioridades').addEventListener('click', () => exportarCSV(linhasPrioridade, 'geomapaweb_prioridades.csv'));
            document.getElementById('exportar-equipamentos').addEventListener('click', () => exportarCSV(linhasEquipamentos, 'geomapaweb_equipamentos_em_risco.csv'));
            document.getElementById('imprimir-relatorio').addEventListener('click', () => window.print());
            layers.aoMudar(atualizar);
            atualizar();
        }
    };
})();
