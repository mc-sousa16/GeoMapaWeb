/*
 * gemini.js: ANÁLISE INTELIGENTE
 *
 * Gera, com a API Gemini, um relatório técnico sobre as áreas filtradas na aba Suscetibilidade.
 */
(function () {
    // Atenção: uma chave colocada aqui fica pública no GitHub Pages. Use uma chave restrita ao domínio do site.
    const apiKey = "";

    /**
     * Envia um pedido de texto à API Gemini.
     * @param {string} prompt Pedido com os dados resumidos.
     * @returns {Promise<string>} Resposta em Markdown, ou mensagem de erro.
     */
    async function callGeminiAPI(prompt) {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        const systemPrompt = "Você é um especialista em geotecnia e análise de risco ambiental. Responda em português do Brasil e use Markdown.";
        const payload = { contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const result = await response.json();
            return result.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error("Erro na API Gemini:", error);
            return "Não foi possível gerar o relatório.";
        }
    }

    /**
     * Resume os polígonos filtrados, pede o relatório e mostra o resultado na página.
     * @returns {Promise<void>}
     */
    async function handleGenerateReportClick() {
        const reportContainer = document.getElementById('gemini-report-container');
        const spinner = document.getElementById('gemini-spinner');
        const reportContent = document.getElementById('gemini-report-content');
        const button = document.getElementById('gemini-analysis-button');

        reportContainer.classList.remove('hidden');
        reportContent.innerHTML = '';

        const features = GeoMAPA.layers.suscetibilidadeFiltrada();
        if (features.length === 0) {
            reportContent.innerHTML = "Nenhuma área de risco selecionada para análise.";
            return;
        }

        spinner.style.display = 'flex';
        button.disabled = true;
        button.classList.add('opacity-50');

        // Envia um resumo por classe em vez de cada polígono, para o pedido não ficar enorme.
        const resumo = GeoMAPA.suscetibilidade.resumoPorClasse(features);
        const municipios = [...new Set(features.map(f => f.properties.municipio))].join(', ');
        const formattedData = Object.entries(resumo)
            .map(([classe, r]) => `${classe}: ${r.poligonos} polígonos, ${r.area.toFixed(2)} km²${r.populacao ? `, ${r.populacao} habitantes` : ''}`).join('; ');
        const atingidos = GeoMAPA.layers.equipamentosAtingidos().length;
        const userPrompt = `Com base na carta de suscetibilidade a escorregamentos (metodologia Soares Jr. et al., 2022, classes S1: Estável, S2: Pouco Estável e S3: Instável) dos municípios ${municipios}: ${formattedData}. Equipamentos públicos em área de risco: ${atingidos}. Gere um breve relatório de alerta técnico contendo: 1. Resumo da situação. 2. Recomendações para as áreas S3: Instável. 3. Ações de monitoramento para as áreas S2: Pouco Estável.`;

        const resultText = await callGeminiAPI(userPrompt);
        reportContent.innerHTML = marked.parse(resultText);
        spinner.style.display = 'none';
        button.disabled = false;
        button.classList.remove('opacity-50');
    }

    GeoMAPA.gemini = {
        /**
         * Liga o botão "Analisar Risco".
         * @returns {void}
         */
        init() {
            document.getElementById('gemini-analysis-button').addEventListener('click', handleGenerateReportClick);
        }
    };
})();
