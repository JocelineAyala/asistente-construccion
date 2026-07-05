import os
import json
import urllib.parse
from playwright.sync_api import sync_playwright

# List of materials we want to scrape from Almacenes Vidrí
MATERIALS_TO_SEARCH = [
    "yeso", "mortero", "espatula", "lija", "cemento", "brocha", 
    "sellador", "cinta", "clavos", "pintura", "silicona", "llana", "masilla"
]

def scrape_vidri():
    print("Iniciando Playwright (en modo visible para evitar bloqueos) para extraer productos de Vidrí...")
    
    # Ensure the public directory exists
    os.makedirs("./public", exist_ok=True)
    
    scraped_products = []
    
    with sync_playwright() as p:
        # Launch headed browser (headless=False)
        browser = p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()
        
        for material in MATERIALS_TO_SEARCH:
            print(f"Buscando '{material}' en Vidrí...")
            
            # Construct the dynamic search URL used by Almacenes Vidrí
            search_query = urllib.parse.quote(material)
            search_url = f"https://www.vidri.com.sv/#464e/fullscreen/q={search_query}"
            
            try:
                page.goto(search_url, wait_until="load", timeout=15000)
                
                # Wait 3 seconds for client-side scripts to run and search container to open
                page.wait_for_timeout(3000)
                
                # Wait for the search results container to be visible
                page.wait_for_selector(".df-card", timeout=8000)
                
                # Query all the product cards returned by the search engine
                cards = page.query_selector_all(".df-card")
                count = 0
                
                for card in cards:
                    if count >= 3: # Capture top 3 matches
                        break
                        
                    try:
                        # Extract product title
                        title_el = card.query_selector(".df-card__title")
                        title = title_el.inner_text().strip() if title_el else ""
                        
                        # Extract product price
                        price_el = card.query_selector(".df-card__price")
                        price_str = price_el.inner_text().strip() if price_el else ""
                        
                        # Convert to clean numeric float
                        price = float(price_str.replace("$", "").replace(" ", "").strip()) if price_str else 0.0
                        
                        # Extract direct purchase URL
                        url = card.get_attribute("href") or search_url
                        
                        if title and price > 0:
                            scraped_products.append({
                                "name": title,
                                "price": price,
                                "store": "Ferretería Vidrí",
                                "url": url
                            })
                            count += 1
                    except Exception as card_err:
                        continue
                
                print(f"  -> Encontrados {count} productos para '{material}'")
                        
            except Exception as e:
                print(f"  -> No se pudo completar la búsqueda para '{material}': {e}")
                
        browser.close()
        
    # Save the scraped catalog to materials_scraped.json inside the public directory
    output_path = "./public/materiales_scraped.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(scraped_products, f, ensure_ascii=False, indent=2)
        
    print(f"\n¡Proceso de Scraping completado con éxito!")
    print(f"Se guardaron {len(scraped_products)} productos reales en '{output_path}'")

if __name__ == "__main__":
    scrape_vidri()
