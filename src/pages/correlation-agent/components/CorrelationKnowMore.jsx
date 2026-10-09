import React, { useCallback, useEffect, useRef, useState } from "react";
import VideoThumb from "./VideoThumb";
import {
  TesseractThemeProvider,
  Drawer,
  DrawerContent,
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TPLibraryIcon,
} from "@dhspl-tatvacare/tesseract-ui";

import VideoModal from "../../../common/VideoModal";
import AgentSpark from "./AgentSpark";
// eslint-disable-next-line import/no-unresolved -- exports-map alias, webpack resolves it
import "@dhspl-tatvacare/tesseract-ui/styles.css";
import styles from "./CorrelationKnowMore.module.css";
import { SUPPORT_PHONE_NUMBER } from "../../../utils/constants";

/* The same shape every other Know More in this product uses: a fixed header
   with section tabs, a scrolling body whose sections the tabs follow, and the
   disclaimer last. Built from Tesseract rather than the legacy antd shell,
   because everything else in this feature is. */
const SECTIONS = [
  { id: "basics", label: "Basic Info" },
  { id: "trust", label: "Trust Indicators" },
  { id: "process", label: "How It Works" },
  { id: "tips", label: "Tips" },
  { id: "support", label: "Contact Support" },
];

/* The shape VideoModal expects: it derives the nocookie embed from any YouTube
   URL form, so the plain watch link is fine here. */
const TUTORIAL_VIDEO = {
  link: "https://www.youtube.com/watch?v=luR2CgP9dBs",
  title: "How the Correlation Agent works",
};

const SUPPORT_EMAIL = "support@tatvacare.in";

/* Why a doctor should believe the output. Every claim here is a property of how
   the agent actually runs, not marketing: each one maps to something visible in
   the Correlation step. */
const TRUST = [
  {
    icon: "ai-shield",
    title: "It argues against itself",
    body: "Every link the agent proposes is challenged before it is shown. Links that do not survive the challenge are marked weakened rather than quietly dropped.",
  },
  {
    icon: "ai-eye",
    title: "Nothing is hidden",
    body: "The chart traces each conclusion back to the parameter it came from. Click any node to see the findings that fed it and the reports they were read from.",
  },
  {
    icon: "document-text",
    title: "Only your own reports",
    body: "The agent reads the reports you tick and nothing else. It does not reach for outside data, and it never invents a value that is not in the record.",
  },
];

const TIPS = [
  {
    title: "Pick reports that overlap in time",
    body: "Panels drawn on the same day or within the same episode correlate far better than a panel from this visit read against one from two years ago.",
  },
  {
    title: "Include the normal panels too",
    body: "A normal result is evidence. A normal KFT beside a deranged LFT is what lets the agent say the picture is hepatic rather than systemic.",
  },
  {
    title: "Two reports is the floor, not the target",
    body: "The agent needs at least two to correlate at all, but the reading gets sharper with more. Add the imaging report if there is one.",
  },
];

