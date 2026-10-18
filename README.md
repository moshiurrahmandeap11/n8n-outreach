# B2B Lead Gen & Cold Outreach AI System (n8n + VPS CI/CD)

An automated, production-grade 2-agent B2B lead generation, research, copywriting, and cold email outreach engine built with **n8n**, **Apollo.io API**, **Google Gemini 2.5 Flash**, **Google Sheets CRM**, and **Gmail Dispatcher**, running live on Ubuntu VPS with automated GitHub Actions CI/CD.

---

## 🏛️ System Architecture

The system consists of three interconnected branches:

### 1. 🔍 Agent 1: Lead Hunter & Researcher (Apollo.io + Gemini Key 1)
- Searches registered companies live via **Apollo.io API** (`/v1/mixed_companies/search`).
- Scrapes real company emails (`hello@`, `contact@`, etc.) directly from verified domains.
- Gemini AI diagnoses real technical bottlenecks (e.g., Next.js migration needs, Stripe checkout conversion leaks, n8n AI workflow bottlenecks).
- Appends verified leads into Google Sheets **`Leads`** tab with `Status = 'New'`.

### 2. ✍️ Agent 2: Cold Email Drafter (Gemini Key 2)
- Reads leads where `Status = 'New'`.
- Generates 2 hyper-personalized emails per lead:
  - **First Cold Email** (under 100 words, value-first, no sales pitch).
  - **Follow-up Email** (4-day follow-up bump).
- Adheres to clean studio guidelines (clean double line breaks, executive signature block, zero generic boilerplate).
- Appends drafts to **`Email Drafts`** tab with `Approved? = 'No'` and updates lead status to `Draft Created`.

### 3. 🛡️ Human-in-The-Loop Safe Dispatcher & Tracker
- Runs on a 15-minute schedule trigger.
- Reads **`Email Drafts`** where `Approved? = 'Yes'` and `Sent Date` is empty.
- Sends cold email safely via **Gmail OAuth2** with plain text and zero n8n watermarks.
- Automatically stamps today's date in `Sent Date` to eliminate duplicate sends.
- Updates **`Leads`** tab with `Status = 'Email Sent'`, `Last Contacted = Today`, and `Next Action = 'Follow-up in 4 days'`.

---

## 📂 Repository Structure

```
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automated CI/CD pipeline for VPS
├── scripts/
│   └── deploy.js               # Zero-dependency workflow updater & PM2 reloader
├── B2B_Outreach_AI_Agents.json # Production n8n workflow definition
├── .gitignore                  # Git ignore rules
├── package.json                # Project manifest
└── README.md                   # Documentation
```

---

## 📊 Google Sheets CRM Schema

### Tab 1: `Leads`
- `Company Name`
- `Website`
- `Email`
- `Industry`
- `Tech Bottleneck`
- `Status` (`New`, `Draft Created`, `Email Sent`, `Replied`)
- `Last Contacted`
- `Next Action`

### Tab 2: `Email Drafts`
- `Lead Email`
- `Subject`
- `Body`
- `Type` (`First`, `Follow-up`)
- `Approved?` (`Yes` / `No`)
- `Sent Date` (`YYYY-MM-DD` when dispatched)

---



## 👨‍💻 Author & Studio
**Moshiur Rahman**  
*Software Engineer & Studio Lead*  
[Labto AI](https://labtoai.com)
