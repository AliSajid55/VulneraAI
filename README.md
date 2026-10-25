# PolyGuard: AI-Powered Code Vulnerability Scanner

PolyGuard classifies a code snippet as **safe** or **vulnerable** using a fine-tuned **GraphCodeBERT** model, then asks **Google Gemini** to explain the result in plain language with suggested fixes. Users sign up, scan code, and keep a searchable history of every scan in a dashboard.

- **Backend:** Flask (Python), PyTorch, Hugging Face Transformers, SQLAlchemy
- **Database:** PostgreSQL
- **Auth:** Email + password (hashed with Werkzeug), JWT tokens
- **Frontend:** React + TypeScript (Vite, Tailwind CSS, React Router)
- **Model:** GraphCodeBERT (RoBERTa architecture) fine-tuned for binary classification (`safe` / `vulnerable`)
- **Explanations:** Google Gemini API (optional; the scanner works without it)

---

## Features

- **Sign up / log in** with email and password. Each user only sees their own scans.
- **Dashboard:** total, vulnerable and safe scan counts, average confidence, a 14-day activity chart, a safe-vs-vulnerable donut, a per-language breakdown, and recent scans.
- **New scan:** paste code, choose the language, optionally name the scan. You get the verdict, the confidence score and the AI explanation, and the scan is saved automatically.
- **History:** search by name or code, filter by result and language, sort, paginate, open or delete a scan.
- **Scan detail:** the full result, the AI explanation and the submitted code.
- **Export:** download one scan as a **PDF report**, or the filtered history as **CSV**.
- **Settings:** update name and email, change password, delete the account and all its scans.

---

## How a scan works

1. The frontend sends the code to `POST /api/scan` with the user's token.
2. The backend **normalizes whitespace** (line endings, trailing spaces, leading/trailing blank lines), so the same code always gets the same score however it was pasted.
3. GraphCodeBERT scores the snippet. Code longer than 512 tokens is split into overlapping chunks (stride 128), and the chunk probabilities are averaged.
4. If the vulnerable probability is **≥ 0.5**, the snippet is labeled **vulnerable**; otherwise it is labeled **safe**.
5. Gemini writes an explanation (summary, potential concerns, suggested remediation, limitations). Gemini only **explains** the result; it does not change the prediction.
6. The scan and its explanation are saved to PostgreSQL.

> The prediction applies to the **whole snippet**. The scanner does not point to specific vulnerable lines.

---

## Project structure

```
├── server.py                    # Flask app: model inference, Gemini, scan/history/stats routes
├── auth.py                      # Signup, login, profile, password (JWT)
├── database.py                  # PostgreSQL connection + User and Scan tables
├── model/                       # Fine-tuned GraphCodeBERT (weights stored with Git LFS)
├── test.py                      # Evaluates the model on the test cases (via /api/predict)
├── vulnerability_test_cases.py  # 16 labeled Python examples (8 safe, 8 vulnerable)
├── .env.example                 # Template for your .env file
├── requirements.txt
├── package.json
└── src/
    ├── main.tsx                 # Routes and protected pages
    ├── context/AuthContext.tsx  # Logged-in user and token
    ├── lib/                     # API client, formatting, PDF report
    ├── components/              # Layout, UI kit, charts, scan result view
    └── pages/                   # Login/Signup, Dashboard, Scan, History, Scan detail, Settings
```

---

## Requirements

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Git **and Git LFS** (the model file is ~500 MB and stored with LFS)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) (optional, needed only for AI explanations)

---

## Setup

### 1. Clone the repository with the model

```bash
git lfs install
git clone https://github.com/yasmeenmh90-beep/AI-Powered-Multi-Language-Code-Vulnerability-Scanner.git
cd AI-Powered-Multi-Language-Code-Vulnerability-Scanner
git lfs pull
```

Check that the model downloaded correctly. `model/model.safetensors` should be about **476 MB**, not 134 bytes:

```bash
ls -lh model/model.safetensors
```

> On macOS, install Git LFS with `brew install git-lfs` if `git lfs` is not found.

### 2. PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
createdb polyguard
```

**Windows / Linux:** install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/), then create a database called `polyguard` (for example `createdb -U postgres polyguard`).

The tables (`users`, `scans`) are created automatically the first time the server starts.

### 3. Backend

```bash
python3 -m venv venv
source venv/bin/activate          # Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:

```env
# Homebrew on macOS usually uses your Mac username with no password:
DATABASE_URL=postgresql://YOUR_MAC_USERNAME@localhost:5432/polyguard
# With a "postgres" user and password:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/polyguard

JWT_SECRET_KEY=paste-a-long-random-string-here
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
```

Generate a secret key with:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

`.env` is in `.gitignore`. **Never commit your API key or secret key.**

### 4. Frontend

```bash
npm install
```

---

## Using your own trained model (v3)

The backend can load any fine-tuned GraphCodeBERT folder saved with `save_pretrained()`, such as `outputs/graphcodebert_vuln_v3/best_model` from `GraphCodeBERT_Vuln_v3_PairAware.ipynb`.

1. Copy the whole `best_model` folder into the project as `model_v3/`. It must contain `config.json`, `model.safetensors`, the tokenizer files and **`best_info.json`**.
2. Add to `.env`:
   ```env
   MODEL_DIR=model_v3
   ```
3. Restart `python server.py`. The startup log shows the rule in use, for example `Scoring rule: max @ 0.902 | from best_info.json (epoch 4)`.

How the backend scores code with a v3 model, matching the notebook's evaluation:

