# ToBeIT'70 Bot Larp

Discord bot ค่าย ToBeIT'70 — ยืนยันตัวตน, ต้อนรับสมาชิก, เครื่องมือสตาฟ

## Commands

- `/verify` — ยืนยันตัวตน (รับยศ + ตั้งชื่อเล่นอัตโนมัติ)
- `/verify-panel` — โพสต์ปุ่มยืนยันตัวตน (สตาฟ)
- `/force-verify` — สตาฟยืนยันแทนสมาชิก
- `/fix-names` — แก้ชื่อเล่นที่ผิด (สตาฟ, ปิดใช้อยู่)
- `/rules` — โพสต์ระเบียบ
- `/say` — ส่ง embed เข้าช่อง
- `!ping` — เช็คออนไลน์

Welcome banner สร้างอัตโนมัติตอนสมาชิกใหม่เข้า

## Stack

Bun · TypeScript · discord.js v14 · canvas · PostgreSQL + Drizzle

## Setup

คัดลอก `.env.example` เป็น `.env` แล้วเติมค่า:

```
DISCORD_TOKEN=      # bot token
API_URL=            # backend ที่มี /api/discord/get-user
API_KEY=
GUILD_IDS=          # server IDs ที่จะลง slash command
VERIFIED_ROLE_ID=   # role ที่ให้เมื่อ verify ผ่าน
MOCK_VERIFY=false   # true = mock ข้อมูล verify ตอนทดสอบ (ไม่เรียก API)
```

## Run (dev)

```bash
bun install
bun run dev
```

## Notes

- `.env` ไม่ push (gitignored)
- สลับ test/prod แก้แค่ `.env` ไม่ต้องแตะโค้ด
- Discord Developer Portal ต้องเปิด **Server Members** + **Message Content** intent
- Bot ต้องมีสิทธิ์ Manage Roles + Manage Nicknames และ role อยู่เหนือยศที่จะให้