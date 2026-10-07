/*
 * repositorio.js: ABA REPOSITÓRIO DE DADOS
 *
 * Acordeão com os arquivos de cada município, cadastrados em databaseData (config.js).
 */
(function () {
    const icone = '<svg class="w-5 h-5 transition-transform transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>';

    /**
     * Monta o acordeão de municípios e arquivos.
     * @returns {void}
     */
    function render() {
        const container = document.getElementById('database-container');
        container.innerHTML = '';
        const databaseData = GeoMAPA.config.databaseData;

        for (const municipio in databaseData) {
            const wrapper = document.createElement('div');
            wrapper.className = 'bg-white rounded-lg shadow-md';

            const header = document.createElement('button');
            header.className = 'w-full flex justify-between items-center p-4 text-left font-bold';
            header.innerHTML = `<span>${municipio}</span>${icone}`;

            const content = document.createElement('div');
            content.className = 'accordion-content px-4';
            const list = document.createElement('ul');
            list.className = 'space-y-3 pb-4';

            for (const layerName in databaseData[municipio]) {
                const info = databaseData[municipio][layerName];
                const li = document.createElement('li');
                li.className = 'flex items-center justify-between p-3 bg-fundo/50 rounded-md';
                li.innerHTML = `
                    <div>
                        <p class="font-semibold">${layerName}</p>
                        <p class="text-sm text-secundaria">${info.description}</p>
                    </div>
                    <a href="${info.url}" target="_blank" rel="noopener" class="bg-destaque/50 text-principal px-3 py-1 rounded-full text-sm font-semibold hover:bg-destaque">Acessar</a>`;
                list.appendChild(li);
            }
            content.appendChild(list);
            wrapper.append(header, content);
            container.appendChild(wrapper);

            header.addEventListener('click', () => {
                header.querySelector('svg').classList.toggle('rotate-180');
                content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + 'px';
            });
        }
    }

    GeoMAPA.repositorio = { init: render };
})();
