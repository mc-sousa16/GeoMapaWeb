/*
 * app.js: NAVEGAÇÃO ENTRE ABAS E INICIALIZAÇÃO
 *
 * Carrega os GeoJSON (layers.js) e depois inicia cada aba.
 */
document.addEventListener('DOMContentLoaded', async function () {
    const pages = document.querySelectorAll('.page-section');
    const abas = Array.from(pages).map(p => p.id);
    const aoMostrar = {
        suscetibilidade: () => GeoMAPA.suscetibilidade.aoMostrar(),
        costeiro: () => GeoMAPA.costeiro.aoMostrar()
    };
    let pronto = false;

    /**
     * Mostra uma aba e esconde as outras.
     * @param {string} targetId id da <section> da aba.
     * @returns {void}
     */
    function switchPage(targetId) {
        pages.forEach(page => page.classList.toggle('hidden', page.id !== targetId));
        document.querySelectorAll('.nav-button').forEach(button => {
            const ativo = button.dataset.target === targetId;
            button.classList.toggle('active', ativo);
            if (button.closest('nav')) button.setAttribute('aria-current', ativo ? 'page' : 'false');
        });
        if (pronto && aoMostrar[targetId]) aoMostrar[targetId]();
        if (history.replaceState) history.replaceState(null, '', '#' + targetId);
        window.scrollTo(0, 0);
    }

    /**
     * Exibe no topo do site os problemas encontrados ao carregar os dados.
     * @param {Array<string>} avisos Mensagens.
     * @returns {void}
     */
    function mostrarAvisos(avisos) {
        if (!avisos.length) return;
        const caixa = document.getElementById('avisos-dados');
        const arquivoLocal = location.protocol === 'file:';
        caixa.innerHTML = '<p class="font-bold mb-1">Alguns dados não foram carregados</p>' +
            (arquivoLocal ? '<p class="mb-1">O site foi aberto direto do arquivo. Para testar no computador, use um servidor local (veja a aba Guia do Estudante).</p>' : '');
        const lista = document.createElement('ul');
        lista.className = 'list-disc list-inside';
        avisos.forEach(a => { const li = document.createElement('li'); li.textContent = a; lista.appendChild(li); });
        caixa.appendChild(lista);
        caixa.classList.remove('hidden');
    }

    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', () => switchPage(button.dataset.target));
    });

    // Permite abrir direto numa aba pelo link, ex.: .../#gestao
    const inicial = location.hash.slice(1);
    switchPage(abas.includes(inicial) ? inicial : 'home');

    await GeoMAPA.layers.carregar();
    mostrarAvisos(GeoMAPA.layers.avisos);

    GeoMAPA.suscetibilidade.init();
    GeoMAPA.costeiro.init();
    GeoMAPA.gestao.init();
    GeoMAPA.repositorio.init();
    GeoMAPA.gemini.init();
    pronto = true;

    const atual = location.hash.slice(1);
    if (aoMostrar[atual]) aoMostrar[atual]();
});
