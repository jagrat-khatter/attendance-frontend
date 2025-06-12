export default async function handler(req, res) {
  try {
    const response = await fetch('https://attendance-node-backend-production.up.railway.app/mark-attendance', {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ message: "Proxy failed", error: err.message });
  }
}
