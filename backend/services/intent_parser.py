import json
import re
import asyncio
import logging
import google.generativeai as genai
from typing import Dict, Any, Optional, List, Union

from backend.core.config import settings
from backend.schemas.command import ParsedIntent, MultiStepPlan

logger = logging.getLogger(__name__)


class FallbackParser:

    KEYWORD_PATTERNS = {


        'create_product': [
            r'(?:create|add|new|banao|जोड़ो|बनाओ|नया)\s+(?:a\s+)?(?:product|प्रोडक्ट)',
            r'(?:product|प्रोडक्ट)\s+(?:create|add|banao|जोड़ो|बनाओ)',

            r'\b(?:add|create|new|banao|जोड़ो|बनाओ|नया)\b\s+.*?\b(?:price|selling price|कीमत|दाम|प्राइस)\b',
            r'\b(?:add|create|new|banao|जोड़ो|बनाओ|नया)\b\s+.*?\b(?:stock|quantity|qty|मात्रा|स्टॉक)\b',

            r'\bselling\s+price\s+is\b',
            r'\bprice\s+is\b.*\bstock\s+is\b',

            r'.*?\b(?:price|कीमत|दाम|प्राइस)\b.*?\b(?:add\s*karo|banao|जोड़ो|बनाओ)\b',
        ],

        'list_products': [
            r'(?:सभी|सारे|all)\s*(?:प्रोडक्ट|products?|प्रोडक्ट्स)',
            r'(?:प्रोडक्ट|products?|प्रोडक्ट्स)\s*(?:दिखाओ|दिखा|dikhao|list|show|batao|बताओ)',
            r'(?:show|list|दिखाओ|dikhao)\s*(?:all\s*)?(?:प्रोडक्ट|products?|प्रोडक्ट्स)',
            r'products?\s*(?:list|show|दिखाओ)',
        ],
        'get_low_stock': [
            r'(?:low|कम|kam)\s*(?:stock|स्टॉक)',
            r'(?:stock|स्टॉक)\s*(?:कम|low|kam)',
            r'(?:कम|low)\s*(?:stock|स्टॉक)\s*(?:दिखाओ|dikhao|show|batao)?',
            r'low\s*stock\s*(?:products?|items?|प्रोडक्ट)?',
        ],
        'search_products': [
            r'(?:search|खोजो|khojo|ढूंढो|dhundho|find)\s+(.+)',
            r'(.+)\s*(?:खोजो|khojo|ढूंढो|dhundho|search)',
        ],


        'list_orders': [
            r'(?:सभी|सारे|all)\s*(?:orders?|ऑर्डर|ऑर्डर्स)',
            r'(?:orders?|ऑर्डर)\s*(?:दिखाओ|दिखा|dikhao|list|show|batao|बताओ)',
            r'(?:show|list|दिखाओ|dikhao)\s*(?:all\s*)?(?:orders?|ऑर्डर)',
            r'(?:pending|confirmed|shipped)\s*orders?',
            r'(?:पेंडिंग|कन्फर्म|शिप)\s*(?:orders?|ऑर्डर)',
        ],
        'list_my_orders': [
            r'(?:मेरे|mere|my)\s*(?:orders?|ऑर्डर)',
            r'(?:my|मेरे)\s*(?:orders?|ऑर्डर)\s*(?:दिखाओ|dikhao|show)?',
        ],


        'get_shop_dashboard': [
            r'(?:dashboard|डैशबोर्ड)',
            r'(?:shop|दुकान|store)\s*(?:stats?|statistics|स्टैट्स)',
            r'(?:my|मेरी|मेरा)\s*(?:stats?|dashboard|डैशबोर्ड)',
            r'(?:stats?|स्टैट्स)\s*(?:दिखाओ|dikhao|show)?',
        ],
        'get_platform_stats': [
            r'(?:platform|प्लेटफॉर्म)\s*(?:stats?|statistics|स्टैट्स)',
            r'(?:overall|total|कुल)\s*(?:stats?|statistics|स्टैट्स)',
        ],
        'get_daily_profit': [
            r'(?:आज\s*का|aaj\s*ka|today\'?s?)\s*(?:profit|प्रॉफिट|मुनाफा)',
            r'(?:daily|रोज़|रोज)\s*(?:profit|प्रॉफिट|मुनाफा)',
            r'(?:profit|प्रॉफिट)\s*(?:आज|today|daily)',
        ],
        'get_profit_summary': [
            r'(?:profit|प्रॉफिट|मुनाफा)\s*(?:summary|report|दिखाओ|dikhao|show|batao)?',
            r'(?:show|दिखाओ|dikhao)\s*(?:profit|प्रॉफिट|मुनाफा)',
            r'(?:मेरा|mera|my)\s*(?:profit|प्रॉफिट|मुनाफा)',
        ],


        'list_shops': [
            r'(?:सभी|सारे|all)\s*(?:shops?|दुकान|दुकानें|stores?)',
            r'(?:shops?|दुकान|दुकानें)\s*(?:दिखाओ|दिखा|dikhao|list|show|batao)',
            r'(?:show|list|दिखाओ|dikhao)\s*(?:all\s*)?(?:shops?|दुकान)',
        ],
        'get_pending_shops': [
            r'(?:pending|पेंडिंग)\s*(?:shops?|दुकान|दुकानें)',
            r'(?:shops?|दुकान)\s*(?:pending|पेंडिंग|verification)',
            r'(?:unverified|अनवेरिफाइड)\s*(?:shops?|दुकान)',
        ],
        'verify_shop': [
            r'(?:verify|वेरिफाई|approve|अप्रूव)\s*(?:shop|दुकान)\s*(.+)?',
            r'(?:shop|दुकान)\s*(.+)?\s*(?:verify|वेरिफाई|approve|अप्रूव)\s*(?:करो|karo)?',
        ],


        'list_customers': [
            r'(?:सभी|सारे|all)\s*(?:customers?|ग्राहक|कस्टमर)',
            r'(?:customers?|ग्राहक|कस्टमर)\s*(?:दिखाओ|dikhao|list|show|batao)',
            r'(?:show|list|दिखाओ|dikhao)\s*(?:all\s*)?(?:customers?|ग्राहक)',
        ],


        'list_users': [
            r'(?:सभी|सारे|all)\s*(?:users?|यूज़र)',
            r'(?:users?|यूज़र)\s*(?:दिखाओ|dikhao|list|show)',
        ],


        'list_shop_categories': [
            r'(?:categories|कैटेगरी|श्रेणी)\s*(?:दिखाओ|dikhao|list|show)?',
            r'(?:shop|दुकान)\s*(?:categories|कैटेगरी)',
        ],
        'place_order': [
            r'(?:buy|order|purchase|खरीद|ऑर्डर|kharido|kharidna)\s+(.+)',
            r'(.+)\s*(?:buy|order|purchase|खरीद|ऑर्डर|kharido|kharidna|चाहिए)',
        ],
        'sell_at_price': [
            r'(?:sell|sold|becho|बेचो)\s+(.+)',
        ],
    }


    ACTION_ENTITY_MAP = {
        'create_product': 'product',
        'list_products': 'product',
        'get_low_stock': 'product',
        'search_products': 'product',
        'list_orders': 'order',
        'list_my_orders': 'order',
        'get_shop_dashboard': 'shop',
        'get_platform_stats': 'platform',
        'get_daily_profit': 'shop',
        'get_profit_summary': 'shop',
        'list_shops': 'shop',
        'get_pending_shops': 'shop',
        'verify_shop': 'shop',
        'list_customers': 'customer',
        'list_users': 'user',
        'list_shop_categories': 'category',
        'place_order': 'order',
        'sell_at_price': 'product',
    }


    @staticmethod
    def _extract_number(pattern: str, text: str) -> Optional[float]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return float(m.group(1).replace(',', ''))
        return None

    @staticmethod
    def _extract_str(pattern: str, text: str) -> Optional[str]:
        m = re.search(pattern, text, re.IGNORECASE)
        return m.group(1).strip() if m else None

    @staticmethod
    def _parse_date(date_str: str) -> Optional[str]:
        from datetime import datetime
        date_str = date_str.strip().lower()
        months = {
            'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
            'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
            'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
            'nov': 11, 'november': 11, 'dec': 12, 'december': 12
        }
        

        m = re.search(r'([a-z]+)\s+(\d{1,2})[,\s]+(\d{4})', date_str)
        if m:
            mon_str, day_str, yr_str = m.groups()
            if mon_str in months:
                try:
                    dt = datetime(int(yr_str), months[mon_str], int(day_str))
                    return dt.isoformat()
                except ValueError:
                    pass


        m = re.search(r'(\d{1,2})\s+([a-z]+)[,\s]+(\d{4})', date_str)
        if m:
            day_str, mon_str, yr_str = m.groups()
            if mon_str in months:
                try:
                    dt = datetime(int(yr_str), months[mon_str], int(day_str))
                    return dt.isoformat()
                except ValueError:
                    pass


        m = re.search(r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})', date_str)
        if m:
            yr_str, mon_str, day_str = m.groups()
            try:
                dt = datetime(int(yr_str), int(mon_str), int(day_str))
                return dt.isoformat()
            except ValueError:
                pass


        m = re.search(r'(\d{1,2})[-/](\d{1,2})[-/](\d{4})', date_str)
        if m:
            day_str, mon_str, yr_str = m.groups()
            try:
                dt = datetime(int(yr_str), int(mon_str), int(day_str))
                return dt.isoformat()
            except ValueError:
                pass
                
        return None

    @classmethod
    def _parse_create_product(cls, text: str) -> Optional[Dict[str, Any]]:
        """Extract product fields from a create_product command."""
        text_lower = text.lower()
        

        price = cls._extract_number(
            r'(?:selling\s+)?(?:price|कीमत|दाम|प्राइस)[:\s]+(?:is\s+)?(?:rs\.?|₹|\$)?\s*([\d,\.]+)',
            text
        ) or cls._extract_number(
            r'(?:at|for|@)\s+(?:rs\.?|₹|\$)?\s*([\d,\.]+)', text
        )
        
        if not price:
            return None


        name = None
        

        name = cls._extract_str(
            r'(?:called|named|जिसका नाम|नाम)\s+["\']?([\w\s\d\-]+?)["\']?\s*(?:with|price|कीमत|दाम|प्राइस|at|for|@|stock|quantity|qty|cost|in|category|\.|,|$)',
            text
        )
        

        if not name:
            name = cls._extract_str(
                r'(?:product|प्रोडक्ट)\s+(?:called|named)?\s*["\']?([\w\s\d\-]+?)["\']?\s+(?:price|कीमत|दाम|प्राइस|with|at|for|@|stock|quantity|qty|cost|in|category|\.)',
                text
            )
            

        if not name:
            m = re.search(
                r'\b(?:add|create|new|banao|जोड़ो|बनाओ|नया)\s+(?:a\s+)?(?:product|प्रोडक्ट)?\s*["\']?([\w\s\d\-]+?)["\']?\s+\b(?:price|कीमत|दाम|प्राइस|with|at|for|@|stock|quantity|qty|cost|in|category|\.)\b',
                text,
                re.IGNORECASE
            )
            if m:
                name = m.group(1).strip()
                

        if not name:
            indicators = ['price', 'कीमत', 'दाम', 'प्राइस', 'stock', 'quantity', 'qty', 'cost', 'at', 'for', 'with', 'add', 'create', 'banao', 'जोड़ो', 'बनाओ']
            first_idx = len(text)
            for ind in indicators:
                idx = text_lower.find(ind)
                if idx != -1 and idx < first_idx:
                    first_idx = idx
            
            if first_idx > 0:
                potential_name = text[:first_idx].strip()
                potential_name = re.sub(r'^(?:add|create|new|banao|जोड़ो|बनाओ|नया)\s+(?:a\s+)?(?:product|प्रोडक्ट)?\s*', '', potential_name, flags=re.IGNORECASE)
                potential_name = potential_name.strip(' "\',.')
                if potential_name:
                    name = potential_name

        if not name:
            return None

        name = name.strip(' "\',.')

        name = re.sub(r'\s+(?:जिसका|जिसकी|का|की|है|को|के|के\s+लिए|ke\s+liye|ka|ki|ke|hai|ko)$', '', name, flags=re.IGNORECASE)
        name = name.strip(' "\',.')
        params: Dict[str, Any] = {'name': name, 'price': price}


        cp = cls._extract_number(
            r'(?:cost[_\s]?price|लागत|cost)[:\s]+(?:is\s+)?(?:rs\.?|₹|\$)?\s*([\d,\.]+)', text
        )
        if cp:
            params['cost_price'] = cp

        qty = cls._extract_number(
            r'(?:stock|quantity|स्टॉक|मात्रा|qty)[:\s]+(?:is\s+)?([\d,\.]+)', text
        ) or cls._extract_number(
            r'(?:stock|quantity|स्टॉक|मात्रा|qty)\s+(?:is\s+)?([\d,\.]+)\s+(?:units?|पीस|pieces?)?', text
        )
        if qty:
            params['quantity'] = int(qty)

        cat = None

        cat_match = re.search(r'\bin\s+(?:the\s+)?([\w\s\d\-]+?)\s+category\b', text, re.IGNORECASE)
        if cat_match:
            cat = cat_match.group(1).strip()
        else:
            cat_match = re.search(r'(?:category|कैटेगरी)[:\s]+([\w\s\d\-]+?)(?:,|$|\.|with|price|selling|cost)', text, re.IGNORECASE)
            if cat_match:
                cat = cat_match.group(1).strip()
            else:
                cat_match = re.search(r'([\w\s\d\-]+?)\s+(?:category|कैटेगरी)\b', text, re.IGNORECASE)
                if cat_match:
                    cat_candidate = cat_match.group(1).strip()
                    cat_candidate = re.sub(r'^(?:in\s+the|in|the|an|a)\s+', '', cat_candidate, flags=re.IGNORECASE)
                    cat = cat_candidate.strip(' "\',.')
        if cat:
            params['category'] = cat

        brand = cls._extract_str(
            r'(?:brand)[:\s]+([\w\s\d\-]+?)(?:,|$|\.)', text
        )
        if brand:
            params['brand'] = brand.strip()

        sku = cls._extract_str(
            r'(?:sku)[:\s]+([\w\-]+)', text
        )
        if sku:
            params['sku'] = sku.strip()


        expiry_match = re.search(
            r'(?:expires\s+on|expires|expiry\s+date|expiry)[:\s]+([a-z0-9\s,\-/]+?)(?:\.|$|alert|min|stock)',
            text,
            re.IGNORECASE
        )
        if expiry_match:
            parsed_date = cls._parse_date(expiry_match.group(1))
            if parsed_date:
                params['expiry_date'] = parsed_date


        msl = cls._extract_number(
            r'(?:alert\s+me\s+when\s+stock\s+drops\s+below|alert\s+level|min\s+stock\s+level|min\s+stock|alert)[:\s]+([\d,\.]+)',
            text
        )
        if msl:
            params['min_stock_level'] = int(msl)

        return params

    @classmethod
    def _parse_place_order(cls, text: str) -> Optional[Dict[str, Any]]:
        """Extract place order parameters locally"""
        qty = cls._extract_number(r'(?:quantity|qty|मात्रा|संख्या|का|की|को)?\s*(\d+)\s*(?:x|times|pcs|pieces|of|item|kg|gm)?', text)
        if not qty:
            numbers = re.findall(r'\b\d+\b', text)
            if numbers:
                qty = float(numbers[0])
        
        quantity = int(qty) if qty else 1
        
        notes = None
        notes_match = re.search(r'(?:note|instruction|संदेश|नोट|तैयार|समय)[:\s]+["\']?([^"\']+)["\']?', text, re.IGNORECASE)
        if notes_match:
            notes = notes_match.group(1).strip()
        else:
            notes_match = re.search(r'note\s+([\w\s\d:]+?)(?:\s+from|\s+qty|\s+quantity|$)', text, re.IGNORECASE)
            if notes_match:
                notes = notes_match.group(1).strip()

        shop_name = None
        shop_match = re.search(r'(?:from|shop|दुकान|से)[:\s]+["\']?([\w\s\d]+?)["\']?\s*(?:and|with|quantity|qty|note|$)', text, re.IGNORECASE)
        if shop_match:
            shop_name = shop_match.group(1).strip()

        clean_text = re.sub(r'^(?:buy|order|purchase|खरीद|ऑर्डर|kharido|kharidna)\s+', '', text, flags=re.IGNORECASE)
        clean_text = re.sub(r'^\d+\s*(?:pcs|pieces|x|of)?\s*', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'\s+(?:from|shop|दुकान|से)\s+.*$', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'\s+(?:note|instruction|संदेश|नोट)\s+.*$', '', clean_text, flags=re.IGNORECASE)
        
        product_name = clean_text.strip()
        if not product_name:
            product_name = text
            
        return {
            "name": product_name,
            "quantity": quantity,
            "shop_name": shop_name,
            "notes": notes
        }

    @classmethod
    def _parse_sell_at_price(cls, text: str) -> Optional[Dict[str, Any]]:
        """Extract sell_at_price parameters locally"""
        price = cls._extract_number(r'\b(?:for|price|कीमत|दाम|at|@)\b[:\s]+([\d,\.]+)', text)
        if not price:
            price = cls._extract_number(r'\b(?:for|at|@)\b\s+([\d,\.]+)', text)
            
        qty = cls._extract_number(r'(?:\b(?:quantity|qty|मात्रा|संख्या|का|की|को)\b\s*)?(\d+)\s*(?:x|times|pcs|pieces|of|item|kg|gm)?', text)
        if not qty:
            qty_match = re.search(r'\b(?:sell|sold|becho|बेचो)\s+(\d+)\b', text, re.IGNORECASE)
            if qty_match:
                qty = float(qty_match.group(1))
            else:
                qty = 1
        
        quantity = int(qty) if qty else 1
        
        customer_name = cls._extract_str(r'\b(?:customer\s+name|customer|ग्राहक)\b[:\s]+["\']?([^"\']+)["\']?', text)
        if not customer_name:
            customer_name = cls._extract_str(r'\b(?:name|नाम)\b[:\s]+["\']?([^"\']+)["\']?', text)
            
        customer_phone = cls._extract_str(r'\b(?:phone|mobile|मोबाइल|फ़ोन)\b[:\s]+([\d\s+-]+)', text)
            
        product_name = None
        clean_text = re.sub(r'^(?:sell|sold|becho|बेचो)\s+', '', text, flags=re.IGNORECASE)
        clean_text = re.sub(r'^\d+\s*(?:pcs|pieces|x|of)?\s*', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'\s+(?:from|shop|दुकान|से)\s+.*$', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'\s+(?:note|instruction|संदेश|नोट)\s+.*$', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'\s+\b(?:for|at|@|price|price|कीमत|दाम)\b\s+.*$', '', clean_text, flags=re.IGNORECASE)
        
        product_name = clean_text.strip()
        if not product_name:
            product_name = text
            
        return {
            "name": product_name,
            "price": price,
            "quantity": quantity,
            "customer_name": customer_name.strip() if customer_name else "Walk-in Customer",
            "customer_phone": customer_phone.strip() if customer_phone else None
        }

    @classmethod
    def parse(cls, user_input: str) -> Optional[ParsedIntent]:

        text = user_input.lower().strip()

        for action, patterns in cls.KEYWORD_PATTERNS.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE | re.UNICODE)
                if match:
                    parameters = {}

                    if action == 'create_product':
                        extracted = cls._parse_create_product(user_input)
                        if extracted:
                            parameters = extracted
                        else:
                            # Can't extract enough detail locally — skip fallback
                            continue

                    elif action == 'place_order':
                        extracted = cls._parse_place_order(user_input)
                        if extracted:
                            parameters = extracted
                        else:
                            continue

                    elif action == 'sell_at_price':
                        extracted = cls._parse_sell_at_price(user_input)
                        if extracted:
                            parameters = extracted
                        else:
                            continue

                    elif match.groups():
                        query = match.group(1)
                        if query and query.strip():
                            if action == 'search_products':
                                parameters['query'] = query.strip()
                            elif action == 'verify_shop':
                                parameters['name'] = query.strip()

                    if action == 'list_orders':
                        if any(s in text for s in ['pending', 'पेंडिंग']):
                            parameters['status'] = 'pending'
                        elif any(s in text for s in ['confirmed', 'कन्फर्म']):
                            parameters['status'] = 'confirmed'
                        elif any(s in text for s in ['shipped', 'शिप']):
                            parameters['status'] = 'shipped'
                        elif any(s in text for s in ['delivered', 'डिलीवर']):
                            parameters['status'] = 'delivered'

                    entity = cls.ACTION_ENTITY_MAP.get(action)

                    return ParsedIntent(
                        action=action,
                        entity=entity,
                        parameters=parameters,
                        requires_confirmation=False
                    )

        return None


