"""A tiny in-memory rate limiter (one process, which suits a small Render service)."""
import time
from collections import defaultdict, deque


class RateLimiter:
    """Allow `limit` calls per `window` seconds for each key."""

    def __init__(self, limit=10, window=60):
        self.limit, self.window = limit, window
        self._hits = defaultdict(deque)

    def allow(self, key, now=None):
        now = time.monotonic() if now is None else now
        hits = self._hits[key]
        while hits and now - hits[0] >= self.window:
            hits.popleft()
        if len(hits) >= self.limit:
            return False
        hits.append(now)
        return True
