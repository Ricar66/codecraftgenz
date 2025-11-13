import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as apiCfg from '../../lib/apiConfig.js';
import { createPaymentPreference } from '../appsAPI.js';

describe('appsAPI.createPaymentPreference', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('faz POST sem body quando options estiverem vazias', async () => {
    const spy = vi.spyOn(apiCfg, 'apiRequest').mockResolvedValue({ success: true });
    await createPaymentPreference(123);
    expect(spy).toHaveBeenCalledTimes(1);
    const [path, opts] = spy.mock.calls[0];
    expect(path).toBe('/api/apps/123/purchase');
    expect(opts.method).toBe('POST');
    expect('body' in opts).toBe(false);
  });

  it('envia body JSON quando options incluem payment_methods e statement_descriptor', async () => {
    const spy = vi.spyOn(apiCfg, 'apiRequest').mockResolvedValue({ success: true });
    const options = {
      payment_methods: {
        installments: 6,
        default_installments: 3,
        excluded_payment_methods: [{ id: 'visa' }, { id: 'master' }],
        excluded_payment_types: [{ id: 'ticket' }],
      },
      statement_descriptor: 'CODECRAFT',
    };
    await createPaymentPreference(42, options);
    const [, opts] = spy.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(typeof opts.body).toBe('string');
    const parsed = JSON.parse(opts.body);
    expect(parsed.statement_descriptor).toBe('CODECRAFT');
    expect(parsed.payment_methods.installments).toBe(6);
    expect(parsed.payment_methods.default_installments).toBe(3);
    expect(parsed.payment_methods.excluded_payment_methods).toEqual([{ id: 'visa' }, { id: 'master' }]);
    expect(parsed.payment_methods.excluded_payment_types).toEqual([{ id: 'ticket' }]);
  });
});