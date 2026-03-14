import { issueTitle, markdown, statusMessage } from "../store/signals";

export function MarkdownPreview() {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown.value);
    statusMessage.value = "Markdown copied.";
  };

  return (
    <section class="card">
      <div class="section-title-row">
        <h2>Markdown Preview</h2>
        <div class="button-row">
          <button id="copyMarkdown" class="secondary" onClick={handleCopy}>
            Copy
          </button>
        </div>
      </div>
      <label>
        <span>Issue Title</span>
        <input id="issueTitlePreview" value={issueTitle.value} readOnly />
      </label>
      <textarea
        id="markdownPreview"
        rows={18}
        class="mono"
        value={markdown.value}
        readOnly
      />
    </section>
  );
}
