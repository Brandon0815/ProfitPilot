// Global data storage
let ordersData = [];
let costsData = [];
let processedData = {
    totalRevenue: 0,
    totalCosts: 0,
    netProfit: 0,
    profitMargin: 0,
    revenueByMonth: {},
    costsByMonth: {},
    categorizedExpenses: {}
};

// DOM Elements
const ordersFileInput = document.getElementById('ordersFile');
const costsFileInput = document.getElementById('costsFile');
const analyzeBtn = document.getElementById('analyzeBtn');
const ordersStatus = document.getElementById('ordersStatus');
const costsStatus = document.getElementById('costsStatus');
const errorMessage = document.getElementById('errorMessage');

// Event Listeners
ordersFileInput.addEventListener('change', handleOrdersFile);
costsFileInput.addEventListener('change', handleCostsFile);
analyzeBtn.addEventListener('click', analyzeData);

// File handling functions
function handleOrdersFile(event) {
    const file = event.target.files[0];
    if (file) {
        ordersStatus.textContent = `Selected: ${file.name}`;
        ordersStatus.style.color = '#28a745';
        parseCSV(file, 'orders');
    }
}

function handleCostsFile(event) {
    const file = event.target.files[0];
    if (file) {
        costsStatus.textContent = `Selected: ${file.name}`;
        costsStatus.style.color = '#28a745';
        parseCSV(file, 'costs');
    }
}

function parseCSV(file, type) {
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        // Better handling for problematic CSVs
        delimiter: ",",
        quoteChar: '"',
        escapeChar: '"',
        transformHeader: function(header) {
            // Clean up header names - remove extra spaces and normalize
            return header.trim();
        },
        complete: function(results) {
            console.log(`Raw ${type} data:`, results); // Debug: see raw parse results
            
            // Filter out critical errors, but allow field count mismatches
            const criticalErrors = results.errors.filter(error => 
                error.type !== 'FieldMismatch' && 
                error.code !== 'TooFewFields' && 
                error.code !== 'TooManyFields'
            );
            
            if (criticalErrors.length > 0) {
                console.warn(`Non-critical ${type} CSV errors:`, criticalErrors);
                // Don't stop processing for minor errors
            }
            
            // Filter out completely empty rows and rows with invalid data
            const cleanData = results.data.filter(row => {
                // Check if row has at least one non-empty value
                const hasData = Object.values(row).some(value => 
                    value !== null && value !== undefined && value !== '' && value !== 0
                );
                
                // For orders, also check if we have essential fields
                if (type === 'orders' && hasData) {
                    return row['Amount'] || row['Net'] || row['Order Value'];
                }
                
                return hasData;
            });
            
            if (type === 'orders') {
                ordersData = cleanData;
                console.log('Orders data loaded:', ordersData.length, 'rows');
                console.log('Orders columns:', Object.keys(ordersData[0] || {}));
                console.log('Sample order:', ordersData[0]); // Debug: show first row
            } else {
                costsData = cleanData;
                console.log('Costs data loaded:', costsData.length, 'rows');
                console.log('Costs columns:', Object.keys(costsData[0] || {}));
                console.log('Sample cost:', costsData[0]); // Debug: show first row
            }
            
            checkIfReadyToAnalyze();
        },
        error: function(error) {
            console.error(`CSV parse error for ${type}:`, error);
            showError(`Failed to parse ${type} CSV: ${error.message}`);
        }
    });
}

function checkIfReadyToAnalyze() {
    const hasOrders = ordersData.length > 0;
    const hasCosts = costsData.length > 0;
    
    analyzeBtn.disabled = !(hasOrders || hasCosts);
    
    if (hasOrders || hasCosts) {
        analyzeBtn.textContent = '🧠 Analyze with AI';
        hideError();
    }
}

