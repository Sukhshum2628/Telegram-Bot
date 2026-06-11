# Machail Mata Yatra Telegram Bot

A scalable, multilingual (English/Hindi) Telegram bot providing official yatra information.

## 🚀 Setup Instructions

1. **Clone/Download** the repository.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configuration**:
   - Copy `.env.example` to `.env`.
   - Add your `TELEGRAM_BOT_TOKEN` (get from @BotFather).
   - Add your `MONGO_URI`.
   - Add your Telegram ID to `ADMIN_IDS` for admin access.
   - (Optional) Add `OPENWEATHER_API_KEY`.

### 📊 Google Sheets Data Management

To manage data via Google Sheets, create a spreadsheet with 5 tabs and select "Publish to Web" as CSV for each. Add these URLs to your `.env`:

1.  **Hotels/ Roomstays** (`SHEET_URL_HOTELS`):
    *   Headers: `name`, `priceRange`, `contact`, `distance`, `mapsLink`, `photo`, `tier`, `tierRank`, `lat`, `lng`, `active`
2.  **Prasad and Flower Vendors** (`SHEET_URL_VENDORS`):
    *   Headers: `name`, `items`, `contact`, `locationLink`, `priceInfo`, `isActive`
3.  **Taxis** (`SHEET_URL_TAXIS`):
    *   Headers: `driverName`, `vehicleNumber`, `vehicleType`, `contact`, `route`, `priceInfo`, `isActive`
4.  **Tents** (`SHEET_URL_TENTS`):
    *   Headers: `name`, `location`, `priceRange`, `contact`, `capacity`, `isActive`
5.  **Emergency Contacts** (`SHEET_URL_EMERGENCY`):
    *   Headers: `title`, `number`, `icon`, `order`
6.  **Private Parking** (`SHEET_URL_PARKING`):
    *   Headers: `name`, `location`, `contact`, `capacity`, `priceInfo`, `isActive`

Run `/sync` from the bot as an admin to pull the data.

4. **Run the Bot**:
   ```bash
   # Seed sample data (Hotels/Vendors)
   node seed.js

   # Start the bot
   npm start
   ```

## 🛠 Features

- **Multilingual**: Toggle between English and Hindi.
- **Google Sheets Sync**: Manage hotels, vendors, and taxis directly from a spreadsheet.
- **Admin Commands**:
  - `/stats`: View bot usage stats.
  - `/sync`: Manually trigger data sync from Google Sheets.
  - `/broadcast <msg>`: Send messages to all users.
- **Information**: Routes, Weather, Temple Location, Emergency Contacts, Taxi Services.

## 📦 Deployment (VPS)

1. Ensure Node.js and MongoDB are installed.
2. Use `pm2` for process management:
   ```bash
   npm install -g pm2
   pm2 start src/app.js --name machail-bot
   ```

## 📈 Scalability

The bot uses `p-queue` for broadcasts, ensuring it adheres to Telegram's 30 msg/sec limit. This allows it to safely message 100K+ users without being banned or rate-limited.
