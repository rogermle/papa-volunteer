# FAQ knowledge base

Place your FAQ PDF here as **`faq.pdf`**, then run the ingest script to populate the chat knowledge base.

In `.env.local` set `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. Then run:

```bash
node scripts/ingest-faq.mjs
```
