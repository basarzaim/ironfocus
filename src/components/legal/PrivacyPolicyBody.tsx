import { PRIVACY_POLICY } from "../../content/privacyPolicy";

export function PrivacyPolicyBody() {
  return (
    <article className="space-y-5 text-sm leading-relaxed text-neutral-300">
      <p className="text-neutral-400">{PRIVACY_POLICY.intro}</p>

      {PRIVACY_POLICY.sections.map((section) => (
        <section key={section.heading}>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-200">
            {section.heading}
          </h3>
          <div className="mt-2 space-y-2 text-[13px] text-neutral-400">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets ? (
              <ul className="list-disc space-y-1 pl-5">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ))}
    </article>
  );
}
