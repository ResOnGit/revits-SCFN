I want to build a very small personal finance tracker called SCFN (Shortcuts Finance). 

We are building only the frontend dashboard using React and Vite. 
I have already set up a Supabase database and my Apple Shortcut is successfully inserting data into it. I am perfectly fine tightly coupling this frontend to Supabase using the `supabase-js` client.

PROJECT RULES & CONTEXT:
1. Do not overengineer. This is an intentionally tiny personal project.
2. We have exactly ONE table in Supabase called `transactions`.
3. Fields in the database: `id` (int8), `amount` (numeric), `type` (text), `comment` (text), `date` (timestamptz).
4. The dashboard is strictly ONE static page. No router needed. No complex navigation.
5. IMPORTANT: The database stores the `date` in UTC. I am in Malaysia (UTC+8). Please ensure that when you calculate "Current Month" totals, and when you display dates, you adjust for the local timezone.

TASKS FOR THIS PROMPT:
1. Please provide the terminal commands to initialize a new Vite + React project and install `@supabase/supabase-js`, `tailwindcss`, and `lucide-react` (for simple icons).
2. Write a `supabaseClient.js` (or `.ts`) file that initializes the connection using environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
3. Write the code for `App.jsx`. It should:
   - Fetch all transactions from Supabase on load, ordered by `date` descending.
   - Calculate and display: Total spent in the current month.
   - Calculate and display: A breakdown of spending by `type` for the current month.
   - Display: A simple, clean list of the most recent transactions (formatting the date nicely, e.g., "28 Sep", alongside the amount, type, and comment).
4. Style it cleanly, minimally, and modernly using Tailwind CSS. Use a simple card-based or clean list layout.

Please give me the setup terminal commands first, and then the code for `supabaseClient.js` and `App.jsx`.