// Data processing functions
function processBusinessData() {
    processedData = {
        totalRevenue: 0,
        totalCosts: 0,
        netProfit: 0,
        profitMargin: 0,
        revenueByMonth: {},
        costsByMonth: {},
        categorizedExpenses: {}
    };
    
    // Process orders (revenue) - Only count SALES, not fees
    if (ordersData.length > 0) {
        ordersData.forEach(order => {
            // Only process if this is a sale transaction
            if (order['Type'] === 'Sale' || order['Type'] === 'sale') {
                // Try different fields to find the actual dollar amount
                let orderValue = 0;
                
                // Try parsing Amount first, but handle "--" and other text
                if (order['Amount'] && order['Amount'] !== '--' && order['Amount'] !== '') {
                    const amountStr = String(order['Amount']).replace(/[$,]/g, '');
                    if (!isNaN(parseFloat(amountStr))) {
                        orderValue = parseFloat(amountStr);
                    }
                }
                
                // If Amount didn't work, try Net field
                if (orderValue === 0 && order['Net']) {
                    const netStr = String(order['Net']).replace(/[$,]/g, '');
                    if (!isNaN(parseFloat(netStr))) {
                        orderValue = parseFloat(netStr);
                    }
                }
                
                // Log what we found for debugging
                console.log('Processing sale:', order['Info'], 'Amount:', order['Amount'], 'Net:', order['Net'], 'Parsed Value:', orderValue);
                
                // Only count positive amounts as revenue
                if (orderValue > 0) {
                    processedData.totalRevenue += orderValue;
                    
                    // Extract month from date for trend analysis
                    const date = order['Date'];
                    if (date) {
                        const month = extractMonth(date);
                        if (month) {
                            processedData.revenueByMonth[month] = (processedData.revenueByMonth[month] || 0) + orderValue;
                        }
                    }
                }
            }
        });
        
        console.log('Revenue calculation complete. Sales found:', 
                    ordersData.filter(o => o['Type'] === 'Sale').length,
                    'Total Revenue:', processedData.totalRevenue);
    }
    
    // Process costs (from raw AliExpress CSV)
    if (costsData.length > 0) {
        console.log('Processing costs data. Sample cost record:', costsData[0]);
        
        // Filter for completed orders only and sort by date
        const completedOrders = costsData.filter(cost => {
            const status = cost['Order Status'] || '';
            return status.toLowerCase() === 'completed';
        });
        
        // Sort by order date (most recent first)
        completedOrders.sort((a, b) => {
            const dateA = new Date(a['Order Date'] || 0);
            const dateB = new Date(b['Order Date'] || 0);
            return dateB - dateA;
        });
        
        console.log(`Found ${completedOrders.length} completed orders out of ${costsData.length} total orders`);
        
        completedOrders.forEach(cost => {
            let costAmount = 0;
            
            // Extract amount from "Order Value" column
            if (cost['Order Value']) {
                const cleanValue = String(cost['Order Value']).replace(/[$,]/g, '');
                if (!isNaN(parseFloat(cleanValue)) && parseFloat(cleanValue) > 0) {
                    costAmount = parseFloat(cleanValue);
                    console.log('Found cost amount:', costAmount, 'from order on:', cost['Order Date']);
                }
            }
            
            if (costAmount > 0) {
                processedData.totalCosts += costAmount;
                
                // Extract month from order date for trend analysis
                const orderDate = cost['Order Date'];
                if (orderDate) {
                    const month = extractMonth(orderDate);
                    if (month) {
                        processedData.costsByMonth[month] = (processedData.costsByMonth[month] || 0) + costAmount;
                    }
                }
                
                // Categorize as Materials since these are AliExpress purchases
                const category = 'Materials';
                
                if (!processedData.categorizedExpenses[category]) {
                    processedData.categorizedExpenses[category] = 0;
                }
                processedData.categorizedExpenses[category] += costAmount;
            }
        });
        
        console.log('Costs calculation complete. Total costs:', processedData.totalCosts);
        console.log('Costs by month:', processedData.costsByMonth);
        console.log('Categorized expenses:', processedData.categorizedExpenses);
    }
    
    // Calculate derived metrics
    processedData.netProfit = processedData.totalRevenue - processedData.totalCosts;
    processedData.profitMargin = processedData.totalRevenue > 0 ? 
        (processedData.netProfit / processedData.totalRevenue) * 100 : 0;
}

