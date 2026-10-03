import type { Metadata } from "next";

/*
 * Privacy Policy — written content ported word-for-word from the legacy
 * HTML landing page (index.html, uvDocs.privacy), with the product name
 * corrected to "Universe ICOS".
 */

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Universe ICOS collects, uses and protects your information.",
};

const SECTIONS: { heading: string; paragraphs?: string[]; list?: string[] }[] = [
  {
    heading: "Introduction",
    paragraphs: [
      'This Privacy Policy explains how Universe ICOS ("Universe ICOS," "we," "us" or "our") collects, uses and protects information in connection with Universe ICOS v1.0. This document is product policy and is not intended as legal advice.',
    ],
  },
  {
    heading: "Information we collect",
    paragraphs: ["To operate Universe ICOS, we collect information including:"],
    list: [
      "Account information, such as your name and university",
      "Your email address, used for authentication and communication",
      "Authentication information necessary to secure your account",
      "Content you voluntarily submit while using Universe ICOS, such as messages, posts or community content",
      "Basic technical information necessary to operate the service, such as device and usage data",
    ],
  },
  {
    heading: "How we use your information",
    paragraphs: ["We use the information we collect to:"],
    list: [
      "Create and manage your account",
      "Authenticate you and keep your account secure",
      "Operate Universe ICOS and provide its campus features",
      "Improve and maintain the platform",
      "Prevent fraud, abuse and security incidents",
      "Send communications related to the service, such as verification codes",
    ],
  },
  {
    heading: "User-generated content",
    paragraphs: [
      "Depending on the features available in your version of Universe ICOS, you may create content such as messages, posts, study or community content, or other information. This content is associated with your account and may be visible to other users within your campus ecosystem, depending on the feature.",
      "Some features, such as Campus Whisper, let you post without your name being shown to other users. Posts made through these features are not fully anonymous to Universe ICOS itself — we may retain information that allows us to connect a post to an account internally, which we may use for safety, security and enforcement of our Community Standards.",
    ],
  },
  {
    heading: "AI Tutor",
    paragraphs: [
      "AI Tutor lets you ask questions and receive AI-generated academic assistance. Conversations you have with AI Tutor may be processed, including by third-party AI service providers, in order to generate responses and to improve the feature's reliability and safety.",
    ],
  },
  {
    heading: "Information sharing",
    paragraphs: [
      "Universe ICOS does not sell your personal information. Information may be processed by service providers that help us operate the platform, such as infrastructure, authentication and communications providers, under obligations to protect your data.",
    ],
  },
  {
    heading: "Security",
    paragraphs: [
      "We use reasonable technical and organizational safeguards designed to protect your information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    heading: "Data retention",
    paragraphs: [
      "We retain information for as long as reasonably necessary to provide Universe ICOS, comply with legal obligations, resolve disputes and maintain the security and integrity of the platform.",
    ],
  },
  {
    heading: "Your rights",
    paragraphs: [
      "Depending on your location and applicable law, you may have rights regarding your personal information, such as requesting access to, correction of, or deletion of certain data. Where such rights apply, we will work to honor requests in accordance with applicable law and our operational capabilities.",
    ],
  },
  {
    heading: "Children's privacy",
    paragraphs: [
      "Universe ICOS is intended for university students and is not designed specifically for children. We do not knowingly direct Universe ICOS toward children.",
    ],
  },
  {
    heading: "Changes to this policy",
    paragraphs: [
      "This policy may change as Universe ICOS evolves, including as new features are introduced. We will update this page to reflect material changes.",
    ],
  },
  {
    heading: "Contact",
    paragraphs: [
      "Questions about this Privacy Policy can be directed to [support email to be added].",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] text-campus-400">
        Universe ICOS
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        How Universe ICOS collects, uses and protects your information.
      </p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-base font-bold text-foreground">
              {section.heading}
            </h2>
            {section.paragraphs?.map((p) => (
              <p key={p.slice(0, 40)} className="mt-3 text-sm leading-relaxed text-slate-400">
                {p}
              </p>
            ))}
            {section.list && (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-400">
                {section.list.map((item) => (
                  <li key={item.slice(0, 40)}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
