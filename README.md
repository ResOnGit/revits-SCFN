<p align="center">
  <img src="public/favicon.svg" alt="SCFN" width="120" />
</p>

# revits-SCFN

SCFN is an open-source personal spending dashboard. An iPhone Shortcut records each spend. The site shows that month’s total, a budget ring, a pie of spending by type, and the list of transactions.

# FLOW
following the release, the way to set up revits SCFN are
```
APPLE SHORTCUTS <---> SUPABASE <-----> SCFN Dashboard (github pages)
```
requires minimal to no maintenance at all, security is set up by the secrets page and magic link provided by supa's.

# As of 1.1
New flashy UI. Dates are shown in Malaysia time, with the weekday. Amounts are shown in ringgit.
The budget ring is capped at RM800 and ignores the STRING type Out of budget. Clicking a pie slice filters Recent. Recent can also be filtered by week inside the month.
See releasenotes/1.1.md.


### future additions (roadmap)
- dates to be international (toggled in app)
- ability to delete a transaction
- ability to edit a transaction
- currency and time to be internationa; (toggled in app)
