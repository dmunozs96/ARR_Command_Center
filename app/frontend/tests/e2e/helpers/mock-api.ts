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
  {
    id: "22222222-2222-2222-2222-222222222222",
    created_at: "2026-03-19T20:00:00Z",
    sync_type: "excel_import",
    triggered_by: "seed",
    status: "completed",
    sf_records_fetched: 40,
    sf_records_processed: 40,
    alerts_count: 1,
    unclassified_products_count: 0,
    duration_seconds: 3.1,
    notes: "Snapshot anterior",
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
      mom_pct: 4.35,
    },
    {
      month: "2026-04-01",
      total_arr: 128000,
      by_product_type: {
        "SaaS LMS": 76000,
        "SaaS Skills": 52000,
      },
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
    },
    {
      name: "John Smith",
      country: "UK",
      arr_total: 52000,
      by_product_type: {
        "SaaS Skills": 52000,
      },
    },
  ],
};

const arrByAccount = {
  snapshot_id: snapshots[0].id,
  months: ["2026-03-01", "2026-04-01"],
  accounts: [
    {
      rank: 1,
      account_name: "ACME Corp",
      total_arr: 146000,
      by_month: {
        "2026-03-01": 70000,
        "2026-04-01": 76000,
      },
      first_month_arr: 70000,
      last_month_arr: 76000,
      delta: 6000,
    },
    {
      rank: 2,
      account_name: "Beta Corp",
      total_arr: 102000,
      by_month: {
        "2026-03-01": 50000,
        "2026-04-01": 52000,
      },
      first_month_arr: 50000,
      last_month_arr: 52000,
      delta: 2000,
    },
  ],
  others: {
    rank: 0,
    account_name: "Otros",
    total_arr: 0,
    by_month: {
      "2026-03-01": 0,
      "2026-04-01": 0,
    },
    first_month_arr: 0,
    last_month_arr: 0,
    delta: 0,
  },
  total_arr: 248000,
};

const snapshotReviewTotals = {
  snapshot_a: snapshots[1],
  snapshot_b: snapshots[0],
  data: [
    { month: "2026-03-01", arr_a: 120000, arr_b: 120000 },
    { month: "2026-04-01", arr_a: 122000, arr_b: 128000 },
  ],
  months_common: 2,
  months_only_in_a: 0,
  months_only_in_b: 0,
  data_identical: false,
};

const snapshotReviewDetail = {
  month: "2026-04-01",
  rows: [
    {
      sf_line_item_id: "LI-NEW",
      sf_opportunity_id: "OPP-NEW",
      opportunity_name: "Expansion ACME",
      account_name: "ACME Corp",
      business_line: "LMS",
      product_type: "SaaS LMS",
      consultant: "Maria Lopez",
      arr_a: 0,
      arr_b: 6000,
      delta: 6000,
      delta_pct: null,
      change_type: "new",
    },
  ],
  summary: { new: 1, removed: 0, modified: 0, unchanged: 0, total_delta: 6000 },
};

const churnRatios = {
  window: "ltm",
  month_a: "2025-04-01",
  month_b: "2026-04-01",
  nrr: 104.2,
  grr: 91.4,
  logo_churn_rate: 6.3,
  churned_arr: 36000,
  arr_cohort_start: 420000,
  churned_logos: 1,
  total_logos: 16,
  churn_eur: 36000,
  down_selling_eur: 12000,
  up_selling_eur: 65640,
};

const churnRolling = {
  window: "ltm",
  data: [
    { month: "2026-03-01", nrr: 102.1, grr: 92.0, churned_arr: 22000, churned_logos: 1 },
    { month: "2026-04-01", nrr: 104.2, grr: 91.4, churned_arr: 36000, churned_logos: 1 },
  ],
};

const churnedAccounts = {
  items: [
    { account_name: "Beta Corp", product_type: "SaaS Skills", churn_month: "2026-04-01", arr_lost: 36000 },
  ],
  total_arr_lost: 36000,
  count: 1,
};

const churnByProductType = {
  data: [
    { month: "2026-03-01", by_product_type: {}, total_churned_arr: 0 },
    { month: "2026-04-01", by_product_type: { "SaaS Skills": 36000 }, total_churned_arr: 36000 },
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

  await page.route(/.*\/api\/arr\/by-account.*/, (route) => json(route, arrByAccount));

  await page.route(/.*\/api\/config\/products.*/, (route) => json(route, []));

  await page.route(/.*\/api\/snapshot-review\/monthly-totals.*/, (route) => json(route, snapshotReviewTotals));

  await page.route(/.*\/api\/snapshot-review\/period-detail.*/, (route) => json(route, snapshotReviewDetail));

  await page.route(/.*\/api\/churn\/ratios.*/, (route) => json(route, churnRatios));

  await page.route(/.*\/api\/churn\/rolling.*/, (route) => json(route, churnRolling));

  await page.route(/.*\/api\/churn\/churned-accounts.*/, (route) => json(route, churnedAccounts));

  await page.route(/.*\/api\/churn\/by-product-type.*/, (route) => json(route, churnByProductType));

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
