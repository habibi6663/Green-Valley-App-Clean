import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON
  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Backend is operational" });
  });

  // Example API route for report generation (to be used by the frontend later)
  app.post("/api/reports/generate", (req, res) => {
    const { type, timeframe, format } = req.body;
    console.log(`Generating ${type} report for ${timeframe} in ${format} format...`);
    
    // Simulate some processing
    setTimeout(() => {
      res.json({ 
        success: true, 
        reportId: `REP-${Math.floor(Math.random() * 1000000)}`,
        downloadUrl: `/api/reports/download/example.pdf`
      });
    }, 2000);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
