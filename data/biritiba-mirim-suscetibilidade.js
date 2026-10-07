// --- PONTO DE CUSTOMIZAÇÃO: CARREGAMENTO DE DADOS --- //
// Carta de suscetibilidade de Biritiba Mirim.
// COLE AQUI O CONTEÚDO DO ARQUIVO GEOJSON REPROJETADO PARA EPSG:4326 (WGS 84),
// substituindo o objeto { "type": "FeatureCollection", ... } abaixo.
// Cada nova camada ganha um arquivo próprio nesta pasta e uma entrada em js/config.js.
window.GEODATA = window.GEODATA || {};
window.GEODATA['biritiba-mirim-suscetibilidade'] = {
    "type": "FeatureCollection",
    "features": []
};
