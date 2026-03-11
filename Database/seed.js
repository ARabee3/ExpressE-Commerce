/**
 * Furnify – Database Seeder
 * ─────────────────────────────────────────────────────────────
 * Usage:
 *   node Database/seed.js           → seed without wiping existing data
 *   node Database/seed.js --fresh   → drop everything first, then seed
 * ─────────────────────────────────────────────────────────────
 */

import "dotenv/config";
import mongoose from "mongoose";

import { userModel } from "./Models/user.model.js";
import { categoryModel } from "./Models/category.model.js";
import { productModel } from "./Models/product.model.js";
import { couponModel } from "./Models/coupon.model.js";
import { reviewModel } from "./Models/review.model.js";

const FRESH = process.argv.includes("--fresh");

// ── helpers ─────────────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── connect ─────────────────────────────────────────────────
async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in .env");
  await mongoose.connect(uri);
  console.log("✅  Connected to MongoDB:", mongoose.connection.db.databaseName);
}

// ── wipe ────────────────────────────────────────────────────
async function wipe() {
  if (!FRESH) return;
  await Promise.all([
    //userModel.deleteMany({}),
    categoryModel.deleteMany({}),
    productModel.deleteMany({}),
    couponModel.deleteMany({}),
    reviewModel.deleteMany({}),
  ]);
  console.log("🗑️   Wiped all existing data (--fresh mode)");
}

// ════════════════════════════════════════════════════════════
//  SEED DATA
// ════════════════════════════════════════════════════════════

// ── categories ──────────────────────────────────────────────
const CATEGORIES = [
  "Living Room",
  "Bedroom",
  "Dining Room",
  "Home Office",
  "Outdoor & Garden",
  "Kids Room",
];

// ── sellers ─────────────────────────────────────────────────
const SELLERS_DEF = [
  {
    name: "Mahmoud Fares",
    email: "mahmoud@furnify.com",
    phone: "+201001234567",
    storeName: "Luxe Wood Atelier",
  },
  {
    name: "Dina Mostafa",
    email: "dina@furnify.com",
    phone: "+201119876543",
    storeName: "Nordic Living Co.",
  },
  {
    name: "Omar Suleiman",
    email: "omar@furnify.com",
    phone: "+201234567891",
    storeName: "Casa Milano Egypt",
  },
];

// ── customers ───────────────────────────────────────────────
const CUSTOMERS_DEF = [
  { name: "Sara Ahmed", email: "sara@example.com", phone: "+201011111111" },
  { name: "Karim Nabil", email: "karim@example.com", phone: "+201022222222" },
  { name: "Nour El-Din", email: "nour@example.com", phone: "+201033333333" },
  { name: "Rania Khaled", email: "rania@example.com", phone: "+201044444444" },
  {
    name: "Youssef Magdy",
    email: "youssef@example.com",
    phone: "+201055555555",
  },
  { name: "Mona Sherif", email: "mona@example.com", phone: "+201066666666" },
];

