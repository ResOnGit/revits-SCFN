<p align="center">
  <img src="public/favicon.svg" alt="SCFN" width="120" />
</p>

# revits-SCFN

SCFN is an open-source personal spending dashboard. An iPhone Shortcut records each spend. The site shows that month’s total, a budget ring, a pie of spending by type, and the list of transactions.

# Spending types  (Shortcuts Users)
It is stored in transactions row. Types of transactions are string you can invent yourself and the app *will* pick up on it. 
Provided you set the list and values right on shortcut's side.

`out of budget` is an exclusive hard coded transaction type that **will** be ignored by the budget ring inside the app.


# FLOW
following the release, the way to set up revits SCFN are
```
APPLE SHORTCUTS <---> SUPABASE <-----> SCFN Dashboard (github pages)
```
requires minimal to no maintenance at all, security is set up by the secrets page and magic link (OR otp) provided by supa's.


# As of 1.2
Each account only sees its own rows. The Shortcut still posts with the anon key, and those rows stay on the owner account.
A demo login, dummy@scfn.app, opens September 2026 and can only move between August, September, and October. The header reads Shortcuts Finance Demo.
On iPhone, including the Home Screen app, the background grid and the pie are drawn lighter so the page does not stall.
See the 1.2 release notes.



### future additions (roadmap) 2.0
- dates to be international (toggled in app)
- ability to delete a transaction
- ability to edit a transaction
- currency and time to be internationa; (toggled in app)
