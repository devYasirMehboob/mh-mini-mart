import { useState } from "react";
import Icon from "../Icon";
import { purchaseTypes, stockTypes } from "./reportConfig";

const field =
  "min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:bg-white hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10";

function iso(date) {
  return (
    String(date.getFullYear()) +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}

function range(kind) {
  const today = new Date(),
    from = new Date(today),
    to = new Date(today);
  if (kind === "yesterday") {
    from.setDate(today.getDate() - 1);
    to.setDate(today.getDate() - 1);
  }
  if (kind === "week")
    from.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  if (kind === "last_week") {
    from.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 7);
    to.setTime(from.getTime());
    to.setDate(from.getDate() + 6);
  }
  if (kind === "month") from.setDate(1);
  if (kind === "last_month") {
    from.setMonth(today.getMonth() - 1, 1);
    to.setDate(0);
  }
  if (kind === "year") {
    from.setMonth(0, 1);
  }
  return { date_from: iso(from), date_to: iso(to), page: 1 };
}

function FilterField({ label, children, icon }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 ml-1">
        {label}
      </span>
      <div className="relative">
        {icon && (
          <Icon
            name={icon}
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
        )}
        {children}
      </div>
    </label>
  );
}

function ReportFilters({ type, filters, options, onChange, onClear }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const dated = !stockTypes.has(type);
  const purchase = purchaseTypes.has(type);
  const sales = [
    "sales",
    "daily_sales",
    "weekly_sales",
    "monthly_sales",
    "products",
    "categories",
    "cashiers",
    "payment_methods",
    "best_selling_products",
    "overview",
    "profit",
  ].includes(type);
  const product = [
    "products",
    "best_selling_products",
    "wastage",
    "product_purchases",
  ].includes(type);
  const category = [
    "products",
    "categories",
    "best_selling_products",
    "stock",
    "low_stock",
    "out_of_stock",
    "wastage",
  ].includes(type);
  const hasAdvanced =
    product ||
    category ||
    purchase ||
    sales ||
    type === "expenses" ||
    type === "stock" ||
    type === "wastage";

  return (
    <section className="premium-surface overflow-hidden rounded-2xl no-print border border-slate-100 shadow-sm">
      <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {dated ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-2 text-xs font-bold text-slate-400">
              Quick ranges:
            </span>
            {[
              ["today", "Today"],
              ["yesterday", "Yesterday"],
              ["week", "This week"],
              ["month", "This month"],
              ["last_month", "Last month"],
              ["year", "This year"],
            ].map(([key, text]) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange(range(key))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:ring-2 focus:ring-slate-200 focus:outline-none"
              >
                {text}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs font-bold text-slate-400">Filters</div>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
          >
            <Icon name="x" className="size-3.5" />
            Clear
          </button>
          {hasAdvanced && (
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 transition"
            >
              <Icon name="filter" className="size-3.5" />
              {showAdvanced ? "Hide filters" : "More filters"}
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {dated && (
            <>
              <FilterField label="Date From">
                <input
                  type="date"
                  className={field}
                  value={filters.date_from}
                  onChange={(e) =>
                    onChange({ date_from: e.target.value, page: 1 })
                  }
                />
              </FilterField>
              <FilterField label="Date To">
                <input
                  type="date"
                  className={field}
                  value={filters.date_to}
                  onChange={(e) =>
                    onChange({ date_to: e.target.value, page: 1 })
                  }
                />
              </FilterField>
            </>
          )}

          {![
            "overview",
            "daily_sales",
            "weekly_sales",
            "monthly_sales",
            "profit",
            "payment_methods",
          ].includes(type) && (
            <div
              className={
                dated && !showAdvanced ? "sm:col-span-2 xl:col-span-2" : ""
              }
            >
              <FilterField label="Search Report" icon="search">
                <input
                  className={`${field} pl-9`}
                  value={filters.search}
                  onChange={(e) =>
                    onChange({ search: e.target.value, page: 1 })
                  }
                  placeholder="Type to search..."
                />
              </FilterField>
            </div>
          )}

          {showAdvanced && (
            <>
              {product && (
                <FilterField label="Product">
                  <select
                    className={field}
                    value={filters.product_id}
                    onChange={(e) =>
                      onChange({ product_id: e.target.value, page: 1 })
                    }
                  >
                    <option value="">All products</option>
                    {options.products.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </FilterField>
              )}
              {category && (
                <FilterField label="Category">
                  <select
                    className={field}
                    value={filters.category_id}
                    onChange={(e) =>
                      onChange({ category_id: e.target.value, page: 1 })
                    }
                  >
                    <option value="">All categories</option>
                    {options.categories.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </FilterField>
              )}
              {purchase && (
                <FilterField label="Supplier">
                  <select
                    className={field}
                    value={filters.supplier_id}
                    onChange={(e) =>
                      onChange({ supplier_id: e.target.value, page: 1 })
                    }
                  >
                    <option value="">All suppliers</option>
                    {options.suppliers.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </FilterField>
              )}
              {sales && (
                <FilterField label="Cashier">
                  <select
                    className={field}
                    value={filters.cashier_id}
                    onChange={(e) =>
                      onChange({ cashier_id: e.target.value, page: 1 })
                    }
                  >
                    <option value="">All cashiers</option>
                    {options.cashiers.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.role}
                      </option>
                    ))}
                  </select>
                </FilterField>
              )}
              {["sales", "payment_methods"].includes(type) && (
                <FilterField label="Payment Method">
                  <select
                    className={field}
                    value={filters.payment_method}
                    onChange={(e) =>
                      onChange({ payment_method: e.target.value, page: 1 })
                    }
                  >
                    <option value="">All payment methods</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="mobile_wallet">Mobile wallet</option>
                    <option value="other">Other</option>
                  </select>
                </FilterField>
              )}
              {type === "sales" && (
                <>
                  <FilterField label="Status">
                    <select
                      className={field}
                      value={filters.sale_status}
                      onChange={(e) =>
                        onChange({ sale_status: e.target.value, page: 1 })
                      }
                    >
                      <option value="">All statuses</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </FilterField>
                  <FilterField label="Min Total">
                    <input
                      type="number"
                      min="0"
                      className={field}
                      placeholder="e.g. 100"
                      value={filters.min_total}
                      onChange={(e) =>
                        onChange({ min_total: e.target.value, page: 1 })
                      }
                    />
                  </FilterField>
                  <FilterField label="Max Total">
                    <input
                      type="number"
                      min="0"
                      className={field}
                      placeholder="e.g. 5000"
                      value={filters.max_total}
                      onChange={(e) =>
                        onChange({ max_total: e.target.value, page: 1 })
                      }
                    />
                  </FilterField>
                </>
              )}
              {type === "expenses" && (
                <>
                  <FilterField label="Expense Category">
                    <select
                      className={field}
                      value={filters.expense_category_id}
                      onChange={(e) =>
                        onChange({
                          expense_category_id: e.target.value,
                          page: 1,
                        })
                      }
                    >
                      <option value="">All expense categories</option>
                      {options.expense_categories.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </FilterField>
                  <FilterField label="Expense Status">
                    <select
                      className={field}
                      value={filters.expense_status}
                      onChange={(e) =>
                        onChange({ expense_status: e.target.value, page: 1 })
                      }
                    >
                      <option value="active">Active</option>
                      <option value="voided">Voided</option>
                      <option value="all">All statuses</option>
                    </select>
                  </FilterField>
                  <FilterField label="Min Amount">
                    <input
                      type="number"
                      min="0"
                      className={field}
                      placeholder="e.g. 100"
                      value={filters.min_amount}
                      onChange={(e) =>
                        onChange({ min_amount: e.target.value, page: 1 })
                      }
                    />
                  </FilterField>
                  <FilterField label="Max Amount">
                    <input
                      type="number"
                      min="0"
                      className={field}
                      placeholder="e.g. 1000"
                      value={filters.max_amount}
                      onChange={(e) =>
                        onChange({ max_amount: e.target.value, page: 1 })
                      }
                    />
                  </FilterField>
                </>
              )}
              {type === "profit" && (
                <FilterField label="Group By">
                  <select
                    className={field}
                    value={filters.group_by}
                    onChange={(e) =>
                      onChange({ group_by: e.target.value, page: 1 })
                    }
                  >
                    <option value="day">Group daily</option>
                    <option value="week">Group weekly</option>
                    <option value="month">Group monthly</option>
                  </select>
                </FilterField>
              )}
              {type === "stock" && (
                <>
                  <FilterField label="Stock Status">
                    <select
                      className={field}
                      value={filters.stock_status}
                      onChange={(e) =>
                        onChange({ stock_status: e.target.value, page: 1 })
                      }
                    >
                      <option value="">All stock statuses</option>
                      <option value="in_stock">In stock</option>
                      <option value="low_stock">Low stock</option>
                      <option value="out_of_stock">Out of stock</option>
                    </select>
                  </FilterField>
                  <FilterField label="Tracking Mode">
                    <select
                      className={field}
                      value={filters.tracking}
                      onChange={(e) =>
                        onChange({ tracking: e.target.value, page: 1 })
                      }
                    >
                      <option value="">All tracking modes</option>
                      <option value="tracked">Tracked</option>
                      <option value="untracked">Not tracked</option>
                    </select>
                  </FilterField>
                </>
              )}
              {type === "wastage" && (
                <FilterField label="Loss Type">
                  <select
                    className={field}
                    value={filters.transaction_type}
                    onChange={(e) =>
                      onChange({ transaction_type: e.target.value, page: 1 })
                    }
                  >
                    <option value="">All loss types</option>
                    <option value="wastage">Wastage</option>
                    <option value="damaged">Damaged</option>
                    <option value="expired">Expired</option>
                  </select>
                </FilterField>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
export default ReportFilters;
