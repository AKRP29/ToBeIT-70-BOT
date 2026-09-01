# MC Tool Handoff — ToBeIT'70 Discord Bot

> เอกสารส่งต่องานสำหรับ MC Tool รุ่นถัดไป กรุณาอ่านไฟล์นี้ก่อนแก้ระบบ Discord bot

## 1. ระบบนี้คืออะไร

Repository นี้คือ Discord bot ของค่าย **ToBeIT — IT KMITL** และอยู่ในความดูแลของฝ่าย **MC Tool** ซึ่งรับผิดชอบงานฝั่ง Discord ของค่าย

หน้าที่สำคัญที่สุดของ bot คือ **ยืนยันตัวตนน้องค่าย (camper verification)** โดยเชื่อม Discord account ของน้องกับข้อมูลที่มีอยู่ในระบบ ToBeIT จากนั้นให้ role และเปลี่ยน nickname อัตโนมัติ นอกจากนี้ bot ยังทำ welcome banner และมีคำสั่งสำหรับ staff บางส่วน

ถ้าต้องเลือกระหว่าง feature ใหม่กับความเสถียรของ `/verify` ให้รักษา `/verify` ก่อนเสมอ

## 2. ภาพรวมสถาปัตยกรรม

```text
Camper / Staff
      │ Discord slash command
      ▼
Discord Gateway
      │ discord.js Client
      ▼
index.ts
  ├── func/verify.ts ───────┐
  ├── func/force-verify.ts  │ HTTPS + Bearer API key
  ├── func/rules.ts         ├──────────────► ToBeIT API
  ├── func/say.ts           │                camper data
  └── func/welcome.ts       │
          │                 └── api/get-discord.ts
          ▼
   utils/canvas.ts
   welcome image

Production: GitHub Actions → SSH/rsync → Ubuntu VPS → systemd → Bun
```

Bot ตัวหลักไม่ได้ต่อ PostgreSQL โดยตรงใน runtime path ปัจจุบัน การ verify เรียก ToBeIT API ผ่าน HTTP ส่วน `discord-role-assigner.ts` เป็น utility แยกที่มีโค้ดเชื่อมฐานข้อมูลและไม่ได้ถูกเรียกจาก `index.ts`

## 3. Tech stack และ entrypoint

- Runtime: Bun + TypeScript
- Discord library: `discord.js` v14
- Image generation: `canvas` (node-canvas) และ font ใน `assets/`
- API access: built-in `fetch`
- Production entrypoint: `index.ts`
- Development: `bun run dev` → `bun --watch index.ts`
- Production: `bun index.ts` ผ่าน systemd
- Dependency lockfile: `bun.lock`
- ไม่มี build/migration/generated-file step สำหรับ bot หลัก
- ไม่มี HTTP server หรือ port/health endpoint

ไฟล์สำคัญ:

- `index.ts` — สร้าง Discord client, register handlers และ slash commands
- `func/verify.ts` — camper self-verification; critical path
- `func/force-verify.ts` — staff verification for another user
- `api/get-discord.ts` — lookup camper จาก ToBeIT API
- `api/interface.ts` — response shape ที่ bot ใช้
- `func/welcome.ts` — welcome event และ banner
- `utils/canvas.ts` — font/image cache และวาด banner
- `config.ts` — prefix และ config บางส่วน
- `deploy/` — systemd, VPS bootstrap, deployment guide
- `.github/workflows/` — PR CI และ production deployment

## 4. Verification flow (สำคัญที่สุด)

### `/verify`

1. อ่าน Discord user ID จากผู้ใช้คำสั่ง
2. ดึง guild member
3. ตอบแบบ ephemeral และ defer ก่อนทำงาน
4. ถ้ามี camper role อยู่แล้ว ให้แจ้งว่า verify แล้ว
5. เรียก:

   ```text
   GET ${API_URL}/api/discord/get-user?discord_id=<Discord user ID>
   Authorization: Bearer ${API_KEY}
   ```

6. API ต้องส่งข้อมูลอย่างน้อย:

   ```ts
   {
     nickName: string;
     firstName: string;
     grade: string;
     region: string;
   }
   ```

7. เพิ่ม camper role
8. เปลี่ยน nickname เป็น:

   ```text
   น้อง <nickName> <grade> <region>
   ```

9. ย่อชื่อ region บางค่า:
   - `ภาคตะวันออกเฉียงเหนือ` → `ภาคอีสาน`
   - `กรุงเทพและปริมณฑล` → `กรุงเทพ`
10. ส่ง success embed ให้ camper

### `/force-verify`

ทำ flow คล้าย `/verify` แต่ staff เลือกผู้ใช้เป้าหมาย คำสั่งจำกัดด้วย Discord permission `ManageMessages`

### จุดที่ต้องระวัง

