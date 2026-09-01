# Production VPS setup

The production service uses the non-root `tobeit70` account and
`/opt/tobeit-70-bot`. GitHub Actions copies files over SSH; the VPS does not
need GitHub credentials or a Git checkout.

## Bootstrap Ubuntu

Copy this repository's `deploy/` directory to the VPS temporarily, inspect the
script, then run from the repository root:

```sh
sudo bash deploy/vps-setup.sh
```

The script creates the account and directory, installs Bun and the native
packages needed by `canvas`, installs the unit, and enables it for boot. It does
not alter the firewall or SSH daemon, and it does not start the app before code
and environment values exist.

Add the dedicated deployment **public** key (never its private key) to:

```text
/home/tobeit70/.ssh/authorized_keys
```

The `.ssh` directory should be owned by `tobeit70:tobeit70` with mode `0700`;
`authorized_keys` should be owned by that user with mode `0600`. Populate
`/opt/tobeit-70-bot/.env` as that user and keep it mode `0600`. The bot currently
uses at least:

```dotenv
DISCORD_TOKEN=...
API_URL=...
API_KEY=...
```

Confirm the systemctl path before installing sudoers:

```sh
which systemctl
```

On Ubuntu it is expected to be `/usr/bin/systemctl`. The exact narrow sudoers
rule installed by the script is:

```sudoers
tobeit70 ALL=(root) NOPASSWD: /usr/bin/systemctl restart tobeit-70-bot.service, /usr/bin/systemctl status --no-pager tobeit-70-bot.service
```

This permits unattended restart and status for this exact service only; it does
not grant `NOPASSWD: ALL`. Edit only with
`sudo visudo -f /etc/sudoers.d/tobeit70-tobeit-70-bot`, then validate with
`sudo visudo -cf /etc/sudoers.d/tobeit70-tobeit-70-bot`. Sudo ignores files in
`/etc/sudoers.d` whose names contain a dot, so do not add a `.service` suffix.

## Pin the SSH host key in GitHub

From a trusted machine/network, obtain the VPS host key and compare its
fingerprint with the VPS console/provider fingerprint. For port 22:

```sh
ssh-keyscan -H your-vps-hostname
```

For a custom port:

```sh
ssh-keyscan -p 2222 -H your-vps-hostname
```

After independently verifying it, store the complete output as the
`VPS_KNOWN_HOSTS` variable on the GitHub `production` Environment. The workflow
requires and uses this pinned value with strict host verification; it never uses
`StrictHostKeyChecking=no`.

## Operations

After the first deployment:

```sh
sudo systemctl enable --now tobeit-70-bot.service
systemctl is-active tobeit-70-bot.service
sudo systemctl status --no-pager tobeit-70-bot.service
journalctl -u tobeit-70-bot.service -n 100 --no-pager
journalctl -u tobeit-70-bot.service -f
```

There is no HTTP server or health endpoint. Deployment therefore fails unless
systemd reports the bot active. Discord's `!ping` command is the application-level
smoke test.

To roll back, check out the desired commit on a trusted machine, rsync it with
the same exclusions used by the workflow, then run:

```sh
cd /opt/tobeit-70-bot
/home/tobeit70/.bun/bin/bun install --frozen-lockfile --production
sudo systemctl restart tobeit-70-bot.service
systemctl is-active tobeit-70-bot.service
```

Alternatively, GitHub's Actions UI can re-run a previous deploy job only after
the desired source commit is restored/reverted on `main`; a job re-run always
uses the original workflow commit.
