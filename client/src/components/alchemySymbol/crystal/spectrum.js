import { exp, Fn, vec3 } from 'three/tsl';

/**
 * Approximate visible-spectrum response for t in [0, 1]
 * (0 = deep red ~700nm, 1 = violet ~400nm). Gaussian lobes per channel,
 * with a small red lobe at the violet end so violet reads as purple, not blue.
 */
const gauss = (t, mu, sigma) => Math.exp(-(((t - mu) / sigma) ** 2));

export function spectrumRgbJs(t) {
  return [
    gauss(t, 0.1, 0.24) + 0.35 * gauss(t, 0.95, 0.1),
    gauss(t, 0.45, 0.22),
    gauss(t, 0.8, 0.2),
  ];
}

/** Same curve as a TSL node, for hues that vary per-pixel. */
export const spectrumRgb = Fn(([t]) => {
  const g = (mu, sigma) => exp(t.sub(mu).div(sigma).pow(2).negate());
  return vec3(g(0.1, 0.24).add(g(0.95, 0.1).mul(0.35)), g(0.45, 0.22), g(0.8, 0.2));
});

/**
 * Weights for N discrete wavelength samples, normalised so that the sum per
 * channel is 1. Where all samples agree the result is neutral; where they
 * diverge (dispersion), the light fans out into a rainbow.
 */
export function spectralWeights(count) {
  const raw = Array.from({ length: count }, (_, i) => spectrumRgbJs((i + 0.5) / count));
  const sum = raw.reduce((acc, w) => acc.map((v, c) => v + w[c]), [0, 0, 0]);
  return raw.map((w) => w.map((v, c) => v / sum[c]));
}
