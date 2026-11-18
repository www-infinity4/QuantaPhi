/** Infinity aluminum coin housing · proposal-only mechanical envelope.
 * Values are planning clearances, not released CAD tolerances or verified inventory.
 * All coin dimensions must be measured on a physical specimen. No storage/network. */
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
const measured = (value, label, lower, upper) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    throw new RangeError('Measure ' + label + ' before proposing a housing.');
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= lower || n > upper) {
    throw new RangeError(label + ' must be a measured value above ' + lower + ' and at most ' + upper + ' mm.');
  }
  return n;
};
/** +0.30 mm each side is a PRELIMINARY prototype clearance only.
 * +7.00 mm radial ring and +7.00 mm total axial stack are initial envelope
 * allocations for a passive, screw-down case, subject to real CAD and tolerance
 * analysis. Electronics have NO fit claim; separate a deeper electronics variant. */
export function proposeHousingEnvelope(coinDiameterMm, coinThicknessMm) {
  const d = measured(coinDiameterMm, 'coin diameter', 5, 100);
  const t = measured(coinThicknessMm, 'coin thickness', 0, 20);
  const cavityDiameterMm = round(d + 0.6);
  return Object.freeze({
    coinDiameterMm: round(d),
    coinThicknessMm: round(t),
    cavityDiameterMm,
    outerDiameterMm: round(cavityDiameterMm + 14),
    outerThicknessMm: round(t + 7),
    radialClearancePerSideMm: 0.3,
    unit: 'mm',
    status: 'unverified_concept',
    productionReady: false,
    quoteVerified: false,
    inventoryVerified: false,
    checkoutEnabled: false,
    assumptions: [
      'Measurements must come from a real coin; no coin size is supplied by this card.',
      'Allowances are provisional and require fit, thermal and tolerance-stack tests.',
      'The initial envelope is a passive display case; no USB-C, NFC or screen fit is certified.',
      'Final dimensions, finish, sealing, thread engagement and supplier pricing require CAD/RFQ.'
    ]
  });
}
