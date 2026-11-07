import React from 'react';

// Pages keep the Design runtime's model: a class with renderVals() and a template.
export class DCLogic extends React.Component {
  render() {
    return this.constructor.template(this.renderVals());
  }
}

// Inline styles are written as raw attribute strings (not React style objects),
// so the stylesheet's [style*="…"] selectors match exactly as in the mockup.
const cache = new Map();
export function S(s) {
  const str = s == null ? '' : String(s);
  let f = cache.get(str);
  if (!f) {
    f = (el) => {
      if (el && el.getAttribute('style') !== str) el.setAttribute('style', str);
    };
    if (cache.size < 20000) cache.set(str, f);
  }
  return f;
}

export const PIECES = {
  'man-josman': 'man',
  'mr-morale-kendrick-lamar': 'kd',
  'astroworld-travis-scott': 'aw',
  'the-eminem-show': 'em',
  'life-leto': 'sx',
  'cerises-ruban': 'cr',
  'digitalova-laylow': 'dg',
  'le-petit-prince': 'pp',
  'survival-mode-riles': 'lp',
  'shaka-ponk': 'sp',
  'renaissance-beyonce': 'rn',
  'balloonerism-mac-miller': 'bl',
  '8-ball-leopard': 'eb',
};
const FILE_OF = {
  man: 'ProduitMan', kd: 'ProduitKendrick', aw: 'ProduitAstroworld', em: 'ProduitEminem', sx: 'ProduitPso',
  cr: 'ProduitCerises', dg: 'ProduitDigitalova', pp: 'ProduitPetitPrince', lp: 'ProduitLoup',
  sp: 'ProduitShakaPonk', rn: 'ProduitRenaissance', bl: 'ProduitBallon', eb: 'ProduitHuitBall',
};
const PAGE = {
  'Main.dc.html': '/',
  'Boutique.dc.html': '/boutique',
  'Atelier.dc.html': '/concours',
  'Contact.dc.html': '/contact',
};
Object.entries(PIECES).forEach(([slug, key]) => { PAGE[FILE_OF[key] + '.dc.html'] = '/vinyle/' + slug; });

export const R = (h) => (h == null ? h : PAGE[h] || h);
export const preventSubmit = (e) => e.preventDefault();
