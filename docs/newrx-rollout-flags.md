# NewRx & VoiceRx — rollout flags

Branch TP-2374 (now `preprod`). All switches live in GrowthBook — no release needed to change any of them.

**NewRx** = the redesigned prescription pad. It runs in two modes: **with voice**, or **point-and-click**. Same screen, two modes, two separate rollouts.

---

## 1. VoiceRx — today on prod

| Doctor | Sees | Credit check | Credits burned |
|---|---|---|---|
| On `free-voice-rx` (paid, or granted free) | Old VoiceRx | No | No |
| On `voice-rx-new` | New VoiceRx | No | No |
| Everyone else | Old VoiceRx | Yes | Yes |

## 2. VoiceRx — after this release

| Doctor | Sees | Credit check | Credits burned |
|---|---|---|---|
| On `free-voice-rx` | **New** VoiceRx, from the day `newVoiceUiForFreeUsersFrom` passes | No | No |
| On `voice-rx-new`, not free | New VoiceRx | **Yes — new** | **Yes — new** |
| Joined on/after `newVoiceUiOnboardCutoff`, not free | **New** VoiceRx | Yes | Yes |
| In `oldVoiceUiOnlyDoctors` | Old VoiceRx — always | Yes | Yes |
| Everyone else | Old VoiceRx | Yes | Yes |

---

## 3. Point-and-click — today on prod

| Doctor | Sees |
|---|---|
| Everyone | Old point-and-click pad |

The redesigned pad is reachable only through a voice button today. There is no point-and-click rollout on prod.

## 4. Point-and-click — after this release, `newPointClickUi` = **false**

| Doctor | Sees |
|---|---|
| In `new-point-n-click` *(planned flag)* | **NewRx** point-and-click |
| Everyone else | Old point-and-click pad |

## 5. Point-and-click — after this release, `newPointClickUi` = **true**

| Doctor | Sees |
|---|---|
| In `oldPointClickUiOnlyDoctors` | Old point-and-click pad |
| On a phone | Old mobile flow |
| Everyone else | **NewRx** point-and-click |

---

## 6. Flag reference

| Setting | Type | Effect |
|---|---|---|
| `newPointClickUi` | true / false, per environment | Master switch for NewRx point-and-click. Must be a real boolean — `"true"` or `1` are ignored. |
| `oldPointClickUiOnlyDoctors` | list of user ids | Keeps those doctors on the old pad even when `newPointClickUi` is true |
| `new-point-n-click` **(planned)** | GrowthBook flag, targeted by user id | Always gives NewRx point-and-click, whether `newPointClickUi` is true or false |
| `oldVoiceUiOnlyDoctors` | list of user ids | Always old VoiceRx. Overrides every other voice rule. |
| `voice-rx-new` | on / off flag | Puts targeted doctors on NewRx with voice |
| `free-voice-rx` | on / off flag | Free voice access — no credit checks, no credits burned |
| `newVoiceUiOnboardCutoff` | date | Doctors who **joined** on or after it get NewRx with voice |
| `newVoiceUiForFreeUsersFrom` | date | From **this date onward**, all free-voice doctors get NewRx with voice |

---

## 7. Planned change — `new-point-n-click`

A new GrowthBook feature flag holding the user ids we want on the new point-and-click UI.

| Rule | Behaviour |
|---|---|
| Doctor is in `new-point-n-click` | Always sees NewRx point-and-click — `newPointClickUi` is irrelevant |
| `newPointClickUi` = true | Everyone sees NewRx point-and-click, except `oldPointClickUiOnlyDoctors` |

Lets us pilot a handful of doctors before the master switch goes on.

---
