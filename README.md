# Crypto Paper Trading Bot

A fake-money crypto trading simulator. A rule-based bot polls public market
data (Binance, with CoinGecko as a fallback), computes technical indicators,
and executes simulated BUY/SELL trades against a JSON-file "wallet" — no real
money, no database, no AI.

## Project structure

```
project/
  backend/          Express + TypeScript API and trading bot
    src/
      server.ts             App entry point, route wiring, optional static frontend serving
      routes/                Express routers (portfolio, trades, market, settings, bot)
      services/
        marketService.ts     Binance/CoinGecko market data, with in-memory caching
        botService.ts         Bot loop, buy()/sell()/calculateProfit(), portfolio/settings/trades persistence
        fileStorage.ts        Generic readJsonFile()/writeJsonFile() helpers
      trading/
        indicators.ts         RSI, EMA50/200, MACD, volume change
        tradingEngine.ts       Pluggable BUY/SELL/HOLD strategy rules
      data/                  JSON "database": portfolio.json, trades.json, settings.json
    ecosystem.config.js     PM2 process definition for production
  frontend/         React + TypeScript + Vite + Tailwind + Recharts dashboard
    src/
      pages/                 Dashboard, TradeHistory, StrategySettings
      components/            Reusable chart/table/UI pieces
      api/client.ts          Typed fetch wrappers for the backend API
      hooks/usePolling.ts    Shared polling-fetch hook
      utils/                 Formatting + pure calculation helpers (equity curve, win rate, etc.)
  deploy/           DigitalOcean Droplet deployment helpers (Nginx config, deploy script)
```

## Local development

Backend:

```bash
cd backend
cp .env.example .env
npm install
npm run dev      # ts-node + nodemon on http://localhost:4000
```

Frontend (separate terminal):

```bash
cd frontend
npm install
npm run dev      # Vite dev server on http://localhost:5173, proxies /api -> :4000
```

Open http://localhost:5173. The bot auto-starts on backend boot (every 5
minutes by default); set `BOT_AUTOSTART=false` in `backend/.env` to disable
that and start it manually from the Dashboard instead.

## Environment variables

Backend (`backend/.env`, see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | HTTP port the API (and optionally the built frontend) listens on |
| `COINGECKO_API_KEY` | _(none)_ | Optional Demo API key, used only when the CoinGecko fallback is hit |
| `BOT_INTERVAL_MINUTES` | `5` | How often the bot loop runs |
| `BOT_AUTOSTART` | `true` | Set to `false` to require a manual `/api/bot/start` call |
| `CORS_ORIGIN` | _(allow all)_ | Comma-separated list of allowed frontend origins |

Frontend (`frontend/.env`, see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `/api` | Backend base URL. Leave as-is in dev (Vite proxy) and when the backend serves the built frontend itself; set to an absolute URL only if the frontend is hosted separately from the API |

## API reference

| Method | Path | Description |
|---|---|---|
| GET | `/api/portfolio` | Current fake wallet (cash, holdings, total profit) |
| POST | `/api/portfolio/reset` | Reset the wallet to `settings.startingMoney`, clearing positions |
| GET | `/api/trades` | Full trade history |
| GET | `/api/market/:symbol` | Price, candles, and indicators for `BTC`/`ETH`/`SOL` |
| GET | `/api/settings` | Current strategy settings |
| POST | `/api/settings` | Update strategy settings (partial body merged with current) |
| GET | `/api/bot/status` | Whether the bot loop is running, and next/last run time |
| POST | `/api/bot/start` | Start the bot loop (optional `{ intervalMinutes }` body) |
| POST | `/api/bot/stop` | Stop the bot loop |

## How the trading engine decides

On every tick (`backend/src/services/botService.ts`), for each watched symbol:

1. Fetch ~300 hourly candles and compute indicators (`trading/indicators.ts`).
2. Run every registered strategy in `trading/tradingEngine.ts` in order — SELL
   rules first (take-profit / stop-loss / RSI-overbought) against any open
   position, then BUY rules (RSI oversold + bullish EMA trend + rising
   volume) if there's no open position. The first strategy to fire wins;
   `HOLD` if none do.
3. Execute the simulated trade (`buy()`/`sell()`), updating
   `data/portfolio.json` and appending to `data/trades.json`.

New strategies can be added without touching the engine's core loop via
`addBuyStrategy()` / `addSellStrategy()` in `tradingEngine.ts`.

## Deploying to DigitalOcean

Because storage is plain JSON files (no database), this app needs a
**persistent filesystem across restarts** — that rules out DigitalOcean App
Platform's web service component, whose disk is ephemeral and wiped on every
deploy/restart. **Use a Droplet** instead; a $6/mo basic Droplet is plenty.

The backend can also serve the built frontend itself (see the static-file
block in `server.ts`), so production is a single Node process on one port.

1. **Create a Droplet** (Ubuntu 22.04/24.04 LTS, basic plan, a region close to
   your users). Add your SSH key during creation.

2. **Install Node.js and PM2** on the Droplet:

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs nginx
   sudo npm install -g pm2
   ```

3. **Get the code onto the Droplet** (clone your repo, or `scp` the project
   directory), then build both halves:

   ```bash
   cd /path/to/project/backend && npm install && npm run build
   cp .env.example .env   # edit PORT/CORS_ORIGIN/etc as needed
   cd ../frontend && npm install && npm run build
   ```

   `frontend/dist` is now picked up automatically by the backend's static
   file serving.

4. **Start the backend under PM2**:

   ```bash
   cd ../backend
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup   # follow the printed instructions to survive reboots
   ```

   The app is now live on `http://<droplet-ip>:4000`.

5. **(Recommended) Put Nginx in front** for port 80/443 and a real domain —
   see `deploy/nginx.conf.example`. Copy it into
   `/etc/nginx/sites-available/`, symlink into `sites-enabled`, reload Nginx,
   then run `certbot --nginx -d your-domain.com` for free TLS.

6. **Future updates**: `git pull` (or re-upload), then run
   `deploy/deploy.sh` from the project root — it reinstalls, rebuilds both
   apps, and hot-reloads the PM2 process without dropping the existing
   `backend/src/data/*.json` files.

### Firewall

Open only what you need:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # 80 + 443, once Nginx is in front
sudo ufw enable
```

If you're not using Nginx, open port 4000 (or whatever `PORT` is set to)
instead.
