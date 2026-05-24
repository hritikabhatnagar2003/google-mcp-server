async function test() {
  try {
    console.log("Fetching remote server...");
    const res = await fetch("https://google-mcp-server-production-5589.up.railway.app");
    console.log("Status:", res.status);
    console.log("Headers:", [...res.headers.entries()]);
    const text = await res.text();
    console.log("Body:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
