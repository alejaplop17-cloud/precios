import express from 'express';
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { createServer as createViteServer } from 'vite';
import { SEED_WORKSPACES } from './src/data/seedWorkspaces.ts';
import type { BusinessConfig, ProductItem, WorkspaceData } from './src/types/pricing.ts';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Ensure data directory exists for SQLite
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'pricing.db');
const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    sector TEXT NOT NULL,
    config_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    data_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );
`);

function seedDatabaseIfEmpty(force = false) {
  const countRow = db.prepare('SELECT COUNT(*) as total FROM businesses').get() as { total: number };
  if (countRow.total > 0 && !force) return;

  if (force) {
    db.exec('DELETE FROM products; DELETE FROM businesses;');
  }

  const insertBiz = db.prepare(
    'INSERT INTO businesses (id, company_name, sector, config_json, updated_at) VALUES (?, ?, ?, ?, ?)'
  );
  const insertProd = db.prepare(
    'INSERT INTO products (id, business_id, name, data_json, updated_at) VALUES (?, ?, ?, ?, ?)'
  );

  const now = new Date().toISOString();
  for (const ws of SEED_WORKSPACES) {
    insertBiz.run(
      ws.business.id,
      ws.business.companyName,
      ws.business.sector,
      JSON.stringify(ws.business),
      now
    );
    for (const prod of ws.products) {
      insertProd.run(
        prod.id,
        ws.business.id,
        prod.name,
        JSON.stringify(prod),
        now
      );
    }
  }
}

seedDatabaseIfEmpty(false);

function readAllWorkspaces(): WorkspaceData[] {
  const bizRows = db
    .prepare('SELECT config_json FROM businesses ORDER BY rowid ASC')
    .all() as Array<{ config_json: string }>;

  const prodRows = db
    .prepare('SELECT business_id, data_json FROM products ORDER BY rowid ASC')
    .all() as Array<{ business_id: string; data_json: string }>;

  const productsByBiz = new Map<string, ProductItem[]>();
  for (const row of prodRows) {
    const prod = JSON.parse(row.data_json) as ProductItem;
    const list = productsByBiz.get(row.business_id) ?? [];
    list.push(prod);
    productsByBiz.set(row.business_id, list);
  }

  return bizRows.map((row) => {
    const business = JSON.parse(row.config_json) as BusinessConfig;
    return {
      business,
      products: productsByBiz.get(business.id) ?? [],
    };
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', database: 'sqlite' });
  });

  app.get('/api/workspaces', (_req, res) => {
    try {
      res.json({ workspaces: readAllWorkspaces() });
    } catch (err) {
      console.error('Error reading workspaces:', err);
      res.status(500).json({ error: 'Error al consultar la base de datos SQLite.' });
    }
  });

  app.post('/api/workspaces', (req, res) => {
    try {
      const { business, initialProduct } = req.body as {
        business: BusinessConfig;
        initialProduct?: ProductItem;
      };
      if (!business?.id || !business.companyName) {
        res.status(400).json({ error: 'Datos de empresa inválidos.' });
        return;
      }
      const now = new Date().toISOString();
      const bizPayload = { ...business, updatedAt: now };

      db.prepare(
        'INSERT INTO businesses (id, company_name, sector, config_json, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).run(
        bizPayload.id,
        bizPayload.companyName,
        bizPayload.sector,
        JSON.stringify(bizPayload),
        now
      );

      if (initialProduct) {
        db.prepare(
          'INSERT INTO products (id, business_id, name, data_json, updated_at) VALUES (?, ?, ?, ?, ?)'
        ).run(
          initialProduct.id,
          bizPayload.id,
          initialProduct.name,
          JSON.stringify(initialProduct),
          now
        );
      }

      res.status(201).json({ workspaces: readAllWorkspaces() });
    } catch (err) {
      console.error('Error creating workspace:', err);
      res.status(500).json({ error: 'No se pudo crear la empresa.' });
    }
  });

  app.put('/api/businesses/:id', (req, res) => {
    try {
      const { id } = req.params;
      const business = req.body as BusinessConfig;
      const now = new Date().toISOString();
      const updated = { ...business, id, updatedAt: now };

      const result = db
        .prepare(
          'UPDATE businesses SET company_name = ?, sector = ?, config_json = ?, updated_at = ? WHERE id = ?'
        )
        .run(
          updated.companyName,
          updated.sector,
          JSON.stringify(updated),
          now,
          id
        );

      if (result.changes === 0) {
        res.status(404).json({ error: 'Empresa no encontrada.' });
        return;
      }
      res.json({ business: updated });
    } catch (err) {
      console.error('Error updating business:', err);
      res.status(500).json({ error: 'Error actualizando configuración de empresa.' });
    }
  });

  app.delete('/api/businesses/:id', (req, res) => {
    try {
      const count = db.prepare('SELECT COUNT(*) as total FROM businesses').get() as { total: number };
      if (count.total <= 1) {
        res.status(400).json({ error: 'Debe existir al menos una empresa activa.' });
        return;
      }
      db.prepare('DELETE FROM businesses WHERE id = ?').run(req.params.id);
      res.json({ workspaces: readAllWorkspaces() });
    } catch (err) {
      console.error('Error deleting business:', err);
      res.status(500).json({ error: 'Error eliminando empresa.' });
    }
  });

  app.post('/api/products', (req, res) => {
    try {
      const product = req.body as ProductItem;
      if (!product?.id || !product.businessId || !product.name) {
        res.status(400).json({ error: 'Datos de producto inválidos.' });
        return;
      }
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO products (id, business_id, name, data_json, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).run(
        product.id,
        product.businessId,
        product.name,
        JSON.stringify(product),
        now
      );
      res.status(201).json({ product });
    } catch (err) {
      console.error('Error creating product:', err);
      res.status(500).json({ error: 'No se pudo guardar el producto.' });
    }
  });

  app.put('/api/products/:id', (req, res) => {
    try {
      const { id } = req.params;
      const product = { ...(req.body as ProductItem), id };
      const now = new Date().toISOString();

      const result = db
        .prepare(
          'UPDATE products SET name = ?, data_json = ?, updated_at = ? WHERE id = ?'
        )
        .run(product.name, JSON.stringify(product), now, id);

      if (result.changes === 0) {
        res.status(404).json({ error: 'Producto no encontrado.' });
        return;
      }
      res.json({ product });
    } catch (err) {
      console.error('Error updating product:', err);
      res.status(500).json({ error: 'No se pudo actualizar el producto.' });
    }
  });

  app.delete('/api/products/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error('Error deleting product:', err);
      res.status(500).json({ error: 'No se pudo eliminar el producto.' });
    }
  });

  app.post('/api/workspaces/reset', (_req, res) => {
    try {
      seedDatabaseIfEmpty(true);
      res.json({ workspaces: readAllWorkspaces() });
    } catch (err) {
      console.error('Error resetting workspaces:', err);
      res.status(500).json({ error: 'No se pudo restaurar los casos iniciales.' });
    }
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Valora Pricing server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
