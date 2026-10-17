import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { apiRequest } from './admin/api';

const AdminApp = lazy(() => import('./admin/AdminApp'));

const programs = [
  {
    name: 'Playway',
    description: 'A playful introduction to learning through exploration and creative activities.',
    accent: 'rose',
    symbol: '✳',
  },
  {
    name: 'Nursery',
    description: 'A welcoming space to build early foundations through play and discovery.',
    accent: 'mint',
    symbol: '●',
  },
  {
    name: 'LKG',
    description: 'Growing confidence with foundational literacy, numeracy, and creativity.',
    accent: 'yellow',
    symbol: '△',
  },
  {
    name: 'UKG',
    description: 'Encouraging curious learners through guided activities and individual attention.',
    accent: 'plum',
    symbol: '✿',
  },
];

const strengths = [
  {
    title: 'Individual attention',
    description: 'Every child is encouraged to learn and grow at their own pace.',
    symbol: '01',
  },
  {
    title: 'A safe, welcoming environment',
    description: 'A caring setting where children can feel comfortable exploring.',
    symbol: '02',
  },
  {
    title: 'Creative activities and play',
    description: 'Hands-on activities make room for imagination and joyful discovery.',
    symbol: '03',
  },
  {
    title: 'Foundational learning',
    description: 'Early literacy and numeracy are part of a balanced learning approach.',
    symbol: '04',
  },
  {
    title: 'Parent–teacher communication',
    description: 'Open communication helps families stay connected to their child’s learning.',
    symbol: '05',
  },
];

const navigation = [
  { label: 'About', to: '/#about' },
  { label: 'Programmes', to: '/#programmes' },
  { label: 'Our approach', to: '/#why-balvatika' },
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="topbar">
      <Link className="brand-block" to="/" aria-label="Balvatika Preschool home" onClick={closeMenu}>
        <span className="brand-mark" aria-hidden="true">Logo</span>
        <span>
          <span className="brand-name">Balvatika</span>
          <span className="brand-tag">Preschool</span>
        </span>
      </Link>

      <button
        type="button"
        className="menu-toggle"
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? 'Close' : 'Menu'}
      </button>

      <nav
        id="primary-navigation"
        className={`main-nav ${menuOpen ? 'open' : ''}`}
        aria-label="Main navigation"
      >
        {navigation.map(({ label, to }) => (
          <Link key={to} to={to} className="nav-link" onClick={closeMenu}>
            {label}
          </Link>
        ))}
        <NavLink
          to="/contact"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          onClick={closeMenu}
        >
          Contact
        </NavLink>
        <Link className="nav-cta" to="/contact" onClick={closeMenu}>
          Enquire now
        </Link>
        <Link className="nav-login" to="/admin/login" onClick={closeMenu}>
          Admin login
        </Link>
      </nav>
    </header>
  );
}

