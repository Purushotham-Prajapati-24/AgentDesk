import { WebChatConfigProvider } from "@/context/WebChatConfigContext";
import { WebChatWorkspace } from "./WebChatWorkspace";

export default function WebChatPage() {
  return (
    <WebChatConfigProvider>
      <WebChatWorkspace />
    </WebChatConfigProvider>
  );
}
