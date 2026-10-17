import { describe, expect, it, vi } from 'vitest';
import { createWhatsAppProvider } from '../src/whatsapp-provider.js';

const enquiry = {
  id: 'synthetic-enquiry-id',
  parentName: 'Synthetic Parent',
  phoneNumber: '+91 90000 00000',
  classOfInterest: 'Nursery',
  message: 'Please share school timings.',
};

describe('WhatsApp notification adapter', () => {
  it('reports missing configuration without attempting an external request', async () => {
    const fetchImplementation = vi.fn();
    const provider = createWhatsAppProvider({}, fetchImplementation);

    await expect(provider.sendEnquiry(enquiry)).resolves.toEqual({
      sent: false,
      errorCode: 'PROVIDER_NOT_CONFIGURED',
    });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it('sends a configured template with validated enquiry fields', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({ ok: true });
    const provider = createWhatsAppProvider({
      WHATSAPP_ACCESS_TOKEN: 'synthetic-token',
      WHATSAPP_PHONE_NUMBER_ID: 'synthetic-number-id',
      WHATSAPP_RECIPIENT_PHONE: '919000000000',
      WHATSAPP_TEMPLATE_NAME: 'school_enquiry',
      WHATSAPP_TEMPLATE_LANGUAGE: 'en',
      WHATSAPP_GRAPH_API_VERSION: 'v22.0',
    }, fetchImplementation);

    await expect(provider.sendEnquiry(enquiry)).resolves.toEqual({ sent: true });
    const [url, options] = fetchImplementation.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v22.0/synthetic-number-id/messages');
    expect(options.headers.Authorization).toBe('Bearer synthetic-token');
    expect(JSON.parse(options.body).template.components[0].parameters.map(({ text }) => text))
      .toEqual(['Synthetic Parent', '+91 90000 00000', 'Nursery', 'Please share school timings.']);
  });

  it('records provider failures without returning provider response details', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({ ok: false, status: 400 });
    const provider = createWhatsAppProvider({
      WHATSAPP_ACCESS_TOKEN: 'synthetic-token',
      WHATSAPP_PHONE_NUMBER_ID: 'synthetic-number-id',
      WHATSAPP_RECIPIENT_PHONE: '919000000000',
      WHATSAPP_TEMPLATE_NAME: 'school_enquiry',
      WHATSAPP_TEMPLATE_LANGUAGE: 'en',
      WHATSAPP_GRAPH_API_VERSION: 'v22.0',
    }, fetchImplementation);

    await expect(provider.sendEnquiry(enquiry)).resolves.toEqual({
      sent: false,
      errorCode: 'PROVIDER_HTTP_400',
    });
  });
});
