# Dr. Agent — Demo Flow Guide

A step-by-step story to walk your team through the Dr. Agent experience.

---

## Act 1: Clinic Overview (Homepage)

### Step 1: Open the Appointments Page
- Navigate to **Appointments** in the left sidebar
- You see the appointments table with today's queue

### Step 2: Open Dr. Agent
- Click the **Dr. Agent edge tag** (curved glass shape on the right edge)
- The agent panel slides in from the right
- Dr. Agent greets you: "Welcome back, Doctor! Here's your schedule overview for today."

### Step 3: Explore the Welcome Card
- The **Today's Schedule** card shows:
  - Context line: "7 patients, 3 follow-ups due, 2 drafts pending"
  - 6 stats in a clean 3-column grid (Queued, Follow-ups, Finished, Drafts, Cancelled, P.Digitisation)
  - "View full schedule" link at bottom

### Step 4: Try the Homepage Prompts
- Click **"Today's schedule"** pill → Shows patient queue list card
- Click **"Follow-ups due"** pill → Shows follow-up list with individual reminder buttons
- Click **"Revenue today"** pill → Shows revenue bar chart

### Step 5: Send SMS Reminders (NEW)
- In the Follow-up list card, click **"Remind"** on individual patients
- Watch the button transform to a green tick with "Sent" confirmation
- Or click **"Send reminder to all"** → Bottom CTA transforms to "Sent to N recipients" with tick

---

## Act 2: Patient Consultation (RxPad)

### Step 6: Open a Patient
- Click **"TypeRx"** on any patient row (e.g., Ramesh M)
- The RxPad opens with the prescription form on the left and Dr. Agent on the right

### Step 7: Patient Intake Card
- Dr. Agent automatically shows the **Patient Reported** card:
  - "New patient with Knee Pain and Morning Stiffness, 1 week. Allergy: Sulfonamides..."
  - Symptom details with severity, duration, location
  - Chronic conditions, current medications
  - **No canned messages on the card** — only the pill bar below has prompts

### Step 8: Explore AI-Powered Cards
- Click **"Suggest DDX"** → DDX card with differential diagnoses, confidence scores, and red flags
- Click **"Initial investigations"** → Investigation card with lab tests to order
- Click **"Review intake data"** → Detailed patient summary card

### Step 9: Copy to RxPad
- On any card, click the **copy icon** in the card header → Data copies to the relevant RxPad section
- Click specific section copy buttons (e.g., "Copy symptoms to Symptoms") for targeted copying

### Step 10: Voice Dictation
- Click the **voice icon** (VoiceSquare) in the input box
- Recording UI appears with animated wave bars and timer
- Pause/resume recording as needed
- Click the green checkmark to submit
- Dr. Agent converts voice to structured Rx:
  - Symptoms, Examinations, Diagnoses, Medications, Investigations, Advice, Follow-up
  - Each section has "Accept all" button to push directly to RxPad

---

## Act 3: Sidebar AI Integration

### Step 11: Hover AI Icons
- Click any sidebar tab (e.g., **Vitals**, **History**, **Lab Results**)
- **Hover over card headers** → AI trigger icon appears (spark icon)
- Click the AI icon → Dr. Agent analyzes that specific section

### Step 12: Deep-Link Navigation
- In Dr. Agent, cards with sidebar links (e.g., "View full vitals history") navigate to the relevant sidebar tab
- The sidebar and agent panel stay synchronized

---

## Act 4: Specialty Switching (Demo Only)

### Step 13: Switch Specialties
- In the Dr. Agent header, click the **specialty dropdown** (shows "GP" by default)
- Note: "Demo only — not in production" label in dropdown
- Switch to **Gynec** → Loads Lakshmi K (45y, F) with gynecological history cards
- Switch to **Obstetric** → Loads Priya Rao (26y, F) with obstetric/ANC cards
- Switch to **Pediatrics** → Loads Arjun S (4y, M) with growth charts, vaccines

---

## Act 5: Document Upload

### Step 14: Upload a Document
- Click the **+** (plus) icon in the input box
- Select document type (Pathology Report, Radiology, Prescription)
- Dr. Agent shows an **OCR extraction card** with structured data from the document
- Review and copy extracted data to RxPad

---

## Key Talking Points During Demo

1. **AAGUI concept**: "AI is embedded into the interface, not a separate chat window"
2. **A2UI**: "The agent and UI talk to each other — cards trigger sidebar navigation, sidebar triggers agent queries"
3. **Zero workflow disruption**: "Doctor never leaves the RxPad. Everything happens in the side panel"
4. **Progressive intelligence**: "Start simple, drill deeper. Summary → Detail → Action"
5. **Voice-first**: "Dictate the entire consultation, AI structures it for you"
6. **Trust by design**: "Every AI output has a trust indicator, copy actions are explicit, nothing auto-fills"

---

## Demo Scenarios Page

Navigate to: **Appointments → Demo Scenarios** (button in header)
- **Card Catalog**: Browse all 30+ card types organized by category
- **Design System**: View the TP component library
- **Interaction Patterns**: Test card interactions, copy flows, and state transitions
