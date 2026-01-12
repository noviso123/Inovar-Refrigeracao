function r(e){return function(...t){var n=t[0];n.target===this&&e?.apply(this,t)}}function u(e){return function(...t){var n=t[0];return n.preventDefault(),e?.apply(this,t)}}export{u as p,r as s};
