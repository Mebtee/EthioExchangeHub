export type Locale = 'en' | 'am';

export type TranslationKey =
  // Navigation
  | 'nav.dashboard' | 'nav.rates' | 'nav.banks' | 'nav.rankings' | 'nav.services'
  | 'nav.alerts' | 'nav.account' | 'nav.settings' | 'nav.admin' | 'nav.portfolio'
  | 'nav.favorites' | 'nav.notifications' | 'nav.signOut'
  // Common
  | 'common.loading' | 'common.error' | 'common.retry' | 'common.save' | 'common.cancel'
  | 'common.delete' | 'common.edit' | 'common.create' | 'common.search' | 'common.filter'
  | 'common.clear' | 'common.noData' | 'common.viewAll' | 'common.learnMore'
  | 'common.showing' | 'common.of' | 'common.results' | 'common.perPage'
  // Auth
  | 'auth.signIn' | 'auth.signUp' | 'auth.signOut' | 'auth.email' | 'auth.password'
  | 'auth.fullName' | 'auth.phoneNumber' | 'auth.welcome' | 'auth.welcomeBack'
  | 'auth.noAccount' | 'auth.hasAccount'
  // Rates
  | 'rates.title' | 'rates.subtitle' | 'rates.latest' | 'rates.historical' | 'rates.compare'
  | 'rates.bestRates' | 'rates.buyRate' | 'rates.sellRate' | 'rates.spread' | 'rates.midRate'
  | 'rates.currency' | 'rates.bank' | 'rates.date' | 'rates.source' | 'rates.updated'
  | 'rates.bestBuy' | 'rates.bestSell' | 'rates.average' | 'rates.worstBuy' | 'rates.worstSell'
  | 'rates.allCurrencies' | 'rates.allBanks' | 'rates.fromDate' | 'rates.toDate'
  | 'rates.exportCsv' | 'rates.exportPdf'
  // Banks
  | 'banks.title' | 'banks.subtitle' | 'banks.totalBanks' | 'banks.activeBanks'
  | 'banks.search' | 'banks.swiftCode' | 'banks.website' | 'banks.phone' | 'banks.email'
  | 'banks.address' | 'banks.topRated'
  // Rankings
  | 'rankings.title' | 'rankings.subtitle' | 'rankings.exchangeRate' | 'rankings.interestRate'
  | 'rankings.serviceQuality' | 'rankings.customerSatisfaction' | 'rankings.digitalBanking'
  | 'rankings.overall' | 'rankings.noRankings'
  // Alerts
  | 'alerts.title' | 'alerts.subtitle' | 'alerts.create' | 'alerts.newAlert'
  | 'alerts.above' | 'als.below' | 'als.condition' | 'als.targetBuy' | 'als.targetSell'
  | 'als.active' | 'als.inactive' | 'als.noAlerts' | 'als.lastTriggered'
  | 'als.signInRequired'
  // Portfolio
  | 'portfolio.title' | 'portfolio.subtitle' | 'portfolio.totalItems' | 'portfolio.totalValue'
  | 'portfolio.currencies' | 'portfolio.add' | 'portfolio.edit' | 'portfolio.remove'
  | 'portfolio.holding' | 'portfolio.bankAccount' | 'portfolio.investment' | 'portfolio.other'
  | 'portfolio.noItems'
  // Favorites
  | 'favorites.title' | 'favorites.subtitle' | 'favorites.add' | 'favorites.remove'
  | 'favorites.noFavorites' | 'favorites.banks' | 'favorites.currencies'
  // Notifications
  | 'notifications.title' | 'notifications.subtitle' | 'notifications.empty'
  | 'notifications.markAllRead' | 'notifications.markRead' | 'notifications.type.rateAlert'
  | 'notifications.type.system' | 'notifications.type.portfolio'
  // Account
  | 'account.title' | 'account.profile' | 'account.email' | 'account.phone'
  | 'account.memberSince' | 'account.role' | 'account.verified' | 'account.notVerified'
  | 'account.lastLogin' | 'account.security' | 'account.changePassword' | 'account.preferences'
  | 'account.language'
  // Settings
  | 'settings.title' | 'settings.subtitle' | 'settings.theme' | 'settings.light'
  | 'settings.dark' | 'settings.system' | 'settings.sidebar' | 'settings.expanded'
  | 'settings.collapsed' | 'settings.notifications'
  // Admin
  | 'admin.title' | 'admin.subtitle' | 'admin.scraper' | 'admin.triggerScrape'
  | 'admin.totalScrapes' | 'admin.successRate' | 'admin.activeUsers'
  // Theme
  | 'theme.light' | 'theme.dark' | 'theme.system'
  // Errors
  | 'error.generic' | 'error.network' | 'error.notFound' | 'error.unauthorized'
  | 'error.forbidden';

