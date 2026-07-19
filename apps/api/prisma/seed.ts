import { PrismaClient, Currency, ServiceCategory } from '@prisma/client';

const prisma = new PrismaClient();

// ── Bank Data ──────────────────────────────────────────────────
const BANK_DATA = [
  {
    code: 'CBE',
    name: 'Commercial Bank of Ethiopia',
    swiftCode: 'CBETETAA',
    website: 'https://www.combanketh.et',
    phone: '+251-11-551-1500',
    email: 'info@combanketh.et',
    address: 'Bole Road, Addis Ababa, Ethiopia',
    sortOrder: 1,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'Individual Savings Account', description: 'Personal savings account with competitive interest rates', interestRate: 7.0, minBalance: 100 },
      { category: ServiceCategory.ACCOUNT, name: 'Checking Account', description: 'Daily transaction account with checkbook facility', minBalance: 500 },
      { category: ServiceCategory.LOAN, name: 'Personal Loan', description: 'Unsecured personal loans for individuals', interestRate: 16.0, maxAmount: 500000 },
      { category: ServiceCategory.LOAN, name: 'Business Loan', description: 'Working capital and investment loans for businesses', interestRate: 14.0, maxAmount: 5000000 },
      { category: ServiceCategory.MOBILE_BANKING, name: 'CBE Birr', description: 'Mobile banking and payment service' },
      { category: ServiceCategory.INTERNET_BANKING, name: 'CBE Online Banking', description: 'Internet banking platform for account management' },
      { category: ServiceCategory.MONEY_TRANSFER, name: 'Local & International Transfer', description: 'Domestic and cross-border money transfers' },
      { category: ServiceCategory.SAVINGS, name: 'Children\'s Savings Account', description: 'Savings account designed for minors', interestRate: 8.0, minBalance: 50 },
    ],
  },
  {
    code: 'AWIN',
    name: 'Awash International Bank',
    swiftCode: 'AWINETAA',
    website: 'https://www.awashbank.com',
    phone: '+251-11-550-0460',
    email: 'info@awashbank.com',
    address: 'Africa Avenue, Addis Ababa, Ethiopia',
    sortOrder: 2,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'Awash Premium Account', description: 'Premium banking with enhanced benefits', minBalance: 10000 },
      { category: ServiceCategory.LOAN, name: 'Auto Loan', description: 'Vehicle financing with competitive rates', interestRate: 15.0 },
      { category: ServiceCategory.LOAN, name: 'Home Loan', description: 'Residential mortgage loans', interestRate: 13.0, maxAmount: 3000000 },
      { category: ServiceCategory.CREDIT_CARD, name: 'Awash Credit Card', description: 'Visa and Mastercard credit cards', fee: 500 },
      { category: ServiceCategory.MOBILE_BANKING, name: 'Awash Mobile Banking', description: 'Mobile banking application' },
      { category: ServiceCategory.INTERNET_BANKING, name: 'Awash Internet Banking', description: 'Online banking platform' },
      { category: ServiceCategory.CURRENCY_EXCHANGE, name: 'Foreign Exchange Service', description: 'Competitive exchange rates for major currencies' },
      { category: ServiceCategory.INVESTMENT, name: 'Fixed Deposit', description: 'Fixed term deposit accounts', interestRate: 9.0, minBalance: 10000 },
    ],
  },
  {
    code: 'DASH',
    name: 'Dashen Bank',
    swiftCode: 'DASHETAA',
    website: 'https://www.dashenbanksc.com',
    phone: '+251-11-552-0430',
    email: 'info@dashenbanksc.com',
    address: 'Bole Road, Addis Ababa, Ethiopia',
    sortOrder: 3,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'Dashen Individual Account', description: 'Personal savings and checking accounts', minBalance: 200 },
      { category: ServiceCategory.LOAN, name: 'Dashen Personal Loan', description: 'Quick personal loans with minimal paperwork', interestRate: 16.5, maxAmount: 300000 },
      { category: ServiceCategory.LOAN, name: 'Agriculture Loan', description: 'Loans for agricultural activities', interestRate: 12.5 },
      { category: ServiceCategory.CREDIT_CARD, name: 'Dashen Credit Card', description: 'International credit card services' },
      { category: ServiceCategory.MOBILE_BANKING, name: 'Dashen Mobile Banking', description: '24/7 mobile banking access' },
      { category: ServiceCategory.INTERNET_BANKING, name: 'Dashen Online Banking', description: 'Comprehensive internet banking' },
      { category: ServiceCategory.MONEY_TRANSFER, name: 'Dashen Money Transfer', description: 'Local and international remittance services' },
      { category: ServiceCategory.SAVINGS, name: 'Dashen Saving Account', description: 'High yield savings account', interestRate: 7.5, minBalance: 500 },
    ],
  },
  {
    code: 'BOA',
    name: 'Bank of Abyssinia',
    swiftCode: 'ABYSETAA',
    website: 'https://www.bankofabyssinia.com',
    phone: '+251-11-551-7400',
    email: 'info@bankofabyssinia.com',
    address: 'Kirkos Sub-city, Addis Ababa, Ethiopia',
    sortOrder: 4,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'Abyssinia Savings Account', description: 'Savings account with attractive interest', interestRate: 6.5, minBalance: 100 },
      { category: ServiceCategory.LOAN, name: 'Abyssinia Personal Loan', description: 'Personal loan products', interestRate: 17.0 },
      { category: ServiceCategory.MOBILE_BANKING, name: 'Abyssinia Mobile', description: 'Mobile banking service' },
      { category: ServiceCategory.MONEY_TRANSFER, name: 'Abyssinia Transfer', description: 'Money transfer services' },
      { category: ServiceCategory.INVESTMENT, name: 'Time Deposit', description: 'Fixed term investment account', interestRate: 8.5, minBalance: 5000 },
    ],
  },
  {
    code: 'WB',
    name: 'Wegagen Bank',
    swiftCode: 'WEGAETAA',
    website: 'https://www.wegagenbank.com',
    phone: '+251-11-551-2866',
    email: 'info@wegagenbank.com',
    address: 'Bole Sub-city, Addis Ababa, Ethiopia',
    sortOrder: 5,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'Wegagen Current Account', description: 'Business and personal current accounts', minBalance: 500 },
      { category: ServiceCategory.LOAN, name: 'Wegagen Loan', description: 'Various loan products', interestRate: 15.5 },
      { category: ServiceCategory.MOBILE_BANKING, name: 'Wegagen Mobile', description: 'Mobile banking platform' },
      { category: ServiceCategory.MONEY_TRANSFER, name: 'Wegagen Money Transfer', description: 'Domestic money transfer' },
    ],
  },
  {
    code: 'UB',
    name: 'United Bank',
    swiftCode: 'UNUNETAA',
    website: 'https://www.unitedbank.com.et',
    phone: '+251-11-552-5300',
    email: 'info@unitedbank.com.et',
    address: 'Bole Sub-city, Addis Ababa, Ethiopia',
    sortOrder: 6,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'UB Savings', description: 'Savings account', interestRate: 7.0, minBalance: 100 },
      { category: ServiceCategory.LOAN, name: 'UB Personal Loan', description: 'Personal loan', interestRate: 16.0 },
      { category: ServiceCategory.MOBILE_BANKING, name: 'UB Mobile Banking', description: 'Mobile banking' },
      { category: ServiceCategory.INTERNET_BANKING, name: 'UB Internet Banking', description: 'Online banking' },
    ],
  },
  {
    code: 'NIB',
    name: 'Nib International Bank',
    swiftCode: 'NIBIETAA',
    website: 'https://www.nibbank.com',
    phone: '+251-11-550-1714',
    email: 'info@nibbank.com',
    address: 'Bole Sub-city, Addis Ababa, Ethiopia',
    sortOrder: 7,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'NIB Savings', description: 'Savings account', interestRate: 6.5, minBalance: 100 },
      { category: ServiceCategory.LOAN, name: 'NIB Business Loan', description: 'Business financing', interestRate: 14.5 },
      { category: ServiceCategory.MOBILE_BANKING, name: 'NIB Mobile', description: 'Mobile banking' },
    ],
  },
  {
    code: 'BIB',
    name: 'Berhan International Bank',
    swiftCode: 'BIBTETAA',
    website: 'https://www.berhanbank.com',
    phone: '+251-11-551-0088',
    email: 'info@berhanbank.com',
    address: 'Bole Sub-city, Addis Ababa, Ethiopia',
    sortOrder: 8,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'BIB Savings', description: 'Savings account', interestRate: 7.0 },
      { category: ServiceCategory.LOAN, name: 'BIB Loan', description: 'Loan products', interestRate: 15.0 },
    ],
  },
  {
    code: 'LIB',
    name: 'Lion International Bank',
    swiftCode: 'LIONETAA',
    website: 'https://lionbanket.com',
    phone: '+251-11-554-4455',
    email: 'info@lionbanket.com',
    address: 'Addis Ababa, Ethiopia',
    sortOrder: 9,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'LIB Savings', description: 'Savings account', interestRate: 7.5 },
      { category: ServiceCategory.LOAN, name: 'LIB Personal Loan', description: 'Personal loan', interestRate: 16.0 },
      { category: ServiceCategory.MOBILE_BANKING, name: 'LIB Mobile', description: 'Mobile banking' },
    ],
  },
  {
    code: 'ZEMEN',
    name: 'Zemen Bank',
    swiftCode: 'ZEMEETAA',
    website: 'https://www.zemenbank.com',
    phone: '+251-11-553-8811',
    email: 'info@zemenbank.com',
    address: 'Bole Road, Addis Ababa, Ethiopia',
    sortOrder: 10,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'Zemen Premium Account', description: 'Premium banking services', minBalance: 5000 },
      { category: ServiceCategory.LOAN, name: 'Zemen Loan', description: 'Loan products', interestRate: 14.0 },
      { category: ServiceCategory.INTERNET_BANKING, name: 'Zemen Online', description: 'Digital banking platform' },
      { category: ServiceCategory.CURRENCY_EXCHANGE, name: 'Forex Service', description: 'Currency exchange' },
    ],
  },
  {
    code: 'AB',
    name: 'Abay Bank',
    swiftCode: 'ABAYETAA',
    website: 'https://www.abaybank.com.et',
    phone: '+251-11-558-3399',
    email: 'info@abaybank.com.et',
    address: 'Addis Ababa, Ethiopia',
    sortOrder: 11,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'Abay Savings', description: 'Savings account', interestRate: 7.0 },
      { category: ServiceCategory.LOAN, name: 'Abay Loan', description: 'Loan services', interestRate: 15.5 },
    ],
  },
  {
    code: 'BUNNA',
    name: 'Bunna International Bank',
    swiftCode: 'BUNNETAA',
    website: 'https://www.bunnabanksc.com',
    phone: '+251-11-557-1155',
    email: 'info@bunnabanksc.com',
    address: 'Addis Ababa, Ethiopia',
    sortOrder: 12,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'Bunna Savings', description: 'Savings account', interestRate: 6.5 },
      { category: ServiceCategory.LOAN, name: 'Bunna Loan', description: 'Loan products', interestRate: 16.0 },
      { category: ServiceCategory.MOBILE_BANKING, name: 'Bunna Mobile', description: 'Mobile banking' },
    ],
  },
  {
    code: 'DB',
    name: 'Debub Global Bank',
    swiftCode: 'DGBEETAA',
    website: 'https://www.debubglobalbank.com',
    phone: '+251-46-220-1600',
    email: 'info@debubglobalbank.com',
    address: 'Hawassa, Ethiopia',
    sortOrder: 13,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'DGB Savings', description: 'Savings account', interestRate: 7.5 },
      { category: ServiceCategory.LOAN, name: 'DGB Loan', description: 'Loan services', interestRate: 15.0 },
    ],
  },
  {
    code: 'ENAT',
    name: 'Enat Bank',
    swiftCode: 'ENATETAA',
    website: 'https://www.enatbank.com',
    phone: '+251-11-557-0066',
    email: 'info@enatbank.com',
    address: 'Addis Ababa, Ethiopia',
    sortOrder: 14,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'Enat Savings', description: 'Savings account', interestRate: 7.0 },
      { category: ServiceCategory.LOAN, name: 'Enat Loan', description: 'Loan services', interestRate: 15.5 },
    ],
  },
  {
    code: 'COOP',
    name: 'Cooperative Bank of Oromia',
    swiftCode: 'CBORETAA',
    website: 'https://www.coopbankoromia.com.et',
    phone: '+251-11-551-5064',
    email: 'info@coopbankoromia.com.et',
    address: 'Addis Ababa, Ethiopia',
    sortOrder: 15,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'CBCO Savings', description: 'Savings account', interestRate: 7.5 },
      { category: ServiceCategory.LOAN, name: 'CBCO Loan', description: 'Loan products', interestRate: 14.5 },
      { category: ServiceCategory.MOBILE_BANKING, name: 'CBCO Mobile', description: 'Mobile banking' },
    ],
  },
  {
    code: 'SM',
    name: 'Shem Bank',
    swiftCode: 'SHEMETAA',
    website: 'https://www.shembank.com',
    phone: '+251-11-559-1900',
    email: 'info@shembank.com',
    address: 'Addis Ababa, Ethiopia',
    sortOrder: 16,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'Shem Savings', description: 'Savings account', interestRate: 8.0 },
      { category: ServiceCategory.LOAN, name: 'Shem Loan', description: 'Loan services', interestRate: 15.0 },
      { category: ServiceCategory.MOBILE_BANKING, name: 'Shem Mobile', description: 'Mobile banking' },
    ],
  },
  {
    code: 'HIB',
    name: 'Hijira Bank',
    swiftCode: 'HIJIETAA',
    website: 'https://www.hijirabank.com',
    phone: '+251-11-557-2200',
    email: 'info@hijirabank.com',
    address: 'Addis Ababa, Ethiopia',
    sortOrder: 17,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'Hijira Savings', description: 'Savings account', interestRate: 7.5 },
      { category: ServiceCategory.LOAN, name: 'Hijira Loan', description: 'Loan services', interestRate: 16.0 },
    ],
  },
  {
    code: 'TSB',
    name: 'Tseday Bank',
    swiftCode: 'TSEDETAA',
    website: 'https://www.tsedaybank.com',
    phone: '+251-11-558-3300',
    email: 'info@tsedaybank.com',
    address: 'Addis Ababa, Ethiopia',
    sortOrder: 18,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'Tseday Savings', description: 'Savings account', interestRate: 7.0 },
      { category: ServiceCategory.LOAN, name: 'Tseday Loan', description: 'Loan services', interestRate: 15.5 },
    ],
  },
  {
    code: 'AMHARA',
    name: 'Amhara Bank',
    swiftCode: 'AMHAETAA',
    website: 'https://www.amharabank.com.et',
    phone: '+251-58-226-0156',
    email: 'info@amharabank.com.et',
    address: 'Bahir Dar, Ethiopia',
    sortOrder: 19,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'Amhara Savings', description: 'Savings account', interestRate: 8.0 },
      { category: ServiceCategory.LOAN, name: 'Amhara Loan', description: 'Agricultural and business loans', interestRate: 14.0 },
      { category: ServiceCategory.MOBILE_BANKING, name: 'Amhara Mobile', description: 'Mobile banking' },
    ],
  },
  {
    code: 'GADA',
    name: 'Gada Bank',
    swiftCode: 'GADAETAA',
    website: 'https://www.gadabank.com',
    phone: '+251-46-220-5678',
    email: 'info@gadabank.com',
    address: 'Addis Ababa, Ethiopia',
    sortOrder: 20,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'Gada Savings', description: 'Savings account', interestRate: 7.5 },
      { category: ServiceCategory.LOAN, name: 'Gada Loan', description: 'Loan services', interestRate: 15.0 },
    ],
  },
  {
    code: 'OMO',
    name: 'Omo Bank',
    swiftCode: 'OMOIETAA',
    website: 'https://www.omobank.com.et',
    phone: '+251-46-220-4321',
    email: 'info@omobank.com.et',
    address: 'Addis Ababa, Ethiopia',
    sortOrder: 21,
    services: [
      { category: ServiceCategory.ACCOUNT, name: 'Omo Savings', description: 'Savings account', interestRate: 7.0 },
      { category: ServiceCategory.LOAN, name: 'Omo Loan', description: 'Loan services', interestRate: 15.5 },
    ],
  },
] as const;

