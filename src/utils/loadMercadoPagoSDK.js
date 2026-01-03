/**
 * Utilitário para carregar o SDK do MercadoPago de forma lazy
 *
 * O SDK só é carregado quando realmente necessário (na página de pagamento),
 * evitando impacto no carregamento inicial da aplicação.
 */

let sdkLoadPromise = null;
let sdkLoaded = false;

/**
 * Carrega o SDK do MercadoPago de forma assíncrona
 * @returns {Promise<void>} Promise que resolve quando o SDK está pronto
 */
export function loadMercadoPagoSDK() {
  // Se já está carregado, retorna imediatamente
  if (sdkLoaded && window.MercadoPago) {
    return Promise.resolve();
  }

  // Se já está carregando, retorna a promise existente
  if (sdkLoadPromise) {
    return sdkLoadPromise;
  }

  // Inicia o carregamento do SDK
  sdkLoadPromise = new Promise((resolve, reject) => {
    // Verifica se já existe no window (carregado de outra forma)
    if (window.MercadoPago) {
      sdkLoaded = true;
      resolve();
      return;
    }

    // Cria o elemento script
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;

    script.onload = () => {
      sdkLoaded = true;
      resolve();
    };

    script.onerror = () => {
      sdkLoadPromise = null; // Permite retry em caso de erro
      reject(new Error('Falha ao carregar SDK do MercadoPago'));
    };

    // Adiciona o script ao documento
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

/**
 * Verifica se o SDK está disponível
 * @returns {boolean}
 */
export function isMercadoPagoSDKLoaded() {
  return sdkLoaded && typeof window.MercadoPago !== 'undefined';
}

/**
 * Obtém a instância do MercadoPago (carrega SDK se necessário)
 * @param {string} publicKey - Chave pública do MercadoPago
 * @returns {Promise<object>} Instância do MercadoPago
 */
export async function getMercadoPagoInstance(publicKey) {
  await loadMercadoPagoSDK();

  if (!window.MercadoPago) {
    throw new Error('SDK do MercadoPago não disponível');
  }

  return new window.MercadoPago(publicKey, { locale: 'pt-BR' });
}
