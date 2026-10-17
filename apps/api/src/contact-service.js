import { createWhatsAppProvider } from './whatsapp-provider.js';

export async function createContactEnquiry(prisma, config, input, provider = createWhatsAppProvider(config)) {
  const { website: _honeypot, ...enquiryInput } = input;
  const enquiry = await prisma.contactEnquiry.create({
    data: enquiryInput,
    select: {
      id: true,
      parentName: true,
      phoneNumber: true,
      classOfInterest: true,
      message: true,
      createdAt: true,
    },
  });

  let outcome;
  try {
    outcome = await provider.sendEnquiry(enquiry);
  } catch {
    outcome = { sent: false, errorCode: 'PROVIDER_UNAVAILABLE' };
  }
  const notificationStatus = outcome.sent ? 'Sent' : 'Failed';
  if (!outcome.sent) {
    console.warn('Contact enquiry notification failed', {
      enquiryId: enquiry.id,
      errorCode: outcome.errorCode,
    });
  }

  const updated = await prisma.contactEnquiry.update({
    where: { id: enquiry.id },
    data: {
      notificationStatus,
      notificationErrorCode: outcome.sent ? null : outcome.errorCode,
    },
    select: { id: true, createdAt: true, notificationStatus: true, notificationErrorCode: true },
  });
  return updated;
}

export async function listContactEnquiries(prisma, { page, pageSize }) {
  const [total, items] = await prisma.$transaction([
    prisma.contactEnquiry.count(),
    prisma.contactEnquiry.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        parentName: true,
        phoneNumber: true,
        classOfInterest: true,
        message: true,
        createdAt: true,
        notificationStatus: true,
        notificationErrorCode: true,
      },
    }),
  ]);
  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}
