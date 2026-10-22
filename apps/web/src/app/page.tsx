const navigation = [
  ["मंदिर परिचय", "#about"],
  ["कार्यक्रम", "#events"],
  ["सेवा एवं दान", "#seva"],
  ["गैलरी", "#gallery"],
  ["संपर्क", "#contact"],
];

const quickLinks = [
  { number: "01", title: "मंदिर परिचय", description: "श्री आदिनाथ जिनालय और हमारी आध्यात्मिक विरासत के बारे में जानें।", href: "#about" },
  { number: "02", title: "कार्यक्रम एवं आयोजन", description: "आगामी धार्मिक कार्यक्रमों और सामुदायिक आयोजनों की जानकारी।", href: "#events" },
  { number: "03", title: "सेवा एवं सहयोग", description: "मंदिर की सेवा, दान और समाज के कार्यों में सहभागी बनें।", href: "#seva" },
];

export default function HomePage() {
  return (
    <main>
      <div className="announcement">श्री आदिनाथ जिनालय · खाराड़ी, पुणे</div>
      <header className="site-header">
        <a className="brand" href="#" aria-label="बड़े बाबा खाराड़ी होम">
          <span className="brand-mark" aria-hidden="true">ॐ</span>
          <span><strong>बड़े बाबा खाराड़ी</strong><small>श्री आदिनाथ जिनालय</small></span>
        </a>
        <nav aria-label="मुख्य नेविगेशन">
          {navigation.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <a className="header-cta" href="#seva">सेवा से जुड़ें <span aria-hidden="true">↗</span></a>
      </header>

      <section className="hero">
        <div className="hero-pattern" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow"><span /> अहिंसा · संयम · आत्मकल्याण</p>
          <h1>आस्था का केंद्र।<br /><em>समाज की प्रेरणा।</em></h1>
          <p className="hero-description">श्री आदिनाथ जिनालय, बड़े बाबा खाराड़ी में आपका स्वागत है। जिनशासन की परंपरा, सेवा और समाज के मंगल कार्यों से जुड़ें।</p>
          <div className="hero-actions">
            <a className="button-primary" href="#about">मंदिर के बारे में <span aria-hidden="true">↗</span></a>
            <a className="button-quiet" href="#events">आगामी कार्यक्रम <span aria-hidden="true">→</span></a>
          </div>
          <div className="hero-note"><span className="note-symbol">✳</span><span><strong>एक साथ, धर्म और सेवा के पथ पर</strong><small>बड़े बाबा खाराड़ी जैन समाज</small></span></div>
        </div>
        <div className="hero-art" role="img" aria-label="मंदिर की तस्वीर के लिए स्थान">
          <div className="art-frame">
            <div className="sun-disc" />
            <div className="temple-drawing" aria-hidden="true">
              <div className="spire"><i /><i /><i /><b /></div>
              <div className="roof roof-one" /><div className="roof roof-two" />
              <div className="temple-body"><div className="arch"><span>ॐ</span></div><div className="door" /></div>
              <div className="steps" />
            </div>
            <div className="art-caption"><span>श्री आदिनाथ जिनालय</span><span>खाराड़ी · पुणे</span></div>
          </div>
          <span className="art-seal">णमो<br />अरिहंताणं</span>
        </div>
        <div className="hero-bottom"><span>धर्मो रक्षति रक्षितः</span><span>01 — 04</span></div>
      </section>

      <section className="intro section-wrap" id="about">
        <div className="section-kicker">हमारा जिनालय <span>✳</span></div>
        <div className="intro-grid">
          <h2>जहाँ श्रद्धा मिलती है<br /><em>समर्पण से।</em></h2>
          <p>बड़े बाबा खाराड़ी केवल एक मंदिर नहीं, बल्कि श्रद्धा, संस्कार और सामुदायिक सेवा का साझा स्थान है। इस वेबसाइट के माध्यम से मंदिर की गतिविधियों, आयोजनों और सेवा के अवसरों से जुड़े रहें।</p>
        </div>
        <div className="quick-links">
          {quickLinks.map((item) => <a className="quick-card" href={item.href} key={item.number}><span className="card-number">{item.number}</span><span className="card-arrow">↗</span><h3>{item.title}</h3><p>{item.description}</p><span className="card-link">और जानें <span aria-hidden="true">→</span></span></a>)}
        </div>
      </section>

      <section className="events-band" id="events">
        <div><p className="section-kicker">समाज और जिनशासन</p><h2>धर्म से जुड़ें।<br /><em>समाज के साथ बढ़ें।</em></h2></div>
        <p>आगामी कार्यक्रमों, धार्मिक अवसरों, सूचनाओं और समाज की गतिविधियों के अपडेट यहाँ उपलब्ध होंगे।</p>
        <a className="button-primary" href="#contact">सभी अपडेट देखें <span aria-hidden="true">↗</span></a>
      </section>

      <section className="seva-section section-wrap" id="seva">
        <div className="section-kicker">सेवा ही साधना <span>✳</span></div>
        <div className="seva-grid"><h2>आपका सहयोग,<br /><em>सामूहिक संबल।</em></h2><div><p>मंदिर और समाज के सेवा कार्यों में अपनी सहभागिता दर्ज करें। आने वाले चरणों में यहाँ सत्यापित दान अभियान, सेवा के अवसर और पारदर्शी अपडेट JCP प्लेटफ़ॉर्म से जोड़े जाएँगे।</p><a className="text-link" href="#contact">सेवा के बारे में पूछें <span aria-hidden="true">→</span></a></div></div>
      </section>

      <footer id="contact"><div className="footer-brand"><span className="brand-mark">ॐ</span><span><strong>बड़े बाबा खाराड़ी</strong><small>श्री आदिनाथ जिनालय · पुणे</small></span></div><p>अहिंसा परमो धर्मः</p><a href="mailto:contact@badebabakharadi.com">संपर्क करें ↗</a><small className="copyright">© {new Date().getFullYear()} बड़े बाबा खाराड़ी · JCP</small></footer>
    </main>
  );
}