function HomePage() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;

    const section = document.getElementById(location.hash.slice(1));
    section?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash]);

  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow">Warm beginnings. Joyful learning.</span>
          <h1 id="hero-title">Little steps, big beginnings.</h1>
          <p>
            Every child has their own way of discovering the world. At Balvatika Preschool,
            we bring together caring guidance, creative play, and early learning to help
            little learners grow at their own pace.
          </p>
          <div className="hero-actions">
            <Link to="/contact" className="primary-button">Contact our school</Link>
            <a href="#programmes" className="secondary-button">Explore our programmes</a>
          </div>
          <ul className="feature-list" aria-label="What children can experience">
            <li>Individual attention</li>
            <li>Creative play</li>
            <li>Early learning</li>
          </ul>
        </div>

        <div className="hero-visual" role="img" aria-label="A cheerful abstract illustration of a child's learning journey">
          <span className="hero-sun" aria-hidden="true" />
          <span className="hero-rainbow" aria-hidden="true" />
          <span className="hero-cloud cloud-one" aria-hidden="true" />
          <span className="hero-cloud cloud-two" aria-hidden="true" />
          <span className="hero-flower flower-one" aria-hidden="true">✿</span>
          <span className="hero-flower flower-two" aria-hidden="true">✳</span>
          <span className="illustration-caption">A little room to bloom</span>
        </div>
      </section>

      <section className="section about-section" id="about" aria-labelledby="about-title">
        <div className="section-intro">
          <p className="eyebrow">A thoughtful start</p>
          <h2 id="about-title">A little curiosity can take children a long way.</h2>
        </div>
        <div className="about-copy">
          <p>
            Early learning is about more than lessons. It is a time to wonder, create,
            play, and begin building confidence in a caring environment.
          </p>
          <p>
            At Balvatika, creative activities and play sit alongside foundational
            literacy and numeracy, with individual attention for every child.
          </p>
          <Link className="text-link" to="/contact">Talk with our school <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="section programs-section" id="programmes" aria-labelledby="programmes-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Find your first step</p>
            <h2 id="programmes-title">Learning for little learners</h2>
          </div>
          <p>Explore the school’s programme levels. Ask us what may suit your child.</p>
        </div>
        <div className="program-grid">
          {programs.map((program, index) => (
            <article className={`program-card accent-${program.accent}`} key={program.name}>
              <div className="program-card-top">
                <span className="program-symbol" aria-hidden="true">{program.symbol}</span>
                <span className="program-number">0{index + 1}</span>
              </div>
              <h3>{program.name}</h3>
              <p>{program.description}</p>
              <Link to="/contact" aria-label={`Ask about ${program.name}`}>Ask about this programme <span aria-hidden="true">↗</span></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section approach-section" id="why-balvatika" aria-labelledby="approach-title">
        <div className="approach-heading">
          <p className="eyebrow">Growing together</p>
          <h2 id="approach-title">Care in the little things. Space to grow.</h2>
          <p>
            A welcoming early learning experience is built through caring relationships,
            thoughtful guidance, and room for children to explore.
          </p>
        </div>
        <div className="strength-grid">
          {strengths.map((strength) => (
            <article className="strength-card" key={strength.title}>
              <span className="strength-number">{strength.symbol}</span>
              <h3>{strength.title}</h3>
              <p>{strength.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section gallery-section" id="gallery" aria-labelledby="gallery-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A glimpse of learning</p>
            <h2 id="gallery-title">Little moments, big meaning</h2>
          </div>
          <p>School photographs will appear here when provided.</p>
        </div>
        <div className="gallery-grid">
          <div className="gallery-placeholder gallery-large" role="img" aria-label="Photo placeholder: a real school activity photo can be added here">
            <span className="placeholder-art art-play" aria-hidden="true"><span>✳</span><span>●</span><span>△</span></span>
            <span className="placeholder-label">Photo placeholder · Creative play</span>
          </div>
          <div className="gallery-placeholder" role="img" aria-label="Photo placeholder: a real classroom photo can be added here">
            <span className="placeholder-art art-class" aria-hidden="true"><span>▱</span><span>◡</span></span>
            <span className="placeholder-label">Photo placeholder · Learning together</span>
          </div>
          <div className="gallery-placeholder" role="img" aria-label="Photo placeholder: a real school moment photo can be added here">
            <span className="placeholder-art art-grow" aria-hidden="true"><span>✿</span><span>⌁</span></span>
            <span className="placeholder-label">Photo placeholder · Little discoveries</span>
          </div>
        </div>
        <p className="gallery-note">Illustrative placeholders only — no stock or generated school photos are used.</p>
      </section>

      <section className="contact-banner" aria-labelledby="contact-banner-title">
        <div>
          <p className="eyebrow">Let’s begin a conversation</p>
          <h2 id="contact-banner-title">Questions about your child’s next little step?</h2>
          <p>Ask a question or arrange a visit with the school.</p>
        </div>
        <Link to="/contact" className="light-button">Contact our school <span aria-hidden="true">→</span></Link>
        <span className="banner-sparkle" aria-hidden="true">✳</span>
      </section>
      <Footer />
    </main>
  );
}

function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionNotice, setSubmissionNotice] = useState(null);
  const [submissionError, setSubmissionError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    setSubmissionNotice(null);
    setSubmissionError('');
    const formData = new FormData(form);
    try {
      const result = await apiRequest('/contact-enquiries', {
        method: 'POST',
        body: JSON.stringify({
          parentName: formData.get('parentName'),
          phoneNumber: formData.get('phoneNumber'),
          classOfInterest: formData.get('classOfInterest'),
          message: formData.get('message'),
          website: formData.get('website'),
        }),
      });
      setSubmissionNotice(result.notificationStatus);
      form.reset();
    } catch (error) {
      setSubmissionError(error.status === 429
        ? 'Too many enquiries were submitted from this connection. Please wait before trying again.'
        : error.message || 'Your enquiry could not be submitted. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <main className="contact-page">
        <section className="contact-intro" aria-labelledby="contact-title">
          <p className="eyebrow">We’re here to help</p>
          <h1 id="contact-title">Let’s make room for your questions.</h1>
          <p>
            Tell us a little about what you’re looking for, or get in touch to arrange a
            visit. We’ll be glad to talk about the school and its programmes.
          </p>
          <div className="contact-promise">
            <span aria-hidden="true">✿</span>
            <p>Every child has their own way of discovering the world.</p>
          </div>
        </section>

        <section className="contact-form-panel" aria-labelledby="form-title">
          <div className="form-heading">
            <div>
              <p className="eyebrow">Start a conversation</p>
              <h2 id="form-title">Send an enquiry</h2>
            </div>
            <span className="development-badge">Private enquiry</span>
          </div>
          <p className="form-intro">Share your details and what you’d like to know.</p>

          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-honeypot" aria-hidden="true">
              <label htmlFor="contact-website">Leave this field blank</label>
              <input id="contact-website" name="website" tabIndex="-1" autoComplete="off" />
            </div>
            <label htmlFor="parent-name">Parent’s name <span aria-hidden="true">*</span></label>
            <input id="parent-name" name="parentName" autoComplete="name" maxLength="100" required />

            <label htmlFor="phone-number">Phone number <span aria-hidden="true">*</span></label>
            <input
              id="phone-number"
              name="phoneNumber"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              maxLength="20"
              required
              aria-describedby="phone-hint"
            />
            <span className="field-hint" id="phone-hint">Please include a number where the school can reach you.</span>

            <label htmlFor="class-interest">Class of interest <span aria-hidden="true">*</span></label>
            <select id="class-interest" name="classOfInterest" defaultValue="" required>
              <option value="" disabled>Select a class</option>
              <option value="Playway">Playway</option>
              <option value="Nursery">Nursery</option>
              <option value="LKG">LKG</option>
              <option value="UKG">UKG</option>
            </select>

            <label htmlFor="enquiry-message">Your message <span aria-hidden="true">*</span></label>
            <textarea id="enquiry-message" name="message" rows="5" maxLength="2000" required />
            <span className="field-hint">Please don’t include sensitive personal information.</span>

            {submissionError && (
              <p className="stub-notice" role="alert">{submissionError}</p>
            )}
            {submissionNotice === 'Sent' && (
              <p className="stub-notice" role="status">
                Thank you. Your enquiry has been received and a notification was sent to the school.
              </p>
            )}
            {submissionNotice === 'Failed' && (
              <p className="stub-notice" role="status">
                Your enquiry was received and saved, but the school notification could not be sent automatically.
                Please contact the school directly if you need an immediate response.
              </p>
            )}

            <button className="primary-button submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending…' : 'Send enquiry'}
            </button>
            <p className="privacy-note">
              Your enquiry is stored securely so the school can follow up. Please don’t include sensitive personal information.
            </p>
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <Link className="brand-block footer-brand" to="/" aria-label="Balvatika Preschool home">
          <span className="brand-mark" aria-hidden="true">Logo</span>
          <span>
            <span className="brand-name">Balvatika</span>
            <span className="brand-tag">Preschool</span>
          </span>
        </Link>
        <p>Care, creativity, play, and early learning for little learners.</p>
        <nav className="footer-links" aria-label="Footer navigation">
          <Link to="/#about">About</Link>
          <Link to="/#programmes">Programmes</Link>
          <Link to="/#gallery">Gallery</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>Balvatika Preschool</span>
        <span>A warm beginning for every little learner.</span>
      </div>
    </footer>
  );
}

function App() {
  const location = useLocation();
  if (location.pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<main className="admin-loading" aria-label="Loading administration">Loading…</main>}>
        <AdminApp />
      </Suspense>
    );
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header />
      <div id="main-content" tabIndex="-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
