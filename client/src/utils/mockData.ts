export interface Variant {
  id: number;
  product_id: number;
  variant_name: string;
  price_php: number;
  price_jpy?: number;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  pricePhp: number;
  priceJpy?: number;
  stock: number;
  imageUrl: string;
  variants?: Variant[];
  variantId?: number;
  variantName?: string;
  has_variants?: boolean;
  min_price?: number;
  max_price?: number;
}

export const MOCK_CATEGORIES = ["All", "Skincare", "Snacks", "Electronics", "Fashion"];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Hada Labo Gokujyun Premium Lotion",
    description: "Premium hydrating skin lotion with 7 types of hyaluronic acid.",
    category: "Skincare",
    pricePhp: 850,
    priceJpy: 2200,
    stock: 25,
    imageUrl: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "p2",
    name: "Kit Kat Matcha Green Tea",
    description: "Nestle Mini Kit Kat Chocolate Green Tea Matcha Flavor. (12 pieces)",
    category: "Snacks",
    pricePhp: 350,
    priceJpy: 800,
    stock: 50,
    imageUrl: "https://images.unsplash.com/photo-1621236378699-8587bfdc9f28?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "p3",
    name: "Nintendo Switch OLED - White",
    description: "Latest model of Nintendo Switch with vibrant OLED screen.",
    category: "Electronics",
    pricePhp: 16500,
    priceJpy: 37980,
    stock: 5,
    imageUrl: "https://images.unsplash.com/photo-1617462835948-4cbab5244ad2?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "p4",
    name: "Uniqlo AIRism Cotton Oversized T-Shirt",
    description: "Smooth AIRism fabric with the look of cotton. Relaxed, oversized cut.",
    category: "Fashion",
    pricePhp: 990,
    priceJpy: 1990,
    stock: 12,
    imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "p5",
    name: "Melano CC Vitamin C Essence",
    description: "Intensive anti-spot essence formulation that suppresses melanin production.",
    category: "Skincare",
    pricePhp: 750,
    priceJpy: 1500,
    stock: 30,
    imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "p6",
    name: "Tokyo Banana Original",
    description: "The classic Tokyo souvenir. Fluffy sponge cake with banana custard cream.",
    category: "Snacks",
    pricePhp: 890,
    priceJpy: 1600,
    stock: 15,
    imageUrl: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=400&q=80",
  }
];

export const MOCK_CONFIG = {
  cutoffDate: "2026-05-31T23:59:59+08:00",
  etaStart: "2026-08-01T00:00:00+08:00",
  etaEnd: "2026-08-07T23:59:59+08:00",
};
