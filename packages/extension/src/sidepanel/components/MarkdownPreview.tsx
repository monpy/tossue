import { issueTitle, markdown, statusMessage } from "../store/signals";
import { Button, Card } from "./ui";

export function MarkdownPreview() {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown.value);
    statusMessage.value = "Markdown copied.";
  };

  // Use signals directly in JSX - @preact/signals handles reactivity automatically
  return (
    <Card>
      <div class="section-title-row">
        <h2 class="text-base font-bold">Markdown Preview</h2>
        <div class="button-row">
          <Button id="copyMarkdown" variant="secondary" onClick={handleCopy}>
            Copy
          </Button>
        </div>
      </div>
      <label>
        <span>Issue Title</span>
        <input id="issueTitlePreview" value={issueTitle} readOnly />
      </label>
      <textarea
        id="markdownPreview"
        rows={18}
        class="mono"
        value={markdown}
        readOnly
      />
    </Card>
  );
}
