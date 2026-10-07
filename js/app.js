// Navegação entre abas e inicialização dos módulos.
document.addEventListener('DOMContentLoaded', function () {
    const pages = document.querySelectorAll('.page-section');

    function switchPage(targetId) {
        pages.forEach(page => page.classList.toggle('hidden', page.id !== targetId));
        document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.target === targetId));
        if (targetId === 'map') GeoMAPA.map.invalidateSize();
        if (history.replaceState) history.replaceState(null, '', '#' + targetId);
    }

    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', () => switchPage(button.dataset.target));
    });

    GeoMAPA.map.init();
    GeoMAPA.filters.init();
    GeoMAPA.charts.init();
    GeoMAPA.gestao.init();
    GeoMAPA.repositorio.init();
    GeoMAPA.gemini.init();

    // Permite abrir direto numa aba pelo link, ex.: .../#gestao
    const inicial = location.hash.slice(1);
    const abas = Array.from(pages).map(p => p.id);
    switchPage(abas.includes(inicial) ? inicial : 'home');
});
