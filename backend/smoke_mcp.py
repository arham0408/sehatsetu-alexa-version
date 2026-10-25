"""Independent official-SDK client: python -m backend.smoke_mcp [http://127.0.0.1:8000/mcp]."""
import asyncio
import sys
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client


async def main():
    url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000/mcp"
    async with streamable_http_client(url) as (read, write, _):
        async with ClientSession(read, write) as session:
            initialized = await session.initialize()
            assert initialized.protocolVersion == "2025-11-25"
            tools = await session.list_tools()
            print(f"Negotiated {initialized.protocolVersion}; discovered {len(tools.tools)} tools.")
            result = await session.call_tool("create_report", {"text":
                "SYNTHETIC ULTRASOUND: Gallbladder contains a 12 mm calculus. No hydronephrosis."})
            assert not result.isError, result
            key = result.structuredContent["session_key"]
            try:
                answer = await session.call_tool("ask_report", {"session_key": key, "question": "Show me the gallbladder"})
                assert not answer.isError, answer
                state = await session.call_tool("get_viewer_state", {"session_key": key})
                assert "gallbladder" in state.structuredContent["anatomy_terms"]
                print("Report creation, grounded answer, and anatomy request passed.")
            finally:
                await session.call_tool("disconnect", {"session_key": key})
                print("Synthetic session deleted.")


if __name__ == "__main__":
    asyncio.run(main())