const en: Record<TranslationKey, string> = {
  // Navigation
  'nav.dashboard': 'Dashboard',
  'nav.rates': 'Exchange Rates',
  'nav.banks': 'Banks',
  'nav.rankings': 'Rankings',
  'nav.services': 'Services',
  'nav.alerts': 'Alerts',
  'nav.account': 'Account',
  'nav.settings': 'Settings',
  'nav.admin': 'Admin',
  'nav.portfolio': 'Portfolio',
  'nav.favorites': 'Favorites',
  'nav.notifications': 'Notifications',
  'nav.signOut': 'Sign Out',

  // Common
  'common.loading': 'Loading...',
  'common.error': 'Something went wrong',
  'common.retry': 'Try Again',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.create': 'Create',
  'common.search': 'Search banks, currencies, services...',
  'common.filter': 'Filter',
  'common.clear': 'Clear',
  'common.noData': 'No data found',
  'common.viewAll': 'View All',
  'common.learnMore': 'Learn More',
  'common.showing': 'Showing',
  'common.of': 'of',
  'common.results': 'results',
  'common.perPage': 'Per page',

  // Auth
  'auth.signIn': 'Sign In',
  'auth.signUp': 'Sign Up',
  'auth.signOut': 'Sign Out',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.fullName': 'Full Name',
  'auth.phoneNumber': 'Phone Number',
  'auth.welcome': 'Welcome to EthioBanksHub',
  'auth.welcomeBack': 'Welcome back',
  'auth.noAccount': "Don't have an account?",
  'auth.hasAccount': 'Already have an account?',

  // Rates
  'rates.title': 'Exchange Rates',
  'rates.subtitle': 'Real-time and historical exchange rates for all Ethiopian banks',
  'rates.latest': 'Latest',
  'rates.historical': 'Historical',
  'rates.compare': 'Compare',
  'rates.bestRates': 'Best Rates',
  'rates.buyRate': 'Buy Rate',
  'rates.sellRate': 'Sell Rate',
  'rates.spread': 'Spread',
  'rates.midRate': 'Mid Rate',
  'rates.currency': 'Currency',
  'rates.bank': 'Bank',
  'rates.date': 'Date',
  'rates.source': 'Source',
  'rates.updated': 'Updated',
  'rates.bestBuy': 'Best Buy',
  'rates.bestSell': 'Best Sell',
  'rates.average': 'Average',
  'rates.worstBuy': 'Worst Buy',
  'rates.worstSell': 'Worst Sell',
  'rates.allCurrencies': 'All Currencies',
  'rates.allBanks': 'All Banks',
  'rates.fromDate': 'From Date',
  'rates.toDate': 'To Date',
  'rates.exportCsv': 'Export CSV',
  'rates.exportPdf': 'Export PDF',

  // Banks
  'banks.title': 'Ethiopian Banks',
  'banks.subtitle': 'Banks tracked — compare services, rates, and rankings',
  'banks.totalBanks': 'Total Banks',
  'banks.activeBanks': 'Active Banks',
  'banks.search': 'Search banks by name or code...',
  'banks.swiftCode': 'SWIFT',
  'banks.website': 'Website',
  'banks.phone': 'Phone',
  'banks.email': 'Email',
  'banks.address': 'Address',
  'banks.topRated': 'Top Rated',

  // Rankings
  'rankings.title': 'Bank Rankings',
  'rankings.subtitle': 'Compare Ethiopian banks across multiple categories',
  'rankings.exchangeRate': 'Exchange Rates',
  'rankings.interestRate': 'Interest Rates',
  'rankings.serviceQuality': 'Service Quality',
  'rankings.customerSatisfaction': 'Customer Satisfaction',
  'rankings.digitalBanking': 'Digital Banking',
  'rankings.overall': 'Overall',
  'rankings.noRankings': 'No rankings available',

  // Alerts
  'alerts.title': 'Rate Alerts',
  'alerts.subtitle': 'Get notified when exchange rates hit your target',
  'alerts.create': 'Create Alert',
  'alerts.newAlert': 'New Alert',
  'alerts.above': 'Above',
  'als.below': 'Below',
  'als.condition': 'Condition',
  'als.targetBuy': 'Target Buy Rate',
  'als.targetSell': 'Target Sell Rate',
  'als.active': 'Active',
  'als.inactive': 'Inactive',
  'als.noAlerts': 'No alerts',
  'als.lastTriggered': 'Last triggered',
  'als.signInRequired': 'Sign in required',

  // Portfolio
  'portfolio.title': 'Portfolio',
  'portfolio.subtitle': 'Track your currency holdings and investments',
  'portfolio.totalItems': 'Total Items',
  'portfolio.totalValue': 'Total Value (ETB)',
  'portfolio.currencies': 'Currencies Held',
  'portfolio.add': 'Add Item',
  'portfolio.edit': 'Edit',
  'portfolio.remove': 'Remove',
  'portfolio.holding': 'Currency Holding',
  'portfolio.bankAccount': 'Bank Account',
  'portfolio.investment': 'Investment',
  'portfolio.other': 'Other',
  'portfolio.noItems': 'No portfolio items yet',

  // Favorites
  'favorites.title': 'Favorites',
  'favorites.subtitle': 'Your favorite banks and currencies',
  'favorites.add': 'Add to Favorites',
  'favorites.remove': 'Remove from Favorites',
  'favorites.noFavorites': 'No favorites yet',
  'favorites.banks': 'Favorite Banks',
  'favorites.currencies': 'Favorite Currencies',

  // Notifications
  'notifications.title': 'Notifications',
  'notifications.subtitle': 'Stay informed about rates and activity',
  'notifications.empty': 'No notifications',
  'notifications.markAllRead': 'Mark all as read',
  'notifications.markRead': 'Mark as read',
  'notifications.type.rateAlert': 'Rate Alert',
  'notifications.type.system': 'System',
  'notifications.type.portfolio': 'Portfolio',

  // Account
  'account.title': 'Account',
  'account.profile': 'Profile',
  'account.email': 'Email',
  'account.phone': 'Phone',
  'account.memberSince': 'Member Since',
  'account.role': 'Role',
  'account.verified': 'Verified',
  'account.notVerified': 'Not verified',
  'account.lastLogin': 'Last Login',
  'account.security': 'Security',
  'account.changePassword': 'Change Password',
  'account.preferences': 'Preferences',
  'account.language': 'Language',

  // Settings
  'settings.title': 'Settings',
  'settings.subtitle': 'Customize your experience',
  'settings.theme': 'Theme',
  'settings.light': 'Light',
  'settings.dark': 'Dark',
  'settings.system': 'System',
  'settings.sidebar': 'Sidebar',
  'settings.expanded': 'Expanded',
  'settings.collapsed': 'Collapsed',
  'settings.notifications': 'Notifications',

  // Admin
  'admin.title': 'Admin Dashboard',
  'admin.subtitle': 'System management and monitoring',
  'admin.scraper': 'Scraper Control',
  'admin.triggerScrape': 'Trigger Scrape',
  'admin.totalScrapes': 'Total Scrapes',
  'admin.successRate': 'Success Rate',
  'admin.activeUsers': 'Active Users',

  // Theme
  'theme.light': 'Light mode',
  'theme.dark': 'Dark mode',
  'theme.system': 'System theme',

  // Errors
  'error.generic': 'Something went wrong',
  'error.network': 'Network error. Please check your connection.',
  'error.notFound': 'Page not found',
  'error.unauthorized': 'Please sign in to continue',
  'error.forbidden': 'You do not have permission to access this page',
};

