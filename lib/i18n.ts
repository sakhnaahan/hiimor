export const LANGUAGE_COOKIE_NAME = "horse_lang";
export const DEFAULT_LANGUAGE = "mn";
export const LANGUAGES = ["mn", "en"] as const;

export type Language = (typeof LANGUAGES)[number];

export const translations = {
  en: {
    brand: "Horse Race",
    balance: "Balance",
    navRace: "Race",
    navHistory: "History",
    navInfo: "Info",
    navBetslip: "Bet slip",
    navAccount: "Account",
    navAdmin: "Admin",
    navLogin: "Login",
    navSignup: "Signup",
    logout: "Logout",
    submit: "Submit",
    working: "Working...",
    login: "Login",
    signup: "Signup",
    username: "Username",
    password: "Password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmNewPassword: "Confirm new password",
    changePassword: "Change password",
    changing: "Changing...",
    alreadyApproved: "Already approved?",
    alreadyRegistered: "Already registered?",
    logIn: "Log in",
    forgotPassword: "Forgot password? Ask an admin to reset it.",
    needAccess: "Need access?",
    needAccount: "Need an account?",
    requestSignup: "Sign up",
    profile: "Profile",
    manageAccount: "Manage your private race account.",
    waitingResult: "Waiting result",
    winPays: "Win pays",
    watchLive: "Watch Free Live Video",
    race: "Race",
    chooseHorseAndBet: "Choose HKJC horse and bet",
    racecardUnavailable: "Racecard data is temporarily unavailable.",
    hotFavourite: "Hot favourite",
    marketChance: "Market chance",
    odds: "odds",
    liveOdds: "Live",
    jockey: "Jockey",
    draw: "Draw",
    winPlace: "Win/Place",
    comboWp: "Combo W+P",
    quinella: "Quinella",
    quinellaComingSoon: "Quinella betting is coming soon.",
    banker: "Banker",
    legs: "Legs",
    quinellaOddsUnavailable: "Quinella odds are unavailable right now.",
    gear: "Gear",
    last6: "Last 6",
    horseWeight: "Horse Wt.",
    rating: "Rating",
    bestTime: "Best time",
    daysSinceLastRun: "Days since last run",
    overWeight: "Over Wt.",
    moreStats: "More stats",
    hideStats: "Hide stats",
    noExtraStats: "No extra stats available.",
    youPicked: "You picked",
    ifYouWin: "If you win",
    betAmount: "Bet amount",
    enterBetAmount: "Enter bet amount",
    max: "Max",
    clear: "Clear",
    placeBet: "Place bet",
    openBetslip: "Open bet slip",
    hideBetslip: "Hide bet slip",
    betSlip: "Bet slip",
    basket: "Basket",
    addToBetSlip: "Add",
    noOfBets: "No. of Bets",
    totalNoOfBets: "Total No. of Bets",
    unitBet: "Unit bet",
    betTotal: "Bet total",
    totalAmount: "Total amount",
    removeBet: "Remove bet",
    emptyBetSlip: "Empty.",
    selectedBets: "Selected bets",
    placeBasketConfirm: "Place {count} bets for {amount}?",
    placing: "Placing...",
    placeBetConfirm: "Place bet of {amount} on No. {horseNo} {horseName}?",
    pendingBets: "Pending bets",
    picked: "Picked",
    raceHistory: "Race history",
    showingRaces: "Showing races from the last 3 months.",
    transactionHistory: "Transaction history",
    showingTransactions: "Showing transactions from the last 3 months.",
    time: "Time",
    winner: "Winner",
    bet: "Bet",
    multiplier: "Odds",
    payout: "Payout",
    net: "Net",
    result: "Result",
    settled: "Settled",
    type: "Type",
    amount: "Amount",
    before: "Before",
    after: "After",
    won: "Won",
    lost: "Lost",
    pending: "Pending",
    adminOverview: "Overview",
    users: "Users",
    bets: "Bets",
    transactions: "Transactions",
    pendingApprovals: "Pending approvals",
    approvedUsers: "Approved users",
    systemCoins: "System coins",
    pendingBetsAdmin: "Pending bets",
    todayBetVolume: "Today's bet volume",
    viewAll: "View all",
    action: "Action",
    target: "Target",
    change: "Change",
    adjustCoins: "Adjust approved user coins",
    addCoins: "Add coins",
    subtractCoins: "Subtract coins",
    noApprovedUsers: "No approved users yet.",
    resetUserPassword: "Reset user password",
    noResetUsers: "No users available for password reset.",
    allUsers: "All users",
    role: "Role",
    status: "Status",
    created: "Created",
    actions: "Actions",
    approve: "Approve",
    reject: "Reject",
    makePlayer: "Make player",
    makeAdmin: "Make admin",
    player: "Player",
    admin: "Admin",
    approved: "Approved",
    rejected: "Rejected",
    resetPassword: "Reset password",
    resetting: "Resetting...",
    user: "User",
    menu: "Menu",
    closeMenu: "Close menu",
    adminRaceViewOnly: "Admin view only. Player betting is disabled.",
    coinsToAdd: "Coins to add",
    coinsToSubtract: "Coins to subtract",
    raceEconomy: "Race economy",
    oldValue: "Old value",
    newValue: "New value",
    selectedLanguage: "Language",
    showPassword: "Show password",
    hidePassword: "Hide password",
    meeting: "Meeting",
    start: "Start",
    prize: "Prize",
    horse: "Horse",
    trainer: "Trainer",
    weight: "Wt.",
    no: "No.",
    /*
    quinellaComingSoon: "Quinella Ð±Ð¾Ð¾Ñ†Ð¾Ð¾ ÑƒÐ´Ð°Ñ…Ð³Ò¯Ð¹ Ð½ÑÐ¼ÑÐ³Ð´ÑÐ½Ñ.",
    */
    tbc: "TBC",
  },
  mn: {
    alreadyRegistered: "Already registered?",
    needAccount: "Need an account?",
    brand: "Хийморь",
    balance: "коин",
    navRace: "Уралдаан",
    navHistory: "Түүх",
    navInfo: "Мэдээ",
    navBetslip: "Бооцоо",
    navAccount: "Аккаунт",
    navAdmin: "Админ",
    navLogin: "Нэвтрэх",
    navSignup: "Бүртгүүлэх",
    logout: "Гарах",
    submit: "Илгээх",
    working: "Ажиллаж байна...",
    login: "Нэвтрэх",
    signup: "Бүртгүүлэх",
    username: "Хэрэглэгчийн нэр",
    password: "Нууц үг",
    currentPassword: "Одоогийн нууц үг",
    newPassword: "Шинэ нууц үг",
    confirmNewPassword: "Шинэ нууц үгээ давтах",
    changePassword: "Нууц үг солих",
    changing: "Сольж байна...",
    alreadyApproved: "Бүртгэл баталгаажсан уу?",
    logIn: "Нэвтрэх",
    forgotPassword: "Нууц үгээ мартсан бол админаар сэргээлгэнэ үү.",
    needAccess: "Эрх хэрэгтэй юу?",
    requestSignup: "Бүртгүүлэх  ",
    profile: "Миний мэдээлэл",
    manageAccount: "Хувийн уралдааны дансаа удирдана.",
    waitingResult: "Хариу хүлээгдэж байна",
    winPays: "Хожвол төлөх",
    watchLive: "Шууд үзэх",
    race: "Уралдаан",
    chooseHorseAndBet: "HKJC морь сонгож бооцоо тавих",
    racecardUnavailable: "Уралдааны мэдээлэл түр байхгүй байна.",
    hotFavourite: "Их сонгогдсон",
    marketChance: "Зах зээлийн магадлал",
    odds: "коэф.",
    liveOdds: "Шууд",
    jockey: "Жокей (Jockey)",
    draw: "Гараа (Draw)",
    gear: "Хэрэгсэл (Gear)",
    last6: "Сүүлийн 6",
    horseWeight: "Морины жин",
    rating: "Үнэлгээ",
    bestTime: "Шилдэг цаг",
    daysSinceLastRun: "Сүүлд у хойш",
    overWeight: "Илүү жин",
    moreStats: "Үзүүлэлт",
    hideStats: "Нуух",
    noExtraStats: "Нэмэлт үзүүлэлт алга.",
    youPicked: "Таны сонголт",
    ifYouWin: "Хожвол авах",
    betAmount: "Бооцооны дүн",
    enterBetAmount: "Бооцооны дүн оруулах",
    max: "Бүгд",
    clear: "Арилгах",
    placeBet: "Бооцоо тавих",
    openBetslip: "Бооцоо ",
    hideBetslip: "Хаах ",
    betSlip: "Бооцооны сагс",
    basket: "Сагс",
    addToBetSlip: "Нэмэх",
    noOfBets: "Бооцооны тоо",
    totalNoOfBets: "Нийт бооцооны тоо",
    unitBet: "Нэгж бооцоо",
    betTotal: "Бооцооны нийт",
    totalAmount: "Нийт дүн",
    removeBet: "Бооцоо устгах",
    emptyBetSlip: "W, P эсвэл W&P коэф. дээр дарж бооцоо нэмнэ.",
    selectedBets: "Сонгосон бооцоо",
    placeBasketConfirm: "{amount} дүнтэй {count} бооцоо тавих уу?",
    placing: "Тавьж байна...",
    placeBetConfirm:
      "{amount} коиноор No. {horseNo} {horseName} дээр бооцоо тавих уу?",
    pendingBets: "Дүн хүлээгдэж буй бооцоо",
    picked: "Сонгосон",
    raceHistory: "Уралдааны түүх",
    showingRaces: "Сүүлийн 3 сарын уралдаануудыг харуулж байна.",
    transactionHistory: "Коины түүх",
    showingTransactions: "Сүүлийн 3 сарын гүйлгээнүүдийг харуулж байна.",
    time: "Цаг",
    winner: "Ялагч",
    bet: "Бооцоо",
    multiplier: "Коэф.",
    payout: "Олголт",
    net: "Цэвэр",
    result: "Дүн",
    settled: "Шийдсэн",
    type: "Төрөл",
    amount: "Дүн",
    before: "Өмнө",
    after: "Дараа",
    won: "Хожсон",
    lost: "Хожигдсон",
    pending: "Хүлээгдэж байна",
    adminOverview: "Тойм",
    users: "Хэрэглэгчид",
    bets: "Бооцоонууд",
    transactions: "Гүйлгээнүүд",
    pendingApprovals: "Ирсэн хүсэлт",
    approvedUsers: "Баталгаажсан хэрэглэгч",
    systemCoins: "Нийт тоглогчдийн коин",
    pendingBetsAdmin: "Хариу хүлээгдэж буй бооцоо",
    todayBetVolume: "Өнөөдрийн бооцооны дүн",
    viewAll: "Бүгдийг харах",
    action: "Үйлдэл",
    target: "Хэнд",
    change: "Өөрчлөлт",
    adjustCoins: "Баталгаажсан хэрэглэгчийн коин өөрчлөх",
    addCoins: "Коин нэмэх",
    subtractCoins: "Коин хасах",
    noApprovedUsers: "Баталгаажсан хэрэглэгч алга.",
    resetUserPassword: "Нууц үг сэргээх",
    noResetUsers: "Нууц үг сэргээх хэрэглэгч алга.",
    allUsers: "Бүх хэрэглэгч",
    role: "Эрх",
    status: "Төлөв",
    created: "Үүссэн",
    actions: "Үйлдэл",
    approve: "Батлах",
    reject: "Татгалзах",
    makePlayer: "Тоглогч болгох",
    makeAdmin: "Админ болгох",
    player: "Тоглогч",
    admin: "Админ",
    approved: "Баталгаажсан",
    rejected: "Татгалзсан",
    resetPassword: "Нууц үг сэргээх",
    resetting: "Сэргээж байна...",
    user: "Хэрэглэгч",
    menu: "Цэс",
    closeMenu: "Цэс хаах",
    adminRaceViewOnly:
      "Админ зөвхөн харах боломжтой. Тоглогчийн бооцоо идэвхгүй.",
    coinsToAdd: "Нэмэх коин",
    coinsToSubtract: "Хасах коин",
    raceEconomy: "Уралдааны эдийн засаг",
    oldValue: "Өмнөх утга",
    newValue: "Шинэ утга",
    selectedLanguage: "Хэл",
    showPassword: "Нууц үг харах",
    hidePassword: "Нууц үг нуух",
    meeting: "Уулзалт",
    start: "Эхлэх",
    prize: "Шагнал",
    horse: "Морь (Horse)",
    trainer: "Дасгалжуулагч",
    weight: "Жин",
    no: "No.",
    tbc: "Тодорхойгүй",
    winPlace: "Win/Place",
    comboWp: "Combo W+P",
    quinella: "Quinella",
    quinellaComingSoon: "Quinella Ð±Ð¾Ð¾Ñ†Ð¾Ð¾ ÑƒÐ´Ð°Ñ…Ð³Ò¯Ð¹ Ð½ÑÐ¼ÑÐ³Ð´ÑÐ½Ñ.",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function normalizeLanguage(value: string | undefined | null): Language {
  return value === "en" ? "en" : DEFAULT_LANGUAGE;
}

export function getTranslations(language: Language) {
  return translations[language];
}

export function translate(language: Language, key: TranslationKey) {
  return (translations[language] as Record<TranslationKey, string>)[key];
}

export function interpolate(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? ""),
  );
}

