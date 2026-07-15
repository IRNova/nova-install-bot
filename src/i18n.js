// Bot copy in English and Persian. t(lang, key) returns the string; anything
// missing falls back to English. Keep both blocks in sync when adding keys.

export const STR = {
  en: {
    // menu
    menu_title: "⚡️ <b>Nova Panel Manager</b> ⚡️",
    menu_hi: (name) => `👋 Hi ${name}!`,
    menu_body:
      "I build your own Nova proxy panel on your Cloudflare account in about a minute, and keep it updated.\n\n📌 Use the buttons below to build, manage or get help:",
    btn_install: "🚀 Build a new panel",
    btn_faq: "❓ FAQ",
    btn_apps: "📱 Get the Nova app",
    btn_contact: "💬 Message support",
    btn_github: "💻 GitHub source",
    btn_back_menu: "⬅️ Back to menu",
    btn_lang: "🌐 فارسی",
    lang_set: "✅ Language set to English.",

    // install
    install_text:
      "🚀 <b>Install Nova</b>\n\n" +
      "I'll build your own Nova panel on <b>your</b> Cloudflare account: worker and database, fully set up. About a minute.\n\n" +
      "<b>1.</b> Need a free Cloudflare account? Make one first (1 min).\n\n" +
      "<b>2.</b> Tap <b>Get my token</b>. A Cloudflare page opens, already filled in.\n" +
      "   • Scroll to the bottom → <b>Continue to summary</b>\n" +
      "   • Tap <b>Create Token</b>, then <b>Copy</b> the long code\n" +
      "   ⚠️ Copy the whole code, it's shown only once.\n\n" +
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
    err_short: " (the token looks too short, the copy was probably cut off)",
    err_generic: "Something went wrong",
    not_a_token:
      "That doesn't look like a Cloudflare token. It's one long line, 40 characters, no spaces. Tap <b>Get my token</b> above, create it, and paste the whole code here.\n\n⚠️ Make sure you copy the <b>API Token</b> (not the Global API Key or your account email).",

    result_title: "🎉 <b>Your Nova is ready!</b>",
    result_addr: "Your address:",
    result_setpw: "First, set your admin password using the button below.",
    result_slow:
      "\n\n⏳ Your panel is still going live worldwide, Cloudflare can take 1-3 minutes for a new address. If the link errors at first, wait a minute and refresh.",
    result_iran:
      "\n\n🇮🇷 <b>In Iran:</b> workers.dev is filtered. In Cloudflare, add a Custom Domain (Workers → your worker → Settings → Domains & Routes) and use that instead.",
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
    faq_empty: "No questions yet, tap Contact us to ask.",
    btn_back_faq: "⬅️ Back to questions",

    // contact
    contact_start:
      "✉️ <b>Contact us</b>\n\nType your message and send it. It goes straight to our team, and we'll reply here.\n\nSend /menu to cancel.",
    contact_disabled: "Contact is currently disabled. Please try again later.",
    contact_notset: "Thanks! But contact isn't set up yet. Please try again later.",
    contact_sent: "✅ Sent! Our team will get back to you here.",
    reply_prefix: "💬 <b>Reply from the Nova team:</b>",

    nudge: "Send /install to set up your Nova panel, or paste your Cloudflare token when you have it.",
    banned: "🚫 You no longer have access to this bot.",

    // channel membership gate
    join_text:
      "📣 <b>Join our channel first</b>\n\nTo use this bot you need to be a member of our Telegram channel. Join, then tap <b>I've joined</b>.",
    btn_join: "📣 Join the channel",
    btn_joined: "✅ I've joined",
    join_no: "You're not a member yet. Join the channel first, then tap again.",
    join_ok: "✅ Welcome!",

    // update panel
    btn_update: "🛠 Manage & update panels",
    upd_text:
      "🔄 <b>Update my panel</b>\n\n" +
      "I'll update your existing Nova panel to the latest version. Your settings, users and data stay untouched.\n\n" +
      "<b>1.</b> Tap <b>Get my token</b> and create a token (same steps as install).\n" +
      "<b>2.</b> Paste the token here. I keep it only for a few minutes to finish the update, then delete it.",
    upd_pick:
      "🔄 <b>Pick your panel's Worker</b>\n\nThese are the Workers on your Cloudflare account. Choose the one that runs your Nova panel:",
    upd_none: "I couldn't find any Workers on this account. Build a panel first with 🚀 Install.",
    upd_confirm: (name) =>
      `⚠️ <b>Update “${name}”?</b>\n\nThis replaces that Worker's code with the latest Nova. Settings, users and data are kept. Only continue if this Worker really is your Nova panel.`,
    btn_upd_go: "✅ Update now",
    btn_upd_cancel: "✖️ Cancel",
    upd_run: "⏳ <b>Updating…</b>",
    upd_done: (name) => `✅ <b>Done!</b>\n\n“${name}” is now running the latest Nova.`,
    upd_fail: "❌ The update failed",
    upd_expired: "This update session has expired. Tap 🔄 Update my panel and send your token again.",

    // support us
    btn_support: "❤️ Support us",
    support_title: "❤️ <b>Support us</b>\n\nNova is free and always will be. If it helps you, you can support the project:",
    support_notset: "❤️ Support isn't set up yet. Please check back later.",
  },

  fa: {
    menu_title: "⚡️ <b>پنل مدیریت نوا در تلگرام</b> ⚡️",
    menu_hi: (name) => `👋 سلام ${name}!`,
    menu_body:
      "در حدود یک دقیقه پنل پراکسی نوای شخصی‌ات را روی حساب Cloudflare خودت می‌سازم و به‌روز نگهش می‌دارم.\n\n📌 از گزینه‌های زیر جهت ساخت یا مدیریت پنل‌های خود استفاده کنید:",
    btn_install: "🚀 ساخت پنل جدید",
    btn_faq: "❓ سؤالات متداول",
    btn_apps: "📱 دریافت اپ نوا",
    btn_contact: "💬 پیام به پشتیبانی",
    btn_github: "💻 سورس گیت‌هاب",
    btn_back_menu: "⬅️ بازگشت به منو",
    btn_lang: "🌐 English",
    lang_set: "✅ زبان روی فارسی تنظیم شد.",

    install_text:
      "🚀 <b>نصب نوا</b>\n\n" +
      "پنل نوای شخصی‌ات را روی حساب <b>خودت</b> در Cloudflare می‌سازم: ورکر و دیتابیس، کاملاً آماده. حدود یک دقیقه.\n\n" +
      "<b>۱.</b> حساب رایگان Cloudflare نداری؟ اول یکی بساز (۱ دقیقه).\n\n" +
      "<b>۲.</b> روی <b>گرفتن توکن</b> بزن. یک صفحهٔ Cloudflare باز می‌شود که از قبل پر شده.\n" +
      "   • تا ته پایین برو ← <b>Continue to summary</b>\n" +
      "   • <b>Create Token</b> را بزن، بعد کدِ بلند را <b>Copy</b> کن\n" +
      "   ⚠️ کلِ کد را کپی کن، فقط یک‌بار نشان داده می‌شود.\n\n" +
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
    err_short: " (توکن خیلی کوتاه به نظر می‌رسد، احتمالاً کپی ناقص بوده)",
    err_generic: "یک خطا رخ داد",
    not_a_token:
      "این شبیه توکن Cloudflare نیست. توکن یک خط بلند و ۴۰ کاراکتری بدون فاصله است. دکمهٔ <b>گرفتن توکن</b> بالا را بزن، بسازش و کلِ کد را همین‌جا بچسبان.\n\n⚠️ حتماً <b>API Token</b> را کپی کن (نه Global API Key و نه ایمیل حسابت).",

    result_title: "🎉 <b>نوای تو آماده است!</b>",
    result_addr: "آدرس تو:",
    result_setpw: "اول با دکمهٔ زیر رمز ادمینت را تنظیم کن.",
    result_slow:
      "\n\n⏳ پنل تو هنوز در حال فعال‌شدن در سراسر دنیاست، Cloudflare ممکن است ۱ تا ۳ دقیقه طول بکشد. اگر لینک اول خطا داد، یک دقیقه صبر کن و تازه کن.",
    result_iran:
      "\n\n🇮🇷 <b>در ایران:</b> workers.dev فیلتر است. در Cloudflare یک دامنهٔ اختصاصی اضافه کن (Workers ← ورکر تو ← Settings ← Domains & Routes) و از آن استفاده کن.",
    result_apps: "\n\n📱 بعد <b>نوا کلاینت</b> را نصب کن، لینک اشتراکت را از پنل واردش کن و وصل شو.",
    btn_setpw: "🔓 تنظیم رمز ادمین",
    btn_open_panel: "🌐 باز کردن پنل",
    btn_get_app: "📱 دریافت اپ نوا",

    apps_title: "📱 <b>دریافت اپ نوا</b>\n\nنوا کلاینت را نصب کن، لینک اشتراکت را از پنل واردش کن و وصل شو.",
    btn_android: "🤖 اندروید (APK)",
    btn_all_dl: "💻 همهٔ دانلودها (ویندوز / مک / بیشتر)",

    faq_title: "❓ <b>سؤالات متداول</b>\n\nروی یک سؤال بزن:",
    faq_empty: "هنوز سؤالی نیست، برای پرسیدن روی «تماس با ما» بزن.",
    btn_back_faq: "⬅️ بازگشت به سؤالات",

    contact_start:
      "✉️ <b>تماس با ما</b>\n\nپیامت را بنویس و بفرست. مستقیم به تیم ما می‌رسد و همین‌جا جوابت را می‌دهیم.\n\nبرای لغو /menu را بفرست.",
    contact_disabled: "تماس در حال حاضر غیرفعال است. لطفاً بعداً دوباره امتحان کن.",
    contact_notset: "ممنون! اما تماس هنوز تنظیم نشده. لطفاً بعداً امتحان کن.",
    contact_sent: "✅ ارسال شد! تیم ما همین‌جا جوابت را می‌دهد.",
    reply_prefix: "💬 <b>پاسخ از تیم نوا:</b>",

    nudge: "برای ساخت پنل نوا /install را بفرست، یا وقتی توکن Cloudflare را داشتی همین‌جا بچسبان.",
    banned: "🚫 دیگر به این ربات دسترسی نداری.",

    join_text:
      "📣 <b>اول عضو کانال ما شو</b>\n\nبرای استفاده از این ربات باید عضو کانال تلگرام ما باشی. عضو شو، بعد روی <b>عضو شدم</b> بزن.",
    btn_join: "📣 عضویت در کانال",
    btn_joined: "✅ عضو شدم",
    join_no: "هنوز عضو نشده‌ای. اول عضو کانال شو، بعد دوباره بزن.",
    join_ok: "✅ خوش آمدی!",

    btn_update: "🛠 مدیریت و آپدیت پنل‌ها",
    upd_text:
      "🔄 <b>به‌روزرسانی پنل من</b>\n\n" +
      "پنل نوای فعلی‌ات را به آخرین نسخه به‌روز می‌کنم. تنظیمات، کاربران و داده‌هایت دست‌نخورده می‌مانند.\n\n" +
      "<b>۱.</b> روی <b>گرفتن توکن</b> بزن و یک توکن بساز (همان مراحل نصب).\n" +
      "<b>۲.</b> توکن را همین‌جا بچسبان. فقط چند دقیقه برای انجام به‌روزرسانی نگهش می‌دارم و بعد پاکش می‌کنم.",
    upd_pick:
      "🔄 <b>ورکر پنلت را انتخاب کن</b>\n\nاین‌ها ورکرهای حساب Cloudflare تو هستند. آن یکی که پنل نوایت را اجرا می‌کند انتخاب کن:",
    upd_none: "هیچ ورکری در این حساب پیدا نکردم. اول با 🚀 نصب یک پنل بساز.",
    upd_confirm: (name) =>
      `⚠️ <b>«${name}» به‌روز شود؟</b>\n\nکد آن ورکر با آخرین نسخهٔ نوا جایگزین می‌شود. تنظیمات، کاربران و داده‌ها حفظ می‌شوند. فقط وقتی ادامه بده که این ورکر واقعاً پنل نوای تو باشد.`,
    btn_upd_go: "✅ به‌روزرسانی کن",
    btn_upd_cancel: "✖️ انصراف",
    upd_run: "⏳ <b>در حال به‌روزرسانی…</b>",
    upd_done: (name) => `✅ <b>انجام شد!</b>\n\n«${name}» حالا آخرین نسخهٔ نوا را اجرا می‌کند.`,
    upd_fail: "❌ به‌روزرسانی ناموفق بود",
    upd_expired: "این نشست به‌روزرسانی منقضی شد. روی 🔄 به‌روزرسانی پنل من بزن و دوباره توکن را بفرست.",

    btn_support: "❤️ حمایت مالی",
    support_title: "❤️ <b>حمایت مالی</b>\n\nنوا رایگان است و همیشه رایگان می‌ماند. اگر برایت مفید بوده، می‌توانی از پروژه حمایت کنی:",
    support_notset: "❤️ حمایت هنوز تنظیم نشده. لطفاً بعداً سر بزن.",
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
