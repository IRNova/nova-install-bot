// Bot copy in English and Persian. t(lang, key) returns the string; anything
// missing falls back to English. Keep both blocks in sync when adding keys.

export const STR = {
  en: {
    // menu
    menu_hi: (name) => `👋 Hi ${name}!`,
    menu_body:
      "I'm the <b>Nova</b> bot. I can build your own Nova proxy panel on your Cloudflare account in about a minute, answer common questions, and connect you with our team.\n\nPick an option below.",
    btn_install: "🚀 Install my Nova panel",
    btn_faq: "❓ FAQ",
    btn_apps: "📱 Get the Nova app",
    btn_contact: "✉️ Contact us",
    btn_back_menu: "⬅️ Back to menu",
    btn_lang: "🌐 فارسی",
    lang_set: "✅ Language set to English.",

    // install
    install_text:
      "🚀 <b>Install Nova</b>\n\n" +
      "I'll build your own Nova panel on <b>your</b> Cloudflare account — worker and database, fully set up. About a minute.\n\n" +
      "<b>1.</b> Need a free Cloudflare account? Make one first (1 min).\n\n" +
      "<b>2.</b> Tap <b>Get my token</b>. A Cloudflare page opens, already filled in.\n" +
      "   • Scroll to the bottom → <b>Continue to summary</b>\n" +
      "   • Tap <b>Create Token</b>, then <b>Copy</b> the long code\n" +
      "   ⚠️ Copy the whole code — it's shown only once.\n\n" +
      "<b>3.</b> Paste the token here in the chat. I delete it the moment it arrives and never store it.\n\n" +
      "🇮🇷 In Iran: if the Cloudflare page won't open, turn on your current VPN first.",
    btn_get_token: "🔑 Get my token",
    btn_make_account: "Create a free Cloudflare account",

    building: "🛠 <b>Building your Nova…</b>",
    s_verify: "Checking your token",
    s_account: "Finding your account",
    s_sub: "Setting up your subdomain",
    s_db: "Creating the database",
    s_kv: "Creating storage",
    s_fetch: "Downloading the latest Nova",
    s_deploy: "Deploying the worker",
    s_enable: "Turning it on",
    s_online: "Waiting for it to come online",

    err_token: "That token didn't work. Make sure you created it with the Cloudflare Workers template and copied all of it.",
    err_short: " (the token looks too short — the copy was probably cut off)",
    err_generic: "Something went wrong",
    not_a_token:
      "That doesn't look like a Cloudflare token. It's one long line, 40 characters, no spaces. Tap <b>Get my token</b> above, create it, and paste the whole code here.\n\n⚠️ Make sure you copy the <b>API Token</b> (not the Global API Key or your account email).",

    result_title: "🎉 <b>Your Nova is ready!</b>",
    result_addr: "Your address:",
    result_setpw: "First, set your admin password using the button below.",
    result_slow:
      "\n\n⏳ Your panel is still going live worldwide — Cloudflare can take 1-3 minutes for a new address. If the link errors at first, wait a minute and refresh.",
    result_iran:
      "\n\n🇮🇷 <b>In Iran:</b> workers.dev is filtered — in Cloudflare, add a Custom Domain (Workers → your worker → Settings → Domains & Routes) and use that instead.",
    result_apps: "\n\n📱 Then install <b>Nova Client</b>, import your subscription link from the panel, and connect.",
    btn_setpw: "🔓 Set my admin password",
    btn_open_panel: "🌐 Open my panel",
    btn_get_app: "📱 Get the Nova app",

    // apps
    apps_title: "📱 <b>Get the Nova app</b>\n\nInstall Nova Client, import your subscription link from your panel, and connect.",
    btn_android: "🤖 Android (APK)",
    btn_all_dl: "💻 All downloads (Win / macOS / more)",

    // faq
    faq_title: "❓ <b>Frequently asked questions</b>\n\nTap a question:",
    faq_empty: "No questions yet — tap Contact us to ask.",
    btn_back_faq: "⬅️ Back to questions",

    // contact
    contact_start:
      "✉️ <b>Contact us</b>\n\nType your message and send it. It goes straight to our team, and we'll reply here.\n\nSend /menu to cancel.",
    contact_disabled: "Contact is currently disabled. Please try again later.",
    contact_notset: "Thanks! But contact isn't set up yet. Please try again later.",
    contact_sent: "✅ Sent! Our team will get back to you here.",
    reply_prefix: "💬 <b>Reply from the Nova team:</b>",

    nudge: "Send /install to set up your Nova panel, or paste your Cloudflare token when you have it.",
  },

  fa: {
    menu_hi: (name) => `👋 سلام ${name}!`,
    menu_body:
      "من ربات <b>نوا</b> هستم. می‌توانم در حدود یک دقیقه پنل پروکسی نوای شخصی‌ات را روی حساب Cloudflare خودت بسازم، به سؤال‌های رایج پاسخ بدهم و تو را به تیم ما وصل کنم.\n\nیکی از گزینه‌های زیر را انتخاب کن.",
    btn_install: "🚀 نصب پنل نوای من",
    btn_faq: "❓ سؤالات متداول",
    btn_apps: "📱 دریافت اپ نوا",
    btn_contact: "✉️ تماس با ما",
    btn_back_menu: "⬅️ بازگشت به منو",
    btn_lang: "🌐 English",
    lang_set: "✅ زبان روی فارسی تنظیم شد.",

    install_text:
      "🚀 <b>نصب نوا</b>\n\n" +
      "پنل نوای شخصی‌ات را روی حساب <b>خودت</b> در Cloudflare می‌سازم — ورکر و دیتابیس، کاملاً آماده. حدود یک دقیقه.\n\n" +
      "<b>۱.</b> حساب رایگان Cloudflare نداری؟ اول یکی بساز (۱ دقیقه).\n\n" +
      "<b>۲.</b> روی <b>گرفتن توکن</b> بزن. یک صفحهٔ Cloudflare باز می‌شود که از قبل پر شده.\n" +
      "   • تا ته پایین برو ← <b>Continue to summary</b>\n" +
      "   • <b>Create Token</b> را بزن، بعد کدِ بلند را <b>Copy</b> کن\n" +
      "   ⚠️ کلِ کد را کپی کن — فقط یک‌بار نشان داده می‌شود.\n\n" +
      "<b>۳.</b> توکن را همین‌جا در چت بچسبان. لحظه‌ای که برسد پاکش می‌کنم و هرگز ذخیره‌اش نمی‌کنم.\n\n" +
      "🇮🇷 در ایران: اگر صفحهٔ Cloudflare باز نشد، اول VPN فعلی‌ات را روشن کن.",
    btn_get_token: "🔑 گرفتن توکن",
    btn_make_account: "ساخت حساب رایگان Cloudflare",

    building: "🛠 <b>در حال ساخت نوای تو…</b>",
    s_verify: "بررسی توکن",
    s_account: "پیدا کردن حساب",
    s_sub: "تنظیم ساب‌دامنه",
    s_db: "ساخت دیتابیس",
    s_kv: "ساخت حافظه",
    s_fetch: "دانلود آخرین نسخهٔ نوا",
    s_deploy: "دیپلوی ورکر",
    s_enable: "روشن کردن",
    s_online: "منتظر آنلاین شدن",

    err_token: "این توکن کار نکرد. مطمئن شو با قالب Cloudflare Workers ساخته‌ای و کاملش را کپی کرده‌ای.",
    err_short: " (توکن خیلی کوتاه به نظر می‌رسد — احتمالاً کپی ناقص بوده)",
    err_generic: "یک خطا رخ داد",
    not_a_token:
      "این شبیه توکن Cloudflare نیست. توکن یک خط بلند و ۴۰ کاراکتری بدون فاصله است. دکمهٔ <b>گرفتن توکن</b> بالا را بزن، بسازش و کلِ کد را همین‌جا بچسبان.\n\n⚠️ حتماً <b>API Token</b> را کپی کن (نه Global API Key و نه ایمیل حسابت).",

    result_title: "🎉 <b>نوای تو آماده است!</b>",
    result_addr: "آدرس تو:",
    result_setpw: "اول با دکمهٔ زیر رمز ادمینت را تنظیم کن.",
    result_slow:
      "\n\n⏳ پنل تو هنوز در حال فعال‌شدن در سراسر دنیاست — Cloudflare ممکن است ۱ تا ۳ دقیقه طول بکشد. اگر لینک اول خطا داد، یک دقیقه صبر کن و تازه کن.",
    result_iran:
      "\n\n🇮🇷 <b>در ایران:</b> workers.dev فیلتر است — در Cloudflare یک دامنهٔ اختصاصی اضافه کن (Workers ← ورکر تو ← Settings ← Domains & Routes) و از آن استفاده کن.",
    result_apps: "\n\n📱 بعد <b>نوا کلاینت</b> را نصب کن، لینک اشتراکت را از پنل واردش کن و وصل شو.",
    btn_setpw: "🔓 تنظیم رمز ادمین",
    btn_open_panel: "🌐 باز کردن پنل",
    btn_get_app: "📱 دریافت اپ نوا",

    apps_title: "📱 <b>دریافت اپ نوا</b>\n\nنوا کلاینت را نصب کن، لینک اشتراکت را از پنل واردش کن و وصل شو.",
    btn_android: "🤖 اندروید (APK)",
    btn_all_dl: "💻 همهٔ دانلودها (ویندوز / مک / بیشتر)",

    faq_title: "❓ <b>سؤالات متداول</b>\n\nروی یک سؤال بزن:",
    faq_empty: "هنوز سؤالی نیست — برای پرسیدن روی «تماس با ما» بزن.",
    btn_back_faq: "⬅️ بازگشت به سؤالات",

    contact_start:
      "✉️ <b>تماس با ما</b>\n\nپیامت را بنویس و بفرست. مستقیم به تیم ما می‌رسد و همین‌جا جوابت را می‌دهیم.\n\nبرای لغو /menu را بفرست.",
    contact_disabled: "تماس در حال حاضر غیرفعال است. لطفاً بعداً دوباره امتحان کن.",
    contact_notset: "ممنون! اما تماس هنوز تنظیم نشده. لطفاً بعداً امتحان کن.",
    contact_sent: "✅ ارسال شد! تیم ما همین‌جا جوابت را می‌دهد.",
    reply_prefix: "💬 <b>پاسخ از تیم نوا:</b>",

    nudge: "برای ساخت پنل نوا /install را بفرست، یا وقتی توکن Cloudflare را داشتی همین‌جا بچسبان.",
  },
};

export function t(lang, key, ...args) {
  const L = STR[lang] || STR.en;
  let v = L[key];
  if (v === undefined) v = STR.en[key];
  return typeof v === "function" ? v(...args) : v;
}

// Normalise a Telegram language_code (e.g. "fa-IR", "en-US") to "fa" | "en".
export function normLang(code) {
  return (code || "").toLowerCase().startsWith("fa") ? "fa" : "en";
}
