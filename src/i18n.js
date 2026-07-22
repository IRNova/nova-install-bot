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
      "✉️ <b>Contact us</b>\n\nType your message and send it. You can attach a photo or video too. It goes straight to our team, and we'll reply here.\n\nSend /menu to cancel.",
    contact_disabled: "Contact is currently disabled. Please try again later.",
    contact_notset: "Thanks! But contact isn't set up yet. Please try again later.",
    contact_sent: "✅ Sent! Our team will get back to you here.",
    reply_prefix: "💬 <b>Reply from the Nova team:</b>",

    // AI auto-answer
    btn_ai_solved: "✅ Solved",
    btn_ai_human: "👤 Talk to support",
    ai_note: "🤖 Automated answer. Not what you needed? Tap “Talk to support” and our team will step in.",

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

    // deploy your own Nova (hub mirroring the app's onboarding)
    btn_deploy: "🧭 Deploy your own Nova",
    btn_back_deploy: "⬅️ Deploy options",
    deploy_title:
      "🧭 <b>Deploy your own Nova</b>\n\n" +
      "Pick how you want to get connected:\n\n" +
      "🚀 <b>Your own panel</b> - free, runs on Cloudflare, no VPS needed.\n" +
      "🖥 <b>Your own VPS</b> - your own server, best call quality, fronted by Cloudflare.\n" +
      "🔗 <b>An existing subscription</b> - already have a link or config? Just use the app.\n\n" +
      "✅ <b>No domain? No problem.</b> You can set Nova up straight from the app, it connects right to your server. A domain makes things more censorship-resistant, but you don't need one to get online.",
    btn_dep_panel: "🚀 Deploy your own panel (free)",
    btn_dep_vps: "🖥 Connect your VPS",
    btn_dep_vps_bot: "🚀 Open the installer bot",
    btn_dep_sub: "🔗 Use an existing subscription",
    deploy_panel_text:
      "🚀 <b>Deploy your own panel</b>\n\n" +
      "I build your own Nova panel on <b>your</b> Cloudflare account: a Worker and database, fully set up in about a minute. Free, no VPS.\n\n" +
      "<b>What you need:</b>\n" +
      "• A free Cloudflare account\n" +
      "• A Cloudflare API token (steps below)\n\n" +
      "<b>Steps:</b>\n" +
      "<b>1.</b> No account yet? Make a free one first (1 min).\n" +
      "<b>2.</b> Tap <b>Get my token</b>. A Cloudflare page opens, already filled in. Scroll down → <b>Continue to summary</b> → <b>Create Token</b>, then <b>Copy</b> the whole code.\n" +
      "<b>3.</b> Paste the token here. I delete it the moment it arrives and never store it.\n\n" +
      "🔑 <b>The token needs these permissions:</b>\n" +
      "<b>Account</b>\n" +
      "• Workers Scripts: Edit\n" +
      "• Workers KV Storage: Edit\n" +
      "• D1: Edit\n" +
      "• Account Settings: Read\n" +
      "• Account Analytics: Read\n" +
      "<b>Zone</b> (only for a custom domain)\n" +
      "• Zone: Read\n" +
      "• DNS: Edit\n" +
      "• SSL and Certificates: Edit\n" +
      "• Zone Settings: Edit\n\n" +
      "🇮🇷 In Iran: if the Cloudflare page won't open, turn on your current VPN first.",
    deploy_vps_text:
      "🖥 <b>Connect your VPS</b>\n\n" +
      "Turn your own server into a full Nova node with one command. It runs Xray plus sing-box and its own management panel, so you get native full UDP (great call and gaming quality), VMess, WireGuard, and Hysteria2, all self-hosted and under your control.\n\n" +
      "✅ <b>No domain? No problem.</b> The Nova app connects straight to your VPS IP. You do not need a domain to get online.\n\n" +
      "<b>What you need:</b>\n" +
      "• A VPS with root SSH access (about $5/mo)\n" +
      "• Optional: a domain (for a trusted certificate or Cloudflare in front)\n\n" +
      "<b>Two ways to connect:</b>\n" +
      "• <b>Direct IP</b> (simplest): the Nova app connects straight to your VPS IP. Works out of the box, no domain needed.\n" +
      "• <b>With a domain</b>: add one for a trusted certificate, or put Cloudflare in front for the most censorship-resistant path.\n\n" +
      "<b>How:</b>\n" +
      "<b>1.</b> Run this on your VPS over SSH as root:\n" +
      "<code>bash &lt;(curl -fsSL https://raw.githubusercontent.com/IRNova/Nova-Server/main/nova-node.sh)</code>\n" +
      "It installs everything, opens the firewall, and prints your panel address and admin password.\n" +
      "<b>2.</b> Open that address in your browser (or the Nova app), log in, create a user, and share the link or import it into the Nova app.\n\n" +
      "Your VPS login is never sent anywhere, you run the command yourself on your own server.",
    deploy_sub_text:
      "🔗 <b>Use an existing subscription</b>\n\n" +
      "Already have a subscription link or a config (from your own panel, a friend, or a provider)? You do not need to build anything.\n\n" +
      "Install the Nova app, paste your subscription link or config, and connect.\n\n" +
      "✅ No domain or server needed, the app does it all.",
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
      "✉️ <b>تماس با ما</b>\n\nپیامت را بنویس و بفرست. می‌توانی عکس یا ویدیو هم بفرستی. مستقیم به تیم ما می‌رسد و همین‌جا جوابت را می‌دهیم.\n\nبرای لغو /menu را بفرست.",
    contact_disabled: "تماس در حال حاضر غیرفعال است. لطفاً بعداً دوباره امتحان کن.",
    contact_notset: "ممنون! اما تماس هنوز تنظیم نشده. لطفاً بعداً امتحان کن.",
    contact_sent: "✅ ارسال شد! تیم ما همین‌جا جوابت را می‌دهد.",
    reply_prefix: "💬 <b>پاسخ از تیم نوا:</b>",

    // AI auto-answer
    btn_ai_solved: "✅ حل شد",
    btn_ai_human: "👤 ارتباط با پشتیبان",
    ai_note: "🤖 پاسخ خودکار. جوابت را نگرفتی؟ روی «ارتباط با پشتیبان» بزن تا تیم ما وارد شود.",

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

    // راه‌اندازی نوای خودت
    btn_deploy: "🧭 راه‌اندازی نوای خودت",
    btn_back_deploy: "⬅️ گزینه‌های راه‌اندازی",
    deploy_title:
      "🧭 <b>راه‌اندازی نوای خودت</b>\n\n" +
      "انتخاب کن چطور می‌خواهی وصل شوی:\n\n" +
      "🚀 <b>پنل شخصی خودت</b> - رایگان، روی Cloudflare اجرا می‌شود، بدون نیاز به VPS.\n" +
      "🖥 <b>سرور (VPS) خودت</b> - سرور خودت، بهترین کیفیت تماس، پشت Cloudflare.\n" +
      "🔗 <b>اشتراک آماده</b> - از قبل لینک یا کانفیگ داری؟ فقط از اپ استفاده کن.\n\n" +
      "✅ <b>دامنه نداری؟ مشکلی نیست.</b> می‌توانی نوا را مستقیم از داخل اپ راه بیندازی، اپ مستقیم به سرورت وصل می‌شود. دامنه کار را در برابر فیلترینگ مقاوم‌تر می‌کند، اما برای آنلاین شدن لازم نیست.",
    btn_dep_panel: "🚀 ساخت پنل شخصی (رایگان)",
    btn_dep_vps: "🖥 اتصال VPS",
    btn_dep_vps_bot: "🚀 باز کردن ربات نصب‌کننده",
    btn_dep_sub: "🔗 استفاده از اشتراک آماده",
    deploy_panel_text:
      "🚀 <b>ساخت پنل شخصی</b>\n\n" +
      "پنل نوای شخصی‌ات را روی حساب <b>خودت</b> در Cloudflare می‌سازم: یک ورکر و دیتابیس، در حدود یک دقیقه کاملاً آماده. رایگان و بدون VPS.\n\n" +
      "<b>چه چیزی لازم داری:</b>\n" +
      "• یک حساب رایگان Cloudflare\n" +
      "• یک توکن API از Cloudflare (مراحلش پایین)\n\n" +
      "<b>مراحل:</b>\n" +
      "<b>۱.</b> هنوز حساب نداری؟ اول یک حساب رایگان بساز (۱ دقیقه).\n" +
      "<b>۲.</b> روی <b>گرفتن توکن</b> بزن. یک صفحهٔ Cloudflare باز می‌شود که از قبل پر شده. تا پایین برو ← <b>Continue to summary</b> ← <b>Create Token</b>، بعد کلِ کد را <b>Copy</b> کن.\n" +
      "<b>۳.</b> توکن را همین‌جا بچسبان. لحظه‌ای که برسد پاکش می‌کنم و هرگز ذخیره‌اش نمی‌کنم.\n\n" +
      "🔑 <b>توکن به این دسترسی‌ها نیاز دارد:</b>\n" +
      "<b>Account</b>\n" +
      "• Workers Scripts: Edit\n" +
      "• Workers KV Storage: Edit\n" +
      "• D1: Edit\n" +
      "• Account Settings: Read\n" +
      "• Account Analytics: Read\n" +
      "<b>Zone</b> (فقط برای دامنهٔ اختصاصی)\n" +
      "• Zone: Read\n" +
      "• DNS: Edit\n" +
      "• SSL and Certificates: Edit\n" +
      "• Zone Settings: Edit\n\n" +
      "🇮🇷 در ایران: اگر صفحهٔ Cloudflare باز نشد، اول VPN فعلی‌ات را روشن کن.",
    deploy_vps_text:
      "🖥 <b>اتصال VPS</b>\n\n" +
      "با یک دستور، سرور خودت را به یک نود کامل نوا تبدیل کن. Xray و sing-box و پنل مدیریت خودش را اجرا می‌کند، پس UDP کامل و بومی (کیفیت عالی برای تماس و بازی)، VMess، WireGuard و Hysteria2 داری، همه خودمیزبان و در کنترل خودت.\n\n" +
      "✅ <b>دامنه نداری؟ مشکلی نیست.</b> اپ نوا مستقیم به IP سرورت وصل می‌شود. برای آنلاین شدن به دامنه نیازی نداری.\n\n" +
      "<b>چه چیزی لازم داری:</b>\n" +
      "• یک VPS با دسترسی root از طریق SSH (حدود ۵ دلار در ماه)\n" +
      "• اختیاری: یک دامنه (برای گواهی معتبر یا قرار دادن Cloudflare جلوی سرور)\n\n" +
      "<b>دو راه برای اتصال:</b>\n" +
      "• <b>IP مستقیم</b> (ساده‌ترین): اپ نوا مستقیم به IP سرورت وصل می‌شود. بدون دامنه و از همان ابتدا کار می‌کند.\n" +
      "• <b>با دامنه</b>: برای گواهی معتبر یک دامنه اضافه کن، یا Cloudflare را جلوی سرور بگذار تا مقاوم‌ترین مسیر در برابر فیلترینگ را داشته باشی.\n\n" +
      "<b>چطور:</b>\n" +
      "<b>۱.</b> این را روی VPS خود از طریق SSH و با کاربر root اجرا کن:\n" +
      "<code>bash &lt;(curl -fsSL https://raw.githubusercontent.com/IRNova/Nova-Server/main/nova-node.sh)</code>\n" +
      "همه چیز را نصب می‌کند، فایروال را باز می‌کند و آدرس پنل و رمز مدیریت را چاپ می‌کند.\n" +
      "<b>۲.</b> آن آدرس را در مرورگر (یا اپ نوا) باز کن، وارد شو، یک کاربر بساز و لینکش را به اشتراک بگذار یا در اپ نوا وارد کن.\n\n" +
      "اطلاعات ورود سرورت هیچ‌جا فرستاده نمی‌شود، دستور را خودت روی سرور خودت اجرا می‌کنی.",
    deploy_sub_text:
      "🔗 <b>استفاده از اشتراک آماده</b>\n\n" +
      "از قبل یک لینک اشتراک یا کانفیگ داری (از پنل خودت، یک دوست، یا یک ارائه‌دهنده)؟ لازم نیست چیزی بسازی.\n\n" +
      "اپ نوا را نصب کن، لینک اشتراک یا کانفیگت را بچسبان و وصل شو.\n\n" +
      "✅ بدون نیاز به دامنه یا سرور، همه‌کار را خود اپ انجام می‌دهد.",
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
