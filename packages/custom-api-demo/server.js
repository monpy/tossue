import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = 3456;
const OUTPUT_DIR = "./received";

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    const body = await readBody(req);
    const data = JSON.parse(body);

    // Log received data
    console.log("\n" + "=".repeat(60));
    console.log(`📥 Received at ${new Date().toISOString()}`);
    console.log("=".repeat(60));
    console.log(`Title: ${data.title}`);
    console.log(`Labels: ${data.labels?.join(", ") || "(none)"}`);
    console.log(`Attachments: ${data.attachments?.length || 0}`);

    if (data._test) {
      console.log("⚡ This is a test request");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, message: "Test successful" }));
      return;
    }

    // Save the issue data
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const issueDir = path.join(OUTPUT_DIR, `issue-${timestamp}`);
    fs.mkdirSync(issueDir, { recursive: true });

    // Save metadata
    const metadata = {
      title: data.title,
      labels: data.labels,
      timestamp: data.timestamp,
      receivedAt: new Date().toISOString(),
      attachmentCount: data.attachments?.length || 0,
    };
    fs.writeFileSync(
      path.join(issueDir, "metadata.json"),
      JSON.stringify(metadata, null, 2)
    );

    // Save body as markdown
    fs.writeFileSync(path.join(issueDir, "body.md"), data.body || "");

    // Save attachments
    if (data.attachments?.length > 0) {
      const attachmentsDir = path.join(issueDir, "attachments");
      fs.mkdirSync(attachmentsDir, { recursive: true });

      for (const attachment of data.attachments) {
        const { filename, dataUrl } = attachment;
        const base64Data = dataUrl.split(",")[1];
        if (base64Data) {
          const buffer = Buffer.from(base64Data, "base64");
          fs.writeFileSync(path.join(attachmentsDir, filename), buffer);
          console.log(`  💾 Saved: ${filename} (${formatBytes(buffer.length)})`);
        }
      }
    }

    console.log(`\n📁 Saved to: ${issueDir}`);
    console.log("=".repeat(60) + "\n");

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        message: "Issue received and saved",
        path: issueDir,
      })
    );
  } catch (error) {
    console.error("Error processing request:", error.message);
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           Tossue Custom API Demo Server                    ║
╠════════════════════════════════════════════════════════════╣
║  Endpoint: http://127.0.0.1:${PORT}/                          ║
║  Output:   ${OUTPUT_DIR}/                                       ║
╚════════════════════════════════════════════════════════════╝

Waiting for requests...
`);
});
