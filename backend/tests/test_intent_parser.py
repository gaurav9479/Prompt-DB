import unittest
from unittest.mock import AsyncMock

from backend.services.intent_parser import IntentParser


class IntentParserTests(unittest.IsolatedAsyncioTestCase):
    async def test_parse_uses_groq_before_fallback(self):
        parser = IntentParser.__new__(IntentParser)
        parser._groq_client = object()
        parser._groq_index = 0
        parser.system_prompt = "test prompt"
        parser._GROQ_MODELS = ["test-model"]

        parser._call_groq = AsyncMock(
            return_value='{"action": "create_product", "entity": "product", "parameters": {"name": "Test Product", "price": 100}, "requires_confirmation": false}'
        )

        result = await parser.parse("add product test price 100", {})

        self.assertEqual(result.action, "create_product")
        self.assertEqual(result.parameters["name"], "Test Product")
        parser._call_groq.assert_awaited_once()

    async def test_parse_returns_error_when_groq_is_unavailable(self):
        parser = IntentParser.__new__(IntentParser)
        parser._groq_client = None
        parser._groq_index = 0
        parser.system_prompt = "test prompt"
        parser._GROQ_MODELS = ["test-model"]

        result = await parser.parse("add product test price 100", {})

        self.assertEqual(result.action, "error")
        self.assertIn("Groq", result.parameters["error"])

    async def test_parse_reduces_stock_via_keyword_rules(self):
        parser = IntentParser.__new__(IntentParser)
        parser._groq_client = None
        parser._groq_index = 0
        parser.system_prompt = "test prompt"
        parser._GROQ_MODELS = ["test-model"]

        result = await parser.parse("reduce samsung galaxy s24 stock by 50", {})

        self.assertEqual(result.action, "restock_product")
        self.assertEqual(result.parameters["name"], "samsung galaxy s24")
        self.assertEqual(result.parameters["quantity"], -50)

    async def test_parse_reduces_stock_from_phrase(self):
        parser = IntentParser.__new__(IntentParser)
        parser._groq_client = None
        parser._groq_index = 0
        parser.system_prompt = "test prompt"
        parser._GROQ_MODELS = ["test-model"]

        result = await parser.parse("deduct 50 from samsung galaxy s24 stock", {})

        self.assertEqual(result.action, "restock_product")
        self.assertEqual(result.parameters["name"], "samsung galaxy s24")
        self.assertEqual(result.parameters["quantity"], -50)

    async def test_parse_increases_stock_from_phrase(self):
        parser = IntentParser.__new__(IntentParser)
        parser._groq_client = None
        parser._groq_index = 0
        parser.system_prompt = "test prompt"
        parser._GROQ_MODELS = ["test-model"]

        result = await parser.parse("add 50 samosa to stock", {})

        self.assertEqual(result.action, "restock_product")
        self.assertEqual(result.parameters["name"], "samosa")
        self.assertEqual(result.parameters["quantity"], 50)

    async def test_parse_hinglish_stock_increase(self):
        parser = IntentParser.__new__(IntentParser)
        parser._groq_client = None
        parser._groq_index = 0
        parser.system_prompt = "test prompt"
        parser._GROQ_MODELS = ["test-model"]

        result = await parser.parse("stock add karo 50 samosa", {})

        self.assertEqual(result.action, "restock_product")
        self.assertEqual(result.parameters["name"], "samosa")
        self.assertEqual(result.parameters["quantity"], 50)

    async def test_parse_hinglish_stock_increase_case_insensitive(self):
        parser = IntentParser.__new__(IntentParser)
        parser._groq_client = None
        parser._groq_index = 0
        parser.system_prompt = "test prompt"
        parser._GROQ_MODELS = ["test-model"]

        result = await parser.parse("Stock Add Karo 50 Samosa", {})

        self.assertEqual(result.action, "restock_product")
        self.assertEqual(result.parameters["name"], "samosa")
        self.assertEqual(result.parameters["quantity"], 50)

    async def test_parse_sell_at_price_without_explicit_price(self):
        parser = IntentParser.__new__(IntentParser)
        parser._groq_client = None
        parser._groq_index = 0
        parser.system_prompt = "test prompt"
        parser._GROQ_MODELS = ["test-model"]

        result = await parser.parse("sold 50 samosa", {})

        self.assertEqual(result.action, "sell_at_price")
        self.assertEqual(result.parameters["name"], "samosa")
        self.assertEqual(result.parameters["quantity"], 50)

    async def test_parse_hinglish_stock_increase_with_prefix(self):
        parser = IntentParser.__new__(IntentParser)
        parser._groq_client = None
        parser._groq_index = 0
        parser.system_prompt = "test prompt"
        parser._GROQ_MODELS = ["test-model"]

        result = await parser.parse("samosa mein 50 stock add karo", {})

        self.assertEqual(result.action, "restock_product")
        self.assertEqual(result.parameters["name"], "samosa")
        self.assertEqual(result.parameters["quantity"], 50)

    async def test_parse_hinglish_stock_increase_with_connector(self):
        parser = IntentParser.__new__(IntentParser)
        parser._groq_client = None
        parser._groq_index = 0
        parser.system_prompt = "test prompt"
        parser._GROQ_MODELS = ["test-model"]

        result = await parser.parse("add 50 samosa to stock", {})

        self.assertEqual(result.action, "restock_product")
        self.assertEqual(result.parameters["name"], "samosa")
        self.assertEqual(result.parameters["quantity"], 50)


if __name__ == "__main__":
    unittest.main()
