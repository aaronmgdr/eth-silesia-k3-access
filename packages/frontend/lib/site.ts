export const site = {
  legalName:    process.env.NEXT_PUBLIC_LEGAL_NAME    ?? 'Fundacja ETH Warsaw',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'hello@ethwarsaw.dev',
  appUrl:       process.env.NEXT_PUBLIC_APP_URL        ?? 'https://ethwarsaw.dev/kolektyw3',

  // Legal entity — used on invoices and privacy policy
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? 'ul. Grzybowska 87, 00-844 Warszawa, Polska',
  nip:     process.env.NEXT_PUBLIC_NIP           ?? '5273003106',
  iban:    process.env.NEXT_PUBLIC_IBAN          ?? 'PL80 1140 2004 0000 3502 8253 7950',
  swift:   process.env.NEXT_PUBLIC_SWIFT         ?? 'BREXPLPWMBK',
  bank:    process.env.NEXT_PUBLIC_BANK          ?? 'mBank',

  sourceUrl: process.env.NEXT_PUBLIC_SOURCE_URL ?? 'https://github.com/aaronmgdr/eth-silesia-k3-access',

  // Set NEXT_PUBLIC_DEMO_MODE=true to show a demo/hackathon disclaimer sitewide
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
};
