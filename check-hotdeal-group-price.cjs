const fs = require("fs");

const db = JSON.parse(
  fs.readFileSync("./coupang-hotdeal/data/hotdeal-db.json", "utf8")
);

const groups = {};

for (const history of Object.values(db)) {
  for (const x of history) {
    if (
      !x.productGroup ||
      !Number.isFinite(Number(x.unitPrice)) ||
      Number(x.unitPrice) <= 0
    ) continue;

    (groups[x.productGroup] ??= []).push(x);
  }
}

for (const [group, rows] of Object.entries(groups)) {
  rows.sort((a, b) => a.date.localeCompare(b.date));

  const latest = rows.at(-1).date;

  const d7 = new Date(latest + "T00:00:00");
  d7.setDate(d7.getDate() - 6);

  const d30 = new Date(latest + "T00:00:00");
  d30.setDate(d30.getDate() - 29);

  const p7 = rows
    .filter(x => new Date(x.date + "T00:00:00") >= d7)
    .map(x => Number(x.unitPrice));

  const p30 = rows
    .filter(x => new Date(x.date + "T00:00:00") >= d30)
    .map(x => Number(x.unitPrice));

  console.log(
    group,
    "| 7D =", p7.length ? Math.min(...p7) : null,
    "| 30D =", p30.length ? Math.min(...p30) : null,
    "| records =", rows.length
  );
}
