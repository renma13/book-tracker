# Chapter Garden

A personal book tracker designed as a calm Goodreads alternative. The app is a static site, so it can be hosted directly on GitHub Pages.

## Features

- Calendar-first reading view
- Library, shelf, bookshelf, and stats views
- Open Library search for book auto-fill
- Manual add and edit flow
- Genres and personal tags
- Browser-local saving with JSON import and export
- Optional cloud sync across devices (Firebase)
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

By default, your books are saved only in the browser on the device where you use the tracker — this is normal `localStorage`, which never leaves that one browser. Use Export to download a backup JSON file, and Import to restore it later or move it to another browser by hand.

## Syncing Across Devices

To see the same library on your phone, laptop, and any other browser automatically, turn on Cloud sync from the sidebar. It uses your own free Firebase project as the shared storage — nothing is stored on GitHub or Anthropic's servers, and no server of your own is required.

### One-time Firebase setup

1. Go to the [Firebase console](https://console.firebase.google.com/) and create a new project (the free Spark plan is enough).
2. Open **Build → Firestore Database**, click **Create database**, pick a region, and start in production mode.
3. Open **Build → Authentication**, click **Get started**, then enable the **Anonymous** sign-in provider.
4. Open **Project settings** (gear icon) → **General**, scroll to "Your apps", and click the web icon (`</>`) to register a new web app. You don't need Firebase Hosting. Copy the `firebaseConfig` object shown.
5. Open **Firestore Database → Rules** and replace the contents with:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /libraries/{libraryCode} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

   Click **Publish**. This lets any signed-in (anonymous) visitor read or write a library document if they know its code — so treat your library code like a password, and prefer a long, randomly generated one over something guessable.

6. In Chapter Garden, click **Sync devices** in the sidebar, paste the `firebaseConfig` object, click **Generate** to create a private library code (or type your own), then click **Turn on sync**.
7. On every other device, open the same Pages URL, click **Sync devices**, paste the exact same config and the exact same code, then click **Turn on sync**.

Your Firebase config and library code are stored only in each browser's local storage — they are never written into `index.html`, `app.js`, or the public GitHub repository.

### How sync behaves

- Changes save locally first, then push to Firestore a moment later; other connected devices pick them up automatically.
- The first time you connect a second device, if it already has its own books, you'll be asked whether to merge them into the cloud library or replace them with what's already saved there.
- This is simple last-write-wins sync, not real-time conflict resolution. If you edit the same book on two devices while both are offline, the version saved last will win once they're both back online.
- You can disconnect a device at any time from the Sync dialog; its books stay on that device, but it stops sending or receiving updates.
