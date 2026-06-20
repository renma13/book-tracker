# Chapter Garden

A personal book tracker designed as a Goodreads alternative. The app is a static site, so it can be hosted directly on GitHub Pages.

## Features

- Calendar-first reading view
- Library, shelf, bookshelf, and stats views
- Open Library search for book auto-fill
- Manual add and edit flow
- Genres and personal tags
- Browser-local saving with JSON import and export
- No build step or install step

## Publish With GitHub Pages

1. Create a GitHub repository for this folder.
2. Push `index.html`, `styles.css`, `app.js`, and `README.md`.
3. In GitHub, open the repository settings.
4. Go to Pages.
5. Choose `Deploy from a branch`.
6. Select the `main` branch and the root folder.
7. Save. GitHub will provide your public Pages URL.

## Saving Notes

Your books are saved in the browser on the device where you use the tracker. Use Export to download a backup JSON file, and Import to restore it later or move it to another browser.

True online sync would require an account-backed storage option, such as Firebase, Supabase, or a private GitHub-based save flow.
