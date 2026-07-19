export const categoryData = {
  Jewellery: [
    { id: 1, name: 'Necklaces', img: 'new-arrival.png', price: '$120' },
    { id: 2, name: 'Earrings', img: 'new-arrival.png', price: '$85' },
    { id: 3, name: 'Bangles', img: 'new-arrival.png', price: '$65' },
    { id: 4, name: 'Maang Tikka', img: 'new-arrival.png', price: '$95' },
    { id: 5, name: 'Nose Rings', img: 'new-arrival.png', price: '$45' },
  ],
  Clothing: [
    { id: 1, name: 'Lehengas', img: 'new-arrival.png', price: '$149' },
    { id: 2, name: 'Kurtis', img: 'new-arrival.png', price: '$99' },
    { id: 3, name: 'Salwar Kameez', img: 'new-arrival.png', price: '$119' },
    { id: 4, name: 'Tops', img: 'new-arrival.png', price: '$79' },
    { id: 5, name: 'Sarees', img: 'new-arrival.png', price: '$189' },
    { id: 6, name: 'Anarkalis', img: 'new-arrival.png', price: '$159' },
  ],
  'Skin Care': [
    { id: 1, name: 'Serums', img: 'new-arrival.png', price: '$45' },
    { id: 2, name: 'Toners', img: 'new-arrival.png', price: '$35' },
    { id: 3, name: 'Masks', img: 'new-arrival.png', price: '$29' },
    { id: 4, name: 'Moisturisers', img: 'new-arrival.png', price: '$55' },
    { id: 5, name: 'Eye Care', img: 'new-arrival.png', price: '$49' },
  ],
  Makeup: [
    { id: 1, name: 'Lipsticks', img: 'new-arrival.png', price: '$25' },
    { id: 2, name: 'Eye Makeup', img: 'new-arrival.png', price: '$15' },
    { id: 3, name: 'Base Makeup', img: 'new-arrival.png', price: '$55' },
    { id: 4, name: 'Blush', img: 'new-arrival.png', price: '$45' },
    { id: 5, name: 'Highlighters', img: 'new-arrival.png', price: '$39' },
  ],
  Shoes: [
    { id: 1, name: 'Heels', img: 'new-arrival.png', price: '$89' },
    { id: 2, name: 'Flats', img: 'new-arrival.png', price: '$65' },
    { id: 3, name: 'Sandals', img: 'new-arrival.png', price: '$120' },
    { id: 4, name: 'Juttis', img: 'new-arrival.png', price: '$75' },
    { id: 5, name: 'Block Heels', img: 'new-arrival.png', price: '$95' },
  ],
  Bags: [
    { id: 1, name: 'Handbags', img: 'new-arrival.png', price: '$89' },
    { id: 2, name: 'Tote Bags', img: 'new-arrival.png', price: '$72' },
    { id: 3, name: 'Clutches', img: 'new-arrival.png', price: '$64' },
    { id: 4, name: 'Sling Bags', img: 'new-arrival.png', price: '$58' },
    { id: 5, name: 'Backpacks', img: 'new-arrival.png', price: '$95' },
  ],
};

const withImage = (items) => items.map((item, idx) => ({ id: idx + 1, img: 'new-arrival.png', ...item }));

