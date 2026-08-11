# nova-install-bot

The Worker behind **@IRNovaProxy_Bot**: support, FAQ, the deploy hub, and
building a Nova panel on a user's own Cloudflare account. Serves the admin panel
at `/admin` and the Telegram webhook at `/webhook`.

## Which account, and how to run wrangler

This Worker is on the **main** account, `Vahiddhashemii@gmail.com`, account id
`22dc56eb53bedd54deac8e8f23ff61cf`. Credentials live in
`~/.config/cf-personal.env`, not in this repo:

```bash
set -a && . ~/.config/cf-personal.env && set +a && npx wrangler deploy
```

`wrangler` reads `.env` from the project directory automatically and that file
**beats** the global login, so a stale `.env` silently aims every command at the
wrong account. If a command fails with `Authentication error [code: 10000]`,
read the account id in the error: anything other than `22dc56eb…` means `.env`
is being picked up and is wrong.

`wrangler deploy` also ends with an error on the `/zones/.../workers/routes`
call, because this token has no Zone-level Workers Routes permission. That is
**after** a successful upload and the route already exists in the dashboard, so
the deploy has landed. Check `wrangler deployments list` rather than the exit
code.

## The two bots, and which is which

| Bot | Repo | Runs on | Does |
|---|---|---|---|
| **@IRNovaProxy_Bot** | this one | Cloudflare Worker | Support, FAQ, Cloudflare panel builds |
| **@NovaServerInstaller_Bot** | `nova-installer-bot` | Node on the panel VPS | Installs Nova Server on a VPS over SSH |

They are separate because installing on a VPS needs SSH, which a Worker cannot
do. The menu links to the installer bot and says so, and each bot's BotFather
description should name the other. Confusing the two has already cost one
wrongly-revoked token.

## Secrets

`BOT_TOKEN`, `WEBHOOK_SECRET`, `ADMIN_PASSWORD`, `INSTALLATION_SIGNING_SECRET`,
set with `wrangler secret put`. Never in `.env`, never in `wrangler.jsonc`.

**Rotating `BOT_TOKEN` is two steps.** Revoking a token makes Telegram drop the
webhook, so setting the secret alone leaves the bot receiving nothing:

```bash
set -a && . ~/.config/cf-personal.env && set +a && npx wrangler secret put BOT_TOKEN
curl -s -X POST https://bot.novaproxy.online/setup/register-webhook \
  -H "X-Setup-Key: $(cat .webhook_secret)"
```

Expect `{"ok":true,"result":true,"description":"Webhook was set"}`. That reply
comes from Telegram, so it also proves the new token authenticates.
`/setup/register-webhook` can only ever point the webhook at this Worker's own
`/webhook`, and it does not drop pending updates.

## Button icons

The menu uses Nova's own emoji via `icon_custom_emoji_id`, from
`t.me/addemoji/NovaProxy`. Telegram allows exactly three button colours
(`danger`, `success`, `primary`), so custom emoji are the only way to put the
brand on a keyboard.

They render only while the bot owner holds Telegram Premium. Without it Telegram
ignores the field, so every label keeps a normal emoji prefix and the menu
degrades cleanly rather than showing blank buttons.

Re-read the ids after rebuilding the pack with `/emojiid NovaProxy` (admin only;
it calls `getStickerSet` and lists every id in pack order). The sources for the
glyphs are in `../nova-brand-emoji`.

## Admin

`/admin`, password in `ADMIN_PASSWORD`, optional 2FA. The admin allowlist for
bot-side admin commands is the `panel_admin_ids` config row in D1.
