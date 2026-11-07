import React from 'react';
import { DCLogic, S, R, preventSubmit } from '../dc.js';
const CSS = "\nbody{margin:0;background:#0b0b0c}\n";
class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { v: {}, tried: false, step: 'form', ref: '' };
  }
  componentWillUnmount() {
    clearTimeout(this.t);
  }
  renderVals() {
    const SHIP = 5.9;
    const o = this.props.order || { mode: 'buy', lines: [{ al: 'M.A.N', ar: 'Josman', img: '/img/vinyle-man-josman.webp', price: 160 }] };
    const bid = o.mode === 'bid';
    const eur = n => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')) + ' €';
    const lines = (o.lines || []).map(l => ({ ...l, priceLabel: bid ? '' : eur(l.price) }));
    const sub = lines.reduce((s, l) => s + (l.price || 0), 0);
    const total = bid ? o.bid : sub + SHIP;
    const { v, tried, step } = this.state;
    const dg = x => String(x || '').replace(/\D/g, '');
    const fmt = {
      phone: x => dg(x).slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 '),
      zip: x => dg(x).slice(0, 5),
      card: x => dg(x).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '),
      exp: x => { const d = dg(x).slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; },
      cvc: x => dg(x).slice(0, 4),
      holder: x => String(x).toUpperCase()
    };
    const now = new Date();
    const expOk = x => {
      const d = dg(x);
      if (d.length !== 4) return false;
      const m = +d.slice(0, 2), y = 2000 + +d.slice(2);
      if (m < 1 || m > 12) return false;
      return y > now.getFullYear() || (y === now.getFullYear() && m >= now.getMonth() + 1);
    };
    const rules = {
      name: [x => x.trim().length >= 3, 'Indique ton prénom et ton nom.'],
      email: [x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.trim()), 'Cet e-mail ne semble pas valide.'],
      phone: [x => dg(x).length === 10, 'Il faut 10 chiffres.'],
      addr: [x => x.trim().length >= 5, 'Indique ton adresse.'],
      zip: [x => dg(x).length === 5, '5 chiffres.'],
      city: [x => x.trim().length >= 2, 'Indique ta ville.'],
      holder: [x => x.trim().length >= 3, 'Le nom tel qu\'il apparaît sur la carte.'],
      card: [x => dg(x).length === 16, 'Le numéro doit faire 16 chiffres.'],
      exp: [expOk, 'Date invalide ou carte expirée.'],
      cvc: [x => dg(x).length >= 3, '3 chiffres au dos de la carte.']
    };
    const f = {};
    let bad = 0;
    Object.keys(rules).forEach(k => {
      const val = v[k] || '';
      const ok = rules[k][0](val);
      if (!ok) bad++;
      const show = tried && !ok;
      f[k] = {
        v: val,
        bad: show,
        msg: rules[k][1],
        set: e => { const raw = e && e.target ? e.target.value : ''; const nv = fmt[k] ? fmt[k](raw) : raw; this.setState(s => ({ v: { ...s.v, [k]: nv } })); },
        st: `width:100%;box-sizing:border-box;min-height:48px;padding:0 16px;border-radius:12px;border:1px solid ${show ? '#e8806f' : '#3a3733'};background:#0b0b0c;color:#edeae4;font:inherit;font-size:16px`
      };
    });
    const busy = step === 'processing';
    const close = () => { if (this.props.close) this.props.close(); else this.setState({ v: {}, tried: false, step: 'form' }); };
    const rows = bid
      ? [{ k: 'Mise de départ', v: eur(o.start || 120) }, { k: 'Débité aujourd\'hui', v: eur(0) }, { k: 'Livraison si tu gagnes', v: eur(SHIP) }]
      : [{ k: 'Sous-total', v: eur(sub) }, { k: 'Livraison Mondial Relais', v: eur(SHIP) }];
    const email = (v.email || '').trim();
    return {
      title: bid ? 'Valider mon enchère' : 'Finaliser ma commande',
      kicker: bid ? 'ton offre' : 'paiement sécurisé',
      cardNote: bid ? 'Empreinte bancaire, aucun débit maintenant' : 'Débit au moment de la commande',
      f,
      lines,
      rows,
      isBid: bid,
      totalKey: bid ? 'Ton offre' : 'Total',
      totalLabel: eur(total),
      hasErrors: tried && bad > 0,
      busy,
      payLabel: busy ? (bid ? 'Vérification de la carte…' : 'Paiement en cours…') : (bid ? 'Valider mon offre de ' + eur(total) : 'Payer ' + eur(total)),
      payStyle: `width:100%;min-height:54px;border-radius:999px;border:0;background:#c9a45c;color:#0b0b0c;font:inherit;font-weight:600;font-size:16px;cursor:${busy ? 'progress' : 'pointer'};opacity:${busy ? 0.7 : 1}`,
      pay: () => {
        if (busy) return;
        if (bad > 0) { this.setState({ tried: true }); return; }
        this.setState({ step: 'processing', tried: true });
        this.t = setTimeout(() => this.setState({ step: 'done', ref: 'MX-' + String(Date.now()).slice(-6) }), 1600);
      },
      isForm: step !== 'done',
      isDone: step === 'done',
      ref: this.state.ref,
      doneTitle: bid ? 'Ton offre est placée !' : 'Merci, c\'est validé !',
      doneText: bid
        ? 'Tu es en tête avec ' + eur(total) + '. Si personne ne te dépasse avant la fin du compte à rebours, ta carte sera débitée et je t\'envoie ton vinyle. Je te préviens par e-mail' + (email ? ' à ' + email : '') + '.'
        : 'Ta commande est confirmée. Je prépare ton vinyle avec soin et je t\'envoie le suivi Mondial Relais par e-mail' + (email ? ' à ' + email : '') + '.',
      finishLabel: bid ? 'Retour à l\'enchère' : 'Retour à la boutique',
      finish: () => { if (this.props.done) this.props.done(); else close(); },
      close
    };
  }
}
Component.template = (v) => (<><style>{CSS}</style>{" "}{" "}{" "}{" "}{" "}<div ref={S("position: fixed; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; font-family: Inter, system-ui, sans-serif; color: #edeae4")}>{" "}<button type={"button"} className={"backdrop"} aria-label={"Fermer le paiement"} onClick={v.close} ref={S("position: absolute; inset: 0; border: 0; background: rgba(0,0,0,0.75); cursor: pointer")}></button>{" "}<div role={"dialog"} aria-modal={"true"} aria-label={v.title} className={"pop"} ref={S("position: relative; width: min(940px, 100%); max-height: calc(100% - 16px); overflow-y: auto; background: #141312; border: 1px solid #2c2925; border-radius: 22px; box-sizing: border-box; display: flex; flex-direction: column")}>{" "}<div ref={S("display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 22px 28px; border-bottom: 1px solid #23211e")}>{" "}<div ref={S("display: flex; flex-direction: column; gap: 2px")}>{" "}<p ref={S("margin: 0; font-family: 'Caveat Brush', cursive; font-size: 22px; color: #c9a45c")}>{v.kicker}</p>{" "}<h2 ref={S("margin: 0; font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 700")}>{v.title}</h2>{" "}</div>{" "}<button type={"button"} aria-label={"Fermer"} onClick={v.close} ref={S("flex: 0 0 44px; width: 44px; height: 44px; padding: 0; border-radius: 50%; border: 1px solid #3a3733; background: transparent; color: #edeae4; cursor: pointer; display: flex; align-items: center; justify-content: center")}>{" "}<svg aria-hidden={"true"} width={"18"} height={"18"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"}><path d={"M6 6l12 12M18 6L6 18"} /></svg>{" "}</button>{" "}</div>{" "}<p ref={S("margin: 0; padding: 10px 28px; background: #1c1a12; border-bottom: 1px solid #2c2925; color: #e3cf9e; font-size: 13px; line-height: 1.5")}>{"Démo : paiement fictif. Rien n'est débité, enregistré ni envoyé. Pour tester, utilise la carte 4242 4242 4242 4242."}</p>{" "}{(v.isForm) ? (<>{" "}<div ref={S("display: flex; flex-wrap: wrap")}>{" "}<form ref={S("flex: 1.5 1 340px; min-width: 0; padding: 26px 28px; display: flex; flex-direction: column; gap: 26px")} onSubmit={preventSubmit}>{" "}<fieldset ref={S("margin: 0; padding: 0; border: 0; display: flex; flex-wrap: wrap; gap: 14px")}>{" "}<legend ref={S("padding: 0; margin-bottom: 14px; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #a39e96")}>{"Tes coordonnées"}</legend>{" "}<div ref={S("flex: 1 1 100%; display: flex; flex-direction: column; gap: 6px")}>{" "}<label htmlFor={"pay-name"} ref={S("font-size: 14px; color: #cfc9c0")}>{"Prénom et nom"}</label>{" "}<input id={"pay-name"} type={"text"} autoComplete={"name"} placeholder={"Camille Martin"} value={v.f?.name?.v} onChange={v.f?.name?.set} ref={S(v.f?.name?.st)} />{" "}{(v.f?.name?.bad) ? (<><p ref={S("margin: 0; font-size: 13px; color: #f0a092")}>{v.f?.name?.msg}</p></>) : null}{" "}</div>{" "}<div ref={S("flex: 1 1 220px; display: flex; flex-direction: column; gap: 6px")}>{" "}<label htmlFor={"pay-email"} ref={S("font-size: 14px; color: #cfc9c0")}>{"E-mail"}</label>{" "}<input id={"pay-email"} type={"email"} autoComplete={"email"} placeholder={"toi@exemple.fr"} value={v.f?.email?.v} onChange={v.f?.email?.set} ref={S(v.f?.email?.st)} />{" "}{(v.f?.email?.bad) ? (<><p ref={S("margin: 0; font-size: 13px; color: #f0a092")}>{v.f?.email?.msg}</p></>) : null}{" "}</div>{" "}<div ref={S("flex: 1 1 180px; display: flex; flex-direction: column; gap: 6px")}>{" "}<label htmlFor={"pay-phone"} ref={S("font-size: 14px; color: #cfc9c0")}>{"Téléphone"}</label>{" "}<input id={"pay-phone"} type={"tel"} inputMode={"numeric"} autoComplete={"tel"} placeholder={"06 12 34 56 78"} value={v.f?.phone?.v} onChange={v.f?.phone?.set} ref={S(v.f?.phone?.st)} />{" "}{(v.f?.phone?.bad) ? (<><p ref={S("margin: 0; font-size: 13px; color: #f0a092")}>{v.f?.phone?.msg}</p></>) : null}{" "}</div>{" "}</fieldset>{" "}<fieldset ref={S("margin: 0; padding: 0; border: 0; display: flex; flex-wrap: wrap; gap: 14px")}>{" "}<legend ref={S("padding: 0; margin-bottom: 14px; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #a39e96")}>{"Adresse de livraison"}</legend>{" "}<div ref={S("flex: 1 1 100%; display: flex; flex-direction: column; gap: 6px")}>{" "}<label htmlFor={"pay-addr"} ref={S("font-size: 14px; color: #cfc9c0")}>{"Adresse"}</label>{" "}<input id={"pay-addr"} type={"text"} autoComplete={"street-address"} placeholder={"12 rue des Lilas"} value={v.f?.addr?.v} onChange={v.f?.addr?.set} ref={S(v.f?.addr?.st)} />{" "}{(v.f?.addr?.bad) ? (<><p ref={S("margin: 0; font-size: 13px; color: #f0a092")}>{v.f?.addr?.msg}</p></>) : null}{" "}</div>{" "}<div ref={S("flex: 1 1 120px; display: flex; flex-direction: column; gap: 6px")}>{" "}<label htmlFor={"pay-zip"} ref={S("font-size: 14px; color: #cfc9c0")}>{"Code postal"}</label>{" "}<input id={"pay-zip"} type={"text"} inputMode={"numeric"} autoComplete={"postal-code"} placeholder={"21000"} value={v.f?.zip?.v} onChange={v.f?.zip?.set} ref={S(v.f?.zip?.st)} />{" "}{(v.f?.zip?.bad) ? (<><p ref={S("margin: 0; font-size: 13px; color: #f0a092")}>{v.f?.zip?.msg}</p></>) : null}{" "}</div>{" "}<div ref={S("flex: 2 1 200px; display: flex; flex-direction: column; gap: 6px")}>{" "}<label htmlFor={"pay-city"} ref={S("font-size: 14px; color: #cfc9c0")}>{"Ville"}</label>{" "}<input id={"pay-city"} type={"text"} autoComplete={"address-level2"} placeholder={"Dijon"} value={v.f?.city?.v} onChange={v.f?.city?.set} ref={S(v.f?.city?.st)} />{" "}{(v.f?.city?.bad) ? (<><p ref={S("margin: 0; font-size: 13px; color: #f0a092")}>{v.f?.city?.msg}</p></>) : null}{" "}</div>{" "}<p ref={S("flex: 1 1 100%; margin: 0; font-size: 13px; color: #8f8a83; line-height: 1.5")}>{"Envoi en point relais Mondial Relais : je choisis le plus proche de ton adresse et je t'envoie le suivi par e-mail."}</p>{" "}</fieldset>{" "}<fieldset ref={S("margin: 0; padding: 18px; border: 1px solid #2c2925; border-radius: 16px; background: #0f0e0d; display: flex; flex-wrap: wrap; gap: 14px")}>{" "}<legend ref={S("padding: 0 8px; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #a39e96")}>{"Paiement par carte"}</legend>{" "}<div ref={S("flex: 1 1 100%; display: flex; align-items: center; gap: 8px; font-size: 13px; color: #a39e96")}>{" "}<svg aria-hidden={"true"} width={"16"} height={"16"} viewBox={"0 0 24 24"} fill={"none"} stroke={"#c9a45c"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"}><rect x={"4"} y={"11"} width={"16"} height={"10"} rx={"2"} /><path d={"M8 11V8a4 4 0 0 1 8 0v3"} /></svg>{" "}<span>{v.cardNote}</span>{" "}</div>{" "}<div ref={S("flex: 1 1 100%; display: flex; flex-direction: column; gap: 6px")}>{" "}<label htmlFor={"pay-holder"} ref={S("font-size: 14px; color: #cfc9c0")}>{"Nom sur la carte"}</label>{" "}<input id={"pay-holder"} type={"text"} autoComplete={"off"} placeholder={"CAMILLE MARTIN"} value={v.f?.holder?.v} onChange={v.f?.holder?.set} ref={S(v.f?.holder?.st)} />{" "}{(v.f?.holder?.bad) ? (<><p ref={S("margin: 0; font-size: 13px; color: #f0a092")}>{v.f?.holder?.msg}</p></>) : null}{" "}</div>{" "}<div ref={S("flex: 1 1 100%; display: flex; flex-direction: column; gap: 6px")}>{" "}<label htmlFor={"pay-card"} ref={S("font-size: 14px; color: #cfc9c0")}>{"Numéro de carte"}</label>{" "}<input id={"pay-card"} type={"text"} inputMode={"numeric"} autoComplete={"off"} placeholder={"4242 4242 4242 4242"} value={v.f?.card?.v} onChange={v.f?.card?.set} ref={S(v.f?.card?.st)} />{" "}{(v.f?.card?.bad) ? (<><p ref={S("margin: 0; font-size: 13px; color: #f0a092")}>{v.f?.card?.msg}</p></>) : null}{" "}</div>{" "}<div ref={S("flex: 1 1 130px; display: flex; flex-direction: column; gap: 6px")}>{" "}<label htmlFor={"pay-exp"} ref={S("font-size: 14px; color: #cfc9c0")}>{"Expiration"}</label>{" "}<input id={"pay-exp"} type={"text"} inputMode={"numeric"} autoComplete={"off"} placeholder={"MM/AA"} value={v.f?.exp?.v} onChange={v.f?.exp?.set} ref={S(v.f?.exp?.st)} />{" "}{(v.f?.exp?.bad) ? (<><p ref={S("margin: 0; font-size: 13px; color: #f0a092")}>{v.f?.exp?.msg}</p></>) : null}{" "}</div>{" "}<div ref={S("flex: 1 1 110px; display: flex; flex-direction: column; gap: 6px")}>{" "}<label htmlFor={"pay-cvc"} ref={S("font-size: 14px; color: #cfc9c0")}>{"Cryptogramme"}</label>{" "}<input id={"pay-cvc"} type={"text"} inputMode={"numeric"} autoComplete={"off"} placeholder={"123"} value={v.f?.cvc?.v} onChange={v.f?.cvc?.set} ref={S(v.f?.cvc?.st)} />{" "}{(v.f?.cvc?.bad) ? (<><p ref={S("margin: 0; font-size: 13px; color: #f0a092")}>{v.f?.cvc?.msg}</p></>) : null}{" "}</div>{" "}</fieldset>{" "}</form>{" "}<aside aria-label={"Récapitulatif"} ref={S("flex: 1 1 280px; min-width: 0; padding: 26px 28px; background: #0f0e0d; border-left: 1px solid #23211e; display: flex; flex-direction: column; gap: 18px")}>{" "}<h3 ref={S("margin: 0; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #a39e96")}>{"Récapitulatif"}</h3>{" "}{(v.lines || []).map((l, $index) => (<React.Fragment key={$index}>{" "}<div ref={S("display: flex; align-items: center; gap: 14px")}>{" "}<img src={l?.img} alt={""} ref={S("flex: 0 0 60px; width: 60px; height: 60px; border-radius: 50%; object-fit: cover; background: #1a1917")} />{" "}<div ref={S("flex: 1; min-width: 0")}>{" "}<p ref={S("margin: 0; font-family: 'Poppins', sans-serif; font-weight: 700; line-height: 1.3")}>{l?.al}{" "}<span ref={S("font-weight: 400; color: #a39e96")}>{"-"}</span>{" "}<span ref={S("font-family: 'Caveat Brush', cursive; font-style: italic; font-weight: 400; font-size: 19px; color: #c9a45c; white-space: nowrap")}>{l?.ar}</span></p>{" "}<p ref={S("margin: 2px 0 0; font-size: 13px; color: #a39e96")}>{"Pièce unique"}</p>{" "}</div>{" "}<p ref={S("margin: 0; font-family: 'Poppins', sans-serif; font-weight: 600; white-space: nowrap")}>{l?.priceLabel}</p>{" "}</div>{" "}</React.Fragment>))}{" "}<div ref={S("border-top: 1px solid #23211e; padding-top: 16px; display: flex; flex-direction: column; gap: 10px; font-size: 15px")}>{" "}{(v.rows || []).map((r, $index) => (<React.Fragment key={$index}>{" "}<div ref={S("display: flex; justify-content: space-between; gap: 12px")}><span ref={S("color: #a39e96")}>{r?.k}</span><span>{r?.v}</span></div>{" "}</React.Fragment>))}{" "}</div>{" "}<div ref={S("border-top: 1px solid #23211e; padding-top: 16px; display: flex; justify-content: space-between; align-items: baseline; gap: 12px")}>{" "}<span ref={S("font-family: 'Poppins', sans-serif; font-size: 18px; font-weight: 600")}>{v.totalKey}</span>{" "}<span ref={S("font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 700; color: #c9a45c")}>{v.totalLabel}</span>{" "}</div>{" "}{(v.isBid) ? (<>{" "}<p ref={S("margin: 0; padding: 12px 14px; border-radius: 12px; background: #17190f; border: 1px solid #3d3a26; font-size: 13px; line-height: 1.55; color: #cfc9c0")}>{"Empreinte bancaire : ta carte n'est pas débitée maintenant. Elle ne le sera que si tu remportes l'enchère à la fin du compte à rebours."}</p>{" "}</>) : null}{" "}{(v.hasErrors) ? (<>{" "}<p role={"alert"} ref={S("margin: 0; font-size: 13px; color: #f0a092")}>{"Vérifie les champs en rouge pour continuer."}</p>{" "}</>) : null}{" "}<button type={"button"} onClick={v.pay} disabled={v.busy} ref={S(v.payStyle)}>{v.payLabel}</button>{" "}<p ref={S("margin: 0; font-size: 12px; color: #8f8a83; line-height: 1.5; text-align: center")}>{"En validant, tu acceptes les conditions de vente. Pièce unique : pas de réassort."}</p>{" "}</aside>{" "}</div>{" "}</>) : null}{" "}{(v.isDone) ? (<>{" "}<div className={"fade-up"} ref={S("padding: 48px 28px 40px; display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center")}>{" "}<span ref={S("width: 64px; height: 64px; border-radius: 50%; background: #1f2a1d; display: flex; align-items: center; justify-content: center")}>{" "}<svg aria-hidden={"true"} width={"30"} height={"30"} viewBox={"0 0 24 24"} fill={"none"} stroke={"#a9c4a0"} strokeWidth={"2.2"} strokeLinecap={"round"} strokeLinejoin={"round"}><path d={"M5 12.5l4.5 4.5L19 7.5"} /></svg>{" "}</span>{" "}<p ref={S("margin: 0; font-family: 'Caveat Brush', cursive; font-size: 42px; color: #c9a45c")}>{v.doneTitle}</p>{" "}<p ref={S("margin: 0; max-width: 460px; color: #cfc9c0; line-height: 1.6")}>{v.doneText}</p>{" "}<p ref={S("margin: 0; font-size: 13px; color: #8f8a83")}>{"Référence "}{v.ref}</p>{" "}<button type={"button"} onClick={v.finish} ref={S("margin-top: 8px; min-height: 48px; padding: 0 26px; border-radius: 999px; border: 0; background: #c9a45c; color: #0b0b0c; font: inherit; font-weight: 600; cursor: pointer")}>{v.finishLabel}</button>{" "}</div>{" "}</>) : null}{" "}</div>{" "}</div>{" "}</>);
export default Component;
