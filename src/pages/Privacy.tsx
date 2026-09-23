import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { usePageMeta } from "../hooks/usePageMeta";

const EFFECTIVE_DATE = "September 23, 2026";
const CONTACT_EMAIL = "membership@elitetee.club";

export function Privacy() {
  usePageMeta({
    title: "EliteTee Privacy Policy",
    description: "Privacy Policy for EliteTee, the private golf membership network.",
  });

  return (
    <>
      <Navbar />
      <main className="about-page legal-page">
        <article className="section section--compact about-section" aria-labelledby="privacy-heading">
          <div className="layout about-layout legal-layout">
            <header className="about-header legal-header">
              <p className="legal-eyebrow">ELITETEE LLC</p>
              <h1 id="privacy-heading">Privacy Policy</h1>
              <p className="legal-meta">
                Effective date: {EFFECTIVE_DATE}
                <span aria-hidden="true"> · </span>
                Last updated: {EFFECTIVE_DATE}
              </p>
            </header>

            <div className="about-prose prose legal-prose">
              <p>
                This Privacy Policy explains how ELITETEE LLC (&quot;EliteTee,&quot; &quot;we,&quot;
                &quot;us,&quot; or &quot;our&quot;) collects, uses, and shares information when you
                use the EliteTee website, member portal, and related mobile applications
                (collectively, the &quot;Services&quot;). EliteTee is a curated private golf
                membership network. By using the Services, you agree to this Privacy Policy.
              </p>
            </div>

            <PrivacySection id="overview" title="1. Overview">
              <p>
                EliteTee helps serious golfers apply for membership, maintain member profiles,
                share rounds and course experiences, message other members, and discover courses
                and people in the network. We process personal information to operate these
                features, secure accounts, communicate with applicants and members, and improve
                the Services.
              </p>
            </PrivacySection>

            <PrivacySection id="information-we-collect" title="2. Information we collect">
              <p>Depending on how you use EliteTee, we may collect:</p>
              <h3>Membership applications</h3>
              <p>
                Information you submit when requesting membership, such as your name, email
                address, and other application details you choose to provide.
              </p>
              <h3>Account and authentication data</h3>
              <p>
                Credentials and authentication-related data needed to create and access an
                account (for example, email address and password, and session tokens managed by
                our authentication provider). We do not store payment card numbers in the
                EliteTee application for ordinary membership use while paid charging is not
                enabled.
              </p>
              <h3>Profile and golf information</h3>
              <p>
                Profile details you provide, which may include your name, photo or club logo,
                home club or additional clubs, location or regions, handicap or golf interests,
                business or industry information, travel preferences, and similar profile fields.
              </p>
              <h3>Community content</h3>
              <p>
                Content you create or interact with in the network, including posts, round
                reviews, course experiences, ratings, captions, comments, likes, saves, and
                related engagement activity.
              </p>
              <h3>Photos and media</h3>
              <p>
                Photos and other media you upload for profiles, rounds, posts, or messages,
                including associated metadata needed to store and display that media.
              </p>
              <h3>Messages</h3>
              <p>
                Direct messages and message attachments you send or receive through the Services.
                Message content is processed to deliver messaging features. We do not claim
                end-to-end encryption for messages.
              </p>
              <h3>Referrals and invites</h3>
              <p>
                Referral or invite codes and related attribution information when you invite
                someone or join through an invite or referral link.
              </p>
              <h3>Support and admin interactions</h3>
              <p>
                Communications with EliteTee for membership support, account help, moderation, or
                administrative review, including records needed to evaluate applications and
                operate the private network.
              </p>
              <h3>Technical and device data</h3>
              <p>
                Information automatically collected when you use the Services, such as IP address,
                browser or app type, device identifiers where provided by the platform, approximate
                location derived from network data, timestamps, and diagnostic or performance logs
                generated while operating the Services.
              </p>
              <h3>Local browser storage</h3>
              <p>
                On the web, EliteTee may use browser local storage and session storage (and similar
                client storage) to keep you signed in, remember preferences, store temporary
                invite/referral context, or improve product experience. We do not use third-party
                advertising cookies to sell your personal information.
              </p>
            </PrivacySection>

            <PrivacySection id="how-we-use" title="3. How we use information">
              <p>We use information to:</p>
              <ul>
                <li>Evaluate membership applications and manage member access</li>
                <li>Create and secure accounts, authenticate users, and prevent abuse</li>
                <li>Operate profiles, feeds, courses, messaging, referrals, and related features</li>
                <li>Store and deliver photos, attachments, and other user content</li>
                <li>Send transactional emails such as verification, invites, or account notices</li>
                <li>Provide member support and respond to requests</li>
                <li>Maintain safety, integrity, and reliability of the private network</li>
                <li>Analyze product usage in aggregate or limited operational forms to improve EliteTee</li>
                <li>Comply with law and enforce our terms and policies</li>
              </ul>
              <p>
                If you use AI-assisted features within EliteTee (such as Ask EliteTee), relevant
                queries and context needed to generate a response may be processed by our
                infrastructure and AI service providers solely to deliver that feature.
              </p>
            </PrivacySection>

            <PrivacySection id="sharing" title="4. How we share information">
              <p>
                We share personal information with service providers that help us operate EliteTee,
                only as needed to provide their services to us. These providers process information
                on our behalf and are not a sale of your personal information.
              </p>
              <p>Service providers and platforms we use include, as applicable:</p>
              <ul>
                <li>
                  <strong>Supabase</strong> — authentication, database, storage, and related backend
                  services
                </li>
                <li>
                  <strong>Vercel</strong> — website hosting and delivery
                </li>
                <li>
                  <strong>Resend</strong> and/or other transactional email infrastructure — sending
                  membership and account emails
                </li>
                <li>
                  <strong>AI providers</strong> (such as OpenAI where configured) — powering
                  optional concierge/AI features
                </li>
                <li>
                  <strong>Apple</strong> — distribution of the iOS app through TestFlight and the
                  App Store, subject to Apple&apos;s terms and privacy practices
                </li>
                <li>
                  <strong>Stripe</strong> — billing infrastructure that may be used when paid
                  membership is enabled; <em>live paid membership charging is not currently
                  required</em> for EliteTee membership access
                </li>
              </ul>
              <p>
                We may also share information if required by law, to protect rights and safety, in
                connection with a business transfer (such as a merger or asset sale), or with your
                direction.
              </p>
              <p>
                Other members may see profile and community content you choose to share within the
                private network according to product visibility settings and membership access
                rules.
              </p>
            </PrivacySection>

            <PrivacySection id="no-sale" title="5. No sale of personal data">
              <p>
                EliteTee does not sell personal information. We do not sell personal information
                for advertising and do not share personal information with third parties for their
                own independent marketing purposes.
              </p>
            </PrivacySection>

            <PrivacySection id="retention" title="6. Retention">
              <p>
                We retain personal information for as long as needed to provide the Services,
                maintain the private membership network, comply with legal obligations, resolve
                disputes, and enforce our agreements. Retention periods vary by data type. For
                example, account and profile data are generally kept while your account remains
                active; application and support records may be kept as needed for membership
                operations; and backups or logs may persist for a limited period after deletion
                requests are completed.
              </p>
            </PrivacySection>

            <PrivacySection id="security" title="7. Security">
              <p>
                We use administrative, technical, and organizational measures designed to protect
                personal information, including access controls and encrypted transport (HTTPS) for
                the Services. No method of transmission or storage is completely secure, and we
                cannot guarantee absolute security.
              </p>
            </PrivacySection>

            <PrivacySection id="rights" title="8. Your choices and requests">
              <p>
                Depending on where you live, you may have rights to request access to, correction
                of, or deletion of certain personal information we hold about you, or to ask
                questions about how we process your information.
              </p>
              <p>
                To make a request, email{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the subject line
                &quot;Privacy Request.&quot; We may need to verify your identity before responding.
                Some requests may be limited where we must retain information for security, legal,
                or legitimate membership-network operations.
              </p>
            </PrivacySection>

            <PrivacySection id="account-deletion" title="9. Account deletion">
              <p>
                To request deletion of your EliteTee account and associated personal information,
                contact{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will review the request
                and delete or de-identify personal information we no longer need to retain,
                subject to legal and operational requirements (for example, fraud prevention or
                records of membership decisions).
              </p>
            </PrivacySection>

            <PrivacySection id="children" title="10. Children">
              <p>
                EliteTee is intended for adults and is not directed to children under 13. We do not
                knowingly collect personal information from children under 13. If you believe a
                child has provided personal information, contact us and we will take appropriate
                steps to delete it.
              </p>
            </PrivacySection>

            <PrivacySection id="international" title="11. International users">
              <p>
                EliteTee is operated from the United States. If you access the Services from another
                country, your information may be processed in the United States and other locations
                where we or our service providers operate. Those places may have different data
                protection laws than your home country.
              </p>
            </PrivacySection>

            <PrivacySection id="changes" title="12. Changes to this policy">
              <p>
                We may update this Privacy Policy from time to time. When we do, we will revise the
                &quot;Last updated&quot; date above and post the updated policy at{" "}
                <Link to="/privacy">https://www.elitetee.club/privacy</Link>. Continued use of the
                Services after an update means you acknowledge the revised policy.
              </p>
            </PrivacySection>

            <PrivacySection id="contact" title="13. Contact">
              <p>
                ELITETEE LLC
                <br />
                Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                <br />
                Website:{" "}
                <a href="https://www.elitetee.club">https://www.elitetee.club</a>
              </p>
              <p>
                For privacy questions or requests, contact us at the email above. For general
                membership questions, you may also use the same address.
              </p>
            </PrivacySection>

            <p className="legal-back">
              <Link to="/" className="btn about-return">
                Back to EliteTee
              </Link>
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

function PrivacySection({
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