- Camper ต้อง link Discord account เดียวกับที่ระบบเว็บบันทึกไว้
- Bot ต้องมีสิทธิ์ `Manage Roles` และ `Manage Nicknames`
- Bot role ต้องอยู่สูงกว่า camper role ใน Discord role hierarchy
- ห้าม log `API_KEY`, `DISCORD_TOKEN` หรือข้อมูลส่วนบุคคลของ camper
- การแก้ API contract, role ID หรือ nickname format กระทบ verification โดยตรง ต้องทดสอบใน test guild ก่อน production
- ปัจจุบัน `getUserByDiscordId` ยังไม่ได้แยก HTTP/network/non-JSON errors อย่างละเอียด การล่มของ API อาจกลายเป็น command error

## 5. Discord configuration ปัจจุบัน

ค่าต่อไปนี้ hard-coded อยู่ใน source และควรตรวจทุก generation ก่อนเปิดค่าย:

- Camper role ID: `1416465814692823220`
- Slash commands ถูก register ใน guild IDs:
  - `1412756673470402634`
  - `1412844099568140410`
  - `1542850423554179183` — ระบุในโค้ดว่า test server
- Prefix command: `!`
- Message command: `!ping`

Enabled slash commands:

- `/verify` — camper self-verification
- `/force-verify user:<member>` — staff verifies another member
- `/rules` — staff posts rules
- `/say` — staff sends an embed into a selected channel

`/fix-names` มี implementation แต่ถูก comment out ใน `index.ts` จึงยังไม่ถูก register

Gateway intents ที่ใช้:

- Guilds
- GuildMembers
- GuildMessages
- MessageContent

ตรวจว่าเปิด **Server Members Intent** และ **Message Content Intent** ใน Discord Developer Portal ตามที่ bot ใช้

## 6. Environment variables และ secrets

Production `.env` อยู่ที่ VPS เท่านั้น:

```text
/opt/tobeit-70-bot/.env
```

ตัวแปรที่ bot หลักใช้:

```dotenv
DISCORD_TOKEN=...
API_URL=...
API_KEY=...
```

ข้อควรระวัง:

- `config.ts` มี `BOT_TOKEN` แต่ runtime login ใน `index.ts` ใช้ `DISCORD_TOKEN`
- ห้าม commit `.env`, token, API key หรือ private SSH key
- หาก rotate Discord token/API key ให้แก้ `.env` บน VPS แล้ว restart service
- GitHub deployment secrets และ VPS setup อธิบายอยู่ใน `deploy/README.md`

## 7. Welcome system

เมื่อมี `guildMemberAdd`, bot เลือก system channel ที่ส่งข้อความได้ หรือ fallback ไป text channel แรกที่ส่งได้ แล้วสร้าง banner จาก:

- `assets/bg.png`
- `assets/JS-Chusri-Normal.ttf`
- Discord avatar ของสมาชิก

`utils/canvas.ts` มี image cache อายุ 30 นาทีและจำกัด 50 entries

หมายเหตุ: `config.ts` ยังอ้าง `assets/sp.png` ซึ่งไม่มีใน repository แต่ welcome flow ปัจจุบันส่ง `./assets/bg.png` เข้า canvas โดยตรง อย่าสรุปว่า `sp.png` ถูกใช้งานจริงโดยไม่ตรวจ call site

## 8. Development และ checks

ติดตั้งและรัน local:

```sh
bun install --frozen-lockfile
bun run dev
```

ก่อนรัน bot จริงต้องมี `.env` สำหรับ environment นั้น และควรใช้ test bot/test guild ไม่ใช้ production token ในเครื่องที่ไม่จำเป็น

สถานะ checks ปัจจุบัน:

- `package.json` ไม่มี working test/lint/typecheck/build script
- `bun run test` เป็น placeholder และ exit 1
- repository-wide `bunx tsc --noEmit` ยัง fail เพราะ `discord-role-assigner.ts` import `csv-parser` ที่ไม่ได้ประกาศใน dependencies
- PR CI จึงตรวจ reproducible install ด้วย `bun install --frozen-lockfile` เท่านั้นในตอนนี้

ควรเพิ่ม tests สำหรับ verification โดย mock Discord interaction และ ToBeIT API ก่อน refactor critical flow

## 9. Production และ deployment

- Push/merge เข้า `main` เท่านั้นจึง deploy
- Public PR รัน CI แต่ไม่เข้าถึง production Environment หรือ VPS secrets
- GitHub-hosted runner rsync source ไป `/opt/tobeit-70-bot`
- `.env`, `uploads/`, `data/`, `.git`, `.github`, และ `node_modules` ไม่ถูก deploy/delete
- VPS รัน `bun install --frozen-lockfile --production`
- systemd service: `tobeit-70-bot.service`
- Linux user: `tobeit70` (non-root)
- systemd restart policy: always, delay 3 seconds

คำสั่ง operation:

