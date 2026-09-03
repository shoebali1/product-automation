from types import SimpleNamespace
from typing import Any


class AgentRouterCompletionsAdapter:
    """Expose AgentRouter's Anthropic endpoint as the chat-completions shape we use."""

    def __init__(self, client: Any) -> None:
        self._client = client

    def create(
        self,
        *,
        model: str,
        messages: list[dict[str, Any]],
        max_tokens: int,
        **_: Any,
    ) -> Any:
        system_parts: list[str] = []
        conversation: list[dict[str, Any]] = []
        for message in messages:
            role = message.get("role")
            content = message.get("content", "")
            if role == "system":
                system_parts.append(_plain_content(content))
            else:
                conversation.append({"role": role, "content": content})

        request: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": conversation,
        }
        if system_parts:
            request["system"] = "\n\n".join(system_parts)
        response = self._client.messages.create(**request)
        text = _response_text(response)
        usage = getattr(response, "usage", None)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=text))],
            usage=SimpleNamespace(
                prompt_tokens=getattr(usage, "input_tokens", 0),
                completion_tokens=getattr(usage, "output_tokens", 0),
            ),
        )


class AgentRouterClientAdapter:
    def __init__(self, client: Any) -> None:
        self.chat = SimpleNamespace(completions=AgentRouterCompletionsAdapter(client))


def _plain_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            str(item.get("text", "")) if isinstance(item, dict) else str(item)
            for item in content
        )
    return str(content)


def _response_text(response: Any) -> str:
    """Read text from Anthropic messages plus common proxy response variations."""
    if isinstance(response, str):
        return response.strip()
    content = getattr(response, "content", response)
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, dict):
        return str(content.get("text") or content.get("content") or "").strip()
    if not isinstance(content, list):
        return str(content or "").strip()

    text_blocks = []
    for block in content:
        if isinstance(block, str):
            text_blocks.append(block)
        elif isinstance(block, dict):
            if block.get("type") == "text" and block.get("text"):
                text_blocks.append(str(block["text"]))
        elif getattr(block, "type", None) == "text" and getattr(block, "text", None):
            text_blocks.append(str(block.text))
    return "\n".join(text_blocks).strip()
