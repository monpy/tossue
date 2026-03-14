import { issueTitle, markdown, statusMessage } from "../store/signals";

export function MarkdownPreview() {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown.value);
    statusMessage.value = "Markdown copied.";
  };

  // Use signals directly in JSX - @preact/signals handles reactivity automatically
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
        <input id="issueTitlePreview" value={issueTitle} readOnly />
      </label>
      <textarea
        id="markdownPreview"
        rows={18}
        class="mono"
        value={markdown}
        readOnly
      />
    </section>
  );
}
