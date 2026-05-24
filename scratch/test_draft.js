async function test() {
  try {
    const url = "https://google-mcp-server-production-5589.up.railway.app/create_email_draft";
    console.log("Calling create_email_draft on remote server...");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: "test@example.com",
        subject: "Test Subject",
        body: "Test Body"
      })
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Response JSON:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
