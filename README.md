# little by little

A quiet, art-directed study journal for computer science ideas and practice problems. Cloud sync uses Supabase Free; the site itself remains static and has no build step.

## Run it locally

Open `index.html`, or start a small local web server in this folder:

```sh
python -m http.server 4173
```

Then visit `http://localhost:4173`.

## Journals and pages

- A journal is a subject notebook. Create one for a subject such as Algorithms, Operating Systems, or Databases; rename or delete it from the journal switcher. A library always keeps at least one journal.
- Each journal contains individual pages. Choose **Concept / Topic** for explanations, when-to-use notes, complexity, examples, and illustrations. Choose **Practice Problem** for question statements, input/output, constraints, code, sticking points, and your own explanation.
- The editor accepts Markdown as plain text and includes quick formatting controls for headings, emphasis, lists, quotes, and code. Saved page notes render Markdown safely, including fenced code blocks and web links. LaTeX renders in saved notes and compact list previews with `$...$` inline, `$$...$$` for display equations, and `\(...\)` / `\[...\]` delimiters. KaTeX is bundled locally, so math typesetting also works offline.
- Open a page to edit or delete it. Add captions to uploaded illustrations. With cloud sync connected, page text is stored in a private per-user Postgres row and illustrations in a private Supabase Storage bucket. Without Supabase configuration, the app continues in device-only mode.
- The library displays at most 12 pages at a time and adds page navigation as it grows. Search, filters, activity counts, and the random surprise page are scoped to the selected journal.
- Quotes rotate every 12 seconds while the app is open. The ↻ control advances immediately.

## Backups and privacy

Use the backup button to export journals, pages, and images together as a JSON file. Restore that file in another browser to transfer your library. Keep a backup somewhere safe.

For cloud sync, create a Supabase Free project and follow [SUPABASE_SETUP.md](./SUPABASE_SETUP.md). The setup creates private tables and storage policies; users sign in with email and password. Existing device data is uploaded the first time an account connects if that account has no cloud journal yet.

## Free deployment

Cloudflare Pages can host the static app on its free tier. The app needs no build command; use `.` as the build output directory. Connect this folder through a Git repository for automatic deploys, or use a one-off Direct Upload. Once deployed over HTTPS, the service worker enables offline shell loading after the first successful visit, and the manifest allows installation as a browser app.

For automatic deployments: put these site files in a GitHub repository, then in Cloudflare select **Workers & Pages → Create application → Pages → Connect to Git**. Choose the repository, leave the build command empty, set the output directory to `.`, and deploy. Do not include backups or private journal exports in the public site folder.

## Design

Near-black gallery canvas, oversized Space Grotesk lettering, and a custom abstract study in violet, acid green, and coral. Quiet controls leave room for the artwork and the ideas being kept.
