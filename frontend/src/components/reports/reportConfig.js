export const reportGroups = [
  {
    label: "Sales reports",
    items: [
      ["overview", "Overview"],
      ["sales", "Sales detail"],
      ["daily_sales", "Daily sales"],
      ["weekly_sales", "Weekly sales"],
      ["monthly_sales", "Monthly sales"],
      ["products", "Product sales"],
      ["categories", "Category sales"],
      ["cashiers", "Cashier sales"],
      ["payment_methods", "Payment methods"],
      ["best_selling_products", "Best sellers"],
    ],
  },
  {
    label: "Purchase reports",
    items: [
      ["purchase_summary", "Purchase summary"],
      ["supplier_purchases", "By supplier"],
      ["product_purchases", "By product"],
      ["monthly_purchases", "Monthly purchases"],
      ["supplier_balances", "Supplier balances"],
      ["purchase_payments", "Purchase payments"],
      ["purchase_returns", "Purchase returns"],
    ],
  },
  { label: "Financial reports", items: [["expenses", "Expenses"], ["profit", "Profit"]] },
  { label: "Inventory reports", items: [["stock", "Current stock"], ["low_stock", "Low stock"], ["out_of_stock", "Out of stock"], ["wastage", "Wastage"]] },
];

const grouped = [
  ["period_start", "Period"], ["completed_sales", "Sales"], ["gross_sales", "Gross sales"],
  ["discounts", "Discounts"], ["net_sales", "Net sales"], ["cost_of_goods", "Cost"],
  ["expenses", "Expenses"], ["estimated_net_profit", "Net profit"],
];