// ── products per category ────────────────────────────────────
// Images: curated Unsplash URLs (stable direct links)
const PRODUCTS_BY_CATEGORY = {
  "Living Room": [
    {
      name: "Oslo 3-Seater Linen Sofa",
      description:
        "Timeless Scandinavian design meets everyday comfort. Solid oak legs, removable linen covers in natural beige. L 220 × D 90 × H 82 cm.",
      price: 12999,
      stock: 18,
      images: [
        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=80",
        "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=900&q=80",
      ],
    },
    {
      name: "Havana Full-Grain Leather Armchair",
      description:
        "Hand-stitched full-grain cognac leather with solid beech frame. A statement piece that softens with age. W 82 × D 88 × H 96 cm.",
      price: 7499,
      stock: 12,
      images: [
        "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=900&q=80",
        "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=900&q=80",
      ],
    },
    {
      name: "Venice Marble & Brass Coffee Table",
      description:
        "Calacatta marble top on a brushed brass steel base. The centrepiece every living room deserves. Ø 90 × H 42 cm.",
      price: 5299,
      stock: 9,
      images: [
        "https://images.unsplash.com/photo-1549497538-303791108f95?w=900&q=80",
      ],
    },
    {
      name: "Bergen TV Unit – Smoked Oak",
      description:
        'Low-profile TV unit in smoked oak veneer with push-to-open drawers. Fits screens up to 75". W 160 × D 40 × H 50 cm.',
      price: 3899,
      stock: 22,
      images: [
        "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=900&q=80",
      ],
    },
    {
      name: "Stockholm 5-Tier Modular Bookshelf",
      description:
        "Customisable pine bookshelf system. Each unit slots together without tools. W 80 × D 30 × H 180 cm per tower.",
      price: 2499,
      stock: 35,
      images: [
        "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=900&q=80",
      ],
    },
    {
      name: "Kyoto Floor Lamp – Bamboo & Linen",
      description:
        "Handcrafted natural bamboo stand with a warm linen shade. Dimmable E27 socket. H 165 cm.",
      price: 1299,
      stock: 40,
      images: [
        "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=900&q=80",
      ],
    },
  ],

  Bedroom: [
    {
      name: "Elba King Bed – Solid Walnut",
      description:
        "Minimalist king-size bed frame crafted from solid American walnut with a low-profile headboard. Slat base included. For 180 × 200 cm mattresses.",
      price: 14500,
      stock: 10,
      images: [
        "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900&q=80",
        "https://images.unsplash.com/photo-1505693314120-0d443867891c?w=900&q=80",
      ],
    },
    {
      name: "Copenhagen Bedside Table – White Oak",
      description:
        "Single-drawer nightstand in white oak with a soft-close mechanism and brass handle. W 45 × D 40 × H 55 cm.",
      price: 1799,
      stock: 30,
      images: [
        "https://images.unsplash.com/photo-1616627561839-074385245ff6?w=900&q=80",
      ],
    },
    {
      name: "Riva 6-Drawer Tall Dresser",
      description:
        "Tall chest-of-drawers in matte charcoal lacquer. Smooth-glide drawers with hidden handles. W 60 × D 45 × H 130 cm.",
      price: 4200,
      stock: 14,
      images: [
        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=80",
      ],
    },
    {
      name: "Luna Fabric Upholstered Headboard – Queen",
      description:
        "Floor-to-ceiling velvet headboard panel in dusty sage. Attaches to any standard queen frame. W 160 × H 140 cm.",
      price: 2950,
      stock: 20,
      images: [
        "https://images.unsplash.com/photo-1588046130717-0eb0c9a3ba15?w=900&q=80",
      ],
    },
    {
      name: "Aura Wardrobe – 3-Door Sliding Mirror",
      description:
        "Floor-to-ceiling wardrobe with full-length mirror doors, interior LED strip, and 3 hanging rails. W 210 × D 60 × H 220 cm.",
      price: 18500,
      stock: 7,
      images: [
        "https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=900&q=80",
      ],
    },
  ],

  "Dining Room": [
    {
      name: "Milano Extendable Dining Table – Smoked Oak",
      description:
        "Seats 6 normally and extends to 10. Solid smoked oak legs, engineered oak top with butterfly leaf. L 160–220 × W 90 × H 76 cm.",
      price: 9800,
      stock: 11,
      images: [
        "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=900&q=80",
        "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=900&q=80",
      ],
    },
    {
      name: "Bergen Solid Oak Dining Chair (Set of 2)",
      description:
        "Solid oak frame with padded seat in sand linen. Stackable. Seat height 46 cm. Sold as a set of 2.",
      price: 3499,
      stock: 40,
      images: [
        "https://images.unsplash.com/photo-1604578762246-41134e37f9cc?w=900&q=80",
      ],
    },
    {
      name: "Roma Marble Dining Table – Round",
      description:
        "Book-matched Carrara marble top on a powder-coated black steel base. Ø 120 × H 75 cm. Seats 4 comfortably.",
      price: 8200,
      stock: 8,
      images: [
        "https://images.unsplash.com/photo-1556909211-36987daf7b4d?w=900&q=80",
      ],
    },
    {
      name: "Vienna Rattan Dining Chair",
      description:
        "Natural rattan weave with solid teak legs and cushion in off-white boucle. H 85 × W 55 × D 55 cm.",
      price: 1950,
      stock: 50,
      images: [
        "https://images.unsplash.com/photo-1503602642458-232111445657?w=900&q=80",
      ],
    },
    {
      name: "Atlas Sideboard – 3-Door Walnut",
      description:
        "Generously sized sideboard with 3 doors and adjustable shelves. Brushed gold handles. W 180 × D 45 × H 80 cm.",
      price: 6750,
      stock: 13,
      images: [
        "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=900&q=80",
      ],
    },
  ],

  "Home Office": [
    {
      name: "Copenhagen Sit-Stand Desk – White Oak",
      description:
        "Electric height-adjustable desk (68–130 cm). White oak veneer top with integrated cable tray. W 160 × D 80 cm.",
      price: 8500,
      stock: 16,
      images: [
        "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=900&q=80",
        "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=900&q=80",
      ],
    },
    {
      name: "Ergon Pro Executive Chair",
      description:
        "Full lumbar support, adjustable armrests, breathable mesh back. Certified for 8-hour daily use. Seat height 42–52 cm.",
      price: 5999,
      stock: 24,
      images: [
        "https://images.unsplash.com/photo-1579403124614-197f69d8187b?w=900&q=80",
      ],
    },
    {
      name: "Grid Pegboard Desk Organiser – Ash",
      description:
        "Wall-mounted ash wood pegboard system with 12 removable hooks, 2 small shelves, and a cable holder. 60 × 60 cm.",
      price: 890,
      stock: 60,
      images: [
        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=900&q=80",
      ],
    },
    {
      name: "Alto 2-Door Filing Cabinet – Charcoal",
      description:
        "Powder-coated steel cabinet with A4 filing rails, soft-close drawers, and a central lock. W 46 × D 62 × H 72 cm.",
      price: 2100,
      stock: 28,
      images: [
        "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=900&q=80",
      ],
    },
    {
      name: "Mono Floating Wall Desk",
      description:
        "Fold-down oak wall desk with a hidden bracket system. Folds flat when not in use. W 100 × D 40 cm open.",
      price: 1650,
      stock: 33,
      images: [
        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=80",
      ],
    },
  ],

  "Outdoor & Garden": [
    {
      name: "Bali Teak Outdoor Lounge Set – 4-Piece",
      description:
        "Weather-resistant Grade A teak sofa, 2 armchairs, and coffee table. Stainless steel hardware. Cushions in charcoal sunbrella fabric.",
      price: 22000,
      stock: 5,
      images: [
        "https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=900&q=80",
        "https://images.unsplash.com/photo-1523413363574-c30aa1c2a516?w=900&q=80",
      ],
    },
    {
      name: "Porto Rattan Hanging Egg Chair",
      description:
        "UV-resistant woven rattan seat with powder-coated steel frame. Includes cushion in cream cotton. Max load 120 kg.",
      price: 3800,
      stock: 18,
      images: [
        "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=900&q=80",
      ],
    },
    {
      name: "Ibiza Parasol – 3m Bamboo",
      description:
        "Natural bamboo parasol with UV50+ polyester canopy in terra-cotta. Pole diameter 4.8 cm. Includes ground sleeve.",
      price: 1599,
      stock: 25,
      images: [
        "https://images.unsplash.com/photo-1568196166686-0ef2b2fbab29?w=900&q=80",
      ],
    },
    {
      name: "Andes Planter Box – Corten Steel",
      description:
        "Self-watering corten steel planter with drainage holes and tray. Develops a rust patina for an industrial-organic look. L 80 × W 30 × H 40 cm.",
      price: 1200,
      stock: 32,
      images: [
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=900&q=80",
      ],
    },
  ],

  "Kids Room": [
    {
      name: "Treehouse Loft Bed – Pine",
      description:
        "Full-size loft bed with a built-in slide, climbing rope, and under-bed play space. Non-toxic paint. For ages 4–12. Max 120 kg.",
      price: 9500,
      stock: 8,
      images: [
        "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=900&q=80",
        "https://images.unsplash.com/photo-1616137466211-f939a420be84?w=900&q=80",
      ],
    },
    {
      name: "Rainbow Study Desk & Chair Set",
      description:
        "Height-adjustable desk (52–76 cm) and ergonomic chair for children 6–14. Pastel colour options. Tilting desktop, footrest included.",
      price: 3200,
      stock: 20,
      images: [
        "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=900&q=80",
      ],
    },
    {
      name: "Jungle Storage Shelving Unit",
      description:
        "Freestanding bookshelf and toy box combo with animal-shaped wooden cutouts. Anti-tip wall anchor included. W 120 × H 150 cm.",
      price: 2400,
      stock: 27,
      images: [
        "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=900&q=80",
      ],
    },
    {
      name: "Mini Velvet Sofa – Blush Pink",
      description:
        "Kids-sized 2-seater sofa in plush velvet. Solid pine frame. Perfect for a reading corner. W 100 × D 55 × H 60 cm. Ages 2–8.",
      price: 1850,
      stock: 22,
      images: [
        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=80",
      ],
    },
  ],
};