- Code is split into 512-token chunks with stride 128, and only the **first 8 chunks** are scored.
- The chunk scores are combined with the rule's aggregation (`max`, `top2` or `mean`) from `best_info.json`.
- The decision uses the threshold tuned on validation. Length-aware thresholds per chunk-count bucket (1 / 2–3 / 4+) are also supported.
- Without `best_info.json` (for example the original `model/` folder), the backend falls back to `mean` with threshold 0.5.

**Confidence** in the UI is the distance from the threshold, scaled from 50% (exactly at the threshold) to 100% (a score of 0.0 or 1.0). With a 0.9 threshold, a score of 0.85 is "safe" but only just, so it shows about 53%, not 15%. The raw vulnerable probability and the threshold are shown in the result meter and the PDF.

Each saved scan stores the threshold and the model folder name, so scans made with different models stay correct in the history.

---

## Running the app

Open **two terminals** in the project folder.

**Terminal 1: backend**
```bash
source venv/bin/activate
python server.py
```
Wait for `GraphCodeBERT loaded successfully.` The API runs at `http://127.0.0.1:5000`.

**Terminal 2: frontend**
```bash
npm run dev
```
Open **http://localhost:3000**, create an account, and start scanning.

---

## API

All endpoints except `/api/health`, `/api/predict`, `/api/auth/signup` and `/api/auth/login` need the header `Authorization: Bearer <token>`.

**Auth**

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | `{ name, email, password }` → `{ token, user }` |
| `POST` | `/api/auth/login` | `{ email, password }` → `{ token, user }` |
| `GET` | `/api/auth/me` | Current user |
| `PATCH` | `/api/auth/me` | Update `{ name, email }` |
| `POST` | `/api/auth/change-password` | `{ current_password, new_password }` |
| `DELETE` | `/api/auth/me` | `{ password }`: deletes the account and all its scans |

**Scans**

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/scan` | `{ code, language, title? }`: scans and saves; returns the full scan |
| `GET` | `/api/scans` | List with `q`, `prediction`, `language`, `sort` (`newest`/`oldest`/`confidence`), `page`, `page_size` |
| `GET` | `/api/scans/<id>` | One scan (code + AI explanation) |
| `DELETE` | `/api/scans/<id>` | Delete a scan |
| `GET` | `/api/scans/export.csv` | CSV of the scans matching the same filters |
| `GET` | `/api/stats` | Dashboard numbers, daily activity, per-language counts, recent scans |

**Public**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Model folder, scoring rule, device, labels, Gemini configuration |
| `POST` | `/api/predict` | `{ code }`: model prediction only (no login, no Gemini, not saved). Returns `prediction`, `vulnerable_probability`, `threshold`, `confidence`, `chunk_count` |

The `language` field is passed to Gemini for context only. The GraphCodeBERT prediction does not use it.

---

## Testing the model

With the backend running:

```bash
python test.py
```

This sends the 16 examples in `vulnerability_test_cases.py` to `/api/predict`, prints each prediction, and saves the results to `server_test_results.csv`.

**Result with the original `model/` folder: 10/16 correct (62.5%).** Run it again after switching `MODEL_DIR` to compare models.

| | Correct |
|---|---|
| Safe examples | 4 / 8 |
| Vulnerable examples | 6 / 8 |

Examples the model gets right include SQL injection, command injection and parameterized SQL. It misses `eval()` and `pickle.loads()`, and labels some simple safe code (f-strings, list sorting, dictionary lookup) as vulnerable.

> This is a small exploratory test set, not a benchmark.

---

## Known limitations

- **Whole-snippet classification only.** The model does not identify the vulnerable line or the vulnerability type.
- **Accuracy is limited.** See the test results above. More balanced training data is needed, especially for Python.
- **No email verification or "forgot password".** Accounts are created immediately.
- **No database migrations.** Tables are created with `create_all()` on startup. If you change the models later, drop the tables or add a migration tool such as Alembic.
- **Login tokens are stored in the browser's `localStorage`.** This is fine for a local project; production apps often use HTTP-only cookies instead.
- **Gemini availability.** Some Gemini models can be slow or overloaded (503/504 errors). If Gemini fails or times out, the scan still returns and saves the model prediction and shows "explanation unavailable". `gemini-3.5-flash-lite` usually answers in 1–2 seconds.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `git: 'lfs' is not a git command` | Install Git LFS (`brew install git-lfs`), then `git lfs install && git lfs pull` |
| Server fails to load the model | `model/model.safetensors` is only a 134-byte LFS pointer. Run `git lfs pull` |
| `connection refused` / `could not connect to server` on startup | PostgreSQL is not running. On macOS: `brew services start postgresql@16` |
| `database "polyguard" does not exist` | Run `createdb polyguard` |
| `role "postgres" does not exist` | Use your Mac username in `DATABASE_URL` (see Setup step 3) |
| Logged out after every server restart | Set `JWT_SECRET_KEY` in `.env` |
| `ModuleNotFoundError` (torch, flask, sqlalchemy, ...) | Activate the venv and run `pip install -r requirements.txt` |
| AI explanation unavailable | Check the backend terminal for the Gemini error. Check `GEMINI_API_KEY` and `GEMINI_MODEL` in `.env` |
| `503 UNAVAILABLE` / `504 DEADLINE_EXCEEDED` | Gemini is overloaded. Try again later or use a `flash-lite` model |
| Frontend says it cannot reach the server | Make sure the backend is running on port 5000 |
