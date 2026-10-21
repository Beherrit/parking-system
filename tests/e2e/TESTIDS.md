# Test ids

Every interactive element and result region has a `data-testid`. Page objects in `tests/e2e/pages/` hold the selectors; specs should not repeat them.

Result and error elements also carry `data-code` (the contract error code, for example `LOT_FULL`), so specs assert on the code and not only on wording.

## /login

| Test id | Element |
|---|---|
| `login-lot-name` | Lot name above the form |
| `login-form` | Form |
| `login-email` | Email input |
| `login-password` | Password input |
| `login-submit` | Sign in button |
| `login-error` | Bad-credentials message (inside an aria-live region) |

## / (attendant screen)

| Test id | Element |
|---|---|
| `lot-name` | Lot name in the header |
| `sign-out` | Sign out button |
| `lot-error` | Error shown when spots or tickets cannot be loaded |
| `spots-loading` | Placeholder until the first load |
| `spot-grid` | Spots section |
| `free-small-count` | Number of free small spots |
| `free-large-count` | Number of free large spots |
| `spot-list-small`, `spot-list-large` | The two lists of spots |
| `spot-{number}` | One spot, for example `spot-S1`; attributes `data-state` (`free` or `taken`) and `data-size` |
| `spot-{number}-plate` | Plate shown on a taken spot |
| `spot-{number}-label` | The text "Free" on a free spot |

### Park form

| Test id | Element |
|---|---|
| `park-form` | Form |
| `park-plate` | Plate input |
| `park-size-small`, `park-size-large` | Size radios |
| `park-submit` | Park car button |
| `park-result` | aria-live region, always present; holds the ticket or the error |
| `park-error` | Error message; `data-code` |
| `park-ticket-card` | Issued ticket |
| `park-ticket-code`, `park-ticket-plate`, `park-ticket-spot`, `park-ticket-arrived` | Ticket fields |
| `park-ticket-link` | Link to the printable ticket |

### Return form

| Test id | Element |
|---|---|
| `return-form` | Form |
| `return-code` | Ticket code input |
| `return-plate` | Plate input |
| `return-submit` | Return car button |
| `return-result` | aria-live region, always present; holds the result or the error |
| `return-error` | Error message; `data-code` |
| `return-ticket-card` | Returned ticket |
| `return-ticket-code`, `return-ticket-plate`, `return-ticket-spot`, `return-ticket-arrived`, `return-ticket-returned` | Ticket fields |
| `return-ticket-duration` | Time parked, for example "0 minutes" |

### Active tickets

| Test id | Element |
|---|---|
| `active-tickets` | Section |
| `active-empty` | "No cars are parked." |
| `active-ticket-{code}` | One row; attributes `data-plate`, `data-spot` |
| `active-ticket-link-{code}` | Link to that printable ticket |

## /tickets/{code}

| Test id | Element |
|---|---|
| `ticket-page` | Page wrapper |
| `ticket-card` | The ticket |
| `ticket-code`, `ticket-plate`, `ticket-spot`, `ticket-arrived`, `ticket-returned` | Ticket fields |
| `ticket-error` | Error message (for example `TICKET_NOT_FOUND`); `data-code` |
| `print-button` | Print button, hidden when printing |
| `back-to-lot` | Link back to `/` |