// ── reviews bank ─────────────────────────────────────────────
const REVIEW_TEMPLATES = [
  {
    review:
      "Absolutely love this piece — exactly as described and the quality is outstanding.",
    rating: 5,
  },
  {
    review:
      "Great value for money. The finish is smooth and delivery was fast.",
    rating: 5,
  },
  {
    review:
      "Solid construction, looks even better in person than in the photos.",
    rating: 5,
  },
  {
    review:
      "Easy to assemble with clear instructions. Very happy with the purchase.",
    rating: 4,
  },
  {
    review:
      "Beautiful piece, fits perfectly in our living room. Minor assembly required.",
    rating: 4,
  },
  {
    review:
      "Good quality overall. One small scuff on corner but customer service sorted it quickly.",
    rating: 4,
  },
  {
    review:
      "Lovely design. Delivery took a little longer than expected but worth the wait.",
    rating: 4,
  },
  {
    review: "Decent quality for the price. Looks good in the room.",
    rating: 3,
  },
  {
    review:
      "Not bad but the colour is slightly different from the website photos.",
    rating: 3,
  },
];

// ── coupons ──────────────────────────────────────────────────
const COUPONS_DEF = [
  {
    code: "WELCOME10",
    discountType: "percentage",
    discount: 10,
    expireDate: new Date("2026-12-31"),
    usageLimit: 500,
    isActive: true,
  },
  {
    code: "SUMMER20",
    discountType: "percentage",
    discount: 20,
    expireDate: new Date("2026-09-30"),
    usageLimit: 200,
    isActive: true,
  },
  {
    code: "FLAT500",
    discountType: "fixed",
    discount: 500,
    expireDate: new Date("2026-12-31"),
    usageLimit: 100,
    isActive: true,
  },
  {
    code: "VIP30",
    discountType: "percentage",
    discount: 30,
    expireDate: new Date("2026-06-30"),
    usageLimit: 50,
    isActive: true,
  },
  {
    code: "FREESHIP",
    discountType: "fixed",
    discount: 150,
    expireDate: new Date("2026-12-31"),
    usageLimit: 1000,
    isActive: true,
  },
];