// ── Amharic Translations ───────────────────────────────────────
const am: Partial<Record<TranslationKey, string>> = {
  // Navigation
  'nav.dashboard': 'ዳሽቦርድ',
  'nav.rates': 'የምንዛሪ ተመኖች',
  'nav.banks': 'ባንኮች',
  'nav.rankings': 'ደረጃዎች',
  'nav.services': 'አገልግሎቶች',
  'nav.alerts': 'ማንቂያዎች',
  'nav.account': 'መለያ',
  'nav.settings': 'ቅንብሮች',
  'nav.admin': 'አስተዳደር',
  'nav.portfolio': 'ፖርትፎሊዮ',
  'nav.favorites': 'የሚወዷቸው',
  'nav.notifications': 'ማሳወቂያዎች',
  'nav.signOut': 'ውጣ',

  // Common
  'common.loading': 'በመጫን ላይ...',
  'common.error': 'ስህተት ተከስቷል',
  'common.retry': 'እንደገና ሞክር',
  'common.save': 'አስቀምጥ',
  'common.cancel': 'ሰርዝ',
  'common.delete': 'ሰርዝ',
  'common.edit': 'አስተካክል',
  'common.create': 'ፍጠር',
  'common.search': 'ፈልግ...',
  'common.filter': 'አጣራ',
  'common.clear': 'አጽዳ',
  'common.noData': 'ምንም ውሂብ የለም',
  'common.viewAll': 'ሁሉንም ይመልከቱ',
  'common.showing': 'እያሳየ',
  'common.of': 'ከ',
  'common.results': 'ውጤቶች',
  'common.perPage': 'በገጽ',

  // Auth
  'auth.signIn': 'ግባ',
  'auth.signUp': 'ተመዝገብ',
  'auth.signOut': 'ውጣ',
  'auth.email': 'ኢሜይል',
  'auth.password': 'የይለፍ ቃል',
  'auth.fullName': 'ሙሉ ስም',
  'auth.phoneNumber': 'ስልክ ቁጥር',
  'auth.welcome': 'እንኳን ወደ ኢትዮባንክስሀብ በደህና መጡ',
  'auth.welcomeBack': 'እንኳን በደህና ተመለሱ',
  'auth.noAccount': 'መለያ የለዎትም?',
  'auth.hasAccount': 'መለያ አለዎት?',

  // Rates
  'rates.title': 'የምንዛሪ ተመኖች',
  'rates.subtitle': 'ለሁሉም የኢትዮጵያ ባንኮች የእውነተኛ ጊዜ እና የታሪክ የምንዛሪ ተመኖች',
  'rates.latest': 'የቅርብ ጊዜ',
  'rates.historical': 'ታሪካዊ',
  'rates.compare': 'አወዳድር',
  'rates.bestRates': 'ምርጥ ተመኖች',
  'rates.buyRate': 'የግዢ ተመን',
  'rates.sellRate': 'የሽያጭ ተመን',
  'rates.spread': 'ልዩነት',
  'rates.currency': 'ምንዛሬ',
  'rates.bank': 'ባንክ',
  'rates.date': 'ቀን',
  'rates.updated': 'የተዘመነ',
  'rates.bestBuy': 'ምርጥ ግዢ',
  'rates.bestSell': 'ምርጥ ሽያጭ',
  'rates.average': 'አማካይ',
  'rates.allCurrencies': 'ሁሉም ምንዛሬዎች',
  'rates.allBanks': 'ሁሉም ባንኮች',
  'rates.fromDate': 'ከቀን',
  'rates.toDate': 'እስከ ቀን',
  'rates.exportCsv': 'CSV አውርድ',
  'rates.exportPdf': 'PDF አውርድ',

  // Banks
  'banks.title': 'የኢትዮጵያ ባንኮች',
  'banks.subtitle': 'አገልግሎቶችን፣ ተመኖችን እና ደረጃዎችን ያወዳድሩ',
  'banks.totalBanks': 'ጠቅላላ ባንኮች',
  'banks.activeBanks': 'ንቁ ባንኮች',
  'banks.search': 'ባንኮችን በስም ወይም በኮድ ይፈልጉ...',
  'banks.swiftCode': 'SWIFT ኮድ',

  // Rankings
  'rankings.title': 'የባንክ ደረጃዎች',
  'rankings.subtitle': 'ባንኮችን በተለያዩ ምድቦች ያወዳድሩ',

  // Alerts
  'alerts.title': 'የተመን ማንቂያዎች',
  'alerts.subtitle': 'የምንዛሪ ተመኖች ዒላማዎን ሲደርሱ ይንገሩ',
  'alerts.create': 'ማንቂያ ፍጠር',
  'als.noAlerts': 'ምንም ማንቂያዎች የሉም',
  'als.active': 'ንቁ',
  'als.inactive': 'ያልተነቃ',
  'als.signInRequired': 'መግባት ያስፈልጋል',

  // Portfolio
  'portfolio.title': 'ፖርትፎሊዮ',
  'portfolio.noItems': 'ገና ምንም የፖርትፎሊዮ ነገሮች የሉም',

  // Favorites
  'favorites.title': 'የሚወዷቸው',
  'favorites.noFavorites': 'ገና ምንም የሚወዷቸው የሉም',

  // Notifications
  'notifications.title': 'ማሳወቂያዎች',
  'notifications.empty': 'ምንም ማሳወቂያዎች የሉም',

  // Account
  'account.title': 'መለያ',
  'account.email': 'ኢሜይል',
  'account.phone': 'ስልክ',
  'account.language': 'ቋንቋ',

  // Settings
  'settings.title': 'ቅንብሮች',
  'settings.theme': 'ገጽታ',
  'settings.light': 'ብርሃን',
  'settings.dark': 'ጨለማ',
  'settings.system': 'ሲስተም',
  'settings.notifications': 'ማሳወቂያዎች',

  // Admin
  'admin.title': 'የአስተዳደር ዳሽቦርድ',

  // Errors
  'error.generic': 'ስህተት ተከስቷል',
  'error.network': 'የአውታረ መረብ ስህተት',
};

export const translations: Record<Locale, Record<string, string>> = {
  en: en as unknown as Record<string, string>,
  am: am as unknown as Record<string, string>,
};
