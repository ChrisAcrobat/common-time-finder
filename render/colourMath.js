// OKLab interpolation, using the standard linear-sRGB conversion matrices.
const clamp = value => Math.max(0, Math.min(1, value));
const toLinear = value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
const toGamma = value => value <= .0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - .055;
const parseHex = hex => hex.match(/[a-f\d]{2}/gi).map(channel => parseInt(channel, 16) / 255);

function toLab(rgb) {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + .4505937099 * s,
    .0259040371 * l + .7827717662 * m - .808675766 * s
  ];
}

function fromLab([lightness, a, b]) {
  const l = (lightness + .3963377774 * a + .2158037573 * b) ** 3;
  const m = (lightness - .1055613458 * a - .0638541728 * b) ** 3;
  const s = (lightness - .0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s,
    -.0041960863 * l - .7034186147 * m + 1.707614701 * s
  ].map(toGamma);
}
export function mix(a, b, fraction) {
  const rgbA = parseHex(a),
    rgbB = parseHex(b),
    labA = toLab(rgbA),
    labB = toLab(rgbB);
  let values = fromLab(labA.map((value, i) => value + (labB[i] - value) * fraction));
  if (values.some(value => !Number.isFinite(value))) values = rgbA.map((value, i) => value + (rgbB[i] - value) * fraction);
  return values.map(value => Math.round(clamp(value) * 255) / 255);
}