```sh
systemctl is-active tobeit-70-bot.service
sudo systemctl status --no-pager tobeit-70-bot.service
journalctl -u tobeit-70-bot.service -n 100 --no-pager
journalctl -u tobeit-70-bot.service -f
```

เพราะ bot ไม่มี HTTP server การตรวจ health คือ systemd active + ทดสอบ `!ping` และ `/verify` ใน test guild

## 10. Checklist ส่งต่องาน MC Tool

### ก่อนเริ่มพัฒนารุ่นใหม่

- [ ] อ่าน `MCTOOL.md`, `README.md`, `AGENTS.md`, และ `deploy/README.md`
- [ ] ยืนยันว่า guild IDs และ camper role ID เป็นของ generation ปัจจุบัน
- [ ] ยืนยัน owner/contact ของ ToBeIT API และ API response contract
- [ ] เตรียม test bot, test guild, test camper account และ test API record
- [ ] ตรวจ Discord Developer Portal intents
- [ ] ตรวจ role hierarchy และ bot permissions
- [ ] Rotate/revoke secrets ของทีมเก่าตามนโยบายค่าย โดยไม่ commit ค่าใหม่

### Checklist `/verify` ก่อนเปิดค่าย

- [ ] Camper ที่ link Discord ถูกต้องใช้ `/verify` สำเร็จ
- [ ] Camper ได้ role ที่ถูกต้อง
- [ ] Nickname เป็น `น้อง <ชื่อเล่น> <ชั้น> <ภาค>` ถูกต้อง
- [ ] Mapping `ภาคอีสาน` และ `กรุงเทพ` ถูกต้อง
- [ ] ผู้ที่ verify แล้วไม่ถูกทำซ้ำ
- [ ] Discord ID ที่ไม่มีในระบบได้รับ error ที่เข้าใจง่าย
- [ ] API timeout/down ไม่ทำให้ process bot ล่ม
- [ ] Bot ที่ role ต่ำเกินไปแจ้ง failure และไม่แสดง success หลอก
- [ ] `/force-verify` ใช้ได้เฉพาะ staff ที่มี permission
- [ ] ไม่มี token/API key/PII หลุดใน Discord reply หรือ logs

### Checklist ระบบ Discord อื่น ๆ

- [ ] `!ping` ตอบกลับ
- [ ] Slash commands register ใน production guild ที่ถูกต้อง
- [ ] `/rules` และ `/say` จำกัด staff permission
- [ ] สมาชิกใหม่ได้รับ welcome message/banner ใน channel ที่ตั้งใจไว้
- [ ] Background และ Thai font แสดงผลถูกต้องบน Ubuntu
- [ ] ตรวจ memory usage หลังสร้าง welcome banner หลายครั้ง

### Checklist ก่อน deploy

- [ ] PR CI ผ่าน
- [ ] ทดสอบ verification ใน test guild
- [ ] ไม่มี `.env`, token, key หรือ camper data ใน diff
- [ ] `bun.lock` update พร้อม `package.json` เมื่อ dependency เปลี่ยน
- [ ] มีแผน rollback/commit ที่รู้ว่าใช้งานได้
- [ ] Merge เข้า `main` เมื่อพร้อม deploy เท่านั้น

### Checklist หลัง deploy

- [ ] GitHub Actions deployment ผ่าน
- [ ] `systemctl is-active tobeit-70-bot.service` แสดง `active`
- [ ] logs แสดง `Bot is online!`
- [ ] `!ping` ผ่าน
- [ ] `/verify` ด้วย test camper ผ่าน end-to-end
- [ ] ตรวจ role, nickname และ ephemeral response
- [ ] ตรวจ welcome banner หนึ่งครั้ง
- [ ] บันทึก incident/ข้อสังเกตและอัปเดตไฟล์นี้

## 11. Known issues / technical debt

- Discord guild/role IDs hard-coded หลายไฟล์ ควรรวมเป็น validated configuration
- API error handling ยังไม่ครอบคลุม timeout, non-2xx และ invalid JSON
- Verification role/nickname update ไม่เป็น transaction; role อาจถูกเพิ่มก่อน nickname fail
- `force-verify.ts` ทำ logic ซ้ำกับ `verify.ts`
- ไม่มี automated tests สำหรับ critical verification flow
- Typecheck ทั้ง repository ยังไม่ผ่านจาก standalone role assigner dependencies
- Slash commands ถูก refresh ทุกครั้งที่ bot startup
- Footer image URL ของ verify embed เป็น external Instagram URL ที่อาจหมดอายุ
- `discord-role-assigner.ts` ดูเป็น one-off admin utility; ต้อง review dependencies, access และ data handling ก่อนใช้

เมื่อแก้รายการเหล่านี้ ให้อัปเดตทั้ง code, checklist และเอกสารนี้ เพื่อให้รุ่นถัดไปไม่ต้องเดาสถานะระบบใหม่
