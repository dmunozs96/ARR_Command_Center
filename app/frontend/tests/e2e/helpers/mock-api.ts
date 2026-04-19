import type { Page, Route } from "@playwright/test";

const snapshots = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    created_at: "2026-04-19T20:00:00Z",
    sync_type: "excel_import",
    triggered_by: "seed",
    status: "completed",
    sf_records_fetched: 42,
    sf_records_processed: 42,
    alerts_count: 2,
    unclassified_products_count: 1,
    duration_seconds: 3.4,
    notes: "Snapshot de prueba",
  },
];

const arrSummary = {
  snapshot_id: snapshots[0].id,
  months: [
    {
      month: "2026-03-01",
      total_arr: 120000,
      by_product_type: {
        "SaaS LMS": 70000,
        "SaaS Skills": 50000,
      },
      mom_change: 5000,
      mom_pct: 4.35,
    },
    {
      month: "2026-04-01",
      total_arr: 128000,
      by_product_type: {
        "SaaS LMS": 76000,
        "SaaS Skills": 52000,
      },
      mom_change: 8000,
      mom_pct: 6.67,
    },
  ],
};

const alerts = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    snapshot_id: snapshots[0].id,
    alert_type: "UNCLASSIFIED_PRODUCT",
    severity: "ERROR",
    sf_opportunity_id: "006000001",
    opportunity_name: "Expansion ACME",
    account_name: "ACME Corp",
    product_name: "Nuevo producto",
    description: "Producto sin clasificar en la tabla maestra.",
    reviewed: false,
    review_note: null,
    reviewed_at: null,
    reviewed_by: null,
    created_at: "2026-04-19T20:00:00Z",
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    snapshot_id: snapshots[0].id,
    alert_type: "MISSING_END_DATE",
    severity: "WARNING",
    sf_opportunity_id: "006000002",
    opportunity_name: "Renewal Beta",
    account_name: "Beta Corp",
    product_name: "Licencias LMS",
    description: "Falta la fecha de fin de suscripcion.",
    reviewed: false,
    review_note: null,
    reviewed_at: null,
    reviewed_by: null,
    created_at: "2026-04-19T20:05:00Z",
  },
];

const stripeRows = [
  {
    month: "2026-03-01",
    mrr: 9500,
    arr_equivalent: 114000,
    entered_by: "QA",
    entered_at: "2026-04-01T09:00:00Z",
  },
];

const consultants = {
  snapshot_id: snapshots[0].id,
  month: "2026-04-01",
  consultants: [
    {
      name: "Maria Lopez",
      country: "Spain",
      arr_total: 76000,
      by_product_type: {
        "SaaS LMS": 50000,
        "SaaS Skills": 26000,
      },
      mom_change: 4000,
      mom_pct: 5.56,
    },
    {
      name: "John Smith",
      country: "UK",
      arr_total: 52000,
      by_product_type: {
        "SaaS Skills": 52000,
      },
      mom_change: 1500,
      mom_pct: 2.97,
    },
  ],
};

function json(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function installDefaultMocks(page: Page) {
  await page.route("**/api/snapshots", (route) => json(route, snapshots));

  await page.route(/.*\/api\/arr\/summary.*/, (route) => json(route, arrSummary));

  await page.route(/.*\/api\/alerts.*/, async (route) => {
    const url = new URL(route.request().url());
    const reviewed = url.searchParams.get("reviewed");
    const alertType = url.searchParams.get("alert_type");

    let result = alerts;

    if (reviewed === "false") {
      result = result.filter((alert) => !alert.reviewed);
    }

    if (alertType) {
      result = result.filter((alert) => alert.alert_type === alertType);
    }

    return json(route, result);
  });

  await page.route(/.*\/api\/stripe-mrr.*/, (route) => json(route, stripeRows));

  await page.route(/.*\/api\/arr\/by-consultant.*/, (route) => json(route, consultants));

  await page.route(/.*\/api\/alerts\/.*/, async (route) => {
    if (route.request().method() === "PATCH") {
      const payload = JSON.parse(route.request().postData() ?? "{}");
      return json(route, {
        ...alerts[0],
        reviewed: payload.reviewed ?? true,
        review_note: payload.review_note ?? "Revisada desde e2e",
        reviewed_by: payload.reviewed_by ?? "E2E",
        reviewed_at: "2026-04-19T21:00:00Z",
      });
    }
    return route.fallback();
  });

  await page.route(/.*\/api\/sync.*/, (route) =>
    json(route, {
      snapshot_id: snapshots[0].id,
      status: "completed",
      records_processed: 42,
      alerts_count: 2,
      duration_seconds: 3.4,
    }),
  );
}
