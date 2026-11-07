import React, { useEffect, useState } from 'react';
import Main from './pages/Main.jsx';
import Boutique from './pages/Boutique.jsx';
import Atelier from './pages/Atelier.jsx';
import Contact from './pages/Contact.jsx';
import ProduitMan from './pages/ProduitMan.jsx';
import { PIECES } from './dc.js';

const TITLES = { '/': 'Mxnolia — vinyles peints à la main', '/boutique': 'Boutique — Mxnolia', '/concours': 'Concours — Mxnolia', '/contact': 'Contact — Mxnolia' };

function route(path) {
  const p = path.replace(/\/+$/, '') || '/';
  if (p === '/') return <Main />;
  if (p === '/boutique') return <Boutique />;
  if (p === '/concours') return <Atelier />;
  if (p === '/contact') return <Contact />;
  const m = p.match(/^\/vinyle\/([^/]+)$/);
  if (m && PIECES[m[1]]) return <ProduitMan key={m[1]} piece={PIECES[m[1]]} />;
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: '#edeae4', fontFamily: 'Inter, sans-serif', padding: 24, textAlign: 'center' }}>
      <p style={{ margin: 0, fontFamily: "'Ms Madi', cursive", fontSize: 48 }}>Mxnolia</p>
      <p style={{ margin: 0, color: '#a39e96' }}>Cette page n'existe pas.</p>
      <a href="/" style={{ color: '#c9a45c' }}>Retour à l'accueil</a>
    </div>
  );
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target) return;
      const href = a.getAttribute('href');
      if (!href || !href.startsWith('/')) return;
      e.preventDefault();
      if (href !== window.location.pathname) {
        window.history.pushState({}, '', href);
        setPath(href);
      }
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', onPop);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('click', onClick);
    };
  }, []);

  useEffect(() => {
    const slug = (path.match(/^\/vinyle\/([^/]+)/) || [])[1];
    document.title = TITLES[path] || (slug ? 'Vinyle peint — Mxnolia' : 'Mxnolia');
  }, [path]);

  return (
    route(path)
  );
}
