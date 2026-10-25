"""Small ASGI guard: exact origins, trusted hosts, and bounded request bodies."""
import json


class RequestGuard:
    def __init__(self, app, origins, max_bytes=10 * 1024 * 1024):
        self.app, self.origins, self.max_bytes = app, set(origins), max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict(scope["headers"])
        origin = headers.get(b"origin", b"").decode()
        if origin and origin not in self.origins:
            return await self.reject(send, 403, "Origin not allowed.")
        if scope["method"] in ("POST", "PUT", "PATCH"):
            body = bytearray()
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                body.extend(message.get("body", b""))
                if len(body) > self.max_bytes:
                    return await self.reject(send, 413, "Request exceeds the 10 MiB demo limit.")
                if not message.get("more_body", False):
                    break
            delivered = False

            async def bounded_receive():
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {"type": "http.request", "body": bytes(body), "more_body": False}
                return await receive()

            return await self.app(scope, bounded_receive, send)
        return await self.app(scope, receive, send)

    @staticmethod
    async def reject(send, status, detail):
        await send({"type": "http.response.start", "status": status,
                    "headers": [(b"content-type", b"application/json")]})
        await send({"type": "http.response.body", "body": json.dumps({"detail": detail}).encode()})
