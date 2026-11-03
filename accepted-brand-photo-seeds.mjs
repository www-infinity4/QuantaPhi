/* QuantaPhi independent source-image notes.
 * Read from public manufacturer/product retailer pages November 3, 2026.
 * These are linked previews, NOT licensed QuantaPhi advertisements, paid
 * partnerships, inventory receipts, product prices, or permanent copies.
 * Preserve the exact image and source URL for audit and attribution.
 */
const entry=(image,sourceUrl,caption)=>Object.freeze({image,sourceUrl,caption,checkedAt:'2026-11-03',advertiserPaid:false});
export const BRAND_PHOTO_SEEDS=Object.freeze({
 'durable-miele':entry(
  'https://media.miele.com/dam/9d6bd6bd-f00d-474f-b25d-b4ef00b62c04/20000463179_HighresDigitalRGB.png',
  'https://www.mieleusa.com/',
  'Miele appliance image from Miele manufacturer website'),
 'durable-coleman-classic-camp-stoves':entry(
  'https://content.backcountry.com/images/items/1200/CMN/CMNK18W/ONECOL.jpg',
  'https://www.backcountry.com/coleman-classic-2-burner-propane-stove',
  'Coleman Classic two-burner propane camp stove, retailer photograph from Backcountry'),
 'durable-fritz-hansen':entry(
  'https://www.mynordicliving.co.uk/cdn/shop/files/Nordic-Living-by-Biehl-PK22-Lounge-Chair-Lifestyle-1-Fritz-Hansen.png?v=1744544176&width=720',
  'https://www.mynordicliving.co.uk/products/pk22',
  'Fritz Hansen PK22 lounge chair, Nordic Living by Biehl retailer photograph')
});