// ════════════════════════════════════════════════════════════
//  MAIN SEED FUNCTION
// ════════════════════════════════════════════════════════════
async function seed() {
  await connect();
  await wipe();

  // ── 1. Admin ──────────────────────────────────────────────
  const adminExists = await userModel.findOne({ email: "admin@furnify.com" });
  let admin;
  if (adminExists) {
    admin = adminExists;
    console.log("ℹ️   Admin already exists, skipping creation.");
  } else {
    admin = await userModel.create({
      name: "Furnify Admin",
      email: "admin@furnify.com",
      password: "Admin@Furnify2024",
      phone: "+201000000000",
      role: "Admin",
      isVerified: true,
      isActive: true,
    });
    console.log("👤  Admin created → admin@furnify.com / Admin@Furnify2024");
  }

  // ── 2. Sellers ────────────────────────────────────────────
  const sellers = [];
  for (const def of SELLERS_DEF) {
    const exists = await userModel.findOne({ email: def.email });
    if (exists) {
      sellers.push(exists);
      console.log(`ℹ️   Seller ${def.email} already exists, skipping.`);
      continue;
    }
    const seller = await userModel.create({
      ...def,
      password: "Seller@Furnify2024",
      role: "Seller",
      isVerified: true,
      isApproved: true,
      isActive: true,
    });
    sellers.push(seller);
    console.log(`🏪  Seller created → ${def.email} (${def.storeName})`);
  }

  // ── 3. Customers ──────────────────────────────────────────
  const customers = [];
  for (const def of CUSTOMERS_DEF) {
    const exists = await userModel.findOne({ email: def.email });
    if (exists) {
      customers.push(exists);
      continue;
    }
    const customer = await userModel.create({
      ...def,
      password: "Customer@2024",
      role: "Customer",
      isVerified: true,
    });
    customers.push(customer);
  }
  console.log(`👥  ${customers.length} customers created`);

  // ── 4. Categories ─────────────────────────────────────────
  const categoryMap = {}; // name → document
  for (const name of CATEGORIES) {
    const exists = await categoryModel.findOne({ name });
    if (exists) {
      categoryMap[name] = exists;
      console.log(`ℹ️   Category "${name}" already exists, skipping.`);
      continue;
    }
    const cat = await categoryModel.create({ name });
    categoryMap[name] = cat;
    console.log(`📂  Category created → ${name}`);
  }

  // ── 5. Products ───────────────────────────────────────────
  const allProducts = [];
  for (const [catName, items] of Object.entries(PRODUCTS_BY_CATEGORY)) {
    const category = categoryMap[catName];
    if (!category) continue;

    for (const item of items) {
      const exists = await productModel.findOne({ name: item.name });
      if (exists) {
        allProducts.push(exists);
        console.log(`ℹ️   Product "${item.name}" already exists, skipping.`);
        continue;
      }
      const seller = pick(sellers);
      const product = await productModel.create({
        sellerId: seller._id,
        category: category._id,
        name: item.name,
        description: item.description,
        price: item.price,
        stock: item.stock,
        images: item.images,
      });
      allProducts.push(product);
      console.log(`🪑  Product created → ${item.name} (EGP ${item.price})`);
    }
  }

  // ── 6. Reviews ────────────────────────────────────────────
  // Build all review docs first, then insertMany (bypasses per-save hooks
  // so we avoid one aggregation query per review — much faster).
  // We recalculate ratings in a single pass afterwards.
  const reviewDocs = [];
  const seen = new Set(); // "userId_productId" to avoid duplicates

  for (const product of allProducts) {
    const reviewersCount = Math.floor(Math.random() * 3) + 2; // 2-4 reviews
    const shuffled = [...customers]
      .sort(() => Math.random() - 0.5)
      .slice(0, reviewersCount);

    for (const customer of shuffled) {
      const key = `${customer._id}_${product._id}`;
      if (seen.has(key)) continue;

      // Skip if a review already exists in DB
      const exists = await reviewModel.findOne({
        user: customer._id,
        product: product._id,
      });
      if (exists) {
        seen.add(key);
        continue;
      }

      const template = pick(REVIEW_TEMPLATES);
      reviewDocs.push({
        user: customer._id,
        product: product._id,
        review: template.review,
        rating: template.rating,
      });
      seen.add(key);
    }
  }

  if (reviewDocs.length > 0) {
    // ordered:false lets it skip duplicates without aborting the whole batch
    await reviewModel
      .insertMany(reviewDocs, { ordered: false })
      .catch(() => {});
  }

  // Recalculate ratings for every product in one parallel pass
  console.log(
    `⭐  Inserted ${reviewDocs.length} reviews – recalculating ratings…`,
  );
  await Promise.all(
    allProducts.map((p) => reviewModel.calcAverageRating(p._id)),
  );
  console.log(`✅  Ratings updated for ${allProducts.length} products`);

  // ── 7. Coupons ────────────────────────────────────────────
  for (const def of COUPONS_DEF) {
    const exists = await couponModel.findOne({ code: def.code });
    if (exists) {
      console.log(`ℹ️   Coupon ${def.code} already exists, skipping.`);
      continue;
    }
    await couponModel.create(def);
    console.log(
      `🎟️   Coupon created → ${def.code} (${def.discountType === "percentage" ? def.discount + "%" : "EGP " + def.discount} off)`,
    );
  }

  // ── Summary ───────────────────────────────────────────────
  console.log("\n════════════════════════════════════════");
  console.log("🌱  Seeding complete!");
  console.log(`    Categories : ${CATEGORIES.length}`);
  console.log(`    Sellers    : ${SELLERS_DEF.length}`);
  console.log(`    Customers  : ${CUSTOMERS_DEF.length}`);
  console.log(`    Products   : ${allProducts.length}`);
  console.log(`    Coupons    : ${COUPONS_DEF.length}`);
  console.log("════════════════════════════════════════");
  console.log("\n🔑  Test credentials:");
  console.log("    Admin    → admin@furnify.com       / Admin@Furnify2024");
  console.log("    Sellers  → mahmoud@furnify.com     / Seller@Furnify2024");
  console.log("             → dina@furnify.com        / Seller@Furnify2024");
  console.log("             → omar@furnify.com        / Seller@Furnify2024");
  console.log("    Customer → sara@example.com        / Customer@2024");
}

seed()
  .catch((err) => {
    console.error("❌  Seed failed:", err);
    process.exit(1);
  })
  .finally(() => mongoose.disconnect());
