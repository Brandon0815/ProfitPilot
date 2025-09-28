from flask import Flask, request, render_template, redirect, url_for, jsonify
import pandas as pd
import requests
import json
import os 

app = Flask(__name__)

def generate_ai_insights(total_revenue, total_costs, profit_margin, sales_count):
    """Generate AI insights using Hugging Face API"""
    
    # Get API key from environment variable (more secure)
    api_key = os.getenv('HUGGINGFACE_API_KEY')
    
    if not api_key:
        # Fallback to static insights if no API key
        return {
            'performance': f"Your business generated ${total_revenue:.2f} in revenue with ${total_costs:.2f} in costs, resulting in a {profit_margin:.1f}% profit margin.",
            'optimization': "Consider focusing on higher-margin products and reducing shipping costs to improve profitability.",
            'expenses': f"Product costs account for ${total_costs:.2f} of your expenses. Monitor supplier pricing for cost optimization.",
            'projections': f"Based on current trends, projected 3-month revenue could reach ${total_revenue * 3:.2f}."
        }
    
    try:
        # Prepare the prompt for AI analysis
        prompt = f"""Analyze this e-commerce business data and provide insights:
        
Revenue: ${total_revenue:.2f}
Costs: ${total_costs:.2f}
Profit Margin: {profit_margin:.1f}%
Sales Count: {sales_count}

Provide specific, actionable business insights for performance, optimization, expenses, and projections."""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 200,
                "temperature": 0.7
            }
        }
        
        # Use a text generation model
        response = requests.post(
            "https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill",
            headers=headers,
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            if isinstance(result, list) and len(result) > 0:
                ai_text = result[0].get('generated_text', '')
                
                # Parse the AI response into categories
                return {
                    'performance': f"AI Analysis: {ai_text[:100]}..." if ai_text else f"Revenue of ${total_revenue:.2f} with {profit_margin:.1f}% margin shows solid performance.",
                    'optimization': "Focus on high-margin products and optimize shipping costs for better profitability.",
                    'expenses': f"Monitor your ${total_costs:.2f} in costs. Look for supplier optimization opportunities.",
                    'projections': f"Based on current {sales_count} sales, projected quarterly revenue: ${total_revenue * 3:.2f}."
                }
        
        # Fallback if API call fails
        return {
            'performance': f"Your business generated ${total_revenue:.2f} in revenue with {profit_margin:.1f}% profit margin.",
            'optimization': "Consider focusing on higher-margin products and reducing operational costs.",
            'expenses': f"Total costs of ${total_costs:.2f} represent your main expense category.",
            'projections': f"Quarterly projection based on current performance: ${total_revenue * 3:.2f}."
        }
        
    except Exception as e:
        print(f"AI API Error: {e}")
        # Return fallback insights
        return {
            'performance': f"Revenue: ${total_revenue:.2f}, Costs: ${total_costs:.2f}, Margin: {profit_margin:.1f}%",
            'optimization': "Focus on cost reduction and high-margin product promotion.",
            'expenses': f"Monitor ${total_costs:.2f} in expenses for optimization opportunities.",
            'projections': f"Projected quarterly revenue: ${total_revenue * 3:.2f}"
        }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/refresh-optimization', methods=['POST'])
def refresh_optimization():
    """Generate fresh AI optimization tips for dropshipping"""
    try:
        data = request.get_json()
        revenue = float(data.get('revenue', 0))
        costs = float(data.get('costs', 0))
        margin = float(data.get('margin', 0))
        sales_count = int(data.get('sales_count', 0))
        
        # Get API key from environment variable
        api_key = os.getenv('HUGGINGFACE_API_KEY')
        
        if not api_key:
            # Fallback dropshipping tips
            tips = [
                "Focus on high-margin products with 3x+ markup to maximize profit per sale.",
                "Optimize your product descriptions with trending keywords to improve conversion rates.",
                "Consider seasonal products and trending niches for higher demand and pricing power.",
                "Negotiate better shipping rates with suppliers to reduce your cost per order.",
                "Test different pricing strategies - sometimes higher prices increase perceived value."
            ]
            import random
            return jsonify({
                "success": True,
                "optimization": random.choice(tips)
            })
        
        # Generate AI-powered dropshipping optimization tips
        dropshipping_prompts = [
            f"Based on ${revenue:.2f} revenue and {margin:.1f}% margin, suggest 3 specific dropshipping optimization strategies for product selection, pricing, and supplier management.",
            f"Analyze this dropshipping business: {sales_count} sales, ${costs:.2f} costs. Provide actionable tips for scaling and improving profit margins.",
            f"For a dropshipping store with {margin:.1f}% profit margin, recommend specific strategies to reduce costs, increase average order value, and optimize product mix.",
            f"Given ${revenue:.2f} in revenue from {sales_count} orders, suggest dropshipping-specific tactics for customer acquisition, retention, and upselling.",
            f"Dropshipping business analysis: ${revenue:.2f} revenue, ${costs:.2f} costs. Recommend supplier negotiation tactics and inventory optimization strategies."
        ]
        
        import random
        prompt = random.choice(dropshipping_prompts)
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 150,
                "temperature": 0.8,
                "do_sample": True
            }
        }
        
        response = requests.post(
            "https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill",
            headers=headers,
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            if isinstance(result, list) and len(result) > 0:
                ai_text = result[0].get('generated_text', '')
                if ai_text:
                    return jsonify({
                        "success": True,
                        "optimization": f"AI Insight: {ai_text[:200]}..."
                    })
        
        # Fallback if API doesn't work
        fallback_tips = [
            "Test trending products with high social media engagement for better conversion rates.",
            "Implement abandoned cart recovery emails to recapture 15-25% of lost sales.",
            "Use dynamic pricing based on competitor analysis and demand fluctuations.",
            "Focus on building relationships with 2-3 reliable suppliers for better terms and faster shipping.",
            "Create product bundles to increase average order value and improve profit margins.",
            "Optimize your checkout process - reduce steps to decrease cart abandonment rates.",
            "Invest in high-quality product images and videos to increase customer trust and conversions."
        ]
        
        return jsonify({
            "success": True,
            "optimization": random.choice(fallback_tips)
        })
        
    except Exception as e:
        print(f"Refresh optimization error: {e}")
        return jsonify({
            "success": False,
            "error": "Failed to generate new optimization tips"
        })

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
            
            # Extract order ID - for Sale transactions, it's in Title, for others it's in Info
            order_id_val = ''
            if row.get('Type') == 'Sale':
                # For sales, extract order number from Title (e.g., "Payment for Order #3784084180")
                title_val = row.get('Title', '')
                if 'Order #' in str(title_val):
                    order_id_val = str(title_val).split('Order #')[-1].strip()
                    if order_id_val:
                        order_id_val = f"Order #{order_id_val}"
            else:
                # For fees/taxes, order number is in Info column
                info_val = row.get('Info', '')
                if pd.isna(info_val):
                    info_val = ''
                order_id_val = str(info_val)
                
            type_val = row.get('Type', '')
            if pd.isna(type_val):
                type_val = ''
            
            # Calculate fees and taxes for this order by finding related fee transactions
            fees_taxes_amount = 0.0
            if row.get('Type') == 'Sale':
                # For sales, find all fee/tax transactions with the same order number
                current_order_id = order_id_val.replace('Order #', '') if 'Order #' in order_id_val else ''
                if current_order_id:
                    # Find all fee and tax rows for this order
                    related_fees = orders_df[
                        (orders_df['Info'].str.contains(current_order_id, na=False)) & 
                        (orders_df['Type'].isin(['Fee', 'Tax']))
                    ]
                    fees_taxes_amount = related_fees['Fees & Taxes'].apply(parse_money).sum()
            else:
                # For fee/tax rows, use the direct value
                fees_taxes_amount = parse_money(row.get('Fees & Taxes', 0))
            
            orders_table_data.append({
                'date': str(date_val),
                'order_id': str(order_id_val),
                'order_value': f"${parse_money(row.get('Net', row.get('Amount', 0))):.2f}",
                'type': str(type_val),
                'fees_taxes': f"${abs(fees_taxes_amount):.2f}"  # Use absolute value for display
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
        ai_insights = generate_ai_insights(total_revenue, total_costs, profit_margin, sales_count)
        
        return jsonify({
            "success": True,
            "summary": {
                "total_revenue": f"${total_revenue:.2f}",
                "total_costs": f"${total_costs:.2f}",
                "net_profit": f"${net_profit:.2f}",
                "profit_margin": f"{profit_margin:.1f}%",
                "predicted_revenue": f"${predicted_revenue:.2f}",
                "revenue_period": f"{sales_count} orders",
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