export const configs = {
  overview: { title: "Reports overview", description: "Sales, spending, profit and stock health for one selected period.", columns: grouped },
  sales: { title: "Sales detail", description: "Audit completed, cancelled and refunded transactions.", columns: [["invoice_number", "Invoice"], ["sale_date", "Date"], ["cashier_role", "Cashier"], ["customer_name", "Customer"], ["item_count", "Items"], ["grand_total", "Total"], ["payment_method", "Payment"], ["status", "Status"]] },
  daily_sales: { title: "Daily sales", description: "Day-by-day trading performance.", columns: grouped },
  weekly_sales: { title: "Weekly sales", description: "Monday-to-Sunday performance comparison.", columns: grouped },
  monthly_sales: { title: "Monthly sales", description: "Monthly business performance.", columns: grouped },
  products: { title: "Product sales", description: "Historical product quantity, revenue and margin.", columns: [["product_name", "Product"], ["product_code", "Code"], ["category_name", "Category"], ["quantity_sold", "Quantity"], ["gross_sales", "Gross sales"], ["net_sales", "Net sales"], ["cost_of_goods", "Cost"], ["gross_profit", "Profit"]] },
  best_selling_products: { title: "Best-selling products", description: "Products ranked by quantity and sales contribution.", columns: [["rank", "Rank"], ["product_name", "Product"], ["product_code", "Code"], ["category_name", "Category"], ["quantity_sold", "Quantity"], ["net_sales", "Net sales"], ["gross_profit", "Profit"], ["contribution_percentage", "Contribution"]] },
  categories: { title: "Category sales", description: "Category contribution to revenue and profit.", columns: [["category_name", "Category"], ["quantity_sold", "Quantity"], ["products_sold", "Products"], ["sales_count", "Sales"], ["net_sales", "Net sales"], ["gross_profit", "Profit"], ["contribution_percentage", "Contribution"]] },
  cashiers: { title: "Cashier sales", description: "Sales volume and payment performance by cashier.", columns: [["cashier_role", "Cashier"], ["completed_sales", "Completed"], ["cancelled_sales", "Cancelled"], ["refunded_sales", "Refunded"], ["net_sales", "Net sales"], ["average_sale_value", "Average sale"], ["cash_payments", "Cash"], ["non_cash_payments", "Non-cash"]] },
  payment_methods: { title: "Payment methods", description: "Collected and refunded amounts by payment type.", columns: [["payment_method", "Method"], ["transaction_count", "Transactions"], ["gross_amount", "Gross"], ["refunded_amount", "Refunded"], ["net_collected", "Net collected"], ["percentage", "Contribution"]] },
  expenses: { title: "Expense report", description: "Active and voided shop spending by category.", columns: [["expense_date", "Date"], ["title", "Expense"], ["category_name", "Category"], ["added_by_role", "Added by"], ["payment_method", "Payment"], ["amount", "Amount"], ["status", "Status"]] },
  profit: { title: "Profit report", description: "Revenue less historical cost of goods and active expenses.", columns: grouped },
  stock: { title: "Current stock", description: "Live inventory quantities and estimated valuation.", columns: [["product_name", "Product"], ["product_code", "Code"], ["category_name", "Category"], ["current_quantity", "Stock"], ["minimum_stock", "Minimum"], ["unit_type", "Unit"], ["stock_status", "Status"], ["estimated_stock_value", "Value"], ["last_movement", "Last movement"]] },
  low_stock: { title: "Low stock", description: "Tracked products at or below minimum stock.", columns: [["product_name", "Product"], ["product_code", "Code"], ["category_name", "Category"], ["current_quantity", "Stock"], ["minimum_stock", "Minimum"], ["shortage", "Shortage"], ["unit_type", "Unit"], ["last_movement", "Last movement"]] },
  out_of_stock: { title: "Out of stock", description: "Tracked products with no available stock.", columns: [["product_name", "Product"], ["product_code", "Code"], ["category_name", "Category"], ["minimum_stock", "Minimum"], ["unit_type", "Unit"], ["product_status", "Product status"], ["last_movement", "Last movement"]] },
  wastage: { title: "Wastage and loss", description: "Wastage, damaged and expired stock movements.", columns: [["transaction_date", "Date"], ["product_name", "Product"], ["product_code", "Code"], ["category_name", "Category"], ["transaction_type", "Type"], ["quantity", "Quantity"], ["unit_type", "Unit"], ["reason", "Reason"], ["user_role", "User"], ["cost_impact", "Estimated cost"]] },
  purchase_summary: { title: "Purchase summary", description: "Completed, returned and cancelled purchases for the selected period.", columns: [["purchase_number", "Purchase"], ["purchase_date", "Date"], ["supplier_name", "Supplier"], ["supplier_invoice_number", "Supplier invoice"], ["grand_total", "Total"], ["amount_paid", "Paid"], ["balance_due", "Balance"], ["payment_status", "Payment"], ["purchase_status", "Status"]] },
  supplier_purchases: { title: "Purchases by supplier", description: "Purchase volume, payments and outstanding balances by supplier.", columns: [["supplier_name", "Supplier"], ["phone", "Phone"], ["purchase_count", "Purchases"], ["total_purchases", "Purchase value"], ["amount_paid", "Paid"], ["balance_due", "Purchase balance"], ["current_balance", "Current balance"]] },
  product_purchases: { title: "Purchases by product", description: "Received, returned and net purchased quantities using historical costs.", columns: [["product_name", "Product"], ["product_code", "Code"], ["unit_type", "Unit"], ["purchased_quantity", "Purchased"], ["returned_quantity", "Returned"], ["net_quantity", "Net quantity"], ["net_purchase_value", "Net value"], ["average_unit_cost", "Average cost"]] },
  monthly_purchases: { title: "Monthly purchases", description: "Monthly purchase value, payments and outstanding amounts.", columns: [["period", "Month"], ["purchase_count", "Purchases"], ["total_purchases", "Purchase value"], ["amount_paid", "Paid"], ["balance_due", "Balance"]] },
  supplier_balances: { title: "Supplier outstanding balances", description: "Live payable or receivable balance for every supplier.", columns: [["supplier_name", "Supplier"], ["phone", "Phone"], ["email", "Email"], ["purchase_count", "Purchases"], ["opening_balance", "Opening balance"], ["current_balance", "Current balance"], ["status", "Status"]] },
  purchase_payments: { title: "Purchase payment history", description: "Supplier payments with purchase references and methods.", columns: [["payment_date", "Date"], ["purchase_number", "Purchase"], ["supplier_name", "Supplier"], ["amount", "Amount"], ["payment_method", "Method"], ["reference_number", "Reference"], ["notes", "Notes"]] },
  purchase_returns: { title: "Purchase return report", description: "Returned stock value and supplier refunds for the selected period.", columns: [["return_number", "Return"], ["return_date", "Date"], ["purchase_number", "Purchase"], ["supplier_name", "Supplier"], ["return_value", "Return value"], ["refund_amount", "Refund"], ["reason", "Reason"]] },
};

export const stockTypes = new Set(["stock", "low_stock", "out_of_stock", "supplier_balances"]);
export const purchaseTypes = new Set(["purchase_summary", "supplier_purchases", "product_purchases", "monthly_purchases", "supplier_balances", "purchase_payments", "purchase_returns"]);
export const moneyKeys = new Set([
  "gross_sales", "discounts", "total_discounts", "net_sales", "cost_of_goods", "gross_profit", "expenses",
  "estimated_net_profit", "grand_total", "gross_amount", "refunded_amount", "net_collected", "amount",
  "average_sale_value", "cash_payments", "non_cash_payments", "estimated_stock_value", "stock_value",
  "cost_impact", "estimated_cost_impact", "total_expenses", "average_expense", "highest_expense", "tax_amount",
  "total_purchases", "amount_paid", "balance_due", "current_balance", "opening_balance", "total_supplier_balance",
  "total_purchase_value", "net_purchase_value", "average_unit_cost", "total_paid", "return_value", "total_returned",
  "total_refunded",
]);