// ── Exchange Rate Templates ────────────────────────────────────
const CURRENCY_PAIRS: { from: Currency; to: Currency }[] = [
  { from: 'ETB', to: 'USD' },
  { from: 'ETB', to: 'EUR' },
  { from: 'ETB', to: 'GBP' },
];

interface RateTemplate {
  baseUsdBuy: number;
  baseUsdSell: number;
  spread: number; // variation +/- for different banks
}

const RATE_TEMPLATES: Record<string, RateTemplate> = {
  USD: { baseUsdBuy: 56.85, baseUsdSell: 57.45, spread: 2.5 },
  EUR: { baseUsdBuy: 61.20, baseUsdSell: 62.10, spread: 3.0 },
  GBP: { baseUsdBuy: 71.40, baseUsdSell: 72.30, spread: 3.5 },
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateRate(
  bankIndex: number,
  currencyTo: string,
  dateOffset: number,
  random: () => number,
): { buyRate: number; sellRate: number } {
  const template = RATE_TEMPLATES[currencyTo]!;
  const variation = (random() - 0.5) * template.spread;
  const trend = Math.sin(dateOffset * 0.1) * 0.3; // slight trend over time
  const buyRate = template.baseUsdBuy + variation + trend;
  const sellRate = template.baseUsdSell + variation + trend;
  return {
    buyRate: Math.round(buyRate * 10000) / 10000,
    sellRate: Math.round(sellRate * 10000) / 10000,
  };
}

// ── Main Seed ──────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding EthioBanksHub database...\n');

  // ── Banks & Services ────────────────────────────────────────
  console.log('📌 Inserting banks...');
  for (const bankData of BANK_DATA) {
    const { services, ...bankInfo } = bankData;

    const bank = await prisma.bank.upsert({
      where: { code: bankInfo.code },
      update: bankInfo,
      create: bankInfo,
    });

    console.log(`   ✅ ${bank.name} (${bank.code})`);    // Insert services using composite unique key [bankId, category, name]
    for (const service of services) {
      await prisma.bankService.upsert({
        where: {
          bankId_category_name: {
            bankId: bank.id,
            category: service.category,
            name: service.name,
          },
        },
        update: {
          ...service,
          bankId: bank.id,
        },
        create: {
          ...service,
          bankId: bank.id,
        },
      });
    }
  }

  // ── Exchange Rates (last 30 days) ────────────────────────────
  console.log('\n📊 Generating exchange rates...');
  const banks = await prisma.bank.findMany({ orderBy: { sortOrder: 'asc' } });
  let rateCount = 0;

  for (const [bankIndex, bank] of banks.entries()) {
    const random = seededRandom(bankIndex * 100 + 42);

    for (const pair of CURRENCY_PAIRS) {
      for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
        const date = new Date();
        date.setDate(date.getDate() - dayOffset);
        date.setHours(10, 0, 0, 0); // 10 AM daily rate

        const { buyRate, sellRate } = generateRate(bankIndex, pair.to, dayOffset, random);
        const midRate = Math.round(((buyRate + sellRate) / 2) * 10000) / 10000;

        await prisma.exchangeRate.upsert({
          where: {
            bankId_currencyFrom_currencyTo_effectiveDate: {
              bankId: bank.id,
              currencyFrom: pair.from,
              currencyTo: pair.to,
              effectiveDate: date,
            },
          },
          update: {
            buyRate,
            sellRate,
            midRate,
            source: 'scraped',
          },
          create: {
            bankId: bank.id,
            currencyFrom: pair.from,
            currencyTo: pair.to,
            buyRate,
            sellRate,
            midRate,
            source: 'scraped',
            effectiveDate: date,
          },
        });
        rateCount++;
      }
    }
  }
  console.log(`   ✅ ${rateCount.toLocaleString()} exchange rates created`);

  // ── Rankings ─────────────────────────────────────────────────
  console.log('\n🏆 Creating rankings...');
  const today = new Date();
  const rankCategories = ['EXCHANGE_RATE', 'INTEREST_RATE', 'DIGITAL_BANKING', 'OVERALL'] as const;

  for (const category of rankCategories) {
    // Assign random scores to each bank for variety
    const scoredBanks = banks.map((bank, i) => ({
      bankId: bank.id,
      score: Math.round((70 + (i * 1.5) + (seededRandom(i + 100)() * 10)) * 100) / 100,
    }));
    scoredBanks.sort((a, b) => b.score - a.score);

    for (let pos = 0; pos < scoredBanks.length; pos++) {
      await prisma.ranking.upsert({
        where: {
          category_bankId_effectiveDate: {
            category: category as any,
            bankId: scoredBanks[pos]!.bankId,
            effectiveDate: today,
          },
        },
        update: {
          score: scoredBanks[pos]!.score,
          rankPosition: pos + 1,
          previousRank: pos + 1,
        },
        create: {
          category: category as any,
          bankId: scoredBanks[pos]!.bankId,
          score: scoredBanks[pos]!.score,
          rankPosition: pos + 1,
          previousRank: pos + 1,
          effectiveDate: today,
        },
      });
    }
  }
  console.log(`   ✅ ${rankCategories.length} ranking categories created`);

  // ── Demo User ────────────────────────────────────────────────
  console.log('\n👤 Creating demo user...');
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@ethiobankshub.com' },
    update: {},
    create: {
      email: 'demo@ethiobankshub.com',
      passwordHash: '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkf9Rn6bm1FZwOJK2v0pIvFAtbD3u', // "password123"
      fullName: 'Demo User',
      phoneNumber: '+251-911-123-456',
      role: 'USER',
      isVerified: true,
    },
  });
  console.log(`   ✅ Demo user: demo@ethiobankshub.com / password123`);

  // ── Sample Rate Alerts for Demo User ─────────────────────────
  console.log('\n🔔 Creating sample rate alerts...');
  const cbe = banks.find((b) => b.code === 'CBE')!;
  const awash = banks.find((b) => b.code === 'AWIN')!;

  await prisma.rateAlert.createMany({
    data: [
      {
        userId: demoUser.id,
        bankId: cbe.id,
        currencyFrom: 'ETB',
        currencyTo: 'USD',
        condition: 'BELOW',
        targetBuyRate: 55.0,
        isActive: true,
      },
      {
        userId: demoUser.id,
        bankId: awash.id,
        currencyFrom: 'ETB',
        currencyTo: 'EUR',
        condition: 'ABOVE',
        targetSellRate: 63.0,
        isActive: true,
      },
      {
        userId: demoUser.id,
        bankId: null, // all banks
        currencyFrom: 'ETB',
        currencyTo: 'GBP',
        condition: 'BELOW',
        targetBuyRate: 70.0,
        isActive: true,
      },
    ],
  });
  console.log('   ✅ 3 rate alerts created');

  // ── Sample Subscription ──────────────────────────────────────
  console.log('\n📬 Creating sample subscription...');
  await prisma.subscription.create({
    data: {
      userId: demoUser.id,
      bankId: null,
      tier: 'FREE',
      notificationType: 'EMAIL',
      isActive: true,
    },
  });
  console.log('   ✅ Free subscription created for demo user');

  console.log('\n🎉 Seed complete!');
  console.log(`   • ${banks.length} banks`);
  console.log(`   • ${rateCount.toLocaleString()} exchange rates (30 days x 3 pairs x ${banks.length} banks)`);
  console.log(`   • Services per bank`);
  console.log(`   • Rankings in ${rankCategories.length} categories`);
  console.log(`   • Demo user with alerts & subscription\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
