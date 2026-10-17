const requiredConfiguration = [
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_RECIPIENT_PHONE',
  'WHATSAPP_TEMPLATE_NAME',
];

export function createWhatsAppProvider(config, fetchImplementation = fetch) {
  const missing = requiredConfiguration.filter((key) => !config[key]);
  if (missing.length > 0) {
    return {
      async sendEnquiry() {
        return { sent: false, errorCode: 'PROVIDER_NOT_CONFIGURED' };
      },
    };
  }

  return {
    async sendEnquiry(enquiry) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetchImplementation(
          `https://graph.facebook.com/${config.WHATSAPP_GRAPH_API_VERSION}/${encodeURIComponent(config.WHATSAPP_PHONE_NUMBER_ID)}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: config.WHATSAPP_RECIPIENT_PHONE,
              type: 'template',
              template: {
                name: config.WHATSAPP_TEMPLATE_NAME,
                language: { code: config.WHATSAPP_TEMPLATE_LANGUAGE },
                components: [{
                  type: 'body',
                  parameters: [
                    { type: 'text', text: enquiry.parentName },
                    { type: 'text', text: enquiry.phoneNumber },
                    { type: 'text', text: enquiry.classOfInterest },
                    { type: 'text', text: enquiry.message },
                  ],
                }],
              },
            }),
            signal: controller.signal,
          }
        );
        if (!response.ok) {
          return { sent: false, errorCode: `PROVIDER_HTTP_${response.status}` };
        }
        return { sent: true };
      } catch (error) {
        return {
          sent: false,
          errorCode: error.name === 'AbortError' ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE',
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
