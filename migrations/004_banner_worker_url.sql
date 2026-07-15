-- Applied 2026-07-14. Point the welcome banner at the Worker-hosted image
-- (correct Nova logo) instead of the site's og.png (wrong/AI logo).
UPDATE config SET value = 'https://nova-install-bot.bitter-flower-1b15.workers.dev/banner.jpg'
WHERE key = 'welcome_image';