function Section({ id, label, title, sectionRef, children }) {
  return (
    <section className={styles.section} id={id} ref={sectionRef}>
      <span className={styles.sideHead}>{label}</span>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

export default function CorrelationKnowMore({ open, onOpenChange, onClose }) {
  const [active, setActive] = useState(SECTIONS[0].id);
  const [playing, setPlaying] = useState(false);
  const refs = useRef({});
  const bodyRef = useRef(null);

  const close = useCallback(() => {
    if (onOpenChange) onOpenChange(false);
    if (onClose) onClose();
  }, [onOpenChange, onClose]);

  const goTo = useCallback((id) => {
    setActive(id);
    const el = refs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /* The tabs follow the scroll rather than only driving it, so the header always
     says where in the explainer the doctor currently is. */
  useEffect(() => {
    const scroller = bodyRef.current;
    if (!open || !scroller) return undefined;

    const onScroll = () => {
      const line = scroller.getBoundingClientRect().top + scroller.clientHeight / 3;
      let current = SECTIONS[0].id;
      SECTIONS.forEach((s) => {
        const el = refs.current[s.id];
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      });
      setActive(current);
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [open]);

  const header = (
    <div className={styles.tabsWrap}>
      <Tabs value={active} onValueChange={goTo} size="sm" variant="line">
        <TabsList>
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );

  return (
    <TesseractThemeProvider colorScheme="light">
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          side="right"
          width="60%"
          title={
            <span className={styles.headTitle}>
              <AgentSpark size={24} sparkSize={14} />
              Correlation Agent
            </span>
          }
          action={header}
          bodyPadding={0}
        >
          <div className={styles.wrap}>
            <div className={styles.body} ref={bodyRef}>
              <Section
                id="basics"
                label="Basic Info"
                title="What the Correlation Agent does"
                sectionRef={(el) => { refs.current.basics = el; }}
              >
                <div className={styles.lede}>
                  <AgentSpark size={56} sparkSize={30} animated />
                  <p>
                    A patient&apos;s reports arrive one panel at a time, and the answer usually sits
                    between them rather than inside any one of them. The agent reads across every
                    report you tick, links the findings that move together, argues against each
                    link, and keeps only what survives.
                  </p>
                </div>

                <div className={styles.flow}>
                  {[
                    { n: 1, t: "Reads findings", d: "Every parameter from the reports you picked, with its value, its range and its flag." },
                    { n: 2, t: "Links them", d: "Findings that move together across reports become a correlation, each one named and scored." },
                    { n: 3, t: "Challenges each link", d: "The agent looks for the reading that would break the link. Links that survive are kept, links that do not are marked weakened." },
                    { n: 4, t: "Groups what is left", d: "Surviving links become hypotheses, sorted into Most Likely, Worth Excluding and Incidental." },
                  ].map((s) => (
                    <div key={s.n} className={styles.flowStep}>
                      <span className={styles.flowNum}>{s.n}</span>
                      <span className={styles.flowMain}>
                        <span className={styles.flowTitle}>{s.t}</span>
                        <span className={styles.flowBody}>{s.d}</span>
                      </span>
                    </div>
                  ))}
                </div>

                <p className={styles.note}>
                  It suggests, it does not diagnose. Nothing it produces enters the prescription
                  unless you put it there.
                </p>
              </Section>

              <Section
                id="trust"
                label="Trust Indicators"
                title="Why you can act on what it shows"
                sectionRef={(el) => { refs.current.trust = el; }}
              >
                <div className={styles.trustGrid}>
                  {TRUST.map((t) => (
                    <div key={t.title} className={styles.trustCard}>
                      <TPLibraryIcon name={t.icon} variant="bulk" size={20} className={styles.trustIcon} />
                      <span className={styles.trustTitle}>{t.title}</span>
                      <p className={styles.trustBody}>{t.body}</p>
                    </div>
                  ))}
                </div>
              </Section>

              <Section
                id="process"
                label="How It Works"
                title="See it run on a real set of reports"
                sectionRef={(el) => { refs.current.process = el; }}
              >
                <p className={styles.para}>
                  This walkthrough follows one patient's reports through the
                  correlations the agent draws and the hypotheses it reaches,
                  including the one it argued down.
                </p>
                {/* The thumbnail already carries its own play mark and its own
                    title, so a card around it duplicated both. It opens the
                    product's own VideoModal rather than sending the doctor out
                    to YouTube mid-consultation. */}
                <button
                  type="button"
                  className={styles.video}
                  onClick={() => setPlaying(true)}
                  aria-label="Watch how the Correlation Agent works"
                >
                  <VideoThumb title={TUTORIAL_VIDEO.title} />
                </button>
              </Section>

              <Section
                id="tips"
                label="Tips"
                title="Getting the best reading"
                sectionRef={(el) => { refs.current.tips = el; }}
              >
                <div className={styles.tips}>
                  {TIPS.map((t) => (
                    <div key={t.title} className={styles.tip}>
                      <TPLibraryIcon
                        name="check-mark---tick"
                        variant="bold"
                        size={18}
                        className={styles.tipMark}
                      />
                      <span className={styles.tipMain}>
                        <span className={styles.tipTitle}>{t.title}</span>
                        <span className={styles.tipBody}>{t.body}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section
                id="support"
                label="Contact Support"
                title="Need more help? Reach our support team"
                sectionRef={(el) => { refs.current.support = el; }}
              >
                <div className={styles.support}>
                  <a className={styles.supportLink} href={`tel:${SUPPORT_PHONE_NUMBER}`}>
                    <TPLibraryIcon name="call" variant="bulk" size={18} />
                    {SUPPORT_PHONE_NUMBER}
                  </a>
                  <span className={styles.supportSplit} aria-hidden="true" />
                  <a className={styles.supportLink} href={`mailto:${SUPPORT_EMAIL}`}>
                    <TPLibraryIcon name="ai-mail" variant="bulk" size={18} />
                    {SUPPORT_EMAIL}
                  </a>
                </div>
              </Section>

              <p className={styles.disclaimer}>
                <Badge variant="soft" color="warning" size="xs" icons="none">
                  Disclaimer
                </Badge>
                These results are generated by AI and should be used as a guide, not the final
                source for patient treatment decisions.
              </p>
            </div>

            {playing ? (
              <VideoModal videoLink={TUTORIAL_VIDEO} onCancel={() => setPlaying(false)} />
            ) : null}

            <div className={styles.foot}>
              <Button variant="solid" size="lg" className={styles.gradientCta} onClick={close}>
                Got it
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </TesseractThemeProvider>
  );
}