function extractMonth(dateString) {
    try {
        // Handle formats like "31-Aug-25" or standard date formats
        let date;
        if (dateString.includes('-') && dateString.length <= 10) {
            // Handle "31-Aug-25" format
            const parts = dateString.split('-');
            if (parts.length === 3) {
                const monthNames = {
                    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                };
                const month = monthNames[parts[1]];
                const year = '20' + parts[2]; // Convert 25 to 2025
                if (month) {
                    return `${year}-${month}`;
                }
            }
        } else {
            date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                return `${year}-${month}`;
            }
        }
    } catch (error) {
        console.warn('Could not parse date:', dateString);
    }
    return null;
}

function categorizeExpense(type, info) {
    const typeInfo = (type + ' ' + info).toLowerCase();
    
    if (typeInfo.includes('market') || typeInfo.includes('advert') || typeInfo.includes('promo')) {
        return 'Marketing';
    } else if (typeInfo.includes('material') || typeInfo.includes('supply') || typeInfo.includes('product')) {
        return 'Materials';
    } else if (typeInfo.includes('ship') || typeInfo.includes('fulfil') || typeInfo.includes('deliver')) {
        return 'Shipping';
    } else if (typeInfo.includes('fee') || typeInfo.includes('tax') || typeInfo.includes('commission')) {
        return 'Fees';
    } else {
        return 'Other';
    }
}

function predictRevenue() {
    const months = Object.keys(processedData.revenueByMonth).sort();
    if (months.length < 2) {
        return processedData.totalRevenue; // Not enough data for prediction
    }
    
    // Simple linear trend calculation
    const values = months.map(month => processedData.revenueByMonth[month]);
    const avgGrowth = calculateAverageGrowth(values);
    const lastMonthRevenue = values[values.length - 1];
    
    // Predict next 3 months
    return lastMonthRevenue * (1 + avgGrowth) * 3;
}

function calculateAverageGrowth(values) {
    if (values.length < 2) return 0;
    
    let totalGrowth = 0;
    let growthCount = 0;
    
    for (let i = 1; i < values.length; i++) {
        if (values[i - 1] > 0) {
            const growth = (values[i] - values[i - 1]) / values[i - 1];
            totalGrowth += growth;
            growthCount++;
        }
    }
    
    return growthCount > 0 ? totalGrowth / growthCount : 0;
}

// UI Update functions
function updateSummaryCards() {
    document.getElementById('totalRevenue').textContent = formatCurrency(processedData.totalRevenue);
    document.getElementById('totalCosts').textContent = formatCurrency(processedData.totalCosts);
    document.getElementById('netProfit').textContent = formatCurrency(processedData.netProfit);
    document.getElementById('profitMargin').textContent = processedData.profitMargin.toFixed(1) + '% margin';
    
    // Color profit based on positive/negative
    const profitElement = document.getElementById('netProfit');
    profitElement.className = `amount ${processedData.netProfit >= 0 ? 'profit-positive' : 'profit-negative'}`;
    
    // Update prediction
    const predictedRevenue = predictRevenue();
    document.getElementById('predictedRevenue').textContent = formatCurrency(predictedRevenue);
    
    // Show/hide sections
    document.getElementById('summaryGrid').style.display = 'grid';
    document.getElementById('tablesSection').style.display = 'grid';
}

function updateTables() {
    updateOrdersTable();
    updateCostsTable();
}

