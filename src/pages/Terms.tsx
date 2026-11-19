import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { usePageMeta } from "../hooks/usePageMeta";
import {
  ELITETEE_PRIVACY_PATH,
  ELITETEE_TERMS_EFFECTIVE_DATE,
  ELITETEE_TERMS_LAST_UPDATED,
  ELITETEE_TERMS_VERSION,
} from "../lib/termsOfUse";

const CONTACT_EMAIL = "membership@elitetee.club";

/**
 * Member-facing Terms of Use draft for product/App Store compliance work.
 * Marked placeholders require owner/counsel review. Not attorney-approved.
 */
export function Terms() {
  usePageMeta({
    title: "EliteTee Terms of Use",
    description:
      "Terms of Use for EliteTee, including member conduct, user-generated content, reporting, and account suspension.",
  });

  return (
    <>
      <Navbar />
      <main className="about-page legal-page">
        <article className="section section--compact about-section" aria-labelledby="terms-heading">
          <div className="layout about-layout legal-layout">
            <header className="about-header legal-header">
              <p className="legal-eyebrow">ELITETEE LLC</p>
              <h1 id="terms-heading">Terms of Use</h1>
              <p className="legal-meta">
                Effective date: {ELITETEE_TERMS_EFFECTIVE_DATE}
                <span aria-hidden="true"> · </span>
                Last updated: {ELITETEE_TERMS_LAST_UPDATED}
                <span aria-hidden="true"> · </span>
                Document version: {ELITETEE_TERMS_VERSION}
              </p>
            </header>

            <div className="about-prose prose legal-prose">
              <p className="legal-draft-notice" role="note">
                <strong>Draft for review.</strong> This document is a working Terms of Use for
                EliteTee product and App Store compliance. It is <strong>not</strong> legal advice
                and has <strong>not</strong> been approved by an attorney. Bracketed placeholders
                such as <code>[LEGAL REVIEW]</code> must be confirmed by ELITETEE LLC before you
                treat this as a final contract.
              </p>
              <p>
                These Terms of Use (&quot;Terms&quot;) govern access to and use of the EliteTee
                website, member portal, and related mobile applications (collectively, the
                &quot;Services&quot;) operated by ELITETEE LLC (&quot;EliteTee,&quot; &quot;we,&quot;
                &quot;us,&quot; or &quot;our&quot;). By creating an account, signing in, applying for
                membership, or otherwise using the Services, you agree to these Terms and our{" "}
                <Link to={ELITETEE_PRIVACY_PATH}>Privacy Policy</Link>.
              </p>
            </div>

            <TermsSection id="eligibility" title="1. Eligibility and membership">
              <p>
                EliteTee is a curated private golf membership network. Access to member features may
                require an approved application, invitation, or other authorization. You represent
                that the information you provide is accurate and that you will keep your account
                credentials confidential.
              </p>
              <p>
                <span className="legal-placeholder">
                  [LEGAL REVIEW: Confirm age of majority / minimum age, geographic restrictions, and
                  any membership fee language if/when paid plans launch.]
                </span>
              </p>
            </TermsSection>

            <TermsSection id="account" title="2. Accounts and security">
              <p>
                You are responsible for activity under your account. Notify us promptly at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> if you suspect unauthorized
                use. We may require authentication steps, limit access, or suspend accounts to
                protect members and the Services.
              </p>
            </TermsSection>

            <TermsSection id="ugc" title="3. User-generated content">
              <p>
                Members may create or share content through the Services, including profiles, feed
                posts, comments, photos, course experiences, messages, applications, and other
                materials (collectively, &quot;Member Content&quot;).
              </p>
              <p>
                You retain ownership of your Member Content. You grant EliteTee a non-exclusive,
                worldwide, royalty-free license to host, store, reproduce, display, and distribute
                Member Content solely as needed to operate and improve the Services and as otherwise
                described in the Privacy Policy.
              </p>
              <p>
                <span className="legal-placeholder">
                  [LEGAL REVIEW: Confirm license scope, duration, and sublicensing needs for hosting
                  providers / App Store distribution.]
                </span>
              </p>
            </TermsSection>

            <TermsSection id="prohibited" title="4. Prohibited conduct and objectionable content">
              <p>You agree not to post, share, transmit, or otherwise use the Services to:</p>
              <ul>
                <li>
                  Publish objectionable, offensive, pornographic, sexually explicit, or otherwise
                  inappropriate content
                </li>
                <li>
                  Harass, threaten, bully, stalk, defame, or abuse another person, or encourage
                  others to do so
                </li>
                <li>
                  Discriminate against or attack others based on protected characteristics, or post
                  hateful or extremist content
                </li>
                <li>
                  Impersonate another person or misrepresent your identity, affiliation, or
                  credentials
                </li>
                <li>
                  Share others&apos; private information without permission, or otherwise invade
                  privacy
                </li>
                <li>
                  Spam, scam, phish, or engage in fraudulent, deceptive, or commercial solicitation
                  that is not expressly permitted by EliteTee
                </li>
                <li>
                  Infringe intellectual property or other rights, or post content you do not have
                  the right to share
                </li>
                <li>
                  Attempt to bypass security, scrape the Services without permission, interfere with
                  other members&apos; use, or misuse reporting/blocking tools
                </li>
                <li>Violate applicable law or these Terms</li>
              </ul>
              <p>
                EliteTee may remove Member Content and restrict or terminate accounts that violate
                these rules, including for abusive users.
              </p>
            </TermsSection>

            <TermsSection id="reporting" title="5. Reporting, blocking, and moderation">
              <p>
                If you encounter objectionable content or abusive behavior, you should report it
                using in-product reporting tools when available, and/or contact{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Members may also be able to
                block other members so that blocked members&apos; content is removed from the
                blocking member&apos;s experience.
              </p>
              <p>
                We aim to review reports of objectionable content and take appropriate action within
                24 hours where reasonably practicable. Actions may include removing or restricting
                content, warning members, suspending or ejecting accounts, and preserving records
                needed for safety and legal compliance.
              </p>
              <p>
                <span className="legal-placeholder">
                  [LEGAL REVIEW: Confirm 24-hour review commitment language and any required
                  escalation / law-enforcement cooperation wording.]
                </span>
              </p>
            </TermsSection>

            <TermsSection id="enforcement" title="6. Content removal and account suspension">
              <p>
                We may, at our discretion and without prior notice where appropriate, remove or
                disable access to Member Content, limit features, suspend portal access, or
                permanently eject accounts that violate these Terms or create risk for members or
                the Services. Ejection or suspension may prevent further sign-in to member features.
              </p>
              <p>
                <span className="legal-placeholder">
                  [LEGAL REVIEW: Confirm appeal process, notice practices, and refund language if
                  paid memberships apply.]
                </span>
              </p>
            </TermsSection>

            <TermsSection id="third-parties" title="7. Third-party services">
              <p>
                The Services may rely on third parties (for example, hosting, authentication, or app
                store platforms). Those services are subject to their own terms and privacy
                practices. Apple is not a party to these Terms and is not responsible for the
                Services.
              </p>
            </TermsSection>

            <TermsSection id="disclaimers" title="8. Disclaimers">
              <p>
                The Services are provided on an &quot;as is&quot; and &quot;as available&quot; basis
                to the fullest extent permitted by law. EliteTee does not guarantee uninterrupted
                or error-free operation, or that Member Content will always be available or
                appropriate.
              </p>
              <p>
                <span className="legal-placeholder">
                  [LEGAL REVIEW: Insert governing warranty disclaimer and limitation of liability
                  language appropriate for ELITETEE LLC&apos;s jurisdiction.]
                </span>
              </p>
            </TermsSection>

            <TermsSection id="governing-law" title="9. Governing law">
              <p>
                <span className="legal-placeholder">
                  [LEGAL REVIEW: Governing law and venue — e.g., State of ____, United States.
                  Confirm arbitration / class-action waiver if desired.]
                </span>
              </p>
            </TermsSection>

            <TermsSection id="changes" title="10. Changes to these Terms">
              <p>
                We may update these Terms from time to time. When we do, we will revise the
                effective date and document version shown above and post the updated Terms at{" "}
                <Link to="/terms">https://www.elitetee.club/terms</Link>. Continued use of the
                Services after changes become effective constitutes acceptance of the updated Terms,
                except where additional consent is required by law or by the Services (including a
                new required acceptance for a new Terms version).
              </p>
            </TermsSection>

            <TermsSection id="contact" title="11. Contact">
              <p>
                ELITETEE LLC
                <br />
                Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </p>
              <p>
                <span className="legal-placeholder">
                  [LEGAL REVIEW: Add business mailing address and any registered agent details
                  required for consumer disclosures.]
                </span>
              </p>
              <p>
                Privacy questions are also addressed in our{" "}
                <Link to={ELITETEE_PRIVACY_PATH}>Privacy Policy</Link>.
              </p>
            </TermsSection>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

function TermsSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="about-block legal-block" aria-labelledby={id}>
      <h2 id={id} className="about-block-title">
        {title}
      </h2>
      <div className="about-prose prose legal-prose">{children}</div>
    </section>
  );
}
