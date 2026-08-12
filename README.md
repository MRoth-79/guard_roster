# guard_roster

Guard duty roster and scheduling system for the standby team (QRF).

Public site: https://mroth-79.github.io/guard_roster/

## Local run

```powershell
cd C:\Users\jz2kbh\git\guard_roster
python -m http.server 8765
```

Open http://localhost:8765

## Cloud save / load (required for cross-computer sync)

The schedule is normally stored in browser `localStorage` only.  
**שמור לענן** / **משוך מהענן** sync the current roster via Google Apps Script so another PC opening the public link can load the same week.

Password for both actions: `2244`

### Deploy the Apps Script backend

1. Open [Google Apps Script](https://script.google.com/) → **New project**.
2. Replace `Code.gs` contents with [`apps-script/Code.gs`](apps-script/Code.gs).
3. **Deploy** → **New deployment** → type **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Authorize, then copy the Web App URL ending with `/exec`.
5. Paste that URL into [`core/constants.js`](core/constants.js) as `DEFAULT_WEB_APP_URL`.
6. Commit and push to `main` so GitHub Pages picks up the new URL.

After a code change in `Code.gs`, create a **New deployment** (or a new version on the existing deployment). Editing the script alone does not update the live `/exec` endpoint.

### Usage

1. Build/edit the schedule as usual (`משוך וסדר` / manual edits).
2. Click **שמור לענן**, enter `2244` — saves the roster **as shown at that moment** for the selected week start date.
3. On another computer open the public site, set the same week start date, click **משוך מהענן**, enter `2244`.

Notes:

- Saves are keyed by week `startDate` (ISO). Different weeks do not overwrite each other.
- The password is a light team gate (visible in client + Apps Script source), not strong security.