function updateOrdersTable() {
    const tbody = document.querySelector('#ordersTable tbody');
    tbody.innerHTML = '';
    
    // Filter to show only sales (not fees) and sort by date (most recent first)
    const salesOnly = ordersData.filter(order => order['Type'] === 'Sale' || order['Type'] === 'sale');
    const sortedSales = salesOnly.sort((a, b) => {
        const dateA = new Date(a['Date'] || 0);
        const dateB = new Date(b['Date'] || 0);
        return dateB - dateA;
    });
    
    sortedSales.forEach(order => {
        // Extract fees and tax info for product column
        const feesAndTaxes = order['Fees & Taxes'] || '';
        const taxDetails = order['Tax Details'] || '';
        let productInfo = '';
        
        if (feesAndTaxes && taxDetails) {
            productInfo = `Fees: ${feesAndTaxes}, Tax: ${taxDetails}`;
        } else if (feesAndTaxes) {
            productInfo = `Fees: ${feesAndTaxes}`;
        } else if (taxDetails) {
            productInfo = `Tax: ${taxDetails}`;
        } else {
            productInfo = 'N/A';
        }
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${order['Date'] || 'N/A'}</td>
            <td>${order['Title'] || order['Info'] || 'N/A'}</td>
            <td>${formatCurrency(parseFloat(String(order['Amount'] || '0').replace(/[$,]/g, '')) || 0)}</td>
            <td>${order['Type'] || 'N/A'}</td>
            <td>${productInfo}</td>
        `;
    });
}

function updateCostsTable() {
    const tbody = document.querySelector('#costsTable tbody');
    tbody.innerHTML = '';
    
    // Filter completed orders and sort by date (most recent first)
    const completedOrders = costsData.filter(cost => {
        const status = cost['Order Status'] || '';
        return status.toLowerCase() === 'completed';
    }).sort((a, b) => {
        const dateA = new Date(a['Order Date'] || 0);
        const dateB = new Date(b['Order Date'] || 0);
        return dateB - dateA;
    });
    
    // Show ALL completed orders (not just last 10)
    completedOrders.forEach(cost => {
        const shopName = cost['Shop Name'] || 'N/A';
        const orderDate = cost['Order Date'] || 'N/A';
        const orderValue = cost['Order Value'] || '0';
        const productTitle = cost['product_title'] || 'N/A';
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>Purchase</td>
            <td>${productTitle} (${shopName})</td>
            <td>${formatCurrency(parseFloat(String(orderValue).replace(/[$,]/g, '')) || 0)}</td>
            <td>${formatCurrency(parseFloat(String(orderValue).replace(/[$,]/g, '')) || 0)}</td>
            <td><span class="category-badge category-materials">Materials</span></td>
        `;
    });
}

// AI Analysis functions
async function performAIAnalysis() {
    if (!validateAPIKey()) {
        showAIError('Please configure your Hugging Face API key in config.js');
        return;
    }
    
    const businessSummary = generateBusinessSummary();
    
    try {
        // Show loading state
        document.getElementById('aiLoading').style.display = 'block';
        document.getElementById('aiContent').style.display = 'none';
        
        // Perform AI analysis (simplified version using local analysis since free APIs are limited)
        const insights = await generateLocalInsights(businessSummary);
        
        // Update UI with insights
        document.getElementById('performanceInsights').innerHTML = insights.performance;
        document.getElementById('optimizationTips').innerHTML = insights.optimization;
        document.getElementById('expenseCategories').innerHTML = insights.categories;
        document.getElementById('futureProjections').innerHTML = insights.projections;
        
        // Show results
        document.getElementById('aiLoading').style.display = 'none';
        document.getElementById('aiContent').style.display = 'block';
        
    } catch (error) {
        console.error('AI Analysis Error:', error);
        showAIError('AI analysis failed. Using local analysis instead.');
        
        // Fallback to local analysis
        const insights = await generateLocalInsights(businessSummary);
        document.getElementById('performanceInsights').innerHTML = insights.performance;
        document.getElementById('optimizationTips').innerHTML = insights.optimization;
        document.getElementById('expenseCategories').innerHTML = insights.categories;
        document.getElementById('futureProjections').innerHTML = insights.projections;
        
        document.getElementById('aiLoading').style.display = 'none';
        document.getElementById('aiContent').style.display = 'block';
    }
}

