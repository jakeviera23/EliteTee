import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { usePageMeta } from "../hooks/usePageMeta";
import {
  ELITETEE_GOVERNING_LAW_STATE,
  ELITETEE_MEMBERSHIP_CONTACT_EMAIL,
  ELITETEE_MIN_MEMBER_AGE,
  ELITETEE_PRIVACY_PATH,
  ELITETEE_PUBLIC_WEBSITE,
  ELITETEE_TERMS_EFFECTIVE_DATE,
  ELITETEE_TERMS_LAST_UPDATED,
  ELITETEE_TERMS_VERSION,
} from "../lib/termsOfUse";

const CONTACT_EMAIL = ELITETEE_MEMBERSHIP_CONTACT_EMAIL;

/**
 * Member-facing Terms of Use for EliteTee LLC.
 * Proposed operating terms for product/App Store compliance.
 * Not attorney-approved; remaining owner/legal confirmation items are marked below.
 */
export function Terms() {
  usePageMeta({
    title: "EliteTee Terms of Use",
    description:
      "Terms of Use for EliteTee LLC, including member conduct, user-generated content, reporting, blocking, and account suspension.",
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
                <strong>Proposed terms — owner/legal confirmation required.</strong> This document
                is an operating Terms of Use for EliteTee product and App Store compliance. It is{" "}
                <strong>not</strong> legal advice and has <strong>not</strong> been approved by an
                attorney. Items marked <code>[OWNER/LEGAL APPROVAL]</code> must be confirmed by
                EliteTee LLC before treating this as a final contract.
              </p>
              <p>
                These Terms of Use (&quot;Terms&quot;) govern access to and use of the EliteTee
                website at {ELITETEE_PUBLIC_WEBSITE}, the member portal, and related mobile
                applications (collectively, the &quot;Services&quot;) operated by EliteTee LLC, a{" "}
                {ELITETEE_GOVERNING_LAW_STATE} limited liability company (&quot;EliteTee,&quot;
                &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account, signing
                in, applying for membership, or otherwise using the Services, you agree to these
                Terms and our <Link to={ELITETEE_PRIVACY_PATH}>Privacy Policy</Link>.
              </p>
            </div>

            <TermsSection id="eligibility" title="1. Eligibility and membership">
              <p>
                EliteTee is a curated private golf membership network for adults. You must be at
                least {ELITETEE_MIN_MEMBER_AGE} years old to apply for or hold membership. By
                applying, registering, or using member features, you represent that you are{" "}
                {ELITETEE_MIN_MEMBER_AGE} or older and that the information you provide is accurate.
              </p>
              <p>
                Access to member features may require an approved application, invitation, or other
                authorization. You will keep your account credentials confidential and are
                responsible for activity under your account.
              </p>
              <p>
                <span className="legal-placeholder">
                  [OWNER/LEGAL APPROVAL: Confirm any geographic restrictions and membership fee /
                  refund language if or when paid plans launch.]
                </span>
              </p>
            </TermsSection>

            <TermsSection id="account" title="2. Accounts and security">
              <p>
                Notify us promptly at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> if you
                suspect unauthorized use. We may require authentication steps, limit access, or
                suspend accounts to protect members and the Services.
              </p>
            </TermsSection>

            <TermsSection id="ugc" title="3. User-generated content and license">
              <p>
                Members may create or share content through the Services, including profiles, feed
                posts, comments, photos, course experiences, messages, applications, and other
                materials (collectively, &quot;Member Content&quot;). You are solely responsible for
                Member Content you upload, post, or transmit, including its legality, accuracy, and
                that you have all rights needed to share it.
              </p>
              <p>
                You retain ownership of your Member Content. You grant EliteTee a non-exclusive,
                worldwide, royalty-free, sublicensable license to host, store, reproduce, process,
                display, distribute, and otherwise use Member Content solely as needed to operate,
                secure, moderate, and improve the Services, to comply with law, and as otherwise
                described in the Privacy Policy. This license ends when your Member Content is
                deleted from our systems, except for reasonable residual copies in backups, logs, or
                archives retained for security, legal, or operational purposes.
              </p>
              <p>
                <span className="legal-placeholder">
                  [OWNER/LEGAL APPROVAL: Confirm whether any broader marketing or promotional use of
                  Member Content is intended beyond operating the Services.]
                </span>
              </p>
            </TermsSection>

            <TermsSection id="prohibited" title="4. Prohibited conduct and objectionable content">
              <p>You agree not to post, share, transmit, or otherwise use the Services to:</p>
              <ul>
                <li>
                  Publish objectionable, offensive, pornographic, sexually explicit, graphic
                  violence, or otherwise inappropriate content
                </li>
                <li>
                  Harass, threaten, bully, stalk, defame, intimidate, or abuse another person, or
                  encourage others to do so
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
                <li>Engage in illegal activity or violate applicable law or these Terms</li>
              </ul>
              <p>
                EliteTee may remove Member Content and restrict, suspend, or terminate accounts that
                violate these rules, including for abusive users.
              </p>
            </TermsSection>

            <TermsSection id="reporting" title="5. Reporting, blocking, and moderation">
              <p>
                If you encounter objectionable content or abusive behavior, use the in-product
                Report tools (including for posts, comments, profiles, and messages) and/or contact{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Members may also Block
                other members. Blocking is designed to remove the blocked member&apos;s posts and
                related content from your feed and discovery experience and to prevent direct
                messaging between you and that member.
              </p>
              <p>
                <strong>Moderation policy.</strong> EliteTee maintains tools for administrators to
                review reports, hide or remove objectionable content, and suspend or eject accounts.
                We operate a process intended to review and take appropriate action on reports of
                objectionable content within 24 hours of submission. Appropriate action may include
                removing or restricting content, warning members, suspending or ejecting accounts,
                and preserving records needed for safety and legal compliance. Response timing
                depends on operator availability; members should still report promptly.
              </p>
              <p>
                Where required by law, EliteTee may cooperate with lawful requests from competent
                authorities. Nothing in these Terms requires EliteTee to take action that would
                violate law or compromise the security of the Services.
              </p>
            </TermsSection>

            <TermsSection id="enforcement" title="6. Content removal, suspension, and appeals">
              <p>
                We may, at our discretion and without prior notice where appropriate, remove or
                disable access to Member Content, limit features, suspend portal access, or
                permanently terminate membership for violations of these Terms or conduct that
                creates risk for members or the Services. Suspension or termination may prevent
                further use of member features even if a login session remains technically active.
              </p>
              <p>
                If you believe enforcement action was taken in error, you may request review by
                emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with your account
                email, a description of the action, and why you believe it should be reconsidered.
                We will consider good-faith appeals, but are not obligated to restore content or
                access.
              </p>
              <p>
                <span className="legal-placeholder">
                  [OWNER/LEGAL APPROVAL: Confirm refund or credit language if paid memberships
                  launch; none apply while membership is invitation/application based without a
                  published paid plan.]
                </span>
              </p>
            </TermsSection>

            <TermsSection id="third-parties" title="7. Third-party services">
              <p>
                The Services may rely on third parties (for example, hosting, authentication, email
                delivery, or app store platforms). Those services are subject to their own terms and
                privacy practices. Apple is not a party to these Terms and is not responsible for
                the Services.
              </p>
            </TermsSection>

            <TermsSection id="disclaimers" title="8. Disclaimers and limitation of liability">
              <p>
                THE SERVICES ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
                BASIS TO THE FULLEST EXTENT PERMITTED BY LAW. TO THE MAXIMUM EXTENT PERMITTED BY
                APPLICABLE LAW, ELITETEE DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR
                STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                PURPOSE, TITLE, AND NON-INFRINGEMENT. ELITETEE DOES NOT WARRANT THAT THE SERVICES
                WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE, OR THAT MEMBER CONTENT WILL ALWAYS BE
                AVAILABLE OR APPROPRIATE.
              </p>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ELITETEE AND ITS OFFICERS,
                DIRECTORS, MEMBERS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT,
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF
                PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATED TO
                YOUR USE OF THE SERVICES OR MEMBER CONTENT, EVEN IF ADVISED OF THE POSSIBILITY OF
                SUCH DAMAGES. TO THE MAXIMUM EXTENT PERMITTED BY LAW, ELITETEE&apos;S TOTAL
                LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE SERVICES IS LIMITED TO THE
                GREATER OF (A) THE AMOUNTS YOU PAID TO ELITETEE FOR THE SERVICES IN THE TWELVE (12)
                MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS (US $100).
              </p>
              <p>
                Some jurisdictions do not allow certain limitations; in those jurisdictions, our
                liability is limited to the fullest extent permitted by law.
              </p>
              <p>
                <span className="legal-placeholder">
                  [OWNER/LEGAL APPROVAL: Attorney review of disclaimer and liability caps for
                  Florida consumer / LLC context.]
                </span>
              </p>
            </TermsSection>

            <TermsSection id="governing-law" title="9. Governing law and disputes">
              <p>
                These Terms are governed by the laws of the State of{" "}
                {ELITETEE_GOVERNING_LAW_STATE}, United States, without regard to conflict-of-law
                rules, except where mandatory consumer-protection laws of your place of residence
                apply and cannot be waived.
              </p>
              <p>
                Subject to applicable law, you and EliteTee agree that state or federal courts
                located in {ELITETEE_GOVERNING_LAW_STATE} will have exclusive jurisdiction over
                disputes arising out of or relating to these Terms or the Services, and you consent
                to personal jurisdiction there.
              </p>
              <p>
                <span className="legal-placeholder">
                  [OWNER/LEGAL APPROVAL: Confirm preferred venue county/city in Florida, and whether
                  arbitration or a class-action waiver should be added.]
                </span>
              </p>
            </TermsSection>

            <TermsSection id="changes" title="10. Changes to these Terms">
              <p>
                We may update these Terms from time to time. When we do, we will revise the
                effective date and document version shown above and post the updated Terms on the
                Services (including at /terms). Continued use of the Services after changes become
                effective constitutes acceptance of the updated Terms, except where additional
                consent is required by law or by the Services (including a new required acceptance
                for a new Terms version).
              </p>
            </TermsSection>

            <TermsSection id="contact" title="11. Contact">
              <p>
                EliteTee LLC
                <br />
                Website:{" "}
                <a href={ELITETEE_PUBLIC_WEBSITE} rel="noreferrer">
                  {ELITETEE_PUBLIC_WEBSITE}
                </a>
                <br />
                Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </p>
              <p>
                <span className="legal-placeholder">
                  [OWNER/LEGAL APPROVAL: Insert the official Florida business mailing address from
                  company registration / registered agent records. Do not publish a personal
                  residential address without explicit approval.]
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