export const categoryDetailSections = {
  Jewellery: {
    Necklaces: withImage([
      { name: 'Temple Necklace', price: '$120' },
      { name: 'Layered Necklace', price: '$98' },
      { name: 'Bridal Choker', price: '$145' },
    ]),
    Earrings: withImage([
      { name: 'Jhumka Earrings', price: '$62' },
      { name: 'Pearl Drops', price: '$74' },
      { name: 'Statement Chandbali', price: '$81' },
    ]),
    Bangles: withImage([
      { name: 'Kundan Bangles', price: '$54' },
      { name: 'Oxidised Set', price: '$39' },
      { name: 'Bridal Bangles', price: '$99' },
    ]),
    'Maang Tikka': withImage([
      { name: 'Classic Tikka', price: '$42' },
      { name: 'Kundan Tikka', price: '$58' },
      { name: 'Bridal Matha Patti', price: '$89' },
    ]),
    'Nose Rings': withImage([
      { name: 'Stone Nose Ring', price: '$29' },
      { name: 'Pearl Nath', price: '$38' },
      { name: 'Bridal Nath', price: '$69' },
    ]),
  },
  Clothing: {
    Lehengas: withImage([
      { name: 'Plain Lehenga', price: '$199' },
      { name: 'Bridal Lehenga', price: '$349' },
      { name: 'Gorgeous Lehenga', price: '$279' },
    ]),
    Kurtis: withImage([
      { name: 'Short Kurti', price: '$59' },
      { name: 'Long Kurti', price: '$79' },
      { name: 'Party Kurti', price: '$95' },
    ]),
    'Salwar Kameez': withImage([
      { name: 'Cotton Salwar Kameez', price: '$89' },
      { name: 'Printed Salwar Kameez', price: '$109' },
      { name: 'Party Salwar Kameez', price: '$139' },
    ]),
    Tops: withImage([
      { name: 'Casual Top', price: '$45' },
      { name: 'Embroidered Top', price: '$68' },
      { name: 'Party Top', price: '$82' },
    ]),
    Sarees: withImage([
      { name: 'Cotton Saree', price: '$89' },
      { name: 'Silk Saree', price: '$149' },
      { name: 'Party Saree', price: '$189' },
    ]),
    Anarkalis: withImage([
      { name: 'Classic Anarkali', price: '$119' },
      { name: 'Flared Anarkali', price: '$139' },
      { name: 'Bridal Anarkali', price: '$179' },
    ]),
  },
  'Skin Care': {
    Serums: withImage([
      { name: 'Vitamin C Serum', price: '$38' },
      { name: 'Niacinamide Serum', price: '$35' },
      { name: 'Hydrating Serum', price: '$41' },
    ]),
    Toners: withImage([
      { name: 'Rose Toner', price: '$29' },
      { name: 'Rice Toner', price: '$33' },
      { name: 'Aloe Toner', price: '$27' },
    ]),
    Masks: withImage([
      { name: 'Clay Mask', price: '$25' },
      { name: 'Charcoal Mask', price: '$31' },
      { name: 'Overnight Mask', price: '$39' },
    ]),
    Moisturisers: withImage([
      { name: 'Gel Moisturiser', price: '$32' },
      { name: 'SPF Moisturiser', price: '$37' },
      { name: 'Night Moisturiser', price: '$44' },
    ]),
    'Eye Care': withImage([
      { name: 'Eye Cream', price: '$28' },
      { name: 'Eye Serum', price: '$34' },
      { name: 'Cooling Eye Gel', price: '$22' },
    ]),
  },
  Makeup: {
    Lipsticks: withImage([
      { name: 'Matte Lipstick', price: '$19' },
      { name: 'Cream Lipstick', price: '$22' },
      { name: 'Liquid Lipstick', price: '$24' },
    ]),
    'Eye Makeup': withImage([
      { name: 'Kajal', price: '$11' },
      { name: 'Mascara', price: '$18' },
      { name: 'Eyeliner', price: '$14' },
    ]),
    'Base Makeup': withImage([
      { name: 'Foundation', price: '$36' },
      { name: 'BB Cream', price: '$27' },
      { name: 'Concealer', price: '$21' },
    ]),
    Blush: withImage([
      { name: 'Powder Blush', price: '$19' },
      { name: 'Cream Blush', price: '$22' },
      { name: 'Liquid Blush', price: '$25' },
    ]),
    Highlighters: withImage([
      { name: 'Powder Highlighter', price: '$24' },
      { name: 'Liquid Highlighter', price: '$26' },
      { name: 'Stick Highlighter', price: '$21' },
    ]),
  },
  Shoes: {
    Heels: withImage([
      { name: 'Kitten Heels', price: '$65' },
      { name: 'Pencil Heels', price: '$79' },
      { name: 'Stilettos', price: '$89' },
    ]),
    Flats: withImage([
      { name: 'Ballet Flats', price: '$49' },
      { name: 'Kolhapuri Flats', price: '$56' },
      { name: 'Everyday Flats', price: '$44' },
    ]),
    Sandals: withImage([
      { name: 'Bridal Sandals', price: '$88' },
      { name: 'Casual Sandals', price: '$52' },
      { name: 'Party Sandals', price: '$69' },
    ]),
    Juttis: withImage([
      { name: 'Mirror Juttis', price: '$58' },
      { name: 'Embroidered Juttis', price: '$63' },
      { name: 'Bridal Juttis', price: '$79' },
    ]),
    'Block Heels': withImage([
      { name: 'Classic Block Heel', price: '$72' },
      { name: 'Party Block Heel', price: '$84' },
      { name: 'Bridal Block Heel', price: '$96' },
    ]),
  },
  Bags: {
    Handbags: withImage([
      { name: 'Structured Handbag', price: '$89' },
      { name: 'Embroidered Handbag', price: '$99' },
      { name: 'Classic Shoulder Handbag', price: '$94' },
    ]),
    'Tote Bags': withImage([
      { name: 'Canvas Tote Bag', price: '$62' },
      { name: 'Printed Tote Bag', price: '$68' },
      { name: 'Large Utility Tote', price: '$74' },
    ]),
    Clutches: withImage([
      { name: 'Wedding Clutch', price: '$66' },
      { name: 'Sequin Clutch', price: '$72' },
      { name: 'Metallic Clutch', price: '$79' },
    ]),
    'Sling Bags': withImage([
      { name: 'Mini Sling Bag', price: '$55' },
      { name: 'Crossbody Sling', price: '$61' },
      { name: 'Party Sling Bag', price: '$69' },
    ]),
    Backpacks: withImage([
      { name: 'Everyday Backpack', price: '$81' },
      { name: 'Travel Backpack', price: '$92' },
      { name: 'Compact City Backpack', price: '$87' },
    ]),
  },
};

const catalogueRow = (title, items) => ({
  title,
  items: withImage(items),
});

export const categorySectionCatalogueRows = {
  Clothing: {
    Lehengas: [
      catalogueRow('Plain Lehengas', [
        { name: 'Ivory Everyday Lehenga', price: '$189' },
        { name: 'Rose Plain Lehenga', price: '$205' },
        { name: 'Sage Minimal Lehenga', price: '$214' },
        { name: 'Sand Beige Lehenga', price: '$224' },
        { name: 'Champagne Plain Lehenga', price: '$236' },
      ]),
      catalogueRow('Bridal Lehengas', [
        { name: 'Royal Red Bridal Lehenga', price: '$359' },
        { name: 'Wine Velvet Bridal Lehenga', price: '$389' },
        { name: 'Gold Zari Bridal Lehenga', price: '$419' },
        { name: 'Ruby Bridal Lehenga', price: '$429' },
        { name: 'Maroon Heritage Lehenga', price: '$445' },
      ]),
      catalogueRow('Gorgeous Lehengas', [
        { name: 'Emerald Occasion Lehenga', price: '$279' },
        { name: 'Peach Sequin Lehenga', price: '$299' },
        { name: 'Midnight Blue Lehenga', price: '$319' },
        { name: 'Lilac Glam Lehenga', price: '$327' },
        { name: 'Fuchsia Party Lehenga', price: '$339' },
      ]),
    ],
  },
};
