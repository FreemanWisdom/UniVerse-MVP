import type { Metadata } from "next";

/*
 * Community Standards — written content ported word-for-word from the
 * legacy HTML landing page (index.html, uvDocs.community), with the
 * product name corrected to "Universe ICOS".
 */

export const metadata: Metadata = {
  title: "Community Standards",
  description: "Build the campus you want to belong to.",
};

const SECTIONS: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "Build the campus you want to belong to.",
    paragraphs: [
      "Universe ICOS exists to connect campus life. These standards apply to everyone using Universe ICOS and are designed to keep the community respectful, safe and trustworthy.",
    ],
  },
  {
    heading: "Respect",
    paragraphs: [
      "Treat other members of your campus community with respect. Harassment, intimidation or targeted abuse of any kind is not allowed.",
    ],
  },
  {
    heading: "Hate and discrimination",
    paragraphs: [
      "Content that targets people based on protected characteristics — including race, ethnicity, religion, gender, sexual orientation, disability or nationality — is not allowed.",
    ],
  },
  {
    heading: "Threats and violence",
    paragraphs: [
      "Threats of violence, or content that encourages violence against any person or group, are strictly prohibited.",
    ],
  },
  {
    heading: "Sexual exploitation and inappropriate content",
    paragraphs: [
      "Universe ICOS prohibits sexual exploitation and content that is sexually inappropriate for the platform, with zero tolerance for anything involving minors.",
    ],
  },
  {
    heading: "Privacy",
    paragraphs: [
      "Do not publish another person's private information — such as contact details, location or personal records — without their permission.",
    ],
  },
  {
    heading: "Anonymous posting",
    paragraphs: [
      "Some parts of Universe ICOS, such as Campus Whisper, allow anonymous posts. Anonymity does not remove your responsibility to follow these standards. All other rules in this document — including those on harassment, hate speech, threats, privacy and illegal activity — apply fully to anonymous content.",
    ],
  },
  {
    heading: "Impersonation and deception",
    paragraphs: [
      "Do not impersonate another student, staff member or organization in a way intended to deceive others.",
    ],
  },
  {
    heading: "Spam and manipulation",
    paragraphs: [
      "Spam, scams, malicious links and coordinated manipulation of the platform are not allowed.",
    ],
  },
  {
    heading: "Academic integrity",
    paragraphs: [
      "Do not use Universe ICOS to facilitate cheating, impersonation in academic contexts, or other academic misconduct. This includes using AI Tutor to complete graded work in ways that violate your institution's academic integrity policies — AI Tutor is intended to help you understand material, not to substitute for your own work where that would breach your school's rules.",
    ],
  },
  {
    heading: "Illegal activity",
    paragraphs: ["Universe ICOS may not be used to facilitate unlawful activity."],
  },
  {
    heading: "Platform abuse",
    paragraphs: [
      "Attempts to exploit, disrupt or compromise Universe ICOS or its infrastructure are prohibited.",
    ],
  },
  {
    heading: "Reporting",
    paragraphs: [
      "If you encounter content or behavior that violates these standards, please report it so it can be reviewed.",
    ],
  },
  {
    heading: "Enforcement",
    paragraphs: [
      "Universe ICOS may review reports and take appropriate action, which can include content removal, feature restrictions or account suspension, depending on the severity and context of the violation.",
    ],
  },
];

export default function CommunityStandardsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] text-campus-400">
        Universe ICOS
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Community Standards
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Build the campus you want to belong to.
      </p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-base font-bold text-foreground">
              {section.heading}
            </h2>
            {section.paragraphs.map((p) => (
              <p key={p.slice(0, 40)} className="mt-3 text-sm leading-relaxed text-slate-400">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
