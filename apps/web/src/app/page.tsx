import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { getWebsitePageData, safeHref } from "@/lib/website";

const fallbackNavigation = [
  { label: "मंदिर परिचय", target: "#about" },
  { label: "कार्यक्रम", target: "#events" },
  { label: "सेवा एवं दान", target: "#seva" },
  { label: "गैलरी", target: "#gallery" },
  { label: "संपर्क", target: "#contact" },
];

const fallbackQuickLinks = [
  { number: "01", title: "मंदिर परिचय", description: "श्री आदिनाथ जिनालय और हमारी आध्यात्मिक विरासत के बारे में जानें।", href: "#about" },
  { number: "02", title: "कार्यक्रम एवं आयोजन", description: "आगामी धार्मिक कार्यक्रमों और सामुदायिक आयोजनों की जानकारी।", href: "#events" },
  { number: "03", title: "सेवा एवं सहयोग", description: "मंदिर की सेवा, दान और समाज के कार्यों में सहभागी बनें।", href: "#seva" },
];

export default async function HomePage() {
  const { config, apiConfigured } = await getWebsitePageData();
  if (apiConfigured && !config) notFound();

  const navigation = config?.header.navItems.length
    ? config.header.navItems
    : fallbackNavigation;
  const title = config?.hero.title ?? "आस्था का केंद्र। समाज की प्रेरणा।";
  const description = config?.hero.description
    ?? "श्री आदिनाथ जिनालय, बड़े बाबा खाराड़ी में आपका स्वागत है। जिनशासन की परंपरा, सेवा और समाज के मंगल कार्यों से जुड़ें।";
  const heroTarget = safeHref(config?.hero.ctaTarget) ?? "#about";
  const aboutTitle = config?.about.title ?? "जहाँ श्रद्धा मिलती है, समर्पण से।";
  const aboutBody = config?.about.body
    ?? "बड़े बाबा खाराड़ी केवल एक मंदिर नहीं, बल्कि श्रद्धा, संस्कार और सामुदायिक सेवा का साझा स्थान है। इस वेबसाइट के माध्यम से मंदिर की गतिविधियों, आयोजनों और सेवा के अवसरों से जुड़े रहें।";
  const contactEmail = config?.contact.email;
  const contactPhone = config?.contact.phone;
  const contactAddress = config?.contact.address;
  const events = config?.events.enabled ? config.events.items : [];
  const gallery = config?.gallery.enabled ? config.gallery.items : [];
  const sevaItems = config?.seva.enabled ? config.seva.items : [];
  const primary = config?.theme.primary;

  return (
    <main style={primary ? ({ "--saffron": primary } as CSSProperties) : undefined}>
      <div className="announcement">{config?.hero.eyebrow ?? "श्री आदिनाथ जिनालय · खाराड़ी, पुणे"}</div>
      <header className="site-header">
        <a className="brand" href="/" aria-label="मंदिर होम">
          {config?.header.logoUrl
            ? <img className="tenant-logo" src={config.header.logoUrl} alt="" />
            : <span className="brand-mark" aria-hidden="true">ॐ</span>}
          <span><strong>{config?.hero.title ?? "बड़े बाबा खाराड़ी"}</strong><small>{config?.about.title ?? "श्री आदिनाथ जिनालय"}</small></span>
        </a>
        <nav aria-label="मुख्य नेविगेशन">
          {navigation.map((item, index) => {
            const href = safeHref(item.target);
            return href ? <a key={item.target + index} href={href}>{item.label}</a> : null;
          })}
        </nav>
        <a className="header-cta" href={safeHref(config?.seva.items[0]?.target) ?? "#seva"}>सेवा से जुड़ें <span aria-hidden="true">↗</span></a>
      </header>

      <section className="hero">
        <div className="hero-pattern" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow"><span /> {config?.hero.subtitle ?? "अहिंसा · संयम · आत्मकल्याण"}</p>
          <h1>{title}</h1>
          <p className="hero-description">{description}</p>
          <div className="hero-actions">
            <a className="button-primary" href={heroTarget}>{config?.hero.ctaLabel ?? "मंदिर के बारे में"} <span aria-hidden="true">↗</span></a>
            <a className="button-quiet" href="#events">आगामी कार्यक्रम <span aria-hidden="true">→</span></a>
          </div>
          <div className="hero-note"><span className="note-symbol">✳</span><span><strong>एक साथ, धर्म और सेवा के पथ पर</strong><small>{config?.footer.tagline ?? "बड़े बाबा खाराड़ी जैन समाज"}</small></span></div>
          {config?.quickInfo.length ? <div className="hero-info">{config.quickInfo.slice(0, 2).map((item) => <div key={item.title}><strong>{item.title}</strong><span>{item.value}</span>{item.secondary ? <small>{item.secondary}</small> : null}</div>)}</div> : null}
        </div>
        <div className="hero-art" role="img" aria-label={config?.hero.imageUrl ? "मंदिर की तस्वीर" : "मंदिर का चित्र"}>
          <div className="art-frame" style={config?.hero.imageUrl?.startsWith("https://") ? { backgroundImage: `linear-gradient(180deg, transparent 55%, #251b12a8), url("${config.hero.imageUrl}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
            {!config?.hero.imageUrl ? <>
              <div className="sun-disc" />
              <div className="temple-drawing" aria-hidden="true">
                <div className="spire"><i /><i /><i /><b /></div>
                <div className="roof roof-one" /><div className="roof roof-two" />
                <div className="temple-body"><div className="arch"><span>ॐ</span></div><div className="door" /></div>
                <div className="steps" />
              </div>
            </> : null}
            <div className="art-caption"><span>{config?.about.title ?? "श्री आदिनाथ जिनालय"}</span><span>{contactAddress ?? "खाराड़ी · पुणे"}</span></div>
          </div>
          <span className="art-seal">णमो<br />अरिहंताणं</span>
        </div>
        <div className="hero-bottom"><span>धर्मो रक्षति रक्षितः</span><span>01 — 04</span></div>
      </section>

      <section className="intro section-wrap" id="about">
        <div className="section-kicker">हमारा जिनालय <span>✳</span></div>
        <div className="intro-grid">
          <h2>{aboutTitle}</h2>
          <p>{aboutBody}</p>
        </div>
        <div className="quick-links">
          {(config?.quickInfo.length ? config.quickInfo.slice(0, 3).map((item, index) => ({
            number: String(index + 1).padStart(2, "0"),
            title: item.title,
            description: item.value,
            href: safeHref(item.actionUrl) ?? "#contact",
          })) : fallbackQuickLinks).map((item) => <a className="quick-card" href={item.href} key={item.number}><span className="card-number">{item.number}</span><span className="card-arrow">↗</span><h3>{item.title}</h3><p>{item.description}</p><span className="card-link">और जानें <span aria-hidden="true">→</span></span></a>)}
        </div>
      </section>

      <section className="events-band" id="events">
        <div><p className="section-kicker">{config?.events.title ?? "समाज और जिनशासन"}</p><h2>धर्म से जुड़ें।<br /><em>समाज के साथ बढ़ें।</em></h2></div>
        <div className="event-list">
          {events.length ? events.slice(0, 3).map((event) => <article className="event-item" key={event.id}>
            {event.dateLabel ? <small>{event.dateLabel}</small> : null}
            <strong>{event.title}</strong>
            {event.description ? <p>{event.description}</p> : null}
            {event.ctaUrl && safeHref(event.ctaUrl) ? <a className="text-link" href={safeHref(event.ctaUrl)}>{event.ctaLabel ?? "और जानें"} →</a> : null}
          </article>) : <p>आगामी कार्यक्रमों, धार्मिक अवसरों और समाज की गतिविधियों की जानकारी यहाँ प्रकाशित होगी।</p>}
        </div>
        <a className="button-primary" href="#contact">संपर्क करें <span aria-hidden="true">↗</span></a>
      </section>

      {gallery.length ? <section className="gallery-section section-wrap" id="gallery">
        <div className="section-kicker">{config?.gallery.title ?? "मंदिर गैलरी"} <span>✳</span></div>
        <div className="gallery-grid">{gallery.slice(0, 12).map((item) => <figure key={item.id}><img src={item.imageUrl} alt={item.alt ?? item.title ?? "मंदिर की तस्वीर"} loading="lazy" /><figcaption>{item.title}</figcaption></figure>)}</div>
      </section> : null}

      <section className="seva-section section-wrap" id="seva">
        <div className="section-kicker">{config?.seva.title ?? "सेवा ही साधना"} <span>✳</span></div>
        <div className="seva-grid"><h2>आपका सहयोग,<br /><em>सामूहिक संबल।</em></h2><div>
          <p>मंदिर और समाज के सेवा कार्यों में अपनी सहभागिता दर्ज करें। सेवा के अवसरों और सहयोग की जानकारी के लिए संपर्क करें।</p>
          {sevaItems.length ? <div className="seva-actions">{sevaItems.slice(0, 8).map((item) => <a className="text-link" href={safeHref(item.target) ?? "#contact"} key={item.id}>{item.label} <span aria-hidden="true">→</span></a>)}</div> : null}
          <a className="text-link" href="#contact">सेवा के बारे में पूछें <span aria-hidden="true">→</span></a>
        </div></div>
      </section>

      <footer id="contact">
        <div className="footer-brand"><span className="brand-mark">ॐ</span><span><strong>{config?.hero.title ?? "बड़े बाबा खाराड़ी"}</strong><small>{config?.about.title ?? "श्री आदिनाथ जिनालय · पुणे"}</small></span></div>
        <p>अहिंसा परमो धर्मः</p>
        {contactAddress ? <span className="footer-contact">{contactAddress}</span> : null}
        {contactPhone ? <a href={`tel:${contactPhone.replace(/[^+0-9]/g, "")}`}>कॉल करें ↗</a> : null}
        {config?.contact.whatsapp ? <a href={`https://wa.me/${config.contact.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">WhatsApp ↗</a> : null}
        {contactEmail ? <a href={`mailto:${contactEmail}`}>संपर्क करें ↗</a> : <a href="mailto:contact@badebabakharadi.com">संपर्क करें ↗</a>}
        {config?.contact.mapUrl && safeHref(config.contact.mapUrl) ? <a href={safeHref(config.contact.mapUrl)} target="_blank" rel="noreferrer">मैप देखें ↗</a> : null}
        <small className="copyright">© {new Date().getFullYear()} {config?.hero.title ?? "बड़े बाबा खाराड़ी"} · JCP</small>
      </footer>
    </main>
  );
}