function generateBusinessSummary() {
    return {
        totalRevenue: processedData.totalRevenue,
        totalCosts: processedData.totalCosts,
        netProfit: processedData.netProfit,
        profitMargin: processedData.profitMargin,
        orderCount: ordersData.length,
        expenseCount: costsData.length,
        revenueByMonth: processedData.revenueByMonth,
        expensesByCategory: processedData.categorizedExpenses
    };
}

async function generateLocalInsights(summary) {
    // Generate insights using local business logic
    const insights = {
        performance: generatePerformanceAnalysis(summary),
        optimization: generateOptimizationTips(summary),
        categories: generateCategoryAnalysis(summary),
        projections: generateProjections(summary)
    };
    
    return insights;
}

function generatePerformanceAnalysis(summary) {
    let analysis = '<ul>';
    
    // Profit margin analysis
    if (summary.profitMargin > 20) {
        analysis += '<li>✅ <strong>Excellent profit margin</strong> of ' + summary.profitMargin.toFixed(1) + '% - well above industry average</li>';
    } else if (summary.profitMargin > 10) {
        analysis += '<li>✅ <strong>Good profit margin</strong> of ' + summary.profitMargin.toFixed(1) + '% - room for improvement</li>';
    } else if (summary.profitMargin > 0) {
        analysis += '<li>⚠️ <strong>Low profit margin</strong> of ' + summary.profitMargin.toFixed(1) + '% - needs attention</li>';
    } else {
        analysis += '<li>🚨 <strong>Negative profit margin</strong> - immediate action required</li>';
    }
    
    // Revenue analysis
    const avgOrderValue = summary.orderCount > 0 ? summary.totalRevenue / summary.orderCount : 0;
    analysis += '<li>💰 <strong>Average order value:</strong> ' + formatCurrency(avgOrderValue) + '</li>';
    
    // Monthly trend analysis
    const months = Object.keys(summary.revenueByMonth).sort();
    if (months.length >= 2) {
        const lastMonth = summary.revenueByMonth[months[months.length - 1]];
        const prevMonth = summary.revenueByMonth[months[months.length - 2]];
        const growth = ((lastMonth - prevMonth) / prevMonth) * 100;
        
        if (growth > 0) {
            analysis += '<li>📈 <strong>Growing trend:</strong> ' + growth.toFixed(1) + '% increase from last month</li>';
        } else {
            analysis += '<li>📉 <strong>Declining trend:</strong> ' + Math.abs(growth).toFixed(1) + '% decrease from last month</li>';
        }
    }
    
    analysis += '</ul>';
    return analysis;
}

function generateOptimizationTips(summary) {
    let tips = '<ul>';
    
    // Cost optimization based on categories
    const categories = summary.expensesByCategory;
    const totalCosts = Object.values(categories).reduce((a, b) => a + b, 0);
    
    Object.entries(categories).forEach(([category, amount]) => {
        const percentage = (amount / totalCosts) * 100;
        if (percentage > 30) {
            tips += `<li>🎯 <strong>${category} costs are high</strong> (${percentage.toFixed(1)}% of total) - consider negotiating better rates</li>`;
        }
    });
    
    // Revenue optimization
    const avgOrderValue = summary.orderCount > 0 ? summary.totalRevenue / summary.orderCount : 0;
    if (avgOrderValue < 50) {
        tips += '<li>💡 <strong>Increase average order value</strong> through bundling or upselling</li>';
    }
    
    // Profit margin suggestions
    if (summary.profitMargin < 15) {
        tips += '<li>📊 <strong>Improve profit margins</strong> by reducing costs or increasing prices by 5-10%</li>';
    }
    
    // General tips
    tips += '<li>🔍 <strong>Track seasonal patterns</strong> to optimize inventory and marketing timing</li>';
    tips += '<li>📱 <strong>Automate expense tracking</strong> to identify cost-saving opportunities faster</li>';
    
    tips += '</ul>';
    return tips;
}

