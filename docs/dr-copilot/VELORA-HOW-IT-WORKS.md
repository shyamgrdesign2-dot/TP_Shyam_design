# Velora: how it works

Velora is the doctor's AI assistant inside Tatva Practice. It answers questions about one patient's record, or finds patients across the doctor's practice. This document explains how it behaves end to end:

1. [What Velora is and where it opens](#1-what-velora-is-and-where-it-opens)
2. [The two kinds of conversation](#2-the-two-kinds-of-conversation)
3. [The screen: sidebar, heading and chat](#3-the-screen-sidebar-heading-and-chat)
4. [Starting a new chat](#4-starting-a-new-chat)
5. [Recent conversations](#5-recent-conversations)
6. [Finding patients (the hospital chat)](#6-finding-patients-the-hospital-chat)
7. [Asking about one patient (the patient chat)](#7-asking-about-one-patient-the-patient-chat)
8. [Moving between patients from inside a chat](#8-moving-between-patients-from-inside-a-chat)
9. [How chat history is kept against each patient](#9-how-chat-history-is-kept-against-each-patient)
10. [Clearing and deleting](#10-clearing-and-deleting)
11. [Demo mode](#11-demo-mode)
12. [Where the code lives](#12-where-the-code-lives)

---

## 1. What Velora is and where it opens

Velora opens as a large popup over the page (about 90% of the screen). It is never a separate page, so the doctor never loses their place in the portal.

It can be opened from:

- the **"Ask Velora" search** in the top bar, which opens it in the hospital-wide scope ("All my patients");
- a **patient's page or the consultation (Rx pad)**, which opens it on that patient.

**Where Velora was opened from matters.** That place is the visit's *home*:

| Opened from | Home for this visit |
|---|---|
| The top bar / appointments / any common page | The hospital chat ("All my patients") |
| A patient's page or consultation | That patient's chat |

The home keeps its card in Recent conversations for the whole visit, even if the doctor moves to other patients and asks nothing at home. That way there is always a way back to where they started (see [section 5](#5-recent-conversations)).

The **close button** floats just outside the popup's top-right corner. It closes Velora. It does not close the chat in front: chats are left exactly as they were.

---

## 2. The two kinds of conversation

Velora runs on the Copilot search service, which offers exactly two modes. Velora's whole design follows from them.

| | Hospital chat | Patient chat |
|---|---|---|
| Heading tag | "All my patients" (or "All hospital patients") | The patient's name, with age, sex and patient ID |
| What it does | **Finds patients** who match a description | **Answers questions** from that one patient's record |
| Example question | "Patients with HbA1c above 7%" | "What are Priya's allergies?" |
| What comes back | A list of matching patients, with the facts that matched | An answer written from the record, with numbered sources |
| Service endpoint | `POST /discovery/ask` (mode `find_patients`) | `POST /patients/{uid}/ask` |

The two never mix. A patient chat only ever answers from that patient's record, and the hospital chat only ever returns patient lists. It does not produce counts, charts across the practice or analytics, because the service does not offer them.

Both answers stream in. While the service works, Velora shows its live progress steps (for example "Reading lab results"). Then the answer is written out as it arrives, and the final result replaces it.

---

## 3. The screen: sidebar, heading and chat

```
┌──────────────────────────┬───────────────────────────────────────────────┐   ┌───┐
│ [✦ Velora ⋮]        [◧]  │ [👤 Priya Nair (29y | F | PAT1004)]           │   │ ✕ │ ← floating close
│                          │                                               │   └───┘
│ [ + Start new chat ]     │                                               │
│                          │          Good afternoon, Doctor!              │
│ RECENT CONVERSATIONS     │      You are asking about Priya Nair          │
│ [🔍 Search by patient…]  │                                               │
│ ┌──────────────────────┐ │      [suggested questions as tags]            │
│ │ 👤 Priya Nair        │ │                                               │
│ │ What are her allerg… │ │   ┌───────────────────────────────────────┐   │
│ ├──────────────────────┤ │   │ Ask Velora about Priya's …            │   │
│ │ Today, 9 Oct · 4:55pm│⋮│   └───────────────────────────────────────┘   │
│ └──────────────────────┘ │                                               │
└──────────────────────────┴───────────────────────────────────────────────┘
```

### The sidebar (left)

- It is **open by default** every time Velora opens.
- The collapse button (sidebar icon, top right of the sidebar) hides it for the rest of that visit.
- The sidebar **is the navigation**. There is no back arrow anywhere. To go to another conversation, pick it in the sidebar.
- At the top is the **Velora tag**. The ⋮ inside it holds **Clear all history**.

### When the sidebar is collapsed

The chat header shows:

- an expand button, the Velora tag and the heading tag, on the left;
- a **"New chat"** button (gradient icon and text) at the right end. It reopens the sidebar straight onto the patient picker.

### The heading tag

The tag at the top of the chat names whose conversation this is:

- **Patient chat:** "Priya Nair (29y | F | PAT1004)". Age, sex and ID tell apart two patients with the same name.
- **Hospital chat:** "All my patients" or "All hospital patients".

The tag is **not a control**. It is a plain grey tag with no dropdown, because a chat belongs to one patient (or to the hospital search) for its whole life. Hovering it shows a tooltip explaining it. Examples: "This conversation is about Priya Nair. Answers come from this patient's record only." or "This conversation is about all your patients. Velora finds patients among the ones you have treated."

### The welcome screen

Before the first question, the chat shows a greeting, a line saying who it is about ("You are asking about **Priya Nair**", with the name in bold), and four suggested questions as tags. The suggestions are the service's own starter questions for that patient (`GET /patients/{uid}/starters`) or, in the hospital chat, common "find patients" searches.

---

## 4. Starting a new chat

**Start new chat** is the button at the top of the sidebar (or "New chat" in the header when the sidebar is collapsed).

It opens a sheet inside the sidebar, covering 60% of it, titled **"New conversation: Select a patient to start a new conversation."**

The sheet contains, in order:

1. **A search box:** patient name, patient ID or mobile number. Results come from the patient search (`GET /patients?q=`).
2. **The two hospital scopes:**
   - *All my patients*, the patients this doctor has treated (shown only when the doctor's identity is known);
   - *All hospital patients*, every patient in the hospital.

   The one in use is marked "Current".
3. A divider, then **Today's appointments**, the doctor's patients for today, each with age, sex, patient ID and mobile.

**Patients already chatted with** show a quiet grey count at the right, such as "1 chat" or "3 chats". Picking such a patient **reopens their latest conversation** instead of starting a duplicate. Picking anyone else starts a fresh chat with them.

Picking a scope switches to that hospital chat.

The sheet closes with the square close button, Escape, or a click on the dimmed area above it.

---

## 5. Recent conversations

Below Start new chat is the **Recent conversations** list, with its search box ("Search by patient or question") underneath the heading.

### What is listed

- **Every conversation the doctor has had**, for every patient and every hospital search. There is no time limit. (An earlier version kept 24 hours only; that rule has been removed.)
- **Newest first.** A conversation moves to the top as soon as it is opened or a question is asked in it, like ChatGPT or Claude.
- The list comes from the service (`GET /sessions?offset=`), in pages; older ones load as the doctor scrolls.
- Conversations the doctor deleted or cleared are left out (see [section 10](#10-clearing-and-deleting)).

### Each card

```
┌───────────────────────────────────────────┐
│ [icon]  Mohammed Iqbal                    │   ← whose chat
│         What are the latest lab results?  │   ← the doctor's question (1 line, at most 2)
├───────────────────────────────────────────┤
│ Today, 9 Oct · 4:44 pm                 ⋮  │   ← when it was last asked, and its menu
└───────────────────────────────────────────┘
```

- **Top:** the patient's name (or "All my patients"), then the doctor's question. The question takes one line if it fits, and is cut off after two.
- **Footer strip:** the day and time of the last question ("Today, 9 Oct · 4:44 pm", "Yesterday, 8 Oct · …", or a weekday and date), and the card's ⋮ menu.
- **Selected** (the conversation on screen) is shown in blue.
- A chat where **nothing has been asked yet** has no footer and no ⋮. There is no time to show and nothing to clear.

### Cards that appear before any question

Two kinds of card keep a place in the list even when nothing has been asked yet:

1. **The open patient.** When a patient's chat is open and empty, their card shows at the top, selected, reading "Ask about Priya". It becomes a real conversation card as soon as a question is asked. If the doctor leaves without asking, it goes away.
2. **The visit's home** (where Velora was opened from, [section 1](#1-what-velora-is-and-where-it-opens)):
   - **Opened from a patient's page:** that patient's card stays in the list for the whole visit, even after the doctor switches to another patient and asks nothing on the home patient. Clicking it switches back to them.
   - **Opened from a common page:** the "All my patients" card stays in the list for the whole visit, even after the doctor starts a chat with a patient from Start new chat.

**The empty hospital card appears only when the hospital is home.** If Velora was opened on a patient's page, an unused "All my patients" card is not shown. That patient's card is the default until the doctor actually starts a hospital chat.

### Worked examples

| What the doctor does | What Recent conversations shows |
|---|---|
| Opens Velora from the top bar, asks nothing | All my patients *(selected)* |
| …then Start new chat → Priya, asks nothing | Priya *(selected)*, All my patients |
| Opens Velora on Kavita's page, asks nothing | Kavita *(selected)* |
| …then Start new chat → Sunita, asks nothing | Sunita *(selected)*, Kavita |
| …clicks Kavita | Kavita *(selected)* (Sunita disappears: no question was asked) |
| Asks Sunita one question, then goes back to Kavita | Kavita *(selected)*, Sunita *(with its date and time)* |

### Search

The search box filters the list by patient name, by words in the question, or by "hospital" for hospital chats. It searches conversations, not patients: to find a patient, use Start new chat.

---

## 6. Finding patients (the hospital chat)

The hospital chat answers "which patients…?" questions, such as "Patients with type 2 diabetes" or "Patients with BP above 140/90".

**How a search runs**

1. The doctor asks. Velora opens a discovery session (`POST /discovery/sessions`) if needed, then asks (`POST /discovery/ask`).
2. Progress steps stream in, then the result.
3. The result is a **list of matching patients**. Each one shows the facts that matched, with their dates and numbered sources. For example: "HbA1c 8.2% on 12 Jun 2026 [1]".
4. If the service checked only part of the practice, the card says so and offers **Show more** to continue the search.

**Opening a patient from the list**

Each matching patient has a way in. Opening one:

- switches Velora to **that patient's own chat**, and
- **asks that patient's question automatically**, worded from the fact that matched. For example, opening Anjali from an HbA1c search asks "What is Anjali's latest HbA1c?" So the doctor lands on the answer, not on an empty chat.

The hospital chat stays as it was, in the list, so the doctor can go back to the results.

**Scope.** "All my patients" searches the patients this doctor has treated. "All hospital patients" searches everyone.

---

## 7. Asking about one patient (the patient chat)

The patient chat answers from **that patient's record only**: visits, diagnoses, medicines, labs, allergies, vitals and documents.

**How a question runs**

1. The first question opens a conversation for the patient (`POST /patients/{uid}/sessions`).
2. Each question goes to `POST /patients/{uid}/ask` in that conversation.
3. Progress steps stream in, then the answer.
4. The answer is written from the record, with **numbered citations**. Each number opens the evidence it came from (the record, date and type) in an evidence panel beside the chat.
5. Below the answer, Velora suggests follow-up questions ("You can also ask…").

**What the patient chat does not do.** It does not invent: if the record does not hold the answer, it says so. And it never answers about a different patient (see the next section).

---

## 8. Moving between patients from inside a chat

The doctor will often ask about someone other than the patient on screen. Velora handles this without making them navigate first.

### A question names another patient

> In Mohammed's chat: "What is Ramesh Patel's latest HbA1c?"

The answer is in Ramesh's record, not Mohammed's. So Velora:

1. reads the name from the question and searches for that patient;
2. shows a **Patient search** card. It explains, for example: "That question is about Ramesh Patel, not this patient. More than one patient has that name, so choose the right one." The search box is pre-filled with the name it read and stays editable;
3. lists the matches with age, sex, patient ID and mobile, and a "Today" mark for patients on today's list, so two people with the same name are easy to tell apart;
4. on a pick, **switches to that patient's chat and asks the same question there**, so the answer arrives straight away.

The same works from the hospital chat, for example "symptoms of Kavita" or "Arjun's medical history".

### A question is about many patients

> In a patient's chat: "Which of my patients have high BP?"

That is a hospital question. Velora runs it as a patient search and shows the list in place. Opening a patient from it works the same way as in the hospital chat.

### The way back

Every conversation the doctor touched stays in Recent conversations. So does the visit's home ([section 5](#5-recent-conversations)). Going back is always one click in the sidebar.

---

## 9. How chat history is kept against each patient

There are three layers.

### 1. The service keeps the conversations

Every conversation (patient or hospital) is a **session on the Copilot service**, keyed by the portal's own patient ID (`patientUid`), so there is no mapping by name or MRN.

- Recent conversations is read from the service (`GET /sessions`).
- Opening a card restores that conversation from the service (`GET /sessions/{id}`): every question and answer, with citations.
- Because it lives on the service, the history is complete and follows the doctor.

### 2. The browser keeps the open threads, per doctor and per patient

While Velora is in use, each thread is also held in the browser so that switching patients is instant:

- **Key:** doctor and patient (`drCopilot:v1:{doctor}:{patientUid}`). Each patient has their own thread. Another doctor signing in on the same browser tab never sees a previous doctor's threads.
- **Where:** the browser tab's session storage. It is cleared when the tab closes, because clinical conversation should not outlive the tab it happened in. After that, history comes back from the service.
- **Size:** the last 60 messages of each thread.
- **Lifetime:** no idle limit. A thread stays until the tab closes or the doctor clears it.

The hospital chat keeps a thread for each scope ("All my patients" and "All hospital patients" are separate conversations).

### 3. Each patient has one conversation line

- Switching to a patient opens **their** conversation, never another patient's.
- Coming back to a patient later (from the sidebar, from a patient list, or from the new-chat sheet's "N chats") reopens the **latest** conversation with them.
- Start new chat on a patient who has no conversation starts a fresh one.

---

## 10. Clearing and deleting

All destructive actions are in ⋮ menus. Each option says what it does, and the big one asks for confirmation.

| Where | Option | What it does |
|---|---|---|
| ⋮ on a patient card | **Delete conversation** | Removes this chat from your history. |
| ⋮ on the hospital card | **Clear conversation** | Empties this chat so it starts afresh. |
| ⋮ in the Velora tag | **Clear all history** | Removes every conversation, for every patient and search. Asks for confirmation ("This cannot be undone."). |

How it works: the doctor's deletions are remembered in the browser, per doctor (`velora:hidden:{doctor}` for single conversations, `velora:cleared-at:{doctor}` for "clear all"). The list leaves them out from then on, and the open thread is reset. The list refreshes at once, so a cleared patient (for example Ramesh Patel) disappears immediately.

Menus close on Escape or on any click outside them.

---

## 11. Demo mode

Add `?veloraMock=1` to the URL (or build with `REACT_APP_VELORA_DEMO=true`) to run Velora against a built-in demo service instead of the live one:

- 23 demo patients with appointments, visit histories, labs, allergies and medicines;
- streamed progress steps and answers that behave like the live service;
- its own conversation store, so the demo never touches real history.

Everything described above (Start new chat, Recent conversations, patient search, switching, clearing) works the same in demo mode.

---

## 12. Where the code lives

All under `src/components/dr-copilot/`.

| Area | File |
|---|---|
| Popup, sidebar wiring, scopes, switching, the visit's home | `surfaces/CopilotDock.jsx` |
| Recent conversations, cards, new-chat sheet, menus | `surfaces/CopilotRecentSessions.jsx` |
| Heading tag (and the patient picker used in the narrow dock) | `surfaces/CopilotContextBar.jsx` |
| Chat panel, header, composer | `DrAgentPanel.jsx`, `shell/AgentHeader.jsx`, `chat/` |
| Welcome screen | `chat/WelcomeScreen.jsx` |
| Patient search card (question names another patient) | `cards/clinical/PatientBridgeCard.jsx` |
| Patient list card (hospital results) | `cards/clinical/PatientMatchesCard.jsx` |
| Service client and streaming | `chart-search/copilotApi.js` |
| Per-patient thread store | `chart-search/copilotSessionStore.js` |
| Cleared/deleted conversations | `chart-search/copilotHistoryPrefs.js` |
| Demo service | `chart-search/copilotMock.js` |
| Styles | `ui/copilot.css`, `surfaces/CopilotDock.module.css` |