export function resultLabel(language: Language, result: string) {
  if (result === "WIN") {
    return translate(language, "won");
  }

  if (result === "LOSS") {
    return translate(language, "lost");
  }

  if (result === "PENDING") {
    return translate(language, "waitingResult");
  }

  return result;
}

export function roleLabel(language: Language, role: string) {
  if (role === "admin") {
    return translate(language, "admin");
  }

  if (role === "player") {
    return translate(language, "player");
  }

  return role;
}

export function statusLabel(language: Language, status: string) {
  if (status === "approved") {
    return translate(language, "approved");
  }

  if (status === "rejected") {
    return translate(language, "rejected");
  }

  if (status === "pending") {
    return translate(language, "pending");
  }

  return status;
}

const serverMessageTranslations: Record<string, string> = {
  "Account created. You can log in now.": "Account created. You can log in now.",
  "Your account cannot log in.": "Your account cannot log in.",
  "Invalid signup details.": "Бүртгэлийн мэдээлэл буруу байна.",
  "That username is already taken.":
    "Энэ хэрэглэгчийн нэр аль хэдийн ашиглагдаж байна.",
  "Signup request sent. Wait for admin approval before logging in.":
    "Бүртгүүлэх хүсэлт илгээгдлээ. Нэвтрэхээс өмнө админ батлахыг хүлээнэ үү.",
  "Invalid login details.": "Нэвтрэх мэдээлэл буруу байна.",
  "Invalid username or password.":
    "Хэрэглэгчийн нэр эсвэл нууц үг буруу байна.",
  "Invalid password details.": "Нууц үгийн мэдээлэл буруу байна.",
  "Account was not found.": "Данс олдсонгүй.",
  "Current password is incorrect.": "Одоогийн нууц үг буруу байна.",
  "Password changed. Other sessions were signed out.":
    "Нууц үг солигдлоо. Бусад төхөөрөмжөөс гаргалаа.",
  "Invalid user.": "Хэрэглэгч буруу байна.",
  "User was not found.": "Хэрэглэгч олдсонгүй.",
  "You cannot reset this user's password.":
    "Энэ хэрэглэгчийн нууц үгийг сэргээх боломжгүй.",
  "Invalid recharge amount.": "Нэмэх коины дүн буруу байна.",
  "Only approved users can be recharged.":
    "Зөвхөн баталгаажсан хэрэглэгчид коин нэмнэ.",
  "Recharge failed.": "Коин нэмэхэд алдаа гарлаа.",
  "Coins recharged.": "Коин нэмэгдлээ.",
  "Invalid subtract amount.": "Хасах коины дүн буруу байна.",
  "Only approved users can have coins subtracted.":
    "Зөвхөн баталгаажсан хэрэглэгчээс коин хасна.",
  "Cannot subtract more coins than the user has.":
    "Хэрэглэгчийн үлдэгдлээс их коин хасах боломжгүй.",
  "Coin subtraction failed.": "Коин хасахад алдаа гарлаа.",
  "Coins subtracted.": "Коин хасагдлаа.",
  "Invalid race bet.": "Бооцооны мэдээлэл буруу байна.",
  "HKJC racecard is unavailable. Try again shortly.":
    "HKJC уралдааны мэдээлэл түр байхгүй байна. Дараа дахин оролдоно уу.",
  "Selected race is no longer available in the current HKJC racecard.":
    "Сонгосон уралдаан одоогийн HKJC мэдээлэлд байхгүй байна.",
  "HKJC race identity is unavailable. Try again shortly.":
    "HKJC уралдааны таних мэдээлэл байхгүй байна. Дараа дахин оролдоно уу.",
  "Selected horse is no longer available in the current HKJC racecard.":
    "Сонгосон морь одоогийн HKJC мэдээлэлд байхгүй байна.",
  "Odds are unavailable. Try again shortly.":
    "Коэффициент түр байхгүй байна. Дараа дахин оролдоно уу.",
  "Odds changed. Please confirm again.":
    "Коэффициент өөрчлөгдлөө. Дахин баталгаажуулна уу.",
  "Approved account required.": "Баталгаажсан данс шаардлагатай.",
  "Insufficient coin balance.": "Коины үлдэгдэл хүрэлцэхгүй байна.",
  "Race failed.": "Бооцоо тавихад алдаа гарлаа.",
  "Username must be at least 3 characters.":
    "Хэрэглэгчийн нэр хамгийн багадаа 3 тэмдэгт байна.",
  "Username must be at most 32 characters.":
    "Хэрэглэгчийн нэр 32 тэмдэгтээс ихгүй байна.",
  "Use only letters, numbers, and underscores.":
    "Зөвхөн үсэг, тоо, доогуур зураас ашиглана уу.",
  "Password must be at least 8 characters.":
    "Нууц үг хамгийн багадаа 8 тэмдэгт байна.",
  "Password is too long.": "Нууц үг хэт урт байна.",
  "Current password is required.": "Одоогийн нууц үг шаардлагатай.",
  "Confirm your new password.": "Шинэ нууц үгээ давтана уу.",
  "New passwords do not match.": "Шинэ нууц үгүүд таарахгүй байна.",
  "New password must be different from the current password.":
    "Шинэ нууц үг одоогийнхоос өөр байх ёстой.",
  "Choose a horse.": "Морь сонгоно уу.",
  "Horse number is too long.": "Морины дугаар хэт урт байна.",
  "Race date is required.": "Уралдааны огноо шаардлагатай.",
  "Racecourse is required.": "Уралдааны газар шаардлагатай.",
};

export function translateServerMessage(language: Language, message: string) {
  if (language === "en") {
    return message;
  }

  return serverMessageTranslations[message] ?? message;
}
