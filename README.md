# Birthday Invitation Website

A ready-to-host digital birthday invitation. Everything you see on the page —
names, photos, dates, colours, buttons — comes from **one file**:
`data/invite.json`. You never need to touch the code.

---

## 1. Change the content

Open `data/invite.json` in any text editor (Notepad, TextEdit, VS Code).
It looks like a list of labels and values in quotes. Change what's inside the
quotes, save, refresh the page.

A few of the most useful bits:

| What you want to change | Where to look in `invite.json` |
| --- | --- |
| Name and age | `celebrant` |
| Big headline photo and title | `hero` |
| The personal note | `invitation` |
| Fun facts about the birthday person | `profile.facts` |
| Party date, time, venue | `event` |
| Countdown clock target | `countdown.target` |
| Past-photos story section | `memories.items` |
| Photo grid | `gallery.images` |
| WhatsApp / phone / email / form buttons | `rsvp` |
| Colours and fonts | `theme` |
| Balloons vs confetti vs party hats vs cake | `decorations.style` |
| Background music | `music` |
| Closing message, hashtag, social links | `footer`, `social` |

**Hiding a section.** Every section is shown by default. To hide one, set its
`"enabled"` to `false`, for example:

```json
"memories": { "enabled": false }
```

**Dates.** Write them as `"2026-11-14T19:00:00"` (year-month-day, then the
24-hour time). The countdown and the date card both read this.

**Auto-filled messages.** In the RSVP text you can write `{{name}}`, `{{age}}`,
`{{date}}` or `{{time}}` and the real values get filled in automatically.

### Photos

Drop your own images into `assets/images/` and point to them in the JSON, e.g.
`"photo": "assets/images/my-photo.jpg"`. If a photo is missing, that spot
simply disappears — no broken image icon.

### Music

Put an MP3 at `assets/music/background.mp3`. A small music button appears at
the top. It never plays on its own — guests tap it. No file, no button.

### A different look, no code

`data/invite.bold-neon.json` holds a second colour scheme ("Bold Neon"). Copy
its `theme` and `decorations` blocks over the ones in `invite.json` to reskin
the whole site instantly. The default is "Pastel Party".

---

## 2. Test it on your computer

**Important:** double-clicking `index.html` will *not* work. Browsers block
the page from reading `invite.json` that way, and you'll see an error screen.
Run a tiny local server instead.

Open a terminal in this folder and run:

```
python3 -m http.server 8000
```

Then visit **http://localhost:8000** in your browser.

(If you don't have Python: `npx serve` works too.)

---

## 3. Put it online for free

**Netlify (easiest, no account knowledge needed)**
1. Go to https://app.netlify.com/drop
2. Drag this whole folder onto the page.
3. You get a live link in a few seconds. Share it.

**GitHub Pages**
1. Create a new repository and upload all these files into it.
2. Repository → Settings → Pages.
3. Under "Branch" pick `main` and `/ (root)`, then Save.
4. Your invitation appears at `https://yourname.github.io/your-repo/`.

**Vercel**
1. Go to https://vercel.com/new and import the repository (or drag the folder).
2. No build settings needed — it's a plain website. Deploy.

---

## 4. If something looks wrong

- **"We couldn't load this invitation"** — usually means the page was opened by
  double-clicking the file, or there's a typo in `invite.json` (a missing comma
  or quote). Paste the file into https://jsonlint.com to spot it.
- **A photo doesn't show** — check the file name matches exactly, including
  capital letters and `.jpg` / `.png`.
- For anything else, press F12 in the browser and look at the "Console" tab —
  the page prints a short message at each step to help pinpoint the issue.

---

## Folder contents

```
birthday-invite/
├── index.html          the page shell (no content inside)
├── css/style.css       all styling
├── js/script.js        builds the page from your JSON
├── data/invite.json    ← everything you edit lives here
├── data/invite.bold-neon.json   alternate colour preset
├── assets/images/      photos and favicon
├── assets/music/       optional background track
└── README.md           this file
```
