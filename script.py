from flask import Flask, request, render_template, redirect, url_for, jsonify
import pandas as pd 

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

def parse_money(value):
    """Parse money values from strings like '$11.49' or '11.49'"""
    if pd.isna(value) or value == '' or value == '--':
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    # Remove $ and convert to float
    str_value = str(value).replace('$', '').replace(',', '').strip()
    if str_value == '' or str_value == '--':
        return 0.0
    return float(str_value)

@app.route('/upload', methods=['POST'])
def upload():
    print("Upload endpoint called")
    print("Request files:", request.files.keys())
    
    if 'ordersFile' not in request.files or 'costsFile' not in request.files:
        print("Missing files in request")
        return jsonify({"error": "No files uploaded"}), 400
    
    ordersFile = request.files['ordersFile']
    costsFile = request.files['costsFile']
    
    print(f"Orders file: {ordersFile.filename}")
    print(f"Costs file: {costsFile.filename}")
    
    if ordersFile.filename == '' or costsFile.filename == '':
        print("Empty filenames")
        return jsonify({"error": "No input files"}), 400
    
    try:
        print("Reading CSV files...")
        orders_df = pd.read_csv(ordersFile)
        
        # Handle AliExpress CSV with pipe delimiters
        costsFile.seek(0)  # Reset file pointer
        first_line = costsFile.readline().decode('utf-8').strip()
        costsFile.seek(0)  # Reset again
        
        if first_line == 'sep=|':
            print("Detected pipe-delimited CSV, skipping first line")
            costs_df = pd.read_csv(costsFile, sep='|', skiprows=1)
        else:
            costs_df = pd.read_csv(costsFile)
            
        print(f"Orders DF shape: {orders_df.shape}")
        print(f"Costs DF shape: {costs_df.shape}")
        
        # Calculate summary metrics
        print("Calculating summary metrics...")
        
        # For Etsy orders - calculate total revenue from Net column (only Sale transactions)
        total_revenue = 0
        sales_count = 0
        if 'Net' in orders_df.columns and 'Type' in orders_df.columns:
            # Filter for only "Sale" type transactions
            sales_df = orders_df[orders_df['Type'] == 'Sale']
            total_revenue = sales_df['Net'].apply(parse_money).sum()
            sales_count = len(sales_df)
            print(f"Found {sales_count} sale transactions out of {len(orders_df)} total transactions")
        elif 'Amount' in orders_df.columns:
            total_revenue = orders_df['Amount'].apply(parse_money).sum()
            sales_count = len(orders_df)
            
        # For AliExpress costs - calculate total costs from Order Value column
        total_costs = 0
        if 'Order Value' in costs_df.columns:
            total_costs = costs_df['Order Value'].apply(parse_money).sum()
        elif 'Order_Value' in costs_df.columns:
            total_costs = costs_df['Order_Value'].apply(parse_money).sum()
            
        # Calculate profit and margin
        net_profit = total_revenue - total_costs
        profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0
        
        # 3-month prediction (simple projection based on current data)
        predicted_revenue = total_revenue * 3
        
        print(f"Total Revenue: ${total_revenue:.2f}")
        print(f"Total Costs: ${total_costs:.2f}")
        print(f"Net Profit: ${net_profit:.2f}")
        print(f"Profit Margin: {profit_margin:.1f}%")
        
        # Create full table data for orders (only Sale transactions)
        orders_table_data = []
        if 'Type' in orders_df.columns:
            # Filter for only Sale transactions
            display_orders = orders_df[orders_df['Type'] == 'Sale']
        else:
            display_orders = orders_df
            
        for _, row in display_orders.iterrows():
            # Handle NaN values by converting to string and checking
            date_val = row.get('Date', '')
            if pd.isna(date_val):
                date_val = ''
            
            order_id_val = row.get('Info', row.get('Order ID', ''))
            if pd.isna(order_id_val):
                order_id_val = ''
                
            type_val = row.get('Type', '')
            if pd.isna(type_val):
                type_val = ''
            
            orders_table_data.append({
                'date': str(date_val),
                'order_id': str(order_id_val),
                'order_value': f"${parse_money(row.get('Net', row.get('Amount', 0))):.2f}",
                'type': str(type_val),
                'fees_taxes': f"${parse_money(row.get('Fees & Taxes', 0)):.2f}"
            })
        
        # Create full table data for costs
        costs_table_data = []
        for _, row in costs_df.iterrows():
            # Handle NaN values
            description_val = row.get('product_title', row.get('Product Title', 'AliExpress Order'))
            if pd.isna(description_val):
                description_val = 'AliExpress Order'
                
            order_value_val = row.get('Order Value', '$0.00')
            if pd.isna(order_value_val):
                order_value_val = '$0.00'
            
            costs_table_data.append({
                'type': 'Product Cost',
                'description': str(description_val),
                'amount': str(order_value_val),
                'net_cost': str(order_value_val),
                'category': 'Inventory'
            })
        
        # Generate AI insights
        ai_insights = {
            'performance': f"Your business generated ${total_revenue:.2f} in revenue with ${total_costs:.2f} in costs, resulting in a {profit_margin:.1f}% profit margin.",
            'optimization': "Consider focusing on higher-margin products and reducing shipping costs to improve profitability.",
            'expenses': f"Product costs account for ${total_costs:.2f} of your expenses. Monitor supplier pricing for cost optimization.",
            'projections': f"Based on current trends, projected 3-month revenue could reach ${predicted_revenue:.2f}."
        }
        
        return jsonify({
            "success": True,
            "summary": {
                "total_revenue": f"${total_revenue:.2f}",
                "total_costs": f"${total_costs:.2f}",
                "net_profit": f"${net_profit:.2f}",
                "profit_margin": f"{profit_margin:.1f}%",
                "predicted_revenue": f"${predicted_revenue:.2f}",
                "revenue_period": f"{len(orders_df)} orders",
                "costs_period": f"{len(costs_df)} purchases"
            },
            "ai_insights": ai_insights,
            "orders_data": orders_table_data,
            "costs_data": costs_table_data
        })
        
    except Exception as e:
        print(f"Error in upload: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error processing files: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