function generateCategoryAnalysis(summary) {
    let analysis = '<div class="category-breakdown">';
    
    const categories = summary.expensesByCategory;
    const totalCosts = Object.values(categories).reduce((a, b) => a + b, 0);
    
    if (totalCosts > 0) {
        Object.entries(categories).forEach(([category, amount]) => {
            const percentage = (amount / totalCosts) * 100;
            analysis += `
                <div class="category-item">
                    <span class="category-badge category-${category.toLowerCase()}">${category}</span>
                    <span class="category-amount">${formatCurrency(amount)} (${percentage.toFixed(1)}%)</span>
                </div>
            `;
        });
    } else {
        analysis += '<p>No expense data available for categorization.</p>';
    }
    
    analysis += '</div>';
    return analysis;
}

function generateProjections(summary) {
    let projections = '<ul>';
    
    const months = Object.keys(summary.revenueByMonth).sort();
    if (months.length >= 2) {
        const recentRevenues = months.slice(-3).map(m => summary.revenueByMonth[m]);
        const avgRevenue = recentRevenues.reduce((a, b) => a + b, 0) / recentRevenues.length;
        const growth = calculateAverageGrowth(recentRevenues);
        
        // 3-month projection
        const projectedMonthlyRevenue = avgRevenue * (1 + growth);
        const projected3MonthRevenue = projectedMonthlyRevenue * 3;
        
        projections += `<li>📈 <strong>3-Month Revenue Projection:</strong> ${formatCurrency(projected3MonthRevenue)}</li>`;
        projections += `<li>💡 <strong>Monthly Average Projection:</strong> ${formatCurrency(projectedMonthlyRevenue)}</li>`;
        
        if (growth > 0) {
            projections += `<li>🚀 <strong>Growth Rate:</strong> ${(growth * 100).toFixed(1)}% monthly growth trend</li>`;
        } else {
            projections += `<li>⚠️ <strong>Growth Rate:</strong> ${Math.abs(growth * 100).toFixed(1)}% monthly decline - focus on customer retention</li>`;
        }
        
        // Profit projection
        const avgCosts = summary.totalCosts / months.length;
        const projectedProfit = projected3MonthRevenue - (avgCosts * 3);
        projections += `<li>💰 <strong>Projected 3-Month Profit:</strong> ${formatCurrency(projectedProfit)}</li>`;
        
    } else {
        projections += '<li>📊 <strong>Insufficient data</strong> for accurate projections. Upload more historical data for better predictions.</li>';
    }
    
    projections += '</ul>';
    return projections;
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function showError(message) {
    document.getElementById('errorText').textContent = message;
    document.getElementById('errorMessage').style.display = 'block';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

function showAIError(message) {
    document.getElementById('performanceInsights').innerHTML = `<p style="color: #dc3545;">⚠️ ${message}</p>`;
    document.getElementById('optimizationTips').innerHTML = `<p style="color: #dc3545;">⚠️ ${message}</p>`;
    document.getElementById('expenseCategories').innerHTML = `<p style="color: #dc3545;">⚠️ ${message}</p>`;
    document.getElementById('futureProjections').innerHTML = `<p style="color: #dc3545;">⚠️ ${message}</p>`;
}

// Main analyze function
async function analyzeData() {
    try {
        // Process the business data
        processBusinessData();
        
        // Update UI
        updateSummaryCards();
        updateTables();
        
        // Show AI section and start analysis
        document.getElementById('aiSection').style.display = 'block';
        await performAIAnalysis();
        
    } catch (error) {
        console.error('Analysis error:', error);
        showError('Error analyzing data: ' + error.message);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('ProfitPilot loaded successfully!');
    
    // Check API configuration on load
    if (!validateAPIKey()) {
        console.log('💡 Tip: Set up your Hugging Face API key in config.js for enhanced AI features');
    }
});
