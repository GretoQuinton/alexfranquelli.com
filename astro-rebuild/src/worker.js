import { DurableObject } from 'cloudflare:workers';

// One shared, persistent counter per deployment environment. Cloudflare provisions
// a separate SQLite-backed Durable Object for each preview.
export class VisitorCounter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS visit_counter (id INTEGER PRIMARY KEY, total INTEGER NOT NULL)'
    );
    this.ctx.storage.sql.exec(
      'INSERT OR IGNORE INTO visit_counter (id, total) VALUES (1, 0)'
    );
  }

  getTotal() {
    return this.ctx.storage.sql
      .exec('SELECT total FROM visit_counter WHERE id = 1')
      .one().total;
  }

  recordVisit() {
    return this.ctx.storage.sql
      .exec('UPDATE visit_counter SET total = total + 1 WHERE id = 1 RETURNING total')
      .one().total;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Every ordinary page and asset continues to use Cloudflare Static Assets.
    if (url.pathname !== '/api/visits') {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== 'GET' && request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { Allow: 'GET, POST', 'Cache-Control': 'no-store' },
      });
    }

    // A count update must originate from this website, not an embedded link
    // or an unrelated site. This is basic abuse prevention, not authentication.
    if (request.method === 'POST' && request.headers.get('Origin') !== url.origin) {
      return new Response('Forbidden', { status: 403 });
    }

    const counter = env.VISITOR_COUNTER.getByName('website');
    const visits = request.method === 'POST'
      ? await counter.recordVisit()
      : await counter.getTotal();

    return Response.json({ visits }, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
      },
    });
  },
};