class IntentParser:
    # Groq models — 14,400 req/day, 6000 RPM free (10x better than Gemini)
    _GROQ_MODELS = [
        "llama-3.3-70b-versatile",   # best quality, 6000 RPM
        "llama-3.1-8b-instant",      # fastest, 30,000 RPM
        "mixtral-8x7b-32768",        # good quality, 5000 RPM
    ]
    # Gemini models — fallback only
    _GEMINI_MODELS = [
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash-8b",
        "gemini-1.5-flash",
    ]

    def __init__(self):
        # Groq (primary)
        from groq import AsyncGroq
        self._groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None
        self._groq_index = 0
        # Gemini (backup)
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self._gemini_index = 0

        self.system_prompt = """You are an intent parser for a command execution system.
Your job is to parse natural language commands into structured JSON actions.
You understand both English and Hindi (including Hinglish - mixed Hindi-English).

IMPORTANT: You can understand commands in:
- English: "add product iPhone price 50000"
- Hindi (Devanagari): "प्रोडक्ट जोड़ो iPhone कीमत 50000"
- Hinglish (Romanized Hindi): "product add karo iPhone price 50000"
- Mixed: "show all pending orders yaar" or "sab orders dikhao"

Available actions:

=== PRODUCT COMMANDS (Shop Admin only) ===
- create_product: Create a new product (params: name, price, shop_id?, cost_price?, description?, quantity?, brand?, sku?, barcode?, category_id?, category?(name string), tags?, unit?, min_stock_level?, is_featured?, is_perishable?)

- update_product: Update a product (params: product_id, name?, price?, quantity?, description?, brand?, sku?)
- delete_product: Delete a product (params: product_id)
- list_products: List all products (params: shop_id?, category_id?, search?)
- get_product: Get a specific product (params: product_id or name)
- search_products: Search products (params: query, limit?)
- get_low_stock: Get low stock products (params: shop_id?)
- restock_product: Add stock to a product (params: product_id, quantity)
- set_product_price: Update product price (params: product_id, price)

=== ORDER COMMANDS (Shop Admin) ===
- list_orders: List all orders (params: status?, shop_id?)
- get_order: Get a specific order (params: order_id)
- confirm_order: Confirm a pending order (params: order_id)
- ship_order: Mark order as shipped (params: order_id, tracking_number?)
- deliver_order: Mark order as delivered (params: order_id)
- cancel_order: Cancel an order (params: order_id)
- refund_order: Process refund for order (params: order_id, reason?)

=== CUSTOMER ORDER COMMANDS (Customer) ===
- place_order: Place a new order (params: product_id or name, quantity?, shop_id?, shop_name?, customer_name?, customer_email?, customer_phone?, delivery_address?, notes?)
- list_my_orders: List customer's own orders (params: customer_id?)
- update_order: Update order quantity (params: order_id, quantity)
- cancel_order: Cancel an order (params: order_id)

=== CUSTOMER MANAGEMENT (Shop Admin) ===
- list_customers: List all customers (params: none)
- get_customer: Get a specific customer (params: customer_id or email)
- search_customers: Search customers by name or email (params: query)

=== SHOP COMMANDS (Super Admin) ===
- prefill_shop_form: Pre-fill shop registration form - use when user says "add shop", "create shop", "register shop"
  (params: name?, description?, category_id?, owner_name?, owner_email?, owner_phone?, address?, city?, pincode?, gst_number?)
- update_shop: Update shop details (params: shop_id, name?, description?, address?, city?, pincode?)
- delete_shop: Delete a shop (params: shop_id)
- list_shops: List all shops (params: category_id?, city?, search?, is_verified?, is_active?)
- get_shop: Get shop details and stats (params: shop_id or name)
- verify_shop: Verify/approve a pending shop (params: shop_id or name)
- suspend_shop: Suspend a shop (params: shop_id or name)
- activate_shop: Activate a suspended shop (params: shop_id or name)
- get_pending_shops: Get all shops pending verification (params: none)

=== SHOP DASHBOARD COMMANDS (Shop Admin) ===
- get_shop_dashboard: Get shop dashboard stats (params: shop_id?)
- get_shop_low_stock: Get low stock products for shop (params: shop_id?)
- get_shop_orders: Get shop orders (params: shop_id?, status?)

=== USER COMMANDS (Super Admin) ===
- list_users: List all users (params: role?)
- get_user: Get user details (params: user_id or email)

=== PLATFORM COMMANDS (Super Admin) ===
- get_platform_stats: Get platform-wide statistics (params: none)

=== CATEGORY COMMANDS ===
- list_shop_categories: List shop categories (params: none)
- create_shop_category: Create shop category (params: name, description?, icon?)

=== BILLING & PROFIT COMMANDS (Shop Admin) ===
- sell_at_price: Sell product at bargained price (params: product_id, price/selling_price, quantity?, customer_name?, customer_phone?)
- generate_bill: Generate bill for order (params: order_id, bill_type: "customer"|"admin")
- get_daily_profit: Get daily profit report (params: shop_id, date?)
- get_product_profit: Get profit report by product (params: shop_id)
- get_profit_summary: Get overall profit summary (params: shop_id)

Rules:
1. Output ONLY valid JSON, no markdown or explanation
2. For destructive actions (delete, cancel, suspend), set requires_confirmation: true
3. When user says "add shop", "create shop", "register shop" -> use prefill_shop_form (NOT create_shop)
4. When user says "approve" or "verify" a shop -> use verify_shop
5. When user says "pending shops" -> use get_pending_shops
6. When user says "show my orders", "my orders" -> use list_my_orders
7. When user says "buy", "order", "purchase" a product -> use place_order
8. When user says "show dashboard", "my stats" -> use get_shop_dashboard
9. When user says "platform stats" -> use get_platform_stats
10. When user says "sell at", "sell for", "sold at" -> use sell_at_price
11. When user says "generate bill", "make bill", "print bill" -> use generate_bill
12. When user says "today's profit", "daily profit", "profit report" -> use get_daily_profit
13. When user says "product profit", "profit by product" -> use get_product_profit
14. When user says "profit summary", "my profit", "show profit" -> use get_profit_summary
15. For admin bill (with profit info), set bill_type: "admin". For customer bill, set bill_type: "customer"
16. IMPORTANT: If context contains a "shop_id" value, always include it in the parameters for create_product, update_product, list_products, get_low_stock, and any shop-specific commands.


Hindi/Hinglish Command Patterns (treat same as English equivalents):
- "प्रोडक्ट जोड़ो/बनाओ" or "product add karo/banao" -> create_product
- "प्रोडक्ट दिखाओ/लिस्ट करो" or "products dikhao/list karo" -> list_products
- "प्रोडक्ट अपडेट करो/बदलो" or "product update karo/badlo" -> update_product
- "प्रोडक्ट हटाओ/डिलीट करो" or "product hatao/delete karo" -> delete_product
- "स्टॉक बढ़ाओ/जोड़ो" or "stock badhao/add karo" -> restock_product
- "कम स्टॉक दिखाओ" or "low stock dikhao/batao" -> get_low_stock
- "ऑर्डर दिखाओ" or "orders dikhao/list karo" -> list_orders
- "ऑर्डर कन्फर्म करो" or "order confirm karo" -> confirm_order
- "ऑर्डर भेजो/शिप करो" or "order ship karo/bhejo" -> ship_order
- "ऑर्डर डिलीवर करो" or "order deliver karo" -> deliver_order
- "ऑर्डर कैंसल करो" or "order cancel karo" -> cancel_order
- "दुकान जोड़ो/बनाओ" or "shop add karo/banao/register karo" -> prefill_shop_form
- "दुकान वेरिफाई करो" or "shop verify karo/approve karo" -> verify_shop
- "पेंडिंग दुकानें दिखाओ" or "pending shops dikhao" -> get_pending_shops
- "मेरे ऑर्डर दिखाओ" or "mere orders dikhao" -> list_my_orders
- "खरीदना है/ऑर्डर करना है" or "kharidna hai/order karna hai" -> place_order
- "डैशबोर्ड दिखाओ" or "dashboard dikhao" -> get_shop_dashboard
- "प्लेटफॉर्म स्टैट्स" or "platform stats dikhao" -> get_platform_stats
- "इस दाम पर बेचो" or "is price pe becho/sell karo" -> sell_at_price
- "बिल बनाओ" or "bill banao/generate karo" -> generate_bill
- "आज का प्रॉफिट" or "aaj ka profit/daily profit" -> get_daily_profit
- "प्रॉफिट दिखाओ" or "profit dikhao/batao" -> get_profit_summary
- "ग्राहक दिखाओ" or "customers dikhao" -> list_customers
- "सर्च करो" or "search karo/dhundho" -> search_products

Output format for single action:
{"action": "action_name", "entity": "product|order|shop|user|category", "parameters": {...}, "requires_confirmation": false}

Output format for multi-step:
{"steps": [{"action": "...", "entity": "...", "parameters": {...}}, ...]}
"""

    def _parse_json_response(self, text: str) -> Union[ParsedIntent, MultiStepPlan]:
        """Parse raw LLM response text into ParsedIntent or MultiStepPlan."""
        text = text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        parsed = json.loads(text)
        if "steps" in parsed:
            steps = [ParsedIntent(**step) for step in parsed["steps"]]
            return MultiStepPlan(steps=steps)
        return ParsedIntent(**parsed)

    async def _call_groq(self, prompt: str, model: str) -> str:
        """Call Groq API with 8s timeout. Returns raw text."""
        resp = await asyncio.wait_for(
            self._groq_client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                max_tokens=512,
            ),
            timeout=8.0
        )
        return resp.choices[0].message.content

    async def _call_gemini(self, prompt: str, model_name: str) -> str:
        """Call Gemini API via run_in_executor with 8s timeout. Returns raw text."""
        model = genai.GenerativeModel(model_name)
        loop = asyncio.get_event_loop()
        resp = await asyncio.wait_for(
            loop.run_in_executor(None, lambda: model.generate_content(prompt)),
            timeout=8.0
        )
        return resp.text

    async def parse(
        self, user_input: str, context: Optional[Dict[str, Any]] = None
    ) -> Union[ParsedIntent, MultiStepPlan]:
        context_str = ""
        if context:
            context_str = f"\n\nContext: {json.dumps(context)}"

        prompt = f"""{self.system_prompt}{context_str}\n\nUser command: {user_input}\n\nJSON output:"""


        fallback_result = FallbackParser.parse(user_input)
        if fallback_result:
            fallback_result.parameters = fallback_result.parameters or {}
            fallback_result.parameters['_fallback'] = True
            return fallback_result

        last_error = ""


        if self._groq_client:
            for model_name in self._GROQ_MODELS:
                try:
                    raw = await self._call_groq(prompt, model_name)
                    return self._parse_json_response(raw)
                except asyncio.TimeoutError:
                    logger.warning(f"Groq timeout on {model_name}, trying next.")
                    continue
                except json.JSONDecodeError:
                    logger.warning(f"Groq bad JSON from {model_name}, trying next.")
                    continue
                except Exception as e:
                    err = str(e)
                    last_error = err
                    is_quota = "429" in err or "rate_limit" in err.lower() or "quota" in err.lower()
                    if is_quota:
                        logger.warning(f"Groq quota on {model_name}, trying next Groq model.")
                        continue
                    logger.warning(f"Groq error on {model_name}: {err[:100]}")
                    break 


        for model_name in self._GEMINI_MODELS:
            try:
                raw = await self._call_gemini(prompt, model_name)
                return self._parse_json_response(raw)
            except asyncio.TimeoutError:
                logger.warning(f"Gemini timeout on {model_name}, trying next.")
                continue
            except json.JSONDecodeError:
                continue
            except Exception as e:
                err = str(e)
                last_error = err
                is_quota = "429" in err or "quota" in err.lower() or "RESOURCE_EXHAUSTED" in err
                if is_quota:
                    logger.warning(f"Gemini quota on {model_name}, trying next.")
                    continue
                break


        return ParsedIntent(
            action="error",
            entity=None,
            parameters={"error": f"Intent parsing failed: {last_error}"},
        )


    async def parse_with_retry(
        self,
        user_input: str,
        context: Optional[Dict[str, Any]] = None,
        missing_params: Optional[List[str]] = None,
    ) -> ParsedIntent:

        retry_prompt = user_input
        if missing_params:
            retry_prompt = f"{user_input}\n\n[System: Previous attempt was missing: {', '.join(missing_params)}. Please ask the user for these values.]"

        result = await self.parse(retry_prompt, context)

        if isinstance(result, MultiStepPlan):
            return result.steps[0] if result.steps else ParsedIntent(
                action="error", parameters={"error": "Empty plan"}
            )
        return result
