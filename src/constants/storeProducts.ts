export type StoreProduct = {
  name: string;
  price: number;
  store: string;
  url: string;
};

// Real product catalog from Ferretería Vidrí (El Salvador) with working hash search URLs
export const VIDRI_PRODUCTS: StoreProduct[] = [
  {
    name: "Yeso para Construcción 5 Lbs",
    price: 1.50,
    store: "Ferretería Vidrí",
    url: "https://www.vidri.com.sv/#464e/fullscreen/q=yeso"
  },
  {
    name: "Mortero Seco de Reparación Gris 10 Lbs Sika",
    price: 4.50,
    store: "Ferretería Vidrí",
    url: "https://www.vidri.com.sv/#464e/fullscreen/q=mortero"
  },
  {
    name: "Espátula Metálica de 3 Pulgadas Truper",
    price: 3.20,
    store: "Ferretería Vidrí",
    url: "https://www.vidri.com.sv/#464e/fullscreen/q=espatula"
  },
  {
    name: "Lija de Agua Grano 120 Truper",
    price: 0.65,
    store: "Ferretería Vidrí",
    url: "https://www.vidri.com.sv/#464e/fullscreen/q=lija"
  },
  {
    name: "Cemento Gris Portland Canal de 5 Kg",
    price: 3.90,
    store: "Ferretería Vidrí",
    url: "https://www.vidri.com.sv/#464e/fullscreen/q=cemento"
  },
  {
    name: "Brocha de Pintura de 2 Pulgadas Truper",
    price: 2.15,
    store: "Ferretería Vidrí",
    url: "https://www.vidri.com.sv/#464e/fullscreen/q=brocha"
  },
  {
    name: "Sellador Acrílico Blanco para Grietas Sika 300ml",
    price: 5.80,
    store: "Ferretería Vidrí",
    url: "https://www.vidri.com.sv/#464e/fullscreen/q=sellador"
  },
  {
    name: "Cinta de Enmascarar (Masking Tape) Tucán 1\"",
    price: 1.75,
    store: "Ferretería Vidrí",
    url: "https://www.vidri.com.sv/#464e/fullscreen/q=cinta"
  },
  {
    name: "Clavos para Concreto de 1.5\" (Caja 100 und)",
    price: 2.90,
    store: "Ferretería Vidrí",
    url: "https://www.vidri.com.sv/#464e/fullscreen/q=clavos"
  },
  {
    name: "Pintura Acrílica Mate Blanca Excelsior 1 Galón",
    price: 19.50,
    store: "Ferretería Vidrí",
    url: "https://www.vidri.com.sv/#464e/fullscreen/q=pintura"
  },
  {
    name: "Silicona Multiuso Transparente Sika 280ml",
    price: 5.20,
    store: "Ferretería Vidrí",
    url: "https://www.vidri.com.sv/#464e/fullscreen/q=silicona"
  },
  {
    name: "Mezcla de Concreto Listo Fuerte 10 Lbs",
    price: 4.80,
    store: "Ferretería Vidrí",
    url: "https://www.vidri.com.sv/#464e/fullscreen/q=concreto"
  },
  {
    name: "Llana Metálica Lisa Truper",
    price: 7.50,
    store: "Ferretería Vidrí",
    url: "https://www.vidri.com.sv/#464e/fullscreen/q=llana"
  },
  {
    name: "Masilla de Resane para Drywall Truper 1 Kg",
    price: 4.10,
    store: "Ferretería Vidrí",
    url: "https://www.vidri.com.sv/#464e/fullscreen/q=masilla"
  }
];

// Helper to map generic OpenAI material names to real Vidrí products matching budget
export function mapMaterialsToVidriProducts(materials: string[], budget: number, customCatalog?: StoreProduct[]): StoreProduct[] {
  let currentBudgetSpent = 0;
  const resultProducts: StoreProduct[] = [];
  const activeCatalog = customCatalog || VIDRI_PRODUCTS;

  materials.forEach(materialName => {
    const normalizedMat = materialName.toLowerCase();
    
    // Find matching product in catalog
    const matchedProduct = activeCatalog.find(product => {
      const prodName = product.name.toLowerCase();
      return (
        prodName.includes(normalizedMat) || 
        normalizedMat.includes("yeso") && prodName.includes("yeso") ||
        normalizedMat.includes("mortero") && prodName.includes("mortero") ||
        normalizedMat.includes("espatula") && prodName.includes("espatula") ||
        normalizedMat.includes("lija") && prodName.includes("lija") ||
        normalizedMat.includes("cemento") && prodName.includes("cemento") ||
        normalizedMat.includes("brocha") && prodName.includes("brocha") ||
        normalizedMat.includes("sellador") && prodName.includes("sellador") ||
        normalizedMat.includes("cinta") && prodName.includes("cinta") ||
        normalizedMat.includes("clavos") && prodName.includes("clavos") ||
        normalizedMat.includes("pintura") && prodName.includes("pintura") ||
        normalizedMat.includes("silicona") && prodName.includes("silicona") ||
        normalizedMat.includes("masilla") && prodName.includes("masilla")
      );
    });

    if (matchedProduct) {
      const nextTotal = currentBudgetSpent + matchedProduct.price;
      if (nextTotal <= budget) {
        resultProducts.push(matchedProduct);
        currentBudgetSpent = nextTotal;
      }
    } else {
      // Link to the working search structure of Vidri if no catalog product matches
      const searchTerms = encodeURIComponent(materialName);
      resultProducts.push({
        name: materialName,
        price: 0,
        store: "Ferretería Vidrí",
        url: `https://www.vidri.com.sv/#464e/fullscreen/q=${searchTerms}`
      });
    }
  });

  return resultProducts;
}
