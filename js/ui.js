/*
 * ui.js: PEQUENAS FUNÇÕES DE INTERFACE USADAS POR VÁRIAS ABAS
 */
(function () {
    GeoMAPA.ui = {
        /**
         * Cria um <label> com checkbox ou radio.
         * @param {Object} opcoes
         * @param {string} opcoes.type 'checkbox' ou 'radio'.
         * @param {string} opcoes.name Nome do grupo (radios do mesmo grupo se excluem).
         * @param {string} opcoes.value Valor enviado ao filtro.
         * @param {string} opcoes.label Texto exibido.
         * @param {boolean} opcoes.checked Se começa marcado.
         * @param {string} [opcoes.cor] Cor da caixinha.
         * @returns {HTMLLabelElement} Elemento pronto para inserir na página.
         */
        opcao({ type, name, value, label, checked, cor }) {
            const el = document.createElement('label');
            el.className = 'flex items-center space-x-2 cursor-pointer';
            const input = document.createElement('input');
            Object.assign(input, { type, name: name || '', value, checked });
            input.className = 'h-4 w-4';
            if (cor) input.style.accentColor = cor;
            const span = document.createElement('span');
            span.textContent = label;
            el.append(input, span);
            return el;
        },

        /**
         * Lista os valores marcados dentro de um contêiner.
         * @param {HTMLElement} container Elemento com checkboxes.
         * @returns {Array<string>} Valores marcados.
         */
        marcados(container) {
            return Array.from(container.querySelectorAll('input:checked')).map(i => i.value);
        },

        /**
         * Formata um número no padrão brasileiro.
         * @param {number} n Número.
         * @param {number} [casas=2] Casas decimais.
         * @returns {string} Ex.: "1.234,56".
         */
        fmt(n, casas = 2) {
            return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
        },

        /**
         * Alterna entre o gráfico e a mensagem de "sem dados" do mesmo contêiner.
         * @param {string} canvasId id do <canvas>.
         * @param {boolean} vazio true quando não há dados para mostrar.
         * @returns {void}
         */
        mostrarVazio(canvasId, vazio) {
            const canvas = document.getElementById(canvasId);
            canvas.classList.toggle('hidden', vazio);
            const aviso = canvas.parentElement.querySelector('.chart-empty');
            if (aviso) aviso.classList.toggle('hidden', !vazio);
        }
    };
})();
