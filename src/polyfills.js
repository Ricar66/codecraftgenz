// Polyfills para compatibilidade com navegadores mais antigos

// Polyfill para optional chaining (?.)
if (!Object.prototype.hasOwnProperty.call(Object, 'hasOwn')) {
  Object.hasOwn = function(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

// Polyfill para nullish coalescing (??) - já suportado pelo Babel/Vite

// Polyfill para Array.prototype.at (se necessário)
if (!Array.prototype.at) {
  Array.prototype.at = function(index) {
    // Converte o índice para inteiro
    const len = parseInt(this.length) || 0;
    const relativeIndex = parseInt(index) || 0;
    
    // Se o índice for negativo, conta a partir do final
    const actualIndex = relativeIndex < 0 ? len + relativeIndex : relativeIndex;
    
    // Retorna undefined se o índice estiver fora dos limites
    return actualIndex >= 0 && actualIndex < len ? this[actualIndex] : undefined;
  };
}

// Polyfill para String.prototype.replaceAll (se necessário)
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function(searchValue, replaceValue) {
    if (typeof searchValue === 'string') {
      return this.split(searchValue).join(replaceValue);
    }
    if (searchValue instanceof RegExp) {
      if (!searchValue.global) {
        throw new TypeError('String.prototype.replaceAll called with a non-global RegExp argument');
      }
      return this.replace(searchValue, replaceValue);
    }
    return this.toString();
  };
}

// Polyfill para Object.fromEntries (se necessário)
if (!Object.fromEntries) {
  Object.fromEntries = function(iterable) {
    const obj = {};
    for (const [key, value] of iterable) {
      obj[key] = value;
    }
    return obj;
  };
}

// Polyfill para Array.prototype.flat (se necessário)
if (!Array.prototype.flat) {
  Array.prototype.flat = function(depth = 1) {
    const flatten = (arr, currentDepth) => {
      const result = [];
      for (let i = 0; i < arr.length; i++) {
        if (Array.isArray(arr[i]) && currentDepth > 0) {
          result.push(...flatten(arr[i], currentDepth - 1));
        } else {
          result.push(arr[i]);
        }
      }
      return result;
    };
    return flatten(this, depth);
  };
}

// Polyfill para globalThis
if (typeof globalThis === 'undefined') {
  (function() {
    if (typeof self !== 'undefined') {
      self.globalThis = self;
    } else if (typeof window !== 'undefined') {
      window.globalThis = window;
    } else if (typeof global !== 'undefined') {
      global.globalThis = global;
    } else {
      throw new Error('Unable to locate global object');
    }
  })();
}

console.log('Polyfills carregados para compatibilidade entre navegadores');