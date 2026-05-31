# ⚠️ URGENT SECURITY NOTICE

The `.env.local` file contained real credentials. Since this file was shared in the ZIP:

## Immediate actions required:

1. **MongoDB** — Change your MongoDB Atlas password immediately:
   - Go to Atlas → Database Access → Edit user `wasiqzahoor1234_db_user`
   - Set a new strong password

2. **Cloudinary** — Rotate your API keys:
   - Go to Cloudinary Console → Settings → Security → Generate new keys

3. **Gmail** — Revoke the app password:
   - Google Account → Security → App passwords → Remove `nts-management`
   - Generate a new app password for this project only

4. **NEXTAUTH_SECRET** — Change from `nts-secret-key` to a strong random value:
   - Run: `openssl rand -base64 32`
   - Update in your `.env.local`

## Going forward:
- **Never** commit `.env.local` to Git or share it in ZIP files
- Copy `.env.example` and fill in your values as `.env.local`
- `.env.local` is already in `.gitignore`
